-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "reset_password_code" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "reset_password_code_expira" TIMESTAMP(3);
