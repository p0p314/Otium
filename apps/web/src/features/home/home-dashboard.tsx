import type { HomeSeries } from "@otium/types";
import { Skeleton, buttonVariants } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { useHomeDashboard } from "./api/use-home";
import { HomeSeriesCard } from "./components/home-series-card";

const GRID = "grid gap-3 sm:grid-cols-2";

function Section({ title, subtitle, series }: { title: string; subtitle: string; series: HomeSeries[] }) {
  if (series.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className={GRID}>
        {series.map((s) => (
          <HomeSeriesCard key={s.itemId} series={s} />
        ))}
      </div>
    </section>
  );
}

/** Accueil connecté : met en avant les séries à reprendre et celles laissées de côté. */
export function HomeDashboard({ displayName }: { displayName: string }) {
  const { data, isLoading } = useHomeDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className={GRID}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const hasContent =
    data && (data.continueWatching.length > 0 || data.staleSeries.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {displayName}</h1>
        <p className="text-muted-foreground">Reprenez là où vous vous êtes arrêté.</p>
      </div>

      {hasContent ? (
        <>
          <Section
            title="Continuer à regarder"
            subtitle="Vos séries en cours."
            series={data.continueWatching}
          />
          <Section
            title="Laissées de côté"
            subtitle="Pas d'épisode vu depuis un moment — on reprend ?"
            series={data.staleSeries}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Aucune série en cours</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Ajoutez une série et marquez un épisode vu pour la voir apparaître ici.
          </p>
          <Link to="/search" className={buttonVariants({ size: "sm" })}>
            Rechercher une série
          </Link>
        </div>
      )}
    </div>
  );
}
