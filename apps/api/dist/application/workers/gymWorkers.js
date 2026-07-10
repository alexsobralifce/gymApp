import { Queue, Worker } from 'bullmq';
import { TreinoStatus, TreinoAtor } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import { assertTransicaoValida } from '../../domain/entities/TreinoStateMachine.js';
import { sendPushNotification } from '../../infrastructure/push/expoPush.js';
import { sendWebPush } from '../../infrastructure/push/webPush.js';
import { calcularEAtualizar } from '../../application/usecases/correlacao/CorrelacaoService.js';
import { env } from '../../shared/env.js';
let connection = null;
let inatividade30minQueue = null;
let treinoEmAbertoQueue = null;
let mensagemMotivaicionalQueue = null;
let correlacaoQueue = null;
let inatividade30minWorker = null;
let treinoEmAbertoWorker = null;
let mensagemMotivacionalWorker = null;
let correlacaoWorker = null;
let started = false;
// ─── Push dual-channel helper ──────────────────────────────────────────────────
async function sendDualPush(expoToken, webSubscription, title, body, data) {
    const promises = [];
    if (expoToken)
        promises.push(sendPushNotification(expoToken, title, body, data));
    if (webSubscription)
        promises.push(sendWebPush(webSubscription, title, body, data));
    await Promise.allSettled(promises);
}
// ─── Work handlers ────────────────────────────────────────────────────────────
async function handleInatividade30min(_job) {
    const limite = new Date(Date.now() - 30 * 60 * 1000);
    const treinosInativos = await prisma.treino.findMany({
        where: {
            status: TreinoStatus.EM_EXECUCAO,
            iniciado_em: { lte: limite },
            finalizado_em: null,
        },
        include: {
            aluno: {
                include: {
                    usuario: { select: { expo_push_token: true, web_push_subscription: true, nome: true } },
                    professor: { include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } } },
                },
            },
        },
    });
    for (const treino of treinosInativos) {
        const nomeAluno = treino.aluno.usuario.nome;
        console.log(`[Worker] Inatividade 30min detectada: ${treino.id} — aluno: ${nomeAluno}`);
        await sendDualPush(treino.aluno.usuario.expo_push_token, treino.aluno.usuario.web_push_subscription, 'Treino parado', 'Seu treino está parado há mais de 30 minutos. Retome as atividades!');
        const professorToken = treino.aluno.professor?.usuario.expo_push_token;
        const professorWeb = treino.aluno.professor?.usuario.web_push_subscription;
        if (professorToken || professorWeb) {
            await sendDualPush(professorToken, professorWeb, 'Aluno inativo', `${nomeAluno} está com o treino parado há mais de 30 minutos.`);
        }
    }
}
async function handleTreinoEmAberto(_job) {
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay();
    const treinos = await prisma.treino.findMany({
        where: {
            status: TreinoStatus.ACEITO,
            dias_semana: { has: diaSemanaHoje },
            iniciado_em: null,
        },
        include: {
            aluno: {
                include: {
                    usuario: { select: { nome: true } },
                    professor: { include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } } },
                },
            },
        },
    });
    for (const treino of treinos) {
        assertTransicaoValida(treino.status, TreinoStatus.EM_ABERTO, TreinoAtor.SISTEMA);
        await prisma.$transaction(async (tx) => {
            await tx.treino.update({
                where: { id: treino.id },
                data: { status: TreinoStatus.EM_ABERTO },
            });
            await tx.treinoHistorico.create({
                data: {
                    treino_id: treino.id,
                    status_anterior: TreinoStatus.ACEITO,
                    status_novo: TreinoStatus.EM_ABERTO,
                    ator_id: 'SISTEMA',
                    ator_tipo: TreinoAtor.SISTEMA,
                },
            });
        });
        const nomeAluno = treino.aluno.usuario.nome;
        const p = treino.aluno.professor;
        if (p) {
            await sendDualPush(p.usuario.expo_push_token, p.usuario.web_push_subscription, 'Treino em aberto', `${nomeAluno} não iniciou o treino programado para hoje.`);
        }
    }
    console.log(`[Worker] ${treinos.length} treinos marcados como EM_ABERTO`);
}
async function handleMensagemMotivacional(job) {
    const { alunoId } = job.data;
    const [todasMensagens, mensagensEnviadas, aluno] = await Promise.all([
        prisma.mensagemMotivacional.findMany(),
        prisma.mensagemMotivacionalEnviada.findMany({
            where: { aluno_id: alunoId },
            select: { mensagem_id: true },
        }),
        prisma.aluno.findUnique({
            where: { id: alunoId },
            include: { usuario: { select: { expo_push_token: true, web_push_subscription: true } } },
        }),
    ]);
    const idsEnviados = new Set(mensagensEnviadas.map((m) => m.mensagem_id));
    let disponiveis = todasMensagens.filter((m) => !idsEnviados.has(m.id));
    if (disponiveis.length === 0) {
        await prisma.mensagemMotivacionalEnviada.deleteMany({ where: { aluno_id: alunoId } });
        disponiveis = todasMensagens;
    }
    const mensagem = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    if (!mensagem)
        return;
    await prisma.mensagemMotivacionalEnviada.create({
        data: { aluno_id: alunoId, mensagem_id: mensagem.id },
    });
    console.log(`[Worker] Mensagem motivacional: "${mensagem.titulo}" → aluno ${alunoId}`);
    if (aluno) {
        await sendDualPush(aluno.usuario.expo_push_token, aluno.usuario.web_push_subscription, mensagem.titulo, mensagem.resumo, { url_estudo: mensagem.url_estudo });
    }
}
async function handleCorrelacaoDesempenho(job) {
    const { alunoId } = job.data;
    const resultado = await calcularEAtualizar(alunoId);
    if (resultado) {
        console.log(`[Worker] Correlações calculadas para aluno ${alunoId}: r(peso) = ${resultado.peso_volume_r}, r(bf) = ${resultado.bf_volume_r}, r(massa magra) = ${resultado.massa_magra_volume_r}`);
    }
    else {
        console.log(`[Worker] Correlações insuficientes para aluno ${alunoId} — dados insuficientes`);
    }
}
// ─── Agendamento de jobs recorrentes ─────────────────────────────────────────
async function scheduleRecurringJobs() {
    if (!inatividade30minQueue || !treinoEmAbertoQueue)
        return;
    await inatividade30minQueue.add('check-inatividade', {}, {
        repeat: { every: 5 * 60 * 1000 },
        removeOnComplete: true,
    });
    await treinoEmAbertoQueue.add('mark-em-aberto', {}, {
        repeat: { pattern: '30 23 * * *' },
        removeOnComplete: true,
    });
    console.log('✅ Workers agendados');
}
// ─── Start / Stop ─────────────────────────────────────────────────────────────
export async function startWorkers() {
    if (started)
        return;
    started = true;
    connection = { url: env.REDIS_URL };
    inatividade30minQueue = new Queue('inatividade-30min', { connection });
    treinoEmAbertoQueue = new Queue('treino-em-aberto', { connection });
    mensagemMotivaicionalQueue = new Queue('mensagem-motivacional', { connection });
    correlacaoQueue = new Queue('correlacao-desempenho', { connection });
    inatividade30minWorker = new Worker('inatividade-30min', handleInatividade30min, { connection });
    treinoEmAbertoWorker = new Worker('treino-em-aberto', handleTreinoEmAberto, { connection });
    mensagemMotivacionalWorker = new Worker('mensagem-motivacional', handleMensagemMotivacional, { connection });
    correlacaoWorker = new Worker('correlacao-desempenho', handleCorrelacaoDesempenho, { connection });
    await scheduleRecurringJobs();
}
export async function stopWorkers() {
    if (!started)
        return;
    started = false;
    const workers = [inatividade30minWorker, treinoEmAbertoWorker, mensagemMotivacionalWorker, correlacaoWorker];
    const queues = [inatividade30minQueue, treinoEmAbertoQueue, mensagemMotivaicionalQueue, correlacaoQueue];
    await Promise.all([
        ...workers.map((w) => w?.close()),
        ...queues.map((q) => q?.close()),
    ]);
    console.log('✅ Workers finalizados');
}
//# sourceMappingURL=gymWorkers.js.map