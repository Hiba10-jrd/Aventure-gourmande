import Phaser from 'phaser';
import heroUrl from '../assets/characters/heroine/new-heroine-transparent.png?url';
import starUrl from '../assets/objects/etoile.svg?url&no-inline';
import platformUrl from '../assets/objects/plateforme-biscuit.svg?url&no-inline';

export function preloadMangoAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists('island-hero')) scene.load.image('island-hero', heroUrl);
  if (!scene.textures.exists('island-star')) {
    scene.load.svg('island-star', starUrl, { width: 40, height: 40 });
  }
  if (!scene.textures.exists('island-platform')) {
    scene.load.svg('island-platform', platformUrl, { width: 170, height: 28 });
  }
}

export function createMangoTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('mango-fruit')) {
    const mango = scene.add.graphics();
    mango.fillStyle(0xe9a52f).fillEllipse(34, 39, 43, 57);
    mango.fillStyle(0xf5c84f).fillEllipse(29, 34, 26, 42);
    mango.fillStyle(0x43945b).fillEllipse(44, 9, 24, 12);
    mango.lineStyle(2, 0xffedb5, 0.8).lineBetween(18, 30, 25, 23);
    mango.generateTexture('mango-fruit', 68, 64);
    mango.destroy();
  }
  if (!scene.textures.exists('pineapple-fruit')) {
    const pineapple = scene.add.graphics();
    pineapple.fillStyle(0x43894f).fillTriangle(31, 24, 20, 2, 29, 17);
    pineapple.fillStyle(0x61a95a).fillTriangle(32, 22, 38, 0, 36, 20);
    pineapple.fillStyle(0x55954c).fillTriangle(34, 24, 49, 7, 39, 25);
    pineapple.fillStyle(0xe6a638).fillRoundedRect(14, 20, 38, 42, 15);
    pineapple.lineStyle(2, 0xffdf83, 0.85);
    pineapple.lineBetween(19, 30, 45, 54);
    pineapple.lineBetween(18, 42, 39, 60);
    pineapple.lineBetween(47, 29, 20, 54);
    pineapple.lineBetween(46, 42, 29, 60);
    pineapple.generateTexture('pineapple-fruit', 66, 66);
    pineapple.destroy();
  }
  if (!scene.textures.exists('coconut-fruit')) {
    const coconut = scene.add.graphics();
    coconut.fillStyle(0x80502f).fillEllipse(33, 37, 48, 47);
    coconut.fillStyle(0xfff0cf).fillEllipse(33, 33, 34, 31);
    coconut.fillStyle(0x9b6840).fillEllipse(33, 38, 24, 21);
    coconut.fillStyle(0xfff0cf).fillCircle(33, 38, 8);
    coconut.generateTexture('coconut-fruit', 66, 66);
    coconut.destroy();
  }
  if (!scene.textures.exists('mango-trampoline')) {
    const trampoline = scene.add.graphics();
    trampoline.fillStyle(0xb87525).fillEllipse(62, 26, 118, 38);
    trampoline.fillStyle(0xf4bc42).fillEllipse(62, 20, 112, 36);
    trampoline.fillStyle(0xffdf79).fillEllipse(56, 16, 68, 20);
    trampoline.fillStyle(0x428b50).fillEllipse(91, 4, 30, 12);
    trampoline.generateTexture('mango-trampoline', 124, 48);
    trampoline.destroy();
  }
}
