# Documentation Otium

Cette documentation constitue le **socle de conception** du projet. Elle doit être **validée
avant toute implémentation** et tenue à jour avec le code.

## Ordre de lecture recommandé

1. [`../CLAUDE.md`](../CLAUDE.md) — règles non négociables.
2. [`architecture/01-analyse-fonctionnelle.md`](architecture/01-analyse-fonctionnelle.md) — le *quoi* et le *pourquoi*.
3. [`architecture/05-modele-metier.md`](architecture/05-modele-metier.md) — le cœur du domaine.
4. [`architecture/02-architecture-overview.md`](architecture/02-architecture-overview.md) — le *comment* (macro).
5. [`architecture/03-c4-diagrams.md`](architecture/03-c4-diagrams.md) — les diagrammes C4.
6. [`architecture/04-monorepo-structure.md`](architecture/04-monorepo-structure.md) — l'organisation du code.
7. [`architecture/06-choix-techniques.md`](architecture/06-choix-techniques.md) — justification de la stack.
8. [`adr/`](adr/README.md) — décisions structurantes.
9. [`roadmap.md`](roadmap.md) — le plan de livraison.
10. [`risques-techniques.md`](risques-techniques.md) — ce qui peut mal tourner.
11. [`strategie-tests.md`](strategie-tests.md) — comment on garantit la qualité.

## Structure

```
docs/
├── README.md                      ← ce fichier
├── architecture/
│   ├── 01-analyse-fonctionnelle.md
│   ├── 02-architecture-overview.md
│   ├── 03-c4-diagrams.md
│   ├── 04-monorepo-structure.md
│   ├── 05-modele-metier.md
│   └── 06-choix-techniques.md
├── adr/
│   ├── README.md
│   └── 0001..0007-*.md
├── roadmap.md
├── risques-techniques.md
└── strategie-tests.md
```

> Les diagrammes utilisent **Mermaid** (rendu nativement par GitHub/GitLab).
