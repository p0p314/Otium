-- Unifie l'identité des livres communautaires (correctif).
--
-- Ils étaient stockés sous `externalProvider = 'community'` alors que l'API les expose
-- sous `books`. Ajouter un tel livre en bibliothèque créait donc une **seconde** ligne :
-- l'upsert cherchait `('books', <id>)` et ne trouvait pas `('community', <id>)`.
--
-- Conséquences observées : deux `Media` par livre saisi, et une réconciliation qui
-- travaillait sur la ligne orpheline — jamais sur celle réellement suivie.
--
-- Le marqueur `community` dans `BookMetadata.sources` suffit à les distinguer.

-- 1. Le doublon créé par l'ajout en bibliothèque porte déjà `books` mais n'a pas de
--    métadonnées : on lui rattache celles de l'original.
UPDATE "BookMetadata" b
SET "mediaId" = doublon.id
FROM "Media" original, "Media" doublon
WHERE b."mediaId" = original.id
  AND original."externalProvider" = 'community'
  AND doublon."externalId" = original."externalId"
  AND doublon."externalProvider" = 'books'
  AND NOT EXISTS (SELECT 1 FROM "BookMetadata" x WHERE x."mediaId" = doublon.id);

-- 2. Les originaux devenus inutiles sont supprimés.
DELETE FROM "Media" m
WHERE m."externalProvider" = 'community'
  AND EXISTS (
    SELECT 1 FROM "Media" d
    WHERE d."externalId" = m."externalId" AND d."externalProvider" = 'books'
  );

-- 3. Les livres communautaires sans doublon basculent simplement sous `books`.
UPDATE "Media" SET "externalProvider" = 'books' WHERE "externalProvider" = 'community';
