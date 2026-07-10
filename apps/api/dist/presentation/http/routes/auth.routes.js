import { z } from 'zod';
import { Role } from '@prisma/client';
import { AuthService } from '../../../application/usecases/auth/AuthService.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
const registerBodySchema = z.object({
    nome: z.string().min(2).max(100),
    email: z.string().email(),
    senha: z.string().min(8),
    role: z.enum([Role.ACADEMIA, Role.PROFESSOR, Role.ALUNO]),
});
const loginBodySchema = z.object({
    email: z.string().email(),
    senha: z.string().min(1),
});
const refreshBodySchema = z.object({
    refreshToken: z.string(),
});
export async function authRoutes(app) {
    /**
     * POST /auth/register
     * Cria conta base. Use UC-05, UC-09, UC-17 para criar o perfil específico.
     */
    app.post('/register', async (request, reply) => {
        const body = registerBodySchema.parse(request.body);
        const usuario = await AuthService.register(body);
        return reply.status(201).send(usuario);
    });
    /**
     * POST /auth/login
     */
    app.post('/login', async (request, reply) => {
        const body = loginBodySchema.parse(request.body);
        const tokens = await AuthService.login(body, app.jwt.sign.bind(app.jwt));
        return reply.status(200).send(tokens);
    });
    /**
     * POST /auth/refresh
     */
    app.post('/refresh', async (request, reply) => {
        const { refreshToken } = refreshBodySchema.parse(request.body);
        const tokens = await AuthService.refresh(refreshToken, app.jwt.verify.bind(app.jwt), app.jwt.sign.bind(app.jwt));
        return reply.status(200).send(tokens);
    });
    /**
     * POST /auth/logout
     */
    app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { refreshToken } = refreshBodySchema.parse(request.body);
        await AuthService.logout(refreshToken);
        return reply.status(204).send();
    });
    /**
     * GET /auth/me
     */
    app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { sub: id, role, tenantId } = request.currentUser;
        const usuario = await prisma.usuario.findUnique({
            where: { id },
            select: { expo_push_token: true },
        });
        return reply.status(200).send({ id, role, tenantId, expoPushToken: usuario?.expo_push_token ?? null });
    });
    /**
     * PATCH /auth/me — Atualiza dados do perfil (ex: push token)
     */
    app.patch('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
        const body = z.object({
            expoPushToken: z.string().nullable().optional(),
            webPushSubscription: z.any().nullable().optional(),
        }).parse(request.body);
        const data = {};
        if (body.expoPushToken !== undefined)
            data.expo_push_token = body.expoPushToken;
        if (body.webPushSubscription !== undefined)
            data.web_push_subscription = body.webPushSubscription;
        const usuario = await prisma.usuario.update({
            where: { id: request.currentUser.sub },
            data,
            select: { id: true, expo_push_token: true },
        });
        return reply.status(200).send(usuario);
    });
}
//# sourceMappingURL=auth.routes.js.map