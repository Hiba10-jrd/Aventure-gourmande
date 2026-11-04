import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes as strip } from 'node:module';
export { strip };
const require=createRequire(import.meta.url);
const EventEmitter=require('eventemitter3');
const Matrix=require('../node_modules/phaser/src/gameobjects/components/TransformMatrix.js');
const Vector2=require('../node_modules/phaser/src/math/Vector2.js');
const TransformXY=require('../node_modules/phaser/src/math/TransformXY.js');
const Rectangle=require('../node_modules/phaser/src/geom/rectangle/Rectangle.js');
const Contains=require('../node_modules/phaser/src/geom/rectangle/Contains.js');
const Events=require('../node_modules/phaser/src/input/events/index.js');
const renderContainerCanvas=require('../node_modules/phaser/src/gameobjects/container/ContainerCanvasRenderer.js');
const renderContainerWebGL=require('../node_modules/phaser/src/gameobjects/container/ContainerWebGLRenderer.js');
export const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function engineMethod(path,name) {
  const source=read(path),start=source.indexOf('    '+name+': function');assert.ok(start>=0,name);
  const end=source.indexOf('\n    },',start);
  const fn=source.slice(source.indexOf('function',start),end)+'\n    }';
  return new Function('TransformXY','Events','return ('+fn+');')(TransformXY,Events);
}
const inputPath='node_modules/phaser/src/input/InputManager.js';
const pluginPath='node_modules/phaser/src/input/InputPlugin.js';
const manager={_tempPoint:new Vector2(),_tempMatrix:new Matrix(),_tempMatrix2:new Matrix(),game:{canvas:{}},
  inputCandidate:engineMethod(inputPath,'inputCandidate'),pointWithinHitArea:engineMethod(inputPath,'pointWithinHitArea'),hitTest:engineMethod(inputPath,'hitTest')};
const sortHits=engineMethod(pluginPath,'sortGameObjects');
const processDown=engineMethod(pluginPath,'processDownEvents'),processUp=engineMethod(pluginPath,'processUpEvents');
const uiSource=read('src/ui/sweetUi.ts').replace(/^import[^\n]+\n/gm,'').replaceAll('export function','function');
export const ui=new Function(strip(uiSource)+';return {sweetButton,sweetPanel,sweetText,sweetCard};')();

export function fixture(scrollX=0,{renderer='webgl',topOnly=true}={}) {
  const objects=[];
  class Object2D extends EventEmitter {
    constructor(x=0,y=0,w=0,h=0,type='shape') {
      super();Object.assign(this,{x,y,width:w,height:h,type,originX:.5,originY:.5,rotation:0,alpha:1,_alpha:1,
        scrollFactorX:1,scrollFactorY:1,scaleX:1,scaleY:1,depth:0,blendMode:0,active:true,visible:true,list:[],paints:[],localTransform:new Matrix()});
      objects.push(this);
    }
    get displayOriginX(){return this.width*this.originX}
    get displayOriginY(){return this.height*this.originY}
    setSize(w,h){this.width=w;this.height=h;return this}
    setScrollFactor(x,y=x){this.scrollFactorX=x;this.scrollFactorY=y;return this}
    setDepth(depth){this.depth=depth;return this}
    setOrigin(x,y=x){this.originX=x;this.originY=y;return this}
    setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this}
    setAlpha(alpha){this.alpha=alpha;this._alpha=alpha;return this}
    setVelocity(){return this}
    setInteractive(config={}) {
      this.cursor=config.useHandCursor;this.interactive=true;
      this.input={enabled:true,hitArea:new Rectangle(0,0,this.width,this.height),hitAreaCallback:Contains};return this;
    }
    willRender(){return this.active&&this.visible&&this.alpha>0}
    getWorldTransformMatrix(matrix) {
      const chain=[];for(let o=this;o;o=o.parentContainer)chain.unshift(o);
      matrix.applyITRS(0,0,0,1,1);
      for(const o of chain)matrix.multiply(new Matrix().applyITRS(o.x,o.y,o.rotation,o.scaleX,o.scaleY));
      return matrix;
    }
    add(items) {
      for(const item of Array.isArray(items)?items:[items]){item.parentContainer=this;this.list.push(item)}return this;
    }
    destroy(){if(!this.active)return;this.emit('destroy',this);this.active=false;this.input=null;this.list.forEach(item=>item.destroy());this.removeAllListeners()}
    fillStyle(color){this.paints.push(color);return this}
    renderCanvas(r,o,c,parent) {if(this.type==='Container')renderContainerCanvas(r,o,c,parent);else c.addToRenderList(o);}
    renderWebGLStep(r,o,context,parent) {if(this.type==='Container')renderContainerWebGL(r,o,context,parent);else context.camera.addToRenderList(o);}
  }
  for(const name of ['clear','fillRoundedRect','strokeRoundedRect','lineStyle','setColor','setWordWrapWidth','setAlign','setStrokeStyle'])Object2D.prototype[name]=function(){return this};
  const scene={add:{graphics:()=>new Object2D(),rectangle:(x,y,w,h)=>new Object2D(x,y,w,h),
    text:(x,y,text)=>Object.assign(new Object2D(x,y,text.length*9,24),{text}),image:(x,y)=>new Object2D(x,y,96,112),
    container:(x,y,children=[])=>new Object2D(x,y,0,0,'Container').add(children)}};
  const camera={scrollX,scrollY:0,renderList:[],addToRenderList(o){this.renderList.push(o);},getWorldPoint(x,y,out){return out.set(x+this.scrollX,y+this.scrollY)}};
  function render() {
    camera.renderList=[];
    const r={currentBlendMode:0,setBlendMode(mode){this.currentBlendMode=mode;}};
    const context={camera,blendMode:0};
    for(const o of objects.filter(o=>!o.parentContainer&&o.willRender()).sort((a,b)=>a.depth-b.depth)) {
      if(renderer==='canvas')o.renderCanvas(r,o,camera);else o.renderWebGLStep(r,o,context);
    }
  }
  function hitTestAt(x,y) {
    render();const p={x,y,camera,downElement:manager.game.canvas,upElement:manager.game.canvas};
    return {p,hits:sortHits.call({},manager.hitTest(p,objects.filter(o=>o.input),camera,[]),p)};
  }
  function pointer(_panel,x,y,event='pointerdown') {
    const {p,hits}=hitTestAt(x,y);const target=hits[0];pointer.target=target;
    // Keep the old test API returning the logical control, while dispatching to its actual rendered hit rectangle.
    const control=target?.parentContainer?.listenerCount('pointerdown')?target.parentContainer:target;
    const data={cancelled:false};const eventContainer={stopPropagation(){data.cancelled=true;}};
    const plugin={_temp:topOnly?hits.slice(0,1):hits,_eventData:data,_eventContainer:eventContainer,manager,isActive:()=>true,emit(){}};
    if(event==='pointerdown')processDown.call(plugin,p);
    else if(event==='pointerup')processUp.call(plugin,p);
    else target?.emit(event,p,target.input.localX,target.input.localY,eventContainer);
    pointer.cancelled=data.cancelled;return control;
  }
  return {scene,camera,pointer,hitTestAt,render,objects,Object2D};
}
