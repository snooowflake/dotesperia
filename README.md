# Dotesperia

Un agent personnel persistant, hébergé sur votre serveur, avec Codex/ChatGPT
pour le modèle cloud. Fork indépendant d’[OpenMausBot](https://github.com/milind-soni/OpenMausBot).

Les données, mémoires, tâches et approbations restent locales. L’inférence
cloud transmet le contexte nécessaire à OpenAI : c’est une exception explicite,
pas une promesse d’inférence entièrement locale.

Le socle privé supprime PostHog et la collecte d’adresse e-mail, impose des
sessions Codex séparées et refuse les connexions hébergées du fournisseur.
Le déploiement Linux ajoute un compte sans privilèges, un pare-feu propre à
ce compte, un relais limité aux destinations autorisées et une interface HTTPS
privée. Les anciens lanceurs Electron, CLI et compagnon sont désactivés.

Les routines, mémoires structurées, tâches, historiques et approbations de la
base sont conservés. Les actions interrompues restent à examiner avant d’être
relancées. Les mécanismes propriétaires des Dots OpenAI ne sont pas reproduits.

* [Architecture, frontières et étapes restantes](docs/dotesperia/architecture.md)
* [Installation indépendante](docs/dotesperia/deployment.md)
* [Objectifs, événements et proactivité](docs/dotesperia/proactivity.md)
* [Vérification par fixtures isolées](docs/verification/README.md)

Le navigateur doit utiliser le relais de l’opérateur. Les services MCP locaux
ou possédés par l’opérateur remplacent le courtier Composio. Le Web public et
la délégation à un autre agent sont désactivés par défaut.

L’installation ne réutilise ni ne modifie le home, les plugins, les profils,
services ou identifiants d’un Hermes existant. Son arrêt ne demande aucune
réparation de cet autre agent.

Ce travail est un socle en cours de validation, avec du code de compatibilité
hérité derrière des capacités refusées. Voir l’architecture pour les limites
et la distinction entre tests fictifs et validation avec un compte réel.

## Licence et origine

OpenMausBot a été créé par Milind Soni et ses contributeurs. Le fork conserve
leurs attributions et la [licence Apache 2.0](LICENSE). Référence initiale du
fork : `5e8b2523f02449ca18aff90edf47ce386c696872`.
