import { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
export type JwtPayload = {
    sub: string;
    role: Role;
    tenantId?: string;
};
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireRole: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
    interface FastifyRequest {
        currentUser: JwtPayload;
    }
}
declare function plugin(app: FastifyInstance): Promise<void>;
export declare const jwtAuthPlugin: typeof plugin;
export {};
//# sourceMappingURL=jwtAuth.d.ts.map