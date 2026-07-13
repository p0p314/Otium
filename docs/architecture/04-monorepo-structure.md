# 04 — Arborescence du monorepo

Gestion : **Turborepo** + **pnpm workspaces**. TypeScript strict, config partagée.

## Vue d'ensemble

```
otium/
├── apps/
│   ├── web/                     # SPA React (Vite)
│   └── api/                     # API NestJS
├── packages/
│   ├── ui/                      # Design system (shadcn/ui + Tailwind + Motion)
│   ├── types/                   # Types & schémas Zod partagés (source de vérité)
│   ├── api-sdk/                 # Client HTTP typé (consommé par web)
│   ├── config/                  # tsconfig, eslint, tailwind, prettier partagés
│   └── utils/                   # utilitaires purs, réutilisables, sans dépendance framework
├── contracts/                   # Contrats d'API versionnés (OpenAPI + schémas)
├── docs/                        # Documentation de conception (ce dossier)
├── turbo.json                   # pipeline de build/test/lint
├── pnpm-workspace.yaml
├── package.json                 # scripts racine
└── CLAUDE.md
```

## Rôle de chaque dossier

| Dossier | Rôle | Peut dépendre de |
| --- | --- | --- |
| `apps/web` | Interface utilisateur. **Aucune** logique métier serveur. | `packages/ui`, `types`, `api-sdk`, `utils`, `config` |
| `apps/api` | API + logique métier (Clean Archi par module). | `packages/types`, `utils`, `config` |
| `packages/ui` | Composants réutilisables, tokens de design, thèmes. | `packages/utils`, `config` |
| `packages/types` | **Source de vérité** des types/schémas partagés (Zod). | — |
| `packages/api-sdk` | Client typé de l'API, généré depuis `contracts/`. | `packages/types` |
| `packages/config` | Configurations partagées (tsconfig base, eslint, tailwind preset). | — |
| `packages/utils` | Fonctions pures, testées, sans framework. | — |
| `contracts/` | Schémas d'API **versionnés** (frontière de service). | `packages/types` |

> **Règle de frontière** : `web` ne connaît l'API **que** via `api-sdk`. On n'importe jamais du
> code interne de `api` dans `web` (et inversement).

## Détail `apps/api`

```
apps/api/src/
├── main.ts
├── app.module.ts
├── shared/                      # kernel: erreurs, Result, base d'événements, décorateurs
│   ├── domain/                  # EntityBase, ValueObject, DomainEvent, ports transverses
│   ├── application/             # UseCase base, CommandBus/QueryBus, ports (Clock, Logger)
│   └── infrastructure/          # PrismaService, RedisService, EventBus, config
└── modules/
    ├── media/
    │   ├── domain/
    │   │   ├── entities/         # Media, Movie, Series, Season, Episode
    │   │   ├── value-objects/    # MediaId, ExternalRef, Rating, MediaType, WatchStatus
    │   │   ├── events/           # MediaAdded, MediaRated, EpisodeWatched...
    │   │   └── ports/            # MediaRepository, MediaCatalogProvider
    │   ├── application/
    │   │   ├── commands/         # AddMediaToLibrary, RateMedia, MarkEpisodeWatched
    │   │   └── queries/          # SearchMedia, GetMediaDetails, GetLibrary
    │   ├── infrastructure/
    │   │   ├── persistence/      # PrismaMediaRepository, mappers
    │   │   ├── providers/        # TmdbProvider, TvMazeProvider, OmdbProvider (+ registry)
    │   │   └── cache/            # RedisMediaCache
    │   └── presentation/
    │       ├── media.controller.ts
    │       ├── dto/
    │       └── mappers/
    ├── user/
    ├── authentication/
    ├── library/                 # bibliothèque, listes, favoris, statuts
    └── recommendation/          # consommateur d'événements
```

Chaque module possède **son code, ses tests, ses evals, son README, sa configuration**
(`apps/api/src/modules/<x>/README.md`, `__tests__/`, `eval/`).

## Détail `apps/web`

```
apps/web/src/
├── main.tsx
├── router.tsx                   # TanStack Router
├── app/                         # shell, providers (Query, thème, i18n)
├── features/                    # tranche verticale par domaine UI
│   ├── library/                 # components/ hooks/ api/ (via sdk) store/
│   ├── media-search/
│   ├── media-detail/
│   └── series-tracker/
├── components/                  # composants d'app spécifiques (non design-system)
├── hooks/                       # hooks transverses
├── stores/                      # Zustand (UI/session uniquement)
├── lib/                         # config query client, sdk instance, helpers
└── styles/
```

## Pipeline Turborepo (extrait `turbo.json`)

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint":      {},
    "typecheck": { "dependsOn": ["^build"] },
    "test":      { "dependsOn": ["^build"] },
    "test:e2e":  { "dependsOn": ["build"] },
    "dev":       { "cache": false, "persistent": true }
  }
}
```

## Conventions

- **Nommage** : `PascalCase` pour classes/composants, `camelCase` pour fonctions/variables,
  `kebab-case` pour les fichiers, `SCREAMING_SNAKE_CASE` pour les constantes.
- **Imports** : chemins d'alias (`@otium/ui`, `@otium/types`…) ; pas d'import relatif profond
  entre packages.
- **Commits** : Conventional Commits. **Branches** : `feat/…`, `fix/…`, `chore/…`.
- **PR** : petite, focalisée, avec tests + mise à jour doc/ADR si structurant.
