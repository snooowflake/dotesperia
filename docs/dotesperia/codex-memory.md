# Memoire avec le compte Codex prive

Le moteur Codex natif expose maintenant l'appel de texte dont l'entretien de
memoire a besoin. Une preference durable peut etre extraite apres le repos d'un
fil, inscrite dans les notes locales et rappelee dans un autre fil. Le journal
local conserve l'origine du changement et les appels sont imputes au bot dans
le suivi d'usage. L'entretien utilise le modele choisi par ce bot.

Chaque appel ouvre un processus Codex et un fil ephemere distincts. Le texte
passe sur l'entree standard, jamais dans les arguments. Les outils shell,
image, navigateur, ordinateur et MCP sont desactives. La configuration
effective est verifiee avant l'envoi des notes ; une configuration non confinee,
une demande d'outil ou d'approbation entraine un refus. Un delai maximal de
60 secondes, l'annulation et la deconnexion arretent le travail de fond.

Seule la connexion Codex dediee a Dotesperia est utilisee. Aucune cle API
implicite, aucun service heberge du fournisseur du fork et aucun identifiant
Hermes ne servent de repli. Les notes demeurent sur la VM ; les extraits soumis
au modele cloud sont transmis a OpenAI, comme les messages de conversation.

## Verification isolee

```sh
node node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=2 \
  server/drivers/codex-text.test.ts server/codex-memory.e2e.test.ts
```

Ces tests utilisent uniquement un moteur fictif et des dossiers jetables. Ils
verifient le confinement, les refus, l'annulation, la comptabilisation d'usage,
l'apprentissage automatique et le rappel dans un nouveau fil. Le lancement
de fixture ne transmet que les variables `FAKE_CODEX_*` du moteur fictif.

Le controle explicite `scripts/verify-dotesperia-live-memory.ts` peut ensuite
verifier l'extraction et le rappel avec le modele reel. Il exige un dossier
neuf `/home/dotesperia/validation-*` et la connexion native appartenant a
`/home/dotesperia/.dotesperia/providers/codex/`. Le processus doit etre execute
sous l'utilisateur dotesperia avec le meme proxy et le meme confinement que
le service. Il ne cree ni conversation ni memoire dans l'application reelle :
il utilise une preference synthetique dans ses propres donnees jetables.
Ce controle consomme des appels au compte autorise et peut rafraichir les
identifiants de cette seule connexion. Il n'est jamais lance par les tests
automatiques ordinaires. Son resultat local ne contient aucun identifiant.

Les controles de reprise simulent l'arret du serveur de fixture. Un reboot
complet de la VM de production et le bureau graphique complet ne sont pas
valides par cette recette. Aucune integration Hermes n'est installee.
