import type { UpcomingEpisode } from "@otium/types";
import { MediaCover } from "../../../components/media-cover";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { formatUpcomingDate } from "../lib/upcoming-date";

/** Liste des épisodes à venir, triés par date (rendu mobile-first : lignes tactiles). */
export function UpcomingList({ episodes }: { episodes: UpcomingEpisode[] }) {
  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <CalendarClock className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Rien à l'horizon</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Les prochains épisodes de vos séries suivies apparaîtront ici dès qu'une date est connue.
        </p>
      </div>
    );
  }

  const now = new Date();
  return (
    <ul className="space-y-2">
      {episodes.map((ep) => (
        <li key={`${ep.itemId}-${ep.seasonNumber}-${ep.number}`}>
          <Link
            to="/library/$itemId"
            params={{ itemId: ep.itemId }}
            className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
          >
            <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
              <MediaCover src={ep.posterUrl} alt={`Affiche de ${ep.seriesTitle}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 font-medium group-hover:text-primary">{ep.seriesTitle}</p>
              <p className="line-clamp-1 text-sm text-muted-foreground">
                S{ep.seasonNumber}E{ep.number} · {ep.title}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
              {formatUpcomingDate(ep.airDate, now)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
