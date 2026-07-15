import { z, type ZodErrorMap } from "zod";

/**
 * Carte d'erreurs Zod en français — messages de validation partagés front/back.
 * Zod v3 émet des messages en anglais par défaut ; on les localise ici, une seule
 * fois, pour que l'API (pipe de validation) et le web (React Hook Form) parlent
 * la même langue sans dupliquer les libellés (CLAUDE.md §4/§10).
 */

function typeLabel(expected: string): string {
  const labels: Record<string, string> = {
    string: "une chaîne de caractères",
    number: "un nombre",
    boolean: "un booléen",
    array: "une liste",
    object: "un objet",
    date: "une date",
    integer: "un entier",
  };
  return labels[expected] ?? expected;
}

/** Décrit une borne (min/max) avec le bon vocabulaire selon le type validé. */
function tooSmall(issue: z.ZodTooSmallIssue): string {
  const min = Number(issue.minimum);
  const bound = issue.inclusive ? min : min + 1;
  if (issue.type === "string") {
    return min <= 1 ? "Ce champ est requis." : `Au moins ${bound} caractères sont requis.`;
  }
  if (issue.type === "array") return `Au moins ${bound} élément(s) sont requis.`;
  return `La valeur doit être supérieure ou égale à ${issue.inclusive ? min : min + 1}.`;
}

function tooBig(issue: z.ZodTooBigIssue): string {
  const max = Number(issue.maximum);
  if (issue.type === "string") return `${max} caractères au maximum sont autorisés.`;
  if (issue.type === "array") return `${max} élément(s) au maximum sont autorisés.`;
  return `La valeur doit être inférieure ou égale à ${issue.inclusive ? max : max - 1}.`;
}

export const frenchErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Ce champ est requis." };
      }
      return { message: `La valeur attendue est ${typeLabel(issue.expected)}.` };
    case z.ZodIssueCode.invalid_string: {
      if (issue.validation === "email") return { message: "Adresse e-mail invalide." };
      if (issue.validation === "url") return { message: "URL invalide." };
      if (issue.validation === "datetime") return { message: "Date invalide." };
      return { message: "Format invalide." };
    }
    case z.ZodIssueCode.too_small:
      return { message: tooSmall(issue) };
    case z.ZodIssueCode.too_big:
      return { message: tooBig(issue) };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Valeur non autorisée." };
    case z.ZodIssueCode.not_multiple_of:
      return { message: `La valeur doit être un multiple de ${issue.multipleOf}.` };
    case z.ZodIssueCode.invalid_date:
      return { message: "Date invalide." };
    default:
      return { message: ctx.defaultError };
  }
};

/**
 * Active les messages d'erreur Zod en français globalement.
 * À appeler une fois au démarrage de chaque application (API et web).
 */
export function setupFrenchZodErrors(): void {
  z.setErrorMap(frenchErrorMap);
}
