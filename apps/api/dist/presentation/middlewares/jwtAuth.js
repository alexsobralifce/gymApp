import fp from 'fastify-plugin';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors/AppError.js';
async function plugin(app) {
    // Decora request com helper para autenticação
    app.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
            request.currentUser = request.user;
        }
        catch {
            throw new UnauthorizedError('Token inválido ou expirado');
        }
    });
    // Helper para verificar role específico
    app.decorate('requireRole', (...roles) => {
        return async (request, _reply) => {
            if (!roles.includes(request.currentUser.role)) {
                throw new ForbiddenError(`Acesso restrito a: ${roles.join(', ')}`);
            }
        };
    });
}
export const jwtAuthPlugin = fp(plugin, { name: 'jwt-auth' });
//# sourceMappingURL=jwtAuth.js.map