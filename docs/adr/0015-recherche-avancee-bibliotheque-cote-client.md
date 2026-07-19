# ADR-0015 — Recherche avancée de la bibliothèque côté client

- Statut : Accepté
- Date : 2026-07-19

## Contexte

La roadmap V1 (point 9) prévoyait une « recherche avancée » avec **Postgres FTS,
filtres, genres, tri, pagination ». Ce point avait été pensé quand la recherche visait un
large catalogue. Après cadrage, le besoin réel concerne **les éléments de la bibliothèque
personnelle** de l'utilisateur : y retrouver un titre, filtrer par statut / genre / favoris,
trier.

La bibliothèque est déjà **chargée intégralement** en une requête (`GET /library`,
`findByUser`) et **mise en cache de façon persistante** (TanStack Query, voir
[ADR-0010](0010-accueil-fonde-sur-activite.md) et la persistance du cache). Son volume est
borné (échelle : dizaines à quelques centaines d'éléments par utilisateur).

## Décision

La recherche avancée de la bibliothèque est réalisée **côté client**, sur les données déjà
chargées, **sans appel réseau supplémentaire**.

- Logique **pure et testée** dans `apps/web/src/features/library/lib/filter-library.ts`
  (`queryLibrary`, `availableGenres`) — aucun filtrage/tri dans les composants React
  (règle CLAUDE.md §4).
- Filtres : **titre** (insensible à la casse et aux accents), **statut**, **genre**,
  **favoris** ; tris : ajout récent, activité récente, titre, note, année. Le cloisonnement
  par type (Films / Séries) reste assuré par les onglets existants (jamais mélangés).
- Les **genres** sont désormais exposés dans le DTO `LibraryItem` (ils étaient déjà chargés
  par le repository, seul le mapper les omettait) — coût backend : nul en requêtes.

## Alternatives considérées

- **Postgres FTS + endpoint paginé (roadmap initiale).** Rejeté pour ce périmètre : ajoute
  des allers-retours réseau à chaque frappe, de la complexité (index `tsvector`, pagination,
  invalidation de cache) et **dégrade l'éco-conception** (CLAUDE.md §9) sans bénéfice sur un
  jeu de données déjà chargé et borné. Reste pertinent si un jour la recherche vise le
  **catalogue** (TMDB/Meilisearch) — cf. [ADR-0005].
- **État des filtres dans Zustand / l'URL.** Rejeté pour l'instant : état **UI local** à la
  page (`useState`), transitoire ; pas de besoin de partage ni de persistance.

## Conséquences (positives / négatives)

**Positives**
- Résultats **instantanés**, hors ligne, zéro requête supplémentaire (éco-conception).
- Logique pure réutilisable et couverte par des tests unitaires + un test de la page.

**Négatives**
- Ne passe pas à l'échelle d'un **catalogue** (non concerné ici) : réservé à la bibliothèque
  personnelle. Un basculement serveur nécessiterait un port de recherche dédié.
- La recherche s'applique **dans la catégorie active** (films **ou** séries), cohérent avec
  le cloisonnement par type, mais pas de recherche transverse.
