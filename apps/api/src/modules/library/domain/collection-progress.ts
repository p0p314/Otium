import type { WatchStatus } from "./models/library-item";

/**
 * Progression d'un utilisateur **sur une œuvre** (série de tomes, cycle de romans) —
 * logique **pure**, testable sans I/O. Pendant de `series-progress` pour les médias
 * regroupés en collection : chaque volume garde son suivi propre (statut, note, avis,
 * progression), l'œuvre n'en est que la synthèse.
 */

/** Un volume de l'œuvre, tel que l'utilisateur le suit (ou ne le suit pas encore). */
export interface CollectionVolume {
  /** Identifiant de bibliothèque, `null` si le volume n'a pas été ajouté. */
  readonly itemId: string | null;
  /** Rang dans l'œuvre, `null` pour un hors-série. */
  readonly position: number | null;
  readonly title: string;
  /** Statut de suivi, `null` si le volume n'est pas en bibliothèque. */
  readonly status: WatchStatus | null;
}

/**
 * Synthèse affichée sur la fiche de l'œuvre. Générique sur le type de volume : le domaine
 * n'a besoin que de `position` et `status`, mais **restitue** les objets qu'on lui a
 * donnés — l'appelant récupère donc ses volumes enrichis (couverture, identifiants) sans
 * que le domaine ait à connaître ces champs.
 */
export interface CollectionProgress<T extends CollectionVolume = CollectionVolume> {
  /** Volumes **connus** de l'œuvre — pas son total réel, souvent plus grand. */
  readonly totalVolumes: number;
  /** Volumes présents dans la bibliothèque de l'utilisateur. */
  readonly ownedVolumes: number;
  readonly readVolumes: number;
  /** Avancement sur les volumes connus (0–100). */
  readonly percent: number;
  /** Dernier tome lu, au sens du rang le plus avancé. */
  readonly lastRead: T | null;
  /** Tome à lire ensuite, ou `null` si tout est lu ou abandonné. */
  readonly nextSuggested: T | null;
}

/** Volumes triés par rang ; ceux sans rang ferment la marche, à l'ordre reçu. */
export function orderedVolumes<T extends CollectionVolume>(volumes: readonly T[]): T[] {
  return [...volumes].sort((a, b) => {
    if (a.position === null && b.position === null) return 0;
    if (a.position === null) return 1;
    if (b.position === null) return -1;
    return a.position - b.position;
  });
}

/**
 * Tome à lire ensuite. **Reprendre prime sur avancer** : un tome commencé est proposé
 * avant un tome jamais ouvert, même de rang inférieur — sinon l'utilisateur qui a laissé
 * un tome en cours se verrait proposer le suivant, et perdrait le fil.
 *
 * Les tomes abandonnés sont ignorés : les proposer reviendrait à insister sur un choix
 * déjà exprimé.
 */
export function nextVolumeToRead<T extends CollectionVolume>(volumes: readonly T[]): T | null {
  const ordered = orderedVolumes(volumes);
  const inProgress = ordered.find((v) => v.status === "IN_PROGRESS");
  if (inProgress) return inProgress;
  return ordered.find((v) => v.status !== "COMPLETED" && v.status !== "DROPPED") ?? null;
}

/** Dernier tome lu : le rang le plus avancé parmi les volumes terminés. */
export function lastVolumeRead<T extends CollectionVolume>(volumes: readonly T[]): T | null {
  const read = orderedVolumes(volumes).filter((v) => v.status === "COMPLETED");
  return read.at(-1) ?? null;
}

/**
 * Assemble la synthèse de l'œuvre. Le pourcentage se rapporte aux volumes **connus** :
 * on ne prétend pas connaître le total réel d'une série en cours de publication, et
 * afficher « 12 % » sur une estimation fausse serait pire que de rapporter au connu.
 */
export function buildCollectionProgress<T extends CollectionVolume>(
  volumes: readonly T[],
): CollectionProgress<T> {
  const total = volumes.length;
  const read = volumes.filter((v) => v.status === "COMPLETED").length;
  return {
    totalVolumes: total,
    ownedVolumes: volumes.filter((v) => v.itemId !== null).length,
    readVolumes: read,
    percent: total > 0 ? Math.round((read / total) * 100) : 0,
    lastRead: lastVolumeRead(volumes),
    nextSuggested: nextVolumeToRead(volumes),
  };
}
