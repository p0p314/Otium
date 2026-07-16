import type { UpcomingDashboard } from "@otium/types";
import { cn } from "@otium/ui";
import { useState } from "react";
import { UpcomingList } from "./upcoming-list";
import { UpcomingMovieList } from "./upcoming-movie-list";

type MediaTab = "series" | "movies";

/**
 * Agenda « À venir » cloisonné par type de média (jamais mélangés) : sous-onglets
 * Séries (prochains épisodes) / Films (prochaines sorties).
 */
export function UpcomingView({ data }: { data: UpcomingDashboard }) {
  const [tab, setTab] = useState<MediaTab>("series");

  const tabs = [
    ["series", "Séries", data.series.length],
    ["movies", "Films", data.movies.length],
  ] as const;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Type de média" className="inline-flex gap-1 rounded-full bg-muted p-1">
        {tabs.map(([value, label, count]) => (
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
            <span className="ml-1.5 text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {tab === "series" ? (
        <UpcomingList episodes={data.series} />
      ) : (
        <UpcomingMovieList movies={data.movies} />
      )}
    </div>
  );
}
