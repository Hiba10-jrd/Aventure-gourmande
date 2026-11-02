import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  private instructions?: Phaser.GameObjects.Container;
  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.instructions = undefined;
    const { width, height } = this.scale;

    const background = this.add.graphics();
    background.fillGradientStyle(0x352052, 0x352052, 0x9c568a, 0x9c568a, 1);
    background.fillRect(0, 0, width, height);

    for (let i = 0; i < 45; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(20, height - 20);

      const star = this.add.star(x, y, 4, 2, 6, 0xffe9a8);
      star.setAlpha(Phaser.Math.FloatBetween(0.3, 0.9));

      this.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(700, 1600),
        yoyo: true,
        repeat: -1,
      });
    }

    const title = this.add
      .text(width / 2, height * 0.25, "L’AVENTURE\nGOURMANDE", {
        fontFamily: "Georgia, serif",
        fontSize: "54px",
        fontStyle: "bold",
        color: "#fff1c7",
        align: "center",
        stroke: "#713a64",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: title,
      y: title.y - 8,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(width / 2, height * 0.48, "Une aventure pleine de douceurs !", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#ffe5bd",
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height * 0.65, "JOUER", 0xf4a64e, () =>
      this.scene.start("Level1Scene"),
    );

    this.createButton(width / 2, height * 0.78, "COMMENT JOUER", 0x8d579b, () =>
      this.showInstructions(),
    );

    this.add
      .text(width / 2, height * 0.94, "Créé avec amour ♥", {
        fontSize: "16px",
        color: "#ffe5bd",
      })
      .setOrigin(0.5);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    callback: () => void,
  ): void {
    const button = this.add.container(x, y);

    const shape = this.add.rectangle(0, 0, 280, 65, color);
    shape.setStrokeStyle(3, 0xffe9bd);

    const text = this.add
      .text(0, 0, label, {
        fontSize: "23px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    button.add([shape, text]);
    button.setSize(280, 65);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      this.tweens.add({
        targets: button,
        scale: 1.08,
        duration: 150,
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
    );

    const background = this.add.rectangle(0, 0, 540, 250, 0x38254e, 0.98);
    background.setStrokeStyle(3, 0xffe9bd);

    const instructions = this.add
      .text(
        0,
        0,
        "COMMENT JOUER ?\n\n← → : Se déplacer · ESPACE ou ↑ : Sauter\nTrouve les 9 étoiles, puis la sortie !\nÉCHAP : Pause · Les gelées font rebondir\n\nClique pour fermer",
        {
          fontSize: "20px",
          color: "#fff1c7",
          align: "center",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    const shade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x25143b, 0.6).setInteractive();
    panel.add([shade, background, instructions]);
    panel.setDepth(100);
    this.instructions = panel;
    panel.setSize(540, 250);
    panel.setInteractive({ useHandCursor: true });

    panel.once("pointerdown", () => panel.destroy());
  }
}
