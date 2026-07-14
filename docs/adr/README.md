# Architecture Decision Records (ADR)

Décisions techniques structurantes, au format [MADR](https://adr.github.io/madr/) simplifié.
Une décision = un fichier immuable ; on ne modifie pas un ADR accepté, on le **remplace**
(statut `Superseded by ADR-XXXX`).

| ADR | Titre | Statut |
| --- | --- | --- |
| [0001](0001-monorepo-turborepo.md) | Monorepo géré par Turborepo + pnpm | Accepté |
| [0002](0002-clean-architecture-hexagonale.md) | Clean Architecture + Hexagonale + DDD léger | Accepté |
| [0003](0003-media-generique.md) | Modèle générique `Media` (extension, pas modification) | Accepté |
| [0004](0004-provider-abstraction.md) | Abstraction des fournisseurs externes | Accepté |
| [0005](0005-search-postgres-puis-meilisearch.md) | Recherche : Postgres FTS puis Meilisearch | Accepté |
| [0006](0006-event-driven.md) | Événements de domaine internes | Accepté |
| [0007](0007-stack-frontend.md) | Stack frontend (React/Vite + TanStack + Zustand) | Accepté |

## Gabarit

```md
# ADR-XXXX — <titre>
- Statut : Proposé | Accepté | Rejeté | Remplacé par ADR-YYYY
- Date : AAAA-MM-JJ
## Contexte
## Décision
## Alternatives considérées
## Conséquences (positives / négatives)
```
