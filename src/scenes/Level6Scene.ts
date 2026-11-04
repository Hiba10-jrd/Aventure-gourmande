import Phaser from "phaser";
import heroineUrl from "../assets/characters/heroine/new-heroine-transparent.png?url";
import villagerUrl from "../assets/characters/croustille/gentil_villageois.png?url";
import goldKeyUrl from "../assets/characters/croustille/gold_key.png?url";
import cookieEnemyUrl from "../assets/enemies/enemies_cookies.png?url";
import finalBossUrl from "../assets/enemies/ogre_villain.png?url";
import { sweetButton, sweetCard, sweetPanel, sweetText } from "../ui/sweetUi";
import {
  BISCUIT_BOSS,
  BISCUIT_BRIDGE,
  BISCUIT_CHECKPOINTS,
  BISCUIT_ENEMIES,
  BISCUIT_GROUND,
  BISCUIT_INGREDIENTS,
  BISCUIT_MOVING,
  BISCUIT_PHYSICS,
  BISCUIT_PLATFORMS,
  BISCUIT_RESCUES,
  BISCUIT_START,
  BISCUIT_STARS,
  BISCUIT_STARS_TOTAL,
  BISCUIT_WIDTH,
} from "../world/biscuitCourse";

type Mode = "intro" | "playing" | "paused" | "lost" | "won";
type Enemy = Phaser.Physics.Arcade.Sprite;
type Missile = Phaser.Physics.Arcade.Image;

export class Level6Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private mode: Mode = "intro";
  private overlay?: Phaser.GameObjects.Container;
  private health = 3;
  private clock = 0;
  private immuneUntil = 0;
  private lastGrounded = -9999;
  private jumpBuffered = 0;
  private knockbackUntil = 0;
  private doubleJumpAvailable = true;
  private checkpoint = -1;
  private respawn = { ...BISCUIT_START };
  private stars = new Set<number>();
  private rescued = new Set<number>();
  private ingredients = new Set<string>();
  private starsText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Text[] = [];
  private hint!: Phaser.GameObjects.Text;
  private enemies: Enemy[] = [];
  private moving: Phaser.Physics.Arcade.Image[] = [];
  private bridge!: Phaser.Physics.Arcade.Image;
  private bridgeParts: Phaser.GameObjects.Rectangle[] = [];
  private bridgeLabel!: Phaser.GameObjects.Text;
  private boss!: Enemy;
  private bossHp = BISCUIT_BOSS.hp;
  private bossActive = false;
  private bossInvulnerableUntil = 0;
  private nextBossAttack = 0;
  private projectiles: Missile[] = [];
  private bossHealthText!: Phaser.GameObjects.Text;
  private bossDefeated = false;
  private exitHintUntil = 0;

  constructor() {
    super("Level6Scene");
  }

  preload(): void {
    if (!this.textures.exists("biscuit-hero"))
      this.load.image("biscuit-hero", heroineUrl);
    if (!this.textures.exists("biscuit-villager"))
      this.load.image("biscuit-villager", villagerUrl);
    if (!this.textures.exists("biscuit-enemy"))
      this.load.image("biscuit-enemy", cookieEnemyUrl);
    if (!this.textures.exists("biscuit-gold-key"))
      this.load.image("biscuit-gold-key", goldKeyUrl);
    if (!this.textures.exists("biscuit-boss-final"))
      this.load.image("biscuit-boss-final", finalBossUrl);
  }

  create(): void {
    this.mode = "intro";
    this.health = 3;
    this.clock = 0;
    this.immuneUntil = 0;
    this.lastGrounded = -9999;
    this.jumpBuffered = 0;
    this.knockbackUntil = 0;
    this.doubleJumpAvailable = true;
    this.checkpoint = -1;
    this.respawn = { ...BISCUIT_START };
    this.stars.clear();
    this.rescued.clear();
    this.ingredients.clear();
    this.enemies = [];
    this.moving = [];
    this.projectiles = [];
    this.bridgeParts = [];
    this.hearts = [];
    this.bossHp = BISCUIT_BOSS.hp;
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossInvulnerableUntil = 0;
    this.nextBossAttack = 0;
    this.exitHintUntil = 0;
    this.overlay = undefined;
    this.physics.resume();
    this.tweens.resumeAll();
    this.physics.world.setBounds(0, 0, BISCUIT_WIDTH, 650);
    this.makeTextures();
    this.drawBackdrop();
    const floors = this.physics.add.staticGroup();
    BISCUIT_GROUND.forEach((p) => {
      this.drawGround(p.x, p.w);
      const zone = this.add.zone(p.x, 570, p.w, 70);
      this.physics.add.existing(zone, true);
      floors.add(zone);
    });
    const ledges = this.physics.add.staticGroup();
    BISCUIT_PLATFORMS.forEach((p) => {
      const platform = ledges.create(
        p.x,
        p.y + 12,
        "biscuit-platform",
      ) as Phaser.Physics.Arcade.Image;
      platform.setDisplaySize(p.w, 27).refreshBody().setDepth(4);
      this.topOnly(platform.body as Phaser.Physics.Arcade.StaticBody);
    });
    BISCUIT_MOVING.forEach((p) => {
      const platform = this.physics.add
        .image(p.x, p.y + 12, "biscuit-platform")
        .setDisplaySize(140, 26)
        .setImmovable(true)
        .setDepth(4)
        .setFriction(1, 0);
      const body = platform.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      this.topOnly(body);
      platform
        .setVelocityX(p.speed)
        .setData("left", p.left)
        .setData("right", p.right)
        .setData("speed", p.speed);
      this.moving.push(platform);
    });
    this.makeBridge();
    this.player = this.physics.add
      .sprite(BISCUIT_START.x, BISCUIT_START.y, "biscuit-hero")
      .setDepth(10);
    const s = 100 / this.player.height;
    this.player
      .setScale(s)
      .setOrigin(0.5, 0.96)
      .setGravityY(BISCUIT_PHYSICS.gravity)
      .setCollideWorldBounds(true);
    this.player
      .body!.setSize(30 / s, 75 / s)
      .setOffset(
        (this.player.width - 30 / s) / 2,
        this.player.height * 0.96 - 75 / s,
      );
    this.physics.add.collider(this.player, floors);
    this.physics.add.collider(this.player, ledges);
    this.moving.forEach((platform) =>
      this.physics.add.collider(this.player, platform),
    );
    this.physics.add.collider(this.player, this.bridge);
    this.makeStars();
    this.makeRescues();
    this.makeIngredients();
    this.makeEnemies(floors);
    this.makeCheckpoints();
    this.makeBoss(floors);
    this.makeExit();
    this.makeHud();
    this.keys = this.input.keyboard!.createCursorKeys();
    const escape = () =>
      this.mode === "paused" ? this.resumeLevel() : this.pauseLevel();
    const blur = () => this.pauseLevel();
    this.input.keyboard!.on("keydown-ESC", escape);
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", escape);
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
    });
    this.cameras.main.setBounds(0, 0, BISCUIT_WIDTH, 650);
    this.cameras.main
      .startFollow(this.player, true, 0.12, 0.12)
      .setDeadzone(135, 90);
    this.physics.pause();
    this.tweens.pauseAll();
    this.overlay = sweetPanel(
      this,
      "Niveau 6 — Le Village des Biscuits",
      "Biscotin : « Sauve 3 amis, retrouve 3 ingrédients et reconstruis le pont ! »\n" +
        "La Plume Magique permet un double saut.",
      [["C’est parti !", () => this.begin()]],
      "biscuit-gold-key",
    );
  }

  private topOnly(
    body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
  ): void {
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  private makeTextures(): void {
    const texture = (
      key: string,
      width: number,
      height: number,
      paint: (g: Phaser.GameObjects.Graphics) => void,
    ) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      paint(g);
      g.generateTexture(key, width, height);
      g.destroy();
    };
    texture("biscuit-platform", 200, 40, (g) => {
      g.fillStyle(0xa76940).fillRoundedRect(0, 4, 200, 34, 11);
      g.fillStyle(0xf3c385).fillRoundedRect(0, 0, 200, 26, 10);
      g.lineStyle(3, 0xffe8ca).strokeRoundedRect(5, 3, 190, 20, 8);
      for (let x = 26; x < 185; x += 33)
        g.fillStyle(0x9f653d).fillCircle(x, 14, 4);
    });
    texture("biscuit-star", 46, 46, (g) => {
      g.fillStyle(0xffd864);

      const points: Phaser.Math.Vector2[] = [];

      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? 21 : 10;

        points.push(
          new Phaser.Math.Vector2(
            23 + Math.cos(angle) * radius,
            23 + Math.sin(angle) * radius,
          ),
        );
      }

      g.fillPoints(points, true);

      g.lineStyle(3, 0xfff6d4).strokeCircle(23, 23, 10);
    });
    texture("biscuit-caramel-enemy", 82, 82, (g) => {
      g.fillStyle(0x9a4e30).fillEllipse(41, 61, 64, 23);
      g.fillStyle(0xd88943).fillEllipse(41, 45, 70, 49);
      g.fillStyle(0xffbf65).fillEllipse(41, 40, 61, 39);
      g.fillStyle(0x5d3652).fillCircle(31, 37, 5).fillCircle(52, 37, 5);
      g.lineStyle(3, 0x713d43).lineBetween(33, 51, 50, 51);
    });
    texture("biscuit-projectile", 44, 44, (g) => {
      g.fillStyle(0xb87448).fillCircle(22, 22, 19);
      g.fillStyle(0xe7b675).fillCircle(22, 22, 15);
      g.fillStyle(0x8d573b).fillCircle(17, 16, 4).fillCircle(28, 25, 4);
    });
  }

  private drawBackdrop(): void {
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-20);
    sky
      .fillGradientStyle(0xfbe4e5, 0xffe9d2, 0xf9d8be, 0xe4b3c6, 1)
      .fillRect(0, 0, 900, 650);
    const hills = this.add.graphics().setScrollFactor(0.2).setDepth(-18);
    for (let i = 0; i < 19; i++) {
      const x = i * 300 - 180;
      hills
        .fillStyle(i % 2 ? 0xc48e75 : 0xe1b38f, 0.35)
        .fillEllipse(x, 540, 350, 175);
    }
    [350, 1150, 2030, 2850, 3490].forEach((x, index) =>
      this.drawHouse(x, index),
    );
    sweetText(this, 360, 166, "Village abandonné", 22)
      .setOrigin(0.5)
      .setDepth(5);
    sweetText(this, 1360, 166, "Pont de gaufrette", 22)
      .setOrigin(0.5)
      .setDepth(5);
    sweetText(this, 2450, 166, "Fabrique magique", 22)
      .setOrigin(0.5)
      .setDepth(5);
    sweetText(this, 4060, 166, "Château de Croquefort", 22)
      .setOrigin(0.5)
      .setDepth(5);
  }

  private drawHouse(x: number, i: number): void {
    const g = this.add.graphics().setDepth(-4);
    const y = 520;
    g.fillStyle(0xe1a771).fillRoundedRect(x - 68, y - 128, 136, 132, 16);
    g.lineStyle(6, 0xfff6d9).strokeRoundedRect(x - 68, y - 128, 136, 132, 16);
    g.fillStyle(i % 2 ? 0xba6a6b : 0xc98a72).fillTriangle(
      x - 90,
      y - 117,
      x,
      y - 197,
      x + 90,
      y - 117,
    );
    g.lineStyle(4, 0xffebdd)
      .lineBetween(x - 80, y - 116, x, y - 186)
      .lineBetween(x, y - 186, x + 80, y - 116);
    g.fillStyle(0x9b6b56).fillRoundedRect(x - 22, y - 60, 44, 64, 10);
    g.fillStyle(0xa4d9d6).fillCircle(x + 42, y - 78, 17);
    g.fillStyle(0xffe5c6).fillCircle(x + 45, y - 82, 5);
  }

  private drawGround(x: number, w: number): void {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0xa26b44).fillRect(x - w / 2, 535, w, 115);
    g.fillStyle(0xf3c58c).fillRoundedRect(x - w / 2, 532, w, 24, 9);
    g.fillStyle(0xfff3d7).fillRoundedRect(x - w / 2, 527, w, 10, 5);
    for (let j = 0; j < Math.floor(w / 85); j++)
      g.fillStyle(0x8e573e, 0.65).fillCircle(x - w / 2 + 35 + j * 85, 575, 7);
  }

  private makeBridge(): void {
    const p = BISCUIT_BRIDGE;
    this.bridge = this.physics.add
      .image(p.x, p.y + 7, "biscuit-platform")
      .setDisplaySize(p.w, 28)
      .setDepth(4)
      .setImmovable(true);
    const body = this.bridge.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = false;
    this.topOnly(body);
    for (let i = 0; i < 3; i++) {
      const part = this.add
        .rectangle(p.x - 120 + i * 120, p.y + 6, 113, 25, 0xf1c288)
        .setStrokeStyle(3, 0xa46d4c)
        .setDepth(5)
        .setVisible(false);
      this.bridgeParts.push(part);
    }
    this.bridgeLabel = sweetText(
      this,
      BISCUIT_BRIDGE.x,
      462,
      "Pont : 0/3 ingrédients",
      16,
    )
      .setOrigin(0.5)
      .setDepth(6);
  }

  private makeStars(): void {
    BISCUIT_STARS.forEach(([x, y], index) => {
      const star = this.physics.add
        .staticImage(x, y, "biscuit-star")
        .setDepth(8);
      this.tweens.add({
        targets: star,
        angle: 15,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
      this.physics.add.overlap(this.player, star, () => {
        if (this.mode !== "playing" || this.stars.has(index)) return;
        this.stars.add(index);
        star.destroy();
        this.updateHud();
        if (this.stars.size === BISCUIT_STARS_TOTAL)
          this.showHint("15 étoiles ! Le château approche.");
      });
    });
  }

  private makeRescues(): void {
    BISCUIT_RESCUES.forEach((x, index) => {
      const villager = this.physics.add
        .staticImage(x, 535, "biscuit-villager")
        .setDisplaySize(88, 88)
        .setOrigin(0.5, 0.86)
        .refreshBody()
        .setDepth(7);
      const glow = this.add.circle(x, 505, 48, 0xffd9e7, 0.25).setDepth(6);
      sweetText(this, x, 443, "Aide !", 14).setOrigin(0.5).setDepth(7);
      this.physics.add.overlap(this.player, villager, () => {
        if (this.mode !== "playing" || this.rescued.has(index)) return;
        this.rescued.add(index);
        villager.destroy();
        glow.destroy();
        this.updateHud();
        this.showHint(`Habitant libéré : ${this.rescued.size}/3 !`);
      });
    });
  }

  private makeIngredients(): void {
    BISCUIT_INGREDIENTS.forEach((item) => {
      const ingredient = this.add
        .star(item.x, item.y, 5, 16, 28, 0xffe3a1)
        .setDepth(8);
      this.physics.add.existing(ingredient, true);
      sweetText(this, item.x, item.y - 48, item.name, 14)
        .setOrigin(0.5)
        .setDepth(8);
      this.physics.add.overlap(this.player, ingredient, () => {
        if (this.mode !== "playing" || this.ingredients.has(item.key)) return;
        this.ingredients.add(item.key);
        ingredient.destroy();
        this.updateBridge();
        this.updateHud();
        this.showHint(
          `${item.name} trouvé ! ${this.ingredients.size}/3 morceaux réparés.`,
        );
      });
    });
  }

  private updateBridge(): void {
    this.bridgeParts.forEach((part, i) =>
      part.setVisible(i < this.ingredients.size),
    );
    this.bridgeLabel.setText(
      this.ingredients.size === 3
        ? "Pont reconstruit !"
        : `Pont : ${this.ingredients.size}/3 ingrédients`,
    );
    if (this.ingredients.size === 3) {
      (this.bridge.body as Phaser.Physics.Arcade.Body).enable = true;
      this.showHint("Le pont de gaufrette est reconstruit !");
    }
  }

  private makeEnemies(floors: Phaser.Physics.Arcade.StaticGroup): void {
    BISCUIT_ENEMIES.forEach((p, i) => {
      const isCookie = p.kind === "cookie";
      const texture = isCookie ? "biscuit-enemy" : "biscuit-caramel-enemy";
      const size = isCookie ? 106 : 66;
      const groundOrigin = isCookie ? 0.91 : 0.85;
      const enemy = this.physics.add
        .sprite(p.x, 510, texture)
        .setDepth(8)
        .setDisplaySize(size, size)
        .setGravityY(BISCUIT_PHYSICS.gravity)
        .setOrigin(0.5, groundOrigin);
      const speed = 44 + (i % 3) * 9;
      enemy
        .body!.setSize(48 / enemy.scaleX, 50 / enemy.scaleY)
        .setOffset(
          (enemy.width - 48 / enemy.scaleX) / 2,
          enemy.height * groundOrigin - 50 / enemy.scaleY,
        );
      enemy
        .setVelocityX(i % 2 ? -speed : speed)
        .setData("left", p.left)
        .setData("right", p.right)
        .setData("speed", speed);
      this.physics.add.collider(enemy, floors);
      this.enemies.push(enemy);
    });
    this.physics.add.overlap(this.player, this.enemies, (_a, enemy) => {
      this.takeDamage((enemy as Enemy).x);
    });
  }

  private makeCheckpoints(): void {
    BISCUIT_CHECKPOINTS.forEach((x, i) => {
      const flag = this.add
        .triangle(x, 464, 0, 0, 44, 13, 0, 28, 0xc88998)
        .setDepth(7);
      this.add.rectangle(x - 20, 497, 5, 75, 0x9e6643).setDepth(6);
      const zone = this.add.zone(x, 485, 110, 110);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => {
        if (this.mode !== "playing" || i <= this.checkpoint) return;
        this.checkpoint = i;
        this.respawn = { x, y: 510 };
        flag.setFillStyle(0xffdc79);
        this.showHint("Checkpoint activé !");
      });
    });
  }

  private makeBoss(floors: Phaser.Physics.Arcade.StaticGroup): void {
    // Boss fixe dans l'arene, sans gravite.
    this.boss = this.physics.add
      .sprite(BISCUIT_BOSS.x, 535, "biscuit-boss-final")
      .setDepth(12)
      .setDisplaySize(210, 210)
      .setOrigin(0.5, 0.91)
      .setImmovable(true);
    (this.boss.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.boss.setVelocity(0, 0);
    this.boss.setFlipX(true);
    this.boss
      .body!.setSize(110 / this.boss.scaleX, 140 / this.boss.scaleY)
      .setOffset(
        (this.boss.width - 110 / this.boss.scaleX) / 2,
        this.boss.height * 0.91 - 140 / this.boss.scaleY,
      );
    this.physics.add.collider(this.boss, floors);
    this.bossHealthText = sweetText(
      this,
      BISCUIT_BOSS.x,
      286,
      "CROQUEFORT ♥ ♥ ♥",
      18,
    )
      .setOrigin(0.5)
      .setDepth(13);
    sweetText(this, BISCUIT_BOSS.x, 316, "Saute 3 fois sur sa tete !", 16)
      .setOrigin(0.5)
      .setDepth(13);
    this.physics.add.overlap(this.player, this.boss, () => this.touchBoss());
  }

  private touchBoss(): void {
    if (this.mode !== "playing" || this.bossDefeated) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const stomping = body.velocity.y > 70 && this.player.y < this.boss.y - 36;
    if (stomping && this.clock >= this.bossInvulnerableUntil) {
      this.bossHp--;
      this.bossInvulnerableUntil = this.clock + 900;
      body.setVelocityY(-430);
      this.bossHealthText.setText("CROQUEFORT " + "♥ ".repeat(this.bossHp));
      this.boss.setTint(0xffaaaa);
      this.time.delayedCall(220, () => {
        if (this.boss.active) this.boss.clearTint();
      });
      if (this.bossHp <= 0) this.defeatBoss();
      else
        this.showHint(`Bravo ! Plus que ${this.bossHp} coups sur Croquefort !`);
    } else if (this.clock >= this.bossInvulnerableUntil)
      this.takeDamage(this.boss.x);
  }

  private defeatBoss(): void {
    this.bossDefeated = true;
    this.bossActive = false;
    this.boss.disableBody(true, true);
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    this.bossHealthText.setText("CROQUEFORT VAINCU !");
    this.showHint("Le gardien est vaincu ! Rejoins la porte dorée !");
  }

  private fireBossProjectile(): void {
    if (!this.boss.active) return;
    const p = this.physics.add
      .image(this.boss.x - 67, 485, "biscuit-projectile")
      .setDepth(9)
      .setDisplaySize(35, 35);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX(-190 - (BISCUIT_BOSS.hp - this.bossHp) * 40);
    this.physics.add.overlap(this.player, p, () => {
      if (!p.active) return;
      p.destroy();
      this.takeDamage(this.player.x + 50);
    });
    this.projectiles.push(p);
  }

  private makeExit(): void {
    const x = 4420;
    this.add.ellipse(x, 465, 115, 154, 0x9b567a).setDepth(5);
    this.add.ellipse(x, 465, 86, 127, 0xffeab7).setDepth(6);
    this.add
      .image(x, 444, "biscuit-gold-key")
      .setDisplaySize(82, 82)
      .setDepth(7);
    sweetText(this, x, 365, "SORTIE", 18).setOrigin(0.5).setDepth(7);
    const zone = this.add.zone(x, 471, 95, 135);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => this.tryFinish());
  }

  private tryFinish(): void {
    if (this.mode !== "playing") return;
    const ready =
      this.stars.size === BISCUIT_STARS_TOTAL &&
      this.rescued.size === 3 &&
      this.ingredients.size === 3 &&
      this.bossDefeated;
    if (ready) {
      this.win();
      return;
    }
    if (this.clock < this.exitHintUntil) return;
    this.exitHintUntil = this.clock + 2500;
    if (
      this.stars.size === BISCUIT_STARS_TOTAL &&
      this.rescued.size === 3 &&
      this.ingredients.size === 3 &&
      !this.bossDefeated
    ) {
      this.showHint(
        "Il ne reste que Croquefort ! Retourne a gauche et saute 3 fois sur sa tete.",
      );
    } else {
      this.showHint(
        `Il reste ${BISCUIT_STARS_TOTAL - this.stars.size} etoiles, ${3 - this.rescued.size} amis, ` +
          `${3 - this.ingredients.size} ingredients${this.bossDefeated ? "" : " et Croquefort a vaincre"} !`,
      );
    }
  }

  private makeHud(): void {
    const hud = this.add.container(0, 0).setDepth(50).setScrollFactor(0);
    hud.add(sweetCard(this, 18, 14, 146, 54));
    this.hearts = [0, 1, 2].map((i) =>
      sweetText(this, 32 + i * 40, 20, "♥", 31).setColor("#e65d96"),
    );
    hud.add(this.hearts);
    hud.add(sweetCard(this, 309, 10, 272, 64));
    hud.add(sweetText(this, 445, 14, "Niveau 6", 20).setOrigin(0.5, 0));
    hud.add(
      sweetText(this, 445, 44, "Le Village des Biscuits", 14).setOrigin(0.5, 0),
    );
    hud.add(sweetCard(this, 599, 14, 191, 54));
    this.starsText = sweetText(this, 611, 18, "★ 0 / 15", 17);
    hud.add(this.starsText);
    this.objectiveText = sweetText(this, 611, 43, "Amis 0/3 · Objets 0/3", 12);
    hud.add(this.objectiveText);
    hud.add(sweetButton(this, 840, 40, "Pause", () => this.pauseLevel(), 92));
    this.hint = sweetText(this, 450, 103, "", 16)
      .setOrigin(0.5)
      .setAlign("center")
      .setWordWrapWidth(680)
      .setBackgroundColor("#fff8eb")
      .setPadding(10, 6)
      .setAlpha(0);
    hud.add(this.hint);
  }

  private updateHud(): void {
    this.starsText.setText(`★ ${this.stars.size} / ${BISCUIT_STARS_TOTAL}`);
    this.objectiveText.setText(
      `Amis ${this.rescued.size}/3 · Objets ${this.ingredients.size}/3`,
    );
  }

  private showHint(message: string): void {
    this.tweens.killTweensOf(this.hint);
    this.hint.setText(message).setAlpha(1);
    this.tweens.add({
      targets: this.hint,
      alpha: 0,
      delay: 2600,
      duration: 500,
    });
  }

  private begin(): void {
    if (this.mode !== "intro") return;
    this.overlay?.destroy();
    this.overlay = undefined;
    this.mode = "playing";
    this.physics.resume();
    this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
    this.showHint(
      "← → Marcher · Espace/↑ Sauter · Second saut dans les airs !",
    );
  }

  update(_time: number, delta: number): void {
    if (this.mode !== "playing") return;
    this.clock += delta;
    // Croquefort regarde toujours Zaynab.
    if (this.boss.active && !this.bossDefeated) {
      this.boss.setFlipX(this.player.x < this.boss.x);
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const direction =
      Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    if (this.clock >= this.knockbackUntil)
      body.setVelocityX(direction * BISCUIT_PHYSICS.speed);
    if (direction) this.player.setFlipX(direction < 0);
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      this.lastGrounded = this.clock;
      this.doubleJumpAvailable = true;
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up)
    )
      this.jumpBuffered = this.clock + 130;
    if (this.jumpBuffered > this.clock) {
      if (this.clock - this.lastGrounded < 130) {
        body.setVelocityY(-BISCUIT_PHYSICS.jump);
        this.lastGrounded = -9999;
        this.jumpBuffered = 0;
      } else if (
        this.doubleJumpAvailable &&
        this.registry.get("magicFeather") === true
      ) {
        body.setVelocityY(-BISCUIT_PHYSICS.jump * 0.85);
        this.doubleJumpAvailable = false;
        this.jumpBuffered = 0;
        this.showHint("Plume Magique ! Double saut !");
      }
    }
    this.moving.forEach((p) => {
      const left = Number(p.getData("left")),
        right = Number(p.getData("right"));
      const speed = Number(p.getData("speed"));
      if (p.x > right) p.setVelocityX(-speed);
      else if (p.x < left) p.setVelocityX(speed);
    });
    this.enemies.forEach((enemy) => {
      const left = Number(enemy.getData("left")),
        right = Number(enemy.getData("right"));
      const speed = Number(enemy.getData("speed"));
      if (enemy.x >= right) enemy.setVelocityX(-speed);
      else if (enemy.x <= left) enemy.setVelocityX(speed);
    });
    if (this.player.x > 3920 && !this.bossDefeated) {
      if (!this.bossActive) {
        this.bossActive = true;
        this.nextBossAttack = this.clock + 900;
      }
      if (this.clock > this.nextBossAttack) {
        this.fireBossProjectile();
        this.nextBossAttack =
          this.clock + (Number(this.bossHp) <= 1 ? 1250 : 1750);
      }
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (!p.active) return false;
      if (p.x < 3710) {
        p.destroy();
        return false;
      }
      return true;
    });
    if (body.bottom > 632) this.fall();
  }

  private takeDamage(sourceX: number): void {
    if (this.mode !== "playing" || this.clock < this.immuneUntil) return;
    this.health--;
    this.hearts.forEach((heart, i) =>
      heart.setColor(i < this.health ? "#e65d96" : "#b9aabd"),
    );
    if (this.health <= 0) {
      this.lose();
      return;
    }
    this.protect();
    this.knockbackUntil = this.clock + 320;
    this.player.setVelocity(this.player.x < sourceX ? -110 : 110, -260);
  }

  private protect(): void {
    this.immuneUntil = this.clock + 1450;
    this.tweens.killTweensOf(this.player);
    this.player.setAlpha(1);
    this.tweens.add({
      targets: this.player,
      alpha: 0.4,
      duration: 145,
      repeat: 4,
      yoyo: true,
      onComplete: () => this.player.setAlpha(1),
    });
  }

  private fall(): void {
    if (this.mode !== "playing") return;
    this.takeDamage(this.player.x);
    if (this.mode !== "playing") return;
    (this.player.body as Phaser.Physics.Arcade.Body).reset(
      this.respawn.x,
      this.respawn.y,
    );
    this.player.setVelocity(0, 0);
    this.protect();
    this.lastGrounded = -9999;
    this.jumpBuffered = 0;
    this.doubleJumpAvailable = true;
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(this.respawn.x, 325);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.showHint("Tu repars du dernier drapeau !");
  }

  private pauseLevel(): void {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    this.physics.pause();
    this.tweens.pauseAll();
    this.overlay = sweetPanel(
      this,
      "Pause au Village",
      "Biscotin te souhaite une bonne pause !",
      [
        ["Reprendre", () => this.resumeLevel()],
        ["REJOUER", () => this.scene.restart()],
        ["Menu principal", () => this.scene.start("MenuScene")],
      ],
    );
  }

  private resumeLevel(): void {
    if (this.mode !== "paused") return;
    this.overlay?.destroy();
    this.overlay = undefined;
    this.mode = "playing";
    this.physics.resume();
    this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
  }

  private lose(): void {
    this.mode = "lost";
    this.physics.pause();
    this.tweens.pauseAll();
    this.player.setVelocity(0, 0).setAlpha(1);
    this.overlay = sweetPanel(
      this,
      "Oups ! On réessaie ? 💕",
      "Biscotin : « Tu es courageuse, Zaynab ! »",
      [
        ["REJOUER", () => this.scene.restart()],
        ["Menu principal", () => this.scene.start("MenuScene")],
      ],
    );
  }

  private win(): void {
    if (this.mode !== "playing") return;
    this.mode = "won";
    this.physics.pause();
    this.tweens.pauseAll();
    this.player.setVelocity(0, 0).setAlpha(1);
    this.registry.set("level6Complete", true);
    this.registry.set("goldenBiscuitKey", true);
    this.overlay = sweetPanel(
      this,
      "La Clé Biscuit Dorée !",
      "Zaynab a sauvé les habitants, reconstruit le pont et vaincu Croquefort !\n" +
        "La Forêt des Glaces Enchantées t’attend !",
      [
        ["NIVEAU SUIVANT", () => this.scene.start("Level7Scene")],
        ["Retour au menu", () => this.scene.start("MenuScene")],
        ["Rejouer le niveau", () => this.scene.restart()],
      ],
      "biscuit-gold-key",
    );
  }
}
