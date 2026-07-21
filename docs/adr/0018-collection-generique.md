# ADR-0018 — `Collection` : regrouper des médias en œuvres, de façon générique

- Statut : Accepté
- Date : 2026-07-21

## Contexte

Chaque tome d'un manga est un livre distinct chez les fournisseurs. Une recherche
« One Piece » renvoyait donc autant d'entrées que de volumes trouvés, noyant les autres
résultats. L'utilisateur attend **une** fiche par œuvre, depuis laquelle accéder aux
tomes — chacun gardant son propre suivi (statut, note, avis, progression).

Le besoin n'est pas propre aux mangas : les cycles de romans, et demain les sagas de
films, appellent le même regroupement.

## Décision

**Une entité `Collection` générique**, reliée aux médias par `Media.collectionId` et
`Media.collectionPosition`. Ce n'est **pas** un nouveau type de média : un tome reste un
`Media` ordinaire, avec toutes les capacités transversales déjà en place (ADR-0003).
L'œuvre n'en est que la **synthèse** — total, tomes lus, progression, dernier lu, prochain
conseillé — calculée par une fonction pure.

Le rattachement combine deux sources, par ordre de confiance :

1. **La série déclarée par le fournisseur** — identifiant stable, aucun faux positif, mais
   très inégalement renseignée (mesuré : 100 % sur One Piece, 10 % sur Naruto, 0 % sur la
   plupart des œuvres).
2. **Titre + auteur** — le titre doit porter un numéro de tome reconnaissable *et*
   l'auteur être connu. Les deux conditions sont exigées ensemble.

Les deux méthodes ne se mélangent jamais au sein d'un même groupe, et `Collection.method`
conserve celle qui a servi : un regroupement discutable reste identifiable et corrigeable
après coup.

**Le refus de regrouper prime sur le regroupement.** Un faux regroupement masque des
volumes sous le mauvais titre ; un regroupement manqué laisse simplement des livres
séparés. Sont donc écartés : titres homonymes d'auteurs différents, livres sans auteur
connu, livres sans numéro de tome, et groupes réduits à un seul volume.

**L'identité de l'œuvre a une source unique** (`collection-identity.ts`). Elle est
construite à deux moments qui ne se croisent jamais — au regroupement des résultats et à
l'ajout d'un volume — et ces deux chemins ont effectivement divergé en développement,
rendant toute fiche d'œuvre introuvable. Un test compare désormais directement les deux.

La clé étrangère est en **`SET NULL`** : supprimer une œuvre mal reconstituée ne doit
jamais emporter les volumes, donc ni les bibliothèques, notes et avis qui en dépendent.

## Alternatives considérées

- **Un type de média `MANGA`.** Rejeté : un manga *est* un livre chez nos sources ; un
  type distinct fragmenterait la recherche et dupliquerait les capacités transversales.
  Le besoin exprimé est le regroupement, pas un nouveau type.
- **Regroupement par titre seul.** Rejeté : regrouperait « Dune » avec « Dune, le mook »,
  et une série avec l'essai qu'un autre auteur lui a consacré.
- **Regroupement par la seule donnée fournisseur.** Rejeté après mesure : One Piece serait
  regroupé et Naruto non — une incohérence immédiatement visible.
- **Rupture de contrat** (`{ kind: "MEDIA" | "COLLECTION" }` dans les résultats).
  Abandonnée en cours d'implémentation : un champ `collections` **additif** rend le même
  service sans casser les clients existants, et laisse l'interface adopter les œuvres à
  son rythme.

## Conséquences

**Positives** : une saga de films se logerait dans le même modèle sans migration ; chaque
tome conserve son suivi propre sans code dédié ; la méthode de rattachement est traçable.

**Négatives** : le total affiché est celui des volumes **connus**, pas le total réel de
l'œuvre — les fournisseurs n'exposent pas d'endpoint « tous les tomes d'une série », et
l'énumération par recherche est partielle. La fiche annonce donc « tomes connus », et le
pourcentage s'y rapporte : afficher un avancement fondé sur une estimation fausse serait
pire que de rapporter au connu.
