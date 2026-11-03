import Phaser from 'phaser';
import heroineUrl from '../assets/characters/heroine/new-heroine-transparent.png?url';
import peppermintUrl from '../assets/enemies/peppermint-monster.png?url';
import croustilleUrl from '../assets/characters/croustille/croustille.png?url';
import truffinouUrl from '../assets/enemies/truffinou.png?url';
import { sweetButton, sweetCard, sweetPanel, sweetText } from '../ui/sweetUi';
import { createMangoTextures } from '../world/mangoTextures';
import {
  createMemoryDeck, MEMORY_CARD_COUNT, MEMORY_CHARACTERS, MEMORY_ERROR_LIMIT,
  MEMORY_PAIR_COUNT, MEMORY_SECONDS, type MemoryCard,
} from '../world/memoryCards';

type State = 'INTRO' | 'MEMORIZATION' | 'FLIPPING' | 'PLAYING' | 'COMPARING'
  | 'GAME_OVER' | 'VICTORY' | 'PAUSED';

type CardView = MemoryCard & {
  root: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Container;
  back: Phaser.GameObjects.Container;
  faceUp: boolean;
  matched: boolean;
};

export class Level4Scene extends Phaser.Scene {
  private state: State = 'INTRO';
  private pausedState: State = 'INTRO';
  private cards: CardView[] = [];
  private selected: CardView[] = [];
  private matchedPairs = 0;
  private errors = 0;
  private secondsLeft = MEMORY_SECONDS;
  private countdown?: Phaser.Time.TimerEvent;
  private comparison?: Phaser.Time.TimerEvent;
  private overlay?: Phaser.GameObjects.Container;
  private pairLabel!: Phaser.GameObjects.Text;
  private heartsLabel!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;
  private boardLocked = true;

  constructor() { super('Level4Scene'); }

  preload(): void {
    const images = [
      ['memory-heroine', heroineUrl],
      ['memory-peppermint', peppermintUrl],
      ['memory-croustille', croustilleUrl],
      ['memory-truffinou', truffinouUrl],
    ];
    images.forEach(([key, url]) => {
      if (!this.textures.exists(key)) this.load.image(key, url);
    });
  }

  create(): void {
    this.state = 'INTRO';
    this.pausedState = 'INTRO';
    this.cards = [];
    this.selected = [];
    this.matchedPairs = 0;
    this.errors = 0;
    this.secondsLeft = MEMORY_SECONDS;
    this.boardLocked = true;
    this.overlay = undefined;
    this.countdown?.remove(false);
    this.comparison?.remove(false);
    this.countdown = undefined;
    this.comparison = undefined;
    this.physics.resume();
    this.tweens.resumeAll();
    createMangoTextures(this);
    this.createPalaceTextures();
    this.drawPalace();
    this.createHud();
    this.bindPause();
    this.state = 'INTRO';
    this.overlay = sweetPanel(this, 'Niveau 4 — Le Palais des Cartes Sucrées',
      'Retrouve les 10 paires ! Observe bien les cartes pendant 10 secondes.',
      [['C’est parti !', () => this.startRound()]], 'memory-fairy');
  }

  private drawPalace(): void {
    const sky = this.add.graphics().setDepth(-10).setScrollFactor(0);
    sky.fillGradientStyle(0xd8c6f3, 0xf1d5e8, 0xfff0d7, 0xe9c5e0, 1);
    sky.fillRect(0, 0, 900, 650);
    this.add.circle(450, 225, 238, 0xfff4dd, .44).setDepth(-9);
    const palace = this.add.graphics().setDepth(-8);
    palace.fillStyle(0x9a75b9).fillRoundedRect(80, 95, 740, 520, 70);
    palace.fillStyle(0xffe6f0).fillRoundedRect(101, 111, 698, 489, 56);
    palace.fillStyle(0xfff8ea).fillRoundedRect(120, 124, 660, 463, 42);
    palace.fillStyle(0xd8b9e8).fillRoundedRect(393, 77, 114, 65, 36);
    palace.fillStyle(0x9a75b9).fillTriangle(373, 100, 450, 31, 527, 100);
    [150, 750].forEach(x => {
      palace.fillStyle(0xd8b9e8).fillRoundedRect(x - 24, 86, 48, 65, 20);
      palace.fillStyle(0x9a75b9).fillTriangle(x - 35, 101, x, 55, x + 35, 101);
    });
    for (let i = 0; i < 12; i++) {
      const x = 35 + (i % 6) * 166;
      const y = 90 + Math.floor(i / 6) * 485;
      this.add.star(x, y, 4, 3, 8, i % 2 ? 0xf4bf59 : 0xe8a7c7).setAlpha(.72).setDepth(-7);
    }
    this.add.rectangle(450, 613, 900, 74, 0x8b679f).setDepth(-6);
  }

  private createHud(): void {
    sweetCard(this, 24, 13, 332, 56).setDepth(40).setScrollFactor(0);
    sweetText(this, 190, 23, 'Niveau 4 — Le Palais des Cartes Sucrées', 18)
      .setOrigin(.5, 0).setDepth(41).setScrollFactor(0);
    this.pairLabel = sweetText(this, 417, 29, 'Paires : 0 / 10', 19)
      .setDepth(41).setScrollFactor(0);
    this.heartsLabel = sweetText(this, 592, 26, '❤️❤️❤️', 21)
      .setDepth(41).setScrollFactor(0);
    this.timerLabel = sweetText(this, 688, 27, 'Observe : 10', 16)
      .setDepth(41).setScrollFactor(0);
    sweetButton(this, 846, 40, 'Pause', () => this.pauseGame(), 92).setDepth(42);
    sweetText(this, 450, 82, 'Retourne deux cartes et trouve les amis identiques !', 16)
      .setOrigin(.5).setDepth(41).setScrollFactor(0);
  }

  private createPalaceTextures(): void {
    this.drawCharacterTexture('memory-fairy', 0xefd8ff, 0xc98fe3, 'fairy');
    this.drawCharacterTexture('memory-lollipop-princess', 0xffe2ee, 0xe987ae, 'princess');
    this.drawCharacterTexture('memory-ogre', 0xffe9bd, 0x71a869, 'ogre');
    this.drawCharacterTexture('memory-turtle', 0xd9f0cf, 0x67a86d, 'turtle');
    if (!this.textures.exists('memory-medallion')) {
      const medallion = this.add.graphics();
      medallion.fillStyle(0xd79639).fillCircle(48, 48, 43);
      medallion.fillStyle(0xffe6a1).fillCircle(48, 48, 35);
      medallion.lineStyle(4, 0xb8792f).strokeCircle(48, 48, 27);
      medallion.fillStyle(0xd66f9a)
        .fillTriangle(48, 27, 41, 46, 48, 44)
        .fillTriangle(48, 27, 48, 44, 55, 46)
        .fillTriangle(29, 48, 47, 45, 45, 53)
        .fillTriangle(67, 48, 51, 45, 53, 53)
        .fillTriangle(35, 63, 46, 51, 48, 59)
        .fillTriangle(61, 63, 50, 51, 48, 59);
      medallion.generateTexture('memory-medallion', 96, 96);
      medallion.destroy();
    }
  }

  private drawCharacterTexture(key: string, light: number, dark: number, kind: string): void {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    if (kind === 'fairy') {
      g.fillStyle(0xf8d8fb).fillEllipse(24, 40, 35, 22).fillEllipse(72, 40, 35, 22);
      g.fillStyle(0xffffff, .7).fillEllipse(24, 40, 17, 15).fillEllipse(72, 40, 17, 15);
      g.fillStyle(dark).fillTriangle(37, 45, 59, 45, 48, 79);
      g.fillStyle(0xffdf8a).fillCircle(48, 30, 17);
      g.fillStyle(0x6a4774).fillCircle(42, 30, 2).fillCircle(54, 30, 2);
      g.lineStyle(3, 0x9b68bc).lineBetween(48, 12, 48, 3);
      g.fillStyle(0xffdc77).fillTriangle(48, -1, 44, 5, 48, 4)
        .fillTriangle(48, -1, 48, 4, 52, 5)
        .fillTriangle(43, 3, 48, 2, 47, 7)
        .fillTriangle(53, 3, 49, 2, 50, 7);
    } else if (kind === 'princess') {
      g.lineStyle(7, 0x8f603b).lineBetween(47, 42, 52, 89);
      g.fillStyle(dark).fillCircle(43, 36, 27);
      g.lineStyle(4, 0xfff0c4).strokeCircle(43, 36, 21);
      g.fillStyle(0xffd979).fillCircle(43, 36, 13);
      g.fillStyle(0xfff4dc).fillCircle(38, 34, 2).fillCircle(48, 34, 2);
      g.lineStyle(2, 0xa96071).lineBetween(39, 42, 47, 42);
      g.fillStyle(0xf2c952).fillTriangle(25, 16, 29, 0, 36, 14)
        .fillTriangle(36, 14, 43, -4, 48, 15).fillTriangle(46, 15, 58, 1, 58, 20);
      g.fillStyle(0xe989ac).fillCircle(43, 13, 4);
    } else if (kind === 'ogre') {
      g.fillStyle(dark).fillCircle(48, 47, 34);
      g.fillStyle(light).fillEllipse(48, 48, 59, 66);
      g.fillStyle(0x6ea75d).fillTriangle(20, 33, 6, 12, 32, 23)
        .fillTriangle(64, 23, 90, 12, 76, 35);
      g.fillStyle(0x583f59).fillCircle(38, 43, 3).fillCircle(58, 43, 3);
      g.lineStyle(3, 0x80504b).lineBetween(39, 60, 57, 60);
      g.fillStyle(0xfff4dc).fillRoundedRect(39, 59, 18, 8, 3);
    } else {
      g.fillStyle(dark).fillEllipse(48, 53, 63, 49);
      g.fillStyle(light).fillCircle(48, 36, 25);
      g.fillStyle(0x78b879).fillCircle(17, 48, 12).fillCircle(79, 48, 12);
      g.fillStyle(0xfff0c4).fillEllipse(48, 57, 37, 22);
      g.fillStyle(0x5b4760).fillCircle(40, 35, 3).fillCircle(56, 35, 3);
      g.lineStyle(3, 0x668751).lineBetween(41, 61, 55, 61);
      g.fillStyle(dark);
      g.fillEllipse(19, 20, 15, 8).fillEllipse(75, 20, 15, 8)
        .fillEllipse(21, 79, 15, 8).fillEllipse(75, 79, 15, 8);
    }
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  private startRound(): void {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.overlay?.destroy();
    this.overlay = undefined;
    this.countdown?.remove(false);
    this.comparison?.remove(false);
    this.countdown = undefined;
    this.comparison = undefined;
    this.cards.forEach(card => {
      this.tweens.killTweensOf(card.root);
      card.root.destroy();
    });
    this.cards = [];
    this.selected = [];
    this.matchedPairs = 0;
    this.errors = 0;
    this.secondsLeft = MEMORY_SECONDS;
    this.boardLocked = true;
    this.state = 'MEMORIZATION';
    this.updateHud();

    const deck = createMemoryDeck();
    if (deck.length !== MEMORY_CARD_COUNT || MEMORY_CHARACTERS.length !== MEMORY_PAIR_COUNT) {
      throw new Error('Memory card deck must contain ten matching pairs');
    }
    const columns = 5;
    const rows = 4;
    const startX = 150;
    const startY = 178;
    const gapX = 150;
    const gapY = 428 / rows;
    deck.forEach((card, index) => {
      const x = startX + (index % columns) * gapX;
      const y = startY + Math.floor(index / columns) * gapY;
      const view = this.createCard(card, x, y);
      this.cards.push(view);
      view.root.setScale(.75).setAlpha(0);
      this.tweens.add({
        targets: view.root, scale: 1, alpha: 1, duration: 220,
        delay: index * 12, ease: 'Back.easeOut',
        onComplete: index === deck.length - 1 ? () => this.beginMemorization() : undefined,
      });
    });
  }

  private createCard(card: MemoryCard, x: number, y: number): CardView {
    const root = this.add.container(x, y).setSize(130, 88).setDepth(10);
    const front = this.add.container(0, 0);
    const faceFrame = this.add.graphics();
    faceFrame.fillStyle(0x8f5f9e, .18).fillRoundedRect(-65, -44, 130, 88, 14);
    faceFrame.fillStyle(0xfff8ea).fillRoundedRect(-62, -42, 124, 82, 12);
    faceFrame.lineStyle(4, 0xe990b5).strokeRoundedRect(-62, -42, 124, 82, 12);
    faceFrame.lineStyle(1, 0xffc7d9).strokeRoundedRect(-55, -35, 110, 68, 9);
    front.add(faceFrame);
    const character = this.add.image(0, -1, card.texture);
    character.setScale(62 / Math.max(character.width, character.height));
    front.add(character);
    front.add(this.add.star(-48, -28, 4, 2, 5, 0xffcf62));
    front.add(this.add.star(48, 28, 4, 2, 5, 0xffcf62));

    const back = this.add.container(0, 0);
    const backFrame = this.add.graphics();
    backFrame.fillStyle(0x8f5f9e, .22).fillRoundedRect(-65, -44, 130, 88, 14);
    backFrame.fillStyle(0xc8a9e3).fillRoundedRect(-62, -42, 124, 82, 12);
    backFrame.lineStyle(4, 0xe990b5).strokeRoundedRect(-62, -42, 124, 82, 12);
    backFrame.lineStyle(2, 0xffe7f1).strokeRoundedRect(-54, -34, 108, 66, 9);
    backFrame.lineStyle(6, 0xffe8b3).lineBetween(-2, 2, 4, 28);
    backFrame.fillStyle(0xf1a9c5).fillCircle(0, -8, 21);
    backFrame.lineStyle(3, 0xfff0cd).strokeCircle(0, -8, 14);
    backFrame.fillStyle(0xffe8b3).fillCircle(0, -8, 4);
    back.add(backFrame);
    back.add(this.add.star(-42, -25, 4, 2, 5, 0xfff0c5));
    back.add(this.add.star(42, 25, 4, 2, 5, 0xfff0c5));
    back.setVisible(false);
    root.add([back, front]);
    root.setInteractive({ useHandCursor: true });
    const view: CardView = { ...card, root, face: front, back, faceUp: true, matched: false };
    root.on('pointerdown', () => this.selectCard(view));
    return view;
  }

  private beginMemorization(): void {
    if (this.state !== 'MEMORIZATION') return;
    this.secondsLeft = MEMORY_SECONDS;
    this.timerLabel.setText('Observe : ' + this.secondsLeft);
    this.boardLocked = true;
    this.countdown = this.time.addEvent({
      delay: 1000, repeat: MEMORY_SECONDS - 1,
      callback: () => {
        if (this.state !== 'MEMORIZATION') return;
        this.secondsLeft--;
        this.timerLabel.setText(this.secondsLeft > 0 ? 'Observe : ' + this.secondsLeft : 'À toi !');
        if (this.secondsLeft <= 0) this.hideAllCards();
      },
    });
  }

  private hideAllCards(): void {
    this.state = 'FLIPPING';
    this.boardLocked = true;
    this.flipCards(this.cards, false, () => {
      if (this.state !== 'FLIPPING') return;
      this.state = 'PLAYING';
      this.boardLocked = false;
      this.timerLabel.setText('À toi !');
    });
  }

  private selectCard(card: CardView): void {
    if (this.state !== 'PLAYING' || this.boardLocked || card.faceUp || card.matched) return;
    if (this.selected.includes(card)) return;
    this.selected.push(card);
    this.state = 'FLIPPING';
    this.boardLocked = true;
    this.flipCard(card, true, () => {
      if (this.selected.length === 1) {
        this.state = 'PLAYING';
        this.boardLocked = false;
        return;
      }
      this.state = 'COMPARING';
      if (this.selected[0].id === this.selected[1].id) this.resolveMatch();
      else this.resolveMismatch();
    });
  }

  private resolveMatch(): void {
    this.selected.forEach(card => {
      card.matched = true;
      card.root.disableInteractive();
      this.tweens.add({ targets: card.root, scale: 1.08, duration: 140, yoyo: true });
    });
    this.selected = [];
    this.matchedPairs++;
    this.updateHud();
    if (this.matchedPairs === MEMORY_PAIR_COUNT) {
      this.state = 'VICTORY';
      this.boardLocked = true;
      this.cards.forEach(card => card.root.disableInteractive());
      this.time.delayedCall(350, () => this.win());
      return;
    }
    this.state = 'PLAYING';
    this.boardLocked = false;
  }

  private resolveMismatch(): void {
    const compared = [...this.selected];
    this.comparison?.remove(false);
    this.comparison = this.time.delayedCall(500, () => {
      if (this.state !== 'COMPARING') return;
      this.state = 'FLIPPING';
      this.flipCards(compared, false, () => {
        if (this.state !== 'FLIPPING') return;
        this.selected = [];
        this.errors++;
        this.updateHud();
        if (this.errors >= MEMORY_ERROR_LIMIT) {
          this.gameOver();
          return;
        }
        this.state = 'PLAYING';
        this.boardLocked = false;
      });
    });
  }

  private flipCard(card: CardView, faceUp: boolean, complete: () => void): void {
    this.tweens.add({
      targets: card.root, scaleX: .04, duration: 70, ease: 'Sine.easeIn',
      onComplete: () => {
        card.faceUp = faceUp;
        card.face.setVisible(faceUp);
        card.back.setVisible(!faceUp);
        this.tweens.add({
          targets: card.root, scaleX: 1, duration: 70, ease: 'Sine.easeOut',
          onComplete: complete,
        });
      },
    });
  }

  private flipCards(cards: CardView[], faceUp: boolean, complete: () => void): void {
    if (cards.length === 0) { complete(); return; }
    let remaining = cards.length;
    cards.forEach((card, index) => {
      this.tweens.add({
        targets: card.root, scaleX: .04, duration: 70, delay: index * 12, ease: 'Sine.easeIn',
        onComplete: () => {
          card.faceUp = faceUp;
          card.face.setVisible(faceUp);
          card.back.setVisible(!faceUp);
          this.tweens.add({
            targets: card.root, scaleX: 1, duration: 70, ease: 'Sine.easeOut',
            onComplete: () => {
              remaining--;
              if (remaining === 0) complete();
            },
          });
        },
      });
    });
  }

  private updateHud(): void {
    this.pairLabel.setText('Paires : ' + this.matchedPairs + ' / ' + MEMORY_PAIR_COUNT);
    this.heartsLabel.setText('❤️'.repeat(MEMORY_ERROR_LIMIT - this.errors)
      + '🖤'.repeat(this.errors));
  }

  private gameOver(): void {
    this.state = 'GAME_OVER';
    this.boardLocked = true;
    this.countdown?.remove(false);
    this.countdown = undefined;
    this.comparison?.remove(false);
    this.comparison = undefined;
    this.cards.forEach(card => card.root.disableInteractive());
    this.overlay = sweetPanel(this, 'Oups ! Les cartes se sont mélangées !',
      'On réessaie ? 💕 Chaque nouvelle manche commence avec des cartes mélangées.',
      [['RECOMMENCER', () => this.startRound()], ['Menu principal', () => this.scene.start('MenuScene')]]);
  }

  private win(): void {
    if (this.state !== 'VICTORY') return;
    this.registry.set('level4Complete', true);
    this.registry.set('memoryMedallion', true);
    for (let i = 0; i < 28; i++) {
      const confetti = this.add.rectangle(Phaser.Math.Between(160, 740), 130, 8, 12,
        i % 2 ? 0xe987ae : 0xffd56c).setDepth(60);
      this.tweens.add({
        targets: confetti, y: Phaser.Math.Between(420, 610), angle: 180,
        alpha: 0, duration: 850, delay: i * 18, onComplete: () => confetti.destroy(),
      });
    }
    this.overlay = sweetPanel(this, 'Bravo ! Tu as une mémoire magique !',
      'Bravo ! Tu as retrouvé tous les amis du royaume !\nVoici le Médaillon des Souvenirs. À suivre…',
      [['Retour au menu', () => this.scene.start('MenuScene')],
        ['Rejouer le niveau', () => this.scene.restart()]], 'memory-medallion');
  }

  private pauseGame(): void {
    if (this.state === 'INTRO' || this.state === 'PAUSED'
      || this.state === 'GAME_OVER' || this.state === 'VICTORY') return;
    this.pausedState = this.state;
    this.state = 'PAUSED';
    this.boardLocked = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    this.overlay = sweetPanel(this, 'Pause gourmande', 'Reprends quand tu es prête !',
      [['Reprendre', () => this.resumeGame()], ['RECOMMENCER', () => this.startRound()],
        ['Menu principal', () => this.scene.start('MenuScene')]]);
  }

  private resumeGame(): void {
    if (this.state !== 'PAUSED') return;
    this.overlay?.destroy();
    this.overlay = undefined;
    this.state = this.pausedState;
    this.boardLocked = this.state !== 'PLAYING';
    this.time.paused = false;
    this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
  }

  private bindPause(): void {
    const escape = () => {
      if (this.state === 'PAUSED') this.resumeGame();
      else this.pauseGame();
    };
    const blur = () => this.pauseGame();
    this.input.keyboard!.on('keydown-ESC', escape);
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', escape);
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
    });
  }
}
