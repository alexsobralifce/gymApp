import { Role } from '@prisma/client';
export type RegisterInput = {
    nome: string;
    email: string;
    senha: string;
    role: Role;
};
export type LoginInput = {
    email: string;
    senha: string;
};
export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};
export declare class AuthService {
    private static _jwtSign;
    static setJwtSigner(fn: (payload: object) => string): void;
    /**
     * UC relacionado: UC-05 (academia), UC-09 (professor), UC-17 (aluno)
     * Cria usuário base. O perfil específico (Academia, Professor, Aluno)
     * é criado pelo UseCase correspondente após o registro.
     */
    static register(input: RegisterInput): Promise<{
        id: string;
        email: string;
        nome: string;
        role: import(".prisma/client").$Enums.Role;
        criado_em: Date;
    }>;
    /**
     * Login com e-mail e senha — retorna par de tokens JWT
     */
    static login(input: LoginInput, jwtSign: (payload: object, opts?: object) => string): Promise<AuthTokens>;
    /**
     * Troca refresh token por novo par de tokens
     */
    static refresh(refreshToken: string, jwtVerify: (token: string, opts?: object) => {
        sub: string;
    }, jwtSign: (payload: object, opts?: object) => string): Promise<AuthTokens>;
    /**
     * Logout — invalida o refresh token
     */
    static logout(refreshToken: string): Promise<void>;
}
//# sourceMappingURL=AuthService.d.ts.map