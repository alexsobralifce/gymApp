-- Remove unique partial index that prevented new posts on recycled treinos.
-- Treinos são reciclados (CONCLUIDO → ACEITO) com o mesmo id; cada conclusão
-- deve gerar UM post novo no mural. O upsert na chave única atualizava o post
-- antigo (criado_em antigo) e o mural nunca mostrava o treino de hoje.
DROP INDEX IF EXISTS "social_posts_treino_id_aluno_id_tipo_key";
