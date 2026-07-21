-- Recherche par auteur (et par titre) sur les livres communautaires.
-- Migration ADDITIVE : une colonne dérivée et deux index, aucune donnée existante altérée.

-- `pg_trgm` permet d'indexer une correspondance **partielle** (`ILIKE '%camus%'`), qu'un
-- index B-tree ne peut pas servir : il exigerait un préfixe fixe.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PostgreSQL refuse un index sur `array_to_string(authors, ' ')` : cette fonction n'est
-- pas marquée IMMUTABLE. On matérialise donc la concaténation dans une colonne, tenue à
-- jour par l'application à chaque écriture.
ALTER TABLE "BookMetadata" ADD COLUMN "authorsText" TEXT;

-- Reprise des lignes existantes.
UPDATE "BookMetadata" SET "authorsText" = array_to_string(authors, ' ');

CREATE INDEX IF NOT EXISTS "BookMetadata_authors_trgm_idx"
  ON "BookMetadata" USING gin ("authorsText" gin_trgm_ops);

-- Même principe pour le titre, sur lequel porte la recherche « tous champs ».
CREATE INDEX IF NOT EXISTS "Media_title_trgm_idx"
  ON "Media" USING gin (title gin_trgm_ops);
