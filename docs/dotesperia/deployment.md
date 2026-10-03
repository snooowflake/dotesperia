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
L'interface demande une session sur l'adresse privée HTTPS. Le code d'association
est à usage unique et expire après cinq minutes. Après association, ouvrir
simplement l'adresse du serveur : le cookie HttpOnly/Secure est conservé par
le navigateur. La session dure trente jours, renouvelés à l'usage, avec une
nouvelle association au plus tard après cent quatre-vingts jours. Les sessions
peuvent être révoquées depuis l'interface. La commande ne lit aucun identifiant Codex.

## Certificat de l'interface privée

Sur la VM audit, l'adresse stable est `https://10.70.0.10:18898/`. Pour éviter
l'erreur de confiance sans désactiver la vérification TLS, préparer une autorité
privée limitée à cette IP, à `127.0.0.1` et à `localhost`. L'administrateur
prépare `/opt/dotesperia/tls` avec l'opérateur comme propriétaire, le groupe
`dotesperia-net` et le mode 2750. L'installation des services prépare ce dossier.

Exécuter `sh deploy/dotesperia/prepare-tls.sh` sous l'opérateur non-root. Sa clé
d'autorité reste sur la VM, mode 0600. Le certificat serveur est signé pour
un an ; seuls les fichiers serveur nécessaires sont lisibles par le relais.
Redémarrer uniquement `dotesperia-web` pour charger le certificat. Conserver
l'autorité et réexécuter ce script pour renouveler le certificat serveur avant
son expiration, sans réinstaller l'autorité sur chaque appareil.

Copier uniquement le certificat **public** `authority.crt` vers l'appareil
client et comparer son empreinte SHA256 avec celle affichée dans la session
SSH authentifiée. Sur Windows, l'opérateur peut utiliser :

```powershell
./deploy/dotesperia/trust-certificate.ps1 -CertificatePath ./authority.crt -ExpectedSha256 <empreinte-verifiee>
```

Le script importe seulement cette autorité dans `Cert:\CurrentUser\Root`.
L'utilisateur doit valider l'avertissement de confiance si Windows l'affiche.
Ne jamais transférer `authority.key`, désactiver la validation TLS ou conserver
un lien d'association expiré comme favori. Ouvrir ensuite l'adresse stable et
associer le navigateur une seule fois. Si le navigateur ne recharge pas ses
autorités, le fermer et le rouvrir.

## Réseau et exploitation

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
