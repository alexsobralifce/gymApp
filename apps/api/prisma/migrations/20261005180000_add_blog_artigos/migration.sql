-- CreateEnum
CREATE TYPE "BlogTipo" AS ENUM ('ORIGINAL', 'CURADORIA');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'DESPUBLICADO');

-- CreateTable
CREATE TABLE "blog_artigos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "BlogTipo" NOT NULL DEFAULT 'ORIGINAL',
    "status" "BlogStatus" NOT NULL DEFAULT 'RASCUNHO',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "autor" TEXT NOT NULL DEFAULT 'Equipe ENDORFINAPP',
    "resumo" TEXT NOT NULL,
    "secoes" JSONB NOT NULL,
    "fontes" JSONB NOT NULL,
    "origem" JSONB,
    "cta" JSONB,
    "publicado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_artigos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_artigos_slug_key" ON "blog_artigos"("slug");

-- CreateIndex
CREATE INDEX "blog_artigos_status_tipo_idx" ON "blog_artigos"("status", "tipo");
