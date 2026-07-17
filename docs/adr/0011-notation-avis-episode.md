# ADR-0011 — Notation et avis au niveau épisode

- Statut : Accepté
- Date : 2026-07-17

## Contexte

La notation (0–10) et l'avis (texte) vivent au niveau **média** (`Media`), conformément au
principe du média générique (CLAUDE.md §1, ADR-0003). Les utilisateurs veulent aussi **noter et
commenter un épisode précis** d'une série — une granularité que le média ne porte pas.

L'épisode n'est pas un `Media` dans le modèle : c'est une entité de la structure série
(`Season`/`Episode`), partagée entre utilisateurs. Étendre la notation/avis à l'épisode est donc
une décision d'architecture, pas une simple option d'UI.

## Décision

Introduire une **note et/ou un avis au niveau épisode**, distincts de ceux du média.

- Nouvelle entité de persistance `EpisodeReview` : clé `(userId, episodeId)`, champs `rating Int?`
  et `body String?` **tous deux optionnels** — une note peut exister sans avis (et inversement) ;
  si les deux sont vides, l'entrée est supprimée.
- Port dédié `EpisodeReviewRepository` (get/save/delete) et use cases dédiés, dans le module
  `library` (qui possède déjà le suivi série et les épisodes). **Aucune fusion** avec les avis de
  média : l'unité, les règles et le cycle de vie diffèrent.
- **Autorisation** : les endpoints sont scellés à un élément de bibliothèque
  (`/library/:itemId/episodes/:episodeId/review`) et vérifient que l'épisode appartient bien à la
  série de cet élément (réutilise `SeriesTrackingRepository.isEpisodeOfMedia`).
- Contrats versionnés (`@otium/types`) : `EpisodeReview`, `EpisodeReviewResponse`,
  `SaveEpisodeReviewInput` (au moins l'un de note/avis requis). SDK typé.

## Alternatives considérées

- **Traiter l'épisode comme un `Media`** pour réutiliser la notation existante : casserait le sens
  du média générique (un épisode n'est ni un film ni une série) et polluerait bibliothèque, listes,
  stats. Rejeté.
- **Stocker la note d'épisode sur `WatchedEpisode`** : lie la note au visionnage, alors qu'on peut
  vouloir noter sans avoir marqué « vu », ou garder la note en démarquant. Rejeté (couplage indu).
- **Un seul avis mixte média+épisode** : ambigu et non extensible. Rejeté.

## Conséquences

**Positives** : granularité attendue (noter/commenter par épisode) sans dénaturer le média
générique ; modèle isolé, testé unitairement, extensible (agrégats « note moyenne d'une saison »
plus tard) ; autorisation claire via la bibliothèque.

**Négatives** : duplication apparente avec les avis de média (assumée : règles distinctes — note
optionnelle ici, obligatoire-texte là) ; une table de plus. Les agrégations (note moyenne par
série/saison) ne sont pas encore exposées — hors périmètre de cette itération.
