import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import type {
  ImportBatch,
  ImportedEpisode,
  ImportedMedia,
  ImportFile,
  ImportSourceParser,
  ImportStatus,
} from "../../domain";

/** Fichiers d'export TV Time reconnus (films en v1, séries + épisodes en v2). */
const MOVIES_FILE = "tracking-prod-records.csv";
const SERIES_FILE = "tracking-prod-records-v2.csv";

type Row = Record<string, string>;

function readCsv(files: readonly ImportFile[], name: string): Row[] {
  const file = files.find((f) => f.name === name);
  if (!file) return [];
  return parse(file.content, {
    columns: true,
    skipEmptyLines: true,
    relaxQuotes: true,
    relaxColumnCount: true,
    bom: true,
  }) as Row[];
}

function parseYear(raw: string | undefined): number | null {
  if (!raw || raw.length < 4) return null;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  // TV Time encode une date inconnue en `0001-01-01`.
  return Number.isNaN(year) || year <= 1 ? null : year;
}

function parseInt10(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw.trim())) return null;
  return Number.parseInt(raw, 10);
}

/** Durée TV Time exprimée en **secondes** → minutes arrondies (ou `null`). */
function runtimeToMinutes(raw: string | undefined): number | null {
  const seconds = parseInt10(raw);
  return seconds && seconds > 0 ? Math.round(seconds / 60) : null;
}

/** Horodatage TV Time (`created_at`, ex. « 2026-04-12 11:57:09 ») → `Date`, ou null si absent/invalide. */
function parseTimestamp(raw: string | undefined): Date | null {
  if (!raw || raw.trim() === "") return null;
  // Format « YYYY-MM-DD HH:MM:SS » : normaliser en ISO pour un parsing déterministe (UTC).
  const iso = raw.trim().replace(" ", "T") + (raw.includes("Z") ? "" : "Z");
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** Garde la date la plus récente (null = inconnue, dominé par toute date connue). */
function moreRecent(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b;
  if (b === null) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

/**
 * Parseur de l'export RGPD **TV Time**. Deux formats coexistent : les films dans
 * `tracking-prod-records.csv` (v1), les séries et le suivi épisode par épisode dans
 * `tracking-prod-records-v2.csv` (v2). Produit un lot normalisé, agnostique du format.
 */
@Injectable()
export class TvTimeParser implements ImportSourceParser {
  readonly format = "tvtime";

  supports(files: readonly ImportFile[]): boolean {
    const names = new Set(files.map((f) => f.name));
    return names.has(MOVIES_FILE) || names.has(SERIES_FILE);
  }

  parse(files: readonly ImportFile[]): ImportBatch {
    return {
      source: this.format,
      medias: [...this.parseMovies(files), ...this.parseSeries(files)],
    };
  }

  /** Films (v1) : regroupés par titre ; « vu » (watch/rewatch) → COMPLETED, sinon PLANNED. */
  private parseMovies(files: readonly ImportFile[]): ImportedMedia[] {
    const rows = readCsv(files, MOVIES_FILE).filter(
      (r) => r["entity_type"] === "movie" && (r["movie_name"] ?? "").trim() !== "",
    );
    const byTitle = new Map<string, Row[]>();
    for (const row of rows) {
      const title = row["movie_name"]!.trim();
      (byTitle.get(title) ?? byTitle.set(title, []).get(title)!).push(row);
    }

    const medias: ImportedMedia[] = [];
    for (const [title, group] of byTitle) {
      const types = new Set(group.map((r) => r["type"]));
      const watched = types.has("watch") || types.has("rewatch");
      const year = group.map((r) => parseYear(r["release_date"])).find((y) => y != null) ?? null;
      const runtimeMinutes = group
        .map((r) => runtimeToMinutes(r["runtime"]))
        .reduce<number | null>((max, m) => (m != null && (max == null || m > max) ? m : max), null);

      medias.push({
        type: "MOVIE",
        title,
        year,
        status: watched ? "COMPLETED" : "PLANNED",
        runtimeMinutes,
        watchedEpisodes: [],
      });
    }
    return medias;
  }

  /** Séries (v2) : épisodes vus regroupés par titre + statut « à voir » (is_for_later). */
  private parseSeries(files: readonly ImportFile[]): ImportedMedia[] {
    const rows = readCsv(files, SERIES_FILE);
    const episodesByTitle = new Map<string, Map<string, ImportedEpisode>>();
    const forLater = new Set<string>();
    const known = new Set<string>();

    for (const row of rows) {
      const key = row["key"] ?? "";
      const title = (row["series_name"] ?? "").trim();
      if (title === "") continue;

      if (key.startsWith("watch-episode") || key.startsWith("rewatch-episode")) {
        const seasonNumber = parseInt10(row["season_number"]);
        const episodeNumber = parseInt10(row["episode_number"]);
        if (seasonNumber == null || episodeNumber == null) continue;
        const eps = episodesByTitle.get(title) ?? new Map<string, ImportedEpisode>();
        const slot = `${seasonNumber}:${episodeNumber}`;
        // Un épisode vu puis revu : conserver la date de visionnage la plus récente.
        const watchedAt = moreRecent(eps.get(slot)?.watchedAt ?? null, parseTimestamp(row["created_at"]));
        eps.set(slot, { seasonNumber, episodeNumber, watchedAt });
        episodesByTitle.set(title, eps);
        known.add(title);
      } else if (key.startsWith("user-series")) {
        known.add(title);
        if (row["is_for_later"] === "true") forLater.add(title);
      }
    }

    const medias: ImportedMedia[] = [];
    for (const title of known) {
      const watchedEpisodes = [...(episodesByTitle.get(title)?.values() ?? [])].sort(
        (a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
      );
      const status: ImportStatus = forLater.has(title)
        ? "PLANNED"
        : watchedEpisodes.length > 0
          ? "IN_PROGRESS"
          : "PLANNED";
      medias.push({
        type: "SERIES",
        title,
        year: null,
        status,
        runtimeMinutes: null,
        watchedEpisodes,
      });
    }
    return medias;
  }
}
