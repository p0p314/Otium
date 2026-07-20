import type { MediaType } from "@otium/types";
import { Button, Skeleton, buttonVariants, cn } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { Heart, ListVideo, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MEDIA_TYPE_LABEL_PLURAL } from "../../lib/media-type";
import { useLibrary, useRemoveFromLibrary, useToggleFavorite } from "./api/use-library";
import { StatusBadge } from "./components/status-badge";
import { LibraryToolbar } from "./components/library-toolbar";
import {
  availableGenres,
  DEFAULT_LIBRARY_QUERY,
  type LibraryQuery,
  queryLibrary,
} from "./lib/filter-library";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

const CATEGORY_ORDER: MediaType[] = ["SERIES", "MOVIE", "BOOK"];
const CATEGORIES: Record<MediaType, { label: string; empty: string }> = {
  SERIES: { label: MEDIA_TYPE_LABEL_PLURAL.SERIES, empty: "Aucune série suivie pour le moment." },
  MOVIE: { label: MEDIA_TYPE_LABEL_PLURAL.MOVIE, empty: "Aucun film suivi pour le moment." },
  BOOK: { label: MEDIA_TYPE_LABEL_PLURAL.BOOK, empty: "Aucun livre suivi pour le moment." },
};

export function LibraryPage() {
  const { data, isLoading } = useLibrary();
  const remove = useRemoveFromLibrary();
  const toggleFavorite = useToggleFavorite();
  const [category, setCategory] = useState<MediaType>("SERIES");
  const [query, setQuery] = useState<LibraryQuery>(DEFAULT_LIBRARY_QUERY);

  // Changer de catégorie remet le genre à « tous » (les genres diffèrent films/séries).
  const selectCategory = (next: MediaType) => {
    setCategory(next);
    setQuery((q) => ({ ...q, genre: "ALL" }));
  };

  const counts = CATEGORY_ORDER.reduce<Record<MediaType, number>>(
    (acc, type) => ({ ...acc, [type]: (data ?? []).filter((i) => i.media.type === type).length }),
    { SERIES: 0, MOVIE: 0, BOOK: 0 },
  );

  // Au premier chargement, si la catégorie par défaut est vide mais qu'une autre
  // contient des éléments, on bascule dessus — pour ne jamais paraître « vide » à tort.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || !data || data.length === 0) return;
    autoSelected.current = true;
    setCategory((currentCategory) => {
      if (data.some((item) => item.media.type === currentCategory)) return currentCategory;
      return (
        CATEGORY_ORDER.find((type) => data.some((item) => item.media.type === type)) ??
        currentCategory
      );
    });
  }, [data]);

  const current = CATEGORIES[category];
  const categoryItems = useMemo(
    () => (data ?? []).filter((item) => item.media.type === category),
    [data, category],
  );
  const genres = useMemo(() => availableGenres(categoryItems), [categoryItems]);
  const items = useMemo(() => queryLibrary(categoryItems, query), [categoryItems, query]);

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ma bibliothèque</h1>
            <p className="text-muted-foreground">Vos films, séries et livres suivis, par catégorie.</p>
          </div>
          {/* « Mes listes » vit ici (retiré de la navigation principale). */}
          <Link
            to="/lists"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-2")}
          >
            <ListVideo className="h-4 w-4" />
            <span className="hidden sm:inline">Mes listes</span>
          </Link>
        </div>
        {/* Segmented control : bascule de catégorie en 1 tap (mieux qu'un select sur mobile). */}
        <div
          role="tablist"
          aria-label="Catégorie"
          className="inline-flex gap-1 rounded-full bg-muted p-1"
        >
          {CATEGORY_ORDER.map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={category === value}
              onClick={() => selectCategory(value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                category === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CATEGORIES[value].label}
              <span className="ml-1.5 text-xs opacity-70">{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recherche avancée (titre, statut, genre, favoris, tri) — masquée si la catégorie
          est vide (rien à filtrer). Filtrage 100 % client sur la bibliothèque déjà chargée. */}
      {!isLoading && categoryItems.length > 0 ? (
        <LibraryToolbar
          query={query}
          onChange={setQuery}
          type={category}
          genres={genres}
          resultCount={items.length}
          onReset={() => setQuery(DEFAULT_LIBRARY_QUERY)}
        />
      ) : null}

      {isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full" />
          ))}
        </div>
      ) : categoryItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">{current.empty}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Recherchez un titre et ajoutez-le pour commencer à le suivre.
          </p>
          <Link to="/search" className={buttonVariants({ size: "sm" })}>
            Rechercher un média
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Aucun résultat pour ces filtres.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Ajustez votre recherche ou réinitialisez les filtres.
          </p>
          <Button variant="outline" size="sm" onClick={() => setQuery(DEFAULT_LIBRARY_QUERY)}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <ul className={GRID}>
          {items.map((item) => (
            <li key={item.id} className="group">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                <Link
                  to="/media/$type/$externalId"
                  params={{ type: item.media.type, externalId: item.media.externalRef.externalId }}
                  aria-label={`Ouvrir ${item.media.title}`}
                  className="block h-full w-full"
                >
                  {item.media.posterUrl ? (
                    <img
                      src={item.media.posterUrl}
                      alt={`Affiche de ${item.media.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : null}
                </Link>
                <div className="pointer-events-none absolute inset-x-1 bottom-1 flex justify-center">
                  <StatusBadge
                    status={item.status}
                    type={item.media.type}
                    className="bg-background/85 backdrop-blur"
                  />
                </div>
                <div className="absolute inset-x-1 top-1 flex justify-between opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
                to="/media/$type/$externalId"
                params={{ type: item.media.type, externalId: item.media.externalRef.externalId }}
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
