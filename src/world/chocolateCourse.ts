// Coordinates describe the TOP of every solid surface, not the sprite center.
// Same movement as level 1: apex ≈133px, flat-ground jump range ≈256px.
export const RIVER_PHYSICS = { gravity: 900, jump: 490, speed: 235 } as const;
export const RIVER_WIDTH = 3600;
export const RIVER_TOTAL = 10;
export const RIVER_SURFACE = 590;
export const START_POINT = { x: 100, y: 520 };
export const CHECKPOINT_POINT = { x: 1410, y: 520 };
export const PORTAL_POINT = { x: 3410, y: 460 };

export type RiverSurface = {
  id: string; x: number; top: number; width: number; height: number;
  kind: 'bank' | 'biscuit' | 'marshmallow' | 'moving' | 'recovery';
};

export const RIVER_SOLIDS: readonly RiverSurface[] = [
  { id:'start', x:310, top:520, width:620, height:140, kind:'bank' },
  { id:'discovery', x:340, top:400, width:170, height:28, kind:'biscuit' },
  { id:'marsh-1', x:720, top:470, width:170, height:32, kind:'marshmallow' },
  { id:'ferry', x:950, top:440, width:170, height:32, kind:'moving' },
  { id:'marsh-2', x:1190, top:450, width:180, height:32, kind:'marshmallow' },
  { id:'recovery', x:1000, top:555, width:530, height:30, kind:'recovery' },
  { id:'checkpoint-bank', x:1480, top:520, width:300, height:140, kind:'bank' },
  { id:'bridge-1', x:1750, top:470, width:170, height:28, kind:'biscuit' },
  { id:'bridge-2', x:1970, top:430, width:170, height:28, kind:'biscuit' },
  { id:'bridge-3', x:2190, top:470, width:170, height:28, kind:'biscuit' },
  { id:'last-marsh-1', x:2420, top:450, width:180, height:32, kind:'marshmallow' },
  { id:'last-marsh-2', x:2650, top:470, width:180, height:32, kind:'marshmallow' },
  { id:'finish', x:3195, top:520, width:810, height:140, kind:'bank' },
];

// Each star has a stable ID and a support. Falling never recreates collected stars.
export const RIVER_STARS = [
  { id:'s1', zone:1, support:'start', x:140, y:478 },
  { id:'s2', zone:1, support:'discovery', x:340, y:366 },
  { id:'s3', zone:2, support:'marsh-1', x:720, y:436 },
  { id:'s4', zone:2, support:'ferry', x:950, y:406 },
  { id:'s5', zone:2, support:'marsh-2', x:1190, y:416 },
  { id:'s6', zone:3, support:'bridge-1', x:1750, y:436 },
  { id:'s7', zone:3, support:'bridge-2', x:1970, y:396 },
  { id:'s8', zone:3, support:'bridge-3', x:2190, y:436 },
  { id:'s9', zone:4, support:'last-marsh-1', x:2420, y:416 },
  { id:'s10', zone:4, support:'finish', x:2940, y:478 },
] as const;

export const TRUFFINOU_PATROLS = [
  { x:500, left:440, right:565, support:'start' },
  { x:1540, left:1500, right:1580, support:'checkpoint-bank' },
] as const;

export const FERRY = { left:910, right:990, speed:24 } as const;
