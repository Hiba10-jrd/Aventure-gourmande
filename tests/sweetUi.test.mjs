import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes as strip } from 'node:module';
import { test } from 'node:test';

const require=createRequire(import.meta.url);
const EventEmitter=require('eventemitter3');
const Matrix=require('../node_modules/phaser/src/gameobjects/components/TransformMatrix.js');
const Vector2=require('../node_modules/phaser/src/math/Vector2.js');
const TransformXY=require('../node_modules/phaser/src/math/TransformXY.js');
const Rectangle=require('../node_modules/phaser/src/geom/rectangle/Rectangle.js');
const Contains=require('../node_modules/phaser/src/geom/rectangle/Contains.js');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

// Execute the installed Phaser input methods unchanged, without booting DOM managers.
function engineMethod(path,name) {
  const source=read(path),start=source.indexOf('    '+name+': function');
  assert.ok(start>=0,name);
  const end=source.indexOf('\n    },',start);
  const fn=source.slice(source.indexOf('function',start),end)+'\n    }';
  return new Function('TransformXY','return ('+fn+');')(TransformXY);
}
const inputPath='node_modules/phaser/src/input/InputManager.js';
const manager={_tempPoint:new Vector2(),_tempMatrix:new Matrix(),_tempMatrix2:new Matrix(),
  inputCandidate:engineMethod(inputPath,'inputCandidate'),
  pointWithinHitArea:engineMethod(inputPath,'pointWithinHitArea'),
  hitTest:engineMethod(inputPath,'hitTest')};
const sortHits=engineMethod('node_modules/phaser/src/input/InputPlugin.js','sortGameObjects');
const uiSource=read('src/ui/sweetUi.ts').replace(/^import[^\n]+\n/gm,'').replaceAll('export function','function');
const ui=new Function(strip(uiSource)+';return {sweetButton,sweetPanel,sweetText,sweetCard};')();

function fixture(scrollX=0) {
  class Object2D extends EventEmitter {
    constructor(x=0,y=0,w=0,h=0) {
      super();Object.assign(this,{x,y,width:w,height:h,originX:.5,originY:.5,
        scrollFactorX:1,scrollFactorY:1,scaleX:1,scaleY:1,active:true,visible:true,list:[],paints:[]});
    }
    get displayOriginX(){return this.width*this.originX}
    get displayOriginY(){return this.height*this.originY}
    setSize(w,h){this.width=w;this.height=h;return this}
    setScrollFactor(x,y=x){this.scrollFactorX=x;this.scrollFactorY=y;return this}
    setDepth(depth){this.depth=depth;return this}
    setOrigin(x,y=x){this.originX=x;this.originY=y;return this}
    setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this}
    setAlpha(alpha){this.alpha=alpha;return this}
    setVelocity(){return this}
    setInteractive(config={}) {
      this.cursor=config.useHandCursor;
      this.input={enabled:true,hitArea:new Rectangle(0,0,this.width,this.height),hitAreaCallback:Contains};
      return this;
    }
    willRender(){return this.active&&this.visible}
    getWorldTransformMatrix(matrix) {
      let x=this.x,y=this.y,parent=this.parentContainer;
      while(parent){x+=parent.x;y+=parent.y;parent=parent.parentContainer}
      return matrix.applyITRS(x,y,0,1,1);
    }
    add(items) {
      for(const item of Array.isArray(items)?items:[items]){item.parentContainer=this;this.list.push(item)}
      return this;
    }
    destroy(){this.active=false;this.input=null;this.list.forEach(item=>item.destroy());this.removeAllListeners()}
    fillStyle(color){this.paints.push(color);return this}
  }
  for(const name of ['clear','fillRoundedRect','strokeRoundedRect','lineStyle','setColor','setWordWrapWidth','setAlign','setStrokeStyle']) {
    Object2D.prototype[name]=function(){return this};
  }
  const scene={add:{graphics:()=>new Object2D(),rectangle:(x,y,w,h)=>new Object2D(x,y,w,h),
    text:(x,y,text)=>Object.assign(new Object2D(x,y),{text}),image:(x,y)=>new Object2D(x,y,96,112),
    container:(x,y,children=[])=>new Object2D(x,y).add(children)}};
  const camera={scrollX,scrollY:0,renderList:[],getWorldPoint(x,y,out){return out.set(x+this.scrollX,y)}};
  function pointer(panel,x,y,event='pointerdown') {
    const flatten=o=>[o,...o.list.flatMap(flatten)];
    camera.renderList=flatten(panel);
    const pointer={x,y,camera};
    const hits=manager.hitTest(pointer,camera.renderList.filter(o=>o.input),camera,[]);
    // Phaser's default topOnly dispatches to the first object after render-order sorting.
    const target=sortHits.call({},hits,pointer)[0];
    target?.emit(event,pointer);return target;
  }
  return {scene,camera,pointer,Object2D};
}

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

test('level 1 modal buttons remain clickable with its non-scrolling camera',()=>{
  const code=read('src/scenes/Level1Scene.ts').trimStart().replace(/^import[^\n]+\n/gm,'').replace('export class','class');
  const Scene=new Function('Phaser',strip(code)+';return Level1Scene;')({Scene:class{}});
  const {scene,pointer}=fixture(),s=new Scene();Object.assign(s,scene);
  let replay=0,menu=0;
  s.showPanel('Défaite','On réessaie ?', [['REJOUER',()=>replay++],['Menu principal',()=>menu++]]);
  pointer(s.overlay,450,310);pointer(s.overlay,450,385);
  assert.equal(replay,1);assert.equal(menu,1);
});
