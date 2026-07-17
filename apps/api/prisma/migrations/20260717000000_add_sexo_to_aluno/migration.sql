-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO');

-- AlterTable
ALTER TABLE "alunos" ADD COLUMN "sexo" "Sexo";
