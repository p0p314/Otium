import { Button, Input, Skeleton } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { ListPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCreateList, useDeleteList, useLists } from "./api/use-lists";

export function ListsPage() {
  const { data, isLoading } = useLists();
  const createList = useCreateList();
  const deleteList = useDeleteList();
  const [name, setName] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createList.mutate(trimmed, { onSuccess: () => setName("") });
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes listes</h1>
        <p className="text-muted-foreground">Regroupez films et séries comme vous le souhaitez.</p>
      </div>

      <form onSubmit={submit} className="flex max-w-md gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom de la liste (ex. À voir ce week-end)"
          aria-label="Nom de la nouvelle liste"
          maxLength={80}
        />
        <Button type="submit" disabled={createList.isPending || name.trim().length === 0}>
          <ListPlus className="h-4 w-4" /> Créer
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Aucune liste pour l'instant</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez votre première liste ci-dessus.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((list) => (
            <li
              key={list.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <Link
                to="/lists/$listId"
                params={{ listId: list.id }}
                className="min-w-0 flex-1 hover:text-primary"
              >
                <p className="line-clamp-1 font-medium">{list.name}</p>
                <p className="text-sm text-muted-foreground">
                  {list.itemCount} élément{list.itemCount > 1 ? "s" : ""}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Supprimer la liste ${list.name}`}
                disabled={deleteList.isPending}
                onClick={() => deleteList.mutate(list.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
