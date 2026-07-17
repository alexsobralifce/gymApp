-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDENTE', 'ACEITO', 'BLOQUEADO');
CREATE TYPE "PostTipo" AS ENUM ('TREINO_INICIADO', 'TREINO_CONCLUIDO', 'RECORDE_PESSOAL', 'BADGE_CONQUISTADO', 'DESAFIO_COMPLETO');
CREATE TYPE "Visibilidade" AS ENUM ('AMIGOS', 'PUBLICO', 'PRIVADO');
CREATE TYPE "ClubTipo" AS ENUM ('ACADEMIA', 'TEMATICO');

-- AlterTable
ALTER TABLE "alunos" ADD COLUMN "visibilidade_padrao" "Visibilidade" NOT NULL DEFAULT 'AMIGOS';
ALTER TABLE "alunos" ADD COLUMN "permite_busca_email" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "alunos" ADD COLUMN "consentiu_feed_social_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "social_friendships" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "amigo_id" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_friendships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "treino_id" TEXT,
    "clube_id" TEXT,
    "autor_nome" TEXT NOT NULL,
    "autor_foto_url" TEXT,
    "grupo_muscular_resumo" TEXT,
    "tipo" "PostTipo" NOT NULL,
    "visibilidade" "Visibilidade" NOT NULL,
    "midia_url" TEXT,
    "curtidas_count" INTEGER NOT NULL DEFAULT 0,
    "comentarios_count" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    CONSTRAINT "social_likes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "autor_nome" TEXT NOT NULL,
    "texto" VARCHAR(280) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_clubs" (
    "id" TEXT NOT NULL,
    "academia_id" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" "ClubTipo" NOT NULL DEFAULT 'ACADEMIA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_clubs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_club_members" (
    "id" TEXT NOT NULL,
    "clube_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "xp_semana" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_club_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_friendships_aluno_id_amigo_id_key" ON "social_friendships"("aluno_id", "amigo_id");
CREATE INDEX "social_friendships_amigo_id_status_idx" ON "social_friendships"("amigo_id", "status");
CREATE INDEX "social_posts_aluno_id_criado_em_idx" ON "social_posts"("aluno_id", "criado_em");
CREATE INDEX "social_posts_clube_id_criado_em_idx" ON "social_posts"("clube_id", "criado_em");
CREATE INDEX "social_posts_visibilidade_criado_em_idx" ON "social_posts"("visibilidade", "criado_em");
CREATE UNIQUE INDEX "social_likes_post_id_aluno_id_key" ON "social_likes"("post_id", "aluno_id");
CREATE INDEX "social_likes_post_id_idx" ON "social_likes"("post_id");
CREATE INDEX "social_comments_post_id_criado_em_idx" ON "social_comments"("post_id", "criado_em");
CREATE UNIQUE INDEX "social_clubs_academia_id_key" ON "social_clubs"("academia_id");
CREATE UNIQUE INDEX "social_club_members_clube_id_aluno_id_key" ON "social_club_members"("clube_id", "aluno_id");
CREATE INDEX "social_club_members_clube_id_xp_semana_idx" ON "social_club_members"("clube_id", "xp_semana");
