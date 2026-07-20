import type { MediaDetails } from "@otium/types";
import { ImageOff, Star } from "lucide-react";
import type { ReactNode } from "react";
import { MEDIA_TYPE_LABEL } from "../../../lib/media-type";
import { BookFacts } from "./book-facts";



/** Traduit les statuts TMDB courants ; renvoie la valeur brute sinon (extensible). */
const STATUS_LABEL: Record<string, string> = {
  Released: "Sorti",
  "Post Production": "Post-production",
  "In Production": "En production",
  Planned: "Prévu",
  Rumored: "Annoncé",
  Canceled: "Annulé",
  "Returning Series": "En cours",
  Ended: "Terminée",
  Pilot: "Pilote",
};

function frenchStatus(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

/** Intitulé du bloc « qui a fait l'œuvre », propre à chaque type de média. */
function creditsTitle(type: MediaDetails["type"], count: number): string {
  if (type === "SERIES") return "Création";
  if (type === "BOOK") return count > 1 ? "Auteurs" : "Auteur";
  return "Réalisation";
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m.toString().padStart(2, "0")}` : `${m} min`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Présentation **pure** d'une fiche média (données catalogue). `actions` est un slot
 * pour les contrôles bibliothèque (ajout, statut, note…) rendu sous l'en-tête.
 */
export function MediaDetail({ details, actions }: { details: MediaDetails; actions?: ReactNode }) {
  const isSeries = details.type === "SERIES";
  const seasonLabel =
    details.numberOfSeasons != null
      ? `${details.numberOfSeasons} saison${details.numberOfSeasons > 1 ? "s" : ""}`
      : null;
  const episodeLabel =
    details.numberOfEpisodes != null
      ? `${details.numberOfEpisodes} épisode${details.numberOfEpisodes > 1 ? "s" : ""}`
      : null;

  return (
    <article className="space-y-8">
      {/* En-tête : backdrop + affiche + titre + méta */}
      <div>
        <div className="h-40 overflow-hidden rounded-2xl bg-muted sm:h-56 md:h-72">
          {details.backdropUrl ? (
            <img
              src={details.backdropUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="relative -mt-16 flex flex-col gap-4 px-2 sm:-mt-24 sm:flex-row sm:items-end sm:px-6">
          <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl border-4 border-background bg-muted shadow-lg sm:h-56 sm:w-36">
            {details.posterUrl ? (
              <img
                src={details.posterUrl}
                alt={`Affiche de ${details.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="h-8 w-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="pb-1 sm:pb-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{details.title}</h1>
            {details.originalTitle && details.originalTitle !== details.title ? (
              <p className="text-sm italic text-muted-foreground">{details.originalTitle}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{MEDIA_TYPE_LABEL[details.type]}</span>
              {details.year ? <span>· {details.year}</span> : null}
              {!isSeries && details.runtimeMinutes ? (
                <span>· {formatRuntime(details.runtimeMinutes)}</span>
              ) : null}
              {details.book?.pageCount ? <span>· {details.book.pageCount} pages</span> : null}
              {isSeries && seasonLabel ? (
                <span>
                  · {seasonLabel}
                  {episodeLabel ? ` · ${episodeLabel}` : ""}
                </span>
              ) : null}
              {details.status ? <span>· {frenchStatus(details.status)}</span> : null}
              {details.rating != null ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                  {details.rating.toFixed(1)}/10
                  <span className="font-normal text-muted-foreground">
                    ({details.voteCount.toLocaleString("fr-FR")})
                  </span>
                </span>
              ) : null}
            </div>
            {details.genres.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {details.genres.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {g.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {actions ? <div>{actions}</div> : null}

      {details.overview ? (
        <Section title="Synopsis">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {details.overview}
          </p>
        </Section>
      ) : null}

      {details.book ? <BookFacts book={details.book} /> : null}

      {details.cast.length > 0 ? (
        <Section title="Têtes d'affiche">
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {details.cast.map((member, i) => (
              <li key={`${member.name}-${i}`} className="w-24 shrink-0 text-center">
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-muted">
                  {member.profileUrl ? (
                    <img
                      src={member.profileUrl}
                      alt={member.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-medium">{member.name}</p>
                {member.character ? (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{member.character}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Pour un livre, auteurs et éditeur figurent déjà dans le bloc « Le livre » :
          les sections génériques feraient doublon. */}
      {!details.book && details.directors.length > 0 ? (
        <Section title={creditsTitle(details.type, details.directors.length)}>
          <p className="text-sm text-muted-foreground">{details.directors.join(", ")}</p>
        </Section>
      ) : null}

      {details.watchProviders.length > 0 ? (
        <Section title="Disponible sur">
          <ul className="flex flex-wrap items-center gap-3">
            {details.watchProviders.map((p) => (
              <li key={p.name} className="flex items-center gap-2 rounded-lg border bg-card p-2">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt="" className="h-6 w-6 rounded" loading="lazy" />
                ) : null}
                <span className="text-sm">{p.name}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {!details.book && details.productionCompanies.length > 0 ? (
        <Section title="Production">
          <p className="text-sm text-muted-foreground">
            {details.productionCompanies.map((c) => c.name).join(" · ")}
          </p>
        </Section>
      ) : null}
    </article>
  );
}
