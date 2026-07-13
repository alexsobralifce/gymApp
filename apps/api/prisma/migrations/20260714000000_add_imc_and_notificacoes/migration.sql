ALTER TABLE "medidas_corporais" ADD COLUMN "imc" DOUBLE PRECISION;

CREATE TYPE "NotificacaoTipo" AS ENUM ('PROFESSOR_ATRIBUIDO', 'NOVO_TREINO');

CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "tipo" "NotificacaoTipo" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "dados" JSONB,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
