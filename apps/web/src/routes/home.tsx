import { buttonVariants } from "@otium/ui";
import { Link } from "@tanstack/react-router";

/** Page d'accueil : accroche + accès à la recherche. */
export function HomePage() {
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
      </div>
    </section>
  );
}
