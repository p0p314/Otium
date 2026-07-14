# @otium/web

Frontend React (Vite) d'Otium. Composants sans logique métier ni appel API direct : tout passe
par des hooks dédiés, TanStack Query et le SDK typé (`@otium/api-sdk`). Voir
[`CLAUDE.md`](../../CLAUDE.md).

## Scripts

| Commande | Effet |
| --- | --- |
| `pnpm --filter @otium/web dev` | Serveur de dev (port 5173). |
| `pnpm --filter @otium/web build` | Build de production. |
| `pnpm --filter @otium/web test` | Tests (Vitest + Testing Library). |
| `pnpm --filter @otium/web test:e2e` | Tests E2E (Playwright). |

## Organisation

- `app/` — providers (thème, Query, router).
- `routes/` — pages routées (TanStack Router).
- `features/` — tranches verticales par domaine UI (à venir au MVP).
- `components/` — composants d'app ; le design system partagé est dans `@otium/ui`.
- `lib/` — client Query, instance SDK.

## État (Phase 0)

Coquille applicative, thème clair/sombre, page d'accueil placeholder. Les fonctionnalités
(recherche, bibliothèque, suivi de séries) arrivent au MVP.
