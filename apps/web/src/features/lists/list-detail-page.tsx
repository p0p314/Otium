import { Button, Skeleton, buttonVariants } from "@otium/ui";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { useList, useRemoveFromList } from "./api/use-lists";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
const TYPE_LABEL = { MOVIE: "Film", SERIES: "Série" } as const;

export function ListDetailPage() {
  const { listId } = useParams({ strict: false }) as { listId: string };
  const { data, isLoading, isError } = useList(listId);
  const removeFromList = useRemoveFromList();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-destructive">Liste introuvable.</p>;
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/lists"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Mes listes
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
        <p className="text-muted-foreground">
          {data.items.length} élément{data.items.length > 1 ? "s" : ""}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Cette liste est vide</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Ajoutez des titres depuis la recherche ou la fiche d'un média.
          </p>
          <Link to="/search" className={buttonVariants({ size: "sm" })}>
            Rechercher un média
          </Link>
        </div>
      ) : (
        <ul className={GRID}>
          {data.items.map((entry) => (
            <li key={`${entry.media.externalRef.provider}:${entry.media.externalRef.externalId}`} className="group">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                {entry.media.posterUrl ? (
                  <img
                    src={entry.media.posterUrl}
                    alt={`Affiche de ${entry.media.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={`Retirer ${entry.media.title} de la liste`}
                  className="absolute right-1 top-1 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  disabled={removeFromList.isPending}
                  onClick={() =>
                    removeFromList.mutate({ listId, externalRef: entry.media.externalRef })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium">{entry.media.title}</p>
              <p className="text-xs text-muted-foreground">
                {TYPE_LABEL[entry.media.type]}
                {entry.media.year ? ` · ${entry.media.year}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
