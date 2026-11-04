# Niveau 7 — La Forêt des Glaces Enchantées

Implémentation du 4 novembre 2026. Cible de difficulté : 8/10 ; cette appréciation reste à confirmer en jouant dans un navigateur.

## Fichiers

Mise à jour du chargement : les illustrations utilisent désormais `?url&no-inline` pour éviter une erreur `atob()` de Phaser avec les SVG intégrés par Vite. Un écran de reprise protège les erreurs de chargement. Voir [le rapport du correctif SVG](level7-svg-fix.md) pour la reproduction et les résultats actualisés des tests.

Créés :
- `src/scenes/Level7Scene.ts` : scène, collisions, collecte, interface, puzzle, poursuite, pause, victoire.
- `src/world/iceCreamCourse.ts` : parcours de 6 100 pixels et fonctions déterministes de gameplay.
- `src/world/iceCreamTextures.ts` : sols, gaufrettes, flocon et dessins de secours des personnages.
- `src/assets/enemies/frosty-fraise.svg`.
- `src/assets/enemies/picpic-glace.svg`.
- `src/assets/enemies/glacior.svg`.
- `src/assets/characters/iceCream/vanilline.svg`.
- `tests/level7.test.mjs` : 15 tests du niveau et de son intégration.
- `tests/menuFixture.mjs` : construction du vrai menu et exécution de ses callbacks de sélection.
- `docs/level7.md` : ce rapport.

Modifiés :
- `src/main.ts` : enregistrement de Level7Scene.
- `src/scenes/MenuScene.ts` : grille des sept niveaux, verrouillage selon la réussite du précédent.
- `src/scenes/Level6Scene.ts` : bouton NIVEAU SUIVANT et annonce de la forêt.
- `tests/level2.test.mjs`, `tests/level3.test.mjs`, `tests/level4.test.mjs` : vérification du vrai menu en grille, sans supposer une liste fermée à quatre scènes.
- `tests/level6.test.mjs` : assertions compatibles avec les guillemets doubles, les espaces et les appels sur plusieurs lignes du code existant.

Sauvegardes avant modification : `src/main.ts.before-level7.bak`, `src/scenes/MenuScene.ts.before-level7.bak`, `src/scenes/Level6Scene.ts.before-level7.bak`.
Aucun commit ou push. Les fichiers préexistants non suivis ont été conservés.

## Parcours et commandes

Le jeu reste en 900 × 650. Quatre zones : forêt des cornets, rivière multicolore, grotte lumineuse et palais. Les collines de sorbet, cornets, stalactites, palais et neige sont dessinés localement.

← / → pour avancer ou freiner ; Espace / ↑ pour sauter, puis un second appui pour le double saut de la Plume. Tolérance au bord : 130 ms ; mémorisation du saut : 140 ms. La hitbox de Zaynab reste de 30 × 75 pixels pour une illustration de 100 pixels de haut, avec son PNG officiel inchangé.

Glace : accélération de 720 px/s², glissement au relâchement avec freinage de 340 px/s², freinage inverse de 1 150 px/s², vitesse limitée à 260 px/s. Gaufrette : déplacement et arrêt directs. Les plateformes mobiles transportent leur passagère et laissent passer les sauts par dessous.

Les plateformes roses commencent à trembler et clignoter au contact. Leur collision reste active pendant 1,2 s ; elles deviennent translucides et non solides pendant 2 s, puis retrouvent leur collision. Une chute remet ces plateformes en état et replace les plateformes mobiles à leur départ.

Il y a exactement **16 étoiles**, quatre par zone, **3 cristaux**, **8 ennemis ordinaires** (4 Frosty Fraise et 4 Pic-Pic Glacés), **3 checkpoints** (x = 1400, 2800, 4340), **3 miroirs**, **2 stalactites mobiles** et **3 cœurs**. Glacior est un personnage de poursuite, distinct des huit ennemis.

Une chute coûte toujours un cœur, même pendant l’invulnérabilité. Les ennemis respectent 1,6 s de protection après un dégât. Les trouvailles, la résolution des miroirs, la restauration et une poursuite déjà terminée sont conservées après une chute. À zéro cœur, Rejouer relance le niveau sans limite de tentatives ; une nouvelle partie remet la collecte à zéro.

Échap et Pause suspendent physique, déplacements, horloge locale, timers, animations et tweens ; l’input du panneau reste actif. Reprendre, Rejouer et Menu principal sont disponibles.

## Cristaux et miroirs

Fraise : x = 1160, y = 470, à la fin de la forêt.
Menthe : x = 2460, y = 155, sur la plateforme haute de la rivière. La montée de 185 pixels depuis la plateforme à y = 395 demande le double saut.
Vanille : x = 4050, y = 470, derrière la porte. Sa collecte reste bloquée tant que les miroirs ne sont pas résolus.

Chaque miroir a quatre orientations indépendantes (0°, 45°, 90°, 135°). Les positions initiales sont distinctes : **0°, 45°, 90°**. Le rayon est tracé à partir des angles actuels, et le récepteur ouvre immédiatement la porte lorsqu’il est atteint. Les angles sont affichés sous les miroirs.

Solution unique vérifiée sur les 64 combinaisons : **135°, 135°, 45°**, soit **3 clics sur le miroir 1, 2 sur le miroir 2, 3 sur le miroir 3** depuis l’état initial. Trajet : source (3020,280) → miroir 1 (3200,280) → miroir 2 (3200,190) → miroir 3 (3500,190) → récepteur (3500,340).

Cliquer sur un miroir ou utiliser les touches 1 / 2 / 3 dans la grotte. R réinitialise le puzzle sans dégât, avant sa résolution. Les gravures indiquent les directions à obtenir ; une aide apparaît après 6 rotations et les angles exacts après 10 rotations infructueuses. La porte occupe toute la hauteur utile pour empêcher son contournement depuis les plateformes.

## Glacior et victoire

À x > 4390, Glacior vole le Cœur et la poursuite commence après le troisième checkpoint. Il reste à environ 200 pixels devant Zaynab et s’arrête à x = 5810. Il est rattrapé à x ≥ 5750 : éclair lumineux, pirouette du voleur et restitution du Cœur au socle. Aucun combat à trois coups sur la tête et aucun chronomètre global.

Une chute ramène au checkpoint de poursuite, réinitialise les plateformes nécessaires et replace le Cœur pour une nouvelle tentative si Glacior n’a pas encore été rattrapé.

E près du socle (x = 5840) restaure le Cœur une fois les trois cristaux obtenus et les miroirs résolus. Le portail à x = 6000 exige aussi les 16 étoiles et la poursuite terminée. Il indique les objectifs manquants sans compteurs à zéro. Si seule la poursuite reste dans les objectifs de collecte/puzzle, il annonce : « Il ne reste que Glacior ! Rattrape-le ! »

E près du portail permet un retour magique au départ tant que la victoire n’a pas été déclenchée. Il conserve la progression et permet de chercher les étoiles oubliées ; les plateformes offrent également un trajet retour.

La victoire inscrit `level7Complete = true` et `eternalCrystalSnowflake = true` dans Phaser Registry, en conservant les récompenses précédentes. Le Flocon de Cristal Éternel possède un dessin bleu glacier, halo, rotation et éclats animés. Le panneau propose Retour au menu et Rejouer ; Niveau suivant n’apparaît que si Level8Scene existe réellement.

## Illustrations

Les quatre SVG sont des dessins originaux locaux, avec visages, détails, couleurs et silhouettes propres. Ils sont chargés par `load.svg`. Les mêmes clés possèdent des dessins Graphics de secours, isolés dans `iceCreamTextures.ts`. Il ne reste pas de remplacement PNG obligatoire. Pour une future variante illustrée, garder les clés `ice-frosty`, `ice-picpic`, `ice-glacior`, `ice-vanilline` et les dimensions 96×108, 96×108, 128×144, 112×128 ; adapter le loader si le format change. Aucun asset tiers et aucun remplacement de l’héroïne.

## Vérification et limites

- `npm run build` : réussi (TypeScript et Vite). Avertissement Vite sur le bundle principal supérieur à 500 kB.
- `node --test tests/*.test.mjs` : **44 tests réussis**, dont **15 nouveaux tests niveau 7**.
- Vérification XML des quatre SVG : réussie.
- Les tests exécutent les fonctions de gameplay, les méthodes et callbacks de la scène, la collecte, les checkpoints, le puzzle, la poursuite, les dégâts, la pause, la restauration, les conditions du portail, les récompenses et les actions de menu/rejeu.
- Le moteur Arcade installé simule les sauts entre les surfaces dans les deux sens, y compris aux deux extrémités des plateformes mobiles. Un test vérifie le transport de la passagère, le passage par dessous et la désactivation/réactivation de collision.
- Les tests des menus construisent la grille réelle et vérifient les sept déverrouillages et leurs callbacks.

Corrections pendant l’implémentation : séparation ennemi/checkpoint, montée Menthe exigeant le double saut, remise à zéro des plateformes au respawn, impossibilité de contourner la porte, affichage des angles, absence de messages à zéro, adaptation des anciens tests aux niveaux supplémentaires et au formatage existant.

**Test navigateur non réalisé** : l’outil de navigateur indique « browser access host is unavailable » ; le canal natif indique également un pipe absent. Aucun parcours visuel complet du début à la victoire n’a donc été effectué. Les tests physiques et les tests de callbacks ne remplacent pas ce parcours. Le rendu des SVG, les clics sur le canvas, le confort visuel, le comportement intégré dans le navigateur et la difficulté ressentie 8/10 restent à confirmer en jouant. Aucun résultat visuel ou validation à 100 % n’est revendiqué.

Pour la vérification manuelle : `npm run dev`, terminer le niveau 6, choisir NIVEAU SUIVANT ; vérifier les quatre zones, ramasser les objets, résoudre les miroirs, rattraper Glacior, restaurer avec E et entrer dans le portail. Refaire une chute et une pause dans la rivière et pendant la poursuite, puis tester Rejouer et Retour au menu.
