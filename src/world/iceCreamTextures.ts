import Phaser from 'phaser';
// Original vector-like artwork, generated locally; no third-party assets.
export function makeIceTextures(scene: Phaser.Scene): void {
  const texture = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
  };
  texture('ice-platform', 180, 32, g => {
    g.fillStyle(0x69afcd).fillRoundedRect(0, 0, 180, 32, 9);
    g.fillStyle(0xe3ffff).fillRoundedRect(0, 0, 180, 12, 6);
    g.lineStyle(2, 0xa8f4f5).lineBetween(15, 21, 65, 17).lineBetween(100, 25, 160, 17);
  });
  texture('ice-wafer', 180, 32, g => {
    g.fillStyle(0xc99467).fillRoundedRect(0, 0, 180, 32, 7);
    g.fillStyle(0xffe4af).fillRoundedRect(0, 0, 180, 9, 4);
    g.lineStyle(2, 0xf9c991); for (let x = 0; x < 180; x += 18) g.lineBetween(x, 10, x + 20, 32);
  });
  const face = (g: Phaser.GameObjects.Graphics, x: number, y: number) => {
    g.fillStyle(0xffffff).fillEllipse(x - 11, y, 13, 18).fillEllipse(x + 11, y, 13, 18);
    g.fillStyle(0x344365).fillEllipse(x - 9, y + 1, 6, 11).fillEllipse(x + 9, y + 1, 6, 11);
    g.fillStyle(0xffffff).fillCircle(x - 10, y - 2, 2).fillCircle(x + 8, y - 2, 2);
    g.fillStyle(0xff9dbb, .7).fillEllipse(x - 22, y + 15, 12, 6).fillEllipse(x + 22, y + 15, 12, 6);
    g.lineStyle(3, 0x54375d).lineBetween(x - 7, y + 17, x, y + 21).lineBetween(x, y + 21, x + 8, y + 16);
  };
  texture('ice-frosty', 96, 108, g => {
    g.fillStyle(0x9f6589).fillEllipse(25, 98, 28, 13).fillEllipse(71, 98, 28, 13);
    g.fillStyle(0xe0ac77).fillTriangle(24, 58, 72, 58, 48, 103);
    g.lineStyle(2, 0xffdfac).lineBetween(30, 68, 59, 83).lineBetween(36, 82, 65, 69);
    g.fillStyle(0xf78db5).fillCircle(48, 39, 33).fillCircle(23, 53, 17).fillCircle(73, 53, 17);
    g.fillStyle(0xffc7dc).fillEllipse(35, 20, 23, 10);
    g.fillStyle(0xea547e).fillCircle(49, 8, 7); g.lineStyle(3, 0x70aa8e).lineBetween(49, 3, 56, 0);
    face(g, 48, 42);
  });
  texture('ice-picpic', 96, 108, g => {
    g.fillStyle(0xe6bd8b).fillRoundedRect(40, 78, 16, 29, 6);
    g.fillStyle(0x518cb9).fillRoundedRect(19, 15, 58, 76, 18);
    g.fillStyle(0x9cf2e6).fillRoundedRect(23, 10, 50, 72, 16);
    g.fillStyle(0xe5fff7, .7).fillRoundedRect(29, 19, 10, 30, 5);
    for (const x of [15, 76]) g.fillStyle(0xd7fcff).fillTriangle(x, 48, x + 6, 32, x + 12, 48);
    face(g, 48, 48);
  });
  texture('ice-glacior', 128, 144, g => {
    g.fillStyle(0x586bb0).fillTriangle(20, 125, 64, 38, 110, 125);
    g.fillStyle(0xb8a2ed).fillEllipse(94, 91, 48, 57);
    g.lineStyle(4, 0xe2d3ff).strokeEllipse(94, 91, 48, 57);
    g.fillStyle(0x76d7ea).fillEllipse(59, 87, 69, 82);
    g.fillTriangle(28, 44, 27, 9, 55, 37).fillTriangle(67, 34, 94, 6, 87, 53);
    g.fillStyle(0xc5ffff).fillEllipse(58, 51, 70, 57);
    g.fillStyle(0x455387).fillRoundedRect(27, 39, 63, 24, 10); face(g, 58, 50);
    g.fillStyle(0xffb6da).fillRoundedRect(25, 79, 68, 13, 5).fillTriangle(77, 81, 110, 98, 90, 108);
    g.fillStyle(0x536aab).fillEllipse(38, 132, 33, 15).fillEllipse(79, 132, 33, 15);
    g.lineStyle(3, 0xffffff).lineBetween(96, 70, 96, 105).lineBetween(84, 87, 108, 87);
  });
  texture('ice-vanilline', 112, 128, g => {
    g.fillStyle(0xe5faff, .8).fillEllipse(24, 64, 40, 63).fillEllipse(87, 64, 40, 63);
    g.lineStyle(2, 0x9edaf3).strokeEllipse(24, 64, 40, 63).strokeEllipse(87, 64, 40, 63);
    g.fillStyle(0xffefbd).fillCircle(56, 34, 28);
    g.fillStyle(0xb5b4f1).fillTriangle(26, 114, 56, 54, 85, 114);
    g.fillStyle(0xffe5ce).fillCircle(56, 44, 24); face(g, 56, 39);
    g.fillStyle(0xfff8d7).fillEllipse(44, 17, 40, 20);
    g.lineStyle(4, 0xffefbd).lineBetween(82, 75, 102, 49);
    g.fillStyle(0xa6ffff).fillCircle(103, 44, 7);
    g.fillStyle(0x8ec8e8).fillTriangle(37, 12, 42, 0, 50, 12).fillTriangle(56, 12, 63, 0, 69, 12);
  });
  texture('ice-snowflake', 100, 100, g => {
    g.fillStyle(0x8ceaff, .12).fillCircle(50, 50, 49);
    g.fillStyle(0xa6efff, .2).fillCircle(50, 50, 37);
    g.lineStyle(5, 0xe4ffff);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, end = new Phaser.Math.Vector2(50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36);
      g.lineBetween(50, 50, end.x, end.y);
      for (const side of [-1, 1]) {
        const b = a + side * Math.PI / 3;
        g.lineBetween(50 + Math.cos(a) * 24, 50 + Math.sin(a) * 24,
          50 + Math.cos(a) * 24 - Math.cos(b) * 12, 50 + Math.sin(a) * 24 - Math.sin(b) * 12);
      }
    }
    g.fillStyle(0x72d8ff).fillCircle(50, 50, 9);
  });
}
