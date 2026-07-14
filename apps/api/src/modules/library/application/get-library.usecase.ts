import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { LIBRARY_REPOSITORY, type LibraryItem, type LibraryRepository } from "../domain";

/** Retourne la bibliothèque de l'utilisateur (média les plus récents d'abord). */
@Injectable()
export class GetLibraryUseCase implements UseCase<string, LibraryItem[]> {
  constructor(@Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository) {}

  execute(userId: string): Promise<LibraryItem[]> {
    return this.library.findByUser(userId);
  }
}
