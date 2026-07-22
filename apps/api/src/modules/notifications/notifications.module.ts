import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { DetectDueNotificationsUseCase } from "./application/detect-due-notifications.usecase";
import {
  GetNotificationPreferencesUseCase,
  UpdateNotificationPreferencesUseCase,
} from "./application/notification-preference.usecases";
import { NotificationTriggerService } from "./application/notification-trigger.service";
import {
  RemovePushSubscriptionUseCase,
  SavePushSubscriptionUseCase,
} from "./application/push-subscription.usecases";
import {
  NOTIFICATION_CANDIDATE_REPOSITORY,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  SENT_NOTIFICATION_STORE,
} from "./domain";
import { PrismaNotificationCandidateRepository } from "./infrastructure/prisma-notification-candidate.repository";
import { PrismaNotificationPreferenceRepository } from "./infrastructure/prisma-notification-preference.repository";
import { PrismaPushSubscriptionRepository } from "./infrastructure/prisma-push-subscription.repository";
import { PrismaSentNotificationStore } from "./infrastructure/prisma-sent-notification.store";
import { WebPushSender } from "./infrastructure/web-push.sender";
import { NotificationsController } from "./presentation/notifications.controller";
import { NotificationsCronController } from "./presentation/notifications-cron.controller";

/**
 * Module des notifications Push (PWA — ADR-0020). Découpé en 4 couches (domaine sans I/O,
 * application, infrastructure Prisma + Web Push, présentation). `DueJobRunner` (global) et
 * `PrismaService` (global) sont fournis par les modules partagés ; `AuthenticationModule`
 * apporte l'`AuthGuard`.
 */
@Module({
  imports: [AuthenticationModule],
  controllers: [NotificationsController, NotificationsCronController],
  providers: [
    DetectDueNotificationsUseCase,
    NotificationTriggerService,
    SavePushSubscriptionUseCase,
    RemovePushSubscriptionUseCase,
    GetNotificationPreferencesUseCase,
    UpdateNotificationPreferencesUseCase,
    { provide: PUSH_SUBSCRIPTION_REPOSITORY, useClass: PrismaPushSubscriptionRepository },
    { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useClass: PrismaNotificationPreferenceRepository },
    { provide: SENT_NOTIFICATION_STORE, useClass: PrismaSentNotificationStore },
    { provide: NOTIFICATION_CANDIDATE_REPOSITORY, useClass: PrismaNotificationCandidateRepository },
    { provide: PUSH_SENDER, useClass: WebPushSender },
  ],
})
export class NotificationsModule {}
