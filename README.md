# Otium

> Suivez tout ce que vous regardez, lisez et jouez — au même endroit.

**Otium** est une application de suivi de contenus culturels inspirée de l'esprit de TV Time,
mais bâtie autour d'un concept **générique de média** afin de supporter, au-delà des films et
séries, les livres, mangas, animés, jeux vidéo, podcasts, musique et documentaires — par
**extension**, sans réécriture.

## État du projet

🟢 **MVP « films, séries & livres » complet, sur `main`.** Vérifié de bout en bout (données réelles
TMDB, PostgreSQL) ; `typecheck`, `lint`, `test` et `build` passent.

Fonctionnalités disponibles :

- **Recherche** de films, séries et **livres** — multi-catalogues (TMDB · Google Books avec
  Open Library en secours), via un registry par type de média ([ADR-0015](docs/adr/0015-registry-catalogues-par-type.md))
  et un cache **mémoire** ; **mise en avant des tendances** du moment sous la barre de recherche.
  Recherche de livres par titre, auteur ou **ISBN**.
- **Fiche média détaillée** (page unique recherche/bibliothèque) : backdrop, note TMDB, synopsis,
  genres, durée/saisons, casting, réalisateur/créateurs, sociétés de production, plateformes.
- **Authentification** (inscription/connexion, hachage bcrypt, sessions **Postgres**, routes
  protégées), jeton de session en **cookie httpOnly** (durcissement anti-XSS).
- **Bibliothèque** : ajout/retrait, statut (**vu / à voir / à lire**…), favoris (au niveau
  `Media`), affichage **par catégorie** (Séries / Films / Livres).
- **Accueil personnalisé** : séries **en cours** et séries **laissées de côté** (> 1 mois).
- **Listes personnalisées** : création/suppression de listes, ajout/retrait de films et séries.
- **Statistiques** (`/stats`) : totaux, temps, répartition par type, genres les plus regardés,
  activité par mois, note moyenne, records — et un **volet lecture** (livres lus, pages lues,
  pages par mois, auteurs les plus lus, rythme de lecture).
- **Suivi de séries** : saisons/épisodes, épisodes vus, progression, **reprise automatique**.
- **Suivi de lecture** : progression en **pages** ou en **pourcentage**, pages restantes, statut et
  dates de lecture déduits automatiquement, historique horodaté
  ([ADR-0017](docs/adr/0017-progression-polymorphe.md)).
- **Notation** (0–10) et **avis** (texte), au niveau `Media`.
- **Import TV Time** (export RGPD) **en tâche de fond** : le traitement continue côté serveur
  même si l'onglet se ferme / le téléphone se verrouille ; progression en direct et
  bibliothèque qui se remplit au fil de l'eau ([ADR-0013](docs/adr/0013-import-tache-de-fond.md)).
- **PWA** : app installable (écran d'accueil, plein écran mobile), service worker Workbox
  (app shell précachée) pour des visites suivantes plus rapides.
- **Onboarding** : invite « Ajouter à l'écran d'accueil » (web mobile uniquement, une fois par
  jour, ré-ouvrable depuis l'en-tête) ; proposition d'import TV Time juste après l'inscription.
- **Validation i18n** : messages d'erreur Zod en français, partagés front/back.
- **Événements de domaine** journalisés (`MediaAdded`, `EpisodeWatched`, `MediaRated`,
  `WatchStatusChanged`, `MovieCompleted`…) — socle des futures statistiques/recommandations.

Prochaines étapes : voir [roadmap](docs/roadmap.md) (polish i18n/sécurité, stats/reco, Meilisearch,
nouveaux types de médias).

## Démarrage / reprise

Prérequis : Node ≥ 20, **pnpm via `corepack`**, **Docker Desktop démarré** (PostgreSQL).

```bash
docker compose up -d                        # démarre PostgreSQL (plus de Redis — ADR-0012)
cp .env.example .env                        # puis renseigner TMDB_ACCESS_TOKEN (clé TMDB v3 ou v4)
                                            # GOOGLE_BOOKS_API_KEY est facultative (quota anonyme sinon)
corepack pnpm@9.15.0 install                # installe les dépendances
pnpm --filter @otium/api prisma:generate
pnpm --filter @otium/api prisma:migrate     # applique le schéma (base neuve)
pnpm dev                                     # web http://localhost:5173 · API http://localhost:3001/api
```

> **Ports** : l'API écoute sur **`PORT`** (défaut 3000 ; `3001` recommandé dans `.env` si 3000 est
> déjà pris). Le front lit **`VITE_API_URL`** (défaut `http://localhost:3000/api`) — l'aligner sur
> le port de l'API (ex. `apps/web/.env` → `VITE_API_URL=http://localhost:3001/api`).
> `.env` n'est pas versionné ; sans `TMDB_ACCESS_TOKEN`, la recherche de films/séries renvoie 503
> (le reste fonctionne, livres compris). L'API démarre même sans base (dégradation gracieuse).
>
> Les commandes `prisma:migrate` / `prisma:deploy` / `prisma:studio` chargent le `.env` **de la
> racine** du monorepo (via `dotenv-cli`) : elles fonctionnent quel que soit le répertoire courant,
> sans avoir à exporter `DATABASE_URL` à la main (Windows PowerShell compris).

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
- **Backend** : NestJS, PostgreSQL + Prisma, event-driven. Cache **mémoire** et sessions
  **Postgres** en V1 (pas de Redis — [ADR-0012](docs/adr/0012-hebergement-gratuit-service-unique.md)) ;
  les ports `CacheService`/`SessionStore` permettent d'y revenir pour le passage multi-instances.
- **Recherche** : PostgreSQL full-text (V1) → Meilisearch (évolution).

## Déploiement

Hébergement **gratuit** en **service unique** (l'API sert le SPA buildé) sur Render, base
Postgres **Neon** durable. Procédure complète : **[docs/deployment.md](docs/deployment.md)**
et [ADR-0012](docs/adr/0012-hebergement-gratuit-service-unique.md).

## Licence

À définir (voir roadmap).
