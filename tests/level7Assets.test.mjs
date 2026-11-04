import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, build } from 'vite';
import { fixture, read, strip, ui } from './inputHarness.mjs';
const require=createRequire(import.meta.url);
const SVGFile=require('../node_modules/phaser/src/loader/filetypes/SVGFile.js');
const EventEmitter=require('eventemitter3');
const assets=[
  {name:'frosty-fraise',variable:'frostyUrl',path:'/src/assets/enemies/frosty-fraise.svg'},
  {name:'picpic-glace',variable:'picpicUrl',path:'/src/assets/enemies/picpic-glace.svg'},
  {name:'glacior',variable:'glaciorUrl',path:'/src/assets/enemies/glacior.svg'},
  {name:'vanilline',variable:'vanillineUrl',path:'/src/assets/characters/iceCream/vanilline.svg'},
];
const value=code=>JSON.parse(code.trim().replace(/^export default /,'').replace(/;$/,''));
const loader=()=>({textureManager:{},prefix:'',path:'',baseURL:'',xhr:{},maxRetries:0,localSchemes:[],nextFile(file,success){this.result={file,success};}});

test('reproduce the exact atob failure with actual Vite URLs and the installed Phaser SVGFile loader; fixed URLs avoid Base64 decoding',async()=>{
  const server=await createServer({server:{middlewareMode:true},logLevel:'silent'});
  const originalAtob=globalThis.atob,originalXHR=globalThis.XMLHttpRequest;
  try {
    const requests=[];let atobArgument;
    globalThis.atob=data=>{atobArgument=data;return originalAtob(data);};
    // Only the HTTP transport is replaced. File.load and XHRLoader run unchanged.
    globalThis.XMLHttpRequest=class {
      open(method,url){this.url=url;assert.equal(method,'GET');requests.push(url);}
      setRequestHeader(){}
      send(){
        const path=new URL(this.url,'http://localhost').pathname;
        assert.ok(assets.some(a=>a.path===path));
        this.responseText=readFileSync(resolve('.'+path),'utf8');
        this.readyState=4;this.status=200;this.responseURL='http://localhost'+path;
        this.onload({target:{status:200}});
      }
    };
    const source=read('src/scenes/Level7Scene.ts');
    for(const asset of assets) {
      const inline=value((await server.transformRequest(asset.path+'?url')).code);
      assert.match(inline,/^data:image\/svg\+xml,%3csvg/i);
      const oldFile=new SVGFile(loader(),asset.name,inline);
      assert.equal(oldFile.base64,true);
      assert.throws(()=>oldFile.load(),error=>error.name==='InvalidCharacterError'&&error.stack.includes('XHRLoader.js:44'));
      assert.equal(atobArgument,inline,'Phaser passes the entire percent-encoded URI to atob');
      assert.ok(source.includes(asset.path.slice('/src'.length)+'?url&no-inline'));
      const fixed=value((await server.transformRequest(asset.path+'?url&no-inline')).code);
      assert.doesNotMatch(fixed,/^data:/);assert.match(fixed,/\.svg\?no-inline$/);
      const l=loader(),file=new SVGFile(l,asset.name,fixed);atobArgument=undefined;
      assert.equal(file.base64,false);assert.doesNotThrow(()=>file.load());
      assert.equal(atobArgument,undefined);assert.equal(l.result.success,true);
      assert.match(file.xhrLoader.responseText,/<svg\b/);assert.match(file.xhrLoader.responseText,/linearGradient/);
    }
    assert.equal(requests.length,4);
  } finally {
    globalThis.atob=originalAtob;
    if(originalXHR===undefined)delete globalThis.XMLHttpRequest;else globalThis.XMLHttpRequest=originalXHR;
    await server.close();
  }
});

test('production emits all four illustrations as separate unchanged SVG files, including when hosted below a subpath',async()=>{
  const result=await build({logLevel:'silent',base:'/zaynab/',build:{write:false,minify:false}});
  const chunk=result.output.find(o=>o.type==='chunk').code;
  for(const asset of assets) {
    const output=result.output.find(o=>o.type==='asset'&&o.fileName.startsWith('assets/'+asset.name+'-')&&o.fileName.endsWith('.svg'));
    assert.ok(output,asset.name+' must not be inlined');
    assert.ok(chunk.includes('/zaynab/'+output.fileName));
    assert.equal(Buffer.from(output.source).toString('utf8'),readFileSync(resolve('.'+asset.path),'utf8'));
  }
});

function sceneFixture() {
  const source=read('src/world/iceCreamCourse.ts');
  const names=[...source.matchAll(/export (?:const|function) (\w+)/g)].map(m=>m[1]);
  const course=new Function(strip(source).replace(/\bexport\s+/g,'')+';return {'+names.join(',')+'};')();
  const f=fixture(),textures=new Set();
  const deps={...course,...ui,makeIceTextures(){},DEV_MODE:false,
    heroineUrl:'/src/assets/characters/heroine/new-heroine-transparent.png',
    ...Object.fromEntries(assets.map(a=>[a.variable,a.path+'?no-inline'])),
    Phaser:{Scene:class{},Loader:{Events:{FILE_LOAD_ERROR:'loaderror'}},Scenes:{Events:{SHUTDOWN:'shutdown'}},Core:{Events:{BLUR:'blur'}}}};
  const code=strip(read('src/scenes/Level7Scene.ts').trimStart().replace(/^import[\s\S]*?;\s*/gm,'')).replace('export class','class');
  const Scene=new Function(...Object.keys(deps),code+';return Level7Scene;')(...Object.values(deps));
  const s=new Scene();Object.assign(s,f.scene);s.textures={exists:key=>textures.has(key)};
  s.events=new EventEmitter();s.load=new EventEmitter();s.queued=[];
  s.load.image=(key,url,settings)=>s.queued.push({key,url,settings,type:'image'});
  s.load.svg=(key,url,_size,settings)=>s.queued.push({key,url,settings,type:'svg'});
  s.started=[];s.scene={start:key=>s.started.push(key),restart(){s.restarted=true;}};
  return {...f,s,textures};
}

test('a failed request or SVG processing failure shows working Retry/Menu buttons and allows retrying just the missing texture',()=>{
  const {s,textures,pointer}=sceneFixture();s.preload();
  assert.equal(s.queued.length,5);assert.ok(s.queued.every(f=>f.settings.timeout===10000));
  pointer(s.overlay,450,325);assert.deepEqual(s.started,['MenuScene'],'menu available even during preload');
  const loading=s.overlay;
  // A processed SVG can fail without emitting loaderror: absence in TextureManager is authoritative.
  for(const key of ['ice-hero','ice-frosty','ice-picpic','ice-glacior'])textures.add(key);
  s.load.emit('loaderror',{key:'ice-vanilline',type:'svg',url:assets[3].path});
  s.create();assert.equal(loading.active,false);assert.equal(s.mode,'intro');
  const error=s.overlay;
  pointer(error,450,325);assert.equal(s.restarted,true);
  pointer(error,450,395);assert.equal(s.started.at(-1),'MenuScene');
  s.events.emit('shutdown');assert.equal(s.load.listenerCount('loaderror'),0);
  s.queued=[];s.preload();assert.deepEqual(s.queued.map(f=>f.key),['ice-vanilline']);
  assert.equal(s.load.listenerCount('loaderror'),1);
});

test('after successful loading the actual intro button starts the scene; Pause, Resume, Replay and Menu remain clickable',()=>{
  const {s,textures,pointer,Object2D}=sceneFixture();s.preload();const loading=s.overlay;
  s.queued.forEach(f=>textures.add(f.key));
  // Isolate the loader/intro lifecycle: level geometry and the DOM/GPU are covered separately or require a browser.
  for(const method of ['drawWorld','addPlatform','makeCollectibles','makeEnemies','makePuzzle','makeCheckpoints','makePalace','makeHud'])s[method]=()=>{};
  const body={setSize(){return this;},setOffset(){return this;}};
  const player=new Object2D(100,530,80,100);player.body=body;
  player.setGravityY=player.setCollideWorldBounds=()=>player;
  s.physics={resume(){this.paused=false;},pause(){this.paused=true;},world:{setBounds(){}},add:{staticGroup:()=>({}),sprite:()=>player,collider(){}}};
  s.tweens={resumeAll(){},pauseAll(){}};s.time={};s.anims={resumeAll(){},pauseAll(){}};
  s.input={keyboard:new EventEmitter()};s.input.keyboard.createCursorKeys=()=>({});s.input.keyboard.addKey=()=>({});s.input.keyboard.resetKeys=()=>{};
  s.game={events:new EventEmitter()};s.cameras={main:{setBounds(){return this;},startFollow(){return this;},setDeadzone(){return this;}}};
  s.hint={setText(){return this;},setVisible(){return this;}};
  s.create();assert.equal(loading.active,false);assert.equal(s.physics.paused,true);assert.equal(s.mode,'intro');
  assert.ok(s.overlay.list.some(o=>o.list?.some(t=>t.text==='C’est parti !')));
  pointer(s.overlay,450,405);assert.equal(s.mode,'playing');assert.equal(s.physics.paused,false);
  s.pauseLevel();assert.equal(s.physics.paused,true);const pause=s.overlay;
  pointer(pause,450,325);assert.equal(s.mode,'playing');assert.equal(pause.active,false);
  s.pauseLevel();pointer(s.overlay,450,395);assert.equal(s.restarted,true);
  pointer(s.overlay,450,465);assert.equal(s.started.at(-1),'MenuScene');
});
