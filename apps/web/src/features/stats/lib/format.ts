/** Formate une durée en minutes → « 2 h 35 », « 3 h », « 45 min ». */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes.toString().padStart(2, "0")}`;
}

/** Durée arrondie en heures (pour les grands totaux). */
export function formatHours(total: number): string {
  return `${Math.round(total / 60).toLocaleString("fr-FR")} h`;
}

const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const HOURS_PER_MONTH = HOURS_PER_DAY * DAYS_PER_MONTH;

/**
 * Décompose une durée (minutes) en mois / jours / heures — « 2 mois 9 j 10 h ».
 * Mois = 30 jours (convention). Idéal pour les grands cumuls de visionnage.
 */
export function formatLongDuration(total: number): string {
  const totalHours = Math.floor(total / 60);
  const months = Math.floor(totalHours / HOURS_PER_MONTH);
  const days = Math.floor((totalHours % HOURS_PER_MONTH) / HOURS_PER_DAY);
  const hours = totalHours % HOURS_PER_DAY;
  const parts: string[] = [];
  if (months) parts.push(`${months} mois`);
  if (days) parts.push(`${days} j`);
  if (hours || parts.length === 0) parts.push(`${hours} h`);
  return parts.join(" ");
}

function monthDate(monthKey: string): Date {
  const parts = monthKey.split("-");
  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1));
}

/** Clé de mois `YYYY-MM` → libellé court « juil. 26 ». */
export function monthShort(monthKey: string): string {
  return monthDate(monthKey).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/** Clé de mois `YYYY-MM` → libellé long « juillet 2026 ». */
export function monthLong(monthKey: string): string {
  return monthDate(monthKey).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
