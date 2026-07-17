# ADR-0014 — Accueil : une nouvelle saison récente remonte la série dans « À voir »

- Statut : Accepté
- Date : 2026-07-17

## Contexte

L'accueil ([ADR-0010](0010-accueil-fonde-sur-activite.md)) classe les séries selon
l'ancienneté du **dernier visionnage** : « à voir » (active), « à reprendre » (délaissée),
« à commencer » (jamais entamée), les autres étant masquées.

Cas non couvert : une **nouvelle saison vient de sortir** d'une série que l'on suit
(« en cours ») ou que l'on prévoit de regarder (« à voir »). Comme aucun épisode de cette
saison n'a encore été vu, la série ne remonte pas dans « À voir » — alors que c'est
précisément le moment de la proposer.

## Décision

Une série de statut **`PLANNED` (à voir)** ou **`IN_PROGRESS` (en cours)** est placée dans
**« À voir »** dès que le **premier épisode de sa saison en cours** est sorti **il y a moins
de 30 jours** (`RECENT_ACTIVITY_DAYS`), **même si aucun épisode de cette saison n'a été vu**.

- « Saison en cours » = dernière saison ayant au moins un épisode **diffusé** (plus grand
  numéro de saison sorti). « Premier épisode » = numéro le plus bas de cette saison.
- Une date de diffusion **inconnue** ne compte pas comme une sortie récente (on exige une
  date pour éviter les faux positifs).
- Prérequis : il reste au moins un épisode **sorti non vu** (sinon rien à proposer).

Implémentation : helpers **purs** `currentSeasonPremiere` / `hasRecentSeasonPremiere`
(domaine), branchés en tête du classement dans `buildHomeDashboard` (application).

## Alternatives considérées

- **Élargir à `COMPLETED`.** Rejeté pour l'instant : une série marquée terminée n'est pas
  « à voir » ; on s'en tient aux statuts demandés (à voir / en cours).
- **Se fonder sur la date de dernier visionnage seule.** Insuffisant : une saison fraîche ne
  déplace pas la date du dernier épisode vu, donc la série resterait masquée.
- **Nouveau bucket « Nouvelle saison ».** Rejeté : « À voir » est déjà l'endroit attendu ;
  pas de complexité d'affichage supplémentaire.

## Conséquences (positives / négatives)

**Positives**
- Les reprises de saison remontent au bon moment, sans action de l'utilisateur.
- Logique **pure** et testée (domaine + vue), sans I/O ni dépendance nouvelle.

**Négatives**
- Une série jamais commencée dont une saison récente est diffusée apparaît dans « À voir »
  (pointant vers son 1er épisode non vu) plutôt que dans « À commencer » — comportement voulu.
- Fenêtre fixe à 30 jours (comme l'activité récente) ; non configurable pour l'instant.
