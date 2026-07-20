import type { LibraryItem, MediaDetails, MediaSummary } from "@otium/types";
import { useAuth } from "../../auth/api/use-auth";
import { useRateMedia } from "../../library/api/use-item-detail";
import { useLibrary } from "../../library/api/use-library";
import { AddToLibraryButton } from "../../library/components/add-to-library-button";
import { RatingControl } from "../../library/components/rating-control";
import { ReadingProgressControl } from "../../library/components/reading-progress-control";
import { ReviewEditor } from "../../library/components/review-editor";
import { SeriesTrackingSection } from "../../library/components/series-tracking-section";
import { StatusSelect } from "../../library/components/status-select";
import { AddToListControl } from "../../lists/components/add-to-list-control";
import { hasContinuousProgress } from "../../../lib/media-type";

/** Construit le résumé attendu par les actions bibliothèque depuis la fiche détaillée. */
function toSummary(details: MediaDetails): MediaSummary {
  return {
    type: details.type,
    title: details.title,
    year: details.year,
    posterUrl: details.posterUrl,
    genres: details.genres,
    externalRef: details.externalRef,
  };
}

/**
 * Contrôles personnels quand le média est dans la bibliothèque. Isolé dans un composant
 * pour n'appeler ses hooks (`useRateMedia`…) que lorsqu'un `itemId` existe réellement.
 */
function LibraryControls({
  item,
  media,
  details,
}: {
  item: LibraryItem;
  media: MediaSummary;
  details: MediaDetails;
}) {
  const rate = useRateMedia(item.id);
  const isSeries = item.media.type === "SERIES";

  return (
    <div className="space-y-6 rounded-xl border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Statut</h3>
          <StatusSelect itemId={item.id} type={item.media.type} value={item.status} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Ajouter à une liste</h3>
          <AddToListControl media={media} />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ma note</h3>
        <RatingControl
          value={item.rating}
          disabled={rate.isPending}
          onRate={(rating) => rate.mutate(rating)}
        />
      </div>
      {hasContinuousProgress(item.media.type) ? (
        <ReadingProgressControl item={item} totalPages={details.book?.pageCount ?? null} />
      ) : null}
      <ReviewEditor itemId={item.id} />
      {isSeries ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Suivi des épisodes</h3>
          <SeriesTrackingSection
            itemId={item.id}
            seriesExternalId={item.media.externalRef.externalId}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Slot d'actions bibliothèque de la fiche : invite, ajout, ou contrôles personnels. */
export function MediaLibraryActions({ details }: { details: MediaDetails }) {
  const { isAuthenticated } = useAuth();
  const { data: library } = useLibrary();

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-muted-foreground">
        Connectez-vous pour l'ajouter à votre bibliothèque.
      </p>
    );
  }

  const media = toSummary(details);
  const item = library?.find(
    (i) =>
      i.media.externalRef.provider === details.externalRef.provider &&
      i.media.externalRef.externalId === details.externalRef.externalId,
  );

  if (!item) {
    return (
      <div className="max-w-xs">
        <AddToLibraryButton media={media} />
      </div>
    );
  }
  return <LibraryControls item={item} media={media} details={details} />;
}
