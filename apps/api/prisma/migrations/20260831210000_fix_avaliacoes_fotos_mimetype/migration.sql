-- Garante que a coluna mimetype exista na tabela avaliacoes_fotos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'avaliacoes_fotos' AND column_name = 'mime_type'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'avaliacoes_fotos' AND column_name = 'mimetype'
    ) THEN
        ALTER TABLE "avaliacoes_fotos" RENAME COLUMN "mime_type" TO "mimetype";
    END IF;
END $$;
