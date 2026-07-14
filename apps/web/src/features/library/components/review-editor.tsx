import { Button } from "@otium/ui";
import { useEffect, useState } from "react";
import { useDeleteReview, useReview, useSaveReview } from "../api/use-item-detail";

/** Éditeur d'avis (texte libre) pour un élément de bibliothèque. */
export function ReviewEditor({ itemId }: { itemId: string }) {
  const { data: review, isLoading } = useReview(itemId);
  const save = useSaveReview(itemId);
  const del = useDeleteReview(itemId);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(review?.body ?? "");
  }, [review]);

  const trimmed = draft.trim();
  const unchanged = trimmed === (review?.body ?? "");

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Mon avis</h2>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={isLoading || save.isPending}
        rows={4}
        maxLength={5000}
        placeholder="Qu'avez-vous pensé de ce titre ?"
        className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={trimmed.length === 0 || unchanged || save.isPending}
          onClick={() => save.mutate({ body: trimmed })}
        >
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {review ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={del.isPending}
            onClick={() => del.mutate()}
          >
            Supprimer
          </Button>
        ) : null}
      </div>
    </div>
  );
}
