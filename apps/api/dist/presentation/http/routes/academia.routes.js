import { z } from 'zod';
import { Role, AcademiaStatus } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { cadastrarAcademia, autorizarProfessorPrimeiraEtapa, removerProfessor, dashboardAlunosAcademia, } from '../../../application/usecases/academia/AcademiaService.js';
export async function academiaRoutes(app) {
    const preHandler = [app.authenticate, app.requireRole(Role.ACADEMIA)];
    /** GET /academias — lista academias ativas (qualquer usuário autenticado) */
    app.get('/', { preHandler: [app.authenticate] }, async (_request, reply) => {
        const academias = await prisma.academia.findMany({
            where: { status: AcademiaStatus.ATIVO },
            select: { id: true, nome: true, cnpj: true, status: true },
        });
        return reply.status(200).send(academias);
    });
    /** POST /academias — UC-05 (aberto para usuário com role ACADEMIA recém-criado) */
    app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const body = z.object({
            nome: z.string().min(2),
            cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos'),
        }).parse(request.body);
        const academia = await cadastrarAcademia(request.currentUser.sub, body);
        return reply.status(201).send(academia);
    });
    /** POST /academias/professores/:professorId/autorizar — UC-06 */
    app.post('/professores/:professorId/autorizar', { preHandler }, async (request, reply) => {
        const { professorId } = z.object({ professorId: z.string() }).parse(request.params);
        const academiaId = request.currentUser.tenantId;
        const vinculo = await autorizarProfessorPrimeiraEtapa(academiaId, professorId);
        return reply.status(200).send(vinculo);
    });
    /** DELETE /academias/professores/:professorId — UC-07 */
    app.delete('/professores/:professorId', { preHandler }, async (request, reply) => {
        const { professorId } = z.object({ professorId: z.string() }).parse(request.params);
        const academiaId = request.currentUser.tenantId;
        await removerProfessor(academiaId, professorId);
        return reply.status(204).send();
    });
    /** GET /academias/alunos — UC-08 */
    app.get('/alunos', { preHandler }, async (request, reply) => {
        const academiaId = request.currentUser.tenantId;
        const alunos = await dashboardAlunosAcademia(academiaId);
        return reply.status(200).send(alunos);
    });
}
//# sourceMappingURL=academia.routes.js.map