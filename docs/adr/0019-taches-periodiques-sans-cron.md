# ADR-0019 — Tâches périodiques sans cron : échéance en base, déclenchement opportuniste

- Statut : Accepté
- Date : 2026-07-21

## Contexte

Deux fonctionnalités demandent une exécution récurrente : la réconciliation des livres
communautaires avec les catalogues officiels (hebdomadaire) et la synchronisation des
tendances (quotidienne).

Or l'hébergement retenu est un **service unique sur plan gratuit qui s'endort après
inactivité** (ADR-0012). Une planification en processus (`@nestjs/schedule`) y est
trompeuse : elle ne se déclenche pas pendant le sommeil, et les exécutions manquées sont
perdues **sans que rien ne le signale**. Une tâche « hebdomadaire » pourrait ne jamais
tourner tout en paraissant configurée.

Le projet a déjà résolu ce problème une fois, pour le rafraîchissement des séries suivies
(`RefreshTrackedSeriesUseCase`) : garde-fou de fraîcheur en base, déclenchement à
l'occasion d'une lecture utilisateur. Cette décision en fait un mécanisme réutilisable.

## Décision

**L'échéance est portée par la donnée, pas par une horloge.** Une table `SyncState`
conserve, par tâche, la date de dernier démarrage et l'issue de la dernière exécution.
`DueJobRunner.runIfDue(job, intervalMs, task)` déclenche la tâche si l'échéance est
dépassée, à l'occasion d'une requête utilisateur.

Quatre propriétés, chacune couverte par des tests :

1. **Exécution unique par échéance.** La prise de verrou est une **seule instruction
   SQL** (`INSERT … ON CONFLICT DO UPDATE … WHERE … RETURNING`). Lire puis écrire
   séparément laisserait une fenêtre où deux requêtes simultanées se croiraient toutes
   deux légitimes.
2. **Non bloquante.** La tâche est lancée sans être attendue : la requête utilisateur qui
   l'a déclenchée n'en subit pas la latence.
3. **Non fatale.** Ni une panne du stockage d'état, ni un échec de la tâche ne remontent à
   l'appelant.
4. **Un échec est horodaté comme un succès.** Sans cela, une tâche en panne serait
   retentée à *chaque* requête suivante — une avalanche déclenchée par une simple
   indisponibilité de source.

Robustesse recherchée : après une semaine de sommeil, la première requête qui suit
constate que la tâche est due et la déclenche. Un cron, lui, aurait manqué l'échéance.

## Alternatives considérées

- **`@nestjs/schedule` en processus.** Rejeté : ne se déclenche pas pendant le sommeil du
  service, et les exécutions manquées sont perdues silencieusement.
- **Déclencheur externe** (cron GitHub Actions appelant un endpoint). Écarté pour l'instant :
  ajoute une dépendance hors du dépôt et un secret d'appel, pour un gain limité tant que
  l'application reçoit du trafic. Reste la voie naturelle si une exécution ponctuelle
  devenait indispensable — le port `JobStateStore` ne changerait pas.
- **Plan payant avec worker dédié.** Contraire à la contrainte de coût nul (ADR-0012).

## Conséquences

**Positives** : fiable sous scale-to-zero ; idempotent ; sans dépendance ni service
supplémentaire ; l'état de chaque tâche est inspectable en base (dernière exécution,
statut, erreur) ; réutilisable par toute fonctionnalité future.

**Négatives** : une tâche ne s'exécute **que si l'application reçoit du trafic** — sur une
instance totalement inactive, rien ne tourne. C'est acceptable ici : une synchronisation
n'a d'intérêt que pour des utilisateurs qui consultent l'application. L'échéance est par
ailleurs approximative (« au moins un jour » plutôt qu'« à 3 h du matin »), ce qui convient
aux usages visés mais interdirait une tâche à heure fixe.
