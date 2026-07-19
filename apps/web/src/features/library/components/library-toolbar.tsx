import type { MediaType, WatchStatus } from "@otium/types";
import { Button, Input, Select, cn } from "@otium/ui";
import { Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { statusLabel } from "../status";
import {
  isDefaultQuery,
  LIBRARY_SORTS,
  type LibraryQuery,
  type StatusFilter,
} from "../lib/filter-library";

const ALL_STATUSES: WatchStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "PAUSED", "DROPPED"];

interface LibraryToolbarProps {
  query: LibraryQuery;
  onChange: (query: LibraryQuery) => void;
  /** Type courant (libellés de statut adaptés film/série). */
  type: MediaType;
  /** Genres présents dans la catégorie (masque le filtre s'il est vide). */
  genres: readonly string[];
  resultCount: number;
  onReset: () => void;
}

/**
 * Barre de recherche avancée de la bibliothèque : titre, statut, genre, favoris et tri.
 * Aucune logique métier ici — le filtrage/tri vit dans `lib/filter-library` (pur, testé).
 */
export function LibraryToolbar({
  query,
  onChange,
  type,
  genres,
  resultCount,
  onReset,
}: LibraryToolbarProps) {
  const active = !isDefaultQuery(query);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query.search}
          onChange={(e) => onChange({ ...query, search: e.target.value })}
          placeholder="Rechercher dans la bibliothèque…"
          aria-label="Rechercher un titre dans la bibliothèque"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />

        <Select
          value={query.status}
          onChange={(e) => onChange({ ...query, status: e.target.value as StatusFilter })}
          aria-label="Filtrer par statut"
          className="h-9 w-auto"
        >
          <option value="ALL">Tous les statuts</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status, type)}
            </option>
          ))}
        </Select>

        {genres.length > 0 ? (
          <Select
            value={query.genre}
            onChange={(e) => onChange({ ...query, genre: e.target.value })}
            aria-label="Filtrer par genre"
            className="h-9 w-auto"
          >
            <option value="ALL">Tous les genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          value={query.sort}
          onChange={(e) =>
            onChange({ ...query, sort: e.target.value as LibraryQuery["sort"] })
          }
          aria-label="Trier"
          className="h-9 w-auto"
        >
          {LIBRARY_SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </Select>

        <Button
          variant={query.favoritesOnly ? "primary" : "outline"}
          size="sm"
          aria-pressed={query.favoritesOnly}
          onClick={() => onChange({ ...query, favoritesOnly: !query.favoritesOnly })}
          className="h-9 gap-1.5"
        >
          <Heart className="h-4 w-4" fill={query.favoritesOnly ? "currentColor" : "none"} />
          Favoris
        </Button>

        {active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 gap-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        ) : null}
      </div>

      <p className={cn("text-sm text-muted-foreground", !active && "sr-only")} aria-live="polite">
        {resultCount} résultat{resultCount > 1 ? "s" : ""}
      </p>
    </div>
  );
}
