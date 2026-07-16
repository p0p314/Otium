import type { MediaSummary } from "@otium/types";
import { Button } from "@otium/ui";
import { Check, Loader2, Plus } from "lucide-react";
import { useAuth } from "../../auth/api/use-auth";
import { useAddToLibrary } from "../api/use-library";

/**
 * Ajout à la bibliothèque. Deux présentations selon le contexte :
 * - `compact` (vignettes de recherche) : icône superposée sur l'affiche, **1 tap**,
 *   fond translucide lisible sur toute affiche ;
 * - par défaut (fiche média) : bouton **libellé** pleine largeur, plus explicite.
 * Visible seulement si connecté.
 */
export function AddToLibraryButton({
  media,
  compact = false,
}: {
  media: MediaSummary;
  compact?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const add = useAddToLibrary();

  if (!isAuthenticated) return null;

  const done = add.isSuccess;

  if (compact) {
    return (
      <Button
        size="icon"
        aria-label={done ? `${media.title} ajouté` : `Ajouter ${media.title} à ma bibliothèque`}
        className={
          done
            ? "h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-sm"
            : "h-9 w-9 rounded-full border border-border bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background"
        }
        disabled={add.isPending || done}
        onClick={() => add.mutate(media)}
      >
        {done ? (
          <Check className="h-4 w-4" />
        ) : add.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={done ? "secondary" : "primary"}
      className="w-full"
      disabled={add.isPending || done}
      onClick={() => add.mutate(media)}
    >
      {done ? (
        <>
          <Check className="h-4 w-4" /> Ajouté à ma bibliothèque
        </>
      ) : (
        <>
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {add.isPending ? "Ajout…" : "Ajouter à ma bibliothèque"}
        </>
      )}
    </Button>
  );
}
