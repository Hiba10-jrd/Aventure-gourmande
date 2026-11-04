import Phaser from 'phaser';

export function sweetText(scene:Phaser.Scene,x:number,y:number,text:string,size=18):Phaser.GameObjects.Text {
  return scene.add.text(x,y,text,{fontFamily:'Trebuchet MS, sans-serif',fontSize:size+'px',
    fontStyle:'bold',color:'#54375d'});
}

export function sweetCard(scene:Phaser.Scene,x:number,y:number,w:number,h:number):Phaser.GameObjects.Graphics {
  const g=scene.add.graphics();
  g.fillStyle(0x54375d,.13).fillRoundedRect(x,y+3,w,h,16);
  g.fillStyle(0xfffaf1,.92).fillRoundedRect(x,y,w,h,16);
  g.lineStyle(1,0xeac4de).strokeRoundedRect(x,y,w,h,16);
  return g;
}

export function sweetButton(scene:Phaser.Scene,x:number,y:number,label:string,action:()=>void,width=280,color=0x8660a9):Phaser.GameObjects.Container {
  const g=scene.add.graphics();
  const paint=(color:number)=>{
    g.clear().fillStyle(0x54375d,.15).fillRoundedRect(-width/2,-22,width,52,15);
    g.fillStyle(color).fillRoundedRect(-width/2,-26,width,52,15);
    g.lineStyle(2,0xe1c5ef).strokeRoundedRect(-width/2,-26,width,52,15);
  };
  paint(color);
  const text=sweetText(scene,0,0,label,width<110?17:20).setOrigin(.5).setColor('#ffffff');
  // The visual container owns the control, but a rendered rectangle owns its hitbox.
  // Phaser does not bubble child pointer events to a Container automatically.
  const button=scene.add.container(x,y,[g,text]).setScrollFactor(0)
    .setSize(width,52);
  const hit=scene.add.rectangle(0,0,width,52,0xffffff,.001).setScrollFactor(0)
    .setInteractive({useHandCursor:true});
  button.add(hit);
  for(const name of ['pointerdown','pointerup','pointerover','pointerout']) {
    hit.on(name,(pointer:Phaser.Input.Pointer,localX:number,localY:number,event?:Phaser.Types.Input.EventData)=>{
      event?.stopPropagation();
      button.emit(name,pointer,localX,localY,event);
    });
  }
  button.on('pointerover',()=>paint(0xa077bf));
  button.on('pointerout',()=>paint(color));
  button.on('pointerdown',action);
  return button;
}

export function sweetPanel(scene:Phaser.Scene,title:string,detail:string,actions:[string,()=>void][],icon?:string,primaryColor?:number):Phaser.GameObjects.Container {
  const shade=scene.add.rectangle(450,325,900,650,0x36234e,.64).setScrollFactor(0).setInteractive();
  const card=sweetCard(scene,100,105,700,440);
  const heading=sweetText(scene,450,151,title,26).setOrigin(.5).setWordWrapWidth(640).setAlign('center');
  const subtitle=sweetText(scene,450,223,detail,18).setOrigin(.5).setWordWrapWidth(610).setAlign('center');
  const panel=scene.add.container(0,0,[shade,card,heading,subtitle]).setDepth(100).setScrollFactor(0);
  if(icon) {
    const compactLayout=actions.length>=3;
    const image=scene.add.image(450,compactLayout?292:310,icon);
    const height=compactLayout?72:110;
    image.setScale(height/image.height);
    panel.add(image);
  }
  const compactLayout=Boolean(icon)&&actions.length>=3;
  const first=compactLayout?365:icon?405:325;
  const spacing=compactLayout?60:70;
  // Added after the shade in the same hierarchy: rendered hit rectangles sort above it.
  // Container destruction also destroys every button and its input listeners.
  actions.forEach(([label,action],i)=>panel.add(sweetButton(scene,450,first+i*spacing,label,action,330,
    i===0&&primaryColor!==undefined?primaryColor:0x8660a9)));
  return panel;

}
