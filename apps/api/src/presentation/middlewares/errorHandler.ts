import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import { AppError } from '../../domain/errors/AppError.js'

async function plugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | ZodError | Error, _request: FastifyRequest, reply: FastifyReply) => {
    // Erros de domínio
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      })
    }

    // Erros de validação Zod
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: error.flatten().fieldErrors,
      })
    }

    // Erros do Fastify (ex: schema validation)
    if ('statusCode' in error && error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: 'REQUEST_ERROR',
        message: error.message,
      })
    }

    // Erro interno inesperado — não vazar detalhes em produção
    app.log.error(error)
    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno no servidor',
    })
  })
}

export const errorHandlerPlugin = fp(plugin, { name: 'error-handler' })
