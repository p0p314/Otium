# ADR-0001 — Monorepo géré par Turborepo + pnpm

- Statut : Accepté
- Date : 2026-07-12

## Contexte

Le produit vise plusieurs applications (web, api, futur mobile), des packages partagés (ui,
types, sdk) et plusieurs développeurs sur plusieurs années. Il faut partager le code et les
contrats sans dupliquer, tout en gardant des builds rapides et une CI économe.

## Décision

Utiliser un **monorepo** géré par **Turborepo** avec **pnpm workspaces**. Configurations
partagées centralisées dans `packages/config`. TypeScript strict à la racine.

## Alternatives considérées

- **Multi-repos** : partage de code pénible (versionnage, synchronisation des contrats). Rejeté.
- **Nx** : très capable mais plus opiniâtre/lourd que nécessaire ici. Rejeté pour l'instant.
- **npm/yarn workspaces** : fonctionnels mais duplication `node_modules` (coût disque/réseau).
  pnpm préféré pour l'**éco-conception** et la stricte résolution des dépendances.

## Conséquences

**Positives** : partage de types/contrats trivial, refactors atomiques, cache de tâches
incrémental (CI rapide et éco), frontières explicites entre packages.

**Négatives** : configuration initiale plus riche, discipline nécessaire sur les frontières
(imposée par les règles de dépendance et le lint d'architecture).
