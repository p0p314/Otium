# Déploiement — hébergement gratuit (Render + Neon)

Otium se déploie **gratuitement** en **service unique** : l'API NestJS sert aussi le SPA
buildé. Un seul domaine, un seul déploiement, un seul keep-alive. Voir la décision et les
compromis dans [ADR-0012](adr/0012-hebergement-gratuit-service-unique.md).

- **Hébergeur** : [Render](https://render.com) — plan gratuit (web service Node).
- **Base de données** : [Neon](https://neon.tech) — Postgres gratuit **durable** (scale-to-zero).
  On n'utilise **pas** le Postgres gratuit de Render (supprimé après 30 jours).
- **Cache TMDB** : en **mémoire** (in-process). **Sessions** : en **Postgres**. Pas de Redis.

> ⚠️ **Mono-instance.** Le cache mémoire n'est ni partagé ni persistant : garder **une seule
> instance** (le plan gratuit n'en propose qu'une). Pour passer à plusieurs instances, il
> faudra réintroduire un cache partagé (Redis) derrière le port `CacheService`.

## 1. Base de données Neon

1. Créer un projet Neon (région proche des utilisateurs) → une base Postgres est provisionnée.
2. Copier la chaîne de connexion **poolée** (« Pooled connection », hôte en `-pooler`), avec
   `?sslmode=require`. Exemple :
   ```
   postgresql://user:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/otium?sslmode=require
   ```
   L'URL poolée (PgBouncer) borne le nombre de connexions — indispensable avec le tier gratuit.

## 2. Service Render

Le dépôt contient un **[`render.yaml`](../render.yaml)** (Blueprint) : Render le lit
automatiquement (« New + » → « Blueprint ») et crée le service avec la bonne configuration.

Réglage manuel équivalent (« New + » → « Web Service ») :

| Champ | Valeur |
| --- | --- |
| Runtime | Node |
| Plan | Free |
| Build command | voir ci-dessous |
| Pre-deploy command | `pnpm --filter @otium/api run prisma:deploy:ci` |
| Start command | `pnpm --filter @otium/api run start` |
| Health check path | `/api/health` |

Build command :

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @otium/api exec prisma generate
pnpm --filter @otium/web build
pnpm --filter @otium/api build
```

- **Pre-deploy** applique les migrations (`prisma migrate deploy`) avant la mise en ligne,
  sans interruption de trafic.
- **Start** est lancé depuis `apps/api`, donc `WEB_DIST_PATH=../web/dist` pointe sur le SPA buildé.

## 3. Variables d'environnement (dashboard Render)

| Variable | Valeur | Note |
| --- | --- | --- |
| `NODE_ENV` | `production` | fixé par le Blueprint |
| `WEB_DIST_PATH` | `../web/dist` | active le service unique (API sert le SPA) |
| `DATABASE_URL` | *(URL poolée Neon)* | **secret** — `sslmode=require` |
| `TMDB_ACCESS_TOKEN` | *(jeton v4 TMDB)* | **secret** — sinon la recherche renvoie 503 |
| `WEB_ORIGIN` | URL publique du service | ex. `https://otium.onrender.com` |
| `TMDB_CACHE_TTL_SECONDS` | `86400` | TTL du cache mémoire (limite les appels TMDB) |
| `PORT` | *(injecté par Render)* | ne pas définir manuellement |

`WEB_ORIGIN` sert au CORS. En service unique, le front appelle l'API en **same-origin**
(`/api`) : aucun appel cross-origin, donc pas de préflight CORS. Renseigner tout de même
l'URL publique du service (utile si l'on sépare front/API plus tard).

## 4. Éviter la mise en veille (keep-alive)

Le web service gratuit s'endort après ~15 min d'inactivité. L'utilisateur dispose déjà d'un
mécanisme de keep-alive : il suffit de pinger périodiquement **`/api/health`** (endpoint de
liveness, sans dépendance base) pour garder l'instance éveillée.

## 5. Limiter les requêtes (rester dans le gratuit)

- **Cache TMDB en mémoire** (TTL 24 h) : les recherches/fiches répétées ne rappellent pas TMDB.
- **Cache TanStack Query** côté front (`staleTime` 60 s, `gcTime` 5 min) : moins d'appels API.
- **URL Neon poolée** : borne les connexions Postgres (PgBouncer) pour ne pas saturer le tier gratuit.
- **Rafraîchissement de structure des séries** garde-fou de fraîcheur (voir ADR-0009) : pas de
  re-synchronisation TMDB à chaque affichage.

## 6. Vérifier après déploiement

```bash
curl -s https://<service>.onrender.com/api/health          # {"status":"ok",...}
curl -s https://<service>.onrender.com/api/health/ready     # {"status":"ready","checks":{"database":true}}
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://<service>.onrender.com/   # 200 text/html (SPA)
```
