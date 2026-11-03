# L’Aventure Gourmande

## Démarrage
- npm install (si nécessaire)
- npm run dev : ouvrir l’adresse affichée par Vite
- npm run build : compilation TypeScript et production dans dist/
- npm run preview : vérifier le build de production

## Commandes
Flèches gauche/droite pour marcher, Espace ou Haut pour sauter.
Échap ou Pause ouvre le panneau ; « Rejouer » recommence le niveau et « Menu
principal » revient au menu.

## Niveau 1
Trouver les neuf étoiles puis rejoindre la porte à droite.
Échap ou Pause ouvre le panneau : reprendre, recommencer, menu.
Deux gelées provoquent seulement un petit rebond avec invulnérabilité temporaire.
Aucune perte d’étoiles, de vie ou écran de défaite.
Le saut tolère une commande légèrement anticipée et un départ du bord.
La victoire permet de rejouer ou de passer au niveau 2.
La réussite est conservée dans le registre Phaser pendant la session, sans sauvegarde disque.

## Organisation et illustrations
- src/scenes/MenuScene.ts : menu existant et commandes.
- src/scenes/Level1Scene.ts : parcours, physique, collecte, interface et états de partie.
- src/world/forestTextures.ts : manifeste et préchargement des fichiers SVG du niveau.
  Les clés sweet-* et dimensions sont centralisées ; pour utiliser un PNG, modifier son import et employer scene.load.image à la place de scene.load.svg.
  Le personnage est un Arcade.Sprite, prêt à recevoir des animations de spritesheet.
- src/assets/characters/heroine/hero-original.png est conservé, mais non utilisé par ce niveau.
Aucun téléchargement d’assets. Les petits sons sont synthétisés via le contexte audio Phaser ;
ils sont silencieux tant que le navigateur ne permet pas la lecture audio.

## Validation
Compilation TypeScript et build Vite réussis avec les versions installées :
Phaser 4.2.1, TypeScript 7.0.2, Vite 8.3.5.
Avertissement Vite non bloquant : bundle Phaser supérieur à 500 Ko.
Le niveau 3 a aussi été vérifié dans le navigateur : affichage des zones,
déblocage depuis le menu, collecte, dégâts, checkpoints, trampoline, plateformes
mobiles, puzzle, récompense, sortie et boutons de victoire/défaite.

### Parcours de recette manuelle
1. Menu : ouvrir/fermer les instructions plusieurs fois, cliquer JOUER.
2. Marcher dans les deux sens et tester les limites du monde.
3. Sauter avec Espace puis Haut ; monter les trois plateformes (écarts verticaux 95–114 px).
4. Vérifier les collisions par-dessus, par-dessous et sur les côtés.
5. Collecter toutes les étoiles : disparition unique, compteur, particules, son après interaction.
6. Toucher les deux gelées : rebond sans perte ; elles patrouillent dans leur zone.
7. Atteindre la porte avant neuf étoiles : indication du nombre manquant, aucune victoire.
8. Pause par bouton/Échap : monde figé ; reprendre, recommencer, quitter vers le menu.
9. Changer de fenêtre : pause automatique.
10. Avec neuf étoiles, rejoindre la porte : victoire, rejouer, panneau niveau 2, menu.
11. Répéter menu/niveau/rejouer pour vérifier les remises à zéro et l’absence d’écouteurs multiples.

## Niveau 3
Après la victoire du niveau 2, le menu débloque « Niveau 3 — L’Île des Mangues
Dorées ». Collecter dix étoiles, activer les deux checkpoints, résoudre le
puzzle visuel des fruits et récupérer la Mangue Dorée pour ouvrir la sortie.
Voir [docs/level3.md](docs/level3.md) pour le parcours et les tests.

## Niveau 4
Après la victoire du niveau 3, le menu débloque « Niveau 4 — Le Palais des
Cartes Sucrées ». Retrouver dix paires identiques parmi vingt cartes après dix
secondes d’observation ; trois erreurs maximum par manche. Voir
[docs/level4.md](docs/level4.md).
