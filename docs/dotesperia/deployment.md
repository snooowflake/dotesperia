# Installation indépendante sur une VM Linux

La VM doit fournir Node 24+, un compte opérateur non-root, systemd, nftables et
assez d’espace pour le navigateur et les données. Ne réutiliser aucun home,
identifiant, volume, profil ou service d’un autre agent.

1. Cloner la branche `privacy-foundation` du fork dans `/opt/dotesperia/repo`
   sous le compte opérateur. Tant que la PR n’est pas fusionnée, `main` conserve
   le code amont et ne contient pas ce profil privé.
2. Installer le runtime portable vérifié et Codex dans `/opt/dotesperia`,
   toujours sous ce même compte. Installer les dépendances avec les scripts
   automatiques désactivés, puis compiler et lancer les fixtures isolées.
3. Installer les comptes et unités avec `deploy/dotesperia/install-services.sh`.
   Les fichiers de projet et unités appartiennent à l’opérateur ; les données
   appartiennent à `dotesperia`. Ne donner aucun accès sudo/Docker à ce compte.
4. Dans `/opt/dotesperia/runtime.env`, choisir l’adresse privée HTTPS. Fournir
   un certificat de l’opérateur, ou un certificat local explicitement approuvé
   par les appareils clients. Aucun tunnel hébergé n’est utilisé.
5. Créer une configuration locale avec un seul moteur `codex`, son CLI dédié,
   un répertoire de travail dans `/home/dotesperia/workspace` et `approvalMode=ask`.
6. Démarrer le relais réseau et l’interface. Connecter le compte ChatGPT avec
   `login-codex.sh` exécuté sous `dotesperia`, jamais sous root. Cette nouvelle
   session n’utilise pas le fichier d’authentification d’un autre agent.

Préparer le navigateur sous le compte opérateur avec
`node scripts/prepare-browser.mjs --target linux-x64`. Le téléchargement vérifie
les versions et empreintes épinglées. Relier le bundle produit à
`/opt/dotesperia/resources/browser-engine`, définir `OMB_RESOURCES_PATH` et
installer les bibliothèques système manquantes signalées par `ldd`.
Les profils restent dans le home du nouveau compte.

Pour associer un navigateur distant, exécuter `deploy/dotesperia/pair-ui.sh`
sur la VM sous le compte opérateur et ouvrir le lien temporaire affiché.
L’interface demande une session sur l’adresse privée HTTPS. Un certificat local
doit être accepté personnellement ou installé comme certificat de confiance par
l’opérateur. La commande ne lit aucun identifiant Codex.

`DOTESPERIA_OWNER_ORIGINS` est une liste JSON d’origines exactes de services
appartenant à l’opérateur. Le fichier d’environnement est administré hors du
workspace de l’agent. Les wildcards, identifiants dans les URLs et domaines du
fournisseur sont refusés. Les connexions TLS doivent présenter le nom demandé ;
les noms cachés, absents ou messages non pris en charge sont refusés.

Les connexions locales sur ports hauts sont nécessaires aux canaux internes
et aux gates MCP ; les services système et SSH locaux ne sont pas accessibles.
Les autres applications de la VM doivent garder leur propre authentification.
Le sandbox systemd doit masquer leurs données et les homes des autres comptes.

Pour arrêter le fork : désactiver et arrêter `dotesperia-web`, `dotesperia`,
`dotesperia-egress` et `dotesperia-egress-policy`. Conserver les données ou les
exporter avant toute suppression. Le seul tableau réseau propre au fork est
`inet dotesperia`. Son retrait ne nécessite aucun changement de Hermes.

L’inférence cloud transmet le contexte choisi à OpenAI. Les paramètres de
confidentialité Codex utilisés sont documentés dans la
[référence officielle](https://learn.chatgpt.com/docs/config-file/config-reference).
