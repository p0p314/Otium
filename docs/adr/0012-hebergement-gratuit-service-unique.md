# ADR-0012 — Hébergement gratuit : service unique, sans Redis

- Statut : Accepté
- Date : 2026-07-17

## Contexte

La V1 d'Otium doit être hébergée **gratuitement** (aucun coût), tout en restant fluide.
La cible est **Render** (plan gratuit), où l'utilisateur dispose déjà d'un mécanisme de
keep-alive pour éviter la mise en veille. Deux contraintes structurent la décision :

- Le plan gratuit Render n'offre qu'une **enveloppe de ressources modeste** (~512 Mo RAM,
  un service qui s'endort après inactivité) et son **Postgres gratuit est supprimé après
  30 jours**. Il faut donc limiter le nombre de services et les dépendances réseau.
- L'architecture actuelle dépendait de **Redis** pour deux usages : le cache des réponses
  TMDB et le stockage des sessions (jetons opaques → utilisateur). Un Redis managé gratuit
  et durable n'est pas garanti sur Render.

## Décision

1. **Service unique.** L'API NestJS **sert aussi le SPA buildé** (`apps/web/dist`) via
   `ServeStaticModule`, avec repli `index.html` pour le routage client et exclusion des
   routes `/api/*`. Un seul déploiement, un seul domaine, un seul keep-alive. Le front
   appelle l'API en **same-origin** (`/api`), ce qui garantit l'envoi du cookie de session
   `SameSite=Lax` sans configuration CORS supplémentaire.
2. **Abandon de Redis.**
   - **Cache TMDB → mémoire.** Un `CacheService` in-process (TTL + borne LRU à 500 entrées)
     remplace Redis. Empreinte mémoire bornée, adaptée au tier gratuit et à l'éco-conception.
   - **Sessions → Postgres.** Un modèle `Session` (jeton, utilisateur, expiration) et un
     `PrismaSessionStore` remplacent le `RedisSessionStore`. Le port `SessionStore` du
     domaine est inchangé : seule l'implémentation d'infrastructure varie (hexagonal).
3. **Base de données → Neon.** Postgres gratuit **durable** (scale-to-zero), au lieu du
   Postgres gratuit éphémère de Render. Connexion via l'URL **poolée** + `sslmode=require`.

## Alternatives considérées

- **Deux services (API + site statique séparés).** Rejeté : deux déploiements, deux
  keep-alive, et cookies cross-origin (`SameSite=None; Secure`) plus fragiles.
- **Garder Redis (Upstash gratuit).** Rejeté pour la V1 : dépendance réseau supplémentaire
  et quota gratuit limité, alors que le cache mémoire et les sessions Postgres suffisent à
  un seul processus. Le port `CacheService`/`SessionStore` permet de réintroduire Redis
  plus tard sans toucher au métier (utile si l'on passe à plusieurs instances).
- **Postgres gratuit de Render.** Rejeté : supprimé après 30 jours (perte de données).

## Conséquences (positives / négatives)

**Positives**
- Coût nul, un seul service à surveiller, cookies de session simples (same-origin, Lax).
- Moins de dépendances (suppression d'`ioredis`, du conteneur Redis, de `REDIS_URL`).
- Cache et sessions restent derrière des ports : bascule vers Redis possible sans refonte.

**Négatives**
- Le cache mémoire est **perdu au redémarrage** et **non partagé** entre instances : il
  faut rester **mono-instance** tant que Redis n'est pas réintroduit (acceptable en V1).
- Les sessions ajoutent quelques requêtes SQL légères (indexées) à chaque appel authentifié.
- Il faut purger périodiquement les sessions expirées (nettoyées à la lecture ; un job de
  purge pourra être ajouté ultérieurement).
