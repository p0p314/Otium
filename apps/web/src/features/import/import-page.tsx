import type { ImportMediaCounters, ImportReport } from "@otium/types";
import { Button } from "@otium/ui";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileArchive, Film, ListVideo, Loader2, Tv, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useImportJob, useStartImport } from "./api/use-import";
import { PendingResolution } from "./components/pending-resolution";

/** Une ligne de compteurs (importés / ignorés / non trouvés) pour un type de média. */
function CountersRow({
  label,
  icon,
  counters,
}: {
  label: string;
  icon: React.ReactNode;
  counters: ImportMediaCounters;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {label}
      </div>
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1">
          <dt className="text-muted-foreground">Importés</dt>
          <dd className="font-semibold text-foreground">{counters.imported}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="text-muted-foreground">Déjà présents</dt>
          <dd className="font-semibold">{counters.skipped}</dd>
        </div>
        {counters.pending > 0 && (
          <div className="flex items-center gap-1">
            <dt className="text-muted-foreground">À rapprocher</dt>
            <dd className="font-semibold text-primary">{counters.pending}</dd>
          </div>
        )}
        <div className="flex items-center gap-1">
          <dt className="text-muted-foreground">Non trouvés</dt>
          <dd className="font-semibold">{counters.unmatched}</dd>
        </div>
      </dl>
    </div>
  );
}

function Report({ report }: { report: ImportReport }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        Import terminé
      </div>
      <CountersRow label="Films" icon={<Film className="h-4 w-4" />} counters={report.movies} />
      <CountersRow label="Séries" icon={<Tv className="h-4 w-4" />} counters={report.series} />
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-2 font-medium">
          <ListVideo className="h-4 w-4" />
          Épisodes marqués vus
        </div>
        <span className="font-semibold">{report.episodesMarked}</span>
      </div>

      {report.pending.length > 0 && <PendingResolution pending={report.pending} />}

      {report.unmatchedSample.length > 0 && (
        <details className="rounded-lg border bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Titres non rapprochés ({report.unmatchedSample.length}
            {report.movies.unmatched + report.series.unmatched > report.unmatchedSample.length
              ? "+"
              : ""}
            )
          </summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {report.unmatchedSample.map((entry) => (
              <li key={`${entry.type}-${entry.title}-${entry.year ?? ""}`}>
                {entry.title}
                {entry.year != null ? ` (${entry.year})` : ""} —{" "}
                {entry.type === "MOVIE" ? "film" : "série"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Ces titres n'ont pas pu être identifiés automatiquement. Vous pouvez les ajouter depuis
            la recherche.
          </p>
        </details>
      )}
    </div>
  );
}

export function ImportPage() {
  const queryClient = useQueryClient();
  const start = useStartImport();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: job } = useImportJob(jobId);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processed = job?.progress.processed;
  const status = job?.status;
  // Rafraîchissement progressif : au fil de l'import, on marque bibliothèque et accueil
  // comme périmés pour qu'ils se rechargent à jour dès qu'on y revient.
  useEffect(() => {
    if (!jobId) return;
    queryClient.invalidateQueries({ queryKey: ["library"] });
    queryClient.invalidateQueries({ queryKey: ["home-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["upcoming"] });
  }, [jobId, processed, status, queryClient]);

  const pickZip = (files: FileList | null) => {
    const candidate = files?.[0];
    if (candidate && candidate.name.toLowerCase().endsWith(".zip")) {
      setFile(candidate);
      setJobId(null);
      start.reset();
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    pickZip(event.dataTransfer.files);
  };

  const startImport = () => {
    if (!file) return;
    start.mutate(file, { onSuccess: (result) => setJobId(result.jobId) });
  };

  // « En cours » couvre l'upload, la préparation (job créé, pas encore d'état) et le traitement.
  const running = start.isPending || status === "running" || (jobId != null && job === undefined);
  const report = status === "done" ? (job?.report ?? null) : null;
  const failed = start.isError || status === "error";

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importer depuis TV Time</h1>
        <p className="text-muted-foreground">
          Reconstruisez votre bibliothèque à partir de votre export de données TV Time.
        </p>
      </div>

      <ol className="space-y-1 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <li>
          1. Sur TV Time, ouvrez la page de vos données personnelles (RGPD) et lancez la préparation
          de l'export.
        </li>
        <li>
          2. <strong className="font-medium text-foreground">Téléchargez</strong> l'archive{" "}
          <code className="text-foreground">.zip</code> proposée sur cette page (elle n'est pas
          envoyée par e-mail).
        </li>
        <li>3. Déposez-la ci-dessous : films et séries vus (et « à voir ») seront importés.</li>
      </ol>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        {file ? (
          <>
            <FileArchive className="h-8 w-8 text-primary" />
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} Mo
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Glissez votre archive .zip ici</p>
            <p className="text-xs text-muted-foreground">ou</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(event) => pickZip(event.target.files)}
        />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choisir un fichier
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={!file || running} onClick={startImport}>
          {running ? "Import en cours…" : "Importer"}
        </Button>
      </div>

      {running && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {job && job.progress.total > 0
              ? `Rapprochement des titres — ${job.progress.processed}/${job.progress.total}`
              : "Préparation de l'import…"}
          </div>
          {job && job.progress.total > 0 && (
            <>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={job.progress.processed}
                aria-valuemin={0}
                aria-valuemax={job.progress.total}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.round((job.progress.processed / job.progress.total) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {job.progress.imported} importés · {job.progress.pending} à rapprocher ·{" "}
                {job.progress.unmatched} non trouvés
              </p>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Vous pouvez fermer cette page ou verrouiller votre téléphone : l'import continue côté
            serveur.
          </p>
        </div>
      )}

      {failed && (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          L'import a échoué. Vérifiez que l'archive provient bien de TV Time, puis réessayez.
        </p>
      )}

      {report && <Report report={report} />}
    </section>
  );
}
