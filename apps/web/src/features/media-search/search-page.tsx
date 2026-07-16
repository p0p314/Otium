import { Search } from "lucide-react";
import { useState } from "react";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { AddToLibraryButton } from "../library/components/add-to-library-button";
import { MIN_QUERY_LENGTH, useMediaSearch } from "./api/use-media-search";
import { MediaResults } from "./components/media-results";
import { TrendingShowcase } from "./components/trending-showcase";

/** Page de recherche : saisie débouncée → hook de données → présentation des résultats. */
export function SearchPage() {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 350);
  const hasQuery = debounced.trim().length >= MIN_QUERY_LENGTH;
  const { data, isLoading, isError } = useMediaSearch(debounced);

  return (
    <section className="space-y-6">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight">Rechercher</h1>
        <p className="text-muted-foreground">Films et séries, propulsés par TMDB.</p>
      </div>

      {/* Barre collante sur mobile (reste accessible en faisant défiler les résultats). */}
      <div className="sticky top-16 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:max-w-xl md:bg-transparent md:p-0">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Un titre… (ex. Dune)"
            aria-label="Rechercher un film ou une série"
            className="h-12 w-full rounded-full border border-input bg-background pl-11 pr-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-11 md:rounded-lg md:text-sm"
          />
        </div>
      </div>

      {hasQuery ? (
        <MediaResults
          items={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          hasQuery={hasQuery}
          renderAction={(media) => <AddToLibraryButton media={media} />}
        />
      ) : (
        <TrendingShowcase />
      )}
    </section>
  );
}
