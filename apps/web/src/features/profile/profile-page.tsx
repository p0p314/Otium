import { cn } from "@otium/ui";
import { useState } from "react";
import { ImportPage } from "../import/import-page";
import { ProfileInfo } from "./components/profile-info";
import { SearchSettings } from "./components/search-settings";

type Tab = "profile" | "import" | "settings";

const TABS = [
  ["profile", "Profil"],
  ["import", "Importer"],
  ["settings", "Réglages"],
] as const;

/** Page profil : infos utilisateur, import de données, et réglages. Mobile-first. */
export function ProfilePage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>

      <div
        role="tablist"
        aria-label="Section du profil"
        className="inline-flex gap-1 rounded-full bg-muted p-1"
      >
        {TABS.map(([value, label]) => (
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

      {tab === "profile" ? <ProfileInfo /> : tab === "import" ? <ImportPage /> : <SearchSettings />}
    </section>
  );
}
