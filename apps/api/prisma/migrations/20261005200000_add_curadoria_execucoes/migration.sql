-- CreateEnum
CREATE TYPE "CuradoriaStatus" AS ENUM ('EXECUTANDO', 'OK', 'ERRO');

-- CreateEnum
CREATE TYPE "CuradoriaOrigem" AS ENUM ('AGENDADA', 'MANUAL');

-- CreateTable
CREATE TABLE "blog_curadoria_execucoes" (
    "id" TEXT NOT NULL,
    "status" "CuradoriaStatus" NOT NULL DEFAULT 'EXECUTANDO',
    "origem" "CuradoriaOrigem" NOT NULL,
    "publicar" BOOLEAN NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "geradas" INTEGER NOT NULL DEFAULT 0,
    "relatorio" JSONB,
    "erro" TEXT,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "blog_curadoria_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_curadoria_execucoes_iniciado_em_idx" ON "blog_curadoria_execucoes"("iniciado_em");
