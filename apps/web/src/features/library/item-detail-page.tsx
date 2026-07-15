import { Skeleton } from "@otium/ui";
import { Navigate, useParams } from "@tanstack/react-router";
import { useLibraryItem } from "./api/use-item-detail";

/**
 * Ancienne route bibliothèque `/library/$itemId`. La fiche est désormais unifiée
 * (`/media/$type/$externalId`, partagée avec la recherche) : on résout l'élément puis
 * on redirige, ce qui préserve les liens et favoris existants sans dupliquer la page.
 */
export function ItemDetailPage() {
  const { itemId } = useParams({ strict: false }) as { itemId: string };
  const { data: item, isLoading, isError } = useLibraryItem(itemId);

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

  return (
    <Navigate
      to="/media/$type/$externalId"
      params={{ type: item.media.type, externalId: item.media.externalRef.externalId }}
      replace
    />
  );
}
