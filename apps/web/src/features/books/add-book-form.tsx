import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateBookInput, MediaSummary } from "@otium/types";
import { Button } from "@otium/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../lib/api";
import { Field } from "../auth/components/field";

/**
 * Schéma **du formulaire**, distinct du contrat d'API : auteurs et catégories y sont du
 * texte libre séparé par des virgules, et le nombre de pages une chaîne. Valider les
 * valeurs brutes contre le contrat rejetterait toute saisie — c'est la conversion qui
 * les met en forme, au moment de l'envoi.
 */
const BookForm = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(300),
  authors: z.string().optional(),
  publisher: z.string().optional(),
  publishedDate: z.string().optional(),
  pageCount: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v.trim()), "Indiquez un nombre de pages"),
  isbn: z.string().optional(),
  language: z.string().optional(),
  categories: z.string().optional(),
  coverUrl: z
    .string()
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v.trim()).success, "URL invalide"),
  description: z.string().optional(),
});
type BookForm = z.infer<typeof BookForm>;

/** Met la saisie en forme pour l'API : texte vide → absent, listes découpées. */
function toCreateInput(values: BookForm): CreateBookInput {
  const text = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  const list = (value: string | undefined) => {
    const items = (value ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  };
  const pages = values.pageCount?.trim();
  return {
    title: values.title.trim(),
    subtitle: null,
    ...(list(values.authors) ? { authors: list(values.authors) } : {}),
    ...(list(values.categories) ? { categories: list(values.categories) } : {}),
    description: text(values.description),
    coverUrl: text(values.coverUrl),
    publishedDate: text(values.publishedDate),
    pageCount: pages ? Number(pages) : null,
    isbn: text(values.isbn),
    language: text(values.language),
    publisher: text(values.publisher),
  };
}

/**
 * Saisie d'un livre absent des catalogues.
 *
 * **Seul le titre est obligatoire** : le formulaire sert précisément les ouvrages dont on
 * sait peu de choses — rares, anciens, auto-édités. Tout le reste est présenté comme
 * facultatif, sans astérisque ni contrainte cachée qui bloquerait l'enregistrement.
 *
 * Les auteurs et catégories sont saisis en texte libre séparé par des virgules : demander
 * une liste structurée pour deux noms serait disproportionné.
 */
export function AddBookForm({ onCreated }: { onCreated: (media: MediaSummary) => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookForm>({ resolver: zodResolver(BookForm) });

  const create = useMutation({
    mutationFn: (input: CreateBookInput) => api.createBook(input),
    onSuccess: (media) => {
      // Le livre devient immédiatement visible en recherche : les résultats en cache
      // sont périmés.
      queryClient.invalidateQueries({ queryKey: ["media-search"] });
      reset();
      onCreated(media);
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => create.mutate(toCreateInput(values)))}
    >
      <Field
        id="book-title"
        label="Titre"
        placeholder="Le titre de l'ouvrage"
        autoFocus
        {...(errors.title?.message ? { error: errors.title.message } : {})}
        {...register("title")}
      />

      <p className="text-sm text-muted-foreground">
        Les champs suivants sont facultatifs — renseignez ce que vous connaissez.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="book-authors" label="Auteur(s)" placeholder="Séparés par des virgules" {...register("authors")} />
        <Field id="book-publisher" label="Éditeur" {...register("publisher")} />
        <Field id="book-published" label="Année de publication" placeholder="1998" {...register("publishedDate")} />
        <Field
          id="book-pages"
          label="Nombre de pages"
          type="number"
          min={1}
          {...(errors.pageCount?.message ? { error: errors.pageCount.message } : {})}
          {...register("pageCount")}
        />
        <Field id="book-isbn" label="ISBN" placeholder="978-…" {...register("isbn")} />
        <Field id="book-language" label="Langue" placeholder="fr" {...register("language")} />
        <Field id="book-categories" label="Catégories" placeholder="Séparées par des virgules" {...register("categories")} />
        <Field
          id="book-cover"
          label="Couverture (URL)"
          placeholder="https://…"
          {...(errors.coverUrl?.message ? { error: errors.coverUrl.message } : {})}
          {...register("coverUrl")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="book-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="book-description"
          rows={4}
          className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register("description")}
        />
      </div>

      {create.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Le livre n'a pas pu être créé. Réessayez.
        </p>
      ) : null}

      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? "Création…" : "Créer le livre"}
      </Button>
    </form>
  );
}
