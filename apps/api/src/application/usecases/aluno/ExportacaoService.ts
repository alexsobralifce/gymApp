import type {
  Treino,
  TreinoExercicio,
  ExecucaoExercicio,
  MedidaCorporal,
  AvaliacaoFisica,
  TreinoHistorico,
} from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError } from '../../../domain/errors/AppError.js'

// ─── UX-017: Exportação de dados (LGPD — direito à portabilidade) ────────────
// Reúne TODO o histórico do aluno (treinos, exercícios, execuções, medidas,
// avaliações físicas e log de transições) estritamente escopado a `alunoId`
// (isolamento multi-tenant).

export interface ExportacaoTreinoExercicio extends TreinoExercicio {
  exercicio: { id: string; nome: string; grupo_muscular: string | null; equipamento: string | null }
}

export interface ExportacaoTreino extends Treino {
  exercicios: ExportacaoTreinoExercicio[]
  execucoes: ExecucaoExercicio[]
}

export interface ExportacaoHistorico extends TreinoHistorico {
  treino: { id: string; nome: string }
}

export interface ExportacaoDados {
  exportado_em: string
  perfil: {
    id: string
    nome: string
    email: string
    telefone: string | null
    data_nascimento: Date | null
    sexo: string | null
    peso_kg: number | null
    altura_cm: number | null
    objetivo_treino: string | null
    nivel_treino: string | null
    restricoes: string[]
    meta_semanal: number
    criado_em: Date
  }
  treinos: ExportacaoTreino[]
  medidas: MedidaCorporal[]
  avaliacoes: AvaliacaoFisica[]
  historico: ExportacaoHistorico[]
}

export async function exportarDados(alunoId: string): Promise<ExportacaoDados> {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: {
      usuario: { select: { nome: true, email: true, telefone: true, criado_em: true } },
    },
  })
  if (!aluno) throw new NotFoundError('Aluno')

  const [treinos, medidas, avaliacoes, historico] = await Promise.all([
    prisma.treino.findMany({
      where: { aluno_id: alunoId },
      orderBy: { criado_em: 'asc' },
      include: {
        exercicios: {
          orderBy: { ordem: 'asc' },
          include: {
            exercicio: { select: { id: true, nome: true, grupo_muscular: true, equipamento: true } },
          },
        },
        execucoes: { orderBy: { registrado_em: 'asc' } },
      },
    }),
    prisma.medidaCorporal.findMany({ where: { aluno_id: alunoId }, orderBy: { data: 'asc' } }),
    prisma.avaliacaoFisica.findMany({ where: { aluno_id: alunoId }, orderBy: { data: 'asc' } }),
    // TreinoHistorico não possui aluno_id — escopa via o treino do aluno.
    prisma.treinoHistorico.findMany({
      where: { treino: { aluno_id: alunoId } },
      orderBy: { timestamp: 'asc' },
      include: { treino: { select: { id: true, nome: true } } },
    }),
  ])

  return {
    exportado_em: new Date().toISOString(),
    perfil: {
      id: aluno.id,
      nome: aluno.usuario.nome,
      email: aluno.usuario.email,
      telefone: aluno.usuario.telefone,
      data_nascimento: aluno.data_nascimento,
      sexo: aluno.sexo,
      peso_kg: aluno.peso_kg,
      altura_cm: aluno.altura_cm,
      objetivo_treino: aluno.objetivo_treino,
      nivel_treino: aluno.nivel_treino,
      restricoes: aluno.restricoes,
      meta_semanal: aluno.meta_semanal,
      criado_em: aluno.criado_em,
    },
    treinos,
    medidas,
    avaliacoes,
    historico,
  }
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function iso(value: Date | string | null | undefined): string {
  if (!value) return ''
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return csvEscape(JSON.stringify(value))
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function linhas(header: string[], rows: Array<Array<unknown>>): string {
  const out = [header.map(csvEscape).join(',')]
  for (const row of rows) out.push(row.map(csvEscape).join(','))
  return out.join('\n')
}

export function gerarCSV(dados: ExportacaoDados): string {
  const secoes: string[] = []

  secoes.push('# PERFIL')
  secoes.push(linhas(['campo', 'valor'], [
    ['nome', dados.perfil.nome],
    ['email', dados.perfil.email],
    ['telefone', dados.perfil.telefone],
    ['data_nascimento', iso(dados.perfil.data_nascimento)],
    ['sexo', dados.perfil.sexo],
    ['peso_kg', dados.perfil.peso_kg],
    ['altura_cm', dados.perfil.altura_cm],
    ['objetivo_treino', dados.perfil.objetivo_treino],
    ['nivel_treino', dados.perfil.nivel_treino],
    ['restricoes', (dados.perfil.restricoes ?? []).join('; ')],
    ['meta_semanal', dados.perfil.meta_semanal],
    ['criado_em', iso(dados.perfil.criado_em)],
  ]))

  secoes.push('# TREINOS')
  secoes.push(linhas(
    ['id', 'nome', 'status', 'dias_semana', 'criado_por_ia', 'is_template', 'avaliacao_dificuldade', 'iniciado_em', 'finalizado_em', 'criado_em', 'atualizado_em'],
    dados.treinos.map((t) => [
      t.id, t.nome, t.status, (t.dias_semana ?? []).join(';'), t.criado_por_ia, t.is_template,
      t.avaliacao_dificuldade, iso(t.iniciado_em), iso(t.finalizado_em), iso(t.criado_em), iso(t.atualizado_em),
    ]),
  ))

  secoes.push('# EXERCICIOS')
  secoes.push(linhas(
    ['treino_id', 'treino_nome', 'ordem', 'exercicio_id', 'exercicio_nome', 'grupo_muscular', 'equipamento', 'series', 'repeticoes', 'carga_sugerida_kg', 'metodo', 'tempo_descanso_segundos'],
    dados.treinos.flatMap((t) =>
      t.exercicios.map((te) => [
        t.id, t.nome, te.ordem, te.exercicio_id, te.exercicio.nome, te.exercicio.grupo_muscular,
        te.exercicio.equipamento, te.series, te.repeticoes, te.carga_sugerida_kg, te.metodo, te.tempo_descanso_segundos,
      ]),
    ),
  ))

  secoes.push('# EXECUCOES')
  secoes.push(linhas(
    ['id', 'treino_id', 'treino_nome', 'exercicio_id', 'serie_numero', 'repeticoes', 'carga_kg', 'rpe', 'registrado_em'],
    dados.treinos.flatMap((t) =>
      t.execucoes.map((e) => [e.id, t.id, t.nome, e.exercicio_id, e.serie_numero, e.repeticoes, e.carga_kg, e.rpe, iso(e.registrado_em)]),
    ),
  ))

  secoes.push('# MEDIDAS')
  secoes.push(linhas(
    ['id', 'data', 'peso_kg', 'altura_cm', 'percentual_bf', 'massa_magra_kg', 'imc', 'observacao'],
    dados.medidas.map((m) => [m.id, iso(m.data), m.peso_kg, m.altura_cm, m.percentual_bf, m.massa_magra_kg, m.imc, m.observacao]),
  ))

  secoes.push('# AVALIACOES')
  secoes.push(linhas(
    ['id', 'data', 'status', 'peso_kg', 'estatura_m', 'imc', 'rcq', 'percentual_gordura', 'massa_gorda_kg', 'massa_magra_kg', 'classificacao_gc', 'risco_cardiaco'],
    dados.avaliacoes.map((a) => [
      a.id, iso(a.data), a.status, a.peso_kg, a.estatura_m, a.imc, a.rcq, a.percentual_gordura,
      a.massa_gorda_kg, a.massa_magra_kg, a.classificacao_gc, a.risco_cardiaco,
    ]),
  ))

  secoes.push('# HISTORICO')
  secoes.push(linhas(
    ['id', 'treino_id', 'treino_nome', 'status_anterior', 'status_novo', 'ator_tipo', 'ator_id', 'timestamp', 'duracao_segundos'],
    dados.historico.map((h) => [h.id, h.treino_id, h.treino.nome, h.status_anterior, h.status_novo, h.ator_tipo, h.ator_id, iso(h.timestamp), h.duracao_segundos]),
  ))

  // BOM (\uFEFF) para o Excel abrir UTF-8 corretamente.
  return '\uFEFF' + secoes.join('\n\n') + '\n'
}

// ─── Relatório resumido (HTML print-ready) ────────────────────────────────────

function fmtData(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  return d.toLocaleDateString('pt-BR')
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function gerarRelatorioHTML(alunoId: string): Promise<string> {
  const dados = await exportarDados(alunoId)
  const { perfil, treinos, medidas } = dados

  const treinosConcluidos = treinos.filter((t) => t.status === 'CONCLUIDO').length
  const volumeTotalKg = treinos.reduce(
    (acc, t) => acc + t.execucoes.reduce((s, e) => s + e.carga_kg * e.repeticoes, 0),
    0,
  )
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const sessoesNoMes = treinos.filter((t) => t.finalizado_em && t.finalizado_em >= inicioMes).length

  const ultimasMedidas = [...medidas].sort((a, b) => b.data.getTime() - a.data.getTime()).slice(0, 5)

  const ultimosTreinos = [...treinos]
    .sort((a, b) => (b.finalizado_em ?? b.criado_em).getTime() - (a.finalizado_em ?? a.criado_em).getTime())
    .slice(0, 20)

  const medidasRows = ultimasMedidas.length
    ? ultimasMedidas.map((m) => `
        <tr>
          <td>${htmlEscape(fmtData(m.data))}</td>
          <td>${m.peso_kg ?? '—'}</td>
          <td>${m.altura_cm ?? '—'}</td>
          <td>${m.imc ?? '—'}</td>
          <td>${m.percentual_bf ?? '—'}%</td>
          <td>${m.massa_magra_kg ?? '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="vazio">Nenhuma medida registrada.</td></tr>'

  const treinosRows = ultimosTreinos.length
    ? ultimosTreinos.map((t) => `
        <tr>
          <td>${htmlEscape(fmtData(t.finalizado_em ?? t.criado_em))}</td>
          <td>${htmlEscape(t.nome)}</td>
          <td><span class="status status-${htmlEscape(t.status.toLowerCase())}">${htmlEscape(t.status)}</span></td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="vazio">Nenhum treino registrado.</td></tr>'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de Treino — ENDORFINAPP</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0b1220;
    background: #fff;
    margin: 0;
    padding: 32px;
    line-height: 1.5;
  }
  .aviso-imprimir {
    background: #eef4ff;
    border: 1px solid #bfd3f5;
    color: #1d4ed8;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    margin-bottom: 24px;
  }
  header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  header h1 { margin: 0; font-size: 24px; color: #0b1220; }
  header p { margin: 4px 0 0; color: #4a5a72; font-size: 13px; }
  .marca { color: #2563eb; font-weight: 700; letter-spacing: 0.5px; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #1d4ed8; margin: 28px 0 10px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .card { border: 1px solid #dfe5ee; border-radius: 10px; padding: 12px 14px; background: #f8fafc; }
  .card .valor { font-size: 22px; font-weight: 800; color: #0b1220; }
  .card .rotulo { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #4a5a72; margin-top: 2px; }
  .perfil { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px 24px; font-size: 13px; }
  .perfil div { padding: 4px 0; border-bottom: 1px solid #eef1f5; }
  .perfil .rotulo { color: #4a5a72; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #f1f5fb; color: #0b1220; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #dfe5ee; }
  tr:nth-child(even) td { background: #fafbfd; }
  .vazio { text-align: center; color: #4a5a72; font-style: italic; padding: 16px; }
  .status { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #eef1f5; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #dfe5ee; font-size: 11px; color: #4a5a72; }
  @media print {
    body { padding: 0; }
    .aviso-imprimir { display: none; }
    header { border-bottom: 2px solid #000; }
    .card { break-inside: avoid; }
    tr { break-inside: avoid; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  <div class="aviso-imprimir">💡 Use <strong>Ctrl/Cmd + P</strong> e escolha <strong>"Salvar como PDF"</strong> para guardar este relatório.</div>

  <header>
    <div class="marca">ENDORFINAPP — A Química do Crescimento</div>
    <h1>Relatório de Treino</h1>
    <p>${htmlEscape(perfil.nome)}${perfil.email ? ` · ${htmlEscape(perfil.email)}` : ''}</p>
  </header>

  <h2>Resumo</h2>
  <div class="cards">
    <div class="card"><div class="valor">${treinosConcluidos}</div><div class="rotulo">Treinos concluídos</div></div>
    <div class="card"><div class="valor">${Math.round(volumeTotalKg)} kg</div><div class="rotulo">Volume total</div></div>
    <div class="card"><div class="valor">${sessoesNoMes}</div><div class="rotulo">Sessões no mês</div></div>
  </div>

  <h2>Perfil</h2>
  <div class="perfil">
    <div><div class="rotulo">Sexo</div>${htmlEscape(perfil.sexo ?? '—')}</div>
    <div><div class="rotulo">Nascimento</div>${htmlEscape(fmtData(perfil.data_nascimento))}</div>
    <div><div class="rotulo">Peso atual</div>${perfil.peso_kg ? `${perfil.peso_kg} kg` : '—'}</div>
    <div><div class="rotulo">Altura</div>${perfil.altura_cm ? `${perfil.altura_cm} cm` : '—'}</div>
    <div><div class="rotulo">Objetivo</div>${htmlEscape(perfil.objetivo_treino ?? '—')}</div>
    <div><div class="rotulo">Nível</div>${htmlEscape(perfil.nivel_treino ?? '—')}</div>
    <div><div class="rotulo">Meta semanal</div>${perfil.meta_semanal}</div>
  </div>

  <h2>Últimas Medidas</h2>
  <table>
    <thead>
      <tr><th>Data</th><th>Peso (kg)</th><th>Altura (cm)</th><th>IMC</th><th>% Gordura</th><th>Massa magra (kg)</th></tr>
    </thead>
    <tbody>${medidasRows}</tbody>
  </table>

  <h2>Últimos Treinos (até 20)</h2>
  <table>
    <thead>
      <tr><th>Data</th><th>Nome</th><th>Status</th></tr>
    </thead>
    <tbody>${treinosRows}</tbody>
  </table>

  <footer>Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR')} · ENDORFINAPP · Dados exportados conforme LGPD (art. 18, portabilidade).</footer>
</body>
</html>
`
}
