/**
 * Base de value object : égalité **structurelle** (par valeur), immuable.
 */
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected constructor(protected readonly props: Readonly<T>) {
    Object.freeze(props);
  }

  equals(other?: ValueObject<T>): boolean {
    if (other === undefined || other === null) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
