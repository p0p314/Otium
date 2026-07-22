import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import {
  type NotificationPreferences,
  PushSubscriptionInput,
  RemovePushSubscriptionInput,
  UpdateNotificationPreferencesInput,
  type VapidPublicKey,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import {
  GetNotificationPreferencesUseCase,
  UpdateNotificationPreferencesUseCase,
} from "../application/notification-preference.usecases";
import { NotificationTriggerService } from "../application/notification-trigger.service";
import {
  RemovePushSubscriptionUseCase,
  SavePushSubscriptionUseCase,
} from "../application/push-subscription.usecases";
import { PUSH_SENDER, type PushSender } from "../domain";
import { toPreferencesDto, toSubscriptionData } from "./notification.mapper";

/**
 * API des notifications Push (ADR-0020). Toutes les routes sont **protégées** : un
 * utilisateur ne peut gérer que ses propres abonnements et préférences (le `userId` vient
 * du guard, jamais du corps). Les lectures de démarrage (préférences, abonnement)
 * déclenchent en tâche de fond la détection due — sans en subir la latence.
 */
@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
    private readonly saveSubscription: SavePushSubscriptionUseCase,
    private readonly removeSubscription: RemovePushSubscriptionUseCase,
    private readonly getPreferences: GetNotificationPreferencesUseCase,
    private readonly updatePreferences: UpdateNotificationPreferencesUseCase,
    private readonly trigger: NotificationTriggerService,
  ) {}

  /** Clé publique VAPID nécessaire à l'inscription du navigateur (503 si non configurée). */
  @Get("vapid-public-key")
  vapidPublicKey(): VapidPublicKey {
    const key = this.sender.publicKey();
    if (!key) {
      throw new ServiceUnavailableException("Notifications Push non configurées sur le serveur.");
    }
    return { publicKey: key };
  }

  /** Enregistre (ou met à jour) l'abonnement Push de l'appareil courant. */
  @Post("subscriptions")
  @HttpCode(204)
  async subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(PushSubscriptionInput)) input: PushSubscriptionInput,
  ): Promise<void> {
    await this.saveSubscription.execute({ userId: user.id, data: toSubscriptionData(input) });
    this.fireDetection();
  }

  /** Retire l'abonnement Push d'un appareil (désinscription / permission révoquée). */
  @Delete("subscriptions")
  @HttpCode(204)
  async unsubscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(RemovePushSubscriptionInput)) input: RemovePushSubscriptionInput,
  ): Promise<void> {
    await this.removeSubscription.execute({ userId: user.id, endpoint: input.endpoint });
  }

  /** Préférences de notification (valeurs par défaut si jamais définies). */
  @Get("preferences")
  async preferences(@CurrentUser() user: AuthenticatedUser): Promise<NotificationPreferences> {
    const prefs = await this.getPreferences.execute(user.id);
    this.fireDetection();
    return toPreferencesDto(prefs);
  }

  /** Met à jour partiellement les préférences et renvoie l'état complet. */
  @Patch("preferences")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateNotificationPreferencesInput))
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const prefs = await this.updatePreferences.execute({ userId: user.id, update: input });
    return toPreferencesDto(prefs);
  }

  /** Déclenchement opportuniste (non bloquant, jamais fatal) de la détection due. */
  private fireDetection(): void {
    void this.trigger.triggerIfDue().catch(() => undefined);
  }
}
