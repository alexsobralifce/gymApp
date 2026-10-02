-- CreateEnum
CREATE TYPE "AcessoTipo" AS ENUM ('VISITA_LANDING', 'LOGIN');

-- CreateTable
CREATE TABLE "acesso_eventos" (
    "id" TEXT NOT NULL,
    "tipo" "AcessoTipo" NOT NULL,
    "visitor_id" TEXT,
    "usuario_id" TEXT,
    "role" "Role",
    "metodo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acesso_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acesso_eventos_tipo_criado_em_idx" ON "acesso_eventos"("tipo", "criado_em");
