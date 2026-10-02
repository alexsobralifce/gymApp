-- CreateEnum
CREATE TYPE "PromocaoTipo" AS ENUM ('CAMPANHA', 'PLANO', 'PARCERIA', 'PRODUTO');

-- CreateEnum
CREATE TYPE "PromocaoEvento" AS ENUM ('VISUALIZACAO', 'CLIQUE');

-- CreateTable
CREATE TABLE "promocoes" (
    "id" TEXT NOT NULL,
    "academia_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "PromocaoTipo" NOT NULL DEFAULT 'CAMPANHA',
    "imagem_url" TEXT,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "preco_texto" TEXT,
    "inicio_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim_em" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promocoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocao_eventos" (
    "id" TEXT NOT NULL,
    "promocao_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "tipo" "PromocaoEvento" NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promocao_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promocoes_academia_id_ativo_idx" ON "promocoes"("academia_id", "ativo");

-- CreateIndex
CREATE INDEX "promocao_eventos_promocao_id_tipo_idx" ON "promocao_eventos"("promocao_id", "tipo");

-- AddForeignKey
ALTER TABLE "promocoes" ADD CONSTRAINT "promocoes_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocao_eventos" ADD CONSTRAINT "promocao_eventos_promocao_id_fkey" FOREIGN KEY ("promocao_id") REFERENCES "promocoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
