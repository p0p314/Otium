import type { CreateBookInput, MediaSummary } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createBook = vi.fn();
vi.mock("../../lib/api", () => ({ api: { createBook: (input: CreateBookInput) => createBook(input) } }));

import { AddBookForm } from "./add-book-form";

const created: MediaSummary = {
  type: "BOOK",
  title: "Carnet",
  year: null,
  posterUrl: null,
  genres: [],
  externalRef: { provider: "books", externalId: "own-1" },
};

function renderForm(onCreated = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AddBookForm onCreated={onCreated} />
    </QueryClientProvider>,
  );
  return onCreated;
}

describe("AddBookForm", () => {
  beforeEach(() => {
    createBook.mockReset();
    createBook.mockResolvedValue(created);
  });

  it("crée un livre avec le seul titre", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Titre"), "Carnet de voyage");
    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    await waitFor(() => expect(createBook).toHaveBeenCalled());
    expect(createBook.mock.calls[0]?.[0]).toMatchObject({
      title: "Carnet de voyage",
      description: null,
      pageCount: null,
      isbn: null,
    });
  });

  it("refuse un titre vide et n'appelle pas l'API", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    expect(await screen.findByText("Le titre est obligatoire")).toBeInTheDocument();
    expect(createBook).not.toHaveBeenCalled();
  });

  it("découpe auteurs et catégories saisis en texte libre", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Titre"), "T");
    await userEvent.type(screen.getByLabelText("Auteur(s)"), "Camus, Sartre");
    await userEvent.type(screen.getByLabelText("Catégories"), "Roman, Essai");
    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    await waitFor(() => expect(createBook).toHaveBeenCalled());
    expect(createBook.mock.calls[0]?.[0]).toMatchObject({
      authors: ["Camus", "Sartre"],
      categories: ["Roman", "Essai"],
    });
  });

  it("convertit le nombre de pages saisi en texte", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Titre"), "T");
    await userEvent.type(screen.getByLabelText("Nombre de pages"), "320");
    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    await waitFor(() => expect(createBook).toHaveBeenCalled());
    expect(createBook.mock.calls[0]?.[0]?.pageCount).toBe(320);
  });

  it("signale une URL de couverture invalide", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Titre"), "T");
    await userEvent.type(screen.getByLabelText("Couverture (URL)"), "pas-une-url");
    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    expect(await screen.findByText("URL invalide")).toBeInTheDocument();
    expect(createBook).not.toHaveBeenCalled();
  });

  it("prévient l'appelant du livre créé", async () => {
    const onCreated = renderForm(vi.fn());

    await userEvent.type(screen.getByLabelText("Titre"), "T");
    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  });

  it("signale un échec sans perdre la saisie", async () => {
    createBook.mockRejectedValue(new Error("boom"));
    renderForm();

    await userEvent.type(screen.getByLabelText("Titre"), "Carnet");
    await userEvent.click(screen.getByRole("button", { name: "Créer le livre" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/n'a pas pu être créé/);
    expect(screen.getByLabelText("Titre")).toHaveValue("Carnet");
  });
});
