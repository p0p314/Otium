import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { LIBRARY_REPOSITORY, type LibraryItem, type LibraryRepository } from "../domain";

export interface GetLibraryItemInput {
  userId: string;
  itemId: string;
}

/** Retourne un élément de bibliothèque (détail). */
@Injectable()
export class GetLibraryItemUseCase implements UseCase<GetLibraryItemInput, LibraryItem> {
  constructor(@Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository) {}

  async execute({ userId, itemId }: GetLibraryItemInput): Promise<LibraryItem> {
    const item = await this.library.findItem(userId, itemId);
    if (!item) throw new NotFoundException("Élément de bibliothèque introuvable.");
    return item;
  }
}
