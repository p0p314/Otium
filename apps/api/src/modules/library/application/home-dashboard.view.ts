import { type HomeDashboard, type HomeSeries, STALE_SERIES_AFTER_DAYS } from "@otium/types";
import { nextUnwatched, type SeriesProgressRecord, totalEpisodes } from "../domain";

const DAY_MS = 24 * 60 * 60 * 1000;

function toHomeSeries(record: SeriesProgressRecord): HomeSeries {
  const next = nextUnwatched(record.seasons, record.watchedIds);
  return {
    itemId: record.itemId,
    title: record.title,
    posterUrl: record.posterUrl,
    totalEpisodes: totalEpisodes(record.seasons),
    watchedEpisodes: record.watchedIds.size,
    nextEpisode: next ? { ...next, watched: false } : null,
    lastWatchedAt: record.lastWatchedAt?.toISOString() ?? null,
  };
}

/** Ordre décroissant/croissant sur une date ISO nullable (null = le plus ancien). */
function time(iso: string | null): number {
  return iso ? Date.parse(iso) : 0;
}

/**
 * Assemble le tableau de bord de l'accueil (**pur**, testable sans I/O) :
 * partitionne les séries en cours entre activité récente (« continuer à regarder »)
 * et inactivité prolongée (« laissées de côté », > {@link STALE_SERIES_AFTER_DAYS} jours).
 */
export function buildHomeDashboard(
  records: readonly SeriesProgressRecord[],
  now: Date,
): HomeDashboard {
  const staleThreshold = now.getTime() - STALE_SERIES_AFTER_DAYS * DAY_MS;
  const continueWatching: HomeSeries[] = [];
  const staleSeries: HomeSeries[] = [];

  for (const record of records) {
    const view = toHomeSeries(record);
    const last = record.lastWatchedAt?.getTime() ?? 0;
    if (last < staleThreshold) staleSeries.push(view);
    else continueWatching.push(view);
  }

  continueWatching.sort((a, b) => time(b.lastWatchedAt) - time(a.lastWatchedAt));
  staleSeries.sort((a, b) => time(a.lastWatchedAt) - time(b.lastWatchedAt));
  return { continueWatching, staleSeries };
}
