-- Migration para adicionar a tabela avaliacoes_fotos
CREATE TABLE IF NOT EXISTS "avaliacoes_fotos" (
    "id" TEXT NOT NULL,
    "avaliacao_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "mimetype" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_fotos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "avaliacoes_fotos" DROP CONSTRAINT IF EXISTS "avaliacoes_fotos_avaliacao_id_fkey";
ALTER TABLE "avaliacoes_fotos" ADD CONSTRAINT "avaliacoes_fotos_avaliacao_id_fkey" FOREIGN KEY ("avaliacao_id") REFERENCES "avaliacoes_fisicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
