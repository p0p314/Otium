# @otium/api

API NestJS d'Otium — Clean Architecture par module (`domain` / `application` /
`infrastructure` / `presentation`). Voir [`../../docs/architecture`](../../docs/architecture).

## Scripts

| Commande | Effet |
| --- | --- |
| `pnpm --filter @otium/api dev` | Démarre l'API en watch (port 3000). |
| `pnpm --filter @otium/api build` | Compile (`nest build`). |
| `pnpm --filter @otium/api test` | Tests (Vitest + SWC pour la DI). |
| `pnpm --filter @otium/api prisma:generate` | Génère le client Prisma. |
| `pnpm --filter @otium/api prisma:migrate` | Migration de dev. |

## Prérequis

- PostgreSQL + Redis (via `docker compose up -d` à la racine).
- `.env` à la racine (voir `.env.example`).

## État (Phase 0)

Noyau partagé (`shared/`), configuration validée (Zod), Prisma, Redis, bus d'événements
in-memory et module `health` (`GET /api/health`, `GET /api/health/ready`). Les modules métier
(`media`, `library`, `authentication`…) arrivent au MVP.
