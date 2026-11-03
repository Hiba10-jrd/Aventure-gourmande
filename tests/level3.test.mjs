import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const courseSource = stripTypeScriptTypes(read('src/world/mangoCourse.ts')).replace(/\bexport\s+/g, '');
const course = new Function(courseSource + `
  return { ISLAND_PHYSICS, ISLAND_WIDTH, ISLAND_TOTAL, ISLAND_START, ISLAND_CHECKPOINTS,
    ISLAND_PORTAL, ISLAND_GROUNDS, ISLAND_PLATFORMS, ISLAND_TRAMPOLINES,
    ISLAND_MOVING_PLATFORMS, ISLAND_STARS, ISLAND_ENEMIES, FRUIT_PUZZLE };
`)();

test('the four island zones contain ten supported stars and two safe checkpoints', () => {
  assert.equal(course.ISLAND_TOTAL, 10);
  assert.equal(course.ISLAND_STARS.length, 10);
  assert.equal(new Set(course.ISLAND_STARS.map(star => star.id)).size, 10);
  assert.deepEqual([1, 2, 3, 4].map(zone => course.ISLAND_STARS.filter(star => star.zone === zone).length), [2, 3, 3, 2]);
  assert.equal(course.ISLAND_CHECKPOINTS.length, 2);
  assert.deepEqual(course.ISLAND_CHECKPOINTS.map(point => point.y), [520, 520]);

  const surfaces = [
    ...course.ISLAND_GROUNDS,
    ...course.ISLAND_PLATFORMS,
    ...course.ISLAND_TRAMPOLINES.map(point => ({ ...point, width: 116 })),
    ...course.ISLAND_MOVING_PLATFORMS.map(point => ({ ...point, width: 150 })),
  ];
  for (const star of course.ISLAND_STARS) {
    const support = surfaces.find(surface => surface.id === star.support);
    assert.ok(support, `missing support ${star.support}`);
    assert.ok(star.top - 14 < support.top && star.top + 20 > support.top - 74, star.id);
    assert.ok(Math.abs(star.x - support.x) + 20 < support.width / 2, star.id);
  }
  assert.deepEqual(course.FRUIT_PUZZLE, ['mango', 'pineapple', 'coconut']);
});

test('ordinary jumps and mango boosts cover every platform transition with margin', () => {
  const physics = course.ISLAND_PHYSICS;
  const allSurfaces = [
    ...course.ISLAND_GROUNDS,
    ...course.ISLAND_PLATFORMS,
    ...course.ISLAND_TRAMPOLINES.map(point => ({ ...point, width: 116 })),
    ...course.ISLAND_MOVING_PLATFORMS.map(point => ({ ...point, width: 150 })),
  ];
  const get = id => allSurfaces.find(surface => surface.id === id);
  const canJump = (from, to, startX = from.x, endX = to.x, velocity = physics.jump) => {
    const rise = from.top - to.top;
    const discriminant = velocity ** 2 - 2 * physics.gravity * Math.max(0, rise);
    if (discriminant < 0) return false;
    const flight = (velocity + Math.sqrt(discriminant)) / physics.gravity;
    const centerDistance = Math.max(0, Math.abs(endX - startX) - from.width / 2 - to.width / 2 + 30);
    return centerDistance < physics.speed * flight;
  };

  assert.ok(canJump(get('beach'), get('beach-mango')));
  assert.ok(canJump(get('beach-mango'), get('jungle')));
  for (const [from, to] of [
    ['jungle-low', 'jungle-high'], ['jungle-high', 'jungle-return'],
    ['temple-entry', 'temple'], ['temple-low', 'temple-high'],
  ]) assert.ok(canJump(get(from), get(to)), `${from} → ${to}`);

  const moving = course.ISLAND_MOVING_PLATFORMS;
  for (const [fromRef, toRef] of [['waterfall-entry', moving[0]], [moving[0], 'waterfall-return'],
    ['waterfall-return', moving[1]], [moving[1], 'waterfall']]) {
    const from = typeof fromRef === 'string' ? get(fromRef) : fromRef;
    const to = typeof toRef === 'string' ? get(toRef) : { ...toRef, width: 150 };
    const source = from.id.startsWith('juice-platform') ? { ...from, width: 150 } : from;
    const origin = source.id.startsWith('juice-platform') ? [source.left, source.right] : [source.x, source.x];
    const destination = to.id.startsWith('juice-platform') ? [to.left, to.right] : [to.x, to.x];
    for (const startX of origin) for (const endX of destination) {
      assert.ok(canJump(source, to, startX, endX), `${source.id} → ${to.id} at ${startX}/${endX}`);
    }
  }
});

test('enemy patrols remain moderate and inside their safe ground areas', () => {
  assert.equal(course.ISLAND_ENEMIES.filter(enemy => enemy.kind === 'mango').length, 2);
  assert.equal(course.ISLAND_ENEMIES.filter(enemy => enemy.kind === 'pineapple').length, 2);
  for (const enemy of course.ISLAND_ENEMIES) {
    const ground = course.ISLAND_GROUNDS.find(surface => surface.id === enemy.support);
    assert.ok(ground);
    assert.ok(enemy.speed <= 34);
    assert.ok(enemy.left >= ground.x - ground.width / 2);
    assert.ok(enemy.right <= ground.x + ground.width / 2);
    for (const checkpoint of course.ISLAND_CHECKPOINTS) {
      const gap = checkpoint.x < enemy.left ? enemy.left - checkpoint.x
        : checkpoint.x > enemy.right ? checkpoint.x - enemy.right : 0;
      assert.ok(gap >= 90, `${enemy.kind} patrol is too close to checkpoint at ${checkpoint.x}`);
    }
  }
});

test('scene and menu retain progression, hearts, replay, and post-game menu actions', () => {
  const scene = read('src/scenes/Level3Scene.ts');
  const menu = read('src/scenes/MenuScene.ts');
  const main = read('src/main.ts');
  assert.match(main, /scene:\s*\[MenuScene,\s*Level1Scene,\s*Level2Scene,\s*Level3Scene\]/);
  assert.match(menu, /this\.registry\.get\("level2Complete"\)\s*===\s*true/);
  assert.match(menu, /this\.scene\.start\("Level3Scene"\)/);
  assert.match(scene, /this\.hearts\s*=\s*\[0,\s*1,\s*2\]/);
  assert.match(scene, /this\.immuneUntil\s*=\s*this\.clock\s*\+\s*1500/);
  assert.match(scene, /this\.registry\.set\('level3Complete',\s*true\)/);
  assert.match(scene, /this\.registry\.set\('goldenMango',\s*true\)/);
  assert.match(scene, /this\.puzzleSolved\s*&&\s*this\.rewardCollected/);
  assert.equal((scene.match(/\['REJOUER',\s*\(\)\s*=>\s*this\.scene\.restart\(\)\]/g) || []).length, 3);
  assert.equal((scene.match(/\['Menu principal',\s*\(\)\s*=>\s*this\.scene\.start\('MenuScene'\)\]/g) || []).length, 3);
});
