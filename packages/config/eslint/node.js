import globals from "globals";
import base from "./base.js";

/** Configuration ESLint pour les services Node/NestJS (flat config). */
export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS s'appuie sur les imports de valeur pour la DI (métadonnées de décorateurs).
      // Forcer `import type` sur ces imports casse l'injection — on désactive la règle côté back.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
