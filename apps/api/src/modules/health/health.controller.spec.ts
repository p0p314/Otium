import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: async () => [{ ok: 1 }] } },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it("liveness renvoie ok", () => {
    expect(controller.live().status).toBe("ok");
  });

  it("readiness renvoie ready quand la base répond", async () => {
    const result = await controller.ready();
    expect(result.status).toBe("ready");
    expect(result.checks).toEqual({ database: true });
  });
});
