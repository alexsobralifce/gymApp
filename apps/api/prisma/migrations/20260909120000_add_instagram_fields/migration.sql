-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "instagram_user_id" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "instagram_token" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "instagram_token_expira" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "facebook_page_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_instagram_user_id_key" ON "usuarios"("instagram_user_id");
