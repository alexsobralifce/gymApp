-- CreateEnum
CREATE TYPE "AvaliacaoStatus" AS ENUM ('RASCUNHO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "RiscoCardiaco" AS ENUM ('BAIXO', 'MODERADO', 'ALTO');

-- CreateTable
CREATE TABLE "avaliacoes_fisicas" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "avaliador_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AvaliacaoStatus" NOT NULL DEFAULT 'CONCLUIDA',
    "parq_positivo" BOOLEAN NOT NULL DEFAULT false,
    "risco_cardiaco" "RiscoCardiaco" NOT NULL DEFAULT 'BAIXO',
    "liberado_teste_max" BOOLEAN NOT NULL DEFAULT true,
    "anamnese_json" JSONB,
    "pas" INTEGER,
    "pad" INTEGER,
    "fc_repouso" INTEGER,
    "peso_kg" DOUBLE PRECISION,
    "estatura_m" DOUBLE PRECISION,
    "imc" DOUBLE PRECISION,
    "rcq" DOUBLE PRECISION,
    "perimetros_cm" JSONB,
    "protocolo_dobras" TEXT,
    "soma_dobras_mm" DOUBLE PRECISION,
    "densidade_corporal" DOUBLE PRECISION,
    "percentual_gordura" DOUBLE PRECISION,
    "massa_gorda_kg" DOUBLE PRECISION,
    "massa_magra_kg" DOUBLE PRECISION,
    "classificacao_gc" TEXT,
    "postural_json" JSONB,
    "flexibilidade_json" JSONB,
    "cardio_json" JSONB,
    "neuro_json" JSONB,
    "laudo_markdown" TEXT,
    "prescricao_json" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avaliacoes_fisicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avaliacoes_fisicas_aluno_id_idx" ON "avaliacoes_fisicas"("aluno_id");

-- CreateIndex
CREATE INDEX "avaliacoes_fisicas_avaliador_id_idx" ON "avaliacoes_fisicas"("avaliador_id");

-- AddForeignKey
ALTER TABLE "avaliacoes_fisicas" ADD CONSTRAINT "avaliacoes_fisicas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes_fisicas" ADD CONSTRAINT "avaliacoes_fisicas_avaliador_id_fkey" FOREIGN KEY ("avaliador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
