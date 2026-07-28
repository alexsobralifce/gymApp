-- Remove existing duplicate posts before adding unique constraint (keep first, delete rest)
DELETE FROM "social_posts" a
USING "social_posts" b
WHERE a.id > b.id 
  AND a.treino_id = b.treino_id 
  AND a.aluno_id = b.aluno_id 
  AND a.tipo = b.tipo;

-- Add unique constraint to prevent duplicate workout posts
CREATE UNIQUE INDEX "social_posts_treino_id_aluno_id_tipo_key" ON "social_posts" ("treino_id", "aluno_id", "tipo") WHERE "treino_id" IS NOT NULL;
