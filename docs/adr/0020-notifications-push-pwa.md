# ADR-0020 — Notifications Push (PWA) : Web Push, anti-doublon en base, détection opportuniste

- Statut : Accepté
- Date : 2026-07-22

## Contexte

Otium doit prévenir l'utilisateur lorsqu'un contenu de sa liste « à voir » devient
disponible : nouvel épisode ou nouvelle saison d'une série suivie, sortie d'un film (rappel
sept jours avant, puis le jour même). L'application est une **PWA** installable (ADR-0007) ;
le canal naturel, multiplateforme (Android, iOS 16.4+, desktop), est le **Web Push**.

Trois contraintes cadrent la conception :

1. **Aucun doublon.** Une notification donnée ne doit partir **qu'une fois**, quels que
   soient les redémarrages, les relances de la tâche, ou plusieurs exécutions simultanées.
2. **Hébergement gratuit qui s'endort** (ADR-0012). Une planification en processus
   (`@nestjs/schedule`) ne se déclencherait pas pendant le sommeil : les échéances manquées
   seraient perdues silencieusement. Le projet a déjà tranché ce point (ADR-0019).
3. **Éco-conception.** Interdit de balayer toute la bibliothèque de tous les utilisateurs
   chaque nuit ; on ne requête que les contenus **susceptibles** de déclencher une
   notification.

## Décision

**Web Push standard (VAPID / RFC 8291)**, servi par la bibliothèque `web-push`. Les clés
VAPID viennent **exclusivement de l'environnement** et ne sont **jamais générées au
démarrage** : une génération automatique changerait de clé à chaque redéploiement et
invaliderait tous les abonnements. Sans clés, l'application démarre normalement mais l'envoi
est désactivé proprement (comme TMDB sans jeton).

**Un abonnement par appareil.** Un utilisateur peut s'abonner depuis plusieurs appareils
(`PushSubscription`, unique par `endpoint`) ; chacun reçoit les notifications. Un abonnement
rejeté par le service Push (404/410) est supprimé automatiquement à l'envoi.

**Préférences par canal, indépendantes** (`NotificationPreference`) : nouveaux épisodes,
nouvelles saisons, rappel J-7, sortie du jour — structurées dès la V1 pour éviter une
migration lorsque l'UI exposera chaque canal. Absence de ligne = tout activé.

**Anti-doublon porté par la base** (`SentNotification`, unique `(userId, dedupKey)`). La
prise se fait par `INSERT … ON CONFLICT DO NOTHING RETURNING` : `RETURNING` ne rend que les
lignes réellement insérées, ce qui distingue une notification neuve d'un doublon **de façon
atomique**. Deux exécutions concurrentes ne peuvent pas réclamer la même clé — une seule
envoie. La clé encode l'identité stable de l'événement (`EPISODE:<episodeId>`,
`SEASON:<mediaId>:<n>`, `MOVIE_REMINDER:<mediaId>`, `MOVIE_RELEASE:<mediaId>`). Elle est liée
à l'**utilisateur**, pas seulement au contenu : deux utilisateurs suivant la même série sont
notifiés chacun.

**Détection opportuniste, pas de cron en processus** (réutilise ADR-0019). L'échéance est
portée par la donnée (`SyncState`, tâche `notifications:detect`) et `DueJobRunner` la
déclenche à l'occasion d'une requête utilisateur (chargement des préférences/abonnements au
démarrage de la PWA) : exécution **unique par échéance**, **non bloquante**, **non fatale**.
Un **déclencheur externe** protégé par secret (`POST /api/notifications/run`) reste
disponible pour un cron GitHub Actions/Render, sans changer le port.

**Requêtes bornées** (éco-conception). Côté séries, on ne lit que les épisodes dont
`airDate` tombe dans une fenêtre récente (index dédié) et dont la série est « à voir »/« en
cours » ; côté films, la fenêtre de sortie `[J-2, J+7]`. La logique de décision (épisode vs
saison, J-7 vs jour J, filtrage par préférences) est une **fonction pure**, testée sans I/O.

**Service worker unique.** Le worker existant (précache Workbox) passe en stratégie
`injectManifest` et porte **aussi** les gestionnaires `push` et `notificationclick` —
aucun second worker, pas de conflit de portée. Le clic ouvre la fiche du contenu.

**Charge utile unique et versionnable** (`NotificationPayload` dans `@otium/types`) :
`type`, `contentId`, `provider`/`providerId`, `title`, `body`, `image`, `url`. Le worker
n'affiche jamais une charge utile qu'il ne comprend pas.

## Alternatives considérées

- **Anti-doublon « lire puis écrire ».** Rejeté : la fenêtre entre lecture et écriture
  laisserait deux exécutions concurrentes s'estimer toutes deux légitimes. La contrainte
  d'unicité empêcherait la ligne double, mais pas le double envoi.
- **`@nestjs/schedule` en processus.** Rejeté (ADR-0019) : ne tourne pas pendant le sommeil.
- **Notifier à l'échelle du contenu** (un envoi partagé). Rejeté : l'état « déjà envoyé »
  doit être par utilisateur, sinon un nouvel abonné hériterait ou serait privé à tort.
- **Générer les clés VAPID au démarrage.** Rejeté : invaliderait tous les abonnements à
  chaque redéploiement.

## Conséquences

**Positives** : idempotent et robuste au scale-to-zero ; par appareil et par utilisateur ;
préférences extensibles sans migration ; requêtes bornées ; cœur de décision testable sans
I/O ; observabilité (bilan journalisé : détectées, réclamées, doublons, envoyées, échecs,
abonnements purgés).

**Négatives** : la détection ne tourne **que si l'application reçoit du trafic** (assumé,
ADR-0019) ; l'échéance est approximative (« au moins une demi-journée », pas « à 3 h »). La
fenêtre de rattrapage (deux jours) borne les envois tardifs après un long sommeil : une
sortie plus ancienne jamais détectée ne sera pas rattrapée — acceptable pour une
notification, par nature temps réel.
