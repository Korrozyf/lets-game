# Let's Game

[![Licence MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Une extension de navigateur toute simple pour préparer des équipes, suivre les scores d'une partie et afficher le podium.

## Télécharger

La dernière version stable et ses paquets Chrome/Edge et Firefox sont disponibles dans les [Releases GitHub](https://github.com/Korrozyf/lets-game/releases/latest).

## Fonctionnalités

- Paramètres des équipes : jusqu'à 8 équipes, ajout et suppression, nom libre et bouton de sélection affichant les autres noms proposés même si un nom est déjà saisi, 8 logos sourire et 8 couleurs prédéfinies nettement différenciées. Le bouton d'ajout est désactivé une fois la limite atteinte. Le bouton de réinitialisation efface les réglages personnalisés et restaure deux équipes de base, avec leurs scores remis à zéro.
- Partie : cartes carrées, deux équipes par rangée jusqu'à 4 équipes, puis quatre par rangée de 5 à 8 équipes. Boutons `+` et `−`, scores négatifs autorisés. Les tuiles et les commandes se redimensionnent automatiquement à la fenêtre pour afficher toutes les équipes et l'interface sans défilement.
- Podium : les équipes à égalité partagent la même marche. Les marches suivantes correspondent aux scores distincts suivants ; le podium présente au plus trois groupes de scores.
- Une nouvelle partie démarre tous les scores à zéro. Les paramètres et les scores en cours sont conservés dans le stockage local du navigateur.
- Aucun compte, aucune requête réseau et aucune collecte de données.

## Installer dans Chrome ou Edge

1. Téléchargez puis décompressez l'archive `lets-game-<version>-chromium.zip` depuis les [Releases GitHub](https://github.com/Korrozyf/lets-game/releases/latest).
2. Ouvrez `chrome://extensions` dans Chrome ou `edge://extensions` dans Edge.
3. Activez le **Mode développeur**.
4. Choisissez **Charger l'extension non empaquetée** et sélectionnez le dossier décompressé.
5. Cliquez sur l'icône Let's Game : la page de partie s'ouvre dans un nouvel onglet.

Pour modifier les équipes, sélectionnez **Paramètres** depuis la partie. Les changements faits dans les réglages ne sont conservés qu'après **Enregistrer les paramètres** ou **Lancer une nouvelle partie**.

## Installer temporairement dans Firefox

1. Ouvrez `about:debugging#/runtime/this-firefox`.
2. Cliquez sur **Charger un module complémentaire temporaire…**.
3. Sélectionnez `manifest.json` dans le dossier de l'extension décompressé.

Le fichier `.xpi` fourni est prêt pour les tests, mais n'est pas signé. Pour une installation permanente dans Firefox, l'extension doit être signée par Mozilla (par exemple en la soumettant comme module complémentaire non répertorié).

## Vérifications et génération des paquets

Avec Node.js, Python 3 et les outils `zip` et `unzip` disponibles :

```sh
./tools/build.sh
```

Le script exécute les tests puis crée les paquets Chromium et Firefox dans
`dist/`. Chaque paquet contient aussi le fichier `LICENSE`. Les paquets sont
publiés automatiquement en pièces jointes d'une Release GitHub lorsqu'un tag
correspondant à la version du manifeste est poussé (par exemple `v1.4.1`).

## Licence

Le code source et les éléments originaux de ce dépôt sont distribués sous la
licence [MIT](LICENSE). Le fichier `LICENSE` est inclus dans les paquets
Chromium et Firefox. Les composants tiers éventuels restent soumis aux avis de
licence qui leur sont propres.
