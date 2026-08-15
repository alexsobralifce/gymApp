-- CreateTable
CREATE TABLE "avaliacoes_sistema" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "respostas" JSONB NOT NULL,
    "mensagem" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avaliacoes_sistema_aluno_id_idx" ON "avaliacoes_sistema"("aluno_id");

-- AddForeignKey
ALTER TABLE "avaliacoes_sistema" ADD CONSTRAINT "avaliacoes_sistema_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
