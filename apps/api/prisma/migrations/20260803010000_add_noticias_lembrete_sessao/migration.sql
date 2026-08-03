-- AlterTable
ALTER TABLE "treinos" ADD COLUMN     "notificado_concluir_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "proxima_noticia_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "noticias" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fonte" TEXT,
    "imagem_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noticias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noticias_enviadas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "noticia_id" TEXT NOT NULL,
    "enviada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noticias_enviadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "noticias_url_key" ON "noticias"("url");

-- CreateIndex
CREATE UNIQUE INDEX "noticias_enviadas_usuario_id_noticia_id_key" ON "noticias_enviadas"("usuario_id", "noticia_id");

-- AddForeignKey
ALTER TABLE "noticias_enviadas" ADD CONSTRAINT "noticias_enviadas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticias_enviadas" ADD CONSTRAINT "noticias_enviadas_noticia_id_fkey" FOREIGN KEY ("noticia_id") REFERENCES "noticias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
