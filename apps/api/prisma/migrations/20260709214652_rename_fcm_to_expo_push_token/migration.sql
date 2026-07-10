/*
  Warnings:

  - You are about to drop the column `fcm_token` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "fcm_token",
ADD COLUMN     "expo_push_token" TEXT;
