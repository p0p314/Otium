import { describe, expect, it } from "vitest";
import {
  buildCollectionProgress,
  type CollectionVolume,
  lastVolumeRead,
  nextVolumeToRead,
  orderedVolumes,
} from "./collection-progress";
import type { WatchStatus } from "./models/library-item";

function volume(position: number | null, status: WatchStatus | null): CollectionVolume {
  return {
    itemId: status === null ? null : `item-${position}`,
    position,
    title: position === null ? "Hors-série" : `Tome ${position}`,
    status,
  };
}

describe("orderedVolumes", () => {
  it("trie par rang, les hors-séries en dernier", () => {
    const ordered = orderedVolumes([volume(3, null), volume(null, null), volume(1, null)]);
    expect(ordered.map((v) => v.title)).toEqual(["Tome 1", "Tome 3", "Hors-série"]);
  });
});

describe("nextVolumeToRead", () => {
  it("propose le premier tome non lu", () => {
    const next = nextVolumeToRead([
      volume(1, "COMPLETED"),
      volume(2, "COMPLETED"),
      volume(3, "PLANNED"),
    ]);
    expect(next?.title).toBe("Tome 3");
  });

  it("fait primer la reprise sur l'avancement", () => {
    // Le tome 2 est commencé : le proposer avant le 3 évite de perdre le fil.
    const next = nextVolumeToRead([
      volume(1, "COMPLETED"),
      volume(2, "IN_PROGRESS"),
      volume(3, "PLANNED"),
    ]);
    expect(next?.title).toBe("Tome 2");
  });

  it("propose un tome absent de la bibliothèque", () => {
    // Un tome jamais ajouté est la suite naturelle : il doit être proposé quand même.
    const next = nextVolumeToRead([volume(1, "COMPLETED"), volume(2, null)]);
    expect(next?.title).toBe("Tome 2");
  });

  it("ignore les tomes abandonnés plutôt que d'insister", () => {
    const next = nextVolumeToRead([
      volume(1, "COMPLETED"),
      volume(2, "DROPPED"),
      volume(3, "PLANNED"),
    ]);
    expect(next?.title).toBe("Tome 3");
  });

  it("ne propose rien quand tout est lu", () => {
    expect(nextVolumeToRead([volume(1, "COMPLETED"), volume(2, "COMPLETED")])).toBeNull();
  });

  it("ne propose rien quand le reste est abandonné", () => {
    expect(nextVolumeToRead([volume(1, "COMPLETED"), volume(2, "DROPPED")])).toBeNull();
  });

  it("propose un tome en pause (mis de côté, pas refusé)", () => {
    expect(nextVolumeToRead([volume(1, "PAUSED")])?.title).toBe("Tome 1");
  });
});

describe("lastVolumeRead", () => {
  it("retient le rang le plus avancé, pas l'ordre d'ajout", () => {
    const last = lastVolumeRead([
      volume(5, "COMPLETED"),
      volume(2, "COMPLETED"),
      volume(9, "PLANNED"),
    ]);
    expect(last?.title).toBe("Tome 5");
  });

  it("ne retient rien si aucun tome n'est terminé", () => {
    expect(lastVolumeRead([volume(1, "IN_PROGRESS")])).toBeNull();
  });
});

describe("buildCollectionProgress", () => {
  it("synthétise l'avancement sur l'œuvre", () => {
    const progress = buildCollectionProgress([
      volume(1, "COMPLETED"),
      volume(2, "COMPLETED"),
      volume(3, "IN_PROGRESS"),
      volume(4, null),
    ]);

    expect(progress).toMatchObject({
      totalVolumes: 4,
      ownedVolumes: 3,
      readVolumes: 2,
      percent: 50,
    });
    expect(progress.lastRead?.title).toBe("Tome 2");
    expect(progress.nextSuggested?.title).toBe("Tome 3");
  });

  it("rapporte le pourcentage aux volumes connus, sans extrapoler", () => {
    // On ne prétend pas connaître le total réel d'une série en cours de publication.
    expect(buildCollectionProgress([volume(1, "COMPLETED"), volume(2, null)]).percent).toBe(50);
  });

  it("gère une œuvre dont rien n'est lu", () => {
    const progress = buildCollectionProgress([volume(1, null), volume(2, null)]);
    expect(progress).toMatchObject({ readVolumes: 0, ownedVolumes: 0, percent: 0 });
    expect(progress.lastRead).toBeNull();
    expect(progress.nextSuggested?.title).toBe("Tome 1");
  });

  it("gère une œuvre entièrement lue", () => {
    const progress = buildCollectionProgress([volume(1, "COMPLETED"), volume(2, "COMPLETED")]);
    expect(progress.percent).toBe(100);
    expect(progress.nextSuggested).toBeNull();
  });

  it("accepte une œuvre sans volume connu", () => {
    expect(buildCollectionProgress([])).toMatchObject({
      totalVolumes: 0,
      percent: 0,
      lastRead: null,
      nextSuggested: null,
    });
  });
});
