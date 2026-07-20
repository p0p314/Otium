import type { HomeSeries } from "@otium/types";
import { MediaCover } from "../../../components/media-cover";
import { Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { memo } from "react";

/** Carte d'une série mise en avant sur l'accueil : affiche, progression et reprise. */
function HomeSeriesCardBase({ series }: { series: HomeSeries }) {
  const progress =
    series.totalEpisodes > 0
      ? Math.round((series.watchedEpisodes / series.totalEpisodes) * 100)
      : 0;

  return (
    <Link
      to="/library/$itemId"
      params={{ itemId: series.itemId }}
      className="group flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
    >
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        <MediaCover src={series.posterUrl} alt={`Affiche de ${series.title}`} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium group-hover:text-primary">{series.title}</p>
          {series.nextEpisode ? (
            <p className="mt-1 line-clamp-1 flex items-center gap-1 text-sm text-muted-foreground">
              <PlayCircle className="h-4 w-4 shrink-0" />S{series.nextEpisode.seasonNumber}E
              {series.nextEpisode.number} · {series.nextEpisode.title}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Série terminée 🎉</p>
          )}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>
              {series.watchedEpisodes}/{series.totalEpisodes} épisodes
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Mémoïsé : la liste ne se re-rend pas au changement d'onglet tant que les séries sont identiques.
export const HomeSeriesCard = memo(HomeSeriesCardBase);
