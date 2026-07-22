import type { NotificationPreferences, PushSubscriptionInput } from "@otium/types";
import type { PushSubscriptionData, UserPreferences } from "../domain";

/** Les préférences de domaine et le DTO partagent la même forme (4 booléens). */
export function toPreferencesDto(prefs: UserPreferences): NotificationPreferences {
  return {
    newEpisodes: prefs.newEpisodes,
    newSeasons: prefs.newSeasons,
    movieReminder: prefs.movieReminder,
    movieRelease: prefs.movieRelease,
  };
}

/** Aplati l'abonnement du navigateur en données persistables. */
export function toSubscriptionData(input: PushSubscriptionInput): PushSubscriptionData {
  return {
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    userAgent: input.userAgent ?? null,
  };
}
