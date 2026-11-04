import Phaser from 'phaser';
import heroineUrl from '../assets/characters/heroine/new-heroine-transparent.png?url';
// Phaser 4.2.1's XHRLoader treats every data: URI as Base64, including Vite's
// percent-encoded inline SVGs. Keep these as real URLs in development AND builds.
import frostyUrl from '../assets/enemies/frosty-fraise.svg?url&no-inline';
import picpicUrl from '../assets/enemies/picpic-glace.svg?url&no-inline';
import glaciorUrl from '../assets/enemies/glacior.svg?url&no-inline';
import vanillineUrl from '../assets/characters/iceCream/vanilline.svg?url&no-inline';
import { DEV_MODE } from '../config/devMode';
import { sweetButton, sweetCard, sweetPanel, sweetText } from '../ui/sweetUi';
import { makeIceTextures } from '../world/iceCreamTextures';
import { ICE_WIDTH, ICE_START, ICE_PHYSICS, ICE_GROUND, ICE_PLATFORMS, ICE_STARS, ICE_CRYSTALS,
  ICE_CHECKPOINTS, ICE_ENEMIES, ICE_MIRRORS, ICE_RECEIVER, MIRROR_INITIAL, traceIceBeam,
  iceVelocity, meltPhase, chasePosition, missingIceObjectives } from '../world/iceCreamCourse';
import type { IcePlatform } from '../world/iceCreamCourse';

type Mode = 'intro' | 'playing' | 'paused' | 'lost' | 'won';
type Platform = { image: Phaser.Physics.Arcade.Image; spec: IcePlatform; touched?: number };
export class Level7Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interact!: Phaser.Input.Keyboard.Key;
  private mode: Mode = 'intro';
  private overlay?: Phaser.GameObjects.Container;
  private clock = 0;
  private health = 3;
  private immuneUntil = 0;
  private lastGrounded = -9999;
  private jumpUntil = 0;
  private doubleJump = true;
  private checkpoint = -1;
  private respawn = { ...ICE_START };
  private stars = new Set<number>();
  private crystals = new Set<number>();
  private platforms: Platform[] = [];
  private enemies: Phaser.Physics.Arcade.Sprite[] = [];
  private mirrors: Phaser.GameObjects.Container[] = [];
  private orientations = [...MIRROR_INITIAL];
  private attempts = 0;
  private puzzleSolved = false;
  private gate!: Phaser.Physics.Arcade.Image;
  private beam!: Phaser.GameObjects.Graphics;
  private receiver!: Phaser.GameObjects.Arc;
  private glacior!: Phaser.GameObjects.Image;
  private heart!: Phaser.GameObjects.Star;
  private chasing = false;
  private chaseDone = false;
  private restored = false;
  private hudText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private hintUntil = 0;
  private hearts: Phaser.GameObjects.Text[] = [];
  private snow: Phaser.GameObjects.Arc[] = [];

  constructor() { super('Level7Scene'); }
  preload(): void {
    this.mode = 'intro';
    this.overlay = sweetPanel(this, 'Niveau 7 · Chargement', 'Vanilline prépare la forêt enchantée…',
      [['Retour au menu', () => this.scene.start('MenuScene')]]);
    const onError = (file: Phaser.Loader.File) => {
      if (DEV_MODE) console.error('[Level7] Échec de chargement', { key: file.key, type: file.type, url: file.url });
    };
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError));
    if (!this.textures.exists('ice-hero')) this.load.image('ice-hero', heroineUrl, { responseType: 'blob', timeout: 10000 });
    for (const [key, url] of [['ice-frosty', frostyUrl], ['ice-picpic', picpicUrl], ['ice-glacior', glaciorUrl], ['ice-vanilline', vanillineUrl]]) {
      if (!this.textures.exists(key)) this.load.svg(key, url, undefined, { responseType: 'text', timeout: 10000 });
    }
  }
  create(): void {
    this.overlay?.destroy(); this.overlay = undefined;
    this.mode = 'intro';
    // Also catches SVG rasterization errors, which Phaser does not emit as loaderror.
    const missing = ['ice-hero', 'ice-frosty', 'ice-picpic', 'ice-glacior', 'ice-vanilline']
      .filter(key => !this.textures.exists(key));
    if (missing.length) {
      if (DEV_MODE) console.error('[Level7] Textures indisponibles après chargement', missing);
      this.overlay = sweetPanel(this, 'La forêt attend encore un instant',
        'Une illustration n’a pas pu être chargée. Tu peux réessayer ou revenir au menu.', [
          ['Réessayer', () => this.scene.restart()], ['Retour au menu', () => this.scene.start('MenuScene')],
        ]);
      return;
    }
    this.mode = 'intro'; this.clock = 0; this.health = 3; this.immuneUntil = 0;
    this.lastGrounded = -9999; this.jumpUntil = 0; this.doubleJump = true;
    this.checkpoint = -1; this.respawn = { ...ICE_START };
    this.stars.clear(); this.crystals.clear(); this.platforms = []; this.enemies = [];
    this.mirrors = []; this.snow = []; this.hearts = []; this.overlay = undefined;
    this.orientations = [...MIRROR_INITIAL]; this.attempts = 0; this.puzzleSolved = false;
    this.chasing = false; this.chaseDone = false; this.restored = false; this.hintUntil = 0;
    this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false; this.anims.resumeAll();
    this.physics.world.setBounds(0, -80, ICE_WIDTH, 810);
    makeIceTextures(this); this.drawWorld();
    const floors = this.physics.add.staticGroup();
    const ledges = this.physics.add.staticGroup();
    ICE_GROUND.forEach(spec => this.addPlatform(spec, floors));
    ICE_PLATFORMS.forEach(spec => this.addPlatform(spec, ledges));
    this.player = this.physics.add.sprite(ICE_START.x, ICE_START.y, 'ice-hero').setDepth(10);
    const scale = 100 / this.player.height;
    this.player.setOrigin(.5, .96).setScale(scale).setGravityY(ICE_PHYSICS.gravity).setCollideWorldBounds(true);
    this.player.body!.setSize(30 / scale, 75 / scale).setOffset(
      (this.player.width - 30 / scale) / 2, this.player.height * .96 - 75 / scale);
    this.physics.add.collider(this.player, floors);
    this.physics.add.collider(this.player, ledges);
    this.platforms.filter(p => p.spec.range).forEach(p => this.physics.add.collider(this.player, p.image));
    this.makeCollectibles(); this.makeEnemies(floors); this.makePuzzle(); this.makeCheckpoints(); this.makePalace(); this.makeHud();
    this.keys = this.input.keyboard!.createCursorKeys();
    this.interact = this.input.keyboard!.addKey('E');
    const esc = () => this.mode === 'paused' ? this.resumeLevel() : this.pauseLevel();
    const blur = () => this.pauseLevel();
    const rotate = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 3 && this.player.x > 3000 && this.player.x < 3700) this.turnMirror(index);
    };
    this.input.keyboard!.on('keydown-ESC', esc); this.input.keyboard!.on('keydown', rotate);
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', esc); this.input.keyboard?.off('keydown', rotate);
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
      this.time.paused = false; this.anims.resumeAll();
    });
    this.cameras.main.setBounds(0, 0, ICE_WIDTH, 650).startFollow(this.player, true, .12, .12).setDeadzone(100, 80);
    this.freeze();
    this.overlay = sweetPanel(this, '7 · La Forêt des Glaces Enchantées',
      'Vanilline : « Zaynab ! Grignotou a volé notre Cœur de Glace Magique ! Sans lui, notre forêt va fondre. Retrouve les trois Cristaux de Sorbet et sauve notre royaume ! »',
      [["C’est parti !", () => this.begin()]], 'ice-vanilline');
  }
  private addPlatform(spec: IcePlatform, group: Phaser.Physics.Arcade.StaticGroup): void {
    const key = spec.ice ? 'ice-platform' : 'ice-wafer';
    const image = spec.range ? this.physics.add.image(spec.x, spec.y + 14, key).setImmovable(true).setFriction(1, 0)
      : group.create(spec.x, spec.y + 14, key) as Phaser.Physics.Arcade.Image;
    image.setDisplaySize(spec.w, 28).setDepth(4);
    const body = image.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    if (body instanceof Phaser.Physics.Arcade.StaticBody) image.refreshBody();
    else { body.setAllowGravity(false); image.setVelocityX(55); }
    body.checkCollision.down = false; body.checkCollision.left = false; body.checkCollision.right = false;
    if (spec.melt) image.setTint(0xffbbdf);
    this.platforms.push({ image, spec });
    if (spec.melt || spec.range) sweetText(this, spec.x, spec.y + 35, spec.melt ? 'Fond en 1,2 s' : '↔', 12).setOrigin(.5);
  }
  private drawWorld(): void {
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-30);
    sky.fillGradientStyle(0xa1dff2, 0xd8cafa, 0xffe1ed, 0xecfffd, 1).fillRect(0, 0, 900, 650);
    this.add.circle(740, 140, 62, 0xfffbe2, .75).setScrollFactor(.1).setDepth(-28);
    const far = this.add.graphics().setScrollFactor(.25).setDepth(-26);
    for (let i = 0; i < 18; i++) {
      far.fillStyle([0x9cd9e8, 0xc4b8ec, 0xf4c0d8][i % 3], .55);
      far.fillTriangle(i * 240 - 190, 545, i * 240 + 80, 205 + i % 3 * 45, i * 240 + 320, 545);
      far.fillStyle(0xf4ffff, .75).fillEllipse(i * 240 + 80, 280 + i % 3 * 40, 130, 70);
    }
    for (let i = 0; i < 13; i++) {
      const x = 90 + i * 220, g = this.add.graphics().setDepth(-10);
      g.fillStyle(0xd3a573).fillTriangle(x - 36, 475, x + 36, 475, x, 570);
      g.lineStyle(2, 0xffe7b5).lineBetween(x - 25, 490, x + 18, 535).lineBetween(x + 25, 490, x - 18, 535);
      g.fillStyle([0xffbdd5, 0xfff2ce, 0xa2ebdb][i % 3]).fillCircle(x, 405, 67).fillCircle(x - 38, 447, 38).fillCircle(x + 38, 447, 38);
      g.fillStyle(0xffffff, .5).fillEllipse(x - 22, 380, 40, 15);
    }
    for (const x of [1350, 1680, 2010, 2340, 4550, 5000, 5300]) {
      [0xffabd0, 0xa0dfff, 0x9ce9ce].forEach((c, i) => this.add.ellipse(x, 599 + i * 14, 430, 62, c, .7).setDepth(-5));
    }
    const cave = this.add.graphics().setDepth(-12);
    cave.fillStyle(0x6163a6, .9).fillRoundedRect(2740, 130, 1490, 420, 80);
    for (let i = 0; i < 13; i++) {
      const x = 2780 + i * 110;
      cave.fillStyle(i % 2 ? 0x97e7f2 : 0xc5b2ef).fillTriangle(x, 140, x + 65, 140, x + 30, 195 + i % 3 * 25);
      cave.fillStyle(0xa4f4ef, .35).fillTriangle(x, 540, x + 55, 540, x + 22, 465);
    }
    const palace = this.add.graphics().setDepth(-12);
    palace.fillStyle(0xa5c7ee, .8).fillRect(5480, 270, 560, 270);
    [5500, 5700, 5940].forEach(x => {
      palace.fillStyle(0xc3efff).fillRoundedRect(x - 55, 220, 110, 320, 14);
      palace.fillStyle(0xe2d2ff).fillTriangle(x - 75, 225, x, 135, x + 75, 225);
      palace.fillStyle(0x6ca9d5).fillRoundedRect(x - 15, 300, 30, 65, 12);
    });
    const titles = [[500, 'La Forêt des Cornets Géants'], [1860, 'La Rivière des Sorbets'], [3370, 'La Grotte des Cristaux'], [4700, 'Le Palais du Cœur Gelé']] as const;
    titles.forEach(([x, label]) => sweetText(this, x, 110, label, 23).setOrigin(.5).setDepth(2).setColor('#4c4f86'));
    this.add.image(170, 470, 'ice-vanilline').setDisplaySize(70, 80).setDepth(6);
    for (let i = 0; i < 55; i++) this.snow.push(this.add.circle((i * 173) % 900, (i * 79) % 650, 1 + i % 3, 0xffffff, .65).setScrollFactor(0).setDepth(15));
    sweetText(this, 520, 580, 'Glace : anticipe le freinage !  ·  Gaufrette : arrêt précis', 16).setOrigin(.5);
    sweetText(this, 2200, 580, 'Plume Magique : appuie à nouveau en l’air !', 16).setOrigin(.5);
  }
  private makeCollectibles(): void {
    ICE_STARS.forEach(([x, y], i) => {
      const star = this.add.star(x, y, 5, 10, 22, 0xffdd72).setStrokeStyle(2, 0xffffff).setDepth(8);
      this.physics.add.existing(star, true);
      this.physics.add.overlap(this.player, star, () => {
        if (this.mode !== 'playing' || this.stars.has(i)) return;
        this.stars.add(i); star.destroy(); this.showHint(`Étoile ${this.stars.size} / 16 !`);
      });
    });
    ICE_CRYSTALS.forEach((p, i) => {
      const gem = this.add.star(p.x, p.y, 4, 12, 29, p.color).setStrokeStyle(3, 0xffffff).setDepth(8);
      sweetText(this, p.x, p.y - 48, 'Cristal ' + p.name, 14).setOrigin(.5).setDepth(7);
      this.tweens.add({ targets: gem, angle: 12, duration: 1000, yoyo: true, repeat: -1 });
      this.physics.add.existing(gem, true);
      this.physics.add.overlap(this.player, gem, () => {
        if (this.mode !== 'playing' || this.crystals.has(i) || (i === 2 && !this.puzzleSolved)) return;
        this.crystals.add(i); gem.destroy(); this.showHint(`Cristal ${p.name} obtenu !`);
      });
    });
  }
  private makeEnemies(floors: Phaser.Physics.Arcade.StaticGroup): void {
    ICE_ENEMIES.forEach((p, i) => {
      const enemy = this.physics.add.sprite(p.x, 510, i % 2 ? 'ice-picpic' : 'ice-frosty')
        .setDisplaySize(64, 72).setOrigin(.5, 1).setGravityY(1050).setDepth(8);
      const scale = enemy.scaleX;
      enemy.body!.setSize(38 / scale, 47 / scale).setOffset((96 - 38 / scale) / 2, 108 - 47 / scale);
      enemy.setData('patrol', p).setVelocityX(50 + i * 3);
      this.physics.add.collider(enemy, floors); this.enemies.push(enemy);
      this.physics.add.overlap(this.player, enemy, () => this.damage(false));
    });
  }
  private makeCheckpoints(): void {
    ICE_CHECKPOINTS.forEach((x, i) => {
      this.add.rectangle(x - 24, 497, 5, 85, 0x7485af).setDepth(6);
      const flag = this.add.triangle(x, 465, 0, 0, 48, 15, 0, 30, 0xe2bcf5).setDepth(6);
      const zone = this.add.zone(x, 490, 100, 100); this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => {
        if (this.mode !== 'playing' || i <= this.checkpoint) return;
        this.checkpoint = i; this.respawn = { x, y: 530 }; flag.setFillStyle(0x8ef5dd);
        this.showHint(`Checkpoint ${i + 1} / 3 activé !`);
      });
    });
  }
  private makePuzzle(): void {
    this.beam = this.add.graphics().setDepth(5);
    this.add.star(3020, 280, 6, 12, 25, 0xfff8bc).setDepth(7);
    this.receiver = this.add.circle(ICE_RECEIVER.x, ICE_RECEIVER.y, 22, 0x8f8fc3).setStrokeStyle(4, 0xffffff).setDepth(7);
    ICE_MIRRORS.forEach((p, i) => {
      const disc = this.add.circle(0, 0, 29, 0x746fb1).setStrokeStyle(3, 0xc1f8ff);
      const line = this.add.rectangle(0, 0, 47, 7, 0xf3ffff);
      const label = sweetText(this, 0, 44, `${i + 1} · clic / ${i + 1}`, 14).setColor('#ffffff').setOrigin(.5);
      const mirror = this.add.container(p.x, p.y, [disc, line, label]).setSize(64, 64).setDepth(8).setInteractive({ useHandCursor: true });
      mirror.on('pointerdown', () => this.turnMirror(i)); this.mirrors.push(mirror);
    });
    sweetText(this, 3380, 370, 'Oriente les trois miroirs pour guider\nla lumière jusqu’au cristal !', 16).setOrigin(.5).setAlign('center').setColor('#ffffff');
    sweetText(this, 3360, 449, 'Gravure : 1 → ↑    2 ↑ →    3 → ↓\nR : recommencer · touches 1, 2, 3 dans la grotte', 14).setOrigin(.5).setAlign('center').setColor('#e4ffff');
    this.gate = this.physics.add.staticImage(3880, 315, 'ice-platform').setDisplaySize(42, 450).refreshBody().setDepth(9);
    this.physics.add.collider(this.player, this.gate);
    const reset = () => {
      if (this.mode === 'playing' && !this.puzzleSolved && this.player.x > 3000 && this.player.x < 3700) {
        this.orientations = [...MIRROR_INITIAL]; this.drawBeam(); this.showHint('Miroirs réinitialisés, sans perdre de cœur.');
      }
    };
    this.input.keyboard!.on('keydown-R', reset);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-R', reset));
    this.drawBeam();
  }
  private turnMirror(i: number): void {
    if (this.mode !== 'playing' || this.puzzleSolved || this.player.x < 2940 || this.player.x > 3750) return;
    this.orientations[i] = (this.orientations[i] + 1) % 4; this.attempts++; this.drawBeam();
    if (!this.puzzleSolved && this.attempts >= 6) this.showHint(this.attempts >= 10
      ? 'Solution : miroir 1 à 135°, miroir 2 à 135°, miroir 3 à 45°.'
      : 'Suis les gravures : à droite puis vers le haut, à droite, puis vers le bas.');
  }
  private drawBeam(): void {
    this.mirrors.forEach((m, i) => {
      (m.list[1] as Phaser.GameObjects.Rectangle).setAngle(this.orientations[i] * 45);
      (m.list[2] as Phaser.GameObjects.Text).setText(`${i + 1} · ${this.orientations[i] * 45}° · clic / ${i + 1}`);
    });
    const result = traceIceBeam(this.orientations);
    this.beam.clear().lineStyle(10, 0xb5ffff, .18).strokePoints(result.points.map(p => new Phaser.Math.Vector2(p.x, p.y)), false);
    this.beam.lineStyle(3, 0xfff8bc).strokePoints(result.points.map(p => new Phaser.Math.Vector2(p.x, p.y)), false);
    if (result.solved && !this.puzzleSolved) {
      this.puzzleSolved = true; this.gate.disableBody(true, true); this.receiver.setFillStyle(0xb3ffe3);
      this.showHint('La lumière est arrivée ! La porte est ouverte !');
    }
  }
  private makePalace(): void {
    this.glacior = this.add.image(4520, 455, 'ice-glacior').setDisplaySize(92, 104).setDepth(9).setVisible(false);
    this.heart = this.add.star(4440, 460, 6, 16, 33, 0x9cefff).setStrokeStyle(3, 0xffffff).setDepth(9);
    this.add.ellipse(5840, 531, 120, 19, 0xb0e8ef).setDepth(5);
    sweetText(this, 5840, 390, 'Socle du Cœur · E', 18).setOrigin(.5);
    sweetText(this, 4720, 235, 'Glacior →  Suis les éclats bleus !', 19).setOrigin(.5);
    for (let x = 4540; x <= 5670; x += 180) this.add.star(x, 285, 4, 4, 12, 0xc5ffff).setDepth(3);
    // Moving, visible icicles are separate hazards, not extra ordinary enemies.
    [4710, 5220].forEach(x => {
      const obstacle = this.add.triangle(x, 360, 0, 0, 30, 0, 15, 48, 0x90cce7).setStrokeStyle(2, 0xffffff).setDepth(8);
      this.physics.add.existing(obstacle, true);
      this.physics.add.overlap(this.player, obstacle, () => this.damage(false));
      this.tweens.add({ targets: obstacle, y: 470, duration: 1550, yoyo: true, repeat: -1,
        onUpdate: () => (obstacle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject() });
    });
    this.add.ellipse(6000, 470, 100, 135, 0xa98ad5, .8).setStrokeStyle(4, 0xe5ffff).setDepth(5);
    sweetText(this, 6000, 375, 'PORTAIL', 17).setOrigin(.5);
    sweetText(this, 5780, 595, 'E au socle : restaurer · E au portail : retour au départ', 15).setOrigin(.5);
    const portal = this.add.zone(6000, 470, 80, 130); this.physics.add.existing(portal, true);
    this.physics.add.overlap(this.player, portal, () => {
      if (this.mode !== 'playing') return;
      if (this.stars.size === 16 && this.crystals.size === 3 && this.puzzleSolved && this.chaseDone && this.restored) this.win();
      else this.showHint(missingIceObjectives(this.stars.size, this.crystals.size, this.puzzleSolved, this.chaseDone, this.restored));
    });
  }
  private makeHud(): void {
    const hud = this.add.container(0, 0).setDepth(50).setScrollFactor(0);
    hud.add(sweetCard(this, 12, 12, 770, 58));
    this.hearts = [0, 1, 2].map(i => sweetText(this, 28 + i * 34, 21, '♥', 29).setColor('#e15d99'));
    hud.add(this.hearts);
    this.hudText = sweetText(this, 150, 22, '★ 0/16     Cristaux 0/3     Miroirs …\nForêt des Glaces · Cœur à sauver', 17); hud.add(this.hudText);
    hud.add(sweetButton(this, 835, 41, 'Pause', () => this.pauseLevel(), 92));
    this.hint = sweetText(this, 450, 94, '', 16).setOrigin(.5).setWordWrapWidth(810).setAlign('center').setBackgroundColor('#fff8ee').setPadding(10, 5).setVisible(false);
    hud.add(this.hint);
  }
  private showHint(message: string): void { this.hint?.setText(message).setVisible(true); this.hintUntil = this.clock + 4200; }
  private freeze(): void { this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true; this.anims.pauseAll(); }
  private thaw(): void { this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false; this.anims.resumeAll(); this.input.keyboard?.resetKeys(); }
  private begin(): void { if (this.mode !== 'intro') return; this.overlay?.destroy(); this.overlay = undefined; this.mode = 'playing'; this.thaw(); this.showHint('← → : avancer / freiner · Espace ou ↑ : saut et double saut · Échap : pause'); }
  private pauseLevel(): void {
    if (this.mode !== 'playing') return; this.mode = 'paused'; this.freeze();
    this.overlay = sweetPanel(this, 'Pause dans la forêt', 'La magie t’attend !', [
      ['Reprendre', () => this.resumeLevel()], ['Rejouer', () => this.scene.restart()], ['Menu principal', () => this.scene.start('MenuScene')],
    ]);
  }
  private resumeLevel(): void { if (this.mode !== 'paused') return; this.overlay?.destroy(); this.overlay = undefined; this.mode = 'playing'; this.thaw(); }
  update(_time: number, delta: number): void {
    if (this.mode !== 'playing') return;
    this.clock += delta;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    const support = this.platforms.find(p => p.image.body?.enable && Math.abs(body.bottom - p.spec.y) < 9 && body.right > p.image.x - p.spec.w / 2 && body.left < p.image.x + p.spec.w / 2);
    if (grounded) { this.lastGrounded = this.clock; this.doubleJump = true; }
    const direction = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    body.setVelocityX(iceVelocity(body.velocity.x, direction, !!support?.spec.ice, Math.min(delta, 50) / 1000));
    if (direction) this.player.setFlipX(direction < 0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.up)) this.jumpUntil = this.clock + ICE_PHYSICS.buffer;
    if (this.jumpUntil > this.clock) {
      if (this.clock - this.lastGrounded < ICE_PHYSICS.coyote) {
        body.setVelocityY(-ICE_PHYSICS.jump); this.lastGrounded = -9999; this.jumpUntil = 0;
      } else if (this.doubleJump) { body.setVelocityY(-ICE_PHYSICS.jump); this.doubleJump = false; this.jumpUntil = 0; }
    }
    this.platforms.forEach(p => {
      if (p.spec.range) {
        if (p.image.x > p.spec.x + p.spec.range) p.image.setVelocityX(-55);
        if (p.image.x < p.spec.x - p.spec.range) p.image.setVelocityX(55);
      }
      if (!p.spec.melt) return;
      if (support === p && grounded && p.touched === undefined) p.touched = this.clock;
      const phase = meltPhase(p.touched, this.clock);
      p.image.body!.enable = phase !== 'gone';
      p.image.setAlpha(phase === 'gone' ? .12 : phase === 'warning' ? .55 + .3 * Math.sin(this.clock / 40) : 1);
      p.image.setAngle(phase === 'warning' ? Math.sin(this.clock / 30) * 2 : 0);
      if (phase === 'solid') p.touched = undefined;
    });
    this.enemies.forEach((enemy, i) => {
      const p = ICE_ENEMIES[i];
      if (enemy.x >= p.right) enemy.setVelocityX(-50 - i * 3);
      if (enemy.x <= p.left) enemy.setVelocityX(50 + i * 3);
      enemy.setFlipX(enemy.body!.velocity.x < 0);
    });
    if (body.bottom > 625) { this.damage(true); return; }
    this.player.setAlpha(this.clock < this.immuneUntil ? .45 + .35 * Math.abs(Math.sin(this.clock / 90)) : 1);
    if (!this.chaseDone && this.player.x > 4390 && !this.chasing) {
      this.chasing = true; this.glacior.setVisible(true); this.showHint('Glacior a volé le Cœur ! Rattrape-le au palais !');
    }
    if (this.chasing) {
      this.glacior.setPosition(chasePosition(this.player.x), 430 + Math.sin(this.clock / 200) * 18);
      this.heart.setPosition(this.glacior.x + 24, this.glacior.y - 35);
      if (this.player.x >= 5750) {
        this.chasing = false; this.chaseDone = true;
        this.glacior.setPosition(5800, 466).setFlipX(true);
        this.heart.setPosition(5840, 460);
        this.cameras.main.flash(650, 180, 245, 255);
        this.tweens.add({ targets: this.glacior, angle: 360, alpha: .35, duration: 1000 });
        this.showHint('Rattrapé ! Le Cœur est sauvé ! Appuie sur E près du socle.');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.interact)) {
      if (this.player.x > 5910) {
        body.reset(ICE_START.x, ICE_START.y); this.player.setVelocity(0); this.lastGrounded = -9999; this.doubleJump = true;
        this.showHint('Retour magique ! Tes trouvailles et la poursuite sont conservées.');
      } else if (Math.abs(this.player.x - 5840) < 120 && this.chaseDone) {
        if (this.crystals.size === 3 && this.puzzleSolved) {
          this.restored = true; this.heart.setFillStyle(0xf2ffff); this.showHint('Cœur restauré ! Retrouve les étoiles restantes ou entre dans le portail !');
          this.cameras.main.flash(600, 190, 255, 240);
        } else this.showHint('Il faut les trois Cristaux de Sorbet pour restaurer le Cœur.');
      }
    }
    this.snow.forEach((s, i) => { s.y = (s.y + delta * (.013 + i % 3 * .008)) % 650; });
    this.hudText.setText(`★ ${this.stars.size}/16     Cristaux ${this.crystals.size}/3     Miroirs ${this.puzzleSolved ? '✓' : '…'}\n${this.chaseDone ? 'Glacior rattrapé' : 'Forêt des Glaces'} · Cœur ${this.restored ? 'restauré' : 'à sauver'}`);
    if (this.clock > this.hintUntil) this.hint.setVisible(false);
  }
  private damage(fall: boolean): void {
    if (this.mode !== 'playing' || (!fall && this.clock < this.immuneUntil)) return;
    this.health--; this.hearts.forEach((h, i) => h.setColor(i < this.health ? '#e15d99' : '#b5b1c5'));
    if (this.health <= 0) {
      this.mode = 'lost'; this.freeze(); this.player.setAlpha(1);
      this.overlay = sweetPanel(this, 'Tu peux réessayer !', 'Vanilline croit en toi. Les tentatives sont illimitées.', [
        ['Rejouer', () => this.scene.restart()], ['Retour au menu', () => this.scene.start('MenuScene')],
      ]); return;
    }
    this.immuneUntil = this.clock + 1600;
    if (fall) {
      (this.player.body as Phaser.Physics.Arcade.Body).reset(this.respawn.x, this.respawn.y);
      this.player.setVelocity(0); this.lastGrounded = -9999; this.jumpUntil = 0; this.doubleJump = true;
      this.platforms.forEach(p => {
        p.touched = undefined; p.image.body!.enable = true; p.image.setAlpha(1).setAngle(0);
        if (p.spec.range) {
          (p.image.body as Phaser.Physics.Arcade.Body).reset(p.spec.x, p.spec.y + 14);
          p.image.setVelocityX(55);
        }
      });
      if (!this.chaseDone) { this.chasing = false; this.glacior.setVisible(false); this.heart.setPosition(4440, 460); }
      this.showHint('Au dernier checkpoint ! Étoiles, cristaux et miroirs conservés.');
    } else { this.player.setVelocityY(-250); this.showHint('Aïe ! Tu es protégée pendant un instant.'); }
  }
  private win(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'won'; this.freeze(); this.player.setVelocity(0).setAlpha(1);
    this.registry.set('level7Complete', true); this.registry.set('eternalCrystalSnowflake', true);
    const actions: [string, () => void][] = [['Retour au menu', () => this.scene.start('MenuScene')], ['Rejouer', () => this.scene.restart()]];
    if (this.scene.manager.keys['Level8Scene']) actions.unshift(['NIVEAU SUIVANT', () => this.scene.start('Level8Scene')]);
    this.overlay = sweetPanel(this, 'Le Flocon de Cristal Éternel !', 'Vanilline : « Bravo Zaynab ! Grâce à toi, le Cœur brille et notre forêt est sauvée ! »', actions, 'ice-snowflake');
    const reward = this.overlay.list.find(o => o instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image;
    this.tweens.add({ targets: reward, angle: 60, scaleX: reward.scaleX * 1.12, scaleY: reward.scaleY * 1.12, duration: 1600, yoyo: true, repeat: -1 });
    for (let i = 0; i < 14; i++) {
      const star = this.add.star(450 + Math.cos(i) * 85, reward.y + Math.sin(i) * 50, 4, 2, 6, 0xb9f7ff).setScrollFactor(0);
      this.overlay.add(star); this.tweens.add({ targets: star, alpha: .1, duration: 600 + i * 40, yoyo: true, repeat: -1 });
    }
  }
}
