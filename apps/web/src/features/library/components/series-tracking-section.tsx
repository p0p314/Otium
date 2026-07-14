import { Button, Skeleton } from "@otium/ui";
import { Play } from "lucide-react";
import { useMarkEpisode, useSeriesTracking } from "../api/use-series-tracking";

/** Section de suivi épisode par épisode d'une série (progression, reprise, cases à cocher). */
export function SeriesTrackingSection({ itemId }: { itemId: string }) {
  const { data, isLoading, isError } = useSeriesTracking(itemId);
  const mark = useMarkEpisode(itemId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">Impossible de charger le suivi des épisodes.</p>;
  }

  const progress =
    data.totalEpisodes > 0 ? Math.round((data.watchedEpisodes / data.totalEpisodes) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="max-w-md">
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
              data.nextEpisode && mark.mutate({ episodeId: data.nextEpisode.id, watched: true })
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
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Saison {season.number}
            </h3>
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
    </div>
  );
}
