import type { MediaType } from "@otium/types";
import { Button, Select, Skeleton, buttonVariants } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLibrary, useRemoveFromLibrary, useToggleFavorite } from "./api/use-library";
import { statusLabel } from "./status";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

const CATEGORY_ORDER: MediaType[] = ["SERIES", "MOVIE"];
const CATEGORIES: Record<MediaType, { label: string; empty: string }> = {
  SERIES: { label: "Séries", empty: "Aucune série suivie pour le moment." },
  MOVIE: { label: "Films", empty: "Aucun film suivi pour le moment." },
};

export function LibraryPage() {
  const { data, isLoading } = useLibrary();
  const remove = useRemoveFromLibrary();
  const toggleFavorite = useToggleFavorite();
  const [category, setCategory] = useState<MediaType>("SERIES");

  const counts: Record<MediaType, number> = {
    SERIES: (data ?? []).filter((item) => item.media.type === "SERIES").length,
    MOVIE: (data ?? []).filter((item) => item.media.type === "MOVIE").length,
  };

  // Au premier chargement, si la catégorie par défaut est vide mais qu'une autre
  // contient des éléments, on bascule dessus — pour ne jamais paraître « vide » à tort.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || !data || data.length === 0) return;
    autoSelected.current = true;
    setCategory((currentCategory) => {
      if (data.some((item) => item.media.type === currentCategory)) return currentCategory;
      return CATEGORY_ORDER.find((type) => data.some((item) => item.media.type === type)) ?? currentCategory;
    });
  }, [data]);

  const current = CATEGORIES[category];
  const items = (data ?? []).filter((item) => item.media.type === category);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ma bibliothèque</h1>
          <p className="text-muted-foreground">Vos films et séries suivis, par catégorie.</p>
        </div>
        <Select
          aria-label="Catégorie"
          className="max-w-[10rem]"
          value={category}
          onChange={(event) => setCategory(event.target.value as MediaType)}
        >
          {CATEGORY_ORDER.map((value) => (
            <option key={value} value={value}>
              {CATEGORIES[value].label} ({counts[value]})
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">{current.empty}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Recherchez un titre et ajoutez-le pour commencer à le suivre.
          </p>
          <Link to="/search" className={buttonVariants({ size: "sm" })}>
            Rechercher un média
          </Link>
        </div>
      ) : (
        <ul className={GRID}>
          {items.map((item) => (
            <li key={item.id} className="group">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                {item.media.posterUrl ? (
                  <img
                    src={item.media.posterUrl}
                    alt={`Affiche de ${item.media.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-x-1 bottom-1 rounded bg-background/80 px-1.5 py-0.5 text-center text-[10px] font-medium text-foreground backdrop-blur">
                  {statusLabel(item.status, item.media.type)}
                </span>
                <div className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant={item.isFavorite ? "primary" : "secondary"}
                    size="icon"
                    aria-label={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    className="h-8 w-8"
                    onClick={() =>
                      toggleFavorite.mutate({ itemId: item.id, isFavorite: !item.isFavorite })
                    }
                  >
                    <Heart className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label="Retirer de la bibliothèque"
                    className="h-8 w-8"
                    onClick={() => remove.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Link
                to="/library/$itemId"
                params={{ itemId: item.id }}
                className="mt-2 line-clamp-1 block text-sm font-medium hover:text-primary"
              >
                {item.media.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {item.media.year ? item.media.year : "—"}
                {item.rating ? ` · ★ ${item.rating}/10` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
