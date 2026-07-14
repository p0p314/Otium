import { Skeleton } from "@otium/ui";
import type { MediaSummary } from "@otium/types";
import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { MediaCard } from "./media-card";

interface MediaResultsProps {
  items: MediaSummary[];
  isLoading: boolean;
  isError: boolean;
  /** Vrai dès que l'utilisateur a saisi une requête exploitable. */
  hasQuery: boolean;
  /** Action optionnelle rendue sur chaque carte (ex. bouton « Ajouter »). */
  renderAction?: (media: MediaSummary) => ReactNode;
}

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

/** Présentation pure des résultats : squelettes, erreur, état vide, grille. */
export function MediaResults({
  items,
  isLoading,
  isError,
  hasQuery,
  renderAction,
}: MediaResultsProps) {
  if (!hasQuery) {
    return (
      <EmptyState
        title="Recherchez un titre"
        message="Tapez au moins deux caractères pour explorer films et séries."
      />
    );
  }

  if (isLoading) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Chargement des résultats">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Une erreur est survenue"
        message="La recherche a échoué. Réessayez dans un instant."
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState title="Aucun résultat" message="Essayez un autre titre." />;
  }

  return (
    <ul className={GRID}>
      {items.map((media) => (
        <li key={`${media.externalRef.provider}:${media.externalRef.externalId}`}>
          <MediaCard media={media} action={renderAction?.(media)} />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
