# ADR-0003 — Modèle générique `Media` (extension, pas modification)

- Statut : Accepté
- Date : 2026-07-12

## Contexte

La V1 couvre films et séries, mais le produit doit accueillir livres, mangas, animés, jeux,
podcasts, musique, documentaires. Les capacités transversales (favoris, listes, notation, avis,
historique, recommandations) sont communes à tous ces types.

## Décision

Faire de **`Media`** le concept pivot. Les types concrets (`Movie`, `Series`, futur `Book`,
`Game`…) sont des **spécialisations**. Toutes les capacités transversales vivent au niveau
`Media` / `LibraryItem`. La progression est modélisée par un **`ProgressModel` polymorphe**
(binaire pour un film, par épisodes pour une série, par pages pour un livre…).

Ajouter un type = **ajouter** une sous-entité + un `ProgressModel` + un/des providers, **sans
modifier** les capacités communes existantes (Open/Closed Principle).

## Alternatives considérées

- **Entités indépendantes par type** (Movie, Series séparés sans parent commun) : duplication des
  capacités transversales, logique éparpillée, ajout de type coûteux. Rejeté.
- **Table unique fourre-tout avec colonnes optionnelles** : modèle flou, invariants difficiles.
  Rejeté au niveau domaine (la persistance peut rester relationnelle et normalisée).

## Conséquences

**Positives** : nouvelles fonctionnalités transversales écrites une seule fois ; ajout de type
par extension ; cohérence produit.

**Négatives** : nécessite de résister à la tentation de coder du spécifique Movie/Series ;
discipline sur le placement de la logique (règle : au niveau `Media` si applicable). Le risque de
sur-généralisation est borné en validant la généricité sur **deux** types réels avant d'en
ajouter d'autres (voir [risques R2](../risques-techniques.md)).
