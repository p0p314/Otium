import type { ImportCandidate, PendingImport } from "@otium/types";
import { Button } from "@otium/ui";
import { Check, HelpCircle, ImageOff } from "lucide-react";
import { useState } from "react";
import { useResolveImport } from "../api/use-import";

function entryKey(entry: Pick<PendingImport, "type" | "title" | "year">): string {
  return `${entry.type}:${entry.title}:${entry.year ?? ""}`;
}

/** Vignette d'un candidat : affiche, titre, année ; cliquable pour valider le rapprochement. */
function CandidateCard({
  candidate,
  disabled,
  onPick,
}: {
  candidate: ImportCandidate;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="group flex w-24 shrink-0 flex-col gap-1 text-left disabled:opacity-50"
    >
      <div className="relative aspect-[2/3] w-24 overflow-hidden rounded-lg border bg-muted transition-colors group-hover:border-primary">
        {candidate.posterUrl ? (
          <img
            src={candidate.posterUrl}
            alt={`Affiche de ${candidate.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-5 w-5" aria-hidden />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-primary/80 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <Check className="h-6 w-6" aria-hidden />
        </span>
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-tight">{candidate.title}</p>
      {candidate.year != null && (
        <p className="text-xs text-muted-foreground">{candidate.year}</p>
      )}
    </button>
  );
}

/**
 * Écran de résolution des entrées d'import **ambiguës** : pour chaque titre non tranché
 * automatiquement, l'utilisateur choisit le bon média parmi les candidats (ou l'ignore).
 * Chaque choix importe le média avec l'historique d'origine (statut / épisodes vus).
 */
export function PendingResolution({ pending }: { pending: PendingImport[] }) {
  const resolve = useResolveImport();
  const [done, setDone] = useState<Record<string, "resolved" | "dismissed">>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const remaining = pending.filter((entry) => !done[entryKey(entry)]);
  const resolvedCount = Object.values(done).filter((s) => s === "resolved").length;

  async function pick(entry: PendingImport, candidate: ImportCandidate) {
    const key = entryKey(entry);
    setActiveKey(key);
    try {
      await resolve.mutateAsync({
        candidate,
        entry: {
          type: entry.type,
          title: entry.title,
          year: entry.year,
          status: entry.status,
          watchedEpisodes: entry.watchedEpisodes,
        },
      });
      setDone((d) => ({ ...d, [key]: "resolved" }));
    } catch {
      // L'erreur reste affichée via resolve.isError ; on laisse l'entrée pour réessayer.
    } finally {
      setActiveKey(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="font-semibold">À rapprocher</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Ces titres n'ont pas pu être identifiés avec certitude. Choisissez le bon média —
        l'historique (épisodes vus, statut) sera conservé.
      </p>

      {resolvedCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <Check className="h-4 w-4" aria-hidden />
          {resolvedCount} rapprochement{resolvedCount > 1 ? "s" : ""} effectué
          {resolvedCount > 1 ? "s" : ""}.
        </p>
      )}

      {remaining.length === 0 ? (
        <p className="text-sm font-medium">Tout est rapproché. 🎉</p>
      ) : (
        <ul className="space-y-4">
          {remaining.map((entry) => {
            const key = entryKey(entry);
            const busy = activeKey === key;
            return (
              <li key={key} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 font-medium">
                    <span className="line-clamp-1">
                      {entry.title}
                      {entry.year != null ? ` (${entry.year})` : ""}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {entry.type === "MOVIE" ? "Film" : "Série"}
                      {entry.watchedEpisodes.length > 0
                        ? ` · ${entry.watchedEpisodes.length} épisode${entry.watchedEpisodes.length > 1 ? "s" : ""} vu${entry.watchedEpisodes.length > 1 ? "s" : ""}`
                        : ""}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setDone((d) => ({ ...d, [key]: "dismissed" }))}
                  >
                    Ignorer
                  </Button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {entry.candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.externalId}
                      candidate={candidate}
                      disabled={busy}
                      onPick={() => void pick(entry, candidate)}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolve.isError && (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Le rapprochement a échoué. Réessayez.
        </p>
      )}
    </section>
  );
}
