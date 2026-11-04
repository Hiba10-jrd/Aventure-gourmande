import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { verifyMenuUnlock } from './menuFixture.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const course=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(read('src/world/chocolateCourse.ts'))).toString('base64'));
const require=createRequire(import.meta.url);
// Real installed Arcade code can run without the renderer for the separation test.
const Body=require('../node_modules/phaser/src/physics/arcade/Body.js');
const SeparateY=require('../node_modules/phaser/src/physics/arcade/SeparateY.js');

function fixture() {
  const sizes={ 'sweet-hero':[1122,1402], 'river-truffinou':[1292,1218],
    'river-croustille':[1226,1283], 'sweet-star':[40,40], 'sweet-platform':[170,28],
    'river-marshmallow':[180,32], 'river-tablet':[96,112] };
  const objects=[],groups=[],colliders=[],overlaps=[],tweens=[],restarts=[];
  function object(x=0,y=0,width=0,height=0) {
    const o={x,y,width,height,scaleX:1,scaleY:1,originX:.5,originY:.5,active:true,alpha:1,
      children:[],data:{},events:{},depth:0};
    const body={offset:{x:0,y:0},velocity:{x:0,y:0},blocked:{down:false},touching:{down:false},
      checkCollision:{up:true,down:true,left:true,right:true},bottom:y,
      setSize(w,h){this.sourceWidth=w;this.sourceHeight=h;return this},
      setOffset(x,y){this.offset={x,y};return this},
      setVelocityX(x){this.velocity.x=x;return this},setVelocityY(y){this.velocity.y=y;return this},
      setAllowGravity(v){this.allowGravity=v;return this},
      reset(x,y){o.x=x;o.y=y;this.bottom=y;this.velocity={x:0,y:0}},
    };
    o.body=body;
    const methods={
      setOrigin(x,y=x){o.originX=x;o.originY=y},setScale(x,y=x){o.scaleX=x;o.scaleY=y},
      setDisplaySize(w,h){o.scaleX=w/width;o.scaleY=h/height},setDepth(v){o.depth=v},
      setAlpha(v){o.alpha=v},setData(k,v){o.data[k]=v},getData(k){return o.data[k]},
      setText(v){o.text=v},setVelocity(x,y=0){body.velocity={x,y}},setVelocityX(x){body.velocity.x=x},
      setImmovable(v){body.immovable=v},setFriction(x,y){body.friction={x,y}},
      setGravityY(v){body.gravityY=v},setCollideWorldBounds(v){body.collideWorldBounds=v},
      destroy(){o.active=false},on(k,fn){o.events[k]=fn},add(v){o.children.push(...(Array.isArray(v)?v:[v]))},
      setScrollFactor(v){o.scrollFactor=v},setFillStyle(v){o.fill=v},
    };
    const chain=['setColor','setWordWrapWidth','setAlign','setBackgroundColor','setPadding',
      'setInteractive','setSize','setFlipX','refreshBody','fillStyle','fillRect','fillRoundedRect',
      'lineStyle','strokeRoundedRect','clear','setBounds','startFollow','setDeadzone','stopFollow','centerOn'];
    chain.forEach(name=>methods[name]=()=>{});
    const proxy=new Proxy(o,{get(t,k){
      if(k in methods) return(...args)=>{const v=methods[k](...args);return v===undefined?proxy:v};
      return t[k];
    }});
    objects.push(proxy);return proxy;
  }
  const sprite=(x,y,key)=>{const o=object(x,y,...sizes[key]);o.key=key;return o};
  const text=(x,y,value)=>{const o=object(x,y);o.text=value;return o};
  const panel=(_scene,title,detail,actions,icon)=>{
    const o=object();Object.assign(o,{title,detail,actions,icon});return o;
  };
  const fakePhaser={Scene:class{},Core:{Events:{BLUR:'blur'}},Scenes:{Events:{SHUTDOWN:'shutdown'}},
    Input:{Keyboard:{JustDown:()=>false}}};
  const source=read('src/scenes/Level2Scene.ts').replace(/^import[\s\S]*?;\s*/gm,'').replace('export class','class');
  const names=['Phaser','preloadChocolateAssets','drawChocolateBackdrop','sweetButton','sweetCard','sweetPanel','sweetText',...Object.keys(course)];
  const Scene=new Function(...names,stripTypeScriptTypes(source)+';return Level2Scene;')(
    fakePhaser,()=>{},()=>{},()=>object(),()=>object(),panel,(_s,x,y,t)=>text(x,y,t),...Object.values(course));
  const s=new Scene();
  s.add={zone:object,image:sprite,ellipse:object,rectangle:object,triangle:object,star:object,
    graphics:()=>object(),container:(x,y,children=[])=>{const o=object(x,y);o.children=children;return o}};
  s.physics={paused:false,resume(){this.paused=false},pause(){this.paused=true},world:{setBounds(){}},add:{
    staticGroup(){const g={children:[],create(x,y,k){const o=sprite(x,y,k);this.children.push(o);return o},add(o){this.children.push(o)}};groups.push(g);return g},
    sprite,image:sprite,existing(){},collider(...args){colliders.push(args)},overlap(...args){overlaps.push(args)},
  }};
  s.tweens={resumeAll(){},pauseAll(){},killTweensOf(){},add(c){tweens.push(c)}};
  s.input={keyboard:{createCursorKeys:()=>({right:{isDown:false},left:{isDown:false},space:{},up:{}}),on(){},off(){},resetKeys(){}}};
  s.game={events:{on(){},off(){}}};s.events={once(){}};s.cameras={main:object()};
  s.scene={restart:()=>restarts.push(true),start:()=>{}};
  s.registry={set(k,v){this[k]=v}};
  s.create();
  return {s,objects,groups,colliders,overlaps,tweens,restarts};
}

test('four zones have 2–3–3–2 unique reachable stars and safe respawns',()=>{
  assert.equal(course.RIVER_STARS.length,10);
  assert.equal(new Set(course.RIVER_STARS.map(p=>p.id)).size,10);
  assert.deepEqual([1,2,3,4].map(zone=>course.RIVER_STARS.filter(p=>p.zone===zone).length),[2,3,3,2]);
  for(const star of course.RIVER_STARS) {
    const support=course.RIVER_SOLIDS.find(p=>p.id===star.support);
    assert.ok(support);
    assert.ok(star.y+20<support.top);
    assert.ok(star.y+20>support.top-74);
    assert.ok(Math.abs(star.x-support.x)+20<support.width/2);
  }
  for(const point of [course.START_POINT,course.CHECKPOINT_POINT]) {
    assert.ok(course.RIVER_SOLIDS.some(p=>p.kind==='bank'&&p.top===point.y&&Math.abs(p.x-point.x)+15<p.width/2));
    assert.ok(course.TRUFFINOU_PATROLS.every(p=>point.x+30<p.left||point.x-30>p.right));
  }
});

test('outward, return and recovery jumps are reachable at both ferry extremes',()=>{
  const byId=id=>course.RIVER_SOLIDS.find(s=>s.id===id);
  const route=['start','marsh-1','ferry','marsh-2','checkpoint-bank','bridge-1','bridge-2','bridge-3','last-marsh-1','last-marsh-2','finish'];
  function reachable(from,to,fromX=from.x,toX=to.x) {
    const rise=from.top-to.top,discriminant=490**2-2*900*rise;
    if(discriminant<0) return false;
    const time=(490+Math.sqrt(discriminant))/900;
    const maxTravel=235*time;
    return Math.max(0,Math.abs(toX-fromX)-from.width/2-to.width/2+30)<maxTravel;
  }
  for(let i=1;i<route.length;i++) {
    for(const ferryX of [course.FERRY.left,course.FERRY.right]) {
      const a=byId(route[i-1]),b=byId(route[i]);
      const ax=a.kind==='moving'?ferryX:a.x,bx=b.kind==='moving'?ferryX:b.x;
      assert.ok(reachable(a,b,ax,bx),a.id+' → '+b.id);
      assert.ok(reachable(b,a,bx,ax),b.id+' → '+a.id);
    }
  }
  assert.ok(reachable(byId('start'),byId('discovery')));
  assert.ok(reachable(byId('recovery'),byId('marsh-1')));
  assert.ok(reachable(byId('recovery'),byId('marsh-2')));
});

test('initial scene separates enemies from the platform route and pauses for the intro',()=>{
  const {s,groups,colliders}=fixture();
  assert.equal(s.health,3);assert.equal(s.state,'intro');assert.equal(s.physics.paused,true);
  assert.equal(groups[0].children.length,3);assert.equal(groups[2].children.length,10);
  assert.equal(s.enemies.length,2);assert.equal(colliders.length,5);
  for(const enemy of s.enemies) {
    const collisions=colliders.filter(([a])=>a===enemy);
    assert.equal(collisions.length,1);assert.ok(groups[0].children.includes(collisions[0][1]));
  }
  assert.equal(s.ferry.body.allowGravity,false);assert.equal(s.ferry.body.immovable,true);
  assert.equal(s.ferry.body.friction.x,1);assert.equal(s.ferry.body.checkCollision.down,false);
  const feet=o=>o.y+o.scaleY*(o.body.offset.y-o.originY*o.height+o.body.sourceHeight);
  assert.ok(Math.abs(feet(s.player)-520)<1e-8);
  s.enemies.forEach(e=>assert.ok(Math.abs(feet(e)-520)<1e-8));
  s.takeDamage(300);assert.equal(s.health,3);
  s.begin();assert.equal(s.state,'playing');assert.equal(s.physics.paused,false);
});

test('checkpoint and chocolate recovery preserve stars; repeated hazard callbacks cannot drain hearts',()=>{
  const {s,groups}=fixture();s.begin();
  groups[2].children.slice(0,3).forEach(star=>{s.collectStar(star);s.collectStar(star)});
  s.activateCheckpoint();s.activateCheckpoint();assert.equal(s.checkpointActive,true);
  s.player.x=1900;s.fallIntoChocolate();
  assert.equal(s.health,2);assert.equal(s.collected.size,3);assert.equal(s.player.x,course.CHECKPOINT_POINT.x);
  assert.equal(s.player.y,520);assert.equal(s.player.body.velocity.x,0);
  s.fallIntoChocolate();assert.equal(s.health,2);
  const immune=s.immuneUntil,clock=s.clock;s.pauseLevel();s.update(20000,20000);
  assert.equal(s.clock,clock);assert.equal(s.immuneUntil,immune);
  s.resumeLevel();s.takeDamage(1700);assert.equal(s.health,2);
  s.clock=immune;s.takeDamage(1700);assert.equal(s.health,1);
});

test('chocolate loss offers replay and a new scene starts completely clean',()=>{
  const {s,restarts}=fixture();s.begin();
  for(let i=0;i<3;i++){s.clock=i*1600;s.fallIntoChocolate()}
  assert.equal(s.health,0);assert.equal(s.state,'lost');assert.equal(s.physics.paused,true);
  s.overlay.actions[0][1]();assert.equal(restarts.length,1);
  s.fallIntoChocolate();assert.equal(s.health,0);
  const clean=fixture().s;assert.equal(clean.health,3);assert.equal(clean.collected.size,0);
  assert.equal(clean.checkpointActive,false);assert.deepEqual(clean.respawn,course.START_POINT);
  assert.equal(clean.immuneUntil,0);assert.equal(clean.enemies.length,2);
});

test('portal is locked until ten distinct stars; reward is granted only on victory',()=>{
  const {s,groups}=fixture();s.begin();s.tryFinish();
  assert.equal(s.state,'playing');assert.equal(s.registry.magicChocolateTablet,undefined);
  groups[2].children.forEach(star=>{s.collectStar(star);s.collectStar(star)});
  assert.equal(s.counter.text,'10 / 10');assert.equal(s.collected.size,10);
  assert.equal(s.state,'playing');s.tryFinish();
  assert.equal(s.state,'won');assert.equal(s.registry.level2Complete,true);
  assert.equal(s.registry.magicChocolateTablet,true);assert.equal(s.physics.paused,true);
  s.takeDamage(100);assert.equal(s.health,3);
});

test('ferry and enemies reverse using velocity, stay within their route and freeze while paused',()=>{
  const {s}=fixture();s.begin();let ferryTurns=0,enemyTurns=0;
  for(let frame=0;frame<3600;frame++) {
    const old=s.ferry.body.velocity.x,oldEnemies=s.enemies.map(e=>e.body.velocity.x);
    s.update(frame*1000/120,1000/120);
    if(old!==s.ferry.body.velocity.x) ferryTurns++;
    s.ferry.x+=s.ferry.body.velocity.x/120;
    assert.ok(s.ferry.x>=course.FERRY.left-.21&&s.ferry.x<=course.FERRY.right+.21);
    s.enemies.forEach((enemy,i)=>{
      if(enemy.body.velocity.x!==oldEnemies[i]) enemyTurns++;
      enemy.x+=enemy.body.velocity.x/120;
      assert.ok(enemy.x>=enemy.data.left-.28&&enemy.x<=enemy.data.right+.28);
    });
  }
  assert.ok(ferryTurns>=8);assert.ok(enemyTurns>=12);
  const clock=s.clock;s.pauseLevel();s.update(100000,5000);assert.equal(s.clock,clock);
});

test('installed Phaser collision solver carries a passenger and permits jumping through the underside',()=>{
  const world={defaults:{},bounds:{x:0,y:0,width:3600,height:650}};
  const rider=new Body(world),ferry=new Body(world);
  rider.setSize(30,74);ferry.setSize(170,32);ferry.setImmovable(true).setAllowGravity(false).setFriction(1,0);
  rider.position.set(930,368);rider.prev.set(930,366);rider._dy=2;rider.velocity.y=30;
  ferry.position.set(900,440);ferry.prev.set(899.6,440);ferry._dy=0;
  assert.equal(SeparateY(rider,ferry,false,4),true);
  assert.ok(Math.abs(rider.bottom-440)<1e-8);
  assert.ok(Math.abs(rider.x-930.4)<1e-8);
  assert.equal(rider.velocity.y,0);
  rider.position.set(930,470);rider.prev.set(930,473);rider._dy=-3;rider.velocity.y=-100;
  ferry.checkCollision.down=false;
  assert.equal(SeparateY(rider,ferry,false,4),false);assert.equal(rider.velocity.y,-100);
});

test('assets exist and use matching PNG/SVG loaders; level 1 remains the new-game entry',()=>{
  const source=read('src/world/chocolateTextures.ts');
  for(const [,path] of source.matchAll(/from '([^']+\?(?:url)[^']*)'/g)) {
    assert.ok(existsSync(resolve('src/world',path.split('?')[0])),path);
  }
  const imports=[...source.matchAll(/import (\w+) from '([^']+)'/g)].filter(a=>a[1]!=='Phaser');
  const declarations=imports.map(([,n,p])=>'const '+n+'='+JSON.stringify(p)+';').join('\n');
  const code=source.replace(/^import[^\n]+\n/gm,'').replace('export function','function');
  const preload=new Function(stripTypeScriptTypes(declarations+code)+';return preloadChocolateAssets;')();
  const loads=[];preload({textures:{exists:()=>false},load:{image:(k,u)=>loads.push(['png',k,u]),svg:(k,u)=>loads.push(['svg',k,u])}});
  assert.equal(loads.length,7);loads.forEach(([format,,url])=>assert.ok(url.split('?')[0].endsWith('.'+format)));
  assert.ok(read('src/scenes/MenuScene.ts').includes('this.scene.start("Level1Scene")'));
  verifyMenuUnlock(2);
  assert.ok(read('src/scenes/Level1Scene.ts').includes("['Niveau suivant',()=>this.scene.start('Level2Scene')]"));
});
