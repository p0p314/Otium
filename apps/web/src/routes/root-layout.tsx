import { Outlet } from "@tanstack/react-router";
import { ThemeToggle } from "../components/theme-toggle";

/** Coquille applicative : en-tête + zone de contenu routée. */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">
            Otium<span className="text-primary">.</span>
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
