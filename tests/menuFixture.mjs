import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
import { fixture, read } from './inputHarness.mjs';
const code=read('src/scenes/MenuScene.ts').replace(/^import[^\n]+\n/gm,'').replace('export class','class');
export function menuFixture({devMode=false,scrollX=0,renderer='webgl',topOnly=true,complete=[]}={}) {
  const Menu=new Function('Phaser','DEV_MODE',stripTypeScriptTypes(code)+';return MenuScene')({Scene:class{}},devMode);
  const f=fixture(scrollX,{renderer,topOnly}),menu=new Menu(),started=[];
  Object.assign(menu,f.scene);menu.registry=new Map(complete.map(level=>[`level${level}Complete`,true]));
  menu.scene={manager:{keys:Object.fromEntries(Array.from({length:7},(_,i)=>[`Level${i+1}Scene`,{}]))},start(key){started.push(key);}};
  return {...f,menu,started};
}
// Exercise actual hit testing and pointer event dispatch, rather than directly invoking a callback.
export function verifyMenuUnlock(level) {
  const main=read('src/main.ts');assert.match(main,new RegExp('scene:.*\\bLevel'+level+'Scene\\b'));
  for(const unlocked of [false,true]) {
    const {menu,pointer,started}=menuFixture({complete:unlocked?[level-1]:[]});menu.showLevels();
    const panel=menu.instructions,tiles=panel.list.filter(o=>o.width===380&&o.height===76);
    assert.equal(tiles.length,7);const tile=tiles[level-1];
    assert.equal(!!tile.input,level===1||unlocked);
    pointer(panel,tile.x,tile.y);
    assert.deepEqual(started,level===1||unlocked?[`Level${level}Scene`]:[]);
    assert.ok(tile.y-38>=100&&tile.y+38<535);
  }
}
