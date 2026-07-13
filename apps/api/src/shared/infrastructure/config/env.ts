import { z } from "zod";

/** Schéma des variables d'environnement — validé au démarrage (fail-fast). */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

/** Utilisé par `@nestjs/config` (`validate`). Lève une erreur lisible si invalide. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }
  return parsed.data;
}
