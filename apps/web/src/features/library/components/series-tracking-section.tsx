import { Button, Modal, Select, Skeleton } from "@otium/ui";
import { Check, CheckCheck, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useMarkEpisode, useMarkEpisodes, useSeriesTracking } from "../api/use-series-tracking";

/** Section de suivi épisode par épisode d'une série (progression, reprise, marquage en masse). */
export function SeriesTrackingSection({ itemId }: { itemId: string }) {
  const { data, isLoading, isError } = useSeriesTracking(itemId);
  const markEpisode = useMarkEpisode(itemId);
  const markEpisodes = useMarkEpisodes(itemId);
  const busy = markEpisode.isPending || markEpisodes.isPending;
  // Épisodes précédents à rattraper, proposés **au moment du clic** qui crée un trou.
  const [catchUpIds, setCatchUpIds] = useState<string[] | null>(null);
  // Saison affichée (null = saison de reprise par défaut). Évite de rendre 1000+ épisodes.
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">Impossible de charger le suivi des épisodes.</p>;
  }

  const ordered = data.seasons.flatMap((season) => season.episodes);

  /**
   * Marque un épisode. Si ce clic laisse des épisodes **précédents non vus** (saut en avant),
   * propose de les rattraper via une modale. Ne se déclenche qu'à l'action, jamais au chargement.
   */
  function markSingle(episodeId: string, watched: boolean) {
    markEpisode.mutate({ episodeId, watched });
    if (!watched) return;
    const index = ordered.findIndex((e) => e.id === episodeId);
    const earlier = ordered.slice(0, index).filter((e) => !e.watched).map((e) => e.id);
    if (earlier.length > 0) setCatchUpIds(earlier);
  }

  const catchUpCount = catchUpIds?.length ?? 0;
  const progress =
    data.totalEpisodes > 0 ? Math.round((data.watchedEpisodes / data.totalEpisodes) * 100) : 0;
  const allEpisodeIds = ordered.map((e) => e.id);
  const allWatched = data.totalEpisodes > 0 && data.watchedEpisodes === data.totalEpisodes;

  // On n'affiche qu'une saison à la fois (reprise par défaut) : indispensable pour les
  // séries à très longue durée (One Piece…), et plus lisible sur mobile.
  const defaultSeason = data.nextEpisode?.seasonNumber ?? data.seasons[0]?.number ?? 1;
  const activeNumber = selectedSeason ?? defaultSeason;
  const season = data.seasons.find((s) => s.number === activeNumber) ?? data.seasons[0];
  const seasonWatchedCount = season ? season.episodes.filter((e) => e.watched).length : 0;
  const seasonAllWatched = season != null && season.episodes.length > 0 && seasonWatchedCount === season.episodes.length;

  return (
    <div className="space-y-6">
      {/* Progression globale + action série entière. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {data.watchedEpisodes}
            <span className="text-muted-foreground">/{data.totalEpisodes} épisodes</span>
          </span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        {data.totalEpisodes > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => markEpisodes.mutate({ episodeIds: allEpisodeIds, watched: !allWatched })}
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

      {/* Reprise : prochain épisode à voir, action en 1 tap. */}
      {data.nextEpisode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">À reprendre</p>
            <p className="line-clamp-1 font-medium">
              S{data.nextEpisode.seasonNumber}E{data.nextEpisode.number} · {data.nextEpisode.title}
            </p>
          </div>
          <Button disabled={busy} onClick={() => data.nextEpisode && markSingle(data.nextEpisode.id, true)}>
            <Play className="h-4 w-4" /> Marquer vu
          </Button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          🎉 Vous avez terminé cette série.
        </p>
      )}

      <Modal
        open={catchUpIds !== null}
        onClose={() => setCatchUpIds(null)}
        title="Rattraper les épisodes précédents ?"
        description={
          <>
            {catchUpCount} épisode{catchUpCount > 1 ? "s" : ""} précédent
            {catchUpCount > 1 ? "s" : ""} ne {catchUpCount > 1 ? "sont" : "s'est"} pas encore
            marqué{catchUpCount > 1 ? "s" : ""} comme vu{catchUpCount > 1 ? "s" : ""}.
          </>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setCatchUpIds(null)}>
              Plus tard
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (catchUpIds) markEpisodes.mutate({ episodeIds: catchUpIds, watched: true });
                setCatchUpIds(null);
              }}
            >
              <CheckCheck className="h-4 w-4" /> Tout marquer vu
            </Button>
          </>
        }
      />

      {/* Sélecteur de saison : ne charge qu'une saison à la fois (mobile-first, 1000+ épisodes). */}
      {season ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {data.seasons.length > 1 ? (
              <Select
                aria-label="Saison"
                className="h-9 max-w-[11rem]"
                value={activeNumber}
                disabled={busy}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
              >
                {data.seasons.map((s) => {
                  const done = s.episodes.filter((ep) => ep.watched).length;
                  return (
                    <option key={s.number} value={s.number}>
                      Saison {s.number} ({done}/{s.episodes.length})
                    </option>
                  );
                })}
              </Select>
            ) : (
              <h3 className="text-sm font-semibold">Saison {season.number}</h3>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              disabled={busy || season.episodes.length === 0}
              onClick={() =>
                markEpisodes.mutate({
                  episodeIds: season.episodes.map((e) => e.id),
                  watched: !seasonAllWatched,
                })
              }
            >
              {seasonAllWatched ? "Saison non vue" : "Saison vue"}
            </Button>
          </div>

          <ul className="divide-y overflow-hidden rounded-xl border">
            {season.episodes.map((episode) => (
              <li key={episode.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 ${episode.watched ? "text-muted-foreground" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={episode.watched}
                    disabled={busy}
                    onChange={(e) => markSingle(episode.id, e.target.checked)}
                  />
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${episode.watched ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                  >
                    {episode.watched ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span className="w-9 shrink-0 text-sm tabular-nums text-muted-foreground">
                    E{episode.number}
                  </span>
                  <span className={`line-clamp-1 text-sm ${episode.watched ? "" : "font-medium"}`}>
                    {episode.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
