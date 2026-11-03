// Coordinates describe the top of each walkable surface.
export const ISLAND_PHYSICS = { gravity: 900, jump: 490, trampolineJump: 560, speed: 235 } as const;
export const ISLAND_WIDTH = 3600;
export const ISLAND_TOTAL = 10;
export const ISLAND_START = { x: 90, y: 520 };
export const ISLAND_CHECKPOINTS = [
  { x: 1700, y: 520 },
  { x: 2540, y: 520 },
] as const;
export const ISLAND_PORTAL = { x: 3500, y: 460 };

export const ISLAND_GROUNDS = [
  { id: 'beach', x: 410, top: 520, width: 820, height: 130 },
  { id: 'jungle', x: 1370, top: 520, width: 820, height: 130 },
  { id: 'waterfall', x: 2240, top: 520, width: 740, height: 130 },
  { id: 'temple', x: 3225, top: 520, width: 750, height: 130 },
] as const;

export const ISLAND_PLATFORMS = [
  { id: 'jungle-low', x: 1090, top: 460, width: 150 },
  { id: 'jungle-high', x: 1300, top: 405, width: 150 },
  { id: 'jungle-return', x: 1510, top: 460, width: 150 },
  { id: 'waterfall-entry', x: 1900, top: 465, width: 150 },
  { id: 'waterfall-return', x: 2290, top: 465, width: 150 },
  { id: 'temple-entry', x: 2740, top: 470, width: 200 },
  { id: 'temple-low', x: 2980, top: 450, width: 170 },
  { id: 'temple-high', x: 3160, top: 420, width: 170 },
] as const;

export const ISLAND_TRAMPOLINES = [
  { id: 'beach-mango', x: 770, top: 500 },
] as const;

export const ISLAND_MOVING_PLATFORMS = [
  { id: 'juice-platform-1', x: 2100, top: 420, left: 2040, right: 2160, speed: 22 },
  { id: 'juice-platform-2', x: 2470, top: 410, left: 2420, right: 2520, speed: 20 },
] as const;

export const ISLAND_STARS = [
  { id: 'beach-1', zone: 1, support: 'beach', x: 240, top: 520 },
  { id: 'beach-2', zone: 1, support: 'beach-mango', x: 770, top: 500 },
  { id: 'jungle-1', zone: 2, support: 'jungle-low', x: 1090, top: 460 },
  { id: 'jungle-2', zone: 2, support: 'jungle-high', x: 1300, top: 405 },
  { id: 'jungle-3', zone: 2, support: 'jungle-return', x: 1510, top: 460 },
  { id: 'waterfall-1', zone: 3, support: 'waterfall-entry', x: 1900, top: 465 },
  { id: 'waterfall-2', zone: 3, support: 'juice-platform-1', x: 2100, top: 420 },
  { id: 'waterfall-3', zone: 3, support: 'juice-platform-2', x: 2470, top: 410 },
  { id: 'temple-1', zone: 4, support: 'temple', x: 2930, top: 520 },
  { id: 'temple-2', zone: 4, support: 'temple-high', x: 3160, top: 420 },
] as const;

export const ISLAND_ENEMIES = [
  { kind: 'mango', x: 1130, left: 1030, right: 1220, support: 'jungle', speed: 32 },
  { kind: 'pineapple', x: 1510, left: 1380, right: 1550, support: 'jungle', speed: 34 },
  { kind: 'mango', x: 2040, left: 1900, right: 2160, support: 'waterfall', speed: 30 },
  { kind: 'pineapple', x: 2350, left: 2250, right: 2440, support: 'waterfall', speed: 32 },
] as const;

export const FRUIT_PUZZLE = ['mango', 'pineapple', 'coconut'] as const;
