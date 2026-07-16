import type { ImportFile } from "./import-source-parser";

/**
 * Port d'extraction d'archive (ZIP). L'implémentation (infrastructure) décompresse
 * le binaire en fichiers texte ; le domaine ignore la bibliothèque utilisée.
 */
export interface ArchiveReader {
  read(archive: Buffer): Promise<ImportFile[]>;
}

export const ARCHIVE_READER = Symbol("ARCHIVE_READER");
