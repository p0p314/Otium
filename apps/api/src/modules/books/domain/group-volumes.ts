import type { BookRecord } from "./models/book";
import { parseVolumeTitle, titleSeriesKey } from "./volume-title";

/**
 * Regroupement des volumes en **œuvres** (fonction pure, sans I/O).
 *
 * Objectif : qu'une recherche « One Piece » affiche une fiche unique plutôt que cent
 * onze tomes indépendants, sans jamais fusionner deux œuvres distinctes — un faux
 * regroupement est bien plus gênant qu'un regroupement manqué, puisqu'il masque des
 * volumes sous le mauvais titre.
 *
 * Deux sources d'appartenance, par ordre de confiance :
 *
 * 1. **`series` du fournisseur** : identifiant stable, aucun faux positif. Mais absent
 *    de la majorité des volumes (mesuré : 100 % sur One Piece, 10 % sur Naruto, 0 %
 *    ailleurs) — d'où la seconde source.
 * 2. **Titre + auteur** : le titre doit porter un numéro de tome reconnaissable **et**
 *    l'auteur doit être connu. Les deux conditions sont exigées ensemble ; l'auteur
 *    seul ne regroupe rien, le titre seul non plus.
 *
 * Les deux sources ne se mélangent jamais au sein d'un même groupe : la clé porte sa
 * provenance, donc deux volumes rattachés par des méthodes différentes forment deux
 * groupes. C'est volontairement conservateur.
 */

/** Comment l'appartenance d'un volume à son œuvre a été établie. */
export type GroupingMethod = "PROVIDER_SERIES" | "TITLE_AND_AUTHOR";

/** Une œuvre reconstituée à partir des volumes présents dans les résultats. */
export interface VolumeGroup {
  /** Identifiant stable de l'œuvre (identifiant fournisseur, ou clé titre+auteur). */
  readonly key: string;
  readonly title: string;
  readonly method: GroupingMethod;
  /** Volumes trouvés, triés par rang quand il est connu. */
  readonly volumes: readonly BookRecord[];
}

/** Résultat du regroupement : les œuvres, et les livres restés isolés. */
export interface GroupedVolumes {
  readonly groups: readonly VolumeGroup[];
  /** Livres n'appartenant à aucune œuvre reconstituée — présentés tels quels. */
  readonly standalone: readonly BookRecord[];
}

interface Candidate {
  readonly key: string;
  readonly title: string;
  readonly method: GroupingMethod;
}

/** Appartenance d'un volume, ou `null` s'il ne peut être rattaché de façon sûre. */
function candidateFor(book: BookRecord): Candidate | null {
  if (book.series) {
    // Le titre du volume porte souvent le nom de l'œuvre ; on le nettoie de son numéro
    // pour nommer le groupe lisiblement, sans que cela n'influence le rattachement.
    return {
      key: `series:${book.series.source}:${book.series.id}`,
      title: parseVolumeTitle(book.title).baseTitle || book.title,
      method: "PROVIDER_SERIES",
    };
  }

  const parsed = parseVolumeTitle(book.title);
  // Sans numéro de tome, rien ne distingue un volume d'un livre isolé du même auteur.
  if (parsed.position === null) return null;

  const key = titleSeriesKey(parsed.baseTitle, book.authors[0]);
  if (!key) return null;
  return { key: `title:${key}`, title: parsed.baseTitle, method: "TITLE_AND_AUTHOR" };
}

/** Rang du volume dans son œuvre, selon la source qui a servi au rattachement. */
function positionOf(book: BookRecord): number | null {
  return book.series?.position ?? parseVolumeTitle(book.title).position;
}

/**
 * Répartit des volumes entre œuvres et livres isolés.
 *
 * Un groupe d'un seul volume est **défait** : afficher une « œuvre » contenant un unique
 * tome n'apporte rien et ajoute un niveau de navigation inutile. L'ordre d'entrée — celui
 * de la pertinence du fournisseur — est préservé : une œuvre prend le rang de son premier
 * volume rencontré.
 */
export function groupVolumes(books: readonly BookRecord[]): GroupedVolumes {
  const buckets = new Map<string, { candidate: Candidate; volumes: BookRecord[] }>();
  const order: string[] = [];
  const loose: BookRecord[] = [];

  for (const book of books) {
    const candidate = candidateFor(book);
    if (!candidate) {
      loose.push(book);
      continue;
    }
    const existing = buckets.get(candidate.key);
    if (existing) {
      existing.volumes.push(book);
    } else {
      buckets.set(candidate.key, { candidate, volumes: [book] });
      order.push(candidate.key);
    }
  }

  const groups: VolumeGroup[] = [];
  const standalone: BookRecord[] = [...loose];

  for (const key of order) {
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (bucket.volumes.length < 2) {
      standalone.push(...bucket.volumes);
      continue;
    }
    groups.push({
      key,
      title: bucket.candidate.title,
      method: bucket.candidate.method,
      volumes: sortByPosition(bucket.volumes),
    });
  }

  return { groups, standalone };
}

/** Tri par rang croissant ; les volumes sans rang connu ferment la marche. */
function sortByPosition(volumes: readonly BookRecord[]): BookRecord[] {
  return [...volumes].sort((a, b) => {
    const pa = positionOf(a);
    const pb = positionOf(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  });
}
