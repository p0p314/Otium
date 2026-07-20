import type { BookDetails } from "@otium/types";
import { ExternalLink } from "lucide-react";

/** Nom de langue lisible, avec repli sur le code brut si la langue est inconnue de l'API. */
function languageLabel(code: string): string {
  const label = new Intl.DisplayNames(["fr"], { type: "language" }).of(code);
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : code.toUpperCase();
}

/**
 * Le lien de fiche vient de la source qui a répondu (Google Books ou Open Library, selon
 * la fusion). On nomme la bonne : annoncer « Google Books » sur un lien Open Library
 * serait un mensonge d'interface.
 */
function sourceLabel(url: string): string {
  if (url.includes("books.google")) return "Voir sur Google Books";
  if (url.includes("openlibrary.org")) return "Voir sur Open Library";
  return "Voir la fiche de l'éditeur";
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/**
 * Bloc « informations du livre » de la fiche média. Présentation **pure** : affiche
 * uniquement les champs renseignés, pour qu'une fiche incomplète (source pauvre, fusion
 * partielle) reste soignée plutôt que trouée de tirets.
 */
export function BookFacts({ book }: { book: BookDetails }) {
  const { identifiers } = book;
  const facts: { label: string; value: string }[] = [
    ...(book.authors.length > 0
      ? [{ label: book.authors.length > 1 ? "Auteurs" : "Auteur", value: book.authors.join(", ") }]
      : []),
    ...(book.publisher ? [{ label: "Éditeur", value: book.publisher }] : []),
    ...(book.publishedDate ? [{ label: "Publication", value: book.publishedDate }] : []),
    ...(book.pageCount ? [{ label: "Pages", value: `${book.pageCount}` }] : []),
    ...(book.language ? [{ label: "Langue", value: languageLabel(book.language) }] : []),
    ...(identifiers.isbn13 ? [{ label: "ISBN-13", value: identifiers.isbn13 }] : []),
    ...(identifiers.isbn10 ? [{ label: "ISBN-10", value: identifiers.isbn10 }] : []),
  ];

  if (facts.length === 0 && !book.infoUrl) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">Le livre</h2>
      {facts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
          {facts.map((fact) => (
            <Fact key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </dl>
      ) : null}
      {book.infoUrl ? (
        <a
          href={book.infoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          {sourceLabel(book.infoUrl)}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">(nouvel onglet)</span>
        </a>
      ) : null}
      {book.previewUrl ? (
        <a
          href={book.previewUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Lire un extrait
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">(nouvel onglet)</span>
        </a>
      ) : null}
    </section>
  );
}
