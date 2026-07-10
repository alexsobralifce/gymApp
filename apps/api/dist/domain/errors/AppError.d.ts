export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class InvalidStateTransitionError extends AppError {
    constructor(statusAtual: string, statusDesejado: string);
}
export declare class LimiteProfessoresExcedidoError extends AppError {
    constructor(limite: number);
}
export declare class TenantAccessError extends AppError {
    constructor();
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
//# sourceMappingURL=AppError.d.ts.map