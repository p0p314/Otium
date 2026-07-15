import { Skeleton } from "@otium/ui";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useLibraryItem, useRateMedia } from "./api/use-item-detail";
import { RatingControl } from "./components/rating-control";
import { ReviewEditor } from "./components/review-editor";
import { SeriesTrackingSection } from "./components/series-tracking-section";
import { StatusSelect } from "./components/status-select";
import { statusLabel } from "./status";

const TYPE_LABEL = { MOVIE: "Film", SERIES: "Série" } as const;

export function ItemDetailPage() {
  const { itemId } = useParams({ strict: false }) as { itemId: string };
  const { data: item, isLoading, isError } = useLibraryItem(itemId);
  const rate = useRateMedia(itemId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !item) {
    return <p className="text-destructive">Élément introuvable dans votre bibliothèque.</p>;
  }

  const isSeries = item.media.type === "SERIES";

  return (
    <section className="space-y-8">
      <div>
        <Link
          to="/library"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Ma bibliothèque
        </Link>
        <div className="flex gap-4">
          <div className="hidden h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
            {item.media.posterUrl ? (
              <img
                src={item.media.posterUrl}
                alt={`Affiche de ${item.media.title}`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{item.media.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {TYPE_LABEL[item.media.type]}
              {item.media.year ? ` · ${item.media.year}` : ""} ·{" "}
              {statusLabel(item.status, item.media.type)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Statut</h2>
        <StatusSelect itemId={itemId} type={item.media.type} value={item.status} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Ma note</h2>
        <RatingControl
          value={item.rating}
          disabled={rate.isPending}
          onRate={(rating) => rate.mutate(rating)}
        />
      </div>

      <ReviewEditor itemId={itemId} />

      {isSeries ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Suivi des épisodes</h2>
          <SeriesTrackingSection itemId={itemId} />
        </div>
      ) : null}
    </section>
  );
}
