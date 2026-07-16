# ADR-0008 — Import de données externes (RGPD)

- Statut : Accepté
- Date : 2026-07-16

## Contexte

Les utilisateurs arrivent souvent d'un service existant (TV Time en premier) et veulent
reconstruire leur bibliothèque sans tout ressaisir. Les exports RGPD fournissent l'historique
(films/séries vus, « à voir »), mais **chaque service a son propre format** et **aucun n'expose
les identifiants TMDB** sur lesquels Otium indexe ses médias (`externalRef`). Il faut donc à la
fois lire des formats hétérogènes et relier les entrées au catalogue.

## Décision

Un module `import` dédié, en **orchestration seule** : il ne persiste rien lui-même et **réutilise
la logique métier** de `library` (ajout, statut « vu », suivi des épisodes) et le catalogue de
`media` pour le rapprochement.

- **Parseurs de source enfichables** (port `ImportSourceParser`) : chaque format (TV Time, puis
  Trakt…) produit un **modèle normalisé** agnostique du fournisseur. Ajouter un format n'impacte
  ni l'orchestration ni le domaine (extensibilité — CLAUDE.md §5).
- **Rapprochement au catalogue par nom + année** (heuristique **pure** et testée) : les entrées
  sont reliées à TMDB pour **s'unifier** avec la recherche et la bibliothèque (pas de média
  fantôme, pas de doublon). Les titres non identifiés sont **rapportés**, jamais inventés.
- **Best-effort** : une entrée en échec (fournisseur indisponible, titre introuvable) n'interrompt
  pas l'import ; elle est comptabilisée (ignorée / non rapprochée) dans un **rapport**.
- **Épisodes par numérotation** : TV Time ne fournit pas nos IDs internes ; un use case
  `MarkWatchedEpisodesByNumberUseCase` charge la structure du catalogue et rapproche
  saison + numéro → épisode.

## Alternatives considérées

- **Stocker sous un provider `tvtime`** (sans rapprochement) : rapide et hors-ligne, mais fragmente
  l'identité du média (doublons avec TMDB, pas d'enrichissement poster/genre/durée). Rejeté :
  contraire au média générique unifié (ADR-0003).
- **Import dans `library`** plutôt qu'un module dédié : mélangerait suivi et intégration externe,
  et coderait le format TV Time au cœur du métier. Rejeté.
- **Événement de domaine par épisode importé** : un import de masse (milliers d'épisodes) inonderait
  le journal. Rejeté pour l'import ; les projections restent correctes (lignes créées).

## Conséquences

**Positives** : formats additionnels ajoutés sans toucher au métier ; médias importés unifiés avec
le reste de l'app ; rapport transparent (importés / déjà présents / non trouvés).

**Négatives** : coût réseau du rapprochement (une recherche par titre, une fiche par série) — atténué
par le **cache Redis** et l'exécution ponctuelle ; correspondance **floue** possible sur des titres
ambigus (numérotation d'animés divergente) — rendue visible via les compteurs de non-rapprochés et
la liste dédiée. Les dates de visionnage historiques ne sont pas rejouées (statut importé à la date
de l'import) — limitation assumée pour cette itération.
