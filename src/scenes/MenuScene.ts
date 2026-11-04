import Phaser from "phaser";
import heroineUrl from "../assets/characters/heroine/new-heroine-transparent.png?url";
import { DEV_MODE } from '../config/devMode';
export class MenuScene extends Phaser.Scene {
  private instructions?: Phaser.GameObjects.Container;

  constructor() {
    super("MenuScene");
  }

  preload(): void {
    this.load.image("menu-heroine", heroineUrl);
  }

  create(): void {
    if (DEV_MODE) {
      const shortcuts = (event: KeyboardEvent) => {
        const match = /^(?:Digit|Numpad)([1-7])$/.exec(event.code);
        if (match && !event.repeat) this.startLevel(Number(match[1]));
      };
      this.input.keyboard?.on('keydown', shortcuts);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', shortcuts));
    }

    this.instructions = undefined;
    const { width, height } = this.scale;

    const background = this.add.graphics();
    background.fillGradientStyle(0x302049, 0x482858, 0xa34f83, 0xd77791, 1);
    background.fillRect(0, 0, width, height);

    this.add.ellipse(width * 0.79, height * 0.56, 430, 470, 0xffc7e9, 0.12);
    this.add.ellipse(width * 0.79, height * 0.56, 360, 400, 0xffe6a8, 0.08);

    const hills = this.add.graphics();
    hills.fillStyle(0x57325f, 0.6);
    hills.fillEllipse(120, 650, 400, 150);
    hills.fillEllipse(410, 660, 480, 150);
    hills.fillEllipse(810, 645, 450, 160);
    hills.fillStyle(0x804477, 0.74);
    hills.fillEllipse(70, 680, 350, 130);
    hills.fillEllipse(410, 690, 480, 145);
    hills.fillEllipse(845, 680, 400, 150);

    this.addCloud(115, 270, 0.8);
    this.addCloud(445, 295, 0.55);
    this.addLollipop(74, 458, 0xffc95c, -0.16, 0.75);
    this.addLollipop(513, 255, 0x69d5cb, 0.2, 0.62);
    this.addLollipop(843, 205, 0xff76ad, -0.12, 0.58);

    for (let i = 0; i < 38; i++) {
      const x = Phaser.Math.Between(18, width - 18);
      const y = Phaser.Math.Between(18, height - 18);
      const star = this.add.star(x, y, 4, 2, 6, i % 4 === 0 ? 0xffb6d5 : 0xffe9a8);
      star.setAlpha(Phaser.Math.FloatBetween(0.35, 0.85));
      star.setDepth(1);

      this.tweens.add({
        targets: star,
        alpha: 0.18,
        angle: 18,
        duration: Phaser.Math.Between(800, 1900),
        yoyo: true,
        repeat: -1,
      });
    }

    const heroine = this.add.image(width * 0.79, height * 0.66, "menu-heroine");
    heroine.setDisplaySize(350, 437).setDepth(4);
    this.tweens.add({
      targets: heroine,
      y: heroine.y - 9,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(width * 0.39, 43, "✦  BIENVENUE AU ROYAUME SUCRÉ  ✦", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffe8b5",
        stroke: "#713a64",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    const title = this.add
      .text(width * 0.39, 119, "L’AVENTURE\nDE ZAYNAB", {
        fontFamily: "Georgia, serif",
        fontSize: "51px",
        fontStyle: "bold",
        color: "#fff1c7",
        align: "center",
        stroke: "#713a64",
        strokeThickness: 8,
        shadow: {
          offsetX: 0,
          offsetY: 5,
          color: "#311d47",
          blur: 10,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.tweens.add({
      targets: title,
      y: title.y - 6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(width * 0.39, 217, "Une aventure pleine de douceurs !", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#fff0d4",
        stroke: "#743d6c",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    const buttonX = width * 0.36;
    this.createButton(buttonX, 330, "JOUER", 0xf4a64e, () =>
      this.scene.start("Level1Scene"),
    );
    this.createButton(buttonX, 430, "LES NIVEAUX", 0x7299bf, () => this.showLevels());
    this.createButton(buttonX, 530, "COMMENT JOUER", 0x8d579b, () =>
      this.showInstructions(),
    );
    this.add
      .text(width * 0.39, height - 25, "Créé avec amour  ♥  Bon voyage !", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffe5bd",
        stroke: "#713a64",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.add
      .text(width * 0.79, height - 28, "✦", {
        fontSize: "30px",
        color: "#fff1c7",
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private showLevels(): void {
    if (this.instructions?.active) return;
    const panel = this.add.container(0, 0).setDepth(100).setScrollFactor(0);
    const shade = this.add.rectangle(450, 325, 900, 650, 0x302049, .98).setScrollFactor(0).setInteractive();
    shade.on('pointerdown', (_pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>event.stopPropagation());
    panel.add(shade);
    panel.add(this.add.text(450, 65, "CHOISIS TON AVENTURE", {
      fontFamily: "Trebuchet MS", fontSize: "30px", color: "#fff1c7",
    }).setOrigin(.5));
    if (DEV_MODE) panel.add(this.add.text(450, 101, 'MODE DÉVELOPPEUR · Accès libre · Raccourcis 1–7', {
      fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#b9f5ef',
    }).setOrigin(.5));
    const labels = ["Bonbons", "Chocolat", "Île fruitée", "Palais", "Barbe à papa", "Biscuits", "Glaces enchantées"];
    labels.forEach((label, i) => {
      const unlocked = DEV_MODE || i === 0 || this.registry.get(`level${i}Complete`) === true;
      const x = 230 + (i % 2) * 440, y = 155 + Math.floor(i / 2) * 100;
      const tile = this.add.rectangle(x, y, 380, 76, unlocked ? 0x8660a9 : 0x51445f)
        .setStrokeStyle(2, 0xeac4de).setScrollFactor(0);
      if (unlocked) tile.setInteractive({ useHandCursor: true }).on('pointerdown',
        (_pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{
          event.stopPropagation(); this.startLevel(i + 1);
        });
      panel.add(tile);
      panel.add(this.add.text(x, y, `NIVEAU ${i + 1} · ${label}${unlocked ? "" : " 🔒"}`, {
        fontFamily: "Trebuchet MS", fontSize: "19px", color: unlocked ? "#fff1c7" : "#bcb3c8",
      }).setOrigin(.5).setScrollFactor(0));
    });
    const back = this.add.text(450, 575, "← RETOUR", { fontSize: "24px", color: "#fff1c7" }).setOrigin(.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => { panel.destroy(); this.instructions = undefined; });
    panel.add(back); this.instructions = panel;
  }

  private startLevel(level: number): void {
    const key = `Level${level}Scene`;
    if (level < 1 || level > 7 || !this.scene.manager.keys[key]) return;
    if (!DEV_MODE && level > 1 && this.registry.get(`level${level - 1}Complete`) !== true) return;
    if (DEV_MODE) {
      // Development access grants abilities needed by later levels, never completion flags.
      this.registry.set('magicFeather', true);
      this.registry.set('goldenBiscuitKey', true);
    }
    this.instructions?.destroy(); this.instructions = undefined;
    this.scene.start(key);
  }

  private addCloud(x: number, y: number, scale: number): void {
    const cloud = this.add.container(x, y);
    [
      [-25, 4, 35],
      [0, -7, 45],
      [28, 4, 34],
      [4, 12, 66],
    ].forEach(([offsetX, offsetY, radius]) => {
      cloud.add(
        this.add.circle(offsetX, offsetY, radius, 0xfff0e2, 0.13),
      );
    });
    cloud.setScale(scale).setDepth(0);
    this.tweens.add({
      targets: cloud,
      x: x + 7,
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private addLollipop(
    x: number,
    y: number,
    color: number,
    angle: number,
    scale: number,
  ): void {
    const candy = this.add.container(x, y);
    const graphics = this.add.graphics();
    graphics.lineStyle(6, 0xffe9bd, 0.9);
    graphics.lineBetween(0, 14, 7, 67);
    graphics.fillStyle(color, 0.95);
    graphics.fillCircle(0, 0, 24);
    graphics.lineStyle(4, 0xfff1d0, 0.9);
    graphics.strokeCircle(0, 0, 17);
    graphics.fillStyle(0xfff1d0, 0.95);
    graphics.fillCircle(0, 0, 5);
    candy.add(graphics).setRotation(angle).setScale(scale).setDepth(2);
    this.tweens.add({
      targets: candy,
      angle: candy.angle + 8,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    callback: () => void,
  ): void {
    const button = this.add.container(x, y);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x39234e, 0.38).fillRoundedRect(-153, -30, 306, 72, 22);
    const shape = this.add.graphics();
    shape.fillStyle(color).fillRoundedRect(-150, -36, 300, 70, 20);
    shape.lineStyle(3, 0xffe9bd, 0.95).strokeRoundedRect(-150, -36, 300, 70, 20);
    shape.lineStyle(2, 0xffffff, 0.26).strokeRoundedRect(-143, -30, 286, 58, 16);

    const badge = this.add.circle(-116, -1, 16, 0xffe9a8);
    const icon = this.add.star(-116, -1, 5, 3, 9, 0xf08b76);
    const text = this.add
      .text(8, 0, label, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "21px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#59365e",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    button.add([shadow, shape, badge, icon, text]);
    button.setSize(300, 70);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      this.tweens.add({
        targets: button,
        scale: 1.06,
        duration: 150,
        ease: "Back.easeOut",
      });
    });

    button.on("pointerout", () => {
      this.tweens.add({
        targets: button,
        scale: 1,
        duration: 150,
      });
    });

    button.on("pointerdown", callback);
  }

  private showInstructions(): void {
    if (this.instructions?.active) return;
    const panel = this.add.container(
      this.scale.width / 2,
      this.scale.height / 2,
    ).setScrollFactor(0);

    const shade = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x25143b, 0.68)
      .setScrollFactor(0).setInteractive();
    const background = this.add.graphics();
    background.fillStyle(0x39234e, 0.98).fillRoundedRect(-290, -145, 580, 290, 28);
    background.lineStyle(4, 0xffe9bd).strokeRoundedRect(-290, -145, 580, 290, 28);
    background.lineStyle(2, 0xf18fba, 0.8).strokeRoundedRect(-279, -134, 558, 268, 22);

    const instructions = this.add
      .text(
        0,
        0,
        "COMMENT JOUER ?\n\n← → : Se déplacer · ESPACE ou ↑ : Sauter\nTrouve les 9 étoiles, puis la sortie !\nÉCHAP : Pause · Les gelées font rebondir\n\nClique pour fermer",
        {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "19px",
          fontStyle: "bold",
          color: "#fff1c7",
          align: "center",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    panel.add([shade, background, instructions]);
    panel.setDepth(100);
    this.instructions = panel;
    panel.setSize(this.scale.width, this.scale.height);
    shade.once("pointerdown", (_pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      panel.destroy();
      this.instructions = undefined;
    });
  }
}
