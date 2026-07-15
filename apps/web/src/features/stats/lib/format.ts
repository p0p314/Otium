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
