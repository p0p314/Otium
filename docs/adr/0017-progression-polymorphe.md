# ADR-0017 — Progression polymorphe (pages, pourcentage) + historique

- Statut : Accepté
- Date : 2026-07-20

## Contexte

Jusqu'ici, Otium ne connaissait que deux formes d'avancement : binaire (un film est vu ou non) et
par épisodes (une série a des `WatchedEpisode` horodatés). Un livre ne relève ni de l'une ni de
l'autre : on avance **continûment**, en pages ou en pourcentage, et l'utilisateur veut savoir combien
il lui reste et à quel rythme il lit.

ADR-0003 annonçait un « `ProgressModel` polymorphe » sans le réaliser. Les types à venir — mangas
(chapitres), BD (tomes), podcasts (minutes) — appelleront la même mécanique.

## Décision

**1. Une progression générique portée par `LibraryItem`**, pas par un type concret :
`progressUnit` (`PAGES` | `PERCENT`), `progressValue`, `progressTotal`, plus `startedAt` /
`finishedAt`. Ces colonnes vivent au niveau `LibraryItem` — donc disponibles pour tous les types de
média, y compris films et séries, sans nouvelle migration.

**2. Un enum d'unités ouvert à l'extension.** Ajouter `CHAPTERS`, `VOLUMES` ou `MINUTES` = ajouter
une valeur d'enum et son total effectif ; ni le modèle, ni l'API, ni les écrans ne changent de forme.

**3. Un historique horodaté (`ProgressEntry`)**, pendant de `WatchedEpisode`. Chaque avancement réel
est journalisé (`from` → `to`, daté). Sans lui, seule la valeur courante serait connue : « pages par
mois » et « rythme de lecture » seraient impossibles à calculer autrement que par approximation.
Une progression qui recule (correction de saisie) n'est **pas** journalisée.

**4. Les règles sont pures** (`reading-progress.ts`, testé sans I/O) : bornage de la saisie, calcul
du pourcentage et du restant, statut déduit, dates déduites. Le serveur est la **seule** source de
vérité : les clients affichent `percent` / `remaining` sans jamais les recalculer.

**5. Le suivi manuel garde la main.** Un média mis en pause ou abandonné ne repasse pas « en cours »
sur une simple mise à jour de progression ; seule l'atteinte de la fin force `COMPLETED`. Une date
déjà renseignée n'est jamais réécrite par la déduction.

**6. Écriture atomique** : état courant, statut, dates et entrée d'historique sont enregistrés dans
une même transaction — l'historique ne peut pas diverger de ce qui est affiché.

## Alternatives considérées

- **Un champ `pagesRead` sur un modèle `Book`** : spécifique à un type, contraire à ADR-0003, et
  inutilisable pour les mangas ou les podcasts. Rejeté.
- **Pourcentage seul** (tout ramené à 0–100) : perd l'information de pagination, empêche « pages
  restantes » et « pages lues », et dégrade les statistiques. Rejeté.
- **Pas d'historique, statistiques recalculées depuis l'état courant** : impossible de dater ce qui a
  été lu ; le « rythme » deviendrait une estimation arbitraire. Rejeté.
- **Historique dans le journal `DomainEvent`** : le journal sert l'audit, pas la requête analytique ;
  agréger du JSON par mois coûte cher et se prête mal à l'indexation. Rejeté (l'événement
  `ProgressUpdated` reste émis, en complément).

## Conséquences

**Positives** : un seul mécanisme de progression pour tous les types à venir ; pages restantes,
pourcentage et rythme calculés en un seul endroit ; statistiques temporelles exactes ; les dates de
début/fin bénéficieront aux films et séries sans migration supplémentaire.

**Négatives** : une ligne d'historique par avancement — volume borné en pratique (quelques dizaines
par livre), indexé par `(libraryItemId, occurredAt)` ; un avancement exprimé en pourcentage ne
contribue pas au total de pages lues (choix assumé : on ne convertit pas un pourcentage en pages
sans pagination fiable).
