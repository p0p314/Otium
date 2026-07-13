# 06 — Choix techniques argumentés

Chaque choix est évalué selon les priorités du projet : **maintenabilité > lisibilité >
évolutivité > performance > UX > éco-conception**. Les décisions structurantes ont leur ADR.

## 1. Monorepo & outillage

| Choix | Pourquoi | Alternatives écartées |
| --- | --- | --- |
| **Turborepo** | Cache de tâches, pipelines incrémentaux → builds rapides, CI éco. | Nx (plus lourd/opiniâtre), scripts maison (peu scalables). |
| **pnpm** | Store de contenu adressable → **moins de disque/téléchargements** (éco), workspaces stricts. | npm/yarn (duplication node_modules). |
| **TypeScript strict** | Sécurité de type = moins de bugs, refactors sûrs → maintenabilité. | JS (dette immédiate). |
| **ESLint + Prettier partagés** (`packages/config`) | Cohérence multi-dev. | Configs par package (divergence). |

→ Voir [ADR-0001](../adr/0001-monorepo-turborepo.md).

## 2. Architecture applicative

| Choix | Pourquoi |
| --- | --- |
| **Clean Architecture + Hexagonale** | Isole le métier de l'infra → testable sans I/O, remplaçable (DB, providers). |
| **DDD léger** | Langage ubiquitaire + agrégats + événements sans la lourdeur du DDD tactique complet. |
| **Ports & Adapters** | Le domaine dépend d'interfaces ; les détails (Prisma, TMDB) sont interchangeables. |
| **Event-driven interne** | Découple écriture des projections (stats/reco/historique/notifs). |

→ Voir [ADR-0002](../adr/0002-clean-architecture-hexagonale.md), [ADR-0006](../adr/0006-event-driven.md).

## 3. Backend

| Choix | Pourquoi | Alternatives |
| --- | --- | --- |
| **NestJS** | DI native (idéale pour ports/adapters), modularité, conventions matures. | Express nu (trop peu structuré), Fastify seul (moins de DI). |
| **PostgreSQL** | Relationnel robuste, JSONB, **full-text search** intégré (V1 sans dépendance externe). | MongoDB (relations + FTS moins naturels). |
| **Prisma** | Type-safety bout-en-bout, migrations, mappé en **infrastructure** uniquement. | TypeORM (moins sûr), SQL brut (verbeux). |
| **Redis** | Cache API, sessions, rate-limiting, files (BullMQ) pour événements/jobs. | Cache mémoire seul (non partagé, non persistant). |

→ Voir [ADR-0005](../adr/0005-search-postgres-puis-meilisearch.md).

## 4. Fournisseurs externes

Abstraction `MediaCatalogProvider` (port) + adapters (TMDB, TVMaze, OMDb, Trakt) + **registry**
sélectionnant le provider selon le type de média / la disponibilité. Le domaine n'en connaît
aucun. → Voir [ADR-0004](../adr/0004-provider-abstraction.md).

- **TMDB** : films & séries (métadonnées riches, images).
- **TVMaze** : structure séries/épisodes.
- **OMDb** : compléments (notes externes).
- **Trakt** : scrobbling/synchro (futur).

## 5. Frontend

| Choix | Pourquoi | Alternatives |
| --- | --- | --- |
| **React + Vite** | Écosystème, HMR rapide, build léger. | Next.js (SSR non requis en V1 pour une app perso authentifiée ; surcoût). |
| **TanStack Router** | Routing typé, code-splitting, chargement par route (éco JS). | React Router (moins typé). |
| **TanStack Query** | Cache/état serveur, dédup requêtes, retries, `staleTime` → **moins d'appels réseau**. | Redux+thunks (verbeux), fetch nu (pas de cache). |
| **Zustand** | État global **UI/session** minimal, sans boilerplate. | Redux (surdimensionné ici). |
| **React Hook Form + Zod** | Formulaires perfs + validation typée partagée avec le backend. | Formik (moins perf). |
| **Tailwind + shadcn/ui** | Design system possédé (composants dans le repo), pas de lib runtime lourde. | MUI (bundle lourd), CSS-in-JS runtime (coût perf). |
| **Lucide** | Icônes tree-shakables. | Font-icons (poids). |
| **Motion** | Animations légères, accessibles (respect `prefers-reduced-motion`). | GSAP (surdimensionné). |

→ Voir [ADR-0007](../adr/0007-stack-frontend.md).

## 6. Contrats & SDK

- `packages/types` = **source de vérité** (schémas Zod → types partagés front/back).
- `contracts/` = OpenAPI **versionné** ; `packages/api-sdk` = client typé.
- Bénéfice : un seul endroit pour l'évolution du contrat, pas de dérive front/back.

→ Voir [ADR-0003](../adr/0003-media-generique.md) pour le contrat autour du média générique.

## 7. Tests

Vitest (unitaire, front & back), React Testing Library, Playwright (E2E), Supertest (HTTP).
Domaine testé **sans I/O**. → Voir [strategie-tests.md](../strategie-tests.md).

## 8. Éco-conception — traduction concrète

| Levier | Mise en œuvre |
| --- | --- |
| Moins d'appels réseau | Cache Redis + HTTP, `staleTime` Query, dédup, pagination. |
| Images | Redimensionnement, formats modernes, `lazy`, tailles responsives. |
| Moins de JS | Code-splitting par route, tree-shaking, pas de lib runtime lourde. |
| SQL efficace | `select` ciblés, index, éviter N+1 (batch/`include` maîtrisé). |
| Dépendances | Audit régulier, suppression de l'inutile. |
| Mobile-first | Design et budgets perf pensés mobile d'abord. |

Cadre : **RGESN** + **APIGreenScore** (mesure côté API).

## 9. Points explicitement reportés (non-choix V1)

- **SSR/Next.js** : non nécessaire pour une app authentifiée orientée bibliothèque ; réévaluable
  si SEO de pages publiques devient un besoin.
- **Meilisearch** : après la V1 (Postgres FTS d'abord).
- **Microservices** : non — monolithe modulaire (modules Clean) suffit et coûte moins.
- **Mobile natif** : évolution ; l'architecture (API + SDK typé) le permet déjà.
