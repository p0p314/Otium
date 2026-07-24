import { Injectable } from "@nestjs/common";
import { unzipSync } from "fflate";
import type { ArchiveReader, ImportFile } from "../domain";

/**
 * Plafond cumulé de données **décompressées** (garde-fou anti « zip bomb » : une archive
 * de quelques Mo peut se décompresser en plusieurs Go et saturer la mémoire de l'instance).
 * Les exports RGPD TV Time sont des CSV texte de quelques Mo : 100 Mo est très confortable.
 */
const MAX_TOTAL_DECOMPRESSED_BYTES = 100 * 1024 * 1024;

/** Nombre maximal d'entrées CSV retenues (borne complémentaire). */
const MAX_CSV_ENTRIES = 100;

/** Levée quand l'archive dépasse les garde-fous de décompression. */
export class ArchiveTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchiveTooLargeError";
  }
}

/**
 * Adapter `ArchiveReader` basé sur **fflate** (pur JS, très léger — éco-conception).
 * Décompresse en mémoire et ne conserve que les fichiers `.csv` (les exports RGPD
 * contiennent de nombreux fichiers ; seuls quelques CSV nous intéressent).
 *
 * La décision d'inclusion se fait **avant** décompression (via le `filter` de fflate, qui
 * lit la taille déclarée `originalSize` de l'entrée) : une archive piégée est rejetée sans
 * jamais matérialiser son contenu en mémoire.
 */
@Injectable()
export class ZipArchiveReader implements ArchiveReader {
  constructor(
    private readonly maxTotalBytes: number = MAX_TOTAL_DECOMPRESSED_BYTES,
    private readonly maxEntries: number = MAX_CSV_ENTRIES,
  ) {}

  async read(archive: Buffer): Promise<ImportFile[]> {
    let totalBytes = 0;
    let csvCount = 0;
    const entries = unzipSync(new Uint8Array(archive), {
      filter: (file) => {
        if (!file.name.toLowerCase().endsWith(".csv")) return false;
        csvCount += 1;
        if (csvCount > this.maxEntries) {
          throw new ArchiveTooLargeError("Archive rejetée : trop de fichiers CSV.");
        }
        totalBytes += file.originalSize;
        if (totalBytes > this.maxTotalBytes) {
          throw new ArchiveTooLargeError("Archive rejetée : contenu décompressé trop volumineux.");
        }
        return true;
      },
    });
    const decoder = new TextDecoder("utf-8");
    return Object.entries(entries).map(([name, bytes]) => ({
      // Ne garde que le nom de fichier (ignore un éventuel dossier racine).
      name: name.split("/").pop() ?? name,
      content: decoder.decode(bytes),
    }));
  }
}
