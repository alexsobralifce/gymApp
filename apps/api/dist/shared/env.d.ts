export declare const env: {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    API_BASE_URL: string;
    DATABASE_URL: string;
    REDIS_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    STORAGE_REGION: string;
    VAPID_PUBLIC_KEY: string;
    VAPID_PRIVATE_KEY: string;
    VAPID_SUBJECT: string;
    WEB_BASE_URL?: string | undefined;
    STORAGE_BUCKET?: string | undefined;
    STORAGE_ENDPOINT?: string | undefined;
    STORAGE_ACCESS_KEY?: string | undefined;
    STORAGE_SECRET_KEY?: string | undefined;
};
export type Env = typeof env;
//# sourceMappingURL=env.d.ts.map