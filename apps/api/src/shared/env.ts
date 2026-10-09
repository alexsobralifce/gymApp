import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  API_BASE_URL: z.string().url().default('http://localhost:3333'),
  WEB_BASE_URL: z.string().url().optional(),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:admin@endorfinapp.com'),

  SMTP_HOST: z.string().optional().default('smtp.sendgrid.net'),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default('apikey'),
  SMTP_PASS: z.string().optional().default(''),
  FROM_EMAIL: z.string().optional().default('suportendorfinapp@gmail.com'),
  SENDGRID_API_KEY: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),

  // Blog: o redeploy do site usa o token de projeto do Railway.
  // Robô de curadoria semanal (roda dentro da API; o painel root também dispara manualmente).
  OPENAI_API_KEY: z.string().optional().default(''),
  CURADORIA_MODELO: z.string().optional().default('gpt-5.4-mini'),
  // Importação de treino por texto (usa a mesma chave OPENAI_API_KEY).
  IMPORTACAO_TREINO_MODELO: z.string().optional().default('gpt-5.4-mini'),
  CURADORIA_UTILIDADE_MIN: z.coerce.number().int().min(1).max(5).optional().default(3),
  // Imagens de capa geradas por IA para as Leituras da semana.
  CURADORIA_MODELO_IMAGEM: z.string().optional().default('gpt-image-1-mini'),
  CURADORIA_IMAGEM_QUALIDADE: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  // Mesmo cuidado do BILLING_ENABLED: nunca z.coerce.boolean() ("false" viraria true).
  // IndexNow: chave pública (arquivo <chave>.txt na raiz do site) e endereço do site para avisar os buscadores.
  INDEXNOW_KEY: z.string().optional().default(''),
  SITE_URL: z.string().url().optional().default('https://endorfinapp.com.br'),
  // Segredo que o GitHub Actions envia (x-curadoria-token) para disparar a curadoria semanal.
  CURADORIA_TOKEN: z.string().optional().default(''),
  // Segredo do hubMonitor (header x-interno-token) para ler GET /interno/uso. Vazio = rota fechada.
  INTERNO_TOKEN: z.string().optional().default(''),
  CURADORIA_AGENDADA: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
  RAILWAY_PROJECT_TOKEN: z.string().optional().default(''),
  RAILWAY_WEB_SERVICE_ID: z.string().optional().default(''),
  RAILWAY_ENVIRONMENT_ID: z.string().optional().default(''),

  GOOGLE_CLIENT_ID: z.string().optional().default('100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com'),

  GOOGLE_PLAY_PACKAGE_NAME: z.string().optional().default('com.endorfinapp.app'),
  GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(''),
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: z.string().optional().default(''),
  GOOGLE_PLAY_PUBSUB_AUDIENCE: z.string().optional().default(''),

  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  INSTAGRAM_REDIRECT_URI: z.string().optional().default(''),

  // Billing (Mercado Pago) — ver docs/planning/integracao-mercado-pago.md
  // NUNCA usar z.coerce.boolean() aqui: Boolean("false") === true em JS, então
  // "BILLING_ENABLED=false" no .env viraria `true` silenciosamente.
  BILLING_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  BILLING_PROVIDER: z.string().optional().default('mercadopago'),
  MP_ACCESS_TOKEN: z.string().optional().default(''),
  MP_PUBLIC_KEY: z.string().optional().default(''),
  MP_WEBHOOK_SECRET: z.string().optional().default(''),
  MP_ENV: z.enum(['sandbox', 'production']).optional().default('sandbox'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
