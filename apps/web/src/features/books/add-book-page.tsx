import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AddBookForm } from "./add-book-form";

/**
 * Page de création d'un livre. Une fois créé, on mène directement à sa fiche : c'est là
 * que l'utilisateur pourra l'ajouter à sa bibliothèque, le noter ou suivre sa lecture —
 * le laisser sur un formulaire vidé lui ferait chercher son propre livre.
 */
export function AddBookPage() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/search"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la recherche
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajouter un livre</h1>
        <p className="text-muted-foreground">
          Pour un ouvrage qu'aucun catalogue ne connaît. Seul le titre est obligatoire.
        </p>
      </div>

      <AddBookForm
        onCreated={(media) =>
          navigate({
            to: "/media/$type/$externalId",
            params: { type: media.type, externalId: media.externalRef.externalId },
          })
        }
      />
    </section>
  );
}
