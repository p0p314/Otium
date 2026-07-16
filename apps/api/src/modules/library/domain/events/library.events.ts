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
  constructor(userId: string, mediaId: string, isFavorite: boolean) {
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

export class WatchStatusChanged extends DomainEvent {
  readonly name = "WatchStatusChanged";
  constructor(
    userId: string,
    mediaId: string,
    private readonly status: string,
  ) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return { status: this.status };
  }
}

export class MovieCompleted extends DomainEvent {
  readonly name = "MovieCompleted";
  constructor(userId: string, mediaId: string) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return {};
  }
}

export class MediaRated extends DomainEvent {
  readonly name = "MediaRated";
  constructor(
    userId: string,
    mediaId: string,
    private readonly rating: number | null,
  ) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return { rating: this.rating };
  }
}

export class ReviewSaved extends DomainEvent {
  readonly name = "CommentCreated";
  constructor(userId: string, mediaId: string) {
    super(userId, mediaId);
  }
  payload(): Record<string, unknown> {
    return {};
  }
}

export class ListCreated extends DomainEvent {
  readonly name = "ListCreated";
  constructor(
    userId: string,
    private readonly listId: string,
  ) {
    super(userId);
  }
  payload(): Record<string, unknown> {
    return { listId: this.listId };
  }
}

export class ListDeleted extends DomainEvent {
  readonly name = "ListDeleted";
  constructor(
    userId: string,
    private readonly listId: string,
  ) {
    super(userId);
  }
  payload(): Record<string, unknown> {
    return { listId: this.listId };
  }
}

export class ListItemAdded extends DomainEvent {
  readonly name = "ListItemAdded";
  constructor(
    userId: string,
    private readonly listId: string,
    private readonly externalId: string,
  ) {
    super(userId);
  }
  payload(): Record<string, unknown> {
    return { listId: this.listId, externalId: this.externalId };
  }
}

export class ListItemRemoved extends DomainEvent {
  readonly name = "ListItemRemoved";
  constructor(
    userId: string,
    private readonly listId: string,
    private readonly externalId: string,
  ) {
    super(userId);
  }
  payload(): Record<string, unknown> {
    return { listId: this.listId, externalId: this.externalId };
  }
}
