-- CreateEnum
CREATE TYPE "TenantTipo" AS ENUM ('PROFESSOR', 'ACADEMIA', 'ALUNO');

-- CreateEnum
CREATE TYPE "CobrancaStatus" AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA', 'ESTORNADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MetodoPagamentoTipo" AS ENUM ('CARTAO', 'PIX', 'BOLETO');

-- AlterEnum
ALTER TYPE "Loja" ADD VALUE 'WEB_MERCADOPAGO';

-- AlterTable
ALTER TABLE "assinatura_eventos" ADD COLUMN     "evento_externo_id" TEXT,
ADD COLUMN     "gateway" TEXT;

-- AlterTable
ALTER TABLE "assinaturas" ADD COLUMN     "alunos_excedentes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "congelamento_ate" TIMESTAMP(3),
ADD COLUMN     "faixa_alunos_inclusos" INTEGER,
ADD COLUMN     "faixa_alunos_max" INTEGER,
ADD COLUMN     "gateway_customer_id" TEXT,
ADD COLUMN     "gateway_subscription_id" TEXT,
ADD COLUMN     "metodo_pagamento_id" TEXT,
ADD COLUMN     "proxima_cobranca_em" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT,
ADD COLUMN     "tenant_tipo" "TenantTipo",
ADD COLUMN     "valor_mensal_cents" INTEGER;

-- AlterTable
ALTER TABLE "planos_assinatura" ADD COLUMN     "faixa_max_alunos" INTEGER,
ADD COLUMN     "faixa_min_alunos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gateway_product_id" TEXT,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preco_aluno_excedente_cents" INTEGER,
ADD COLUMN     "professores_inclusos" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recursos" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "unidades_inclusas" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "google_play_product_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "uso_mensal" (
    "id" TEXT NOT NULL,
    "tenant_tipo" "TenantTipo" NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "alunos_ativos" INTEGER NOT NULL DEFAULT 0,
    "alunos_vinculados" INTEGER NOT NULL DEFAULT 0,
    "professores_ativos" INTEGER NOT NULL DEFAULT 0,
    "unidades" INTEGER NOT NULL DEFAULT 1,
    "storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "faixa_plano_codigo" TEXT,
    "valor_cents" INTEGER NOT NULL DEFAULT 0,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uso_mensal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas" (
    "id" TEXT NOT NULL,
    "assinatura_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valor_cents" INTEGER NOT NULL,
    "status" "CobrancaStatus" NOT NULL DEFAULT 'PENDENTE',
    "vencimento" TIMESTAMP(3) NOT NULL,
    "pago_em" TIMESTAMP(3),
    "gateway" TEXT DEFAULT 'mercadopago',
    "gateway_charge_id" TEXT,
    "mp_preapproval_id" TEXT,
    "pix_copia_cola" TEXT,
    "pix_qr_base64" TEXT,
    "boleto_url" TEXT,
    "linha_digitavel" TEXT,
    "nfse_numero" TEXT,
    "nfse_url" TEXT,
    "cliente_cnpj" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_metodo" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'mercadopago',
    "gateway_customer_id" TEXT,
    "tipo" "MetodoPagamentoTipo" NOT NULL DEFAULT 'CARTAO',
    "cartao_ultimos4" TEXT,
    "cartao_bandeira" TEXT,
    "token" TEXT,
    "padrao" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_metodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uso_mensal_competencia_idx" ON "uso_mensal"("competencia");

-- CreateIndex
CREATE UNIQUE INDEX "uso_mensal_tenant_tipo_tenant_id_competencia_key" ON "uso_mensal"("tenant_tipo", "tenant_id", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "cobrancas_gateway_charge_id_key" ON "cobrancas"("gateway_charge_id");

-- CreateIndex
CREATE INDEX "cobrancas_assinatura_id_competencia_idx" ON "cobrancas"("assinatura_id", "competencia");

-- CreateIndex
CREATE INDEX "cobrancas_status_vencimento_idx" ON "cobrancas"("status", "vencimento");

-- CreateIndex
CREATE INDEX "pagamentos_metodo_usuario_id_idx" ON "pagamentos_metodo"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "assinatura_eventos_evento_externo_id_key" ON "assinatura_eventos"("evento_externo_id");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_gateway_subscription_id_key" ON "assinaturas"("gateway_subscription_id");

-- CreateIndex
CREATE INDEX "assinaturas_tenant_tipo_tenant_id_idx" ON "assinaturas"("tenant_tipo", "tenant_id");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_metodo_pagamento_id_fkey" FOREIGN KEY ("metodo_pagamento_id") REFERENCES "pagamentos_metodo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_metodo" ADD CONSTRAINT "pagamentos_metodo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

