import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import {
  type CustomList,
  type CustomListDetail,
  ListCreated,
  ListDeleted,
  ListItemAdded,
  ListItemRemoved,
  LIST_REPOSITORY,
  type ListRepository,
  type MediaDescriptor,
} from "../domain";

const NOT_FOUND = "Liste introuvable.";

@Injectable()
export class CreateListUseCase {
  constructor(
    @Inject(LIST_REPOSITORY) private readonly lists: ListRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(userId: string, name: string): Promise<CustomList> {
    const list = await this.lists.create(userId, name);
    await this.events.publish(new ListCreated(userId, list.id));
    return list;
  }
}

@Injectable()
export class GetListsUseCase {
  constructor(@Inject(LIST_REPOSITORY) private readonly lists: ListRepository) {}

  execute(userId: string): Promise<CustomList[]> {
    return this.lists.findByUser(userId);
  }
}

@Injectable()
export class GetListUseCase {
  constructor(@Inject(LIST_REPOSITORY) private readonly lists: ListRepository) {}

  async execute(userId: string, listId: string): Promise<CustomListDetail> {
    const detail = await this.lists.findDetail(userId, listId);
    if (!detail) throw new NotFoundException(NOT_FOUND);
    return detail;
  }
}

@Injectable()
export class RenameListUseCase {
  constructor(@Inject(LIST_REPOSITORY) private readonly lists: ListRepository) {}

  async execute(userId: string, listId: string, name: string): Promise<CustomList> {
    const list = await this.lists.rename(userId, listId, name);
    if (!list) throw new NotFoundException(NOT_FOUND);
    return list;
  }
}

@Injectable()
export class DeleteListUseCase {
  constructor(
    @Inject(LIST_REPOSITORY) private readonly lists: ListRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(userId: string, listId: string): Promise<void> {
    const removed = await this.lists.remove(userId, listId);
    if (!removed) throw new NotFoundException(NOT_FOUND);
    await this.events.publish(new ListDeleted(userId, listId));
  }
}

@Injectable()
export class AddMediaToListUseCase {
  constructor(
    @Inject(LIST_REPOSITORY) private readonly lists: ListRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(userId: string, listId: string, media: MediaDescriptor): Promise<CustomListDetail> {
    const detail = await this.lists.addMedia(userId, listId, media);
    if (!detail) throw new NotFoundException(NOT_FOUND);
    await this.events.publish(new ListItemAdded(userId, listId, media.externalRef.externalId));
    return detail;
  }
}

@Injectable()
export class RemoveMediaFromListUseCase {
  constructor(
    @Inject(LIST_REPOSITORY) private readonly lists: ListRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(
    userId: string,
    listId: string,
    externalRef: { provider: string; externalId: string },
  ): Promise<CustomListDetail> {
    const detail = await this.lists.removeMedia(userId, listId, externalRef);
    if (!detail) throw new NotFoundException(NOT_FOUND);
    await this.events.publish(new ListItemRemoved(userId, listId, externalRef.externalId));
    return detail;
  }
}
