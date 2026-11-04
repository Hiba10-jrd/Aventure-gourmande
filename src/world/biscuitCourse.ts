export const BISCUIT_WIDTH = 4500;
export const BISCUIT_STARS_TOTAL = 15;
export const BISCUIT_START = { x: 112, y: 510 };
export const BISCUIT_PHYSICS = { gravity: 1050, speed: 245, jump: 555 };
export const BISCUIT_GROUND = [
  { x: 345, w: 690 },
  { x: 1040, w: 510 },
  { x: 1760, w: 540 },
  { x: 2460, w: 560 },
  { x: 3210, w: 590 },
  { x: 4250, w: 500 },
] as const;
export const BISCUIT_PLATFORMS = [
  { x: 650, y: 455, w: 160 }, { x: 780, y: 403, w: 140 },
  { x: 1210, y: 450, w: 150 }, { x: 1405, y: 406, w: 150 },
  { x: 1550, y: 360, w: 145 },
  { x: 1940, y: 449, w: 160 }, { x: 2150, y: 400, w: 155 },
  { x: 2290, y: 357, w: 140 },
  { x: 2690, y: 444, w: 150 }, { x: 2910, y: 398, w: 160 },
  { x: 3080, y: 350, w: 150 },
  { x: 3440, y: 447, w: 155 }, { x: 3610, y: 398, w: 155 },
] as const;
export const BISCUIT_MOVING = [
  { x: 840, y: 440, left: 770, right: 965, speed: 58 },
  { x: 1470, y: 480, left: 1380, right: 1615, speed: 64 },
  { x: 2320, y: 463, left: 2240, right: 2430, speed: 70 },
  { x: 2960, y: 462, left: 2860, right: 3070, speed: 68 },
] as const;
export const BISCUIT_STARS = [
  [230, 440], [525, 439], [720, 362], [935, 435], [1180, 386],
  [1480, 322], [1700, 430], [1940, 381], [2150, 330], [2390, 421],
  [2670, 375], [2910, 323], [3120, 426], [3400, 378], [3690, 437],
] as const;
export const BISCUIT_RESCUES = [480, 1720, 3100] as const;
export const BISCUIT_INGREDIENTS = [
  { x: 1100, y: 440, key: 'sugar', name: 'Sucre etoile' },
  { x: 2230, y: 330, key: 'butter', name: 'Beurre dore' },
  { x: 3330, y: 430, key: 'flour', name: 'Farine magique' },
] as const;
export const BISCUIT_CHECKPOINTS = [1050, 2210, 3450] as const;
export const BISCUIT_ENEMIES = [
  { x: 360, left: 260, right: 520, kind: 'cookie' },
  { x: 1110, left: 1000, right: 1200, kind: 'caramel' },
  { x: 1650, left: 1580, right: 1860, kind: 'cookie' },
  { x: 1870, left: 1770, right: 1990, kind: 'caramel' },
  { x: 2560, left: 2410, right: 2720, kind: 'cookie' },
  { x: 3150, left: 3060, right: 3290, kind: 'caramel' },
  { x: 3470, left: 3340, right: 3520, kind: 'cookie' },
] as const;
export const BISCUIT_BRIDGE = { x: 3840, y: 535, w: 370 } as const;
export const BISCUIT_BOSS = { x: 4185, y: 505, hp: 3 } as const;
