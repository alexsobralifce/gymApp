-- AlterTable
ALTER TABLE "blog_artigos" ADD COLUMN "imagem_alt" TEXT,
ADD COLUMN "imagem_url" TEXT;

-- Imagens do primeiro artigo (arquivos em apps/web/public/blog-img): capa e imagem na seção "avaliação inicial"
UPDATE "blog_artigos"
SET "imagem_url" = '/blog-img/ficha-de-treino-tablet.webp',
    "imagem_alt" = 'Personal trainer sorrindo e mostrando a ficha de treino em um tablet enquanto um aluno treina ao fundo'
WHERE "slug" = 'como-montar-ficha-de-treino-para-aluno' AND "imagem_url" IS NULL;

UPDATE "blog_artigos"
SET "secoes" = jsonb_set("secoes", '{0,imagem}', '{"url":"/blog-img/personal-conversa-aluno.webp","alt":"Personal trainer conversando com um aluno e anotando seus objetivos em um tablet na academia"}'::jsonb)
WHERE "slug" = 'como-montar-ficha-de-treino-para-aluno'
  AND jsonb_typeof("secoes") = 'array'
  AND "secoes" -> 0 -> 'imagem' IS NULL;
