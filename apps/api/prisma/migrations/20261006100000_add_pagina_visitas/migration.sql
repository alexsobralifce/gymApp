-- CreateTable
CREATE TABLE "pagina_visitas" (
    "id" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "origem" TEXT,
    "dispositivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagina_visitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagina_visitas_criado_em_idx" ON "pagina_visitas"("criado_em");

-- CreateIndex
CREATE INDEX "pagina_visitas_caminho_criado_em_idx" ON "pagina_visitas"("caminho", "criado_em");
