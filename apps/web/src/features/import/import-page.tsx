import type { ImportMediaCounters, ImportReport } from "@otium/types";
import { Button } from "@otium/ui";
import { CheckCircle2, FileArchive, Film, ListVideo, Tv, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useImportTvTime } from "./api/use-import";

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
  const importTvTime = useImportTvTime();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickZip = (files: FileList | null) => {
    const candidate = files?.[0];
    if (candidate && candidate.name.toLowerCase().endsWith(".zip")) {
      setFile(candidate);
      importTvTime.reset();
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    pickZip(event.dataTransfer.files);
  };

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
        <Button
          disabled={!file || importTvTime.isPending}
          onClick={() => file && importTvTime.mutate(file)}
        >
          {importTvTime.isPending ? "Import en cours…" : "Importer"}
        </Button>
        {importTvTime.isPending && (
          <p className="text-sm text-muted-foreground">
            Rapprochement des titres au catalogue — cela peut prendre une minute.
          </p>
        )}
      </div>

      {importTvTime.isError && (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          L'import a échoué. Vérifiez que l'archive provient bien de TV Time, puis réessayez.
        </p>
      )}

      {importTvTime.data && <Report report={importTvTime.data} />}
    </section>
  );
}
