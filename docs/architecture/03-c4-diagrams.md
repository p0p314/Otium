# 03 — Diagrammes C4

Modèle [C4](https://c4model.com/) : Contexte → Conteneurs → Composants → (Code, hors doc).

## Niveau 1 — Contexte système

```mermaid
flowchart TB
  User([Utilisateur Otium])
  subgraph Otium[Système Otium]
    S[Application de suivi multimédia]
  end
  TMDB[TMDB]
  Trakt[Trakt]
  TVMaze[TVMaze]
  OMDb[OMDb]

  User -->|suit ses médias| S
  S -->|métadonnées films/séries| TMDB
  S -->|catalogue/épisodes| TVMaze
  S -->|scrobbling futur| Trakt
  S -->|fiches complémentaires| OMDb
```

## Niveau 2 — Conteneurs

```mermaid
flowchart TB
  User([Utilisateur])

  subgraph Otium[Système Otium]
    Web["Web SPA<br/>(apps/web — React/Vite)"]
    API["API<br/>(apps/api — NestJS)"]
    DB[("PostgreSQL")]
    Redis[("Redis<br/>cache / sessions / files")]
  end

  Providers["Fournisseurs externes<br/>TMDB · Trakt · TVMaze · OMDb"]

  User -->|HTTPS| Web
  Web -->|JSON via api-sdk| API
  API -->|SQL / Prisma| DB
  API -->|cache, rate-limit, jobs| Redis
  API -->|HTTP| Providers
```

## Niveau 3 — Composants de l'API (module `media` en exemple)

```mermaid
flowchart TB
  subgraph API[apps/api — NestJS]
    subgraph mediaMod[Module Media]
      Ctrl[MediaController<br/>presentation]
      subgraph appl[application]
        SUC[SearchMediaQuery]
        AUC[AddMediaToLibrary]
        RUC[RateMediaCommand]
      end
      subgraph dom[domain]
        Ent[Media / Movie / Series<br/>entités & VO]
        PortRepo{{MediaRepository — port}}
        PortProv{{MediaCatalogProvider — port}}
        PortEvt{{EventPublisher — port}}
      end
      subgraph infra[infrastructure]
        Repo[PrismaMediaRepository]
        Prov[TmdbProvider / TvMazeProvider]
        Bus[EventBus adapter]
      end
    end
  end

  Ctrl --> SUC & AUC & RUC
  SUC --> PortProv
  AUC --> PortRepo
  AUC --> PortEvt
  RUC --> PortRepo
  appl --> Ent
  Repo -. implémente .-> PortRepo
  Prov -. implémente .-> PortProv
  Bus  -. implémente .-> PortEvt
```

## Niveau 3 — Composants du Web

```mermaid
flowchart TB
  subgraph Web[apps/web]
    Router[TanStack Router]
    Pages[Routes/Pages]
    Feat[Features<br/>library, search, series-tracker]
    Hooks[Hooks dédiés]
    QueryC[TanStack Query client]
    Store[Zustand stores<br/>UI/session]
    UI["packages/ui — design system<br/>(shadcn/ui + Tailwind)"]
    SDK[packages/api-sdk]
  end
  API[(apps/api)]

  Router --> Pages --> Feat --> Hooks
  Hooks --> QueryC --> SDK --> API
  Hooks --> Store
  Feat --> UI
```

> Le niveau 4 (Code) n'est pas figé en documentation : il vit dans le code et ses tests.
