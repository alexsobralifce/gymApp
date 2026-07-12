-- AlterTable
ALTER TABLE "exercicios" DROP COLUMN IF EXISTS "imagem_url_final",
ADD COLUMN IF NOT EXISTS "descricao_pt" TEXT,
ADD COLUMN IF NOT EXISTS "gif_url" TEXT,
ADD COLUMN IF NOT EXISTS "musculo_alvo" TEXT,
ADD COLUMN IF NOT EXISTS "musculos_secundarios" TEXT[],
ADD COLUMN IF NOT EXISTS "passos_pt" TEXT[];
