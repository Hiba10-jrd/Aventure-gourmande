# Correction des clics et accès développeur temporaire

## Diagnostic

Mise à jour : le blocage à l’entrée du niveau 7 a ensuite été reproduit dans le chargeur SVG et corrigé. Voir [le diagnostic atob et SVG](level7-svg-fix.md). Les limites du diagnostic initial ci-dessous décrivent l’état avant ce nouveau signalement.

Les sept scènes existent et sont enregistrées dans `src/main.ts`. Les cartes originales avaient bien un `setSize(380,76)`, un `setInteractive` et un callback `pointerdown`. Aucun gestionnaire `pointerup` ne lançait une deuxième transition. Leurs positions tenaient dans le canvas. Il serait donc incorrect d’attribuer avec certitude le blocage des cartes à une scène manquante, à une profondeur insuffisante ou à une absence de `setInteractive`.

Une simulation de l’ancien menu reçoit les sept clics à caméra nulle. Le blocage précis observé dans le navigateur n’a pas été reproduit : l’hôte de navigateur et le canal natif sont indisponibles dans l’environnement, empêchant également la lecture de la console du navigateur. La correction du menu rend les cibles explicites et couvre le défilement, mais ne prouve pas à elle seule l’origine exacte du symptôme sur la machine.

Un autre défaut est reproduit : dans COMMENT JOUER, le fond enfant était interactif et le callback de fermeture se trouvait sur le conteneur parent. Le fond gagne le hit test ; Phaser n’effectue pas de propagation automatique vers ce parent. La fenêtre ne se fermait donc pas sur ce clic. Un test reproduit cette ancienne hiérarchie puis vérifie la fermeture corrigée.

Les anciens tests du menu appelaient directement le callback enregistré. Ils ne vérifiaient ni la réception du clic, ni l’ordre des objets rendus, ni la propagation. Les anciens tests UI construisaient une liste de rendu aplatie artificiellement.

## Modifications

- `src/scenes/MenuScene.ts` : les cartes sont désormais des rectangles interactifs explicites, directement enfants du panneau, sans conteneur de carte intermédiaire. Le texte reste non interactif. Fond, cartes et retour ont leur propre facteur de défilement nul ; les hitboxes correspondent à leur géométrie visible. Les cartes arrêtent la propagation puis passent par `startLevel`, qui vérifie l’existence de la scène, les droits d’accès et ferme le panneau. Le fond reste derrière les cartes dans l’ordre de rendu. Le niveau de profondeur du panneau reste 100 ; la correction ne repose pas sur une hausse arbitraire de profondeur.
- Les commandes 1 à 7, y compris au pavé numérique, lancent les niveaux correspondants dans le menu développeur. Une indication MODE DÉVELOPPEUR apparaît dans la grille.
- Le clic de fermeture de COMMENT JOUER est attaché au fond qui reçoit effectivement l’événement.
- `src/ui/sweetUi.ts` : chaque bouton conserve son conteneur visuel mais possède un rectangle de clic explicite de même taille, rendu au-dessus de ses éléments visuels. Ses événements sont relayés explicitement vers le contrôle. Seul `pointerdown` lance l’action ; `pointerup` ne la répète pas. Le rectangle a son propre `scrollFactor(0)`. Les boutons appartiennent au panneau après son fond ; la destruction du panneau nettoie aussi leurs hitboxes et écouteurs. Cela couvre les panneaux de victoire, défaite et pause utilisant sweetPanel, dont le niveau 6.
- `src/config/devMode.ts` : `ENABLE_DEV_MODE = true` permet l’accès temporaire ; mettre cette constante à false rétablit la progression normale même sous Vite dev. La condition `import.meta.env.DEV` impose toujours false dans le build de production.
- L’accès développeur accorde la Plume et la Clé nécessaires aux essais des derniers niveaux, sans inscrire de drapeau `levelNComplete`.
- `tests/inputHarness.mjs`, `tests/menuInput.test.mjs`, `tests/menuFixture.mjs`, `tests/sweetUi.test.mjs` : tests de clics renforcés et nouveaux cas de régression.

Aucune modification supplémentaire à main.ts ou à la scène du niveau 6 n’était nécessaire pour ce correctif : leurs scènes et callbacks étaient déjà présents. Aucun commit ni push.

Des sauvegardes `.before-input-fix.bak` ont été faites pour MenuScene, sweetUi et devMode.

## Vérifications

- `npm run build` : réussi ; avertissement Vite habituel sur la taille du bundle.
- `node --test tests/*.test.mjs` : 50 tests réussis, aucun échec.
- `git diff --check` : réussi.
- Les tests utilisent les méthodes de hit test, de tri et de dispatch pointerdown/pointerup du Phaser installé. Les parcours des conteneurs utilisent ses renderers Canvas et WebGL ; le dessin GPU des primitives et le DOM sont simulés.
- Les sept cartes sont cliquées avec les deux parcours de rendu et les décalages de caméra 0, 450 et 2700.
- Les cartes verrouillées, les limites des cartes, les scènes absentes, la fermeture/réouverture, le blocage du fond et l’absence de propagation vers le menu sous-jacent sont vérifiés.
- Les trois callbacks réels de victoire du niveau 6 sont exécutés par clic : Level7Scene, MenuScene et restart, avec physique/tweens suspendus et caméra à 0, 1900 et 3600. Chaque couple pointerdown/pointerup déclenche exactement une action. Les hitboxes disparaissent à la fermeture du panneau.
- Le mode production conserve le verrouillage par progression. La condition DEV est testée pour les deux valeurs.

## Limite restante

Aucun test dans un vrai navigateur ni lecture de sa console n’a pu être effectué : l’outil retourne « The browser access host is unavailable » et le canal natif est absent. Les résultats ci-dessus sont des vérifications automatisées ciblées, pas une validation visuelle. L’origine exacte du blocage initial des cartes et du panneau de victoire reste à confirmer dans le navigateur de l’utilisateur.

Pour l’essai manuel : relancer `npm run dev`, recharger la page, ouvrir LES NIVEAUX et vérifier chaque carte ; vérifier ensuite NIVEAU SUIVANT, Retour au menu et Rejouer sur la victoire du niveau 6. Aucun effacement de progression n’est nécessaire.
