import { Button, Skeleton, buttonVariants } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clapperboard,
  Clock,
  Film,
  ListVideo,
  PlayCircle,
  Star,
  Trophy,
  Tv,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useViewingStats } from "./api/use-stats";
import { MonthlyActivityChart } from "./components/monthly-activity-chart";
import { ReadingPanel } from "./components/reading-panel";
import { StatTile } from "./components/stat-tile";
import { TopGenresChart } from "./components/top-genres-chart";
import { TypeBreakdownChart } from "./components/type-breakdown-chart";
import { formatLongDuration, formatMinutes, monthLong } from "./lib/format";

const ICON = "h-4 w-4";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StatsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useViewingStats();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
        <p className="text-muted-foreground">Votre activité de visionnage et de lecture en un coup d'œil.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Impossible de charger vos statistiques</p>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : data.breakdown.movies + data.breakdown.series + data.breakdown.books === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Aucune statistique pour l'instant</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Ajoutez des films, séries et livres, suivez-les : vos statistiques se construiront
            automatiquement.
          </p>
          <Link to="/search" className={buttonVariants({ size: "sm" })}>
            Rechercher un média
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              label="Films vus"
              value={data.totals.moviesCompleted}
              icon={<Film className={ICON} />}
            />
            <StatTile
              label="Séries vues"
              value={data.totals.seriesCompleted}
              icon={<Tv className={ICON} />}
            />
            <StatTile
              label="Épisodes vus"
              value={data.totals.episodesWatched}
              icon={<ListVideo className={ICON} />}
            />
            <StatTile
              label="Note moyenne"
              value={data.totals.averageRating != null ? `${data.totals.averageRating.toFixed(1)}/10` : "—"}
              icon={<Star className={ICON} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Temps total"
              value={formatLongDuration(data.totals.totalMinutes)}
              hint={formatMinutes(data.totals.totalMinutes)}
              icon={<Clock className={ICON} />}
            />
            <StatTile
              label="Temps films"
              value={formatLongDuration(data.totals.movieMinutes)}
              hint={formatMinutes(data.totals.movieMinutes)}
              icon={<Film className={ICON} />}
            />
            <StatTile
              label="Temps séries"
              value={formatLongDuration(data.totals.seriesMinutes)}
              hint={formatMinutes(data.totals.seriesMinutes)}
              icon={<Tv className={ICON} />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Répartition par type">
              <TypeBreakdownChart
                movies={data.breakdown.movies}
                series={data.breakdown.series}
                books={data.breakdown.books}
              />
            </Panel>
            <Panel title="Genres les plus regardés">
              <TopGenresChart genres={data.topGenres} />
            </Panel>
          </div>

          {data.breakdown.books > 0 ? <ReadingPanel reading={data.reading} /> : null}

          <Panel title="Activité des 12 derniers mois">
            <MonthlyActivityChart data={data.activityByMonth} />
          </Panel>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile
              label="Séries en cours"
              value={data.totals.seriesInProgress}
              icon={<PlayCircle className={ICON} />}
            />
            <StatTile
              label="Séries terminées"
              value={data.totals.seriesCompleted}
              icon={<CheckCircle2 className={ICON} />}
            />
            <StatTile
              label="Séries abandonnées"
              value={data.totals.seriesDropped}
              icon={<XCircle className={ICON} />}
            />
            <StatTile
              label="Mois le plus actif"
              value={data.records.busiestMonth ? monthLong(data.records.busiestMonth.month) : "—"}
              hint={
                data.records.busiestMonth
                  ? formatMinutes(data.records.busiestMonth.minutes)
                  : undefined
              }
              icon={<Trophy className={ICON} />}
            />
            <StatTile
              label="Plus longue série"
              value={data.records.longestSeries ? data.records.longestSeries.title : "—"}
              hint={
                data.records.longestSeries
                  ? `${data.records.longestSeries.episodes} épisodes vus`
                  : undefined
              }
              icon={<Clapperboard className={ICON} />}
            />
          </div>
        </>
      )}
    </section>
  );
}
