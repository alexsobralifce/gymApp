// ─── Erros de Domínio — GymApp ────────────────────────────────────────────────
export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'APP_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
// ─── Auth ─────────────────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
    constructor(message = 'Não autorizado') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado') {
        super(message, 403, 'FORBIDDEN');
    }
}
// ─── Recursos ─────────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
    constructor(resource = 'Recurso') {
        super(`${resource} não encontrado`, 404, 'NOT_FOUND');
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
// ─── Domínio / Negócio ────────────────────────────────────────────────────────
export class InvalidStateTransitionError extends AppError {
    constructor(statusAtual, statusDesejado) {
        super(`Transição inválida: ${statusAtual} → ${statusDesejado}`, 422, 'INVALID_STATE_TRANSITION');
    }
}
export class LimiteProfessoresExcedidoError extends AppError {
    constructor(limite) {
        super(`Limite de professores da academia atingido (${limite})`, 422, 'LIMITE_PROFESSORES_EXCEDIDO');
    }
}
export class TenantAccessError extends AppError {
    constructor() {
        super('Acesso a recurso de outro tenant negado', 403, 'TENANT_ACCESS_DENIED');
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 422, 'VALIDATION_ERROR');
    }
}
//# sourceMappingURL=AppError.js.map