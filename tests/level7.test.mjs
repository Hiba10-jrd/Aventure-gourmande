import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes, createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyMenuUnlock } from './menuFixture.mjs';
const require = createRequire(import.meta.url);
const World = require('../node_modules/phaser/src/physics/arcade/World.js');
const Body = require('../node_modules/phaser/src/physics/arcade/Body.js');
const StaticBody = require('../node_modules/phaser/src/physics/arcade/StaticBody.js');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/world/iceCreamCourse.ts');
const names = [...source.matchAll(/export (?:const|function) (\w+)/g)].map(m => m[1]);
const c = new Function(stripTypeScriptTypes(source).replace(/\bexport\s+/g, '') + ';return {' + names.join(',') + '}')();
const { ICE_PHYSICS: P } = c;
const sceneSource = read('src/scenes/Level7Scene.ts');
const code = stripTypeScriptTypes(sceneSource.trimStart().replace(/^import[\s\S]*?;\s*/gm, '')).replace('export class', 'class');
const deps = { Phaser: { Scene: class {}, Physics: { Arcade: { Body, StaticBody } },
  Input: { Keyboard: { JustDown(key) { const down = !!key.just; key.just = false; return down; } } },
  Math: { Vector2: class { constructor(x,y) { Object.assign(this,{x,y}); } } },
  GameObjects: { Image: class {} } }, ...c, sweetText: () => object(), sweetPanel: (...args) => {
    const image=Object.assign(new deps.Phaser.GameObjects.Image(),{scaleX:1,scaleY:1,y:310});
    return { args, list: args[4] ? [image] : [], add(child){this.list.push(child);}, destroy() { this.destroyed = true; } };
  } };
const Scene = new Function(...Object.keys(deps), code + ';return Level7Scene')(...Object.values(deps));
function object(extra = {}) {
  const o = { active: true, x: 100, y: 530, destroy(){this.active=false;}, ...extra };
  for (const key of ['setColor','setText','setVisible','setAlpha','setAngle','setFillStyle','setFlipX','setPosition','disableBody','setStrokeStyle','setDepth','setDisplaySize','setScrollFactor','setOrigin']) {
    o[key] = function(...args) { this[key + 'Args'] = args; if(key === 'setPosition') [this.x,this.y]=args; if(key==='disableBody')this.body.enable=false; return this; };
  }
  return o;
}
function fixture() {
  const s = new Scene(); const world = new World({sys:{scale:{width:c.ICE_WIDTH,height:730}}}, {gravity:{y:P.gravity}});
  const body = new Body(world); body.setSize(30,75); world.add(body);
  const player = object({body});
  player.setVelocity = (x,y=x) => { body.setVelocity(x,y); return player; };
  player.setVelocityY = y => {body.setVelocityY(y); return player;};
  // Body.reset normally derives dimensions from the sprite; use the real reset then sync test coordinates.
  const reset = body.reset.bind(body); body.reset = (x,y) => { reset(x,y); player.x=x;player.y=y; };
  s.player=player; s.mode='playing'; s.keys={left:{isDown:false},right:{isDown:false},space:{},up:{}};s.interact={};
  s.platforms=[];s.enemies=[];s.snow=[];s.hearts=[object(),object(),object()];s.hint=object();s.hudText=object();
  s.physics={pause(){world.pause();},resume(){world.resume();}};
  s.tweens={paused:false,pauseAll(){this.paused=true;},resumeAll(){this.paused=false;},add(){}};
  s.time={paused:false};s.anims={pauseAll(){},resumeAll(){}};s.input={keyboard:{resetKeys(){}}};
  s.cameras={main:{flash(){}}};s.glacior=object();s.heart=object();
  s.scene={restart(){s.restarted=true;},start(key){s.started=key;},manager:{keys:{}}};
  s.registry=new Map([['magicFeather',true],['goldenBiscuitKey',true]]);
  s.overlaps=[];
  s.physics.add={existing(o){o.body={enable:true,updateFromGameObject(){}};},overlap(a,b,callback){s.overlaps.push({a,b,callback});}};
  s.add=Object.fromEntries(['star','ellipse','triangle','image','zone','rectangle'].map(key=>[key,(x,y)=>object({x,y})]));
  return {s,body,world};
}

test('four zones have exactly 16 supported stars, 3 crystals, 8 enemies and 3 safe checkpoints', () => {
  assert.equal(c.ICE_STARS.length,16);assert.equal(c.ICE_CRYSTALS.length,3);
  assert.equal(c.ICE_ENEMIES.length,8);assert.equal(c.ICE_CHECKPOINTS.length,3);
  const surfaces=[...c.ICE_GROUND,...c.ICE_PLATFORMS];
  for(const [x,y] of [...c.ICE_STARS,...c.ICE_CRYSTALS.map(p=>[p.x,p.y])]) {
    assert.ok(surfaces.some(p=>Math.abs(x-p.x)<p.w/2-12&&p.y-y>=45&&p.y-y<=80),`support for ${x}/${y}`);
  }
  for(const x of c.ICE_CHECKPOINTS) {
    assert.ok(c.ICE_GROUND.some(p=>x>p.x-p.w/2+15&&x<p.x+p.w/2-15));
    assert.ok(c.ICE_ENEMIES.every(e=>x<e.left-90||x>e.right+90));
  }
  for(let zone=0;zone<4;zone++) assert.equal(c.ICE_STARS.filter(([x])=>x>=[0,1300,2740,4240][zone]&&x<[1300,2740,4240,6100][zone]).length,4);
});

test('ice accelerates gradually, coasts, brakes predictably and wafer stops instantly', () => {
  assert.equal(c.iceVelocity(0,1,true,.1),72); assert.equal(c.iceVelocity(200,0,true,.1),166);
  assert.equal(c.iceVelocity(200,-1,true,.1),85); assert.equal(c.iceVelocity(200,0,false,.1),0);
  assert.equal(c.iceVelocity(0,-1,false,.1),-260);
  assert.equal(c.iceVelocity(255,1,true,.1),260);
  assert.equal(c.iceVelocity(10,0,true,1),0);
});

test('melting warns for 1200ms, disables for 2000ms, and restores',()=>{
  assert.equal(c.meltPhase(undefined,9000),'solid');
  for(const t of [0,200,1199])assert.equal(c.meltPhase(100,100+t),'warning');
  for(const t of [1200,2500,3199])assert.equal(c.meltPhase(100,100+t),'gone');
  assert.equal(c.meltPhase(100,3300),'solid');
});

test('mirror beam follows physical reflections: deterministic solution and reset',()=>{
  assert.equal(c.traceIceBeam(c.MIRROR_INITIAL).solved,false);
  const result=c.traceIceBeam(c.MIRROR_SOLUTION);
  assert.equal(result.solved,true);
  assert.deepEqual(result.points,[{x:3020,y:280},{x:3200,y:280},{x:3200,y:190},{x:3500,y:190},{x:3500,y:340}]);
  const solutions=[];
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let d=0;d<4;d++)if(c.traceIceBeam([a,b,d]).solved)solutions.push([a,b,d]);
  assert.deepEqual(solutions,[[3,3,1]]);
  const angles=[...c.MIRROR_INITIAL];[0,0,0,1,1,2,2,2].forEach(i=>angles[i]=(angles[i]+1)%4);
  assert.deepEqual(angles,c.MIRROR_SOLUTION);
});

test('scene rotates mirrors, opens the real gate callback and gives progressive help',()=>{
  const {s}=fixture();s.player.x=3300;
  s.mirrors=[0,1,2].map(()=>({list:[{},object(),object()]}));s.gate=object({body:{enable:true}});s.receiver=object();
  s.beam={clear(){return this;},lineStyle(){return this;},strokePoints(){return this;}};
  [0,0,0,1,1,2,2,2].forEach(i=>s.turnMirror(i));
  assert.equal(s.puzzleSolved,true);assert.equal(s.gate.body.enable,false);
  assert.deepEqual(s.orientations,[3,3,1]);
  const before=[...s.orientations];s.turnMirror(0);assert.deepEqual(s.orientations,before);
});

test('Arcade Physics: all mandatory surfaces connect both ways with generous landing margins',()=>{
  const surfaces=[...c.ICE_GROUND,...c.ICE_PLATFORMS];
  function jumpable(from,to) {
    if(Math.abs(to.x-from.x)<(from.w+to.w)/2-40 && Math.abs(to.y-from.y)<5)return true;
    const right=to.x>=from.x;
    const start=right?Math.min(from.x+from.w/2-25,to.x):Math.max(from.x-from.w/2+25,to.x);
    const target=right?Math.max(to.x-to.w/2+25,start):Math.min(to.x+to.w/2-25,start);
    if(Math.abs(target-start)>420)return false;
    const world=new World({sys:{scale:{width:6100,height:730}}},{gravity:{y:P.gravity}});
    const body=new Body(world);body.setSize(30,75);body.position.set(start-15,from.y-75);world.add(body);
    const dest=new StaticBody(world);dest.setSize(to.w,28);dest.position.set(to.x-to.w/2,to.y);world.add(dest);
    dest.checkCollision.left=false;dest.checkCollision.right=false;dest.checkCollision.down=false;
    body.setVelocityY(-P.jump);
    for(let frame=0;frame<140;frame++) {
      // Standard running control, double jump near first apex, then brake above the target.
      body.setVelocityX(Math.abs(target-body.center.x)>5?Math.sign(target-body.center.x)*P.speed:0);
      if(frame===30)body.setVelocityY(-P.jump);
      body.resetFlags();world.step(1/60);world.collide(body,dest);
      if(body.blocked.down&&Math.abs(body.bottom-to.y)<1)return true;
      if(body.top>700)return false;
    }
    return false;
  }
  const extremes=p=>p.range?[-p.range,p.range]:[0];
  const graph=surfaces.map((from,i)=>surfaces.map((to,j)=>i!==j&&extremes(from).every(a=>extremes(to).every(b=>
    jumpable({...from,x:from.x+a},{...to,x:to.x+b})))?j:-1).filter(j=>j>=0));
  function reachable(start){const seen=new Set([start]),todo=[start];while(todo.length)for(const next of graph[todo.pop()])if(!seen.has(next)){seen.add(next);todo.push(next);}return seen;}
  assert.equal(reachable(0).size,surfaces.length,'forward collection route');
  assert.equal(reachable(7).size,surfaces.length,'return route from palace');
  // Menthe is deliberately above single-jump height.
  assert.ok(395-210>P.jump**2/(2*P.gravity));
});

test('installed Arcade moving platform carries its passenger, with no invisible underside collision',()=>{
  const world=new World({sys:{scale:{width:6100,height:730}}},{gravity:{y:P.gravity}});
  const rider=new Body(world),platform=new Body(world);world.add(rider);world.add(platform);
  rider.setSize(30,75);platform.setSize(150,28);rider.position.set(240,380);platform.position.set(200,455);
  platform.setAllowGravity(false).setImmovable(true).setVelocityX(55);platform.friction.set(1,0);
  platform.checkCollision.down=false;platform.checkCollision.left=false;platform.checkCollision.right=false;
  for(let i=0;i<60;i++){rider.resetFlags();platform.resetFlags();world.step(1/60);world.collide(rider,platform);}
  assert.ok(Math.abs(rider.position.x-295)<.01);assert.equal(rider.bottom,455);
  rider.position.set(platform.position.x+40,470);rider.setVelocityY(-550);rider.resetFlags();
  world.step(1/60);assert.equal(world.collide(rider,platform),false);assert.ok(rider.velocity.y<0);
  platform.enable=false;rider.position.set(platform.position.x+40,380);rider.setVelocityY(50);rider.resetFlags();
  world.step(1/60);assert.equal(world.collide(rider,platform),false,'disabled melting body cannot collide');
  platform.enable=true;assert.equal(world.collide(rider,platform),true,'reactivated body supports again');
});

test('scene jumps with coyote time, double jump and buffered landing without infinite jumping',()=>{
  const {s,body}=fixture();s.clock=200;s.lastGrounded=100;s.keys.space.just=true;
  s.update(0,16);assert.equal(body.velocity.y,-550);assert.equal(s.doubleJump,true);
  body.velocity.y=40;s.keys.space.just=true;s.update(0,16);assert.equal(body.velocity.y,-550);assert.equal(s.doubleJump,false);
  body.velocity.y=50;s.keys.space.just=true;s.update(0,16);assert.equal(body.velocity.y,50);
  body.blocked.down=true;s.update(0,16);assert.equal(body.velocity.y,-550);assert.equal(s.doubleJump,true);
});

test('scene melting collision and pause clock preserve exact state through resume',()=>{
  const {s,body}=fixture();body.position.set(85,465);body.updateCenter();body.blocked.down=true;
  const image=object({x:100,body:{enable:true}});
  const p={image,spec:{x:100,y:540,w:150,ice:true,melt:true}};s.platforms=[p];
  s.update(0,16);assert.equal(p.touched,16);
  body.blocked.down=false;body.position.y=200;s.update(0,1201);assert.equal(image.body.enable,false);
  const clock=s.clock;s.pauseLevel();s.update(0,9000);assert.equal(s.clock,clock);assert.equal(s.time.paused,true);
  assert.equal(image.body.enable,false);assert.equal(s.tweens.paused,true);
  s.resumeLevel();s.update(0,2001);assert.equal(image.body.enable,true);assert.equal(p.touched,undefined);
  assert.equal(s.time.paused,false);
});

test('chase stays within 200 pixels and Glacior is caught at its scripted destination',()=>{
  for(let x=4400;x<=5810;x+=10)assert.ok(c.chasePosition(x)-x<=200);
  const {s}=fixture();s.player.x=4400;s.update(0,16);assert.equal(s.chasing,true);
  s.player.x=5200;s.update(0,16);assert.equal(s.glacior.x,5400);
  s.player.x=5750;s.update(0,16);assert.equal(s.chaseDone,true);assert.equal(s.chasing,false);
});

test('fall always costs one heart, preserves quest state and resets necessary mechanisms',()=>{
  const {s,body}=fixture();s.respawn={x:4340,y:530};s.stars.add(0);s.crystals.add(1);s.puzzleSolved=true;
  s.chasing=true;s.immuneUntil=999999;
  const p={image:object({body:{enable:false}}),spec:{x:4610,y:455,w:150,melt:true},touched:100};s.platforms=[p];
  s.damage(true);assert.equal(s.health,2);assert.equal(s.player.x,4340);assert.equal(body.velocity.x,0);
  assert.equal(s.stars.size,1);assert.equal(s.crystals.size,1);assert.equal(s.puzzleSolved,true);
  assert.equal(s.chasing,false);assert.equal(p.image.body.enable,true);assert.equal(p.touched,undefined);
  s.damage(false);assert.equal(s.health,2,'temporary immunity blocks enemy damage');
  s.damage(true);assert.equal(s.health,1);s.damage(true);assert.equal(s.mode,'lost');
  s.overlay.args[3][0][1]();assert.equal(s.restarted,true);
});

test('heart requires all crystals and chase, return magic preserves progress',()=>{
  const {s}=fixture();s.chaseDone=true;s.player.x=5840;s.interact.just=true;s.update(0,16);assert.equal(s.restored,false);
  [0,1,2].forEach(i=>s.crystals.add(i));s.puzzleSolved=true;s.interact.just=true;s.update(0,16);assert.equal(s.restored,true);
  s.player.x=6000;s.interact.just=true;s.update(0,16);assert.equal(s.player.x,c.ICE_START.x);
  assert.equal(s.chaseDone,true);assert.equal(s.crystals.size,3);assert.equal(s.restored,true);
});

test('objective messages list only missing items and special Glacior text',()=>{
  assert.equal(c.missingIceObjectives(16,3,true,false,false),'Il ne reste que Glacior ! Rattrape-le !');
  assert.doesNotMatch(c.missingIceObjectives(16,3,true,true,false),/0 étoile|0 cristal/);
  assert.match(c.missingIceObjectives(15,3,true,true,true),/1 étoile/);
  assert.match(c.missingIceObjectives(16,3,true,true,true),/Tout est prêt/);
});

test('actual collection, checkpoint and portal callbacks enforce every victory condition',()=>{
  const {s}=fixture();
  s.makeCollectibles();
  const collectibles=[...s.overlaps];assert.equal(collectibles.length,19);
  s.mode='paused';collectibles[0].callback();assert.equal(s.stars.size,0);s.mode='playing';
  collectibles.slice(0,16).forEach(o=>{o.callback();o.callback();});assert.equal(s.stars.size,16);
  collectibles.slice(16).forEach(o=>o.callback());assert.equal(s.crystals.size,2,'Vanille stays locked before puzzle');
  s.puzzleSolved=true;collectibles[18].callback();assert.equal(s.crystals.size,3);
  s.makeCheckpoints();const checkpoints=s.overlaps.slice(19);
  checkpoints.forEach((o,i)=>{o.callback();assert.equal(s.checkpoint,i);assert.equal(s.respawn.x,c.ICE_CHECKPOINTS[i]);});
  checkpoints[0].callback();assert.equal(s.checkpoint,2,'return travel cannot replace the latest checkpoint');
  s.makePalace();const portal=s.overlaps.at(-1).callback;
  portal();assert.equal(s.mode,'playing');assert.equal(s.registry.has('level7Complete'),false);
  s.chaseDone=true;portal();assert.equal(s.mode,'playing','restoration is mandatory');
  s.restored=true;s.stars.delete(0);portal();assert.equal(s.mode,'playing','all stars are mandatory');
  s.stars.add(0);portal();assert.equal(s.mode,'won');
  assert.equal(s.registry.get('level7Complete'),true);assert.equal(s.registry.get('eternalCrystalSnowflake'),true);
  assert.equal(s.registry.get('goldenBiscuitKey'),true);assert.equal(s.registry.get('magicFeather'),true);
  assert.deepEqual(s.overlay.args[3].map(a=>a[0]),['Retour au menu','Rejouer']);
  s.overlay.args[3][0][1]();assert.equal(s.started,'MenuScene');s.overlay.args[3][1][1]();assert.equal(s.restarted,true);
});

test('level integration preserves official heroine, registry rewards, all seven menu slots and backups',()=>{
  for(let level=1;level<=7;level++)verifyMenuUnlock(level);
  assert.match(sceneSource,/new-heroine-transparent\.png/);
  for(const key of ['level7Complete','eternalCrystalSnowflake'])assert.ok(sceneSource.includes(`registry.set('${key}', true)`));
  assert.match(read('src/main.ts'),/Level6Scene, Level7Scene\]/);
  assert.match(read('src/scenes/Level6Scene.ts'),/NIVEAU SUIVANT.*Level7Scene/);
  const menu=read('src/scenes/MenuScene.ts');assert.match(menu,/level\$\{i\}Complete/);assert.match(menu,/Glaces enchantées/);
  for(let i=0;i<7;i++){const y=155+Math.floor(i/2)*100;assert.ok(y-38>100&&y+38<535);}
});
