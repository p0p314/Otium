import { cn } from "@otium/ui";
import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { NotificationSettings } from "../notifications/components/notification-settings";
import { ImportPage } from "../import/import-page";
import { ProfileInfo } from "./components/profile-info";

type Tab = "profile" | "notifications" | "import";

const TABS = [
  ["profile", "Profil"],
  ["notifications", "Notifications"],
  ["import", "Importer"],
] as const;

function isTab(value: string | undefined): value is Tab {
  return value === "profile" || value === "notifications" || value === "import";
}

/** Page profil : infos utilisateur et import de données. Mobile-first. */
export function ProfilePage() {
  // Onglet initial pilotable par l'URL (`?tab=import`) — ex. invite d'import post-inscription.
  // On valide la valeur au lieu de la croire sur parole : un ancien lien (`?tab=settings`,
  // onglet supprimé) ou une URL bricolée doit retomber sur le profil, pas ailleurs.
  const search = useSearch({ strict: false }) as { tab?: string };
  const [tab, setTab] = useState<Tab>(isTab(search.tab) ? search.tab : "profile");

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

      {tab === "profile" ? (
        <ProfileInfo />
      ) : tab === "notifications" ? (
        <NotificationSettings />
      ) : (
        <ImportPage />
      )}
    </section>
  );
}
