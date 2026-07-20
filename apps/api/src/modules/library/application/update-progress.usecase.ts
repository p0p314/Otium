import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import {
  BookCompleted,
  consumptionDates,
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  normalizeProgress,
  type ProgressState,
  type ProgressUnit,
  ProgressUpdated,
  statusFromProgress,
  WatchStatusChanged,
} from "../domain";

export interface UpdateProgressInput {
  readonly userId: string;
  readonly itemId: string;
  readonly unit: ProgressUnit;
  readonly value: number;
  /** Total saisi par l'utilisateur quand le catalogue l'ignore (livre sans pagination). */
  readonly total?: number | null;
}

/**
 * Enregistre l'avancement d'un média à progression continue : normalise la saisie, en
 * déduit statut et dates (règles pures du domaine), journalise le delta pour les
 * statistiques, puis publie les événements métier correspondants (ADR-0017).
 */
@Injectable()
export class UpdateProgressUseCase implements UseCase<UpdateProgressInput, LibraryItem> {
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: UpdateProgressInput): Promise<LibraryItem> {
    const existing = await this.library.findItem(input.userId, input.itemId);
    if (!existing) throw new NotFoundException("Élément de bibliothèque introuvable.");
    if (existing.media.type !== "BOOK") {
      // Les séries se suivent par épisodes et les films sont binaires : accepter une
      // progression continue ici créerait deux sources de vérité pour un même média.
      throw new BadRequestException(
        "La progression continue ne s'applique pas à ce type de média.",
      );
    }

    const progress = normalizeProgress({
      unit: input.unit,
      value: input.value,
      total: this.resolveTotal(input, existing),
    });
    const status = statusFromProgress(existing.status, progress);
    const now = new Date();
    const dates = consumptionDates(existing, status, now);
    const previousValue = this.previousValue(existing.progress, progress.unit);

    const item = await this.library.saveProgress(input.userId, input.itemId, {
      progress,
      status,
      ...dates,
      // Un avancement nul (correction de saisie, retour en arrière) ne pollue pas
      // l'historique : seules les progressions réelles alimentent les statistiques.
      entry:
        progress.value > previousValue
          ? { from: previousValue, to: progress.value, occurredAt: now }
          : null,
    });

    await this.publish(input, existing.status, item, previousValue, progress);
    return item;
  }

  /**
   * Total retenu, par ordre de confiance : saisie explicite, puis total déjà enregistré,
   * puis pagination connue du catalogue. `null` reste possible (livre non paginé).
   */
  private resolveTotal(input: UpdateProgressInput, existing: LibraryItem): number | null {
    if (input.total != null) return input.total;
    if (existing.progress?.unit === input.unit && existing.progress.total != null) {
      return existing.progress.total;
    }
    return input.unit === "PAGES" ? (existing.media.book?.pageCount ?? null) : null;
  }

  /** Valeur de départ du delta : 0 si l'unité change (les deux échelles diffèrent). */
  private previousValue(previous: ProgressState | null, unit: ProgressUnit): number {
    return previous && previous.unit === unit ? previous.value : 0;
  }

  private async publish(
    input: UpdateProgressInput,
    previousStatus: LibraryItem["status"],
    item: LibraryItem,
    previousValue: number,
    progress: ProgressState,
  ): Promise<void> {
    if (progress.value !== previousValue) {
      await this.events.publish(
        new ProgressUpdated(input.userId, item.id, progress.unit, previousValue, progress.value),
      );
    }
    if (item.status !== previousStatus) {
      await this.events.publish(new WatchStatusChanged(input.userId, item.id, item.status));
      if (item.status === "COMPLETED") {
        await this.events.publish(new BookCompleted(input.userId, item.id));
      }
    }
  }
}

/** Fixe manuellement les dates de début/fin de consommation. */
@Injectable()
export class SetConsumptionDatesUseCase {
  constructor(@Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository) {}

  async execute(input: {
    userId: string;
    itemId: string;
    startedAt?: Date | null;
    finishedAt?: Date | null;
  }): Promise<LibraryItem> {
    const existing = await this.library.findItem(input.userId, input.itemId);
    if (!existing) throw new NotFoundException("Élément de bibliothèque introuvable.");
    return this.library.setConsumptionDates(input.userId, input.itemId, {
      ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
      ...(input.finishedAt !== undefined ? { finishedAt: input.finishedAt } : {}),
    });
  }
}
