-- AlterTable
ALTER TABLE "alunos" ADD COLUMN     "nivel_treino" TEXT,
ADD COLUMN     "objetivo_treino" TEXT,
ADD COLUMN     "restricoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "data_nascimento" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "exercicios" ADD COLUMN     "nivel" TEXT;

-- AlterTable
ALTER TABLE "social_likes" ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "treino_exercicios" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'PRINCIPAL',
ALTER COLUMN "metodo" SET NOT NULL,
ALTER COLUMN "metodo" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "planos_biblioteca" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "objetivo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "sexo_alvo" TEXT NOT NULL DEFAULT 'AMBOS',
    "dias_por_semana" INTEGER NOT NULL,
    "split_tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_biblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_sessoes" (
    "id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dia_label" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "plano_sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_sessao_exercicios" (
    "id" TEXT NOT NULL,
    "sessao_id" TEXT NOT NULL,
    "exercicio_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PRINCIPAL',
    "series" INTEGER NOT NULL DEFAULT 3,
    "repeticoes_min" INTEGER NOT NULL DEFAULT 8,
    "repeticoes_max" INTEGER NOT NULL DEFAULT 12,
    "carga_sugerida_kg" DOUBLE PRECISION,
    "restricoes_incompativeis" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alternativo_id" TEXT,

    CONSTRAINT "plano_sessao_exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planos_biblioteca_codigo_key" ON "planos_biblioteca"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "plano_sessao_exercicios_sessao_id_ordem_key" ON "plano_sessao_exercicios"("sessao_id", "ordem");

-- CreateIndex
CREATE INDEX "avaliacoes_fotos_avaliacao_id_idx" ON "avaliacoes_fotos"("avaliacao_id");

-- AddForeignKey
ALTER TABLE "plano_sessoes" ADD CONSTRAINT "plano_sessoes_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos_biblioteca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_sessao_exercicios" ADD CONSTRAINT "plano_sessao_exercicios_alternativo_id_fkey" FOREIGN KEY ("alternativo_id") REFERENCES "exercicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_sessao_exercicios" ADD CONSTRAINT "plano_sessao_exercicios_exercicio_id_fkey" FOREIGN KEY ("exercicio_id") REFERENCES "exercicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_sessao_exercicios" ADD CONSTRAINT "plano_sessao_exercicios_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "plano_sessoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_club_members" ADD CONSTRAINT "social_club_members_clube_id_fkey" FOREIGN KEY ("clube_id") REFERENCES "social_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

