import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { Role } from '@prisma/client'
import { UnauthorizedError, ForbiddenError } from '../../domain/errors/AppError.js'

export type JwtPayload = {
  sub: string      // usuario_id
  role: Role
  tenantId?: string // academia_id (quando role = ACADEMIA, PROFESSOR, ALUNO)
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    currentUser: JwtPayload
  }
}

async function plugin(app: FastifyInstance) {
  // Decora request com helper para autenticação
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      request.currentUser = request.user as JwtPayload
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado')
    }
  })

  // Helper para verificar role específico
  app.decorate('requireRole', (...roles: Role[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!roles.includes(request.currentUser.role)) {
        throw new ForbiddenError(
          `Acesso restrito a: ${roles.join(', ')}`,
        )
      }
    }
  })
}

export const jwtAuthPlugin = fp(plugin, { name: 'jwt-auth' })
