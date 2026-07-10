-- CreateTable
CREATE TABLE "correlacoes_desempenho" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "peso_volume_r" DOUBLE PRECISION,
    "bf_volume_r" DOUBLE PRECISION,
    "massa_magra_volume_r" DOUBLE PRECISION,
    "volume_semanal" JSONB NOT NULL,
    "pontos" JSONB NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correlacoes_desempenho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "correlacoes_desempenho_aluno_id_key" ON "correlacoes_desempenho"("aluno_id");

-- AddForeignKey
ALTER TABLE "correlacoes_desempenho" ADD CONSTRAINT "correlacoes_desempenho_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
