# Niveau 2 — La Rivière de Chocolat

## Accès et progression

`JOUER` démarre toujours le niveau 1. Après les neuf étoiles et la sortie de la forêt,
`Niveau suivant` démarre `Level2Scene`. Le menu affiche ensuite `NIVEAU 2`.
La réussite de la rivière inscrit `level2Complete = true` et
`magicChocolateTablet = true` dans le registre Phaser. Comme au niveau 1,
cette progression dure pendant la partie : recharger la page la réinitialise.
Aucun accès factice au niveau 3 n'est ajouté.

## Fichiers

Créés :

- `src/scenes/Level2Scene.ts` : scène indépendante, collisions, interactions et états.
- `src/world/chocolateCourse.ts` : géométrie, étoiles et paramètres de mouvement.
- `src/world/chocolateTextures.ts` : loaders PNG/SVG et imports Vite.
- `src/world/chocolateBackdrop.ts` : décor dessiné par Phaser, sans collision.
- `src/ui/sweetUi.ts` : cartes, boutons et panneaux réutilisables.
- `src/assets/enemies/truffinou.png`.
- `src/assets/characters/croustille/croustille.png`.
- `src/assets/objects/guimauve.svg`.
- `src/assets/objects/tablette-magique.svg`.
- `tests/level2.test.mjs`.
- `docs/level2.md`.

Modifiés :

- `src/main.ts` : enregistrement de la scène.
- `src/scenes/Level1Scene.ts` : uniquement le bouton de passage au niveau suivant.
- `src/scenes/MenuScene.ts` : accès au niveau débloqué et espacement des boutons.

Les assets et la physique du niveau 1 n'ont pas été modifiés pour cette mission.
Le niveau 2 réutilise l'héroïne détourée, les étoiles et les biscuits existants.
Aucun asset manquant ni bibliothèque supplémentaire.

## Parcours et physique

Le monde mesure 3 600 × 650 pixels ; la caméra suit l'héroïne et le HUD reste fixe.
Les positions de terrain indiquent toujours leur **surface supérieure**.
La vitesse horizontale reste de 235 px/s, le saut de −490 px/s et la gravité de
900 px/s² : montée maximale théorique de 133,4 px, portée à hauteur égale de 255,9 px.

| Zone | Contenu | Étoiles |
| --- | --- | --- |
| Rive des biscuits | Croustille, rive sûre, biscuit fixe, un Truffinou | 2 |
| Guimauves flottantes | Deux fixes, une mobile, tablette de récupération au sec | 3 |
| Pont cassé | Checkpoint sur une île sûre, trois biscuits séparés, un Truffinou | 3 |
| Cascade enchantée | Deux guimauves faciles, rive sûre, tablette magique et portail | 2 |

La guimauve mobile oscille de x=910 à x=990, à 24 px/s. Elle utilise un corps
dynamique `immovable`, sans gravité, et une friction horizontale de 1 : le solveur
Arcade entraîne le personnage. Aucun tween ne pilote sa position physique.
Les plateformes sont traversables depuis le dessous pour faciliter les sauts
de récupération ; les rives restent des solides complets.
Chaque Truffinou possède un collider uniquement avec sa propre rive.

Une chute retire un cœur, puis replace le personnage à (100,520), ou à (1410,520)
après activation du checkpoint. Les étoiles déjà collectées sont conservées.
La protection de 1,5 s s'applique aux ennemis et aux chutes ; une chute pendant
cette protection replace quand même le personnage au sec sans retirer un second cœur.
La pause conserve le temps de protection restant. `REJOUER` réinitialise le niveau
entier, y compris les étoiles, ennemis, checkpoint et états temporaires.

## Vérifications exécutées

- `npm run build` : compilation TypeScript et production Vite réussies.
- `node --test tests/level2.test.mjs` : neuf tests réussis.
- Les imports d'assets existent et les loaders correspondent à PNG/SVG.
- Les deux nouveaux personnages ont un canal alpha réel.
- Le test de transport et de traversée par-dessous utilise le solveur réel
  `SeparateY` de Phaser installé, sans navigateur.
- Les tests de scène utilisent des objets simulés : ils ne vérifient pas le rendu
  ni une partie complète dans le moteur.
- Avertissement Vite restant : bundle JavaScript supérieur à 500 ko.

## Vérification manuelle restante

L'accès au navigateur était indisponible pendant le développement.

1. Lancer `npm run dev`, ouvrir l'URL affichée et la console du navigateur.
2. Sur une nouvelle partie, cliquer `JOUER` : vérifier que la forêt reste le premier
   niveau, avec son héroïne, ses peppermint, ses biscuits et ses neuf étoiles.
3. Terminer la forêt puis cliquer `Niveau suivant`. Vérifier l'introduction de
   Croustille, puis `C’est parti !`. Aucune erreur Phaser ne doit apparaître.
4. Vérifier les commandes ← →, Espace et ↑ ; la caméra doit suivre et le HUD rester
   fixe. Les PNG doivent apparaître sans rectangle de fond.
5. Collecter les deux premières étoiles, dont celle sur le biscuit. Sauter sur les
   guimauves fixes puis rester immobile sur la mobile : elle doit transporter
   l'héroïne doucement dans les deux sens. Vérifier le saut depuis cette plateforme.
6. Se laisser tomber sur le biscuit de récupération sous les guimauves ; remonter
   vers une plateforme supérieure. Cette zone ne doit pas retirer de cœur.
7. Tomber dans le chocolat avant le checkpoint : un cœur doit être perdu et le
   personnage doit revenir à la rive initiale, protégé pendant 1,5 s. Les étoiles
   collectées doivent rester comptées.
8. Toucher le drapeau du checkpoint : vérifier son changement de couleur et le
   message, puis tomber après le pont. La réapparition doit avoir lieu sur l'île.
9. Toucher un Truffinou : un seul cœur doit être perdu pendant la protection.
   Vérifier que les ennemis restent sur leurs rives sans bloquer les guimauves.
10. Tester Échap et le bouton Pause pendant un déplacement de la guimauve et pendant
    l'invincibilité. Reprendre : pas de mouvement de plateforme ni de délai consommé
    pendant la pause. Vérifier aussi la pause automatique en changeant d'onglet.
11. Atteindre le portail avant d'avoir dix étoiles : aucune victoire. Revenir en
    arrière et récupérer les étoiles manquantes, y compris celles des zones précédentes.
12. Avec dix étoiles, rejoindre le portail : vérifier le panneau de victoire,
    la tablette et le retour au menu. `NIVEAU 2` doit rester accessible.
13. Rejouer depuis la pause, la défaite et la victoire : trois cœurs, compteur 0/10,
    checkpoint éteint et dix étoiles, sans doublons ni colliders supplémentaires.
14. Perdre les trois cœurs : vérifier « Oups ! Encore une aventure ? 💕 » et REJOUER.
15. Vérifier le retour au menu depuis la pause, puis relancer chaque niveau.

## Assets générés

Truffinou et Croustille ont été créés individuellement avec l'outil imagegen intégré,
en transparence, puis copiés dans le projet. Guimauve et tablette sont des SVG
natifs au projet ; le décor est dessiné par Phaser. Les prompts des deux PNG sont
conservés ci-dessous pour pouvoir créer des variantes cohérentes.

### Prompt Truffinou

> Use case: stylized-concept. Create ONE standalone 2D game enemy sprite named Truffinou for a cheerful pastel candy platformer for a six-year-old. Round milk chocolate truffle monster with tiny chocolate feet, expressive large friendly eyes, small mischievous smile with one rounded tooth, caramel swirl on top. Warm chocolate brown #8B4A30, dark chocolate #5A2E24, caramel accents #DFA060. Cute and playfully naughty, never scary. Clean colorful cartoon shapes, crisp readable silhouette, bold soft outline, restrained shading, fully visible front/slight three-quarter view. Match a polished children's candy adventure. Character centered, small transparent margin, real alpha transparent background. No environment, no floor, no shadow, no sparkles, no text, no watermark, no extra objects, no sprite sheet. No horror.

### Prompt Croustille

> Use case: stylized-concept. ONE standalone friendly NPC sprite Croustille, a cute biscuit beaver guide for a cheerful children's 2D candy platformer. Full body, front with slight three-quarter view, standing, waving one small paw. Golden buttery biscuit body and face, two rounded front teeth, sweet expressive brown eyes, broad flat waffle biscuit tail visible beside him. Small pastel lavender neckerchief. Clearly recognizable as a friendly beaver made of biscuits. Clean polished colorful 2D cartoon, warm caramel #DFA060 and cream #FFF1D8, soft brown outlines, restrained shading, bold readable silhouette. Suitable for age six, friendly and welcoming, not realistic. Centered and fully visible with small transparent padding, genuine transparent alpha background. No environment, ground, shadow, sparkles, text, watermark, extra characters or sprite sheet.
