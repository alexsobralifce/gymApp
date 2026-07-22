ALTER TABLE "usuarios" ALTER COLUMN "senha_hash" DROP NOT NULL;
ALTER TABLE "usuarios" ADD COLUMN "google_id" TEXT;
CREATE UNIQUE INDEX "usuarios_google_id_key" ON "usuarios"("google_id");
