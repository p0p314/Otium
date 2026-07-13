# ADR-0002 — Clean Architecture + Hexagonale + DDD léger

- Statut : Accepté
- Date : 2026-07-12

## Contexte

Le projet doit rester maintenable et évolutif sur plusieurs années, accueillir de nouveaux types
de médias et changer de fournisseurs externes sans réécriture. Le métier doit être testable
rapidement, sans base de données ni réseau.

## Décision

Structurer chaque module backend en 4 couches — `domain`, `application`, `infrastructure`,
`presentation` — avec la **règle de dépendance** pointant vers l'intérieur et un modèle
**ports & adapters**. Appliquer un **DDD léger** (langage ubiquitaire, agrégats, value objects,
événements) sans la lourdeur du DDD tactique complet. Le `domain` n'a **aucune** dépendance
externe (ni Prisma, ni NestJS, ni API).

## Alternatives considérées

- **Architecture en couches classique (MVC/service/repository) sans inversion** : couplage du
  métier à l'ORM et au framework → difficile à tester et à faire évoluer. Rejeté.
- **DDD tactique complet** : surdimensionné pour la taille de l'équipe/produit au démarrage.
  Rejeté (adopté partiellement si un contexte le justifie plus tard).
- **Microservices** : coût opérationnel injustifié ; un **monolithe modulaire** suffit. Rejeté.

## Conséquences

**Positives** : domaine testable sans I/O, infrastructure remplaçable (DB, providers, cache),
frontières claires, onboarding facilité.

**Négatives** : plus de fichiers/indirection (mappers domaine↔persistance), courbe
d'apprentissage. Mitigé par des bases partagées (`shared/`) et des exemples de référence.
