import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  MOVIE_REMINDER_DAYS,
  NOTIFICATION_CANDIDATE_REPOSITORY,
  type NotificationCandidateRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepository,
  planNotifications,
  type PlannedNotification,
  PUSH_SENDER,
  type PushSender,
  type PushSubscriptionRecord,
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
  SENT_NOTIFICATION_STORE,
  type SentNotificationStore,
} from "../domain";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fenêtre de rattrapage des épisodes/films récemment sortis. Généreuse à dessein : si
 * l'application a « dormi » (hébergement gratuit, ADR-0012), la première requête au réveil
 * capte encore les sorties des deux derniers jours. Le registre anti-doublon garantit
 * qu'aucune n'est envoyée deux fois.
 */
export const RECENT_RELEASE_LOOKBACK_MS = 2 * DAY_MS;

/** Intervalle minimal entre deux détections (déclenchement opportuniste, ADR-0019/0020). */
export const NOTIFICATION_DETECTION_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Bilan d'une exécution — journalisé pour l'observabilité (production). */
export interface NotificationRunSummary {
  /** Notifications planifiées (après préférences), avant anti-doublon. */
  detected: number;
  /** Notifications nouvellement réclamées (donc réellement à envoyer). */
  claimed: number;
  /** Planifiées déjà envoyées auparavant (doublons ignorés). */
  skipped: number;
  /** Envois d'appareil réussis. */
  sent: number;
  /** Envois d'appareil en échec (transitoire). */
  failed: number;
  /** Abonnements invalides (404/410) supprimés en cours d'envoi. */
  prunedSubscriptions: number;
}

const EMPTY_SUMMARY: NotificationRunSummary = {
  detected: 0,
  claimed: 0,
  skipped: 0,
  sent: 0,
  failed: 0,
  prunedSubscriptions: 0,
};

/**
 * Détecte les notifications dues et les envoie (ADR-0020). Balaye **uniquement** les
 * contenus « à voir » dont la sortie est récente/proche, planifie (fonction pure),
 * **réclame** chaque notification dans le registre anti-doublon puis diffuse sur tous
 * les appareils de l'utilisateur — en supprimant au passage les abonnements morts.
 *
 * Conçu pour être **idempotent** : relançable plusieurs fois par jour, en parallèle, sans
 * jamais générer de doublon (la prise anti-doublon est atomique côté base).
 */
@Injectable()
export class DetectDueNotificationsUseCase {
  private readonly logger = new Logger(DetectDueNotificationsUseCase.name);

  constructor(
    @Inject(NOTIFICATION_CANDIDATE_REPOSITORY)
    private readonly candidates: NotificationCandidateRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
    @Inject(SENT_NOTIFICATION_STORE) private readonly sent: SentNotificationStore,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  async execute(now: Date = new Date()): Promise<NotificationRunSummary> {
    if (!this.sender.isConfigured()) {
      this.logger.warn("Détection ignorée : clés VAPID non configurées.");
      return { ...EMPTY_SUMMARY };
    }

    const episodesSince = new Date(now.getTime() - RECENT_RELEASE_LOOKBACK_MS);
    const releasedSince = new Date(now.getTime() - RECENT_RELEASE_LOOKBACK_MS);
    const upcomingUntil = new Date(now.getTime() + MOVIE_REMINDER_DAYS * DAY_MS);

    const [episodes, movies] = await Promise.all([
      this.candidates.findRecentlyAiredEpisodes(episodesSince, now),
      this.candidates.findMoviesInReleaseWindow(releasedSince, upcomingUntil),
    ]);

    const userIds = distinct([
      ...episodes.map((e) => e.userId),
      ...movies.map((m) => m.userId),
    ]);
    if (userIds.length === 0) return { ...EMPTY_SUMMARY };

    const preferences = await this.preferences.getForUsers(userIds);
    const planned = planNotifications({ episodes, movies, preferences, now });
    if (planned.length === 0) return { ...EMPTY_SUMMARY };

    // Ne réclamer/envoyer que pour les utilisateurs ayant au moins un appareil : sans
    // abonnement, consommer la clé anti-doublon priverait l'utilisateur de la notification
    // s'il activait le Push peu après (dans la fenêtre de rattrapage).
    const subscriptions = await this.subscriptions.findByUserIds(
      distinct(planned.map((p) => p.userId)),
    );
    const byUser = groupByUser(subscriptions);
    const deliverable = planned.filter((p) => (byUser.get(p.userId)?.length ?? 0) > 0);
    if (deliverable.length === 0) {
      return { ...EMPTY_SUMMARY, detected: planned.length };
    }

    const claimed = await this.sent.claim(
      deliverable.map((p) => ({ userId: p.userId, dedupKey: p.dedupKey, type: p.type })),
    );
    const claimedKeys = new Set(claimed.map((c) => `${c.userId}::${c.dedupKey}`));
    const toSend = deliverable.filter((p) => claimedKeys.has(`${p.userId}::${p.dedupKey}`));

    const summary: NotificationRunSummary = {
      ...EMPTY_SUMMARY,
      detected: planned.length,
      claimed: toSend.length,
      skipped: deliverable.length - toSend.length,
    };

    await this.fanOut(toSend, byUser, summary);

    this.logger.log(
      `Notifications : ${summary.detected} détectées, ${summary.claimed} réclamées, ` +
        `${summary.skipped} doublons, ${summary.sent} envoyées, ${summary.failed} échecs, ` +
        `${summary.prunedSubscriptions} abonnements purgés.`,
    );
    return summary;
  }

  /** Diffuse chaque notification sur tous les appareils, en purgeant les endpoints morts. */
  private async fanOut(
    toSend: readonly PlannedNotification[],
    byUser: Map<string, PushSubscriptionRecord[]>,
    summary: NotificationRunSummary,
  ): Promise<void> {
    const expired = new Set<string>();
    for (const notification of toSend) {
      const devices = byUser.get(notification.userId) ?? [];
      for (const device of devices) {
        if (expired.has(device.endpoint)) continue;
        const result = await this.sender.send(device, notification.content);
        if (result === "sent") {
          summary.sent += 1;
        } else if (result === "expired") {
          expired.add(device.endpoint);
        } else {
          summary.failed += 1;
        }
      }
    }
    for (const endpoint of expired) {
      await this.subscriptions
        .removeByEndpoint(endpoint)
        .then(() => {
          summary.prunedSubscriptions += 1;
        })
        .catch((error: unknown) =>
          this.logger.warn(`Purge d'un abonnement impossible : ${(error as Error).message}`),
        );
    }
  }
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function groupByUser(
  subscriptions: readonly PushSubscriptionRecord[],
): Map<string, PushSubscriptionRecord[]> {
  const map = new Map<string, PushSubscriptionRecord[]>();
  for (const sub of subscriptions) {
    const list = map.get(sub.userId);
    if (list) list.push(sub);
    else map.set(sub.userId, [sub]);
  }
  return map;
}
