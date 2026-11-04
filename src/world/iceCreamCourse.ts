export const ICE_WIDTH = 6100;
export const ICE_START = { x: 100, y: 530 };
export const ICE_PHYSICS = { gravity: 1050, speed: 260, jump: 550, acceleration: 720, brake: 1150, drag: 340, coyote: 130, buffer: 140 };
export type IcePlatform = { x: number; y: number; w: number; ice?: boolean; melt?: boolean; range?: number };
// All y coordinates denote the top surface. Wide permanent islands permit backtracking.
export const ICE_GROUND: IcePlatform[] = [
  { x: 650, y: 540, w: 1300, ice: true },
  { x: 1470, y: 540, w: 200 }, { x: 1950, y: 540, w: 180 },
  { x: 2580, y: 540, w: 280 },
  { x: 3480, y: 540, w: 1520, ice: true },
  { x: 4360, y: 540, w: 240 },
  { x: 4930, y: 540, w: 180, ice: true },
  { x: 5700, y: 540, w: 800, ice: true },
];
export const ICE_PLATFORMS: IcePlatform[] = [
  { x: 430, y: 435, w: 160 }, { x: 680, y: 365, w: 150, ice: true },
  { x: 970, y: 430, w: 175 },
  { x: 1650, y: 455, w: 150, range: 45, ice: true },
  { x: 1800, y: 365, w: 130, melt: true, ice: true },
  { x: 2120, y: 455, w: 160, melt: true, ice: true },
  { x: 2300, y: 395, w: 155, range: 45, ice: true },
  { x: 2460, y: 210, w: 150, ice: true },
  { x: 2880, y: 435, w: 150, ice: true },
  { x: 3160, y: 395, w: 150 }, { x: 3660, y: 425, w: 170, ice: true },
  { x: 4610, y: 455, w: 150, melt: true, ice: true },
  { x: 4780, y: 385, w: 150, range: 35, ice: true },
  { x: 5120, y: 455, w: 150, melt: true, ice: true },
  { x: 5300, y: 395, w: 160, range: 40, ice: true },
];
export const ICE_STARS = [
  [230, 475], [430, 380], [680, 310], [970, 375],
  [1470, 475], [1800, 310], [2120, 400], [2300, 340],
  [2880, 380], [3160, 340], [3440, 475], [3660, 370],
  [4360, 475], [4780, 330], [5120, 400], [5500, 475],
] as const;
export const ICE_CRYSTALS = [
  { x: 1160, y: 470, name: 'Fraise', color: 0xff95c2 },
  { x: 2460, y: 155, name: 'Menthe', color: 0x80f3d4 },
  { x: 4050, y: 470, name: 'Vanille', color: 0xffefbd },
] as const;
export const ICE_CHECKPOINTS = [1400, 2800, 4340] as const;
export const ICE_ENEMIES = [
  { x: 530, left: 470, right: 590 }, { x: 1060, left: 1000, right: 1120 },
  { x: 1530, left: 1510, right: 1540 }, { x: 1940, left: 1910, right: 1990 },
  { x: 3000, left: 2950, right: 3050 }, { x: 3730, left: 3680, right: 3780 },
  { x: 4940, left: 4900, right: 4970 }, { x: 5550, left: 5500, right: 5640 },
] as const;
export const ICE_MIRRORS = [{ x: 3200, y: 280 }, { x: 3200, y: 190 }, { x: 3500, y: 190 }] as const;
export const MIRROR_INITIAL = [0, 1, 2];
export const MIRROR_SOLUTION = [3, 3, 1];
export const ICE_RECEIVER = { x: 3500, y: 340 };
export type BeamPoint = { x: number; y: number };
// Trace an axis-aligned light ray, reflecting on the actual orientation at each mirror.
export function traceIceBeam(orientations: readonly number[]): { points: BeamPoint[]; solved: boolean } {
  const points: BeamPoint[] = [{ x: 3020, y: 280 }];
  let dx = 1, dy = 0, previous = -1;
  for (let bounce = 0; bounce < 9; bounce++) {
    const from = points[points.length - 1];
    const candidates = [...ICE_MIRRORS, ICE_RECEIVER].map((p, i) => ({ ...p, i,
      distance: (p.x - from.x) * dx + (p.y - from.y) * dy,
      cross: Math.abs((p.x - from.x) * dy - (p.y - from.y) * dx),
    })).filter(p => p.i !== previous && p.distance > .01 && p.cross < .01).sort((a, b) => a.distance - b.distance);
    const hit = candidates[0];
    if (!hit) { points.push({ x: from.x + dx * 440, y: from.y + dy * 150 }); return { points, solved: false }; }
    points.push({ x: hit.x, y: hit.y });
    if (hit.i === 3) return { points, solved: true };
    const angle = orientations[hit.i] * Math.PI / 2;
    const nextX = Math.round(Math.cos(angle) * dx + Math.sin(angle) * dy);
    dy = Math.round(Math.sin(angle) * dx - Math.cos(angle) * dy); dx = nextX; previous = hit.i;
  }
  return { points, solved: false };
}
export function iceVelocity(v: number, direction: number, slippery: boolean, seconds: number): number {
  if (!slippery) return direction * ICE_PHYSICS.speed;
  const rate = direction === 0 ? ICE_PHYSICS.drag : v * direction < 0 ? ICE_PHYSICS.brake : ICE_PHYSICS.acceleration;
  const target = direction * ICE_PHYSICS.speed;
  return v + Math.sign(target - v) * Math.min(Math.abs(target - v), rate * seconds);
}
export function meltPhase(start: number | undefined, now: number): 'solid' | 'warning' | 'gone' {
  if (start === undefined || now - start >= 3200) return 'solid';
  return now - start < 1200 ? 'warning' : 'gone';
}
export function chasePosition(playerX: number): number { return Math.min(5810, Math.max(4520, playerX + 200)); }
export function missingIceObjectives(stars: number, crystals: number, puzzle: boolean, chase: boolean, restored: boolean): string {
  if (stars === 16 && crystals === 3 && puzzle && !chase) return 'Il ne reste que Glacior ! Rattrape-le !';
  const tasks: string[] = [];
  if (stars < 16) tasks.push(`${16 - stars} étoile(s)`);
  if (crystals < 3) tasks.push(`${3 - crystals} cristal(aux)`);
  if (!puzzle) tasks.push('les trois miroirs');
  if (!chase) tasks.push('rattraper Glacior');
  if (!restored) tasks.push('restaurer le Cœur (E près du socle)');
  return tasks.length ? 'Il reste : ' + tasks.join(' · ') : 'Tout est prêt ! Entre dans le portail !';
}
