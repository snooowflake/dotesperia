# Objectifs et proactivité

Le bouton **Objectifs** de l'interface privée ouvre les responsabilités confiées
aux bots. L'opérateur choisit un bot, le résultat attendu, les actions autorisées
et un maximum quotidien. Aucun objectif n'est créé automatiquement à l'installation.

Un objectif peut commencer immédiatement, observer un fichier ou un dossier
de son propre espace de travail, ou recevoir un événement nommé de l'opérateur.
Pendant son exécution, le bot enregistre un résultat avec `objective_checkpoint`
et choisit sa suite :

* `sleep` : poursuivre après 1 minute à 7 jours ;
* `wait_event` : attendre une source préalablement autorisée ;
* `complete` : le résultat demandé a été vérifié ;
* `need_input` : demander une décision et arrêter la poursuite automatique.

Le bot conserve ses outils et permissions ordinaires. Le suivi d'un objectif
ne lui donne aucun droit supplémentaire. Seul le bot et le fil de l'exécution
courante peuvent enregistrer son point de reprise. Les approbations restent
traitées par le moteur et la file existants.

## Exemple sans connexion à Hermes

Créer un dossier `incoming` dans le workspace du bot et lui confier :
« Examiner les nouveaux documents de incoming, préparer un résumé dans mon
workspace, puis attendre le prochain document. Demander mon accord avant
toute autre modification. » Choisir `incoming` comme dossier surveillé et
décochez « Commencer maintenant » si aucun examen initial n'est souhaité.

Le suivi détecte un changement de métadonnées au premier niveau, sans lire
le contenu pour détecter les événements. Le bot lit ensuite les documents
dans le cadre de ses permissions. Les chemins et liens sortant de son
workspace sont refusés. Un changement ne déclenche pas nécessairement une
exécution par fichier : les événements rapprochés sont regroupés.

## Événements privés

Une intégration appartenant à l'opérateur peut émettre un événement avec
`POST /api/proactivity/<id>/events`, une session **admin** existante et un
corps JSON tel que :

```json
{"id":"document-42","name":"nouveau_document","context":"Document prêt dans incoming"}
```

Le nom doit correspondre à celui enregistré dans l'objectif. Le contexte est
borné, expurgé des secrets reconnus et présenté comme donnée non fiable au
modèle ; il ne constitue jamais une autorisation. Les 128 derniers identifiants
d'événement sont conservés pour éviter les doublons. Cet endpoint n'est pas
un webhook anonyme. Aucune intégration à Hermes, à ses fichiers ou à ses
identifiants n'est installée.

## Persistance et limites

Le fichier local `objectives.json` contient les responsabilités, points de
reprise, réveils, résultats et compteurs. Il est écrit atomiquement avec le
mode 0600. Le suivi observe les changements toutes les cinq secondes sans
appel au modèle tant qu'aucun travail n'est dû. Les exécutions utilisent la
file de routines existante et ses reçus de livraison persistants.

La limite par objectif est de 1 à 48 exécutions par jour UTC, avec 12 par
défaut. Elle compte les démarrages ; elle ne plafonne pas les tokens d'une
exécution. Les réveils en attente reprennent au jour suivant si nécessaire.
La VM et ses services doivent rester disponibles ; le PC client peut être éteint.

Un redémarrage conserve les objectifs et les réveils futurs. Une exécution
interrompue, absente, en échec ou sans suite confirmée passe à « Décision
nécessaire ». Elle n'est pas rejouée automatiquement, car une action peut
avoir déjà produit son effet. Examiner le résultat avant de cliquer Reprendre.
Mettre en pause ou terminer un objectif annule sa propre exécution via la
file existante. Un fichier d'état corrompu empêche le démarrage du suivi.

## Vérification

`server/proactivity.test.ts` vérifie la reprise, les limites, la déduplication,
le confinement des chemins et des points de reprise, les échecs et les
décisions de l'opérateur. `server/proactivity.e2e.test.ts` lance un serveur,
un home et des données jetables : deux étapes Codex fictives traversent les
vrais outils MCP, la file, les reçus et la persistance. Le test vérifie aussi
le refus des accès anonymes et l'association d'une session web durable.

Ces tests prouvent le mécanisme d'orchestration ; ils ne mesurent pas la
qualité de raisonnement du modèle réel ni des intégrations futures.
