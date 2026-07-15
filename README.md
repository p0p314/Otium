# Otium

> Suivez tout ce que vous regardez, lisez et jouez — au même endroit.

**Otium** est une application de suivi de contenus culturels inspirée de l'esprit de TV Time,
mais bâtie autour d'un concept **générique de média** afin de supporter, au-delà des films et
séries, les livres, mangas, animés, jeux vidéo, podcasts, musique et documentaires — par
**extension**, sans réécriture.

## État du projet

🟢 **MVP « films & séries » complet, sur `main`.** Vérifié de bout en bout (données réelles
TMDB, PostgreSQL, Redis) ; `typecheck`, `lint`, `test` (~85 tests) et `build` passent.

Fonctionnalités disponibles :

- **Recherche** de films/séries (via TMDB, abstraction de fournisseur + cache Redis), avec
  **mise en avant des tendances** du moment sous la barre de recherche.
- **Authentification** (inscription/connexion, hachage bcrypt, sessions Redis, routes protégées),
  jeton de session en **cookie httpOnly** (durcissement anti-XSS).
- **Bibliothèque** : ajout/retrait, statut (**vu / à voir**…), favoris (au niveau `Media`),
  affichage **par catégorie** (Films / Séries).
- **Accueil personnalisé** : séries **en cours** et séries **laissées de côté** (> 1 mois).
- **Suivi de séries** : saisons/épisodes, épisodes vus, progression, **reprise automatique**.
- **Notation** (0–10) et **avis** (texte), au niveau `Media`.
- **Validation i18n** : messages d'erreur Zod en français, partagés front/back.
- **Événements de domaine** journalisés (`MediaAdded`, `EpisodeWatched`, `MediaRated`,
  `WatchStatusChanged`, `MovieCompleted`…) — socle des futures statistiques/recommandations.

Prochaines étapes : voir [roadmap](docs/roadmap.md) (polish i18n/sécurité, stats/reco, Meilisearch,
nouveaux types de médias).

## Démarrage / reprise

Prérequis : Node ≥ 20, **pnpm via `corepack`**, **Docker Desktop démarré** (PostgreSQL + Redis).

```bash
docker compose up -d                        # démarre PostgreSQL + Redis
cp .env.example .env                        # puis renseigner TMDB_ACCESS_TOKEN (clé TMDB v3 ou v4)
corepack pnpm@9.15.0 install                # installe les dépendances
pnpm --filter @otium/api prisma:generate
pnpm --filter @otium/api prisma:migrate     # applique le schéma (base neuve)
pnpm dev                                     # web http://localhost:5173 · API http://localhost:3001/api
```

> **Ports** : l'API écoute sur **`PORT`** (défaut 3000 ; `3001` recommandé dans `.env` si 3000 est
> déjà pris). Le front lit **`VITE_API_URL`** (défaut `http://localhost:3000/api`) — l'aligner sur
> le port de l'API (ex. `apps/web/.env` → `VITE_API_URL=http://localhost:3001/api`).
> `.env` n'est pas versionné ; sans `TMDB_ACCESS_TOKEN`, la recherche renvoie 503 (le reste
> fonctionne). L'API démarre même sans base (dégradation gracieuse).

Vérifications : `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`.

## Documentation

| Document | Contenu |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Règles de fonctionnement **non négociables** |
| [`docs/architecture/01-analyse-fonctionnelle.md`](docs/architecture/01-analyse-fonctionnelle.md) | Analyse fonctionnelle |
| [`docs/architecture/02-architecture-overview.md`](docs/architecture/02-architecture-overview.md) | Architecture générale & flux |
| [`docs/architecture/03-c4-diagrams.md`](docs/architecture/03-c4-diagrams.md) | Diagrammes C4 |
| [`docs/architecture/04-monorepo-structure.md`](docs/architecture/04-monorepo-structure.md) | Arborescence du monorepo |
| [`docs/architecture/05-modele-metier.md`](docs/architecture/05-modele-metier.md) | Modèle métier |
| [`docs/architecture/06-choix-techniques.md`](docs/architecture/06-choix-techniques.md) | Choix techniques argumentés |
| [`docs/adr/`](docs/adr/README.md) | Architecture Decision Records |
| [`docs/roadmap.md`](docs/roadmap.md) | Roadmap MVP / V1 / futur |
| [`docs/risques-techniques.md`](docs/risques-techniques.md) | Risques techniques |
| [`docs/strategie-tests.md`](docs/strategie-tests.md) | Stratégie de tests & eval |

## Stack (cible)

Monorepo **Turborepo** · **TypeScript strict** · Clean Architecture + Hexagonale + DDD léger.

- **Frontend** : React + Vite, TanStack Router/Query, Zustand, React Hook Form, Zod, Tailwind, shadcn/ui, Lucide, Motion.
- **Backend** : NestJS, PostgreSQL + Prisma, Redis, event-driven.
- **Recherche** : PostgreSQL full-text (V1) → Meilisearch (évolution).

## Licence

À définir (voir roadmap).
