-- Enquadramento da figura no GIF (recorte por CSS para ampliar a pessoa executando o movimento)
ALTER TABLE "exercicios" ADD COLUMN "foco_x" DOUBLE PRECISION,
ADD COLUMN "foco_y" DOUBLE PRECISION,
ADD COLUMN "foco_larg" DOUBLE PRECISION;
