import type { MediaType } from "@otium/types";
import { Skeleton } from "@otium/ui";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Clock, Star, UserRound } from "lucide-react";
import { EpisodeUserSection } from "./components/episode-user-section";
import { useEpisodeDetails } from "./api/use-episode-details";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Fiche d'un épisode : image, résumé, métadonnées, casting et action « vu ». */
export function EpisodeDetailPage() {
  const params = useParams({ strict: false }) as {
    type: MediaType;
    externalId: string;
    season: string;
    episode: string;
  };
  const season = Number(params.season);
  const episode = Number(params.episode);
  const { data, isLoading, isError } = useEpisodeDetails(params.externalId, season, episode);

  const backLink = (
    <Link
      to="/media/$type/$externalId"
      params={{ type: params.type, externalId: params.externalId }}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Retour à la série
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {backLink}
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-4">
        {backLink}
        <p className="text-destructive">Impossible de charger cet épisode.</p>
      </div>
    );
  }

  const air = formatDate(data.airDate);

  return (
    <article className="space-y-6">
      {backLink}

      {data.stillUrl ? (
        <img
          src={data.stillUrl}
          alt={`Image de ${data.title}`}
          className="aspect-video w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : null}

      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">
          Saison {data.seasonNumber} · Épisode {data.number}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {air ? <span>{air}</span> : null}
          {data.runtimeMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {data.runtimeMinutes} min
            </span>
          ) : null}
          {data.rating ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" /> {data.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </header>

      <EpisodeUserSection externalId={params.externalId} season={season} episode={episode} />

      {data.overview ? (
        <p className="leading-relaxed text-foreground/90">{data.overview}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Pas de résumé disponible pour cet épisode.</p>
      )}

      {data.cast.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Distribution</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.cast.map((member) => (
              <li key={`${member.name}-${member.character ?? ""}`} className="flex items-center gap-2">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  {member.profileUrl ? (
                    <img
                      src={member.profileUrl}
                      alt={member.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <UserRound className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{member.name}</p>
                  {member.character ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{member.character}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
