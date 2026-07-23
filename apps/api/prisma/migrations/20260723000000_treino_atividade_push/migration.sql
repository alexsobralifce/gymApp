-- AlterTable
ALTER TABLE "treinos" ADD COLUMN IF NOT EXISTS "ultima_atividade_em" TIMESTAMP(3);
ALTER TABLE "treinos" ADD COLUMN IF NOT EXISTS "notificado_inatividade_em" TIMESTAMP(3);
ALTER TABLE "treinos" ADD COLUMN IF NOT EXISTS "notificado_longo_em" TIMESTAMP(3);
