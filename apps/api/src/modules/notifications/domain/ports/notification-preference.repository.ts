import type { UserPreferences } from "../models/notification";

/** Mise à jour partielle des préférences : seuls les champs fournis changent. */
export type NotificationPreferenceUpdate = Partial<UserPreferences>;

/**
 * Port de persistance des préférences de notification (ADR-0020). L'absence de ligne vaut
 * « tout activé » : les valeurs par défaut sont résolues côté application, pas en base.
 */
export interface NotificationPreferenceRepository {
  /** Préférences d'un utilisateur, ou `null` s'il n'en a jamais défini. */
  get(userId: string): Promise<UserPreferences | null>;
  /** Préférences de plusieurs utilisateurs (les absents ne figurent pas dans la Map). */
  getForUsers(userIds: readonly string[]): Promise<Map<string, UserPreferences>>;
  /** Crée ou met à jour les préférences et renvoie l'état complet résultant. */
  upsert(userId: string, update: NotificationPreferenceUpdate): Promise<UserPreferences>;
}

export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol("NOTIFICATION_PREFERENCE_REPOSITORY");
