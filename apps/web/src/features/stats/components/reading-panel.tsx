import type { ReadingStats } from "@otium/types";
import { BookOpen, BookmarkCheck, Gauge, PenLine } from "lucide-react";
import { MonthlyPagesChart } from "./monthly-pages-chart";
import { StatTile } from "./stat-tile";

const ICON = "h-4 w-4";

/**
 * Volet lecture des statistiques. N'est rendu que si l'utilisateur suit au moins un
 * livre : un écran rempli de zéros n'apprend rien et alourdit la page.
 */
export function ReadingPanel({ reading }: { reading: ReadingStats }) {
  const topAuthor = reading.topAuthors[0];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Lecture</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Livres lus"
          value={reading.booksCompleted}
          icon={<BookmarkCheck className={ICON} />}
        />
        <StatTile
          label="Pages lues"
          value={reading.pagesRead.toLocaleString("fr-FR")}
          icon={<BookOpen className={ICON} />}
        />
        <StatTile
          label="Rythme"
          value={reading.pagesPerDay != null ? `${reading.pagesPerDay} p./j` : "—"}
          hint="Moyenne depuis votre première lecture suivie"
          icon={<Gauge className={ICON} />}
        />
        <StatTile
          label="Auteur le plus lu"
          value={topAuthor ? topAuthor.name : "—"}
          {...(topAuthor
            ? { hint: `${topAuthor.count} livre${topAuthor.count > 1 ? "s" : ""}` }
            : {})}
          icon={<PenLine className={ICON} />}
        />
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Pages lues sur 12 mois</h3>
        <MonthlyPagesChart data={reading.pagesByMonth} />
      </section>
    </section>
  );
}
