import type { WatchStatus } from "./models/library-item";

/**
 * Unité d'avancement. Volontairement **ouverte à l'extension** : ajouter `CHAPTERS`,
 * `VOLUMES` ou `MINUTES` n'impose que d'étendre `unitTotal` ci-dessous (ADR-0017).
 */
export type ProgressUnit = "PAGES" | "PERCENT";

/** État brut persisté : ce que l'utilisateur a déclaré. */
export interface ProgressState {
  readonly unit: ProgressUnit;
  readonly value: number;
  /** Total connu dans cette unité, ou `null` si inconnu. */
  readonly total: number | null;
}

/** État enrichi des valeurs dérivées — calculées **une seule fois**, côté serveur. */
export interface ProgressView extends ProgressState {
  /** Pourcentage lu (0–100), `null` si le total est inconnu. */
  readonly percent: number | null;
  /** Unités restantes, `null` si le total est inconnu. */
  readonly remaining: number | null;
}

/** Un pourcentage se rapporte toujours à 100 ; les autres unités ont un total réel. */
function effectiveTotal(unit: ProgressUnit, total: number | null): number | null {
  return unit === "PERCENT" ? 100 : total;
}

/**
 * Normalise une saisie : borne la valeur à `[0, total]` et fixe le total implicite d'un
 * pourcentage. Empêche une progression incohérente (page 900 d'un livre de 300 pages).
 */
export function normalizeProgress(input: ProgressState): ProgressState {
  const total = effectiveTotal(input.unit, input.total);
  const value = Math.max(0, total === null ? input.value : Math.min(input.value, total));
  return { unit: input.unit, value, total };
}

/** Calcule les valeurs dérivées (pourcentage, restant) d'un état normalisé. */
export function computeProgress(state: ProgressState): ProgressView {
  const normalized = normalizeProgress(state);
  const total = normalized.total;
  if (total === null || total === 0) {
    return { ...normalized, percent: null, remaining: null };
  }
  return {
    ...normalized,
    percent: Math.round((normalized.value / total) * 100),
    remaining: total - normalized.value,
  };
}

/** Vrai quand la progression atteint la fin du média (total connu et atteint). */
export function isProgressComplete(state: ProgressState): boolean {
  const total = effectiveTotal(state.unit, state.total);
  return total !== null && total > 0 && state.value >= total;
}

/**
 * Statut déduit d'un avancement. Le suivi manuel garde la main : un média mis en pause
 * ou abandonné ne repasse pas « en cours » sur une simple mise à jour de progression —
 * seule l'atteinte de la fin fait foi. Règle métier pure, testée sans I/O.
 */
export function statusFromProgress(current: WatchStatus, state: ProgressState): WatchStatus {
  if (isProgressComplete(state)) return "COMPLETED";
  if (state.value > 0 && (current === "PLANNED" || current === "COMPLETED")) return "IN_PROGRESS";
  return current;
}

/**
 * Dates de consommation déduites d'un changement de statut : première mise en lecture →
 * `startedAt`, achèvement → `finishedAt`. Une date déjà connue n'est jamais réécrite
 * (l'historique de l'utilisateur prime sur la déduction).
 */
export function consumptionDates(
  previous: { startedAt: Date | null; finishedAt: Date | null },
  status: WatchStatus,
  now: Date,
): { startedAt: Date | null; finishedAt: Date | null } {
  const started =
    previous.startedAt ?? (status === "IN_PROGRESS" || status === "COMPLETED" ? now : null);
  const finished = status === "COMPLETED" ? (previous.finishedAt ?? now) : previous.finishedAt;
  return { startedAt: started, finishedAt: finished };
}
