# ADR-0016 — Livres : Google Books prioritaire, Open Library en secours

- Statut : Accepté
- Date : 2026-07-20

## Contexte

Aucune source de données livres n'est complète. Google Books couvre très largement le catalogue
commercial, avec couvertures, descriptions, pagination et notes — mais laisse des trous (fiches sans
ISBN, sans description, volumes mal renseignés). Open Library est ouvert, riche en identifiants et en
couvertures, mais irrégulier sur les métadonnées éditoriales et dépourvu de notes.

Utiliser une seule source, c'est accepter ses trous. Les mélanger sans règle, c'est produire des
fiches incohérentes dont on ne sait plus d'où vient chaque champ.

## Décision

**Google Books est la source prioritaire, Open Library la source de secours.**

1. **Priorité stricte** : une donnée fournie par Google Books n'est **jamais** écrasée par Open
   Library. Le secours ne fait que **combler** des champs absents (`null` ou liste vide).
2. **Appel conditionnel** : Open Library n'est sollicité que si la recherche prioritaire ne donne
   rien, ou si la fiche manque d'un élément **essentiel** — couverture, description ou ISBN-13
   (`needsFallback`). Une fiche complète n'entraîne aucun appel réseau supplémentaire.
3. **Rapprochement par ISBN** : ISBN-13, puis ISBN-10, puis titre + premier auteur normalisés
   (casse, accents, ponctuation neutralisés) — `identityKey`.
4. **Traçabilité** : le champ `sources` liste les fournisseurs ayant contribué, dans l'ordre de
   priorité. Il remonte jusqu'à l'API, ce qui rend toute fusion auditable depuis la fiche.
5. **Séparation des responsabilités** : la règle de fusion est une **fonction pure** du domaine
   (`mergeBooks`, testée sans I/O) ; l'orchestration — priorité, cache, tolérance aux pannes — vit
   dans `CompositeBookCatalogProvider` (infrastructure), qui implémente le socle du catalogue.
6. **Résilience** : source prioritaire en panne → le secours répond seul ; secours en panne → la
   fiche prioritaire est servie non complétée ; les deux en panne → 503 explicite. Aucun cas ne
   bloque l'application (risque R1).
7. **Réessai borné** : Google Books renvoie fréquemment des `503 backendFailed` transitoires
   (~2 requêtes sur 3 mesurées en conditions réelles, clé valide comprise). Deux nouvelles
   tentatives à délai croissant sont effectuées avant de considérer la source indisponible.
8. **Cache** : TTL de 7 jours par défaut (contre 24 h pour TMDB) — les métadonnées d'un livre publié
   ne changent pas, contrairement à une série en cours de diffusion.

## Alternatives considérées

- **Open Library seule** (entièrement ouverte, sans quota) : couverture et descriptions trop
  lacunaires pour une fiche premium. Rejeté.
- **Google Books seule** : simple, mais laisse des fiches sans ISBN ni description, et rend
  l'application dépendante d'un quota unique. Rejeté.
- **Fusion « meilleur champ gagne »** (choisir la valeur la plus longue / la mieux notée) : résultat
  non déterministe, difficile à tester et à expliquer à l'utilisateur. Rejeté.
- **Fusion systématique des deux sources à chaque requête** : double le trafic réseau pour un gain
  marginal sur les fiches déjà complètes. Rejeté (éco-conception).

## Conséquences

**Positives** : fiches nettement plus complètes qu'avec une source unique ; comportement
déterministe et testable champ par champ ; ajout d'une troisième source = un adapter + une ligne
dans `BooksModule` ; sobriété (le secours n'est appelé qu'en cas de besoin réel).

**Négatives** : deux formats bruts à maintenir (deux mappers, deux jeux de fixtures) ; la notion de
« fiche incomplète » est un choix de produit susceptible d'évoluer — elle est isolée dans
`needsFallback` pour rester révisable en un point ; les identifiants exposés restent ceux de Google
Books quand il répond, ce qui lie nos références externes à cette source (changer de source
prioritaire imposerait une migration de `externalId`).
