import Phaser from 'phaser';
import backgroundUrl from '../assets/backgrounds/foret-bonbons.png?url';
import heroUrl from '../assets/characters/heroine/new-heroine-transparent.png?url';
import jellyUrl from '../assets/enemies/peppermint-monster.png?url';
import platformUrl from '../assets/objects/plateforme-biscuit.svg?url&no-inline';
import groundUrl from '../assets/objects/sol-biscuit.svg?url&no-inline';
import starUrl from '../assets/objects/etoile.svg?url&no-inline';

// Keys stay stable; SVG dimensions control rasterization, PNGs keep their native size.
const FOREST_ASSETS = [
  { key: 'sweet-background', format: 'image', url: backgroundUrl, width: 900, height: 650 },
  { key: 'sweet-hero', format: 'image', url: heroUrl, width: 56, height: 64 },
  { key: 'sweet-jelly', format: 'image', url: jellyUrl, width: 44, height: 36 },
  { key: 'sweet-platform', format: 'svg', url: platformUrl, width: 170, height: 28 },
  { key: 'sweet-ground', format: 'svg', url: groundUrl, width: 900, height: 50 },
  { key: 'sweet-star', format: 'svg', url: starUrl, width: 40, height: 40 },
] as const;


export function preloadForestAssets(scene: Phaser.Scene): void {
  FOREST_ASSETS.forEach(({ key, format, url, width, height }) => {
    if (scene.textures.exists(key)) return;

    if (format === 'image') {
      scene.load.image(key, url);
    } else {
      scene.load.svg(key, url, { width, height });
    }
  });
}
