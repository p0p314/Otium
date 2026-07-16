import type { MediaSummary } from "@otium/types";
import { Button } from "@otium/ui";
import { Check, Loader2, Plus } from "lucide-react";
import { useAuth } from "../../auth/api/use-auth";
import { useAddToLibrary } from "../api/use-library";

/**
 * Ajout rapide à la bibliothèque depuis une affiche — **1 tap**, icône superposée.
 * Fond translucide pour rester lisible sur n'importe quelle affiche. Visible si connecté.
 */
export function AddToLibraryButton({ media }: { media: MediaSummary }) {
  const { isAuthenticated } = useAuth();
  const add = useAddToLibrary();

  if (!isAuthenticated) return null;

  const done = add.isSuccess;
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
