# CLAUDE.md — Règles de fonctionnement du projet Otium

> Document **non négociable**. Toute contribution (humaine ou assistée par IA) doit le respecter
> **avant toute action**. En cas de conflit entre une demande ponctuelle et ce document,
> ce document prévaut. Toute exception doit être tracée via un ADR.

## 1. Nature du projet

**Otium** est une application de suivi de contenus culturels (films, séries en V1 ; livres,
mangas, animés, jeux, podcasts, musique, documentaires ensuite), pensée comme un **produit
destiné à évoluer sur plusieurs années**, avec plusieurs développeurs et plusieurs plateformes.

Le concept central est un média **générique** (`Media`). Toute fonctionnalité transversale
(favoris, listes, notation, avis, historique, recommandations) vit au niveau `Media`, **jamais**
au niveau d'un type concret (Movie/Series) si elle appartient conceptuellement à `Media`.

## 2. Priorités (dans cet ordre)

1. **Maintenabilité**
2. **Lisibilité**
3. **Évolutivité**
4. **Performance**
5. **Expérience utilisateur**
6. **Éco-conception**

> La rapidité de développement ne justifie **jamais** une dette technique inutile.
> On construit une base professionnelle, pas un prototype jetable.

## 3. Règles d'architecture

- **Monorepo** géré par **Turborepo**, **TypeScript strict** partout.
- **Clean Architecture** + **architecture hexagonale** + **DDD léger** + **SOLID** + **Clean Code**.
- Découpage backend **par domaine**, chaque module en 4 couches :
  - `domain/` — entités, value objects, règles métier, **interfaces (ports)**. Aucune dépendance
    externe : **pas de Prisma, pas de NestJS, pas d'API externe**.
  - `application/` — use cases, orchestration, commands, queries.
  - `infrastructure/` — base de données, fournisseurs externes, cache, services techniques
    (implémentations des ports).
  - `presentation/` — controllers, DTO, validation, API HTTP.
- **Règle de dépendance** : les dépendances pointent **vers l'intérieur**.
  `presentation → application → domain`, `infrastructure → domain (via ports)`.
  Le `domain` ne dépend de personne.
- Le domaine ne connaît **jamais** un fournisseur externe concret (TMDB, Trakt…).
  Changer de fournisseur ne doit entraîner **aucune** modification métier.

## 4. Règles frontend

Aucun composant React ne doit :
- contenir de **logique métier** ;
- **appeler directement** une API ;
- gérer des règles applicatives complexes.

À la place : hooks dédiés, services, use cases frontend si nécessaire, composants réutilisables,
design system partagé.
- **TanStack Query** gère les **données serveur**.
- **Zustand** gère **uniquement** l'état global applicatif (UI/session), pas les données serveur.
- Validation des entrées via **Zod** ; formulaires via **React Hook Form**.

## 5. Contrats & frontières de service (services-first)

- Les services communiquent **uniquement** via interfaces typées, **contrats versionnés** et
  schémas partagés (`contracts/`, `packages/types`, `packages/api-sdk`).
- **Interdit** d'accéder directement aux fichiers internes d'un autre service.
- Toute rupture de contrat = nouvelle version de contrat + note de migration.

## 6. Événements métier

Le système est **event-driven** en interne. Exemples : `MediaAdded`, `MediaRemoved`, `MediaRated`,
`EpisodeWatched`, `MovieCompleted`, `FavoriteAdded`, `CommentCreated`. Ils alimentent
statistiques, recommandations, notifications et historique. Un use case qui modifie un état
métier significatif **émet un événement de domaine**.

## 7. Tests — « pas de test = pas terminé »

- **Frontend** : Vitest + React Testing Library ; E2E avec Playwright.
- **Backend** : Vitest/Jest (unitaire) + Supertest (intégration HTTP).
- Le **domaine** est testé **unitairement sans I/O** (pas de DB, pas de réseau).
- Chaque fonctionnalité définit sa **suite d'eval** : comportement attendu, critères de réussite,
  mesure de l'amélioration.
- Un changement sans test **n'est pas terminé** et ne doit pas être fusionné.

## 8. Métriques — avant chaque fonctionnalité

Définir explicitement : le **problème utilisateur**, le **comportement attendu**, la **mesure**
de l'amélioration (ex. temps de chargement, nb d'appels réseau, taux de réussite d'un parcours,
couverture fonctionnelle).

## 9. Éco-conception (obligatoire)

Respect du **RGESN** et des recommandations **APIGreenScore**. Chaque décision technique
importante considère son impact environnemental :
- réduction des appels réseau, cache efficace ;
- optimisation des images, chargement progressif, limitation du JavaScript ;
- optimisation SQL, limitation CPU/mémoire ;
- suppression des dépendances inutiles ;
- approche **mobile-first**.

Références :
- https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/
- https://github.com/API-Green-Score/APIGreenScore

## 10. UX/UI

Identité **originale** (ne pas copier TV Time). Interface premium, moderne, simple, rapide,
accessible (WCAG 2.2 AA visé), responsive, mobile-first. Thèmes clair **et** sombre, design system
partagé, skeleton loaders, états vides soignés, animations légères.

## 11. Documentation & décisions

- Toute décision technique structurante = **ADR** dans `docs/adr/` (format MADR).
- Les documents d'architecture (`docs/`) sont tenus à jour avec le code.
- Conventions de commit : **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

## 12. Definition of Done

Une tâche est terminée quand :
- [ ] le code respecte les règles d'architecture ci-dessus ;
- [ ] TypeScript strict passe, lint/format OK ;
- [ ] tests unitaires + intégration ajoutés et verts ;
- [ ] eval/metrics de la fonctionnalité définies et mesurées ;
- [ ] impact éco-conception considéré ;
- [ ] documentation / ADR mis à jour ;
- [ ] revue de code effectuée.
