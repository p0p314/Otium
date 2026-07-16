import type { HomeDashboard, HomeSeries } from "@otium/types";
import {
  airedCount,
  hasUnwatchedAired,
  nextUnwatchedAired,
  type SeriesProgressRecord,
  totalEpisodes,
} from "../domain";

/** Une série vue il y a moins de ce délai est « active » (→ à voir). En jours. */
export const RECENT_ACTIVITY_DAYS = 30;

/**
 * Au-delà de ce délai sans visionnage, une série commencée est masquée de l'accueil
 * (reste en bibliothèque). Entre {@link RECENT_ACTIVITY_DAYS} et ce seuil : à reprendre.
 */
export const STALE_ACTIVITY_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Ancienneté du dernier visionnage en jours (null = jamais → +∞). */
function daysSinceLastWatch(record: SeriesProgressRecord, now: Date): number {
  if (record.lastWatchedAt === null) return Number.POSITIVE_INFINITY;
  return (now.getTime() - record.lastWatchedAt.getTime()) / DAY_MS;
}

/** Ordre sur une date ISO nullable (null = le plus ancien). */
function time(iso: string | null): number {
  return iso ? Date.parse(iso) : 0;
}

/**
 * Assemble le tableau de bord de l'accueil (**pur**, testable sans I/O) à partir de
 * toutes les séries suivies, selon l'ancienneté du **dernier visionnage** :
 * - **à voir** : série commencée et **active** (vue il y a < {@link RECENT_ACTIVITY_DAYS} j)
 *   avec un épisode sorti non vu, **ou** série jamais commencée ayant un épisode déjà sorti ;
 * - **à reprendre** : série commencée puis laissée de côté (dernier visionnage entre
 *   {@link RECENT_ACTIVITY_DAYS} et {@link STALE_ACTIVITY_DAYS} jours) avec un épisode à voir.
 * Les séries commencées sans visionnage depuis {@link STALE_ACTIVITY_DAYS} jours sont
 * **masquées** de l'accueil ; les abandonnées (`DROPPED`) et terminées sont exclues. Les
 * médias ne sont jamais mélangés (cloisonnés par type — V1 : séries).
 */
export function buildHomeDashboard(
  records: readonly SeriesProgressRecord[],
  now: Date,
): HomeDashboard {
  const toWatch: HomeSeries[] = [];
  const toResume: HomeSeries[] = [];

  for (const record of records) {
    if (record.status === "DROPPED") continue;
    const started = record.watchedIds.size > 0;

    if (started) {
      // Rien de sorti à voir → la série relève de « À venir », pas de l'accueil.
      if (!hasUnwatchedAired(record.seasons, record.watchedIds, now)) continue;
      const days = daysSinceLastWatch(record, now);
      if (days < RECENT_ACTIVITY_DAYS) toWatch.push(toHomeSeries(record, now));
      else if (days < STALE_ACTIVITY_DAYS) toResume.push(toHomeSeries(record, now));
      // ≥ STALE_ACTIVITY_DAYS : masquée de l'accueil.
    } else if (airedCount(record.seasons, now) > 0) {
      // Jamais commencée mais disponible → à voir (à commencer).
      toWatch.push(toHomeSeries(record, now));
    }
  }

  // À voir : activité la plus récente d'abord ; les jamais-commencées (sans date) suivent,
  // départagées par titre. À reprendre : reprise la plus récente d'abord.
  toWatch.sort(
    (a, b) => time(b.lastWatchedAt) - time(a.lastWatchedAt) || a.title.localeCompare(b.title, "fr"),
  );
  toResume.sort((a, b) => time(b.lastWatchedAt) - time(a.lastWatchedAt));

  return { series: { toWatch, toResume } };
}
