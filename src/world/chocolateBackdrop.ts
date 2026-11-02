import Phaser from 'phaser';
import { RIVER_SURFACE, RIVER_WIDTH } from './chocolateCourse';

// Painted scenery is deliberately separate from all physics surfaces.
export function drawChocolateBackdrop(scene:Phaser.Scene):void {
  const sky=scene.add.graphics().setDepth(-20).setScrollFactor(0);
  sky.fillGradientStyle(0xf4d7ed,0xe6dcfa,0xfff1d8,0xffe5bd,1);
  sky.fillRect(0,0,900,650);
  scene.add.circle(690,185,65,0xfff1d8,.8).setDepth(-19).setScrollFactor(.08);
  const hills=scene.add.graphics().setDepth(-18).setScrollFactor(.3);
  for(let i=0;i<9;i++) {
    const x=i*430-120;
    hills.fillStyle(i%2?0xdfa060:0xedbc84,.65).fillTriangle(x,545,x+230,235+(i%3)*38,x+490,545);
    hills.fillStyle(0xfff1d8,.85).fillEllipse(x+230,280+(i%3)*38,95,28);
  }
  for(let i=0;i<8;i++) {
    const x=130+i*470,y=125+(i%3)*35;
    const cloud=scene.add.graphics().setDepth(-17).setScrollFactor(.25);
    cloud.fillStyle(0xfff8eb,.85).fillRoundedRect(x-65,y,140,26,16);
    cloud.fillCircle(x-20,y,27).fillCircle(x+18,y-9,34).fillCircle(x+48,y,23);
  }
  const falls=scene.add.graphics().setDepth(-14);
  falls.fillStyle(0xdfa060,.8).fillRoundedRect(3060,175,168,430,36);
  falls.fillStyle(0x8b4a30).fillRoundedRect(3075,180,138,430,30);
  falls.lineStyle(5,0xc88556,.8);
  [3095,3130,3170,3195].forEach(x=>falls.lineBetween(x,205,x,575));
  const shimmer=scene.add.ellipse(3140,565,180,40,0xffd49a,.3).setDepth(-13);
  scene.tweens.add({targets:shimmer,alpha:.1,scaleX:1.1,duration:1600,yoyo:true,repeat:-1});
  const river=scene.add.graphics().setDepth(-10);
  river.fillGradientStyle(0xa96340,0xa96340,0x5a2e24,0x5a2e24,1);
  river.fillRect(0,RIVER_SURFACE,RIVER_WIDTH,650-RIVER_SURFACE);
  river.lineStyle(4,0xdfa060,.65).lineBetween(0,RIVER_SURFACE,RIVER_WIDTH,RIVER_SURFACE);
  river.lineStyle(2,0xf1bc82,.4);
  for(let i=0;i<32;i++) river.lineBetween(i*120+15,RIVER_SURFACE+15+(i%3)*13,i*120+65,RIVER_SURFACE+15+(i%3)*13);
  // A few candy trees on the stable banks, never across the jumping route.
  [38,580,1355,2860,3540].forEach((x,i)=>{
    const tree=scene.add.graphics().setDepth(-5);
    tree.fillStyle(0xc88b68).fillRoundedRect(x-6,350,12,170,6);
    tree.fillStyle(i%2?0xbfa7e9:0xf6b8cf).fillCircle(x,345,43);
    tree.lineStyle(5,0xfff1d8,.8).strokeCircle(x,345,29);
  });
}
