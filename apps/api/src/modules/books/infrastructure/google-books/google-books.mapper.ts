import type { BookRecord } from "../../domain";
import { isIsbn, normalizeIsbn } from "../../domain";
import type { GoogleImageLinks, GoogleVolume } from "./google-books.types";

export const GOOGLE_BOOKS_SOURCE = "google-books";

/** Chaîne exploitable, ou `null` : une chaîne vide n'est pas une donnée. */
function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Niveaux de zoom Google Books, mesurés sur trois couvertures :
 *
 * | zoom | taille servie | poids       | latence |
 * | ---- | ------------- | ----------- | ------- |
 * | 1    | 128×190 px    | 8,5–10,7 Ko | ~0,19 s |
 * | 2    | 300×465 px    | 14–25 Ko    | ~0,50 s |
 * | 3    | 575×886 px    | ~38 Ko      | ~0,56 s |
 *
 * Le compromis n'est donc pas le même selon l'usage :
 *
 * - **Vignettes** : `zoom=1`. Une grille en affiche une vingtaine ; passer à `zoom=2`
 *   multiplierait par ~2,5 le poids **et** la latence de chacune. La netteté y gagnerait,
 *   mais pas la vitesse — or c'est la vitesse qui fait défaut (éco-conception, CLAUDE.md).
 * - **Fiche détaillée** : `zoom=2`. Une seule image, affichée sur 112–144 px CSS, donc
 *   300 px de source la rendent nette sur écran à haute densité ; son demi-seconde de
 *   chargement est invisible puisqu'elle est seule et prioritaire. Sans cette réécriture
 *   elle ferait 128 px, l'API ne renvoyant en pratique que `smallThumbnail`/`thumbnail`.
 */
const ZOOM = { card: 1, detail: 2 } as const;

/**
 * Google sert ses images en HTTP et bride la taille via `zoom`. On force HTTPS (contenu
 * mixte bloqué par le navigateur), on retire `edge=curl` (ombre décorative parasite) et
 * on impose le niveau de zoom voulu.
 *
 * La réécriture du zoom est fiable : sur les volumes observés, **toutes** les URL de
 * `thumbnail` portent `zoom=1`. À défaut de paramètre reconnu, l'URL est laissée intacte
 * plutôt que bricolée.
 */
function image(url: string | undefined, zoom?: number): string | null {
  const value = text(url);
  if (!value) return null;
  const normalized = value.replace(/^http:/, "https:").replace(/&edge=curl/, "");
  return zoom === undefined ? normalized : normalized.replace(/([?&]zoom=)\d+/, `$1${zoom}`);
}

/** Meilleure résolution disponible, du plus grand au plus petit, au zoom demandé. */
function largestCover(links: GoogleImageLinks | undefined, zoom: number): string | null {
  return (
    image(links?.extraLarge, zoom) ??
    image(links?.large, zoom) ??
    image(links?.medium, zoom) ??
    image(links?.small, zoom) ??
    image(links?.thumbnail, zoom)
  );
}

/** Identifiant du type demandé, seulement s'il est structurellement valide. */
function isbn(volume: GoogleVolume, type: "ISBN_10" | "ISBN_13"): string | null {
  const found = volume.volumeInfo?.industryIdentifiers?.find((i) => i.type === type)?.identifier;
  const value = found ? normalizeIsbn(found) : null;
  return value && isIsbn(value) ? value : null;
}

/**
 * Convertit un volume Google Books vers le modèle normalisé. Renvoie `null` si le volume
 * n'a ni identifiant ni titre : une fiche sans identité n'est pas exploitable.
 */
export function toBookRecord(volume: GoogleVolume): BookRecord | null {
  const id = text(volume.id);
  const info = volume.volumeInfo;
  const title = text(info?.title);
  if (!id || !title) return null;

  return {
    externalId: id,
    source: GOOGLE_BOOKS_SOURCE,
    title,
    subtitle: text(info?.subtitle),
    authors: info?.authors?.map((a) => a.trim()).filter(Boolean) ?? [],
    description: text(info?.description),
    coverUrl: largestCover(info?.imageLinks, ZOOM.card),
    coverUrlLarge: largestCover(info?.imageLinks, ZOOM.detail),
    categories: info?.categories?.map((c) => c.trim()).filter(Boolean) ?? [],
    publishedDate: text(info?.publishedDate),
    pageCount: info?.pageCount && info.pageCount > 0 ? info.pageCount : null,
    language: text(info?.language)?.toLowerCase() ?? null,
    publisher: text(info?.publisher),
    isbn10: isbn(volume, "ISBN_10"),
    isbn13: isbn(volume, "ISBN_13"),
    googleBooksId: id,
    openLibraryId: null,
    infoUrl: text(info?.infoLink),
    // L'aperçu n'a de sens que si le volume en propose un (`viewability` ≠ NONE).
    previewUrl:
      volume.accessInfo?.viewability && volume.accessInfo.viewability !== "NONE"
        ? text(info?.previewLink)
        : null,
    // Google note sur 5 ; Otium raisonne sur 10 partout (contrat `Rating`).
    averageRating: info?.averageRating != null ? info.averageRating * 2 : null,
    ratingsCount: info?.ratingsCount ?? null,
    sources: [GOOGLE_BOOKS_SOURCE],
  };
}
