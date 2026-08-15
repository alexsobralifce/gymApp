-- CreateTable
CREATE TABLE "wearable_integracoes" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "user_id_ext" TEXT NOT NULL,
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "token_expira_em" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wearable_integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wearable_eventos" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload_raw" JSONB NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "erro_msg" TEXT,
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wearable_integracoes_aluno_id_provedor_key" ON "wearable_integracoes"("aluno_id", "provedor");

-- CreateIndex
CREATE INDEX "wearable_eventos_aluno_id_recebido_em_idx" ON "wearable_eventos"("aluno_id", "recebido_em");

-- AddForeignKey
ALTER TABLE "wearable_integracoes" ADD CONSTRAINT "wearable_integracoes_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wearable_eventos" ADD CONSTRAINT "wearable_eventos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
