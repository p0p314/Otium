# ADR-0013 — Import TV Time en tâche de fond (job + polling)

- Statut : Accepté
- Date : 2026-07-17

## Contexte

L'import d'un export RGPD TV Time rapproche **chaque** titre au catalogue TMDB (une
recherche réseau par entrée) puis écrit en base. Pour une bibliothèque fournie (des
centaines de titres, parfois > 1000 épisodes), le traitement dure **plusieurs minutes**.

Il était déclenché par **une seule requête HTTP synchrone** : le client attendait le
rapport complet. Conséquences observées en production (mobile, hébergement gratuit) :

- si le téléphone se **verrouille** ou l'onglet passe en arrière-plan, la connexion tombe
  et **l'import s'interrompt** ;
- aucune **progression** visible ; l'utilisateur ne sait pas si ça avance ;
- les données remontaient **tardivement** dans la bibliothèque (tout à la fin).

## Décision

Découpler le **déclenchement** du **traitement** :

1. `POST /import/tvtime` **crée un job**, lance le traitement en **tâche de fond**
   (fire-and-forget côté serveur) et **répond aussitôt** `{ jobId }`. Le traitement se
   poursuit **indépendamment du client** — téléphone verrouillé sans effet.
2. `GET /import/jobs/:jobId` renvoie l'**état** du job (progression `processed/total`,
   compteurs, puis **rapport** final). Le front **sonde** (polling) toutes les 1,5 s tant
   que le job tourne, affiche une **barre de progression**, et **rafraîchit la bibliothèque
   au fil de l'eau** (les titres apparaissent progressivement).
3. Le suivi des jobs est **en mémoire** (`InMemoryImportJobStore`, port `IMPORT_JOB_STORE`),
   cohérent avec le choix « sans Redis, mono-instance » de l'[ADR-0012](0012-hebergement-gratuit-service-unique.md).
   Chaque état de job est borné (TTL 1 h, plafond d'entrées) et restreint à son propriétaire.

Le use case de rapprochement (`ImportArchiveUseCase`) est inchangé dans sa logique ; on lui
ajoute seulement un rappel `onProgress` optionnel. `StartImportUseCase` orchestre le job,
`GetImportJobUseCase` lit l'état.

## Alternatives considérées

- **File de jobs persistante (BullMQ/Redis).** Rejeté pour la V1 : réintroduit Redis, à
  contre-courant de l'ADR-0012. Reste la cible pour le multi-instances (le port
  `IMPORT_JOB_STORE` permet d'y passer sans toucher au métier).
- **Streaming (SSE/WebSocket)** de la progression. Rejeté : plus complexe (proxy, reconnexion
  mobile) que le polling, pour un gain marginal sur un import ponctuel.
- **Garder l'appel synchrone en augmentant les timeouts.** Rejeté : ne règle ni le verrouillage
  du téléphone ni l'absence de progression.

## Conséquences (positives / négatives)

**Positives**
- L'import **survit** au verrouillage/arrière-plan du client ; progression visible ; la
  bibliothèque se remplit **progressivement**.
- Aucune dépendance nouvelle ; cohérent avec l'architecture mono-instance sans Redis.
- Le rapprochement reste réutilisable (résolution manuelle inchangée).

**Négatives**
- État des jobs **en mémoire** : perdu au redémarrage de l'instance. Les écritures déjà
  faites **persistent** (import partiel conservé) ; l'utilisateur peut relancer (idempotent).
- **Mono-instance** requis tant que le store n'est pas partagé (déjà le cas — ADR-0012).
- Le polling ajoute quelques requêtes légères pendant l'import (bornées, 1,5 s).
