import type { CollectionProgress, CollectionVolume } from "@otium/types";
import { Skeleton, buttonVariants, cn } from "@otium/ui";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, BookmarkCheck, Layers, Library } from "lucide-react";
import { MediaCover } from "../../components/media-cover";
import { statusLabel } from "../library/status";
import { useCollection } from "./api/use-collection";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Vignette d'un tome : couverture, rang, et statut s'il est suivi. */
function VolumeCard({ volume }: { volume: CollectionVolume }) {
  return (
    <Link
      to="/media/$type/$externalId"
      params={{ type: "BOOK", externalId: volume.externalId }}
      className="group block"
      aria-label={`Ouvrir ${volume.title}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
        <MediaCover
          src={volume.posterUrl}
          alt=""
          className="transition-transform duration-200 group-hover:scale-105"
        />
        {volume.position !== null ? (
          <span className="absolute left-1 top-1 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-medium backdrop-blur">
            {volume.position}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium group-hover:text-primary">
        {volume.title}
      </p>
      <p className="text-xs text-muted-foreground">
        {/* Un tome non ajouté n'a pas de statut : le dire explicitement vaut mieux qu'un vide. */}
        {volume.status ? statusLabel(volume.status, "BOOK") : "Pas dans la bibliothèque"}
      </p>
    </Link>
  );
}

/** Barre de progression de l'œuvre, rapportée aux tomes connus. */
function ProgressBar({ progress }: { progress: CollectionProgress }) {
  return (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression de l'œuvre"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {progress.readVolumes} tome{progress.readVolumes > 1 ? "s" : ""} lu
        {progress.readVolumes > 1 ? "s" : ""} sur {progress.totalVolumes} connu
        {progress.totalVolumes > 1 ? "s" : ""} · {progress.percent} %
      </p>
    </div>
  );
}

/**
 * Fiche d'une œuvre suivie : synthèse d'avancement et tomes. Les valeurs affichées sont
 * **calculées par le serveur** (dernier tome lu, prochain conseillé) — la page présente,
 * elle ne décide pas.
 */
export function CollectionPage() {
  const { provider, externalId } = useParams({ strict: false }) as {
    provider: string;
    externalId: string;
  };
  const { data, isLoading, isError } = useCollection(provider ?? "", externalId ?? "");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // 404 compris : l'œuvre n'est pas encore suivie. Ce n'est pas une panne.
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Layers className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Cette œuvre n'est pas encore dans votre bibliothèque</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ajoutez un premier tome depuis la recherche : l'œuvre apparaîtra ici avec sa
          progression.
        </p>
        <Link to="/search" className={buttonVariants({ size: "sm" })}>
          Rechercher un tome
        </Link>
      </div>
    );
  }

  const { progress } = data;

  return (
    <section className="space-y-6">
      <Link
        to="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Ma bibliothèque
      </Link>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Œuvre
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
      </div>

      <ProgressBar progress={progress} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tomes connus" value={String(progress.totalVolumes)} />
        <Stat label="Dans ma bibliothèque" value={String(progress.ownedVolumes)} />
        <Stat
          label="Dernier tome lu"
          value={progress.lastRead ? `Tome ${progress.lastRead.position ?? "—"}` : "—"}
          {...(progress.lastRead ? { hint: progress.lastRead.title } : {})}
        />
        <Stat
          label="Prochain conseillé"
          value={progress.nextSuggested ? `Tome ${progress.nextSuggested.position ?? "—"}` : "—"}
          {...(progress.nextSuggested ? { hint: progress.nextSuggested.title } : {})}
        />
      </div>

      {progress.nextSuggested ? (
        <Link
          to="/media/$type/$externalId"
          params={{ type: "BOOK", externalId: progress.nextSuggested.externalId }}
          className={cn(buttonVariants({ size: "sm" }), "gap-2")}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Continuer : {progress.nextSuggested.title}
        </Link>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <BookmarkCheck className="h-4 w-4" aria-hidden />
          Tous les tomes connus sont lus.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Library className="h-4 w-4" aria-hidden />
          Les tomes
        </h2>
        <ul className={GRID}>
          {data.volumes.map((volume) => (
            <li key={volume.externalId}>
              <VolumeCard volume={volume} />
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
