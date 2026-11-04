# Niveau 7 — correction du blocage atob / SVG

## Cause démontrée

Le point d’entrée est `Level7Scene.preload()` dans `src/scenes/Level7Scene.ts`. Les quatre imports SVG utilisaient `?url`. Avec le Vite installé, ces petits fichiers sont intégrés sous forme d’URI SVG encodées en pourcentage **en développement comme en production**. Exemple réel pour Frosty Fraise :

```text
data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='96'%20height='108'…
```

Ce n’est pas du Base64. Le XML des illustrations n’est pas à l’origine de cette erreur.

Dans le Phaser installé :

1. `node_modules/phaser/src/loader/File.js` classe toute URL commençant par `data:` avec `base64 = true`.
2. `SVGFile.load()` hérite du chargement de File et appelle `XHRLoader`.
3. `node_modules/phaser/src/loader/XHRLoader.js`, ligne 26, entre dans sa branche Base64.
4. L’expression `file.url.split(';base64,').pop() || file.url.split(',').pop()` renvoie ici **l’URI entière**, parce que `;base64,` n’existe pas et que le premier résultat est une chaîne non vide.
5. À la ligne 44, `atob(base64Data)` reçoit donc `data:image/svg+xml,%3csvg…` et lève `InvalidCharacterError`.

La première illustration affectée dans l’ordre de preload est `frosty-fraise.svg`, puis `picpic-glace.svg`, `glacior.svg` et `vanilline.svg`. Les quatre reproduisent l’erreur individuellement.

La preuve a été obtenue avec `vite.createServer().transformRequest()` pour récupérer les vraies URL, puis la classe `SVGFile` et sa méthode `load()` du Phaser installé, exécutées sans modification. La trace produite est :

```text
InvalidCharacterError: Invalid character
    at atob (node:buffer:1302:13)
    at XHRLoader (.../phaser/src/loader/XHRLoader.js:44:31)
    at SVGFile.load (.../phaser/src/loader/File.js:332:30)
```

Il s’agit d’une reproduction Node avec les composants réels, pas d’une trace extraite de Chrome : l’accès au navigateur est toujours indisponible. Elle confirme précisément l’incompatibilité de chargement qui produit l’exception signalée.

## Correctif

Les quatre imports utilisent désormais `?url&no-inline`. `this.load.svg()` reçoit une véritable URL de fichier, par exemple :

```text
/src/assets/enemies/frosty-fraise.svg?no-inline
```

En production, Vite émet quatre SVG séparés dans `dist/assets/`, avec leurs noms hachés. Aucun décodage Base64 n’est effectué pour ces URL. Les chemins restent valides avec un préfixe d’hébergement tel que `/zaynab/`.

Les quatre illustrations sont conservées à l’identique. Aucun SVG brut n’est passé au chargeur, aucun patch de Phaser ou de `node_modules`, aucun `atob`/`btoa` ajouté au jeu et aucun encodage manuel supplémentaire.

`src/world/iceCreamTextures.ts`, `iceCreamCourse.ts`, `main.ts`, le menu et le niveau 6 ont été inspectés : ils ne contiennent pas la conversion fautive. Les deux accès au niveau 7 lancent la même scène et bénéficient donc du même correctif.

## Reprise en cas d’échec

Pendant preload, un panneau de chargement possède un bouton Retour au menu. Les requêtes ont un timeout XHR de 10 secondes par tentative. Les erreurs de réseau sont journalisées en mode développeur avec la clé, le type et l’URL.

Au début de `create()`, le panneau de chargement est retiré et la présence des cinq textures indispensables est vérifiée. Ce contrôle couvre aussi une erreur de rasterisation SVG, car `SVGFile.onProcessError()` ne produit pas nécessairement l’événement `loaderror`.

Si une texture manque, la construction du monde ne commence pas : un panneau propose **Réessayer** et **Retour au menu**. `update()` reste protégé par le mode intro. Une nouvelle tentative ne recharge que les textures absentes et les écouteurs sont nettoyés à l’arrêt de la scène. Aucun écran d’échec ne lance le jeu avec une héroïne ou une illustration manquante.

Après chargement réussi, l’introduction possède le bouton **C’est parti !**, relié à `begin()`. Le déplacement, le saut et la physique du parcours restent inchangés.

## Fichiers de cette correction

- Modifié : `src/scenes/Level7Scene.ts` — imports non intégrés, chargement, diagnostics, reprise et libellé de démarrage.
- Créé : `tests/level7Assets.test.mjs` — quatre tests de régression ciblés.
- Créé : `docs/level7-svg-fix.md` — ce rapport.
- Notes actualisées dans `docs/level7.md` et `docs/input-fix.md`.
- Sauvegarde : `src/scenes/Level7Scene.ts.before-svg-load-fix.bak`.

## Résultats et portée

- `npm run build` : réussi ; les quatre SVG sont présents dans les assets de production. Avertissement Vite existant sur la taille du bundle principal.
- `node --test tests/*.test.mjs` : **54 tests réussis**, aucun échec.
- `git diff --check` : réussi.
- Régression : les quatre anciennes URL déclenchent l’exception avec le vrai chargeur Phaser ; les quatre nouvelles passent par XHR et ne font aucun appel à `atob`. Le transport HTTP du test est simulé et fournit les vrais fichiers.
- Build de test avec `base: '/zaynab/'` : quatre fichiers émis, chemins corrects et contenus strictement identiques aux sources.
- Cycle de chargement : écran de reprise, réessai d’une seule texture manquante et nettoyage des écouteurs vérifiés.
- Introduction : callback réel de C’est parti, physique suspendue puis reprise, Pause, Reprendre, Rejouer et Menu testés. La géométrie et le DOM/GPU sont simulés dans ce test de cycle de vie.
- Les tests existants vérifient les cartes du menu, le bouton NIVEAU SUIVANT du niveau 6, le déplacement, les sauts et les autres mécaniques.

**Limite** : pas de test visuel dans Chrome, pas de lecture directe de sa console et pas de parcours complet dans un navigateur. L’outil indique « The browser access host is unavailable » et le canal natif est absent. L’apparition effective des illustrations dans le canvas reste donc à vérifier sur le navigateur de l’utilisateur, malgré le correctif de chargement reproduit et les tests réussis.

Pour vérifier : relancer le serveur Vite et recharger la page, ouvrir le niveau 7 depuis LES NIVEAUX, cliquer C’est parti, bouger et sauter, puis tester Pause/Reprendre/Rejouer/Menu. Vérifier également l’accès depuis la victoire du niveau 6. Aucun effacement des données de progression n’est requis. Aucun commit ni push n’a été effectué.
