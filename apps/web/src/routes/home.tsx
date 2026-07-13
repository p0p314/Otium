import { Button } from "@otium/ui";

/** Page d'accueil (placeholder Phase 0 — les fonctionnalités arrivent au MVP). */
export function HomePage() {
  return (
    <section className="flex flex-col items-start gap-6 py-10">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        Phase 0 — fondations
      </span>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Suivez tout ce que vous regardez, lisez et jouez.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Otium réunit films, séries et bientôt bien plus dans une bibliothèque unique, rapide et
        soignée.
      </p>
      <div className="flex gap-3">
        <Button size="lg">Commencer</Button>
        <Button size="lg" variant="outline">
          En savoir plus
        </Button>
      </div>
    </section>
  );
}
