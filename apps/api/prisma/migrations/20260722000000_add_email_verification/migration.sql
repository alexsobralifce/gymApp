ALTER TABLE "usuarios" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuarios" ADD COLUMN     "email_verify_code" TEXT;
ALTER TABLE "usuarios" ADD COLUMN     "email_verify_code_expira" TIMESTAMP(3);
