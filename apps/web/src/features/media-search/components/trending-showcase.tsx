import type { MediaType } from "@otium/types";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";
import { AddToLibraryButton } from "../../library/components/add-to-library-button";
import { useBookDiscoveries } from "../api/use-book-discoveries";
import { useTrending } from "../api/use-trending";
import { MediaResults } from "./media-results";

function TrendingRow({ title, type }: { title: string; type: MediaType }) {
  const { data, isLoading, isError } = useTrending(type);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <MediaResults
        items={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        hasQuery
        renderAction={(media) => <AddToLibraryButton media={media} compact />}
      />
    </section>
  );
}

/**
 * Livres mis en avant. Séparé de `TrendingRow` : la source n'est pas le catalogue de
 * recherche mais un instantané quotidien côté serveur — et la liste est simplement absente
 * tant qu'aucune synchronisation n'a abouti, plutôt que d'afficher une section vide.
 */
function BookDiscoveries({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError } = useBookDiscoveries(enabled);
  if (!enabled || isError || (!isLoading && (data?.items.length ?? 0) === 0)) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Livres à découvrir</h2>
      <MediaResults
        items={data?.items ?? []}
        isLoading={isLoading}
        isError={false}
        hasQuery
        renderAction={(media) => <AddToLibraryButton media={media} compact />}
      />
    </section>
  );
}

/**
 * Vitrine affichée sous la barre de recherche en l'absence de requête : films et séries du
 * moment (TMDB), et livres à découvrir (instantané Hardcover).
 */
export function TrendingShowcase() {
  const enabled = useSearchSettingsStore((state) => state.enabled);
  return (
    <div className="space-y-8">
      {enabled.SERIES ? <TrendingRow title="Séries du moment" type="SERIES" /> : null}
      {enabled.MOVIE ? <TrendingRow title="Films du moment" type="MOVIE" /> : null}
      <BookDiscoveries enabled={enabled.BOOK} />
    </div>
  );
}
