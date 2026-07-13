/**
 * Contrat d'un use case applicatif : une entrée typée, une sortie typée, une intention.
 * Les use cases orchestrent le domaine et les ports (SRP — un use case = un cas d'usage).
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
