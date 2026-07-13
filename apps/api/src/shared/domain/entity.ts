/**
 * Base d'entité de domaine : identité par `id` (deux entités sont égales si même id).
 * Aucune dépendance framework (Clean Architecture — voir CLAUDE.md).
 */
export abstract class Entity<TId> {
  protected constructor(public readonly id: TId) {}

  equals(other?: Entity<TId>): boolean {
    if (other === undefined || other === null) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}
