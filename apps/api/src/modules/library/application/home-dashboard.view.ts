import type { HomeDashboard, HomeSeries } from "@otium/types";
import {
  airedCount,
  hasRecentSeasonPremiere,
  hasUnwatchedReleased,
  nextUnwatchedReleased,
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
  const next = nextUnwatchedReleased(record.seasons, record.watchedIds, now);
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
 *   avec un épisode **diffusé (date connue et passée)** non vu — **ou** série « à voir »/« en
 *   cours » dont la saison en cours vient de démarrer (premier épisode sorti il y a
 *   < {@link RECENT_ACTIVITY_DAYS} j), même sans aucun épisode vu de cette saison. Une série
 *   à jour sur tous ses épisodes diffusés n'y figure **pas** (un épisode simplement annoncé,
 *   sans date de diffusion, ne compte pas comme « à voir ») ;
 * - **à reprendre** : série commencée puis laissée de côté (dernier visionnage entre
 *   {@link RECENT_ACTIVITY_DAYS} et {@link STALE_ACTIVITY_DAYS} jours) avec un épisode à voir ;
 * - **à commencer** : série jamais commencée ayant un épisode déjà sorti.
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
  const toStart: HomeSeries[] = [];

  for (const record of records) {
    // Abandonnées et mises en pause (manuellement ou après 3 mois d'inactivité) : hors accueil.
    if (record.status === "DROPPED" || record.status === "PAUSED") continue;
    const started = record.watchedIds.size > 0;

    // Nouvelle saison fraîchement lancée (premier épisode sorti il y a < RECENT_ACTIVITY_DAYS)
    // d'une série « à voir » ou « en cours » : on la remonte dans « À voir », même si aucun
    // épisode de cette saison n'a encore été vu.
    if (
      (record.status === "PLANNED" || record.status === "IN_PROGRESS") &&
      hasUnwatchedReleased(record.seasons, record.watchedIds, now) &&
      hasRecentSeasonPremiere(record.seasons, now, RECENT_ACTIVITY_DAYS)
    ) {
      toWatch.push(toHomeSeries(record, now));
      continue;
    }

    if (started) {
      // À jour sur les épisodes diffusés → la série relève de « À venir », pas de l'accueil.
      // (Un épisode sans date de diffusion connue ne compte pas comme « à voir ».)
      if (!hasUnwatchedReleased(record.seasons, record.watchedIds, now)) continue;
      const days = daysSinceLastWatch(record, now);
      if (days < RECENT_ACTIVITY_DAYS) toWatch.push(toHomeSeries(record, now));
      else if (days < STALE_ACTIVITY_DAYS) toResume.push(toHomeSeries(record, now));
      // ≥ STALE_ACTIVITY_DAYS : masquée de l'accueil.
    } else if (airedCount(record.seasons, now) > 0) {
      // Jamais commencée mais disponible → à commencer.
      toStart.push(toHomeSeries(record, now));
    }
  }

  // À voir / à reprendre : reprise la plus récente d'abord. À commencer : ordre alphabétique.
  toWatch.sort((a, b) => time(b.lastWatchedAt) - time(a.lastWatchedAt));
  toResume.sort((a, b) => time(b.lastWatchedAt) - time(a.lastWatchedAt));
  toStart.sort((a, b) => a.title.localeCompare(b.title, "fr"));

  return { series: { toWatch, toResume, toStart } };
}

/**
 * Identifiants des séries **en cours** inactives depuis au moins {@link STALE_ACTIVITY_DAYS}
 * jours, à basculer en « En pause » (`PAUSED`). **Pur** : la persistance du changement de
 * statut est faite par le use case appelant (effet de bord hors du calcul de la vue).
 */
export function staleInProgressItemIds(
  records: readonly SeriesProgressRecord[],
  now: Date,
): string[] {
  return records
    .filter(
      (r) =>
        r.status === "IN_PROGRESS" &&
        r.watchedIds.size > 0 &&
        daysSinceLastWatch(r, now) >= STALE_ACTIVITY_DAYS,
    )
    .map((r) => r.itemId);
}
