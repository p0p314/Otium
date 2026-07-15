import { randomUUID } from "node:crypto";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import {
  LIST_REPOSITORY,
  type CustomList,
  type CustomListDetail,
  type ListRepository,
  type MediaDescriptor,
} from "../src/modules/library/domain";
import {
  AddMediaToListUseCase,
  CreateListUseCase,
  DeleteListUseCase,
  GetListUseCase,
  GetListsUseCase,
  RemoveMediaFromListUseCase,
  RenameListUseCase,
} from "../src/modules/library/application/list.usecases";
import { ListController } from "../src/modules/library/presentation/list.controller";

class InMemoryListRepository implements ListRepository {
  private readonly lists = new Map<string, { userId: string; name: string; createdAt: Date }>();
  private readonly items = new Map<string, MediaDescriptor[]>();

  async create(userId: string, name: string): Promise<CustomList> {
    const id = randomUUID();
    this.lists.set(id, { userId, name, createdAt: new Date() });
    this.items.set(id, []);
    return { id, name, itemCount: 0, createdAt: this.lists.get(id)!.createdAt };
  }
  async findByUser(userId: string): Promise<CustomList[]> {
    return [...this.lists.entries()]
      .filter(([, l]) => l.userId === userId)
      .map(([id, l]) => ({
        id,
        name: l.name,
        itemCount: this.items.get(id)?.length ?? 0,
        createdAt: l.createdAt,
      }));
  }
  private detail(userId: string, listId: string): CustomListDetail | null {
    const list = this.lists.get(listId);
    if (!list || list.userId !== userId) return null;
    return {
      id: listId,
      name: list.name,
      createdAt: list.createdAt,
      items: (this.items.get(listId) ?? []).map((media, position) => ({ media, position })),
    };
  }
  async findDetail(userId: string, listId: string): Promise<CustomListDetail | null> {
    return this.detail(userId, listId);
  }
  async rename(userId: string, listId: string, name: string): Promise<CustomList | null> {
    const list = this.lists.get(listId);
    if (!list || list.userId !== userId) return null;
    list.name = name;
    return { id: listId, name, itemCount: this.items.get(listId)?.length ?? 0, createdAt: list.createdAt };
  }
  async remove(userId: string, listId: string): Promise<boolean> {
    const list = this.lists.get(listId);
    if (!list || list.userId !== userId) return false;
    this.lists.delete(listId);
    this.items.delete(listId);
    return true;
  }
  async addMedia(
    userId: string,
    listId: string,
    media: MediaDescriptor,
  ): Promise<CustomListDetail | null> {
    const list = this.lists.get(listId);
    if (!list || list.userId !== userId) return null;
    const items = this.items.get(listId)!;
    if (!items.some((m) => m.externalRef.externalId === media.externalRef.externalId)) {
      items.push(media);
    }
    return this.detail(userId, listId);
  }
  async removeMedia(
    userId: string,
    listId: string,
    externalRef: { provider: string; externalId: string },
  ): Promise<CustomListDetail | null> {
    const list = this.lists.get(listId);
    if (!list || list.userId !== userId) return null;
    this.items.set(
      listId,
      (this.items.get(listId) ?? []).filter(
        (m) => m.externalRef.externalId !== externalRef.externalId,
      ),
    );
    return this.detail(userId, listId);
  }
}

const TOKEN = "tok";
const USER_ID = "user-1";
const media = {
  externalRef: { provider: "tmdb", externalId: "438631" },
  type: "MOVIE" as const,
  title: "Dune",
  year: 2021,
  posterUrl: null,
  genres: [],
};

describe("Lists (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("alice@example.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [ListController],
      providers: [
        CreateListUseCase,
        GetListsUseCase,
        GetListUseCase,
        RenameListUseCase,
        DeleteListUseCase,
        AddMediaToListUseCase,
        RemoveMediaFromListUseCase,
        AuthGuard,
        { provide: LIST_REPOSITORY, useClass: InMemoryListRepository },
        { provide: EVENT_PUBLISHER, useValue: { publish: async () => undefined, publishAll: async () => undefined } },
        {
          provide: SESSION_STORE,
          useValue: { resolve: async (t: string) => (t === TOKEN ? USER_ID : null) },
        },
        {
          provide: USER_REPOSITORY,
          useValue: { findById: async (id: string) => (id === USER_ID ? user : null) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = (r: request.Test) => r.set("authorization", `Bearer ${TOKEN}`);

  it("refuse l'accès sans jeton (401)", async () => {
    expect((await request(server()).get("/lists")).status).toBe(401);
  });

  it("crée une liste, y ajoute et retire un média", async () => {
    const created = await auth(request(server()).post("/lists")).send({ name: "Week-end" });
    expect(created.status).toBe(201);
    const listId = created.body.id as string;

    const added = await auth(request(server()).post(`/lists/${listId}/items`)).send({ media });
    expect(added.status).toBe(201);
    expect(added.body.items).toHaveLength(1);
    expect(added.body.items[0].media.title).toBe("Dune");

    const removed = await auth(
      request(server()).delete(`/lists/${listId}/items/tmdb/438631`),
    );
    expect(removed.status).toBe(200);
    expect(removed.body.items).toHaveLength(0);
  });

  it("renomme puis supprime une liste", async () => {
    const created = await auth(request(server()).post("/lists")).send({ name: "Temp" });
    const listId = created.body.id as string;

    const renamed = await auth(request(server()).patch(`/lists/${listId}`)).send({ name: "Renommée" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Renommée");

    expect((await auth(request(server()).delete(`/lists/${listId}`))).status).toBe(204);
    expect((await auth(request(server()).get(`/lists/${listId}`))).status).toBe(404);
  });

  it("refuse un nom de liste vide (400)", async () => {
    const res = await auth(request(server()).post("/lists")).send({ name: "   " });
    expect(res.status).toBe(400);
  });
});
