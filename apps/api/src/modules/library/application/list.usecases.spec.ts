import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventPublisher } from "../../../shared/domain";
import type { CustomListDetail, ListRepository, MediaDescriptor } from "../domain";
import {
  AddMediaToListUseCase,
  CreateListUseCase,
  DeleteListUseCase,
  GetListUseCase,
  RemoveMediaFromListUseCase,
} from "./list.usecases";

const media: MediaDescriptor = {
  externalRef: { provider: "tmdb", externalId: "42" },
  type: "MOVIE",
  title: "Dune",
  year: 2021,
  posterUrl: null,
};

const detail: CustomListDetail = {
  id: "list-1",
  name: "À voir ce week-end",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  items: [{ media, position: 0 }],
};

describe("List use cases", () => {
  let repo: ListRepository;
  let events: EventPublisher;
  const lastEvent = () => vi.mocked(events.publish).mock.calls.at(-1)?.[0] as { name: string };

  beforeEach(() => {
    repo = {
      create: vi.fn().mockResolvedValue({ id: "list-1", name: "L", itemCount: 0, createdAt: new Date() }),
      findByUser: vi.fn().mockResolvedValue([]),
      findDetail: vi.fn().mockResolvedValue(detail),
      rename: vi.fn().mockResolvedValue({ id: "list-1", name: "L2", itemCount: 0, createdAt: new Date() }),
      remove: vi.fn().mockResolvedValue(true),
      addMedia: vi.fn().mockResolvedValue(detail),
      removeMedia: vi.fn().mockResolvedValue(detail),
    };
    events = { publish: vi.fn().mockResolvedValue(undefined), publishAll: vi.fn() };
  });

  it("crée une liste et émet ListCreated", async () => {
    await new CreateListUseCase(repo, events).execute("u1", "Ma liste");
    expect(repo.create).toHaveBeenCalledWith("u1", "Ma liste");
    expect(lastEvent()).toMatchObject({ name: "ListCreated" });
  });

  it("récupère le détail (404 si absent)", async () => {
    vi.mocked(repo.findDetail).mockResolvedValueOnce(null);
    await expect(new GetListUseCase(repo).execute("u1", "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("supprime une liste et émet ListDeleted", async () => {
    await new DeleteListUseCase(repo, events).execute("u1", "list-1");
    expect(lastEvent()).toMatchObject({ name: "ListDeleted" });
  });

  it("refuse de supprimer une liste inexistante (404, pas d'événement)", async () => {
    vi.mocked(repo.remove).mockResolvedValueOnce(false);
    await expect(new DeleteListUseCase(repo, events).execute("u1", "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("ajoute un média et émet ListItemAdded", async () => {
    const result = await new AddMediaToListUseCase(repo, events).execute("u1", "list-1", media);
    expect(repo.addMedia).toHaveBeenCalledWith("u1", "list-1", media);
    expect(result.items).toHaveLength(1);
    expect(lastEvent()).toMatchObject({ name: "ListItemAdded" });
  });

  it("retire un média et émet ListItemRemoved", async () => {
    await new RemoveMediaFromListUseCase(repo, events).execute("u1", "list-1", media.externalRef);
    expect(repo.removeMedia).toHaveBeenCalledWith("u1", "list-1", media.externalRef);
    expect(lastEvent()).toMatchObject({ name: "ListItemRemoved" });
  });

  it("404 en ajoutant à une liste inexistante", async () => {
    vi.mocked(repo.addMedia).mockResolvedValueOnce(null);
    await expect(
      new AddMediaToListUseCase(repo, events).execute("u1", "x", media),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
