# ADR-0007 — Stack frontend (React/Vite + TanStack + Zustand)

- Statut : Accepté
- Date : 2026-07-12

## Contexte

L'interface doit être premium, rapide, accessible, responsive et **éco-conçue** (peu de JS, peu
d'appels réseau). Séparation stricte : les composants ne portent ni logique métier ni appels API.

## Décision

- **React + Vite** (SPA authentifiée ; pas de besoin SSR en V1).
- **TanStack Router** (routing typé + code-splitting par route).
- **TanStack Query** pour **toutes** les données serveur (cache, dédup, retries, `staleTime`).
- **Zustand** pour l'état global **UI/session uniquement**.
- **React Hook Form + Zod** (formulaires performants, validation typée partagée avec le back).
- **Tailwind + shadcn/ui** (design system **possédé** dans `packages/ui`), **Lucide**, **Motion**.
- Accès API **exclusivement** via `packages/api-sdk`. Composants → hooks dédiés → Query/Store.

## Alternatives considérées

- **Next.js** : SSR/SSG non requis pour une app perso authentifiée ; surcoût de complexité et de
  runtime. Rejeté pour la V1 (réévaluable si pages publiques/SEO deviennent un besoin).
- **Redux Toolkit** pour les données serveur : verbeux et redondant avec Query. Rejeté.
- **MUI / Chakra** : bundles runtime plus lourds ; on préfère un design system possédé
  (shadcn/ui) pour la légèreté et l'identité visuelle. Rejeté.

## Conséquences

**Positives** : séparation nette UI/données, bundle maîtrisé (éco), typage bout-en-bout,
identité visuelle propre, accessibilité et thèmes clair/sombre intégrés au design system.

**Négatives** : pas de SSR (SEO limité des pages publiques) — non bloquant en V1 ; discipline
requise pour ne jamais appeler l'API depuis un composant (imposée par la revue et le lint).
