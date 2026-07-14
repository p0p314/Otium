# 01 — Analyse fonctionnelle

## 1. Problème utilisateur

Les amateurs de contenus culturels dispersent leur suivi sur plusieurs outils (un pour les séries,
un pour les films, un pour les livres…). Ils perdent :
- **le fil** (quel épisode reprendre, quel tome lire ensuite) ;
- **la mémoire** (qu'ai-je vu/lu, quand, qu'en ai-je pensé) ;
- **la découverte** pertinente (recommandations cloisonnées par type).

**Otium** unifie le suivi de **tous** les types de médias dans une expérience unique, rapide et
premium.

## 2. Personas

| Persona | Besoin principal |
| --- | --- |
| **Le sérievore** | Reprendre le bon épisode, suivre la progression saison/épisode, cocher rapidement. |
| **Le cinéphile** | Journal de films vus, notes, avis, listes thématiques (à la Letterboxd). |
| **Le collectionneur multi-média** (cible long terme) | Une seule bibliothèque pour séries, films, livres, jeux… |
| **Le social light** (post-V1) | Voir l'activité d'amis, comparer, recommander. |

## 3. Périmètre par version

### MVP
- Auth (inscription/connexion).
- Recherche de médias (films & séries) via un fournisseur externe.
- Fiche média (détails).
- Ajout à la bibliothèque + statut de visionnage.
- Séries : suivi épisode par épisode, épisode courant, reprise.
- Films : statut vu / à voir / complété.

### V1
- Favoris, listes personnalisées.
- Notation + avis + historique.
- Recherche avancée (filtres, genres, tri, pagination).
- Thème clair/sombre, design system complet.
- Événements métier → statistiques de base.

### Évolutions
- Nouveaux types de médias (livres, jeux, animés…).
- Recommandations personnalisées.
- Meilisearch, notifications, social, mobile.

## 4. Capacités transversales (niveau `Media`)

Ces capacités doivent fonctionner **pour tout type de média**, présent ou futur :

| Capacité | Description | Événement émis |
| --- | --- | --- |
| Ajout / retrait bibliothèque | Suivre / ne plus suivre un média | `MediaAdded` / `MediaRemoved` |
| Statut | Ex. *à voir / en cours / terminé / abandonné* | `MediaStatusChanged` |
| Favori | Marquer comme favori | `FavoriteAdded` / `FavoriteRemoved` |
| Notation | Note entière **0–10** | `MediaRated` |
| Avis / commentaire | Texte libre | `CommentCreated` |
| Listes personnalisées | Regrouper des médias | `ListItemAdded` / `ListCreated` |
| Historique | Journal des actions | (dérivé des événements) |
| Recommandations | Suggestions personnalisées | (consommateur d'événements) |

## 5. Capacités spécifiques par type

Ce sont des **spécialisations**, exposées via un mécanisme d'extension (voir modèle métier) :

- **Film** : durée, progression simple (vu/non vu), date de visionnage.
- **Série** : saisons → épisodes ; progression fine ; **épisode courant** ; ensemble des
  **épisodes vus** ; **reprise automatique** (prochain épisode non vu) ; `SeriesCompleted`.
- **Livre** (futur) : pages/chapitres, progression de lecture.
- **Jeu** (futur) : temps de jeu, complétion, succès.

> Règle : si une capacité peut se formuler au niveau `Media`, elle **doit** y vivre.
> Ne créer du spécifique que pour ce qui est irréductiblement propre au type.

## 6. Parcours clés (à mesurer)

| Parcours | Métrique de succès |
| --- | --- |
| Rechercher et ajouter un média | Temps p95 « recherche → ajouté » < 3 s ; ≤ 2 appels réseau perçus |
| Marquer un épisode vu | Action optimiste < 100 ms perçu ; 1 appel réseau |
| Reprendre une série | « Prochain épisode » exact dans 100 % des cas testés |
| Chargement bibliothèque | LCP < 2,5 s sur mobile 4G émulé ; payload initial JS maîtrisé |

## 7. Contraintes non fonctionnelles

- **Perf/éco** : mobile-first, images optimisées (formats modernes, tailles adaptées),
  pagination/lazy-loading, cache Redis + HTTP, minimiser le JS envoyé.
- **Accessibilité** : WCAG 2.2 AA visé (navigation clavier, contrastes, aria, focus visible).
- **i18n-ready** : textes externalisés dès le départ (FR d'abord).
- **Confidentialité** : données personnelles minimisées, pas de PII en clair dans les URLs/logs.
- **Fiabilité** : dégradation gracieuse si un fournisseur externe est indisponible (cache).
