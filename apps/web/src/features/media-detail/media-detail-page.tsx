import type { MediaType } from "@otium/types";
import { Button, Skeleton } from "@otium/ui";
import { useParams, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMediaDetails } from "./api/use-media-details";
import { MediaDetail } from "./components/media-detail";
import { MediaLibraryActions } from "./components/media-library-actions";

/** Fiche média unifiée (catalogue + actions bibliothèque), partagée recherche/bibliothèque. */
export function MediaDetailPage() {
  const params = useParams({ strict: false }) as { type: string; externalId: string };
  const router = useRouter();
  const type = params.type as MediaType;
  const { data, isLoading, isError, refetch, isFetching } = useMediaDetails(type, params.externalId);

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl sm:h-56" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Impossible de charger cette fiche</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Vérifiez votre connexion (ou la configuration TMDB), puis réessayez.
          </p>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <MediaDetail details={data} actions={<MediaLibraryActions details={data} />} />
      )}
    </section>
  );
}
