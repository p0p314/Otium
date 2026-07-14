# Otium

> Suivez tout ce que vous regardez, lisez et jouez — au même endroit.

**Otium** est une application de suivi de contenus culturels inspirée de l'esprit de TV Time,
mais bâtie autour d'un concept **générique de média** afin de supporter, au-delà des films et
séries, les livres, mangas, animés, jeux vidéo, podcasts, musique et documentaires — par
**extension**, sans réécriture.

## État du projet

🟢 **Phase 0 — fondations en place.** Le monorepo (Turborepo + pnpm), le socle partagé
(config, types, utils, api-sdk, design system), l'API NestJS (noyau Clean Architecture, Prisma,
Redis, bus d'événements, module `health`) et le front React (shell, thème clair/sombre) sont
opérationnels : `typecheck`, `lint`, `test` et `build` passent sur les 7 packages. Les modules
métier (auth, media, library) arrivent au **MVP** (voir [roadmap](docs/roadmap.md)).

## Démarrage

Prérequis : Node ≥ 20, pnpm 9 (via `corepack`), Docker (pour PostgreSQL + Redis).

```bash
corepack pnpm install            # installe les dépendances
docker compose up -d             # démarre PostgreSQL + Redis
cp .env.example .env             # configure l'environnement
pnpm --filter @otium/api prisma:generate
pnpm --filter @otium/api prisma:migrate   # crée le schéma
pnpm dev                         # lance web (5173) + api (3000)
```

Vérifications : `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`.

## Documentation

| Document | Contenu |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Règles de fonctionnement **non négociables** |
| [`docs/architecture/01-analyse-fonctionnelle.md`](docs/architecture/01-analyse-fonctionnelle.md) | Analyse fonctionnelle |
| [`docs/architecture/02-architecture-overview.md`](docs/architecture/02-architecture-overview.md) | Architecture générale & flux |
| [`docs/architecture/03-c4-diagrams.md`](docs/architecture/03-c4-diagrams.md) | Diagrammes C4 |
| [`docs/architecture/04-monorepo-structure.md`](docs/architecture/04-monorepo-structure.md) | Arborescence du monorepo |
| [`docs/architecture/05-modele-metier.md`](docs/architecture/05-modele-metier.md) | Modèle métier |
| [`docs/architecture/06-choix-techniques.md`](docs/architecture/06-choix-techniques.md) | Choix techniques argumentés |
| [`docs/adr/`](docs/adr/README.md) | Architecture Decision Records |
| [`docs/roadmap.md`](docs/roadmap.md) | Roadmap MVP / V1 / futur |
| [`docs/risques-techniques.md`](docs/risques-techniques.md) | Risques techniques |
| [`docs/strategie-tests.md`](docs/strategie-tests.md) | Stratégie de tests & eval |

## Stack (cible)

Monorepo **Turborepo** · **TypeScript strict** · Clean Architecture + Hexagonale + DDD léger.

- **Frontend** : React + Vite, TanStack Router/Query, Zustand, React Hook Form, Zod, Tailwind, shadcn/ui, Lucide, Motion.
- **Backend** : NestJS, PostgreSQL + Prisma, Redis, event-driven.
- **Recherche** : PostgreSQL full-text (V1) → Meilisearch (évolution).

## Licence

À définir (voir roadmap).
