/**
 * Reconnaissance du **numéro de tome dans un titre** (règles pures, sans I/O).
 *
 * Nécessaire parce que `seriesInfo` de Google Books, seule donnée d'appartenance fiable,
 * est très inégalement renseignée : mesuré sur des échantillons de 20 volumes, 100 % pour
 * One Piece mais 10 % pour Naruto et 0 % pour la plupart des œuvres. S'y fier seul
 * regrouperait certaines séries et pas d'autres — une incohérence visible à l'usage.
 *
 * Cette reconnaissance est donc un **complément**, jamais un remplacement : elle ne
 * s'applique que faute de donnée fournisseur, et l'appelant doit exiger en plus un auteur
 * identique avant de regrouper (voir `series-grouping`).
 *
 * Les motifs et les pièges ci-dessous viennent tous de titres réellement retournés par
 * l'API, pas d'hypothèses.
 */

/** Titre décomposé : le titre de l'œuvre, et le rang du volume s'il est lisible. */
export interface ParsedVolumeTitle {
  /** Titre de l'œuvre, débarrassé du marqueur de tome et de son sous-titre. */
  readonly baseTitle: string;
  /** Rang du volume, `null` si le titre n'en porte pas. */
  readonly position: number | null;
}

/**
 * Mentions qui contiennent un nombre **sans** désigner un tome. Sans cette garde,
 * « Le Trône de Fer (L'intégrale 3 illustrée) » deviendrait le tome 3 de l'œuvre et
 * écraserait le vrai tome 3.
 */
const NOT_A_VOLUME = /\b(int[ée]grale|coffret|anthologie|collector|omnibus|compilation)\b/i;

/**
 * Marqueurs de tome, du plus explicite au plus ambigu. L'ordre compte : le premier motif
 * reconnu gagne, pour qu'un titre portant « Tome 5 » ne soit pas capté par la règle du
 * nombre final.
 */
const MARKERS: readonly RegExp[] = [
  // « (Tome 1) », « (Vol. 3) » — parenthèses, souvent suivies d'un sous-titre.
  /\s*[([](?:tome|vol\.?|volume)\s*0*(\d{1,4})[)\]]/i,
  // « - tome 05 », « , tome 12 », « Volume 3 ».
  /\s*[-–—,:]?\s*\b(?:tomes?|vol\.?|volumes?)\s*0*(\d{1,4})\b/i,
  // « Chapitre 136 » — parution en chapitres, numérotation propre.
  /\s*[-–—,:]?\s*\bchapitres?\s*0*(\d{1,4})\b/i,
  // « T02 », « T27 » collés au titre. Exige au moins un chiffre et une frontière de mot
  // pour ne pas capter l'initiale d'un mot.
  /\s+\bT0*(\d{1,3})\b/,
  // Nombre final nu (« ONE PIECE 1 »), le plus ambigu : accepté seulement en dernier
  // recours, et jamais pour une année (quatre chiffres commençant par 1 ou 2).
  /\s+(\d{1,3})\s*$/,
];

/**
 * Décompose un titre de volume. Renvoie toujours un `baseTitle` exploitable ; `position`
 * vaut `null` quand aucun marqueur fiable n'est présent — un hors-série (« L'Attaque des
 * Titans - Outside ») garde alors son titre entier, ce qui l'empêche d'être confondu avec
 * la série principale.
 */
export function parseVolumeTitle(title: string): ParsedVolumeTitle {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) return { baseTitle: "", position: null };

  // Une mention « intégrale » ou « coffret » invalide toute lecture d'un numéro : ces
  // éditions portent un nombre qui n'est pas un rang de tome.
  if (NOT_A_VOLUME.test(trimmed)) {
    // Titre rendu tel quel : le nettoyage des bords sert à recoller un titre *coupé* à un
    // marqueur, il rognerait ici une parenthèse qui fait partie du titre.
    return { baseTitle: trimmed, position: null };
  }

  for (const marker of MARKERS) {
    const match = marker.exec(trimmed);
    if (!match?.[1]) continue;
    const position = Number(match[1]);
    if (position <= 0) continue;
    // Tout ce qui suit le marqueur est un sous-titre propre au volume
    // (« (Tome 1) - La glace et le feu ») : il ne fait pas partie du titre de l'œuvre.
    const base = cleanEdges(trimmed.slice(0, match.index));
    // Un titre réduit au mot-marqueur (« Tome 4 ») ne désigne aucune œuvre : mieux vaut
    // ne rien reconnaître que d'inventer une œuvre nommée « Tome ».
    if (!base || ONLY_MARKER_WORD.test(base)) continue;
    return { baseTitle: base, position };
  }

  return { baseTitle: cleanEdges(trimmed), position: null };
}

/** Un « titre » qui n'est que le mot désignant le tome ne nomme aucune œuvre. */
const ONLY_MARKER_WORD = /^(?:tomes?|vol\.?|volumes?|chapitres?|t)$/i;

/** Retire séparateurs et ponctuation résiduels laissés par le découpage. */
function cleanEdges(value: string): string {
  return value.replace(/^[\s\-–—,:([]+/, "").replace(/[\s\-–—,:.)\]]+$/, "").trim();
}

/**
 * Clé d'œuvre : titre de base normalisé (casse, accents, ponctuation neutralisés) associé
 * à l'auteur principal. **L'auteur est obligatoire** — c'est lui qui empêche de regrouper
 * « Dune » avec « Dune, le mook », ou la série principale avec l'essai qu'un autre auteur
 * lui a consacré. Renvoie `null` si l'un des deux manque : sans quoi on regrouperait à
 * l'aveugle.
 */
export function titleSeriesKey(baseTitle: string, author: string | undefined): string | null {
  const title = normalize(baseTitle);
  const who = normalize(author ?? "");
  if (!title || !who) return null;
  return `${title}|${who}`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
