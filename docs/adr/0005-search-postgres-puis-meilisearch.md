# ADR-0005 — Recherche : PostgreSQL FTS puis Meilisearch

- Statut : Accepté
- Date : 2026-07-12

## Contexte

La recherche doit être instantanée, avec filtres, genres, tri et pagination. À terme, une
meilleure pertinence et une tolérance aux fautes seront nécessaires. On veut éviter d'introduire
une dépendance d'infrastructure supplémentaire trop tôt (coût, éco, opérations).

## Décision

Exposer un **port** `SearchService` dans le domaine/application. **V1** : implémentation
**PostgreSQL full-text search** (`tsvector`, index GIN) — zéro dépendance externe. **Évolution** :
implémentation **Meilisearch** derrière le **même port**, activée quand le besoin de pertinence /
typo-tolérance le justifie.

## Alternatives considérées

- **Meilisearch dès la V1** : service supplémentaire à opérer et synchroniser, surdimensionné pour
  le volume initial. Rejeté pour la V1.
- **Elasticsearch/OpenSearch** : puissant mais lourd (RAM, ops, éco). Rejeté.
- **Recherche `LIKE` naïve** : ni pertinente ni performante à l'échelle. Rejeté.

## Conséquences

**Positives** : démarrage simple et éco (une seule base), bascule ultérieure **sans impact
métier** (port stable), coût maîtrisé.

**Négatives** : Postgres FTS a une pertinence/typo-tolérance limitée ; accepté en V1, adressé par
la bascule Meilisearch prévue (R5). Nécessite de maintenir l'index (`tsvector`) à jour.
