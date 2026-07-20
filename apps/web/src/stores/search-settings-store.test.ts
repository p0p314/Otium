import { beforeEach, describe, expect, it } from "vitest";
import { searchTypeFilter, useSearchSettingsStore } from "./search-settings-store";

const ALL = { MOVIE: true, SERIES: true, BOOK: true };

describe("search settings store", () => {
  beforeEach(() => useSearchSettingsStore.setState({ enabled: ALL }));

  it("bascule un type sans toucher aux autres", () => {
    useSearchSettingsStore.getState().toggle("MOVIE");
    expect(useSearchSettingsStore.getState().enabled).toEqual({
      MOVIE: false,
      SERIES: true,
      BOOK: true,
    });
  });

  it("refuse de désactiver le dernier type actif", () => {
    useSearchSettingsStore.getState().toggle("MOVIE");
    useSearchSettingsStore.getState().toggle("BOOK");
    useSearchSettingsStore.getState().toggle("SERIES"); // tenterait de tout désactiver
    expect(useSearchSettingsStore.getState().enabled.SERIES).toBe(true);
  });

  it("searchTypeFilter : undefined si tout est actif, sinon la sélection", () => {
    expect(searchTypeFilter(ALL)).toBeUndefined();
    expect(searchTypeFilter({ MOVIE: true, SERIES: false, BOOK: true })).toEqual([
      "MOVIE",
      "BOOK",
    ]);
    expect(searchTypeFilter({ MOVIE: false, SERIES: false, BOOK: true })).toEqual(["BOOK"]);
  });
});
