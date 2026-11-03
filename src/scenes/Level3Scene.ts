import Phaser from 'phaser';
import { sweetButton, sweetCard, sweetPanel, sweetText } from '../ui/sweetUi';
import {
  FRUIT_PUZZLE, ISLAND_CHECKPOINTS, ISLAND_ENEMIES, ISLAND_GROUNDS, ISLAND_MOVING_PLATFORMS,
  ISLAND_PHYSICS, ISLAND_PLATFORMS, ISLAND_PORTAL, ISLAND_START, ISLAND_STARS,
  ISLAND_TOTAL, ISLAND_TRAMPOLINES, ISLAND_WIDTH,
} from '../world/mangoCourse';
import { createMangoTextures, preloadMangoAssets } from '../world/mangoTextures';

type State = 'intro' | 'playing' | 'paused' | 'lost' | 'won';
type Fruit = typeof FRUIT_PUZZLE[number];
type Surface = Phaser.GameObjects.Zone;

export class Level3Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies: Phaser.Physics.Arcade.Sprite[] = [];
  private movingPlatforms: Phaser.Physics.Arcade.Image[] = [];
  private collected = new Set<string>();
  private hearts: Phaser.GameObjects.Text[] = [];
  private counter!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private checkpoints: Phaser.GameObjects.Triangle[] = [];
  private portalGlow!: Phaser.GameObjects.Ellipse;
  private reward!: Phaser.Physics.Arcade.Image;
  private overlay?: Phaser.GameObjects.Container;
  private state: State = 'intro';
  private health = 3;
  private clock = 0;
  private immuneUntil = 0;
  private knockbackUntil = 0;
  private bounceUntil = 0;
  private lastGrounded = -1000;
  private jumpUntil = 0;
  private activeCheckpoint = -1;
  private respawn = { ...ISLAND_START };
  private puzzleProgress = 0;
  private puzzleSolved = false;
  private rewardCollected = false;

  constructor() { super('Level3Scene'); }

  preload(): void { preloadMangoAssets(this); }

  create(): void {
    this.state = 'intro'; this.health = 3; this.clock = 0; this.immuneUntil = 0;
    this.knockbackUntil = 0; this.bounceUntil = 0; this.lastGrounded = -1000; this.jumpUntil = 0;
    this.activeCheckpoint = -1; this.respawn = { ...ISLAND_START }; this.puzzleProgress = 0;
    this.puzzleSolved = false; this.rewardCollected = false; this.collected = new Set();
    this.enemies = []; this.movingPlatforms = []; this.hearts = []; this.checkpoints = []; this.overlay = undefined;
    this.physics.resume(); this.tweens.resumeAll();
    this.physics.world.setBounds(0, 0, ISLAND_WIDTH, 650);
    createMangoTextures(this);
    this.drawIsland();
    const surfaces = this.createSurfaces();
    this.createPlayer();
    this.physics.add.collider(this.player, surfaces.grounds);
    this.physics.add.collider(this.player, surfaces.staticPlatforms);
    this.physics.add.collider(this.player, surfaces.trampolines, () => this.bounceOnMango());
    this.movingPlatforms.forEach(platform => this.physics.add.collider(this.player, platform));
    this.createStars();
    this.createEnemies(surfaces.groundById);
    this.createCheckpoints();
    this.createTemple();
    this.createHud();
    this.cameras.main.setBounds(0, 0, ISLAND_WIDTH, 650);
    this.cameras.main.startFollow(this.player, true, .12, .12).setDeadzone(140, 100);
    this.bindPause();
    this.physics.pause(); this.tweens.pauseAll();
    this.overlay = sweetPanel(this, 'Niveau 3 — L’Île des Mangues Dorées',
      'Trouve 10 étoiles, active les drapeaux et suis les fruits du temple !', [
        ['C’est parti !', () => this.begin()],
      ], 'mango-fruit');
  }

  private topOnly(body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody): void {
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  private createSurfaces(): {
    grounds: Phaser.Physics.Arcade.StaticGroup;
    staticPlatforms: Phaser.Physics.Arcade.StaticGroup;
    trampolines: Phaser.Physics.Arcade.StaticGroup;
    groundById: Map<string, Surface>;
  } {
    const grounds = this.physics.add.staticGroup();
    const staticPlatforms = this.physics.add.staticGroup();
    const trampolines = this.physics.add.staticGroup();
    const groundById = new Map<string, Surface>();
    ISLAND_GROUNDS.forEach(surface => {
      const zone = this.add.zone(surface.x, surface.top + surface.height / 2, surface.width, surface.height);
      this.physics.add.existing(zone, true);
      grounds.add(zone);
      groundById.set(surface.id, zone);
    });
    ISLAND_PLATFORMS.forEach(surface => {
      const platform = staticPlatforms.create(surface.x, surface.top + 14, 'island-platform') as Phaser.Physics.Arcade.Image;
      platform.setDisplaySize(surface.width, 28).setDepth(3).refreshBody();
      this.topOnly(platform.body as Phaser.Physics.Arcade.StaticBody);
      (platform as Phaser.Physics.Arcade.Image & { courseId?: string }).courseId = surface.id;
    });
    ISLAND_TRAMPOLINES.forEach(point => {
      const trampoline = trampolines.create(point.x, point.top + 20, 'mango-trampoline') as Phaser.Physics.Arcade.Image;
      trampoline.setDisplaySize(116, 40).setDepth(4).refreshBody();
      this.topOnly(trampoline.body as Phaser.Physics.Arcade.StaticBody);
    });
    ISLAND_MOVING_PLATFORMS.forEach(point => {
      const platform = this.physics.add.image(point.x, point.top + 13, 'island-platform')
        .setDisplaySize(150, 26).setDepth(3).setImmovable(true).setFriction(1, 0);
      const body = platform.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      this.topOnly(body);
      body.setVelocityX(point.speed);
      platform.setData('left', point.left).setData('right', point.right).setData('speed', point.speed);
      this.movingPlatforms.push(platform);
    });
    return { grounds, staticPlatforms, trampolines, groundById };
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(ISLAND_START.x, ISLAND_START.y, 'island-hero').setDepth(5);
    const scale = 104 / 1342;
    this.player.setOrigin(.5, 1356 / 1402).setScale(scale).setCollideWorldBounds(true)
      .setGravityY(ISLAND_PHYSICS.gravity);
    this.player.body!.setSize(30 / scale, 74 / scale)
      .setOffset((this.player.width - 30 / scale) / 2, 1356 - 74 / scale);
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  private createStars(): void {
    const stars = this.physics.add.staticGroup();
    ISLAND_STARS.forEach(point => {
      const star = stars.create(point.x, point.top - 34, 'island-star') as Phaser.Physics.Arcade.Image;
      star.setDepth(6).setData('id', point.id);
      this.tweens.add({ targets: star, angle: 12, alpha: .75, duration: 900, yoyo: true, repeat: -1 });
    });
    this.physics.add.overlap(this.player, stars, (_player, item) => this.collectStar(item as Phaser.Physics.Arcade.Image));
  }

  private collectStar(star: Phaser.Physics.Arcade.Image): void {
    const id = star.getData('id') as string;
    if (this.state !== 'playing' || !star.active || this.collected.has(id)) return;
    this.collected.add(id); this.burst(star.x, star.y, 0xffe49b);
    this.tweens.killTweensOf(star); star.destroy();
    this.counter.setText(this.collected.size + ' / ' + ISLAND_TOTAL);
    if (this.collected.size === ISLAND_TOTAL) {
      this.showHint('Dix étoiles ! Le puzzle du temple est prêt.');
      this.tweens.add({ targets: this.portalGlow, alpha: .6, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  private createEnemies(groundById: Map<string, Surface>): void {
    ISLAND_ENEMIES.forEach(patrol => {
      const key = patrol.kind === 'mango' ? 'mango-fruit' : 'pineapple-fruit';
      const enemy = this.physics.add.sprite(patrol.x, 520, key).setDepth(4);
      const scale = 52 / 68;
      enemy.setOrigin(.5, .92).setScale(scale).setGravityY(ISLAND_PHYSICS.gravity);
      enemy.body!.setSize(44 / scale, 48 / scale).setOffset((enemy.width - 44 / scale) / 2, 64 - 48 / scale);
      enemy.setVelocityX(patrol.speed).setData('left', patrol.left).setData('right', patrol.right);
      const ground = groundById.get(patrol.support);
      if (!ground) throw new Error('Missing ground for ' + patrol.kind + ' patrol');
      this.physics.add.collider(enemy, ground);
      this.enemies.push(enemy);
      this.tweens.add({ targets: enemy, angle: 3, duration: 600, yoyo: true, repeat: -1 });
    });
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.takeDamage((enemy as Phaser.Physics.Arcade.Sprite).x);
    });
  }

  private createCheckpoints(): void {
    ISLAND_CHECKPOINTS.forEach((point, index) => {
      this.add.rectangle(point.x, 482, 6, 76, 0xb97937).setDepth(3);
      const flag = this.add.triangle(point.x + 22, 457, 0, 0, 40, 15, 0, 30, 0x7fbb74).setDepth(3);
      this.checkpoints.push(flag);
      sweetText(this, point.x, 551, 'Point de repos', 14).setOrigin(.5).setDepth(3);
      const trigger = this.add.zone(point.x, 475, 100, 100);
      this.physics.add.existing(trigger, true);
      this.physics.add.overlap(this.player, trigger, () => this.activateCheckpoint(index));
    });
  }

  private activateCheckpoint(index: number): void {
    if (this.state !== 'playing' || index <= this.activeCheckpoint) return;
    this.activeCheckpoint = index;
    this.respawn = { ...ISLAND_CHECKPOINTS[index] };
    this.checkpoints[index].setFillStyle(0xffe49b);
    this.burst(this.respawn.x, 460, 0xfff1d8);
    this.showHint('Checkpoint activé ! Tu reviendras ici.');
  }

  private createTemple(): void {
    this.portalGlow = this.add.ellipse(ISLAND_PORTAL.x, 460, 130, 160, 0xffe49b, .12).setDepth(2);
    const arch = this.add.graphics().setDepth(3);
    arch.fillStyle(0x8e6eaa).fillRoundedRect(ISLAND_PORTAL.x - 47, 390, 94, 130, { tl: 45, tr: 45, bl: 8, br: 8 });
    arch.lineStyle(6, 0xffe9ad).strokeRoundedRect(ISLAND_PORTAL.x - 47, 390, 94, 130, { tl: 45, tr: 45, bl: 8, br: 8 });
    this.add.ellipse(ISLAND_PORTAL.x, 460, 68, 105, 0xf1d8f6).setDepth(3);
    this.add.star(ISLAND_PORTAL.x, 450, 5, 10, 23, 0xffe49b).setDepth(4);
    sweetText(this, ISLAND_PORTAL.x, 367, 'SORTIE', 16).setOrigin(.5).setDepth(4);
    const portal = this.add.zone(ISLAND_PORTAL.x, 460, 94, 120);
    this.physics.add.existing(portal, true);
    this.physics.add.overlap(this.player, portal, () => this.tryFinish());

    this.drawPuzzle();
    this.reward = this.physics.add.image(3390, 466, 'mango-fruit').setDisplaySize(60, 60)
      .setDepth(6).setAlpha(.55).setActive(false).setVisible(false).setImmovable(true);
    const rewardBody = this.reward.body as Phaser.Physics.Arcade.Body;
    rewardBody.setAllowGravity(false);
    rewardBody.enable = false;
    this.physics.add.overlap(this.player, this.reward, () => this.collectReward());
    sweetText(this, 3390, 515, 'Mangue Dorée', 14).setOrigin(.5).setDepth(4);
  }

  private drawPuzzle(): void {
    const board = this.add.graphics().setDepth(4);
    board.fillStyle(0xfff5d8, .96).fillRoundedRect(3030, 275, 350, 190, 22);
    board.lineStyle(4, 0xb98945).strokeRoundedRect(3030, 275, 350, 190, 22);
    sweetText(this, 3205, 292, 'Le bon ordre des fruits', 18).setOrigin(.5).setDepth(5);
    FRUIT_PUZZLE.forEach((fruit, index) => {
      const x = 3125 + index * 80;
      this.add.image(x, 355, this.fruitTexture(fruit)).setDisplaySize(42, 42).setDepth(5);
      sweetText(this, x, 386, (index + 1).toString(), 14).setOrigin(.5).setDepth(5);
    });
    sweetText(this, 3205, 414, 'Clique les fruits dans cet ordre', 13).setOrigin(.5).setDepth(5);
    FRUIT_PUZZLE.forEach(fruit => {
      const x = fruit === 'mango' ? 3095 : fruit === 'pineapple' ? 3205 : 3315;
      const button = this.add.image(x, 495, this.fruitTexture(fruit)).setDisplaySize(48, 48).setDepth(6);
      button.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.chooseFruit(fruit));
    });
  }

  private fruitTexture(fruit: Fruit): string {
    if (fruit === 'mango') return 'mango-fruit';
    if (fruit === 'pineapple') return 'pineapple-fruit';
    return 'coconut-fruit';
  }

  private chooseFruit(fruit: Fruit): void {
    if (this.state !== 'playing') return;
    if (this.collected.size !== ISLAND_TOTAL) {
      this.showHint('Trouve les 10 étoiles avant le puzzle.');
      return;
    }
    if (this.puzzleSolved) return;
    if (FRUIT_PUZZLE[this.puzzleProgress] === fruit) {
      this.puzzleProgress++;
      this.tone(650 + this.puzzleProgress * 120);
      if (this.puzzleProgress === FRUIT_PUZZLE.length) {
        this.puzzleSolved = true;
        const body = this.reward.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        this.reward.setActive(true).setVisible(true).setAlpha(1);
        this.tweens.add({ targets: this.reward, y: this.reward.y - 10, angle: 8, duration: 600, yoyo: true, repeat: -1 });
        this.showHint('Bravo ! La Mangue Dorée est apparue. Va la chercher !');
      } else {
        this.showHint('Bien joué ! Continue avec le prochain fruit.');
      }
    } else {
      this.puzzleProgress = 0;
      this.showHint('Regarde les images et recommence dans le bon ordre.');
    }
  }

  private collectReward(): void {
    if (this.state !== 'playing' || !this.puzzleSolved || this.rewardCollected) return;
    this.rewardCollected = true;
    this.registry.set('goldenMango', true);
    this.burst(this.reward.x, this.reward.y, 0xffd85c);
    this.reward.setActive(false).setVisible(false);
    (this.reward.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showHint('Mangue Dorée trouvée ! La sortie est ouverte !');
    this.tweens.add({ targets: this.portalGlow, alpha: .7, duration: 500, yoyo: true, repeat: -1 });
  }

  private tryFinish(): void {
    if (this.state !== 'playing') return;
    if (this.collected.size === ISLAND_TOTAL && this.puzzleSolved && this.rewardCollected) this.win();
    else if (this.collected.size < ISLAND_TOTAL) this.showHint('Encore ' + (ISLAND_TOTAL - this.collected.size) + ' étoiles !');
    else if (!this.puzzleSolved) this.showHint('Résous le petit puzzle des fruits !');
    else this.showHint('Récupère la Mangue Dorée pour ouvrir la sortie.');
  }

  private createHud(): void {
    const hud = this.add.container(0, 0).setDepth(50).setScrollFactor(0);
    hud.add(sweetCard(this, 18, 16, 142, 50));
    this.hearts = [0, 1, 2].map(i => sweetText(this, 34 + i * 39, 21, '♥', 32).setColor('#e65d96'));
    hud.add(this.hearts);
    hud.add(sweetCard(this, 310, 12, 280, 57));
    hud.add(sweetText(this, 450, 20, 'Niveau 3', 20).setOrigin(.5, 0));
    hud.add(sweetText(this, 450, 44, 'L’Île des Mangues Dorées', 13).setOrigin(.5, 0));
    hud.add(sweetCard(this, 653, 16, 128, 50));
    hud.add(this.add.image(675, 41, 'island-star').setDisplaySize(26, 26));
    this.counter = sweetText(this, 697, 29, '0 / 10', 21); hud.add(this.counter);
    hud.add(sweetButton(this, 835, 41, 'Pause', () => this.pauseLevel(), 92));
    this.hint = sweetText(this, 450, 98, '', 17).setOrigin(.5).setWordWrapWidth(660).setAlign('center')
      .setBackgroundColor('#fff6ed').setPadding(12, 7).setAlpha(0);
    hud.add(this.hint);
  }

  private bindPause(): void {
    const escape = () => { if (this.state === 'paused') this.resumeLevel(); else this.pauseLevel(); };
    const blur = () => this.pauseLevel();
    this.input.keyboard!.on('keydown-ESC', escape);
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', escape);
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
    });
  }

  private begin(): void {
    if (this.state !== 'intro') return;
    this.overlay?.destroy(); this.overlay = undefined; this.state = 'playing';
    this.physics.resume(); this.tweens.resumeAll(); this.input.keyboard?.resetKeys();
    this.showHint('← → Marcher · Espace ou ↑ Sauter · Trouve 10 étoiles !');
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'playing') return;
    this.clock += delta;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const direction = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
    if (this.clock >= this.knockbackUntil) body.setVelocityX(direction * ISLAND_PHYSICS.speed);
    if (direction) this.player.setFlipX(direction < 0);
    if (body.blocked.down || body.touching.down) this.lastGrounded = this.clock;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.jumpUntil = this.clock + 120;
    }
    if (this.jumpUntil > this.clock && this.clock - this.lastGrounded < 110) {
      body.setVelocityY(-ISLAND_PHYSICS.jump); this.lastGrounded = -1000; this.jumpUntil = 0;
    }
    this.movingPlatforms.forEach(platform => {
      const x = platform.x;
      const left = Number(platform.getData('left'));
      const right = Number(platform.getData('right'));
      const speed = Number(platform.getData('speed'));
      if (x >= right) platform.setVelocityX(-speed);
      else if (x <= left) platform.setVelocityX(speed);
    });
    this.enemies.forEach(enemy => {
      if (enemy.x >= Number(enemy.getData('right'))) enemy.setVelocityX(-Math.abs(enemy.body!.velocity.x));
      else if (enemy.x <= Number(enemy.getData('left'))) enemy.setVelocityX(Math.abs(enemy.body!.velocity.x));
      enemy.setFlipX(enemy.body!.velocity.x < 0);
    });
    if (body.bottom > 625) this.fallIntoPit();
  }

  private bounceOnMango(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.state !== 'playing' || this.clock < this.bounceUntil
      || (!body.blocked.down && !body.touching.down)) return;
    body.setVelocityY(-ISLAND_PHYSICS.trampolineJump);
    this.lastGrounded = -1000;
    this.bounceUntil = this.clock + 350;
    this.burst(this.player.x, this.player.y - 30, 0xffd85c);
    this.tone(780);
  }

  private takeDamage(sourceX: number): boolean {
    if (this.state !== 'playing' || this.clock < this.immuneUntil) return false;
    this.health--;
    this.hearts.forEach((heart, i) => heart.setColor(i < this.health ? '#e65d96' : '#b9aabd'));
    if (this.health === 0) { this.lose(); return true; }
    this.grantProtection(); this.knockbackUntil = this.clock + 350;
    this.player.setVelocity(this.player.x < sourceX ? -100 : 100, -240);
    return true;
  }

  private grantProtection(): void {
    this.immuneUntil = this.clock + 1500;
    this.tweens.killTweensOf(this.player); this.player.setAlpha(1);
    this.tweens.add({ targets: this.player, alpha: .45, duration: 150, yoyo: true, repeat: 4,
      onComplete: () => this.player.setAlpha(1) });
  }

  private fallIntoPit(): void {
    if (this.state !== 'playing') return;
    this.burst(this.player.x, 590, 0x91e3de);
    this.takeDamage(this.player.x);
    if (this.state !== 'playing') return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.respawn.x, this.respawn.y);
    this.player.setVelocity(0, 0); this.grantProtection();
    this.lastGrounded = -1000; this.jumpUntil = 0; this.knockbackUntil = this.clock + 100;
    this.cameras.main.stopFollow(); this.cameras.main.centerOn(this.respawn.x, 325);
    this.cameras.main.startFollow(this.player, true, .12, .12);
    this.showHint('Plouf ! Tu peux recommencer depuis le drapeau.');
  }

  private pauseLevel(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.physics.pause(); this.tweens.pauseAll();
    this.overlay = sweetPanel(this, 'Une pause sur l’île',
      '← → Marcher · Espace ou ↑ Sauter\nÉchap : pause ou reprise', [
        ['Reprendre', () => this.resumeLevel()], ['REJOUER', () => this.scene.restart()],
        ['Menu principal', () => this.scene.start('MenuScene')],
      ]);
  }

  private resumeLevel(): void {
    if (this.state !== 'paused') return;
    this.overlay?.destroy(); this.overlay = undefined; this.state = 'playing';
    this.physics.resume(); this.tweens.resumeAll(); this.input.keyboard?.resetKeys();
  }

  private lose(): void {
    this.state = 'lost'; this.physics.pause(); this.tweens.pauseAll();
    this.player.setVelocity(0).setAlpha(1);
    this.overlay = sweetPanel(this, 'Oups ! On recommence ?',
      'Les manguiers t’attendent pour une nouvelle aventure !', [
        ['REJOUER', () => this.scene.restart()],
        ['Menu principal', () => this.scene.start('MenuScene')],
      ]);
  }

  private win(): void {
    this.state = 'won'; this.physics.pause(); this.tweens.pauseAll();
    this.player.setVelocity(0).setAlpha(1);
    this.registry.set('level3Complete', true);
    this.registry.set('goldenMango', true);
    this.burst(this.player.x, this.player.y - 60, 0xffd85c);
    this.overlay = sweetPanel(this, 'La Mangue Dorée !',
      'Tu as trouvé les étoiles et ouvert le temple. Bravo !', [
        ['REJOUER', () => this.scene.restart()],
        ['Menu principal', () => this.scene.start('MenuScene')],
      ], 'mango-fruit');
  }

  private showHint(message: string): void {
    this.tweens.killTweensOf(this.hint); this.hint.setText(message).setAlpha(1);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 4500, duration: 650 });
  }

  private burst(x: number, y: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      const spark = this.add.star(x, y, 4, 2, 6, color).setDepth(20);
      this.tweens.add({ targets: spark, x: x + Math.cos(i * Math.PI / 4) * 48,
        y: y + Math.sin(i * Math.PI / 4) * 40, alpha: 0, duration: 600, onComplete: () => spark.destroy() });
    }
  }

  private tone(frequency: number): void {
    if (!(this.sound instanceof Phaser.Sound.WebAudioSoundManager) || this.sound.locked) return;
    const context = this.sound.context;
    if (context.state !== 'running') return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .2);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  private drawIsland(): void {
    const sky = this.add.graphics().setDepth(-20).setScrollFactor(0);
    sky.fillGradientStyle(0x9be2e2, 0xc9f0d7, 0xffe6ad, 0xf7cf91, 1).fillRect(0, 0, 900, 650);
    this.add.circle(738, 142, 62, 0xfff1bd, .72).setDepth(-19).setScrollFactor(.08);
    const hills = this.add.graphics().setDepth(-18).setScrollFactor(.28);
    for (let i = 0; i < 10; i++) {
      const x = i * 430 - 140;
      hills.fillStyle(i % 2 ? 0x73c68c : 0x58b8a0, .56)
        .fillTriangle(x, 540, x + 220, 245 + (i % 3) * 38, x + 470, 540);
    }
    const groundArt = this.add.graphics().setDepth(1);
    ISLAND_GROUNDS.forEach(surface => {
      groundArt.fillStyle(0x9c663c).fillRect(surface.x - surface.width / 2, surface.top, surface.width, surface.height);
      groundArt.fillStyle(0x58a95c).fillRoundedRect(surface.x - surface.width / 2, surface.top - 10, surface.width, 28, 12);
      groundArt.fillStyle(0x9de18b).fillRoundedRect(surface.x - surface.width / 2, surface.top - 10, surface.width, 9, 5);
    });
    this.drawTree(390, 520, 1);
    this.drawTree(930, 520, .8);
    this.drawTree(1760, 520, .95);
    this.drawTree(2675, 520, .9);
    this.drawTree(2910, 520, .8);
    this.drawWaterfall(2130);
    sweetText(this, 270, 180, 'Plage des Mangues', 20).setOrigin(.5).setColor('#317e65').setAlpha(.85);
    sweetText(this, 1270, 180, 'Jungle des Manguiers', 20).setOrigin(.5).setColor('#317e65').setAlpha(.85);
    sweetText(this, 2240, 180, 'Cascade de Jus Doré', 20).setOrigin(.5).setColor('#317e65').setAlpha(.85);
    sweetText(this, 3220, 180, 'Temple de la Mangue Dorée', 20).setOrigin(.5).setColor('#317e65').setAlpha(.85);
    ISLAND_TRAMPOLINES.forEach(point => {
      sweetText(this, point.x, point.top + 48, 'Saute sur la mangue !', 13).setOrigin(.5).setDepth(3);
    });
  }

  private drawTree(x: number, ground: number, scale: number): void {
    const tree = this.add.graphics().setDepth(-2);
    tree.fillStyle(0x8b542f).fillRoundedRect(x - 9 * scale, ground - 128 * scale, 18 * scale, 130 * scale, 8);
    tree.fillStyle(0x3e9a5d).fillCircle(x, ground - 145 * scale, 49 * scale);
    tree.fillStyle(0x55b868).fillCircle(x - 24 * scale, ground - 130 * scale, 34 * scale);
    tree.fillStyle(0x72c96a).fillCircle(x + 25 * scale, ground - 134 * scale, 33 * scale);
    tree.fillStyle(0xf0af32).fillEllipse(x - 15 * scale, ground - 118 * scale, 14 * scale, 22 * scale);
    tree.fillStyle(0xe3a02b).fillEllipse(x + 19 * scale, ground - 160 * scale, 14 * scale, 22 * scale);
  }

  private drawWaterfall(x: number): void {
    const fall = this.add.graphics().setDepth(-4);
    fall.fillStyle(0x95623c).fillRoundedRect(x - 110, 170, 220, 400, 30);
    fall.fillStyle(0xffc64f, .9).fillRoundedRect(x - 70, 190, 140, 390, 25);
    fall.fillStyle(0xffe38d, .72).fillRoundedRect(x - 38, 200, 36, 375, 18);
    fall.fillStyle(0xfff3c1, .6).fillRoundedRect(x + 18, 208, 22, 365, 12);
    this.add.ellipse(x, 572, 260, 46, 0xffd66b, .32).setDepth(-3);
    this.add.text(x, 570, 'JUS DORÉ', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '13px',
      fontStyle: 'bold', color: '#8b5a2a' }).setOrigin(.5).setDepth(-2);
  }
}
