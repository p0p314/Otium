import type { MediaSummary } from "@otium/types";
import { Button, Select } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { useAddToList, useLists } from "../api/use-lists";

/** Ajoute un média à l'une des listes de l'utilisateur (depuis une fiche). */
export function AddToListControl({ media }: { media: MediaSummary }) {
  const { data: lists } = useLists();
  const addToList = useAddToList();
  const [listId, setListId] = useState("");

  if (!lists) return null;
  if (lists.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune liste.{" "}
        <Link to="/lists" className="font-medium text-primary hover:underline">
          Créer une liste
        </Link>{" "}
        pour y ajouter ce titre.
      </p>
    );
  }

  const selected = listId || lists[0]?.id || "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Choisir une liste"
        className="max-w-[16rem]"
        value={selected}
        onChange={(event) => setListId(event.target.value)}
      >
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        size="sm"
        disabled={addToList.isPending || !selected}
        onClick={() => addToList.mutate({ listId: selected, media })}
      >
        {addToList.isSuccess ? (
          <>
            <Check className="h-4 w-4" /> Ajouté
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Ajouter à la liste
          </>
        )}
      </Button>
    </div>
  );
}
