import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const course = readFileSync(new URL('../src/world/biscuitCourse.ts', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../src/scenes/Level6Scene.ts', import.meta.url), 'utf8');
test('15 stars and 3 quest ingredients are defined', () => {
  const block = course.match(/BISCUIT_STARS = \[([\s\S]*?)\] as const;/)?.[1] || '';
  assert.equal([...block.matchAll(/\[\d+,\s*\d+\]/g)].length,15);
  assert.equal([...course.matchAll(/name: '(?:Sucre etoile|Beurre dore|Farine magique)'/g)].length,3);
});
test('three checkpoints and three villagers', () => {
  assert.match(course,/BISCUIT_CHECKPOINTS = \[\d+, \d+, \d+\]/);
  assert.match(course,/BISCUIT_RESCUES = \[\d+, \d+, \d+\]/);
});
test('level 6 uses dedicated PNG textures for its villagers, cookies, key and boss', () => {
  for (const texture of ['biscuit-villager', 'biscuit-enemy', 'biscuit-gold-key', 'biscuit-boss-final'])
    assert.match(scene,new RegExp(`["']${texture}["']`), texture);
  assert.match(scene,/setDisplaySize\(88, 88\)\s*\.setOrigin\(0?\.5, 0?\.86\)/);
  assert.match(scene,/const size = isCookie \? 106 : 66/);
  assert.match(scene,/setDisplaySize\(210, 210\)\s*\.setOrigin\(0?\.5, 0?\.91\)/);
  assert.match(scene,/setDisplaySize\(82,\s*82\)/);
});
test('boss uses 3 hp, bridge requires 3 ingredients, victory saves registry', () => {
  assert.match(course,/hp: 3/);
  assert.match(scene,/this\.ingredients\.size === 3/);
  assert.match(scene,/this\.registry\.set\(["']level6Complete["'], true\)/);
});
test('pause, replay, game over and double jump are present', () => {
  for(const needle of ['pauseLevel()', 'resumeLevel()', 'this.scene.restart()', 'doubleJumpAvailable', 'bossInvulnerableUntil'])
    assert.ok(scene.includes(needle), needle);
});
