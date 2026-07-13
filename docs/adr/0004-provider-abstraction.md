# ADR-0004 — Abstraction des fournisseurs externes

- Statut : Accepté
- Date : 2026-07-12

## Contexte

Les métadonnées proviennent de sources tierces (TMDB, TVMaze, OMDb, Trakt) aux API, quotas et CGU
différents et évolutifs. Le métier ne doit dépendre d'aucune d'elles ; changer de source ne doit
pas impacter le domaine.

## Décision

Définir un **port** `MediaCatalogProvider` dans le `domain`, implémenté par des **adapters** en
`infrastructure` (`TmdbProvider`, `TvMazeProvider`, `OmdbProvider`, `TraktProvider`). Un
**registry** sélectionne l'adapter selon le type de média et la disponibilité. Les résultats sont
**normalisés** vers le modèle interne (`Media`, `ExternalRef`, `Genre`…) et **mis en cache**
(Redis + TTL).

## Alternatives considérées

- **Appels directs à TMDB depuis les use cases** : couplage fort, difficile à tester, migration
  coûteuse. Rejeté.
- **Un seul provider figé** : fragile face aux pannes/quotas/CGU. Rejeté.

## Conséquences

**Positives** : indépendance vis-à-vis des fournisseurs, tests via HTTP mické, dégradation
gracieuse (cache), ajout/remplacement de source sans toucher au métier, résilience (R1).

**Négatives** : besoin d'une couche de **normalisation** et de mapping des genres/identifiants ;
gestion des différences de complétude entre sources (mitigée par le registry et le cache).
