-- Imagem por sexo: sexo da figura do GIF principal e versões alternativas por sexo
ALTER TABLE "exercicios" ADD COLUMN "sexo_figura" "Sexo",
ADD COLUMN "variantes" JSONB;
