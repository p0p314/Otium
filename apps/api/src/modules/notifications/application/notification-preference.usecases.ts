import { Inject, Injectable } from "@nestjs/common";
import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepository,
  type NotificationPreferenceUpdate,
  type UserPreferences,
} from "../domain";

/** Préférences de notification d'un utilisateur ; valeurs par défaut si jamais définies. */
@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly repo: NotificationPreferenceRepository,
  ) {}

  async execute(userId: string): Promise<UserPreferences> {
    return (await this.repo.get(userId)) ?? { ...DEFAULT_PREFERENCES };
  }
}

/** Met à jour partiellement les préférences et renvoie l'état complet résultant. */
@Injectable()
export class UpdateNotificationPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly repo: NotificationPreferenceRepository,
  ) {}

  async execute(input: {
    userId: string;
    update: NotificationPreferenceUpdate;
  }): Promise<UserPreferences> {
    return this.repo.upsert(input.userId, input.update);
  }
}
