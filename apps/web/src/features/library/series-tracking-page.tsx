import type { WatchStatus } from "@otium/types";
import { Button, Skeleton } from "@otium/ui";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Play } from "lucide-react";
import { useMarkEpisode, useSeriesTracking } from "./api/use-series-tracking";

const STATUS_LABEL: Record<WatchStatus, string> = {
  PLANNED: "À voir",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  DROPPED: "Abandonnée",
  PAUSED: "En pause",
};

export function SeriesTrackingPage() {
  const { itemId } = useParams({ strict: false }) as { itemId: string };
  const { data, isLoading, isError } = useSeriesTracking(itemId);
  const mark = useMarkEpisode(itemId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-destructive">Impossible de charger le suivi de cette série.</p>;
  }

  const progress =
    data.totalEpisodes > 0 ? Math.round((data.watchedEpisodes / data.totalEpisodes) * 100) : 0;

  return (
    <section className="space-y-8">
      <div>
        <Link
          to="/library"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Ma bibliothèque
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {STATUS_LABEL[data.status]}
          </span>
        </div>

        <div className="mt-4 max-w-md">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>
              {data.watchedEpisodes}/{data.totalEpisodes} épisodes
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {data.nextEpisode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">À reprendre</p>
            <p className="font-medium">
              S{data.nextEpisode.seasonNumber}E{data.nextEpisode.number} · {data.nextEpisode.title}
            </p>
          </div>
          <Button
            disabled={mark.isPending}
            onClick={() =>
              data.nextEpisode &&
              mark.mutate({ episodeId: data.nextEpisode.id, watched: true })
            }
          >
            <Play className="h-4 w-4" /> Marquer vu
          </Button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          🎉 Vous avez terminé cette série.
        </p>
      )}

      <div className="space-y-6">
        {data.seasons.map((season) => (
          <div key={season.number}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Saison {season.number}
            </h2>
            <ul className="divide-y rounded-lg border">
              {season.episodes.map((episode) => (
                <li key={episode.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={episode.watched}
                      disabled={mark.isPending}
                      onChange={(e) =>
                        mark.mutate({ episodeId: episode.id, watched: e.target.checked })
                      }
                    />
                    <span className="w-10 text-sm tabular-nums text-muted-foreground">
                      E{episode.number}
                    </span>
                    <span className="text-sm">{episode.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
