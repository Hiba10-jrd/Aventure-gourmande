# Niveau 3 — L’Île des Mangues Dorées

Le parcours utilise les commandes et l’héroïne des niveaux précédents : flèches
gauche/droite pour marcher, Espace ou Haut pour sauter, Échap pour mettre en
pause. Il conserve trois cœurs, les dégâts et 1,5 seconde d’invincibilité.

## Parcours

| Zone | Étoiles | Défi |
| --- | ---: | --- |
| Plage des Mangues | 2 | Découvrir le trampoline mangue |
| Jungle des Manguiers | 3 | Plateformes rapprochées et premier checkpoint |
| Cascade de Jus Doré | 3 | Deux plateformes mobiles, ennemis et second checkpoint |
| Temple de la Mangue Dorée | 2 | Ordre visuel mangue, ananas, noix de coco |

Les dix étoiles et le puzzle terminé font apparaître la Mangue Dorée. La sortie
ne valide la victoire qu’après la collecte de cette récompense. Les ennemis
patrouillent sur le sol, à vitesse modérée ; les cascades sont décoratives.
Les sauts emploient la gravité et les vitesses de déplacement du personnage.
Les plateformes ne bloquent que par le dessus, et les zones de reprise sont
signalées par des drapeaux.

La progression est conservée dans le registre Phaser pendant la session :
terminer le niveau 2 débloque le niveau 3 au menu. « Rejouer » réinitialise le
parcours et ses objectifs ; le menu principal reste accessible depuis la pause,
la victoire et la défaite.

## Vérification

`npm run build` compile le TypeScript puis produit le build Vite.
`node --test tests/level3.test.mjs tests/level2.test.mjs tests/sweetUi.test.mjs`
vérifie la géométrie des étoiles, les portées de saut, les patrouilles, la
progression et les parcours de boutons.
