import type { MediaSummary } from "@otium/types";
import { Button } from "@otium/ui";
import { Check, Plus } from "lucide-react";
import { useAuth } from "../../auth/api/use-auth";
import { useAddToLibrary } from "../api/use-library";

/** Ajoute un média à la bibliothèque depuis la recherche. Visible si connecté. */
export function AddToLibraryButton({ media }: { media: MediaSummary }) {
  const { isAuthenticated } = useAuth();
  const add = useAddToLibrary();

  if (!isAuthenticated) return null;

  return (
    <Button
      variant={add.isSuccess ? "secondary" : "outline"}
      size="sm"
      className="mt-2 w-full"
      disabled={add.isPending || add.isSuccess}
      onClick={() => add.mutate(media)}
    >
      {add.isSuccess ? (
        <>
          <Check className="h-4 w-4" /> Ajouté
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> {add.isPending ? "Ajout…" : "Ajouter"}
        </>
      )}
    </Button>
  );
}
