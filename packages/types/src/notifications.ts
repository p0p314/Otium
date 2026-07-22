import { z } from "zod";

/**
 * Contrat des notifications Push (PWA). Partagé entre le frontend, le service worker et
 * l'API — c'est **la** frontière typée du système (CLAUDE.md §5). Le format de charge
 * utile (`NotificationPayload`) est unique et versionnable : le service worker n'affiche
 * jamais une notification dont il ne comprend pas la structure.
 */

/**
 * Nature d'une notification. Détermine le libellé affiché et l'URL de redirection.
 * Extensible (parutions de livres, etc.) sans rupture de contrat tant que les valeurs
 * existantes sont conservées.
 */
export const NotificationType = z.enum([
  "episode",
  "season",
  "movie_reminder",
  "movie_release",
]);
export type NotificationType = z.infer<typeof NotificationType>;

/**
 * Abonnement Push transmis par le navigateur (`PushSubscription.toJSON()`), plus un
 * libellé d'appareil facultatif. Un même utilisateur peut en enregistrer plusieurs
 * (téléphone, tablette, ordinateur) : chacun reçoit les notifications.
 */
export const PushSubscriptionInput = z.object({
  /** Endpoint unique du service Push du navigateur (identifie l'appareil). */
  endpoint: z.string().url(),
  /** Date d'expiration éventuelle (ms epoch) fournie par le navigateur. */
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    /** Clé publique de l'appareil (courbe P-256), base64url. */
    p256dh: z.string().min(1),
    /** Secret d'authentification, base64url. */
    auth: z.string().min(1),
  }),
  /** Étiquette lisible de l'appareil (ex. user-agent), utile côté gestion. */
  userAgent: z.string().max(512).optional(),
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInput>;

/** Désabonnement : l'endpoint suffit à identifier l'abonnement à retirer. */
export const RemovePushSubscriptionInput = z.object({
  endpoint: z.string().url(),
});
export type RemovePushSubscriptionInput = z.infer<typeof RemovePushSubscriptionInput>;

/**
 * Préférences de notification, activables **indépendamment**. Structurées ainsi dès la
 * V1 pour éviter une migration ultérieure, même si l'UI ne les expose pas encore toutes.
 */
export const NotificationPreferences = z.object({
  /** Nouvel épisode d'une série suivie. */
  newEpisodes: z.boolean(),
  /** Début d'une nouvelle saison d'une série suivie. */
  newSeasons: z.boolean(),
  /** Rappel 7 jours avant la sortie d'un film à voir. */
  movieReminder: z.boolean(),
  /** Sortie du jour d'un film à voir. */
  movieRelease: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferences>;

/** Mise à jour partielle des préférences : seuls les champs fournis changent. */
export const UpdateNotificationPreferencesInput = NotificationPreferences.partial();
export type UpdateNotificationPreferencesInput = z.infer<
  typeof UpdateNotificationPreferencesInput
>;

/** Clé publique VAPID exposée au client pour l'inscription Push. */
export const VapidPublicKey = z.object({
  publicKey: z.string().min(1),
});
export type VapidPublicKey = z.infer<typeof VapidPublicKey>;

/**
 * Charge utile **unique** d'une notification, transmise chiffrée à l'appareil puis
 * interprétée par le service worker. Contient tout ce qu'il faut pour afficher la
 * notification et rediriger au clic — sans nouvel appel réseau.
 */
export const NotificationPayload = z.object({
  type: NotificationType,
  /** Identifiant interne du média concerné (Otium). */
  contentId: z.string(),
  /** Fournisseur + identifiant externe, pour construire l'URL de la fiche (ex. TMDB). */
  provider: z.string(),
  providerId: z.string(),
  /** Titre affiché en tête de la notification. */
  title: z.string(),
  /** Corps du message. */
  body: z.string(),
  /** Illustration (affiche) éventuelle. */
  image: z.string().url().nullable(),
  /** URL relative de redirection au clic (fiche du contenu). */
  url: z.string(),
});
export type NotificationPayload = z.infer<typeof NotificationPayload>;
