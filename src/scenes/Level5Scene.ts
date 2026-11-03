import Phaser from 'phaser';
import heroineUrl from '../assets/characters/heroine/new-heroine-transparent.png?url';
import cloudEnemyUrl from '../assets/enemies/nuage-orageux.png?url';
import { sweetButton, sweetCard, sweetPanel, sweetText } from '../ui/sweetUi';

type Mode = 'intro' | 'playing' | 'paused' | 'lost' | 'won';
type PlatformDef = { x: number; y: number; w: number; moving?: boolean; vanishing?: boolean };

const WORLD_WIDTH = 3600;
const STARS_TOTAL = 12;
const GRAVITY = 1050;
const SPEED = 235;
const JUMP = 535;
const GROUND_Y = 550;
const PLATFORMS: PlatformDef[] = [
  { x: 460, y: 465, w: 170 }, { x: 650, y: 425, w: 155 },
  { x: 845, y: 385, w: 150 }, { x: 1040, y: 450, w: 145, moving: true },
  { x: 1230, y: 465, w: 155, vanishing: true }, { x: 1440, y: 410, w: 145, moving: true },
  { x: 1640, y: 350, w: 140, vanishing: true }, { x: 1840, y: 390, w: 160, moving: true },
  { x: 2050, y: 465, w: 155, vanishing: true }, { x: 2250, y: 480, w: 160, moving: true },
  { x: 2460, y: 425, w: 150, vanishing: true }, { x: 2660, y: 375, w: 145 },
  { x: 2860, y: 415, w: 150, moving: true }, { x: 3070, y: 455, w: 150, moving: true },
  { x: 3290, y: 470, w: 155, moving: true },
];
const STAR_PLATFORMS = [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14];
const GROUNDS = [
  { x: 250, w: 500 }, { x: 1240, w: 350 },
  { x: 2280, w: 400 }, { x: 3420, w: 360 },
];
const WINDS = [
  { x: 845, bottom: 535, top: 245, width: 118 },
  { x: 1640, bottom: 535, top: 235, width: 125 },
  { x: 2660, bottom: 535, top: 245, width: 125 },
];
const CHECKPOINTS = [1250, 2290];

export class Level5Scene extends Phaser.Scene {
  private heroine!: Phaser.Physics.Arcade.Sprite;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies: Phaser.Physics.Arcade.Sprite[] = [];
  private moving: Phaser.Physics.Arcade.Image[] = [];
  private vanishing: Phaser.Physics.Arcade.Image[] = [];
  private hearts: Phaser.GameObjects.Text[] = [];
  private starText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private collected = new Set<number>();
  private windReleased = new Set<number>();
  private checkpointIndex = -1;
  private respawn = { x: 120, y: GROUND_Y - 10 };
  private lives = 3;
  private mode: Mode = 'intro';
  private clock = 0;
  private immuneUntil = 0;
  private lastGrounded = -9999;
  private jumpBufferedUntil = 0;
  private knockbackUntil = 0;

  constructor() { super('Level5Scene'); }

  preload(): void {
    if (!this.textures.exists('cloud-hero')) this.load.image('cloud-hero', heroineUrl);
    if (!this.textures.exists('enemy-storm-cloud')) this.load.image('enemy-storm-cloud', cloudEnemyUrl);
  }

  create(): void {
    this.mode = 'intro'; this.clock = 0; this.immuneUntil = 0;
    this.lastGrounded = -9999; this.jumpBufferedUntil = 0; this.knockbackUntil = 0;
    this.checkpointIndex = -1; this.respawn = { x: 120, y: GROUND_Y - 10 };
    this.lives = 3; this.collected.clear(); this.windReleased.clear();
    this.enemies = []; this.moving = []; this.vanishing = []; this.hearts = []; this.overlay = undefined;
    this.physics.resume(); this.tweens.resumeAll();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, 650);
    this.createTextures();
    this.drawBackground();
    const floors = this.physics.add.staticGroup();
    const clouds = this.physics.add.staticGroup();
    GROUNDS.forEach(({ x, w }) => {
      this.drawCloud(x, GROUND_Y, w, true);
      const z = this.add.zone(x, GROUND_Y + 25, w, 50);
      this.physics.add.existing(z, true); floors.add(z);
    });
    PLATFORMS.forEach((p, i) => {
      if (p.moving) {
        const platform = this.physics.add.image(p.x, p.y + 11, 'cotton-platform')
          .setDisplaySize(p.w, 24).setDepth(5).setImmovable(true).setFriction(1, 0);
        const body = platform.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false); this.topOnly(body);
        const speed = 52 + (i % 3) * 9;
        platform.setData('start', p.x).setData('range', 50).setData('speed', speed).setVelocityX(speed);
        this.moving.push(platform);
      } else {
        const cloud = clouds.create(p.x, p.y + 11, 'cotton-platform') as Phaser.Physics.Arcade.Image;
        cloud.setDisplaySize(p.w, 24).setDepth(5).refreshBody();
        this.topOnly(cloud.body as Phaser.Physics.Arcade.StaticBody);
        if (p.vanishing) {
          cloud.setTint(0xf6c0e6);
          this.vanishing.push(cloud);
        }
      }
      if (!p.moving && !p.vanishing) this.drawCloud(p.x, p.y, p.w, false);
      if (p.moving) sweetText(this, p.x, p.y - 48, '↔', 18).setOrigin(.5).setDepth(6);
      if (p.vanishing) sweetText(this, p.x, p.y - 48, '✦', 18).setOrigin(.5).setDepth(6);
      if (i === 0) sweetText(this, p.x, p.y - 75, 'Saute sur les nuages !', 13).setOrigin(.5);
    });
    this.heroine = this.physics.add.sprite(120, GROUND_Y - 10, 'cloud-hero').setDepth(10);
    const imageScale = 100 / this.heroine.height;
    this.heroine.setOrigin(.5, .96).setScale(imageScale).setGravityY(GRAVITY).setCollideWorldBounds(true);
    this.heroine.body!.setSize(30 / imageScale, 75 / imageScale)
      .setOffset((this.heroine.width - 30 / imageScale) / 2, this.heroine.height * .96 - 75 / imageScale);
    this.physics.add.collider(this.heroine, floors);
    this.physics.add.collider(this.heroine, clouds);
    this.moving.forEach(p => this.physics.add.collider(this.heroine, p));
    this.createStars(); this.createEnemies(floors); this.createWind(); this.createCheckpoints(); this.createExit();
    this.createHud();
    this.keys = this.input.keyboard!.createCursorKeys();
    const esc = () => this.mode === 'paused' ? this.resume() : this.pause();
    const blur = () => this.pause();
    this.input.keyboard!.on('keydown-ESC', esc);
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', esc);
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
    });
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, 650);
    this.cameras.main.startFollow(this.heroine, true, .12, .12).setDeadzone(140, 90);
    this.physics.pause(); this.tweens.pauseAll();
    this.overlay = sweetPanel(this, 'Niveau 5 — Le Royaume de Barbe à Papa',
      'Plumette : « 12 étoiles, 3 vents ! Attention aux nuages qui disparaissent ! »',
      [['C’est parti !', () => this.begin()]], 'cloud-feather');
  }

  private createTextures(): void {
    if (!this.textures.exists('cotton-platform')) {
      const g = this.add.graphics();
      g.fillStyle(0xc994c6).fillRoundedRect(0, 7, 220, 26, 13);
      g.fillStyle(0xfff3fa).fillRoundedRect(0, 0, 220, 24, 12);
      g.fillStyle(0xf7bfdc).fillRoundedRect(7, 4, 206, 8, 4);
      g.generateTexture('cotton-platform', 220, 34); g.destroy();
    }
    if (!this.textures.exists('cloud-feather')) {
      const g = this.add.graphics();
      g.fillStyle(0xffd26e).fillEllipse(39, 37, 34, 63);
      g.lineStyle(3, 0xfff6d8).lineBetween(25, 70, 53, 7);
      g.generateTexture('cloud-feather', 78, 78); g.destroy();
    }
  }

  private drawBackground(): void {
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-20);
    sky.fillGradientStyle(0xa9bbf4, 0xe7b5e9, 0xffdbed, 0xfff3cd, 1).fillRect(0, 0, 900, 650);
    this.add.circle(745, 138, 63, 0xfff4d6, .62).setScrollFactor(0).setDepth(-19);
    const far = this.add.graphics().setScrollFactor(.2).setDepth(-18);
    for (let i = 0; i < 13; i++) {
      const x = i * 320 - 110;
      far.fillStyle(i % 2 ? 0xffffff : 0xf9cde8, .32).fillEllipse(x, 440 + i % 3 * 19, 420, 135);
    }
    for (let i = 0; i < 12; i++) {
      const x = 250 + i * 285;
      this.add.star(x, 215 + i % 4 * 43, 5, 3, 9, 0xfff2b0, .6).setDepth(-5);
    }
    sweetText(this, 450, 165, 'L’Escalier des Nuages', 21).setOrigin(.5).setDepth(3);
    sweetText(this, 1360, 165, 'Les Courants de Sucre', 21).setOrigin(.5).setDepth(3);
    sweetText(this, 2420, 165, 'Le Pont Arc-en-Ciel', 21).setOrigin(.5).setDepth(3);
    sweetText(this, 3340, 165, 'Le Grand Nuage Royal', 21).setOrigin(.5).setDepth(3);
  }

  private drawCloud(x: number, y: number, width: number, ground: boolean): void {
    const g = this.add.graphics().setDepth(ground ? 1 : 4);
    g.fillStyle(ground ? 0xd7a6d4 : 0xdbadd8).fillRoundedRect(x - width / 2, y + 7, width, 39, 19);
    g.fillStyle(0xfff6fa).fillRoundedRect(x - width / 2, y - 6, width, 28, 14);
    for (let i = 0; i < Math.max(2, Math.floor(width / 54)); i++) {
      const px = x - width / 2 + 34 + i * 48;
      if (px < x + width / 2 - 12) g.fillStyle(0xffebf7).fillCircle(px, y - 12, 22);
    }
  }

  private topOnly(body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody): void {
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  private createStars(): void {
    STAR_PLATFORMS.forEach((index, id) => {
      const p = PLATFORMS[index];
      const star = this.add.star(p.x, p.y - 53, 5, 9, 21, 0xffd65a).setDepth(8);
      this.physics.add.existing(star, true);
      this.physics.add.overlap(this.heroine, star, () => {
        if (this.mode !== 'playing' || this.collected.has(id)) return;
        this.collected.add(id); star.destroy();
        this.starText.setText(`${this.collected.size} / ${STARS_TOTAL}`);
        if (this.collected.size === STARS_TOTAL) this.showHint('12 étoiles ! Rejoins le grand portail !');
      });
    });
  }

  private createEnemies(floors: Phaser.Physics.Arcade.StaticGroup): void {
    [260, 400, 1140, 1310, 2170, 2360, 3300, 3460].forEach((x, i) => {
      const enemy = this.physics.add.sprite(x, GROUND_Y - 8, 'enemy-storm-cloud')
        .setDepth(9).setGravityY(GRAVITY).setOrigin(.5, .70);
      const scale = 88 / enemy.height;
      const hitboxWidth = 52;
      const hitboxHeight = 38;
      enemy.setScale(scale);
      enemy.body!.setSize(hitboxWidth / scale, hitboxHeight / scale)
        .setOffset((enemy.width - hitboxWidth / scale) / 2, enemy.height * .70 - hitboxHeight / scale);
      const speed = 43 + (i % 3) * 7;
      enemy.setVelocityX(i % 2 ? -speed : speed).setData('start', x)
        .setData('range', i === 3 ? 45 : 55).setData('speed', speed);
      this.physics.add.collider(enemy, floors);
      this.enemies.push(enemy);
    });
    this.physics.add.overlap(this.heroine, this.enemies, (_hero, enemy) => {
      this.damage((enemy as Phaser.Physics.Arcade.Sprite).x);
    });
  }

  private createWind(): void {
    WINDS.forEach((wind, i) => {
      const h = wind.bottom - wind.top;
      const g = this.add.graphics().setDepth(2);
      g.fillStyle(0x9de6f5, .24).fillRoundedRect(wind.x - wind.width / 2, wind.top, wind.width, h, 34);
      g.lineStyle(3, 0x8ad9e9, .65).strokeRoundedRect(wind.x - wind.width / 2, wind.top, wind.width, h, 34);
      for (let j = 0; j < 3; j++) {
        const arrow = sweetText(this, wind.x - 25 + j * 24, wind.bottom - 90 - j * 44, '↑', 27)
          .setColor('#67b5ca').setDepth(3);
        this.tweens.add({ targets: arrow, y: arrow.y - 22, alpha: .4,
          duration: 1100, yoyo: true, repeat: -1 });
      }
      const bubble = this.add.circle(wind.x, wind.top + 30, 20, 0xffdc81).setDepth(6)
        .setInteractive({ useHandCursor: true });
      sweetText(this, wind.x, wind.top - 4, 'VENT ' + (i + 1), 13).setOrigin(.5).setDepth(6);
      this.physics.add.existing(bubble, true);
      this.physics.add.overlap(this.heroine, bubble, () => this.releaseWind(i, bubble));
    });
  }

  private releaseWind(i: number, bubble: Phaser.GameObjects.Arc): void {
    if (this.mode !== 'playing' || this.windReleased.has(i)) return;
    this.windReleased.add(i);
    bubble.setFillStyle(0xb0f1d8).disableInteractive();
    this.showHint(`Vent magique libéré : ${this.windReleased.size} / 3 !`);
  }

  private createCheckpoints(): void {
    CHECKPOINTS.forEach((x, i) => {
      const flag = this.add.triangle(x, 465, 0, 0, 48, 14, 0, 28, 0xd580b4).setDepth(7);
      this.add.rectangle(x - 23, 500, 5, 72, 0xc89c76).setDepth(5);
      const z = this.add.zone(x, 493, 85, 100);
      this.physics.add.existing(z, true);
      this.physics.add.overlap(this.heroine, z, () => {
        if (this.mode !== 'playing' || i <= this.checkpointIndex) return;
        this.checkpointIndex = i;
        this.respawn = { x, y: GROUND_Y - 10 };
        flag.setFillStyle(0xffd47e);
        this.showHint('Point de repos activé !');
      });
    });
  }

  private createExit(): void {
    const x = 3500;
    this.add.ellipse(x, 461, 105, 139, 0xdea4e7, .8).setDepth(5);
    this.add.ellipse(x, 461, 70, 105, 0xffe5ac).setDepth(6);
    sweetText(this, x, 358, 'SORTIE', 18).setOrigin(.5).setDepth(7);
    this.add.star(x - 93, 465, 5, 11, 30, 0xffd26e).setDepth(7);
    const z = this.add.zone(x, 460, 90, 120);
    this.physics.add.existing(z, true);
    this.physics.add.overlap(this.heroine, z, () => {
      if (this.mode !== 'playing') return;
      if (this.collected.size < STARS_TOTAL || this.windReleased.size < WINDS.length) {
        this.showHint(`Il reste ${STARS_TOTAL - this.collected.size} étoiles et ${WINDS.length - this.windReleased.size} vents !`);
        return;
      }
      this.win();
    });
  }

  private createHud(): void {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(50);
    hud.add(sweetCard(this, 18, 16, 142, 50));
    this.hearts = [0, 1, 2].map(i => sweetText(this, 34 + i * 39, 21, '♥', 32).setColor('#e65d96'));
    hud.add(this.hearts);
    hud.add(sweetCard(this, 326, 12, 248, 57));
    hud.add(sweetText(this, 450, 20, 'Niveau 5', 20).setOrigin(.5, 0));
    hud.add(sweetText(this, 450, 44, 'Le Royaume de Barbe à Papa', 13).setOrigin(.5, 0));
    hud.add(sweetCard(this, 653, 16, 128, 50));
    this.starText = sweetText(this, 679, 29, '0 / 12', 20); hud.add(this.starText);
    hud.add(sweetButton(this, 835, 41, 'Pause', () => this.pause(), 92));
    this.hint = sweetText(this, 450, 100, '', 16).setOrigin(.5).setWordWrapWidth(660).setAlign('center')
      .setBackgroundColor('#fff6ed').setPadding(9, 5).setAlpha(0);
    hud.add(this.hint);
  }

  private showHint(text: string): void {
    this.tweens.killTweensOf(this.hint);
    this.hint.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 2000, duration: 500 });
  }

  private begin(): void {
    if (this.mode !== 'intro') return;
    this.overlay?.destroy(); this.overlay = undefined;
    this.mode = 'playing'; this.physics.resume(); this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
    this.showHint('← → Marcher · Espace ou ↑ Sauter · Les nuages roses disparaissent !');
  }

  update(_time: number, delta: number): void {
    if (this.mode !== 'playing') return;
    this.clock += delta;
    const body = this.heroine.body as Phaser.Physics.Arcade.Body;
    const direction = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    if (this.clock >= this.knockbackUntil) body.setVelocityX(direction * SPEED);
    if (direction) this.heroine.setFlipX(direction < 0);
    if (body.blocked.down || body.touching.down) this.lastGrounded = this.clock;
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.up))
      this.jumpBufferedUntil = this.clock + 120;
    if (this.jumpBufferedUntil > this.clock && this.clock - this.lastGrounded < 130) {
      body.setVelocityY(-JUMP); this.lastGrounded = -9999; this.jumpBufferedUntil = 0;
    }
    // The gentle wind lifts the heroine automatically, without requiring extra controls.
    for (const wind of WINDS) {
      if (Math.abs(this.heroine.x - wind.x) < wind.width / 2 &&
          this.heroine.y > wind.top && this.heroine.y < wind.bottom)
        body.setVelocityY(Math.min(body.velocity.y, -210));
    }
    this.moving.forEach(p => {
      const start = Number(p.getData('start'));
      const range = Number(p.getData('range'));
      const speed = Number(p.getData('speed'));
      if (p.x >= start + range) p.setVelocityX(-speed);
      else if (p.x <= start - range) p.setVelocityX(speed);
    });
    // Nuages intermittents : visibles pendant 2,2 s, absents pendant 0,8 s.
    // Alternance décalee pour eviter que tous les nuages disparaissent ensemble.
    this.vanishing.forEach((cloud, i) => {
      const cycle = (this.clock + i * 620) % 3000;
      const active = cycle < 2200;
      const body = cloud.body as Phaser.Physics.Arcade.StaticBody;
      body.enable = active;
      cloud.setAlpha(active ? (cycle > 1900 ? .62 : 1) : .13);
    });
    this.enemies.forEach(enemy => {
      const start = Number(enemy.getData('start'));
      const range = Number(enemy.getData('range'));
      const speed = Number(enemy.getData('speed'));
      if (enemy.x >= start + range) enemy.setVelocityX(-speed);
      else if (enemy.x <= start - range) enemy.setVelocityX(speed);
    });
    if (body.bottom > 622) this.fall();
  }

  private damage(enemyX: number): void {
    if (this.mode !== 'playing' || this.clock < this.immuneUntil) return;
    this.lives--;
    this.hearts.forEach((heart, i) => heart.setColor(i < this.lives ? '#e65d96' : '#b9aabd'));
    if (this.lives <= 0) { this.lose(); return; }
    this.protect(); this.knockbackUntil = this.clock + 250;
    this.heroine.setVelocity(this.heroine.x < enemyX ? -110 : 110, -240);
  }

  private protect(): void {
    this.immuneUntil = this.clock + 1500;
    this.tweens.killTweensOf(this.heroine); this.heroine.setAlpha(1);
    this.tweens.add({ targets: this.heroine, alpha: .45, duration: 150, repeat: 4,
      yoyo: true, onComplete: () => this.heroine.setAlpha(1) });
  }

  private fall(): void {
    if (this.mode !== 'playing') return;
    this.damage(this.heroine.x);
    if (this.mode !== 'playing') return;
    (this.heroine.body as Phaser.Physics.Arcade.Body).reset(this.respawn.x, this.respawn.y);
    this.heroine.setVelocity(0, 0); this.protect();
    this.lastGrounded = -9999; this.jumpBufferedUntil = 0;
    this.cameras.main.stopFollow(); this.cameras.main.centerOn(this.respawn.x, 325);
    this.cameras.main.startFollow(this.heroine, true, .12, .12);
    this.showHint('Hop ! Tu repars du dernier drapeau !');
  }

  private pause(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused'; this.physics.pause(); this.tweens.pauseAll();
    this.overlay = sweetPanel(this, 'Pause dans les nuages', 'Reprends ton aventure quand tu veux !', [
      ['Reprendre', () => this.resume()], ['REJOUER', () => this.scene.restart()],
      ['Menu principal', () => this.scene.start('MenuScene')],
    ]);
  }

  private resume(): void {
    if (this.mode !== 'paused') return;
    this.overlay?.destroy(); this.overlay = undefined;
    this.mode = 'playing'; this.physics.resume(); this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
  }

  private lose(): void {
    this.mode = 'lost'; this.physics.pause(); this.tweens.pauseAll();
    this.heroine.setVelocity(0).setAlpha(1);
    this.overlay = sweetPanel(this, 'Oups ! On réessaie ? 💕',
      'Plumette croit en toi. Les nuages t’attendent !', [
        ['REJOUER', () => this.scene.restart()],
        ['Menu principal', () => this.scene.start('MenuScene')],
      ]);
  }

  private win(): void {
    this.mode = 'won'; this.physics.pause(); this.tweens.pauseAll();
    this.heroine.setVelocity(0).setAlpha(1);
    this.registry.set('level5Complete', true);
    this.registry.set('magicFeather', true);
    this.overlay = sweetPanel(this, 'La Plume Magique !',
      'Plumette : « Bravo ! Tu as libéré les vents et récupéré la Plume Magique. »\nÀ suivre : Le Village des Biscuits !', [
        ['Retour au menu', () => this.scene.start('MenuScene')],
        ['Rejouer le niveau', () => this.scene.restart()],
      ], 'cloud-feather');
  }
}
