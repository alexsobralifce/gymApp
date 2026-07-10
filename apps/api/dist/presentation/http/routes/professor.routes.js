import { z } from 'zod';
import { Role } from '@prisma/client';
import { dashboardProfessor } from '../../../application/usecases/treino/TreinoService.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { obterCorrelacoes } from '../../../application/usecases/correlacao/CorrelacaoService.js';
import { NotFoundError, TenantAccessError } from '../../../domain/errors/AppError.js';
async function resolveProfessor(usuarioId) {
    return prisma.professor.upsert({
        where: { usuario_id: usuarioId },
        create: { usuario_id: usuarioId },
        update: {},
    });
}
export async function professorRoutes(app) {
    const preHandler = [app.authenticate, app.requireRole(Role.PROFESSOR)];
    /** POST /professores/perfil — cria perfil professor após registro */
    app.post('/perfil', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { cref } = z.object({ cref: z.string().optional() }).parse(request.body);
        const professor = await prisma.professor.upsert({
            where: { usuario_id: request.currentUser.sub },
            create: { usuario_id: request.currentUser.sub, cref },
            update: { cref },
        });
        return reply.status(200).send(professor);
    });
    /** POST /professores/vincular/:academiaId — UC-09 */
    app.post('/vincular/:academiaId', { preHandler }, async (request, reply) => {
        const { academiaId } = z.object({ academiaId: z.string() }).parse(request.params);
        const professor = await resolveProfessor(request.currentUser.sub);
        const vinculo = await prisma.professorAcademia.upsert({
            where: { professor_id_academia_id: { professor_id: professor.id, academia_id: academiaId } },
            create: { professor_id: professor.id, academia_id: academiaId },
            update: {},
        });
        return reply.status(200).send(vinculo);
    });
    /** POST /professores/alunos — UC-10 */
    app.post('/alunos', { preHandler }, async (request, reply) => {
        const body = z.object({
            usuarioId: z.string(),
            academiaId: z.string().optional(),
        }).parse(request.body);
        const professor = await resolveProfessor(request.currentUser.sub);
        const aluno = await prisma.aluno.upsert({
            where: { usuario_id: body.usuarioId },
            create: {
                usuario_id: body.usuarioId,
                professor_id: professor.id,
                academia_id: body.academiaId,
            },
            update: { professor_id: professor.id },
        });
        return reply.status(200).send(aluno);
    });
    /** GET /professores/dashboard — UC-14 */
    app.get('/dashboard', { preHandler }, async (request, reply) => {
        const professor = await resolveProfessor(request.currentUser.sub);
        const data = await dashboardProfessor(professor.id);
        return reply.status(200).send(data);
    });
    /** GET /professores/alunos/:alunoId/correlacoes — UC-16 + UC-32 */
    app.get('/alunos/:alunoId/correlacoes', { preHandler }, async (request, reply) => {
        const { alunoId } = z.object({ alunoId: z.string() }).parse(request.params);
        const professor = await resolveProfessor(request.currentUser.sub);
        const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
        if (!aluno)
            throw new NotFoundError('Aluno');
        if (aluno.professor_id !== professor.id)
            throw new TenantAccessError();
        const resultado = await obterCorrelacoes(alunoId);
        return reply.status(200).send(resultado);
    });
}
//# sourceMappingURL=professor.routes.js.map