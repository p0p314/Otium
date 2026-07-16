import { Injectable } from "@nestjs/common";
import { unzipSync } from "fflate";
import type { ArchiveReader, ImportFile } from "../domain";

/**
 * Adapter `ArchiveReader` basé sur **fflate** (pur JS, très léger — éco-conception).
 * Décompresse en mémoire et ne conserve que les fichiers `.csv` (les exports RGPD
 * contiennent de nombreux fichiers ; seuls quelques CSV nous intéressent).
 */
@Injectable()
export class ZipArchiveReader implements ArchiveReader {
  async read(archive: Buffer): Promise<ImportFile[]> {
    const entries = unzipSync(new Uint8Array(archive), {
      filter: (file) => file.name.toLowerCase().endsWith(".csv"),
    });
    const decoder = new TextDecoder("utf-8");
    return Object.entries(entries).map(([name, bytes]) => ({
      // Ne garde que le nom de fichier (ignore un éventuel dossier racine).
      name: name.split("/").pop() ?? name,
      content: decoder.decode(bytes),
    }));
  }
}
