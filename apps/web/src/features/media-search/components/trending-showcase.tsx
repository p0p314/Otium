import type { MediaType } from "@otium/types";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";
import { AddToLibraryButton } from "../../library/components/add-to-library-button";
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
 * Vitrine affichée sous la barre de recherche en l'absence de requête : met en avant les
 * films et séries du moment (tendances TMDB). Les livres n'y figurent pas — aucune de nos
 * sources n'expose de tendances, et une sélection arbitraire vaudrait moins que rien
 * (ADR-0015 : les tendances sont une capacité optionnelle du catalogue).
 */
export function TrendingShowcase() {
  const enabled = useSearchSettingsStore((state) => state.enabled);
  return (
    <div className="space-y-8">
      {enabled.SERIES ? <TrendingRow title="Séries du moment" type="SERIES" /> : null}
      {enabled.MOVIE ? <TrendingRow title="Films du moment" type="MOVIE" /> : null}
    </div>
  );
}
