import { z } from 'zod';
import { Role, VinculoStatus, AcademiaStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { NotFoundError, ForbiddenError } from '../../../domain/errors/AppError.js';
import { painelGlobal, aprovacaoAcademia, definirLimiteProfessores, aprovacaoVinculoProfessor, alterarStatusAcademia, } from '../../../application/usecases/academia/AcademiaService.js';
export async function rootRoutes(app) {
    const preHandler = [app.authenticate, app.requireRole(Role.ROOT)];
    /** GET /root/painel — UC-04 */
    app.get('/painel', { preHandler }, async (_request, reply) => {
        const data = await painelGlobal();
        return reply.status(200).send(data);
    });
    /** GET /root/vinculos — lista vínculos pendentes (2ª camada) */
    app.get('/vinculos', { preHandler }, async (_request, reply) => {
        const vinculos = await prisma.professorAcademia.findMany({
            where: { status: VinculoStatus.PENDENTE_ROOT },
            include: {
                professor: { include: { usuario: { select: { nome: true, email: true } } } },
                academia: { select: { id: true, nome: true } },
            },
            orderBy: { criado_em: 'asc' },
        });
        return reply.status(200).send(vinculos);
    });
    /** PATCH /root/academias/:id/aprovacao — UC-01 */
    app.patch('/academias/:id/aprovacao', { preHandler }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const { acao, motivo } = z.object({
            acao: z.enum(['APROVAR', 'REJEITAR']),
            motivo: z.string().optional(),
        }).parse(request.body);
        const academia = await aprovacaoAcademia(id, acao, motivo);
        return reply.status(200).send(academia);
    });
    /** PATCH /root/academias/:id/limite-professores — UC-02 */
    app.patch('/academias/:id/limite-professores', { preHandler }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const { limite } = z.object({ limite: z.number().int().min(1).max(500) }).parse(request.body);
        const academia = await definirLimiteProfessores(id, limite);
        return reply.status(200).send(academia);
    });
    /** PATCH /root/vinculos/:id/aprovacao — UC-03 */
    app.patch('/vinculos/:id/aprovacao', { preHandler }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const { acao } = z.object({ acao: z.enum(['APROVAR', 'REJEITAR']) }).parse(request.body);
        const vinculo = await aprovacaoVinculoProfessor(id, acao);
        return reply.status(200).send(vinculo);
    });
    /** PATCH /root/academias/:id/status */
    app.patch('/academias/:id/status', { preHandler }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const { status } = z.object({ status: z.enum([AcademiaStatus.ATIVO, AcademiaStatus.REJEITADO]) }).parse(request.body);
        const academia = await alterarStatusAcademia(id, status);
        return reply.status(200).send(academia);
    });
    /** GET /root/usuarios — lista todos os usuários */
    app.get('/usuarios', { preHandler }, async (_request, reply) => {
        const usuarios = await prisma.usuario.findMany({
            include: {
                academia: true,
                professor: true,
                aluno: true,
            },
            orderBy: { criado_em: 'desc' },
        });
        return reply.status(200).send(usuarios);
    });
    /** POST /root/usuarios/:id/reset-password — reseta senha */
    app.post('/usuarios/:id/reset-password', { preHandler }, async (request, reply) => {
        const { id } = z.object({ id: z.string() }).parse(request.params);
        const { senha } = z.object({ senha: z.string().min(8) }).parse(request.body);
        const usuario = await prisma.usuario.findUnique({ where: { id } });
        if (!usuario)
            throw new NotFoundError('Usuário não encontrado');
        if (usuario.role === Role.ROOT)
            throw new ForbiddenError('Não é permitido resetar a senha de outro administrador ROOT');
        const senhaHash = await bcrypt.hash(senha, 12);
        await prisma.usuario.update({
            where: { id },
            data: { senha_hash: senhaHash },
        });
        return reply.status(200).send({ message: 'Senha resetada com sucesso!' });
    });
}
//# sourceMappingURL=root.routes.js.map