import { z } from "zod";

/** Schéma des variables d'environnement — validé au démarrage (fail-fast). */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),

  // Chemin vers le SPA buildé (apps/web/dist) que l'API sert en production (service
  // unique). Vide en dev : le SPA est servi par Vite et l'API n'expose que /api.
  WEB_DIST_PATH: z.string().optional(),

  // Fournisseur TMDB (jeton v4 "Read Access Token"). Optionnel : l'app démarre sans,
  // mais la recherche échoue proprement tant qu'il n'est pas fourni.
  TMDB_ACCESS_TOKEN: z.string().optional(),
  TMDB_API_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p/w342"),
  TMDB_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  // Catalogue de livres. La clé Google Books est optionnelle : sans elle, l'API répond
  // avec un quota anonyme plus bas — l'app reste fonctionnelle (ADR-0016).
  GOOGLE_BOOKS_API_KEY: z.string().optional(),
  GOOGLE_BOOKS_API_BASE_URL: z.string().url().default("https://www.googleapis.com/books/v1"),
  OPEN_LIBRARY_API_BASE_URL: z.string().url().default("https://openlibrary.org"),
  // TTL long (7 j) : les métadonnées d'un livre sont stables, contrairement aux séries
  // en cours de diffusion — moins d'appels réseau à qualité de service égale.
  BOOKS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(604800),

  // Hardcover — découverte de livres populaires. Le jeton est **personnel** (lié à un
  // compte, pas à une application) et l'API est en bêta : sans jeton, la fonctionnalité
  // est simplement absente, le reste de l'application fonctionne.
  // https://docs.hardcover.app/api/getting-started/
  HARDCOVER_API_TOKEN: z.string().optional(),
  HARDCOVER_API_URL: z.string().url().default("https://api.hardcover.app/v1/graphql"),

  // Notifications Push (Web Push / VAPID — ADR-0020). Les clés sont fournies **uniquement**
  // par l'environnement et **jamais générées au démarrage** : une génération automatique
  // changerait de clé à chaque redémarrage et invaliderait tous les abonnements existants.
  // Absentes : l'app démarre, mais l'envoi Push est désactivé proprement.
  // Générer une paire : `npx web-push generate-vapid-keys`.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  // Sujet VAPID : URL `mailto:` ou `https:` identifiant l'émetteur (requis par la spec).
  VAPID_SUBJECT: z.string().default("mailto:notifications@otium.app"),
  // Secret facultatif protégeant le déclencheur externe `POST /api/notifications/run`
  // (cron GitHub Actions / Render). Vide : l'endpoint reste réservé au déclenchement interne.
  NOTIFICATIONS_CRON_SECRET: z.string().optional(),
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
