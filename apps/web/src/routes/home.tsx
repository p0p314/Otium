import { buttonVariants } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../features/auth/api/use-auth";
import { HomeDashboard } from "../features/home/home-dashboard";

/** Page d'accueil : tableau de bord si connecté, accroche marketing sinon. */
export function HomePage() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return <HomeDashboard displayName={user.displayName} />;
  }

  return (
    <section className="flex flex-col items-start gap-6 py-10">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        MVP — recherche de médias
      </span>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Suivez tout ce que vous regardez, lisez et jouez.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Otium réunit films, séries et bientôt bien plus dans une bibliothèque unique, rapide et
        soignée.
      </p>
      <div className="flex gap-3">
        <Link to="/search" className={buttonVariants({ size: "lg" })}>
          Commencer
        </Link>
        <Link to="/register" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Créer un compte
        </Link>
      </div>
    </section>
  );
}
