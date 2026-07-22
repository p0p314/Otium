import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EpisodeCandidate,
  MovieCandidate,
  NotificationCandidateRepository,
  NotificationClaim,
  NotificationPreferenceRepository,
  PushSender,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
  SentNotificationStore,
} from "../domain";
import { DetectDueNotificationsUseCase } from "./detect-due-notifications.usecase";

const airedEpisode: EpisodeCandidate = {
  userId: "u1",
  mediaId: "m1",
  provider: "tmdb",
  externalId: "1399",
  seriesTitle: "One Piece",
  posterUrl: null,
  episodeId: "ep1",
  seasonNumber: 1,
  episodeNumber: 5,
  episodeTitle: "Épisode",
  airDate: new Date("2026-07-22T00:00:00Z"),
};

function device(overrides: Partial<PushSubscriptionRecord> = {}): PushSubscriptionRecord {
  return { id: "s1", userId: "u1", endpoint: "https://push/1", p256dh: "p", auth: "a", ...overrides };
}

describe("DetectDueNotificationsUseCase", () => {
  let candidates: NotificationCandidateRepository;
  let preferences: NotificationPreferenceRepository;
  let sent: SentNotificationStore;
  let subscriptions: PushSubscriptionRepository;
  let sender: PushSender;

  beforeEach(() => {
    candidates = {
      findRecentlyAiredEpisodes: vi.fn(async () => [airedEpisode]),
      findMoviesInReleaseWindow: vi.fn(async (): Promise<MovieCandidate[]> => []),
    };
    preferences = {
      get: vi.fn(),
      getForUsers: vi.fn(async () => new Map()),
      upsert: vi.fn(),
    };
    // Par défaut, tout ce qui est présenté est réclamé (aucun doublon).
    sent = { claim: vi.fn(async (claims: readonly NotificationClaim[]) => [...claims]) };
    subscriptions = {
      save: vi.fn(),
      removeForUser: vi.fn(),
      removeByEndpoint: vi.fn(async () => undefined),
      findByUserIds: vi.fn(async () => [device()]),
      findByUser: vi.fn(),
    };
    sender = {
      isConfigured: vi.fn(() => true),
      publicKey: vi.fn(() => "pk"),
      send: vi.fn(async () => "sent" as const),
    };
  });

  function build(): DetectDueNotificationsUseCase {
    return new DetectDueNotificationsUseCase(
      candidates,
      preferences,
      sent,
      subscriptions,
      sender,
    );
  }

  it("n'effectue aucun traitement quand le Push n'est pas configuré", async () => {
    sender.isConfigured = vi.fn(() => false);
    const summary = await build().execute();

    expect(summary.sent).toBe(0);
    expect(candidates.findRecentlyAiredEpisodes).not.toHaveBeenCalled();
  });

  it("réclame puis envoie une notification sur l'appareil de l'utilisateur", async () => {
    const summary = await build().execute();

    expect(sent.claim).toHaveBeenCalledWith([
      { userId: "u1", dedupKey: "EPISODE:ep1", type: "episode" },
    ]);
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ detected: 1, claimed: 1, skipped: 0, sent: 1, failed: 0 });
  });

  it("diffuse sur tous les appareils d'un même utilisateur", async () => {
    subscriptions.findByUserIds = vi.fn(async () => [
      device({ id: "s1", endpoint: "https://push/1" }),
      device({ id: "s2", endpoint: "https://push/2" }),
    ]);

    const summary = await build().execute();

    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(summary.sent).toBe(2);
  });

  it("n'envoie pas une notification déjà envoyée (anti-doublon)", async () => {
    // Le registre ne réclame rien : la clé existait déjà.
    sent.claim = vi.fn(async () => []);

    const summary = await build().execute();

    expect(sender.send).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ detected: 1, claimed: 0, skipped: 1, sent: 0 });
  });

  it("ne réclame pas pour un utilisateur sans appareil", async () => {
    subscriptions.findByUserIds = vi.fn(async () => []);

    const summary = await build().execute();

    expect(sent.claim).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ detected: 1, claimed: 0, sent: 0 });
  });

  it("supprime un abonnement expiré (404/410) et le compte", async () => {
    sender.send = vi.fn(async () => "expired" as const);

    const summary = await build().execute();

    expect(subscriptions.removeByEndpoint).toHaveBeenCalledWith("https://push/1");
    expect(summary.prunedSubscriptions).toBe(1);
    expect(summary.sent).toBe(0);
  });

  it("compte les échecs transitoires sans supprimer l'abonnement", async () => {
    sender.send = vi.fn(async () => "failed" as const);

    const summary = await build().execute();

    expect(subscriptions.removeByEndpoint).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });
});
