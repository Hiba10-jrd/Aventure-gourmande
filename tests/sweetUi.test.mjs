import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, ui, read, strip } from './inputHarness.mjs';

test('panel buttons receive clicks and hover at screen coordinates after camera scrolling',()=>{
  for(const scroll of [0,450,1410,2700]) {
    const {scene,pointer}=fixture(scroll);let replay=0,menu=0;
    const panel=ui.sweetPanel(scene,'Game Over','Trois cœurs perdus',[
      ['REJOUER',()=>replay++],['Menu principal',()=>menu++]]);
    const buttons=panel.list.filter(o=>o.listenerCount('pointerdown'));
    const bg=buttons[0].list[0];
    assert.equal(pointer(panel,450,325,'pointerover'),buttons[0],'hover, scroll='+scroll);
    assert.equal(bg.paints.at(-1),0xa077bf);
    assert.equal(pointer(panel,450,325),buttons[0],'replay, scroll='+scroll);
    assert.equal(pointer(panel,450,395),buttons[1],'menu, scroll='+scroll);
    assert.equal(replay,1);assert.equal(menu,1);
    // The shade blocks the world but never covers a button; hit areas match visible sizes.
    assert.equal(pointer(panel,12,620),panel.list[0]);
    assert.equal(pointer(panel,287,325),buttons[0]);
    assert.notEqual(pointer(panel,283,325),buttons[0]);
    assert.equal(replay,2);
  }
});

test('HUD pause and victory buttons use the same fixed-screen hit testing',()=>{
  const {scene,pointer}=fixture(2300);let paused=0,menu=0;
  const hud=scene.add.container(0,0).setScrollFactor(0);
  const pause=ui.sweetButton(scene,835,41,'Pause',()=>paused++,92);hud.add(pause);
  assert.equal(pointer(hud,835,41),pause);assert.equal(paused,1);
  const panel=ui.sweetPanel(scene,'Victoire','Bravo !',[
    ['Menu',()=>menu++],['Rejouer',()=>menu++]],'river-tablet');
  pointer(panel,450,405);pointer(panel,450,475);assert.equal(menu,2);
});

test('three-button victory panel keeps the highlighted next-level action visible and clickable',()=>{
  const {scene,pointer}=fixture(1900);const clicks=[];
  const panel=ui.sweetPanel(scene,'Victoire','Bravo !',[
    ['NIVEAU SUIVANT →',()=>clicks.push('next')],
    ['Retour au menu',()=>clicks.push('menu')],
    ['Rejouer la rivière',()=>clicks.push('replay')],
  ],'river-tablet',0xe16e98);
  const buttons=panel.list.filter(o=>o.listenerCount('pointerdown'));
  assert.equal(buttons.length,3);
  assert.deepEqual(buttons.map(button=>button.y),[365,425,485]);
  assert.ok(buttons.every(button=>button.y-26>=105&&button.y+26<=545));
  assert.ok(buttons[0].list[0].paints.includes(0xe16e98));
  [365,425,485].forEach((y,i)=>{
    assert.equal(pointer(panel,450,y),buttons[i]);
  });
  assert.deepEqual(clicks,['next','menu','replay']);
  assert.equal(buttons.every(button=>button.list.some(child=>child.input?.enabled)),true);
});

test('actual level 2 defeat callbacks stay interactive with physics and tweens paused, repeatedly',()=>{
  const courseSource=strip(read('src/world/chocolateCourse.ts')).replaceAll('export const','const');
  const course=new Function(courseSource+';return {CHECKPOINT_POINT,FERRY,PORTAL_POINT,RIVER_PHYSICS,RIVER_SOLIDS,RIVER_STARS,RIVER_SURFACE,RIVER_TOTAL,RIVER_WIDTH,START_POINT,TRUFFINOU_PATROLS};')();
  const code=read('src/scenes/Level2Scene.ts').replace(/^import[\s\S]*?;\s*/gm,'').replace('export class','class');
  const deps={Phaser:{Scene:class{}},preloadChocolateAssets(){},drawChocolateBackdrop(){},...ui,...course};
  const Scene=new Function(...Object.keys(deps),strip(code)+';return Level2Scene;')(...Object.values(deps));
  const {scene,pointer,Object2D}=fixture(1600),s=new Scene();Object.assign(s,scene);
  let replay=0,menu=0;
  s.physics={pause(){this.paused=true}};s.tweens={pauseAll(){this.paused=true}};
  s.player=new Object2D();s.scene={restart(){replay++},start(key){assert.equal(key,'MenuScene');menu++}};
  for(let i=0;i<5;i++) {
    s.lose();assert.equal(s.state,'lost');assert.equal(s.physics.paused,true);assert.equal(s.tweens.paused,true);
    const overlay=s.overlay;
    pointer(overlay,450,325);pointer(overlay,450,395);
    overlay.list.filter(o=>o.input&&o!==overlay.list[0]).forEach(o=>assert.equal(o.listenerCount('pointerdown'),1));
    overlay.destroy();pointer(overlay,450,325);assert.equal(overlay.active,false);
  }
  assert.equal(replay,5);assert.equal(menu,5);
});

test('level 2 victory starts the registered level 3 and preserves progression',()=>{
  const courseSource=strip(read('src/world/chocolateCourse.ts')).replaceAll('export const','const');
  const course=new Function(courseSource+';return {CHECKPOINT_POINT,FERRY,PORTAL_POINT,RIVER_PHYSICS,RIVER_SOLIDS,RIVER_STARS,RIVER_SURFACE,RIVER_TOTAL,RIVER_WIDTH,START_POINT,TRUFFINOU_PATROLS};')();
  const code=read('src/scenes/Level2Scene.ts').replace(/^import[\s\S]*?;\s*/gm,'').replace('export class','class');
  const deps={Phaser:{Scene:class{}},preloadChocolateAssets(){},drawChocolateBackdrop(){},...ui,...course};
  const Scene=new Function(...Object.keys(deps),strip(code)+';return Level2Scene;')(...Object.values(deps));
  const {scene,pointer}=fixture(),s=new Scene();Object.assign(s,scene);
  const started=[];const values={};
  s.physics={pause(){this.paused=true}};s.tweens={pauseAll(){this.paused=true},add(){}};
  s.player=new (fixture().Object2D)();s.tablet=new (fixture().Object2D)();
  s.burst=()=>{};
  s.registry={set(key,value){values[key]=value},get(key){return values[key]}};
  let restarts=0;
  s.scene={manager:{keys:{Level3Scene:{scene:{key:'Level3Scene'}}}},start(key){started.push(key)},restart(){restarts++}};
  s.win();
  assert.equal(s.state,'won');assert.equal(s.physics.paused,true);
  assert.equal(values.level2Complete,true);assert.equal(values.magicChocolateTablet,true);
  assert.deepEqual(s.overlay.list.filter(o=>o.listenerCount('pointerdown')).map(o=>o.list[1].text),
    ['NIVEAU SUIVANT →','Retour au menu','Rejouer la rivière']);

  values.level2Complete=false;
  pointer(s.overlay,450,365);
  assert.deepEqual(started,[]);
  values.level2Complete=true;
  delete s.scene.manager.keys.Level3Scene;
  pointer(s.overlay,450,365);
  assert.deepEqual(started,[]);
  s.scene.manager.keys.Level3Scene={scene:{key:'Level3Scene'}};
  const completedPanel=s.overlay;
  pointer(s.overlay,450,365);
  assert.deepEqual(started,['Level3Scene']);
  assert.equal(completedPanel.active,false);
  assert.equal(s.overlay,undefined);
  assert.equal(values.magicChocolateTablet,true);

  s.win();
  pointer(s.overlay,450,425);
  assert.equal(started.at(-1),'MenuScene');
  s.win();
  pointer(s.overlay,450,485);
  assert.equal(restarts,1);
});

test('level 1 modal buttons remain clickable with its non-scrolling camera',()=>{
  const code=read('src/scenes/Level1Scene.ts').trimStart().replace(/^import[^\n]+\n/gm,'').replace('export class','class');
  const Scene=new Function('Phaser',strip(code)+';return Level1Scene;')({Scene:class{}});
  const {scene,pointer}=fixture(),s=new Scene();Object.assign(s,scene);
  let replay=0,menu=0;
  s.showPanel('Défaite','On réessaie ?', [['REJOUER',()=>replay++],['Menu principal',()=>menu++]]);
  pointer(s.overlay,450,310);pointer(s.overlay,450,385);
  assert.equal(replay,1);assert.equal(menu,1);
});
