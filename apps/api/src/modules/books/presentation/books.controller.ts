import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CreateBookInput, type MediaSummary, type SearchMediaResult } from "@otium/types";
import { AuthGuard } from "../../authentication/presentation/auth.guard";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { toSearchMediaResult } from "../../media/presentation/media.mapper";
import { toCatalogMedia } from "../domain";
import { CreateBookUseCase } from "../application/create-book.usecase";
import { GetBookDiscoveriesUseCase } from "../application/get-book-discoveries.usecase";

@Controller("books")
export class BooksController {
  constructor(
    private readonly createBook: CreateBookUseCase,
    private readonly getDiscoveries: GetBookDiscoveriesUseCase,
  ) {}

  /**
   * `GET /api/books/discover` — livres à découvrir.
   *
   * Volontairement **public** : la découverte est une vitrine, comme les tendances
   * films/séries. Servi depuis l'instantané en base, jamais par un appel à la source.
   */
  @Get("discover")
  async discover(): Promise<SearchMediaResult> {
    const result = await this.getDiscoveries.execute();
    return toSearchMediaResult(result);
  }

  /**
   * `POST /api/books` — crée un livre absent des catalogues.
   *
   * Renvoie le **résumé de média** plutôt qu'une forme propre aux livres : le client
   * enchaîne ainsi directement sur l'ajout en bibliothèque, avec la même charge utile que
   * pour n'importe quel résultat de recherche. Le livre créé n'a rien d'un cas
   * particulier.
   */
  @Post()
  @UseGuards(AuthGuard)
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
