import { Button, Select, Skeleton } from "@otium/ui";
import { Check, Play, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLibrary } from "../../library/api/use-library";
import { useMarkEpisode, useSeriesTracking } from "../../library/api/use-series-tracking";
import {
  useDeleteEpisodeReview,
  useEpisodeReview,
  useSaveEpisodeReview,
} from "../api/use-episode-review";

/** Éditeur de note (0–10) et d'avis d'un épisode. Note et avis indépendants. */
function ReviewEditor({ itemId, episodeId }: { itemId: string; episodeId: string }) {
  const review = useEpisodeReview(itemId, episodeId);
  const save = useSaveEpisodeReview(itemId, episodeId);
  const remove = useDeleteEpisodeReview(itemId, episodeId);
  const busy = save.isPending || remove.isPending;

  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [ready, setReady] = useState(false);

  // Initialise les champs une fois la note/avis chargé(e) (null ou existant).
  useEffect(() => {
    if (!ready && review.data !== undefined) {
      setRating(review.data?.rating ?? null);
      setBody(review.data?.body ?? "");
      setReady(true);
    }
  }, [review.data, ready]);

  if (review.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const trimmed = body.trim();
  const hasContent = rating !== null || trimmed.length > 0;
  const existed = Boolean(review.data);

  function onSave() {
    if (!hasContent) {
      if (existed) remove.mutate();
      return;
    }
    save.mutate({ rating, body: trimmed.length > 0 ? trimmed : null });
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Star className="h-4 w-4 text-amber-500" /> Ma note & mon avis
      </h2>

      <div className="flex items-center gap-2">
        <label htmlFor="ep-rating" className="text-sm text-muted-foreground">
          Note
        </label>
        <Select
          id="ep-rating"
          className="h-9 w-28"
          value={rating ?? ""}
          disabled={busy}
          onChange={(e) => setRating(e.target.value === "" ? null : Number(e.target.value))}
        >
          <option value="">Aucune</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}/10
            </option>
          ))}
        </Select>
      </div>

      <textarea
        aria-label="Mon avis"
        placeholder="Votre avis sur cet épisode (facultatif)…"
        value={body}
        disabled={busy}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy} onClick={onSave}>
          Enregistrer
        </Button>
        {existed ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove.mutate()}>
            <Trash2 className="h-4 w-4" /> Effacer
          </Button>
        ) : null}
        {save.isError || remove.isError ? (
          <span className="text-sm text-destructive">Échec de l'enregistrement.</span>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Actions utilisateur sur un épisode quand la série est en bibliothèque : bouton « vu »
 * et éditeur note/avis. Résout l'élément de bibliothèque et l'épisode interne une seule fois.
 */
export function EpisodeUserSection({
  externalId,
  season,
  episode,
}: {
  externalId: string;
  season: number;
  episode: number;
}) {
  const { data: library } = useLibrary();
  const item = library?.find(
    (i) => i.media.type === "SERIES" && i.media.externalRef.externalId === externalId,
  );
  const tracking = useSeriesTracking(item?.id ?? "");
  const markEpisode = useMarkEpisode(item?.id ?? "");

  if (!item) return null;
  const tracked = tracking.data?.seasons
    .find((s) => s.number === season)
    ?.episodes.find((e) => e.number === episode);
  if (!tracked) return null;

  return (
    <div className="space-y-4">
      <Button
        variant={tracked.watched ? "outline" : "primary"}
        disabled={markEpisode.isPending}
        onClick={() => markEpisode.mutate({ episodeId: tracked.id, watched: !tracked.watched })}
      >
        {tracked.watched ? (
          <>
            <Check className="h-4 w-4" /> Vu
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> Marquer vu
          </>
        )}
      </Button>
      <ReviewEditor itemId={item.id} episodeId={tracked.id} />
    </div>
  );
}
