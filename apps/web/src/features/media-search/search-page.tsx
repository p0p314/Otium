import { Search } from "lucide-react";
import { useState } from "react";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { AddToLibraryButton } from "../library/components/add-to-library-button";
import { MIN_QUERY_LENGTH, useMediaSearch } from "./api/use-media-search";
import { MediaResults } from "./components/media-results";

/** Page de recherche : saisie débouncée → hook de données → présentation des résultats. */
export function SearchPage() {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 350);
  const hasQuery = debounced.trim().length >= MIN_QUERY_LENGTH;
  const { data, isLoading, isError } = useMediaSearch(debounced);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rechercher</h1>
        <p className="text-muted-foreground">Films et séries, propulsés par TMDB.</p>
      </div>

      <div className="relative max-w-xl">
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
          className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <MediaResults
        items={data?.items ?? []}
        isLoading={hasQuery && isLoading}
        isError={isError}
        hasQuery={hasQuery}
        renderAction={(media) => <AddToLibraryButton media={media} />}
      />
    </section>
  );
}
