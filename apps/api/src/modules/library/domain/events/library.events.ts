import { DomainEvent } from "../../../../shared/domain/domain-event";

export class MediaAdded extends DomainEvent {
  readonly name = "MediaAdded";
  constructor(
    userId: string,
    mediaId: string,
    private readonly mediaType: string,
  ) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return { mediaType: this.mediaType };
  }
}

export class MediaRemoved extends DomainEvent {
  readonly name = "MediaRemoved";
  constructor(userId: string, mediaId: string) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return {};
  }
}

export class FavoriteChanged extends DomainEvent {
  readonly name: "FavoriteAdded" | "FavoriteRemoved";
  constructor(
    userId: string,
    mediaId: string,
    isFavorite: boolean,
  ) {
    super(userId, mediaId);
    this.name = isFavorite ? "FavoriteAdded" : "FavoriteRemoved";
  }
  payload(): Record<string, unknown> {
    return {};
  }
}

export class EpisodeWatched extends DomainEvent {
  readonly name = "EpisodeWatched";
  constructor(
    userId: string,
    mediaId: string,
    private readonly episodeId: string,
  ) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return { episodeId: this.episodeId };
  }
}

export class SeriesCompleted extends DomainEvent {
  readonly name = "SeriesCompleted";
  constructor(userId: string, mediaId: string) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return {};
  }
}
