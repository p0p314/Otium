import { Inject, Injectable } from "@nestjs/common";
import {
  type PushSubscriptionData,
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from "../domain";

/** Enregistre l'abonnement Push de l'appareil courant (idempotent par endpoint). */
@Injectable()
export class SavePushSubscriptionUseCase {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly repo: PushSubscriptionRepository,
  ) {}

  async execute(input: { userId: string; data: PushSubscriptionData }): Promise<void> {
    await this.repo.save(input.userId, input.data);
  }
}

/** Retire l'abonnement Push d'un appareil de l'utilisateur (désinscription volontaire). */
@Injectable()
export class RemovePushSubscriptionUseCase {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly repo: PushSubscriptionRepository,
  ) {}

  async execute(input: { userId: string; endpoint: string }): Promise<void> {
    await this.repo.removeForUser(input.userId, input.endpoint);
  }
}
