-- Criar enums de assinatura
CREATE TYPE "AssinaturaStatus" AS ENUM ('ATIVA', 'EM_CARENCIA', 'EXPIRADA', 'CANCELADA', 'REVOGADA');
CREATE TYPE "AssinaturaOrigem" AS ENUM ('PROPRIA', 'PATROCINADA', 'MANUAL');
CREATE TYPE "Loja" AS ENUM ('GOOGLE_PLAY', 'APPLE_STORE', 'MANUAL');
CREATE TYPE "ConviteStatus" AS ENUM ('PENDENTE', 'USADO', 'EXPIRADO', 'REVOGADO');

-- Adicionar campos ao Usuario para liberação manual e relações
ALTER TABLE "usuarios" ADD COLUMN "premium_manual_em" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN "premium_manual_por" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "premium_manual_nota" TEXT;

-- Tabela de planos de assinatura
CREATE TABLE "planos_assinatura" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "papel_alvo" "Role" NOT NULL,
    "preco_mensal_cents" INTEGER NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "google_play_product_id" TEXT NOT NULL,
    "trial_dias" INTEGER NOT NULL DEFAULT 15,
    "limite_alunos" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_assinatura_pkey" PRIMARY KEY ("id")
);

-- Tabela de assinaturas
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "loja" "Loja" NOT NULL DEFAULT 'GOOGLE_PLAY',
    "origem" "AssinaturaOrigem" NOT NULL DEFAULT 'PROPRIA',
    "status" "AssinaturaStatus" NOT NULL DEFAULT 'ATIVA',
    "google_purchase_token" TEXT,
    "google_order_id" TEXT,
    "inicio_em" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "trial_iniciado_em" TIMESTAMP(3),
    "trial_fim_em" TIMESTAMP(3),
    "auto_renovating" BOOLEAN NOT NULL DEFAULT true,
    "cancelada_em" TIMESTAMP(3),
    "motivo_revogacao" JSONB,
    "patrocinada_por_usuario_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- Tabela de eventos de assinatura (log imutável)
CREATE TABLE "assinatura_eventos" (
    "id" TEXT NOT NULL,
    "assinatura_id" TEXT,
    "purchase_token" TEXT,
    "tipo_evento" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "erro" TEXT,
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinatura_eventos_pkey" PRIMARY KEY ("id")
);

-- Tabela de convites de professor para aluno
CREATE TABLE "convites_aluno" (
    "id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ConviteStatus" NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMP(3) NOT NULL,
    "aluno_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convites_aluno_pkey" PRIMARY KEY ("id")
);

-- Constraints unique
CREATE UNIQUE INDEX "planos_assinatura_codigo_key" ON "planos_assinatura"("codigo");
CREATE UNIQUE INDEX "planos_assinatura_google_play_product_id_key" ON "planos_assinatura"("google_play_product_id");
CREATE UNIQUE INDEX "assinaturas_google_purchase_token_key" ON "assinaturas"("google_purchase_token");
CREATE UNIQUE INDEX "convites_aluno_token_key" ON "convites_aluno"("token");
CREATE UNIQUE INDEX "convites_aluno_aluno_id_key" ON "convites_aluno"("aluno_id");

-- Índices
CREATE INDEX "assinaturas_usuario_id_idx" ON "assinaturas"("usuario_id");
CREATE INDEX "assinaturas_patrocinada_por_usuario_id_status_idx" ON "assinaturas"("patrocinada_por_usuario_id", "status");
CREATE INDEX "assinaturas_status_expires_at_idx" ON "assinaturas"("status", "expires_at");
CREATE INDEX "assinatura_eventos_purchase_token_idx" ON "assinatura_eventos"("purchase_token");
CREATE INDEX "assinatura_eventos_assinatura_id_recebido_em_idx" ON "assinatura_eventos"("assinatura_id", "recebido_em");
CREATE INDEX "convites_aluno_token_idx" ON "convites_aluno"("token");
CREATE INDEX "convites_aluno_professor_id_status_idx" ON "convites_aluno"("professor_id", "status");

-- Foreign keys
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos_assinatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assinatura_eventos" ADD CONSTRAINT "assinatura_eventos_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convites_aluno" ADD CONSTRAINT "convites_aluno_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "convites_aluno" ADD CONSTRAINT "convites_aluno_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
