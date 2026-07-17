import { Skeleton, buttonVariants } from "@otium/ui";
import { Link, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { ThemeToggle } from "../components/theme-toggle";
import { NAV_ITEMS } from "../components/nav-items";
import { BottomNav } from "../components/bottom-nav";
import { ProfileMenu } from "../components/profile-menu";
import { useAuth } from "../features/auth/api/use-auth";

const NAV_LINK =
  "text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground";

/** Coquille applicative responsive : en-tête (desktop) + barre d'onglets (mobile). */
export function RootLayout() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              Otium<span className="text-primary">.</span>
            </Link>
            {/* Navigation inline : desktop uniquement (mobile → barre d'onglets). */}
            <nav className="hidden items-center gap-4 text-sm md:flex">
              {NAV_ITEMS.filter((item) => !item.auth || isAuthenticated).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact ?? false }}
                  className={NAV_LINK}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              // Profil : menu déroulant (Réglages, Statistiques). La page profil porte
              // aussi infos, import et déconnexion.
              <ProfileMenu displayName={user?.displayName} />
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className={`${buttonVariants({ size: "sm" })} hidden sm:inline-flex`}
                >
                  Créer un compte
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Marge basse mobile pour dégager la barre d'onglets fixe. */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:py-10">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Outlet />
        </Suspense>
      </main>

      <BottomNav />
    </div>
  );
}
