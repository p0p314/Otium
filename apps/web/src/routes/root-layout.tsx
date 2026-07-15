import { Button, buttonVariants } from "@otium/ui";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth, useLogout } from "../features/auth/api/use-auth";
import { ThemeToggle } from "../components/theme-toggle";

/** Coquille applicative : en-tête + navigation + état d'authentification. */
export function RootLayout() {
  const { user, isAuthenticated } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();

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
              {isAuthenticated ? (
                <>
                  <Link
                    to="/library"
                    className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
                  >
                    Ma bibliothèque
                  </Link>
                  <Link
                    to="/lists"
                    className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
                  >
                    Mes listes
                  </Link>
                </>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user?.displayName}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: "/" }) })}
                >
                  Se déconnecter
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Connexion
                </Link>
                <Link to="/register" className={buttonVariants({ size: "sm" })}>
                  Créer un compte
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
