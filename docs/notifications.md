# Notifications Push (PWA)

Prévient l'utilisateur dès qu'un contenu de sa liste **« à voir »** devient disponible.
Décision d'architecture : [ADR-0020](adr/0020-notifications-push-pwa.md).

## Ce qui déclenche une notification

| Type            | Condition (contenu « à voir »/« en cours »)                       | Exemple |
| --------------- | ------------------------------------------------------------------ | ------- |
| `episode`       | Un épisode d'une série suivie vient d'être diffusé                  | « One Piece — Saison 1, épisode 5 est maintenant disponible. » |
| `season`        | Premier épisode d'une **nouvelle** saison (≥ 2)                     | « The Bear — Saison 5 commence aujourd'hui. » |
| `movie_reminder`| Un film à voir sort dans **7 jours** ou moins                      | « Avatar 3 sort dans 7 jours. » |
| `movie_release` | Un film à voir vient de **sortir**                                  | « Avatar 3 est officiellement sorti. » |

Aucune notification pour les contenus terminés, abandonnés, en pause, ou retirés de la
liste « à voir ». Chaque notification part **une seule fois** par utilisateur et par
appareil abonné.

## Variables d'environnement

| Variable                   | Rôle                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `VAPID_PUBLIC_KEY`         | Clé publique VAPID (transmise au navigateur pour l'inscription).     |
| `VAPID_PRIVATE_KEY`        | Clé privée VAPID (signe les envois). **Secret.**                     |
| `VAPID_SUBJECT`            | `mailto:` ou `https:` identifiant l'émetteur (défaut `mailto:notifications@otium.app`). |
| `NOTIFICATIONS_CRON_SECRET`| Facultatif : protège le déclencheur externe. Vide = endpoint désactivé. |

Les clés sont fournies **par l'environnement uniquement** et jamais générées au démarrage
(sinon tous les abonnements seraient invalidés à chaque redéploiement — ADR-0020). Sans
clés, l'application démarre normalement mais l'envoi Push est désactivé.

## Commandes

```bash
# Générer une paire de clés VAPID (une fois), puis renseigner l'environnement.
npx web-push generate-vapid-keys

# Appliquer la migration (crée PushSubscription, NotificationPreference, SentNotification).
pnpm --filter @otium/api prisma:migrate      # dev
pnpm --filter @otium/api prisma:deploy        # prod / CI
```

Migration ajoutée : `apps/api/prisma/migrations/20260722120000_push_notifications`.

## Fonctionnement du « cron »

L'hébergement gratuit s'endort (ADR-0012) : pas de planificateur en processus. La détection
est **opportuniste** (ADR-0019) — l'échéance est portée par `SyncState` (tâche
`notifications:detect`, intervalle 12 h) et `DueJobRunner` la déclenche à l'occasion d'une
requête utilisateur (chargement des préférences/abonnements au démarrage de la PWA), sans en
subir la latence et sans jamais échouer la requête.

Il force l'exécution immédiate et renvoie le bilan. Désactivé (403) si le secret n'est pas
configuré, pour éviter un déclencheur ouvert.

### Notifications sans activité de l'utilisateur (recommandé)

La détection opportuniste ne suffit pas si personne n'ouvre l'application. Pour recevoir des
notifications **de façon autonome**, un déclencheur externe appelle l'endpoint à intervalle
régulier. Le workflow **`.github/workflows/notifications.yml`** le fait via un cron GitHub
Actions (gratuit) — il réveille aussi le service en veille puis lance la détection.

Activation (une seule fois) :

1. **Serveur (Render)** — définir `NOTIFICATIONS_CRON_SECRET` (une valeur secrète au choix).
2. **GitHub** — Settings → *Secrets and variables* → *Actions* → *New secret* :
   - `NOTIFICATIONS_BASE_URL` = URL publique du service (ex. `https://otium.onrender.com`) ;
   - `NOTIFICATIONS_CRON_SECRET` = **la même valeur** que côté serveur.

Le workflow tourne toutes les 6 h (modifiable dans le `cron:`) et se lance aussi à la
demande (onglet *Actions* → *Run workflow*). Sans les secrets, il se termine sans rien faire.

Un `curl` manuel reste possible :

```bash
curl -X POST https://<host>/api/notifications/run -H "x-cron-secret: $NOTIFICATIONS_CRON_SECRET"
```

> Alternatives à GitHub Actions : un service de ping planifié (cron-job.org, UptimeRobot…)
> appelant la même URL avec l'en-tête `x-cron-secret`.

## Parcours utilisateur

1. Profil › **Notifications** → « Activer les notifications ».
2. Le navigateur demande l'autorisation ; l'appareil s'inscrit au Web Push (clé VAPID).
3. L'abonnement est enregistré côté serveur (un par appareil ; plusieurs appareils possibles).
4. Les canaux (épisodes, saisons, rappel J-7, sortie) s'activent/désactivent indépendamment.
5. À l'arrivée d'une notification, le clic ouvre la fiche du contenu.
6. Refus d'autorisation : un message explique comment la réactiver dans le navigateur.
7. Réinscription : si le navigateur régénère l'abonnement, il est réenregistré silencieusement.

> **iOS** : le Web Push exige que la PWA soit d'abord **installée** sur l'écran d'accueil
> (Safari 16.4+). Le composant l'indique quand le support est absent.

## API

| Méthode | Route                                   | Description |
| ------- | --------------------------------------- | ----------- |
| `GET`   | `/api/notifications/vapid-public-key`   | Clé publique VAPID (503 si non configurée). |
| `POST`  | `/api/notifications/subscriptions`      | Enregistre l'abonnement de l'appareil. |
| `DELETE`| `/api/notifications/subscriptions`      | Retire l'abonnement de l'appareil. |
| `GET`   | `/api/notifications/preferences`        | Préférences de l'utilisateur. |
| `PATCH` | `/api/notifications/preferences`        | Met à jour partiellement les préférences. |
| `POST`  | `/api/notifications/run`                | Déclencheur externe (secret requis). |

Toutes les routes utilisateur sont protégées : le `userId` provient de la session, jamais du
corps — un utilisateur ne peut gérer que ses propres abonnements et préférences.

## Observabilité

Chaque exécution journalise un bilan : notifications détectées, réclamées, doublons ignorés,
envoyées, échecs, abonnements purgés (404/410).

## Limitations connues

- La détection ne tourne **que si l'application reçoit du trafic** (scale-to-zero assumé).
- Fenêtre de rattrapage de **deux jours** : une sortie plus ancienne jamais détectée n'est
  pas rattrapée (acceptable pour une notification, par nature temps réel).
- L'échéance est approximative (« au moins une demi-journée »), pas à heure fixe.

## Améliorations possibles

- Exposer chaque canal dans l'UI dès aujourd'hui (déjà stocké — aucune migration requise).
- Regrouper plusieurs sorties du jour en une notification digest.
- Déclencheur externe planifié (GitHub Actions) pour une couverture indépendante du trafic.
- Notifications de parution pour les livres (le modèle `NotificationType` est extensible).
