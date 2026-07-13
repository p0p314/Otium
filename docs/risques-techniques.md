# Risques techniques

Échelle : Probabilité (P) et Impact (I) de 1 (faible) à 3 (fort). Priorité = P × I.

| # | Risque | P | I | Prio | Mitigation |
| --- | --- | --- | --- | --- | --- |
| R1 | **Dépendance aux fournisseurs externes** (quotas, pannes, changement d'API/CGU TMDB) | 2 | 3 | 6 | Abstraction `MediaCatalogProvider` + registry ; cache Redis avec TTL ; dégradation gracieuse ; adapters multiples (TVMaze/OMDb) interchangeables. |
| R2 | **Sur-généralisation prématurée** du modèle `Media` (abstraction coûteuse avant besoin réel) | 2 | 2 | 4 | Généricité **guidée par 2 types réels** (Movie/Series) en V1 ; `ProgressModel` polymorphe validé sur Series avant d'ajouter livres/jeux. |
| R3 | **Fuite d'abstraction** : Prisma/NestJS remontant dans le domaine | 2 | 3 | 6 | Règle de dépendance vérifiée (lint d'architecture / dependency-cruiser) ; domaine testé sans I/O ; revue de code ciblée. |
| R4 | **Complexité event-driven** (ordre, idempotence, cohérence) | 2 | 2 | 4 | Démarrer en in-memory synchrone → BullMQ ; handlers **idempotents** ; journal `domain_events` comme source de vérité. |
| R5 | **Recherche Postgres FTS insuffisante** (pertinence, typo-tolérance) | 2 | 2 | 4 | Port `SearchService` abstrait ; V1 Postgres, bascule Meilisearch derrière le même port sans impact métier. |
| R6 | **Performance / éco non tenue** (bundle lourd, N+1 SQL, images) | 2 | 2 | 4 | Budgets perf en CI ; code-splitting ; `select` ciblés + détection N+1 ; images optimisées ; audit APIGreenScore. |
| R7 | **Dérive de contrat front/back** | 1 | 3 | 3 | `packages/types` source unique + `contracts/` versionnés + SDK typé ; tests de contrat. |
| R8 | **Complexité monorepo** (temps de build, config partagée) | 2 | 1 | 2 | Turborepo (cache incrémental) ; config centralisée `packages/config`. |
| R9 | **Sécurité** (auth, sessions, rate-limiting, données perso) | 2 | 3 | 6 | Sessions Redis, hachage fort des mots de passe, rate-limiting, validation Zod stricte, pas de PII en URL/logs, revue sécu. |
| R10 | **Scope creep multi-média trop tôt** | 2 | 2 | 4 | Roadmap stricte : livres/jeux **après** V1 ; extension par ajout, pas modification. |
| R11 | **Verrouillage fournisseur (DB/cache)** | 1 | 2 | 2 | Ports repository/cache ; SQL standard ; Prisma isolé en infra. |
| R12 | **Dette de tests** (couverture qui décroche) | 2 | 2 | 4 | « Pas de test = pas terminé » (DoD) ; CI bloquante ; eval par fonctionnalité. |

## Risques prioritaires (Prio ≥ 6)

- **R1, R3, R9** sont les plus critiques. Ils sont adressés **structurellement** par
  l'architecture (ports/adapters, isolation du domaine) et par des garde-fous outillés
  (lint d'architecture, CI sécurité, cache).

## Revue

Ce tableau est revu à chaque fin de phase (Phase 0, MVP, V1) et à l'ajout de tout nouveau
fournisseur ou type de média.
