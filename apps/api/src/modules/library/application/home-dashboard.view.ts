import type { HomeDashboard, HomeSeries } from "@otium/types";
import {
  airedCount,
  hasUnwatchedAired,
  nextUnwatchedAired,
  type SeriesProgressRecord,
  totalEpisodes,
} from "../domain";

function toHomeSeries(record: SeriesProgressRecord, now: Date): HomeSeries {
  const next = nextUnwatchedAired(record.seasons, record.watchedIds, now);
  return {
    itemId: record.itemId,
    title: record.title,
    posterUrl: record.posterUrl,
    totalEpisodes: totalEpisodes(record.seasons),
    watchedEpisodes: record.watchedIds.size,
    airedEpisodes: airedCount(record.seasons, now),
    nextEpisode: next ? { ...next, watched: false } : null,
    lastWatchedAt: record.lastWatchedAt?.toISOString() ?? null,
  };
}

/** Ordre sur une date ISO nullable (null = le plus ancien). */
function time(iso: string | null): number {
  return iso ? Date.parse(iso) : 0;
}

/**
 * Assemble le tableau de bord de l'accueil (**pur**, testable sans I/O) à partir de
 * toutes les séries suivies :
 * - **à reprendre** : série commencée (≥1 épisode vu) avec au moins un épisode
 *   **sorti non vu** ;
 * - **à commencer** : série non commencée (0 épisode vu) ayant au moins un épisode
 *   **déjà sorti**.
 * Les séries abandonnées sont exclues ; les médias ne sont jamais mélangés (cloisonnés
 * par type — V1 : séries).
 */
export function buildHomeDashboard(
  records: readonly SeriesProgressRecord[],
  now: Date,
): HomeDashboard {
  const toResume: HomeSeries[] = [];
  const toStart: HomeSeries[] = [];

  for (const record of records) {
    if (record.status === "DROPPED") continue;
    const started = record.watchedIds.size > 0;

    if (started && hasUnwatchedAired(record.seasons, record.watchedIds, now)) {
      toResume.push(toHomeSeries(record, now));
    } else if (!started && airedCount(record.seasons, now) > 0) {
      toStart.push(toHomeSeries(record, now));
    }
  }

  // Reprise : activité la plus récente d'abord. À commencer : ordre alphabétique stable.
  toResume.sort((a, b) => time(b.lastWatchedAt) - time(a.lastWatchedAt));
  toStart.sort((a, b) => a.title.localeCompare(b.title, "fr"));

  return { series: { toResume, toStart } };
}
