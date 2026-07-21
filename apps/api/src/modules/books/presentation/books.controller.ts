import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CreateBookInput, type MediaSummary } from "@otium/types";
import { AuthGuard } from "../../authentication/presentation/auth.guard";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { toCatalogMedia } from "../domain";
import { CreateBookUseCase } from "../application/create-book.usecase";

@Controller("books")
@UseGuards(AuthGuard)
export class BooksController {
  constructor(private readonly createBook: CreateBookUseCase) {}

  /**
   * `POST /api/books` — crée un livre absent des catalogues.
   *
   * Renvoie le **résumé de média** plutôt qu'une forme propre aux livres : le client
   * enchaîne ainsi directement sur l'ajout en bibliothèque, avec la même charge utile que
   * pour n'importe quel résultat de recherche. Le livre créé n'a rien d'un cas
   * particulier.
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateBookInput)) input: CreateBookInput,
  ): Promise<MediaSummary> {
    const book = await this.createBook.execute(input);
    const media = toCatalogMedia(book);
    return {
      type: media.type,
      title: media.title,
      year: media.year,
      posterUrl: media.posterUrl,
      genres: media.genres.map((genre) => ({ id: genre.id, label: genre.label })),
      externalRef: { ...media.externalRef },
    };
  }
}
