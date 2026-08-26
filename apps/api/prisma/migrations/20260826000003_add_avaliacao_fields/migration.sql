-- Adiciona campos de avaliação pós-treino que estavam no schema mas sem migration
-- Treinos
ALTER TABLE "treinos" ADD COLUMN "nota_avaliacao" INTEGER;
ALTER TABLE "treinos" ADD COLUMN "feedback_comentario" TEXT;

-- Histórico de treinos
ALTER TABLE "treino_historico" ADD COLUMN "nota_avaliacao" INTEGER;
ALTER TABLE "treino_historico" ADD COLUMN "feedback_comentario" TEXT;
