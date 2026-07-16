# ADR-0010 — Accueil fondé sur l'activité de visionnage (dates réelles)

- Statut : Accepté
- Date : 2026-07-16

## Contexte

L'accueil séparait les séries en « à reprendre » (commencée) et « à commencer » (jamais
commencée), sans notion de **fraîcheur**. Avec une bibliothèque importée (des centaines de séries,
dont beaucoup vues il y a des années), l'accueil devenait illisible : tout ce qui avait un épisode
non vu s'y entassait.

Par ailleurs, l'ADR-0008 avait fait le choix de **ne pas rejouer** les dates de visionnage
historiques (statut importé à la date de l'import). Or l'export TV Time **fournit** cette date :
`tracking-prod-records-v2.csv` porte un `created_at` par ligne `watch-episode` / `rewatch-episode`.

## Décision

**Capturer la date réelle de visionnage** à l'import et **structurer l'accueil par activité**.

- **Dates réelles** : le parseur lit `created_at` → `ImportedEpisode.watchedAt` (la plus récente en
  cas de re-visionnage). L'orchestration la persiste via `setEpisodesWatchedAt` (upsert par épisode)
  au lieu de la date du jour. Les épisodes marqués via l'UI gardent la date du jour (inchangé).
- **Buckets fondés sur le dernier visionnage** (séries non terminées, hors `DROPPED`) :
  - **À voir** : série active (dernier visionnage < **30 j**) avec un épisode sorti non vu, **ou**
    série jamais commencée mais déjà disponible (fusion de l'ancien « à commencer ») ;
  - **À reprendre** : série laissée de côté (dernier visionnage entre **30 et 90 j**) ;
  - **≥ 90 j sans visionnage** : **masquée** de l'accueil (reste en bibliothèque).
- Logique **pure et testée** dans le domaine (`buildHomeDashboard`), seuils constants et explicites.

Cette décision **révise la limitation « dates non rejouées » de l'ADR-0008** : les dates historiques
sont désormais captées (elles alimentent l'accueil et, à terme, des statistiques plus justes).

## Alternatives considérées

- **Garder deux sections sans fraîcheur** : simple, mais accueil noyé après un import massif. Rejeté.
- **Trois sections (à voir / à reprendre / à commencer)** : plus granulaire mais plus chargé sur
  mobile ; l'utilisateur a préféré fusionner « actives » et « à commencer » sous « À voir ».
- **Seuil en mois calendaires** plutôt qu'en jours : marginal ; 30/90 jours est déterministe et
  trivial à tester.

## Conséquences

**Positives** : accueil pertinent et sobre (sur un jeu réel : ~200 séries importées → une poignée
mises en avant) ; « À voir » reflète ce qu'on regarde vraiment (ex. une série vue il y a deux
semaines y apparaît) ; dates de visionnage fidèles, réutilisables pour les futures stats/historique.

**Négatives** : les séries importées **avant** ce changement gardent la date d'import (récente) →
un **ré-import** (idempotent, dédoublonné) est nécessaire pour récupérer l'historique réel. Le
recalcul se fait à la lecture (pur, sans I/O) — négligeable pour les volumes visés.
