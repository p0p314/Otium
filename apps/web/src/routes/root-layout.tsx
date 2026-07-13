import { Link, Outlet } from "@tanstack/react-router";
import { ThemeToggle } from "../components/theme-toggle";

/** Coquille applicative : en-tête + navigation + zone de contenu routée. */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              Otium<span className="text-primary">.</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                to="/search"
                className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
              >
                Rechercher
              </Link>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
