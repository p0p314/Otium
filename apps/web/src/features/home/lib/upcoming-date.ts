const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
});

/** Formate une date à venir (ISO), en signalant « Aujourd'hui »/« Demain ». */
export function formatUpcomingDate(iso: string, now: Date): string {
  const target = new Date(iso).setHours(0, 0, 0, 0);
  const days = Math.round((target - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return DATE_FMT.format(new Date(iso));
}
