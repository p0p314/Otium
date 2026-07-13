# ADR-0006 — Événements de domaine internes

- Statut : Accepté
- Date : 2026-07-12

## Contexte

Statistiques, recommandations, historique et notifications dépendent des actions utilisateur
(ajout, notation, épisode vu…). Coder ces projections directement dans les use cases d'écriture
créerait du couplage et de la complexité.

## Décision

Les use cases d'écriture **émettent des événements de domaine** (`MediaAdded`, `MediaRemoved`,
`MediaRated`, `EpisodeWatched`, `MovieCompleted`, `SeriesCompleted`, `FavoriteAdded`,
`CommentCreated`) via un port `EventPublisher`. Des **handlers** découplés construisent historique,
stats et recommandations. Un journal `domain_events` persiste les événements (source de vérité).

**Progressivité** : bus **in-memory synchrone** au MVP → **BullMQ (Redis)** pour l'asynchrone/jobs
quand nécessaire. Handlers **idempotents**.

## Alternatives considérées

- **Projections calculées à la volée** dans les use cases : couplage, duplication, difficile à
  faire évoluer. Rejeté.
- **Event sourcing complet** : puissant mais complexe (rejeu, versionnage d'événements) au-delà du
  besoin. Rejeté (le journal d'événements en donne les bénéfices essentiels sans le coût total).
- **Broker externe (Kafka…) dès le départ** : surdimensionné, non éco. Rejeté.

## Conséquences

**Positives** : découplage écriture/projections, extensibilité (ajouter un handler sans toucher
l'écriture), base naturelle pour reco/stats/notifs, historique fiable.

**Négatives** : complexité de cohérence/ordre/idempotence (R4) ; adressée par démarrage synchrone,
handlers idempotents et journal persistant.
