-- Migration para adicionar campos faltantes em treino_exercicios
-- Esses campos estavam no schema.prisma mas nunca foram aplicados ao banco

ALTER TABLE treino_exercicios ADD COLUMN IF NOT EXISTS metodo VARCHAR(50) DEFAULT 'TRADICIONAL';
ALTER TABLE treino_exercicios ADD COLUMN IF NOT EXISTS bloco_grupo INT;
ALTER TABLE treino_exercicios ADD COLUMN IF NOT EXISTS tempo_descanso_segundos INT DEFAULT 60;
ALTER TABLE treino_exercicios ADD COLUMN IF NOT EXISTS observacoes TEXT;
