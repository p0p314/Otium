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
| [0008](0008-import-donnees-externes.md) | Import de données externes (RGPD) | Accepté |
| [0009](0009-rafraichissement-structure-series.md) | Rafraîchissement de la structure des séries (garde-fou de fraîcheur) | Accepté |
| [0010](0010-accueil-fonde-sur-activite.md) | Accueil fondé sur l'activité de visionnage (dates réelles) | Accepté |
| [0011](0011-notation-avis-episode.md) | Notation et avis au niveau épisode | Accepté |
| [0012](0012-hebergement-gratuit-service-unique.md) | Hébergement gratuit : service unique, sans Redis | Accepté |
| [0013](0013-import-tache-de-fond.md) | Import TV Time en tâche de fond (job + polling) | Accepté |
| [0014](0014-accueil-nouvelle-saison-a-voir.md) | Accueil : une nouvelle saison récente remonte la série dans « À voir » | Accepté |
| [0015](0015-registry-catalogues-par-type.md) | Registry de catalogues par type de média + capacités optionnelles | Accepté |
| [0016](0016-fusion-google-books-open-library.md) | Livres : Google Books prioritaire, Open Library en secours | Accepté |
| [0017](0017-progression-polymorphe.md) | Progression polymorphe (pages, pourcentage) + historique | Accepté |
| [0018](0018-collection-generique.md) | `Collection` : regrouper des médias en œuvres, de façon générique | Accepté |
| [0019](0019-taches-periodiques-sans-cron.md) | Tâches périodiques sans cron : échéance en base, déclenchement opportuniste | Accepté |
| [0020](0020-notifications-push-pwa.md) | Notifications Push (PWA) : Web Push, anti-doublon en base, détection opportuniste | Accepté |

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
