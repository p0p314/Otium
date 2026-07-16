import type { HomeSeries } from "@otium/types";
import { Skeleton, buttonVariants, cn } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useHomeDashboard } from "./api/use-home";
import { useUpcoming } from "./api/use-upcoming";
import { HomeSeriesCard } from "./components/home-series-card";
import { UpcomingView } from "./components/upcoming-view";

const GRID = "grid gap-3 sm:grid-cols-2";

type Tab = "dashboard" | "upcoming";

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

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <p className="font-medium">Rien à suivre pour l'instant</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Ajoutez une série : dès qu'un épisode est sorti, elle apparaît ici (à voir ou à reprendre).
      </p>
      <Link to="/search" className={buttonVariants({ size: "sm" })}>
        Rechercher une série
      </Link>
    </div>
  );
}

/** Accueil connecté : tableau de bord (à voir / à reprendre) et onglet « À venir ». */
export function HomeDashboard({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const dashboard = useHomeDashboard();
  // Récupéré paresseusement : seulement quand l'onglet « À venir » est ouvert.
  const upcoming = useUpcoming();

  const series = dashboard.data?.series;
  const hasDashboard =
    series &&
    (series.toWatch.length > 0 || series.toResume.length > 0 || series.toStart.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {displayName}</h1>
        <p className="text-muted-foreground">Reprenez là où vous vous êtes arrêté.</p>
      </div>

      {/* Onglets : tableau de bord ou agenda « à venir ». */}
      <div role="tablist" aria-label="Vue" className="inline-flex gap-1 rounded-full bg-muted p-1">
        {(
          [
            ["dashboard", "À suivre"],
            ["upcoming", "À venir"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        dashboard.isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : hasDashboard ? (
          <div className="space-y-8">
            <Section
              title="À voir"
              subtitle="Séries en cours, vues récemment."
              series={series.toWatch}
            />
            <Section
              title="À reprendre"
              subtitle="Séries laissées de côté ce dernier trimestre."
              series={series.toResume}
            />
            <Section
              title="À commencer"
              subtitle="Séries pas encore commencées, déjà disponibles."
              series={series.toStart}
            />
          </div>
        ) : (
          <EmptyDashboard />
        )
      ) : upcoming.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <UpcomingView data={upcoming.data ?? { series: [], movies: [] }} />
      )}
    </div>
  );
}
