import type { UpcomingMovie } from "@otium/types";
import { MediaCover } from "../../../components/media-cover";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { formatUpcomingDate } from "../lib/upcoming-date";

/** Liste des films à venir (sorties), triés par date. Rendu mobile-first. */
export function UpcomingMovieList({ movies }: { movies: UpcomingMovie[] }) {
  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <CalendarClock className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Aucune sortie à l'horizon</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Ajoutez un film pas encore sorti : sa date de sortie apparaîtra ici.
        </p>
      </div>
    );
  }

  const now = new Date();
  return (
    <ul className="space-y-2">
      {movies.map((movie) => (
        <li key={movie.itemId}>
          <Link
            to="/library/$itemId"
            params={{ itemId: movie.itemId }}
            className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
          >
            <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
              <MediaCover src={movie.posterUrl} alt={`Affiche de ${movie.title}`} />
            </div>
            <p className="min-w-0 flex-1 line-clamp-2 font-medium group-hover:text-primary">
              {movie.title}
            </p>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
              {formatUpcomingDate(movie.releaseDate, now)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
