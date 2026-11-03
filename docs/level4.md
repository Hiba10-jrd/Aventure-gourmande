# Niveau 4 — Le Palais des Cartes Sucrées

Le niveau est un jeu de mémoire indépendant des parcours de plateforme. Il
utilise les commandes souris et le bouton Pause, sans modifier les niveaux
précédents.

## Règles

- 20 cartes en grille de 5 colonnes sur 4 rangées, formant 10 paires.
- Les cartes sont mélangées avant d’être montrées pendant 10 secondes.
- Après le retournement, deux cartes sont comparées à la fois ; une paire
  trouvée reste visible, une paire incorrecte compte une erreur après 0,8 s.
- Trois erreurs terminent la manche. « Recommencer » relance une nouvelle
  manche mélangée, sans limite de tentatives.
- La pause suspend le compte à rebours et les animations. Les cartes ne
  répondent pas pendant le retournement ou la comparaison.
- La victoire conserve le Médaillon des Souvenirs et `level4Complete`.

Les cartes réutilisent les images existantes de l’héroïne, Peppermint,
Croustille et Truffinou, ainsi que les textures de mangue et d’ananas du niveau
3. La tortue, la fée, la princesse sucette et l’ogre sont dessinés en textures
vectorielles générées par le jeu ; ce sont de nouveaux personnages, pas des
personnages déjà rencontrés.

Le niveau 4 est débloqué après le niveau 3. Aucun niveau 5 n’étant enregistré,
la victoire affiche « À suivre… » au lieu d’un bouton de progression inactif.
