-- CreateEnum
CREATE TYPE "ClubMemberRole" AS ENUM ('CRIADOR', 'MEMBRO');

-- AlterTable: social_clubs
ALTER TABLE "social_clubs" ADD COLUMN "codigo_convite" TEXT;
ALTER TABLE "social_clubs" ADD COLUMN "descricao" TEXT;
ALTER TABLE "social_clubs" ADD CONSTRAINT "social_clubs_codigo_convite_key" UNIQUE ("codigo_convite");

-- AlterTable: social_club_members
ALTER TABLE "social_club_members" ADD COLUMN "role" "ClubMemberRole" NOT NULL DEFAULT 'MEMBRO';

-- CreateTable: social_post_clubes
CREATE TABLE "social_post_clubes" (
    "post_id" TEXT NOT NULL,
    "clube_id" TEXT NOT NULL,
    CONSTRAINT "social_post_clubes_pkey" PRIMARY KEY ("post_id", "clube_id")
);

-- AddForeignKey
ALTER TABLE "social_post_clubes" ADD CONSTRAINT "social_post_clubes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_post_clubes" ADD CONSTRAINT "social_post_clubes_clube_id_fkey" FOREIGN KEY ("clube_id") REFERENCES "social_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
