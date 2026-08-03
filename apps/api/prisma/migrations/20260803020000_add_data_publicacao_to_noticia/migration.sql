-- AlterTable
ALTER TABLE "noticias" ADD COLUMN "data_publicacao" TIMESTAMP(3);

-- Backfill existing rows
UPDATE "noticias" SET "data_publicacao" = "criado_em" WHERE "data_publicacao" IS NULL;
