import { Button, Skeleton } from "@otium/ui";
import { CheckCheck, ListChecks, Play, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useMarkEpisode, useMarkEpisodes, useSeriesTracking } from "../api/use-series-tracking";

/** Une proposition de rattrapage : marquer les épisodes précédents non vus. */
interface CatchUp {
  readonly episodeIds: string[];
}

/** Section de suivi épisode par épisode d'une série (progression, reprise, marquage en masse). */
export function SeriesTrackingSection({ itemId }: { itemId: string }) {
  const { data, isLoading, isError } = useSeriesTracking(itemId);
  const markEpisode = useMarkEpisode(itemId);
  const markEpisodes = useMarkEpisodes(itemId);
  const busy = markEpisode.isPending || markEpisodes.isPending;
  const [catchUp, setCatchUp] = useState<CatchUp | null>(null);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">Impossible de charger le suivi des épisodes.</p>;
  }

  const ordered = data.seasons.flatMap((season) => season.episodes);

  /** Marque un épisode ; s'il en reste des non vus **avant** lui, propose de les rattraper. */
  function markSingle(episodeId: string, watched: boolean) {
    markEpisode.mutate({ episodeId, watched });
    if (!watched) {
      setCatchUp(null);
      return;
    }
    const index = ordered.findIndex((e) => e.id === episodeId);
    const earlier = ordered.slice(0, index).filter((e) => !e.watched).map((e) => e.id);
    setCatchUp(earlier.length > 0 ? { episodeIds: earlier } : null);
  }

  const progress =
    data.totalEpisodes > 0 ? Math.round((data.watchedEpisodes / data.totalEpisodes) * 100) : 0;
  const allEpisodeIds = data.seasons.flatMap((season) => season.episodes.map((e) => e.id));
  const allWatched = data.totalEpisodes > 0 && data.watchedEpisodes === data.totalEpisodes;

  return (
    <div className="space-y-6">
      <div className="max-w-md space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {data.watchedEpisodes}/{data.totalEpisodes} épisodes
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        {data.totalEpisodes > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              markEpisodes.mutate({ episodeIds: allEpisodeIds, watched: !allWatched })
            }
          >
            {allWatched ? (
              <>
                <RotateCcw className="h-4 w-4" /> Tout marquer non vu
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" /> Marquer la série comme vue
              </>
            )}
          </Button>
        ) : null}
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
            disabled={busy}
            onClick={() => data.nextEpisode && markSingle(data.nextEpisode.id, true)}
          >
            <Play className="h-4 w-4" /> Marquer vu
          </Button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          🎉 Vous avez terminé cette série.
        </p>
      )}

      {catchUp && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm">
            <ListChecks className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {catchUp.episodeIds.length} épisode{catchUp.episodeIds.length > 1 ? "s" : ""} précédent
            {catchUp.episodeIds.length > 1 ? "s" : ""} non vu
            {catchUp.episodeIds.length > 1 ? "s" : ""}. Les marquer comme vus aussi ?
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                markEpisodes.mutate({ episodeIds: catchUp.episodeIds, watched: true });
                setCatchUp(null);
              }}
            >
              <CheckCheck className="h-4 w-4" /> Tout marquer vu
            </Button>
            <Button variant="ghost" size="icon" aria-label="Ignorer" onClick={() => setCatchUp(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {data.seasons.map((season) => {
          const seasonEpisodeIds = season.episodes.map((e) => e.id);
          const seasonWatched =
            season.episodes.length > 0 && season.episodes.every((e) => e.watched);
          return (
            <div key={season.number}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Saison {season.number}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || season.episodes.length === 0}
                  onClick={() =>
                    markEpisodes.mutate({ episodeIds: seasonEpisodeIds, watched: !seasonWatched })
                  }
                >
                  {seasonWatched ? "Marquer non vue" : "Marquer la saison vue"}
                </Button>
              </div>
              <ul className="divide-y rounded-lg border">
                {season.episodes.map((episode) => (
                  <li key={episode.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={episode.watched}
                        disabled={busy}
                        onChange={(e) => markSingle(episode.id, e.target.checked)}
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
          );
        })}
      </div>
    </div>
  );
}
