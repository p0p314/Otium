# ADR-0009 — Rafraîchissement de la structure des séries (garde-fou de fraîcheur)

- Statut : Accepté
- Date : 2026-07-16

## Contexte

La structure saisons/épisodes d'une série (avec les dates de diffusion `airDate`) n'était chargée
**qu'une seule fois**, à l'ajout de la série en bibliothèque (`saveSeasons` gardé par `hasEpisodes`).
Conséquences pour l'agenda « À venir » (ADR — épisodes à diffusion **future**) :

- les séries ajoutées **avant** l'introduction des `airDate` gardent des dates `NULL` (traitées comme
  « déjà sorties ») ;
- les **nouvelles saisons annoncées** (ex. saison 3) et leurs dates ne sont **jamais** captées.

Résultat : « À venir » restait vide pour toute série déjà en bibliothèque, même quand une saison
future existe côté catalogue.

## Décision

Rafraîchir la structure des séries suivies avec un **garde-fou de fraîcheur**, déclenché en amont des
lectures accueil / « À venir » (`RefreshTrackedSeriesUseCase`).

- **Cible** : séries suivies (hors `DROPPED`) dont la structure n'a **jamais** été synchronisée
  (`episodesSyncedAt IS NULL`) ou l'a été il y a plus de `SERIES_SYNC_TTL_MS` (24 h — les grilles
  évoluent lentement). Dédoublonné par média (structure partagée entre utilisateurs).
- **Borné** : au plus `SERIES_SYNC_MAX_PER_RUN` (12) appels catalogue par exécution, pour limiter la
  rafale réseau (éco-conception — CLAUDE.md §9).
- **Best-effort** : n'échoue jamais la lecture appelante ; chaque tentative est **horodatée**
  (succès comme échec) via `Media.episodesSyncedAt`, ce qui garantit **au plus une tentative par
  média et par fenêtre de fraîcheur** — un catalogue indisponible ne provoque pas de matraquage.
- `saveSeasons` **upsert** : met à jour titres/durées/`airDate` et ajoute les saisons/épisodes
  nouvellement annoncés sans dupliquer l'existant (clés naturelles `mediaId+number`, `seasonId+number`).

## Alternatives considérées

- **Rafraîchir à chaque chargement** (sans garde-fou) : simple mais coûteux en réseau, contraire à
  l'éco-conception. Rejeté.
- **Rafraîchir uniquement à l'ouverture de la fiche série** : simple, mais « À venir » ne se peuple
  qu'après avoir visité chaque série — l'agenda resterait vide pour l'utilisateur qui ne fait que le
  consulter. Rejeté comme mécanisme principal (reste possible en complément plus tard).
- **Job planifié (cron) côté serveur** : idéal à grande échelle, mais introduit une brique
  d'ordonnancement prématurée. Reporté ; le garde-fou de fraîcheur rend le rafraîchissement au
  chargement suffisamment sobre pour l'itération actuelle.

## Conséquences

**Positives** : « À venir » se peuple pour les séries déjà en bibliothèque ; les dates et nouvelles
saisons sont captées automatiquement, de façon transparente ; coût réseau borné et amorti (une
tentative par série toutes les 24 h, atténuée par le cache Redis du catalogue).

**Négatives** : la première lecture après péremption paie la latence du rafraîchissement (bornée à
12 fiches, best-effort) ; un échec catalogue diffère les données réelles jusqu'à la fenêtre suivante
(24 h) — compromis assumé pour protéger le réseau. La migration vers un job planifié reste ouverte si
le volume le justifie.
