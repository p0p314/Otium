/**
 * Modèle de domaine des notifications (ADR-0020). **Aucune** dépendance externe
 * (ni Prisma, ni NestJS, ni `web-push`) : ces types et la logique de planification sont
 * testables sans I/O.
 */

/** Nature d'une notification — détermine le libellé et l'URL de redirection. */
export type NotificationType = "episode" | "season" | "movie_reminder" | "movie_release";

/** Statuts de bibliothèque **éligibles** aux notifications : « à voir » et « en cours ». */
export const NOTIFIABLE_STATUSES = ["PLANNED", "IN_PROGRESS"] as const;

/**
 * Épisode **récemment diffusé** d'une série présente dans la liste « à voir » d'un
 * utilisateur. Fourni par le dépôt de candidats, déjà borné à une fenêtre récente.
 */
export interface EpisodeCandidate {
  readonly userId: string;
  readonly mediaId: string;
  readonly provider: string;
  readonly externalId: string;
  readonly seriesTitle: string;
  readonly posterUrl: string | null;
  readonly episodeId: string;
  readonly seasonNumber: number;
  readonly episodeNumber: number;
  readonly episodeTitle: string;
  readonly airDate: Date;
}

/**
 * Film de la liste « à voir » d'un utilisateur dont la sortie est **proche** (rappel J-7)
 * ou **passée depuis peu** (sortie du jour). La classification est faite par la
 * planification, pas par le dépôt.
 */
export interface MovieCandidate {
  readonly userId: string;
  readonly mediaId: string;
  readonly provider: string;
  readonly externalId: string;
  readonly title: string;
  readonly posterUrl: string | null;
  readonly releaseDate: Date;
}

/** Préférences d'un utilisateur, chaque canal activable indépendamment. */
export interface UserPreferences {
  readonly newEpisodes: boolean;
  readonly newSeasons: boolean;
  readonly movieReminder: boolean;
  readonly movieRelease: boolean;
}

/** Préférences par défaut : tout est actif tant que l'utilisateur n'a rien changé. */
export const DEFAULT_PREFERENCES: UserPreferences = {
  newEpisodes: true,
  newSeasons: true,
  movieReminder: true,
  movieRelease: true,
};

/**
 * Contenu d'une notification prêt à être envoyé. Structurellement compatible avec le
 * contrat partagé `NotificationPayload` (@otium/types) — la couche présentation le
 * valide au besoin, le domaine reste sans dépendance.
 */
export interface NotificationContent {
  readonly type: NotificationType;
  readonly contentId: string;
  readonly provider: string;
  readonly providerId: string;
  readonly title: string;
  readonly body: string;
  readonly image: string | null;
  readonly url: string;
}

/**
 * Notification **planifiée** : identité anti-doublon (`dedupKey`, unique par utilisateur)
 * et charge utile. Tant que la clé n'est pas réclamée dans le registre, la notification
 * n'a pas encore été prise en charge.
 */
export interface PlannedNotification {
  readonly userId: string;
  readonly dedupKey: string;
  readonly type: NotificationType;
  readonly content: NotificationContent;
}
