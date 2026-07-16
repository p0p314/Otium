import { beforeEach, describe, expect, it } from "vitest";
import { searchTypeFilter, useSearchSettingsStore } from "./search-settings-store";

describe("search settings store", () => {
  beforeEach(() => useSearchSettingsStore.setState({ movies: true, series: true }));

  it("bascule un type", () => {
    useSearchSettingsStore.getState().toggle("MOVIE");
    expect(useSearchSettingsStore.getState().movies).toBe(false);
    expect(useSearchSettingsStore.getState().series).toBe(true);
  });

  it("refuse de désactiver le dernier type actif", () => {
    useSearchSettingsStore.getState().toggle("MOVIE"); // séries seules
    useSearchSettingsStore.getState().toggle("SERIES"); // tenterait de tout désactiver → ignoré
    expect(useSearchSettingsStore.getState().series).toBe(true);
  });

  it("searchTypeFilter: undefined si les deux, sinon le type actif", () => {
    expect(searchTypeFilter({ movies: true, series: true })).toBeUndefined();
    expect(searchTypeFilter({ movies: true, series: false })).toBe("MOVIE");
    expect(searchTypeFilter({ movies: false, series: true })).toBe("SERIES");
  });
});
