import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { verifyMenuUnlock } from './menuFixture.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = stripTypeScriptTypes(read('src/world/memoryCards.ts')).replace(/\bexport\s+/g, '');
const memory = new Function(source + `
  return { MEMORY_PAIR_COUNT, MEMORY_CARD_COUNT, MEMORY_ERROR_LIMIT, MEMORY_SECONDS,
    MEMORY_CHARACTERS, createMemoryDeck };
`)();

test('memory deck contains exactly twenty cards with ten distinct pairs', () => {
  const deck = memory.createMemoryDeck();
  assert.equal(memory.MEMORY_PAIR_COUNT, 10);
  assert.equal(memory.MEMORY_CARD_COUNT, 20);
  assert.equal(deck.length, 20);
  assert.equal(new Set(deck.map(card => card.id)).size, 10);
  for (const character of memory.MEMORY_CHARACTERS) {
    assert.equal(deck.filter(card => card.id === character.id).length, 2, character.id);
  }
  assert.equal(new Set(deck.map(card => card.instanceId + ':' + card.id)).size, 20);
});

test('new rounds shuffle before the ten-second observation and keep the same character assets', () => {
  const seeded = initial => {
    let value = initial;
    return () => {
      value = (value * 48271) % 2147483647;
      return value / 2147483647;
    };
  };
  const first = memory.createMemoryDeck(seeded(12));
  const second = memory.createMemoryDeck(seeded(99));
  assert.notDeepEqual(first.map(card => card.id), second.map(card => card.id));
  assert.equal(memory.MEMORY_SECONDS, 10);
  assert.ok(memory.MEMORY_CHARACTERS.every(character => character.texture));
});

test('level 4 implements the memory phases, error limit, pause and progression', () => {
  const scene = read('src/scenes/Level4Scene.ts');
  const level3 = read('src/scenes/Level3Scene.ts');
  verifyMenuUnlock(4);
  assert.match(scene, /super\('Level4Scene'\)/);
  assert.match(level3, /this\.scene\.start\('Level4Scene'\)/);
  for (const state of ['INTRO', 'MEMORIZATION', 'FLIPPING', 'PLAYING', 'COMPARING',
    'GAME_OVER', 'VICTORY', 'PAUSED']) assert.ok(scene.includes("'" + state + "'"), state);
  assert.match(scene, /delay:\s*1000,\s*repeat:\s*MEMORY_SECONDS\s*-\s*1/);
  assert.match(scene, /this\.time\.delayedCall\(500/);
  assert.match(scene, /MEMORY_ERROR_LIMIT\s*=\s*3|errors\s*>=\s*MEMORY_ERROR_LIMIT/);
  assert.match(scene, /this\.time\.paused\s*=\s*true/);
  assert.match(scene, /this\.registry\.set\('level4Complete',\s*true\)/);
  assert.match(scene, /this\.registry\.set\('memoryMedallion',\s*true\)/);
  assert.ok(scene.includes('À suivre…'));
});

test('cards use their sized automatic hit area and release the board after each flip', () => {
  const scene = read('src/scenes/Level4Scene.ts');
  assert.match(scene, /setSize\(130,\s*88\)\.setDepth\(10\)/);
  assert.match(scene, /root\.setInteractive\(\{\s*useHandCursor:\s*true\s*\}\)/);
  assert.doesNotMatch(scene, /new Phaser\.Geom\.Rectangle\(-65,\s*-44,\s*130,\s*88\)/);
  assert.equal((scene.match(/scaleX:\s*\.04,\s*duration:\s*70/g) ?? []).length, 2);
  assert.equal((scene.match(/scaleX:\s*1,\s*duration:\s*70/g) ?? []).length, 2);
  assert.match(scene, /if \(this\.selected\.length === 1\) \{\s*this\.state = 'PLAYING';\s*this\.boardLocked = false;/);
  assert.match(scene, /this\.state = 'COMPARING';\s*if \(this\.selected\[0\]\.id === this\.selected\[1\]\.id\)/);
  assert.match(scene, /this\.selected\.forEach\(card => \{\s*card\.matched = true;\s*card\.root\.disableInteractive\(\);/);
  assert.match(scene, /this\.errors\+\+;/);
  assert.match(scene, /this\.state = 'PLAYING';\s*this\.boardLocked = false;/);
});

test('memory HUD keeps its timer clear of the pause button', () => {
  const scene = read('src/scenes/Level4Scene.ts');
  assert.match(scene, /this\.timerLabel = sweetText\(this, 688, 27, 'Observe : 10', 16\)/);
  assert.match(scene, /sweetButton\(this, 846, 40, 'Pause'/);
  assert.match(scene, /this\.timerLabel\.setText\('À toi !'\)/);
});
