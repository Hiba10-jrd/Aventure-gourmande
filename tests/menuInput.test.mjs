import assert from 'node:assert/strict';
import { test } from 'node:test';
import { menuFixture, verifyMenuUnlock } from './menuFixture.mjs';
import { fixture, ui, read, strip } from './inputHarness.mjs';

test('all seven developer cards receive actual Phaser clicks in WebGL and Canvas, including with camera scroll',()=>{
  for(const renderer of ['webgl','canvas'])for(const scrollX of [0,450,2700]) {
    const {menu,pointer,started,hitTestAt}=menuFixture({devMode:true,scrollX,renderer});
    for(let level=1;level<=7;level++) {
      menu.showLevels();const panel=menu.instructions,x=230+((level-1)%2)*440,y=155+Math.floor((level-1)/2)*100;
      const tile=hitTestAt(x,y).hits[0];assert.equal(tile.type,'shape');assert.equal(tile.width,380);
      assert.equal(tile.parentContainer,panel);assert.equal(tile.scrollFactorX,0);
      pointer(panel,x,y);pointer(panel,x,y,'pointerup');
      assert.equal(started.at(-1),`Level${level}Scene`);assert.equal(started.length,level);
      assert.equal(panel.active,false);assert.equal(menu.instructions,undefined);
      assert.equal(menu.registry.get('magicFeather'),true);assert.equal(menu.registry.get('goldenBiscuitKey'),true);
      for(let i=1;i<=7;i++)assert.equal(menu.registry.has(`level${i}Complete`),false);
    }
  }
});

test('production cards respect progression, scene registration and card boundaries',()=>{
  for(let level=1;level<=7;level++)verifyMenuUnlock(level);
  const {menu,pointer,started,hitTestAt}=menuFixture({devMode:true});menu.showLevels();
  const panel=menu.instructions;
  assert.equal(hitTestAt(41,155).hits[0].width,380);assert.equal(hitTestAt(39,155).hits[0],panel.list[0]);
  delete menu.scene.manager.keys.Level7Scene;pointer(panel,230,455);assert.deepEqual(started,[]);
  assert.equal(panel.active,true);menu.scene.manager.keys.Level7Scene={};pointer(panel,230,455);
  assert.deepEqual(started,['Level7Scene']);
});

test('modal shade blocks the underlying menu; return cleans up every card; reopening is safe',()=>{
  const {menu,scene,pointer,started}=menuFixture({devMode:true,topOnly:false,scrollX:1700});
  let underlying=0;scene.add.rectangle(230,155,380,76,0xffffff).setScrollFactor(0).setInteractive().on('pointerdown',()=>underlying++);
  menu.showLevels();let panel=menu.instructions;
  pointer(panel,20,620);assert.equal(underlying,0);assert.deepEqual(started,[]);
  pointer(panel,450,575);assert.equal(panel.active,false);assert.equal(menu.instructions,undefined);
  menu.showLevels();panel=menu.instructions;pointer(panel,230,155);
  assert.deepEqual(started,['Level1Scene']);assert.equal(underlying,0,'explicit propagation stop prevents click-through');
  assert.ok(panel.list.every(o=>!o.active));
});

test('developer switch is gated by the Vite development environment',()=>{
  const code=strip(read('src/config/devMode.ts')).replaceAll('import.meta.env','env').replace(/\bexport\s+/g,'');
  const enabled=new Function('env',code+';return DEV_MODE;');
  assert.equal(enabled({DEV:true}),true);assert.equal(enabled({DEV:false}),false);
});

test('instructions close on the actual shade, without relying on child-to-container event bubbling',()=>{
  // Reproduce the previous event hierarchy: an interactive child wins the hit test,
  // so a pointerdown listener on its parent cannot close the window.
  const old=fixture();let closed=false;
  const shade=old.scene.add.rectangle(0,0,900,650).setInteractive();
  const parent=old.scene.add.container(450,325,[shade]).setSize(900,650).setInteractive();
  parent.on('pointerdown',()=>{closed=true;});old.pointer(parent,450,325);
  assert.equal(old.pointer.target,shade);assert.equal(closed,false);
  for(const renderer of ['webgl','canvas'])for(const scrollX of [0,2700]) {
    const {menu,pointer,hitTestAt}=menuFixture({scrollX,renderer});menu.scale={width:900,height:650};
    menu.showInstructions();const panel=menu.instructions;
    assert.equal(hitTestAt(450,325).hits[0],panel.list[0]);
    pointer(panel,450,325);assert.equal(menu.instructions,undefined);assert.equal(panel.active,false);
    menu.showInstructions();pointer(menu.instructions,20,620);assert.equal(menu.instructions,undefined);
  }
});

test('level 6 victory: next, menu and replay hitboxes work with paused physics and camera scroll',()=>{
  const courseCode=strip(read('src/world/biscuitCourse.ts')).replace(/\bexport\s+/g,'');
  const names=[...read('src/world/biscuitCourse.ts').matchAll(/export const (\w+)/g)].map(m=>m[1]);
  const course=new Function(courseCode+';return {'+names.join(',')+'};')();
  const sceneCode=strip(read('src/scenes/Level6Scene.ts').replace(/^import[\s\S]*?;\s*/gm,'')).replace('export class','class');
  const deps={Phaser:{Scene:class{}},...course,...ui};
  const Level6=new Function(...Object.keys(deps),sceneCode+';return Level6Scene;')(...Object.values(deps));
  for(const renderer of ['webgl','canvas'])for(const scrollX of [0,1900,3600]) {
    const {scene,pointer,objects,Object2D,hitTestAt}=fixture(scrollX,{renderer});const s=new Level6();Object.assign(s,scene);
    const calls=[];s.mode='playing';s.registry=new Map();s.player=new Object2D();
    s.physics={pause(){this.paused=true;}};s.tweens={pauseAll(){this.paused=true;}};
    s.scene={start(key){calls.push(key);},restart(){calls.push('restart');}};
    s.win();assert.equal(s.physics.paused,true);assert.equal(s.tweens.paused,true);
    const panel=s.overlay;
    for(const [index,y] of [365,425,485].entries()) {
      const hits=hitTestAt(450,y).hits;assert.equal(hits[0].width,330);assert.equal(hits[0].height,52);
      pointer(panel,450,y);pointer(panel,450,y,'pointerup');assert.equal(calls.length,index+1,'one action per click');
    }
    assert.deepEqual(calls,['Level7Scene','MenuScene','restart']);
    assert.equal(s.registry.get('level6Complete'),true);assert.equal(s.registry.get('goldenBiscuitKey'),true);
    const oldTargets=objects.filter(o=>o.input);panel.destroy();
    assert.ok(oldTargets.every(o=>!o.active&&!o.input));pointer(panel,450,365);assert.equal(calls.length,3);
  }
});
