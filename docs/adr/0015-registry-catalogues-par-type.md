# ADR-0015 — Registry de catalogues par type de média + capacités optionnelles

- Statut : Accepté
- Date : 2026-07-20

## Contexte

L'ajout des livres introduit un **second** fournisseur de catalogue (Google Books / Open Library)
à côté de TMDB. Or le port `MediaCatalogProvider` était à la fois **unique** (un seul adapter câblé
dans le conteneur DI) et **teinté séries** : il imposait `getSeriesDetails`, `getEpisodeDetails` et
`getTrending` à tout implémenteur. Un catalogue de livres n'a rien à répondre à ces trois méthodes.

ADR-0004 prévoyait « un registry sélectionne l'adapter selon le type de média » ; il n'avait jamais
été implémenté, faute de second fournisseur.

## Décision

**1. Découper le port en capacités** (principe de ségrégation des interfaces) :

- `MediaCatalogProvider` — le **socle** : `search` + `getMediaDetails`. Obligatoire.
- `SeriesCatalogProvider` — structure saisons/épisodes et fiche d'épisode. Optionnel.
- `TrendingCatalogProvider` — tendances du moment. Optionnel.

**2. Introduire `MediaCatalogRegistry`** (`forType` / `supports` / `supportedTypes`), qui résout le
fournisseur compétent à partir du `MediaType`. Les use cases génériques (recherche, fiche,
enrichissement à l'ajout) passent par le registry ; ceux qui exigent une capacité optionnelle
injectent directement le jeton correspondant, ce qui rend la dépendance visible dans le constructeur.

**3. Déclarer les fournisseurs par le module**, via `CATALOG_PROVIDER_REGISTRATIONS` :
`[{ types: ["MOVIE","SERIES"], provider: tmdb }, { types: ["BOOK"], provider: books }]`. Ajouter un
type de média = ajouter une ligne dans `MediaModule` — le registry lui-même reste inchangé.

**4. Généraliser la recherche multi-catalogues.** `SearchMediaUseCase` interroge en parallèle tous
les fournisseurs couvrant les types demandés (un fournisseur couvrant plusieurs types n'est appelé
**qu'une fois**), puis fusionne par **entrelacement** (`mergeSearchResults`, fonction pure) pour
qu'aucune source n'enterre l'autre. Une source en panne est ignorée : les autres répondent.

Le contrat gagne un paramètre `types` (liste), rétro-compatible avec `type` (singulier).

## Alternatives considérées

- **Un provider « façade » unique** qui aiguille en interne : remet la logique de routage dans un
  adapter, et son interface reste le plus grand dénominateur commun. Rejeté.
- **Méthodes optionnelles (`getSeriesDetails?`)** : déplace l'erreur du câblage vers l'exécution
  (`undefined is not a function`), sans que le compilateur aide. Rejeté.
- **Un port par type de média** (`MovieCatalog`, `BookCatalog`…) : duplique recherche et fiche pour
  chaque type et casse la généricité de `Media` (ADR-0003). Rejeté.

## Conséquences

**Positives** : un catalogue de livres n'implémente que ce qu'il sait faire ; ajouter un type de
média ne touche ni le domaine ni les use cases ; la recherche « tous types » devient réelle
(auparavant limitée au multi-search TMDB) ; une source en panne dégrade au lieu d'échouer.

**Négatives** : trois jetons DI au lieu d'un — les tests doivent surcharger le bon (un helper
`singleProviderRegistry` couvre le cas courant). La recherche multi-catalogues émet potentiellement
plusieurs appels réseau par requête : le regroupement par fournisseur et le cache par source
bornent le coût.
