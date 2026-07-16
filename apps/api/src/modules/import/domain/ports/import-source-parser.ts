import type { ImportBatch } from "../models/imported-media";

/** Fichier extrait d'une archive d'import (nom + contenu texte). */
export interface ImportFile {
  readonly name: string;
  readonly content: string;
}

/**
 * Port d'un parseur de source d'import. Chaque format (TV Time, Trakt…) fournit une
 * implémentation ; l'ajout d'un format n'impacte ni l'orchestration ni le domaine
 * (point d'extension modulaire — CLAUDE.md §5). Le parseur est **pur** (pas d'I/O) :
 * il reçoit les fichiers déjà extraits et rend un lot normalisé.
 */
export interface ImportSourceParser {
  /** Identifiant du format (ex. `"tvtime"`). */
  readonly format: string;
  /** Vrai si ce parseur reconnaît les fichiers fournis. */
  supports(files: readonly ImportFile[]): boolean;
  /** Normalise les fichiers en un lot d'entrées prêtes au rapprochement. */
  parse(files: readonly ImportFile[]): ImportBatch;
}

export const IMPORT_SOURCE_PARSERS = Symbol("IMPORT_SOURCE_PARSERS");
