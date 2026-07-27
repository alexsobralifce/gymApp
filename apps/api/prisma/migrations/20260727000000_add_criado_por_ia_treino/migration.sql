-- AlterTable: adiciona flag criado_por_ia no modelo treinos
ALTER TABLE "treinos" ADD COLUMN IF NOT EXISTS "criado_por_ia" BOOLEAN NOT NULL DEFAULT false;
