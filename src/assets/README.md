# Organisation des visuels

Le fond est un PNG ; les autres illustrations sont des fichiers SVG, chargés par
src/world/forestTextures.ts pendant le preload de Level1Scene.
Les particules et la porte interactive restent dessinées dans la scène.

| Dossier | Fichiers utilisés | Dimensions |
| --- | --- | --- |
| backgrounds/ | foret-bonbons.png | 1024 × 1024 (affiché en 900 × 650) |
| characters/heroine/ | heroine.svg | 56 × 64 |
| enemies/ | gelee.svg | 44 × 36 |
| objects/ | plateforme-bonbon.svg | 170 × 28 |
| objects/ | sol-biscuit.svg | 900 × 50 |
| objects/ | etoile.svg | 40 × 40 |
| objects/ | fleur.svg | 34 × 40 |
| objects/ | champignon.svg | 36 × 38 |

characters/heroine/hero-original.png est l’ancien fichier hero.png conservé ;
il n’est pas chargé par le niveau actuel.

characters/family/, characters/ogre/, audio/ et ui/ sont réservés aux futurs
contenus et ne sont pas chargés. Les SVG de Vite et TypeScript sont les fichiers
initiaux du projet, non utilisés dans le jeu.

Pour remplacer un visuel :
1. Placer le nouveau fichier dans son dossier, avec un nom explicite.
2. Modifier son import dans src/world/forestTextures.ts.
3. Conserver les dimensions indiquées pour préserver les collisions.
4. Pour un PNG, utiliser scene.load.image(key, url) ; pour une spritesheet,
   définir les dimensions des frames et les animations du personnage.

