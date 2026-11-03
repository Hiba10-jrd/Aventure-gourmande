import Phaser from 'phaser';
import { preloadChocolateAssets } from '../world/chocolateTextures';
import { drawChocolateBackdrop } from '../world/chocolateBackdrop';
import { CHECKPOINT_POINT, FERRY, PORTAL_POINT, RIVER_PHYSICS, RIVER_SOLIDS,
  RIVER_STARS, RIVER_SURFACE, RIVER_TOTAL, RIVER_WIDTH, START_POINT, TRUFFINOU_PATROLS } from '../world/chocolateCourse';
import { sweetButton, sweetCard, sweetPanel, sweetText } from '../ui/sweetUi';

type State = 'intro' | 'playing' | 'paused' | 'lost' | 'won';
type Terrain = Phaser.GameObjects.Zone | Phaser.Physics.Arcade.Image;

export class Level2Scene extends Phaser.Scene {
  private player!:Phaser.Physics.Arcade.Sprite;
  private cursors!:Phaser.Types.Input.Keyboard.CursorKeys;
  private ferry!:Phaser.Physics.Arcade.Image;
  private enemies:Phaser.Physics.Arcade.Sprite[]=[];
  private collected=new Set<string>();
  private hearts:Phaser.GameObjects.Text[]=[];
  private counter!:Phaser.GameObjects.Text;
  private hint!:Phaser.GameObjects.Text;
  private checkpointFlag!:Phaser.GameObjects.Triangle;
  private portalGlow!:Phaser.GameObjects.Ellipse;
  private tablet!:Phaser.GameObjects.Image;
  private overlay?:Phaser.GameObjects.Container;
  private state:State='intro';
  private health=3;
  // This clock advances only during play, so pauses preserve all grace periods.
  private clock=0;
  private immuneUntil=0;
  private knockbackUntil=0;
  private lastGrounded=-1000;
  private jumpUntil=0;
  private portalHintUntil=0;
  private checkpointActive=false;
  private respawn={...START_POINT};

  constructor() { super('Level2Scene'); }

  preload():void { preloadChocolateAssets(this); }

  create():void {
    this.state='intro'; this.health=3; this.clock=0; this.immuneUntil=0;
    this.knockbackUntil=0; this.lastGrounded=-1000; this.jumpUntil=0; this.portalHintUntil=0;
    this.checkpointActive=false; this.respawn={...START_POINT};
    this.collected=new Set(); this.enemies=[]; this.hearts=[]; this.overlay=undefined;
    this.physics.resume(); this.tweens.resumeAll();
    this.physics.world.setBounds(0,0,RIVER_WIDTH,650);
    drawChocolateBackdrop(this);
    const banks=this.physics.add.staticGroup();
    const platforms=this.physics.add.staticGroup();
    const terrain=new Map<string,Terrain>();
    RIVER_SOLIDS.forEach(surface=>{
      if(surface.kind==='bank') {
        const zone=this.add.zone(surface.x,surface.top+surface.height/2,surface.width,surface.height);
        this.physics.add.existing(zone,true); banks.add(zone); terrain.set(surface.id,zone);
        const paint=this.add.graphics().setDepth(1);
        paint.fillStyle(0x8b4a30).fillRect(surface.x-surface.width/2,surface.top,surface.width,surface.height);
        paint.fillStyle(0xdfa060).fillRoundedRect(surface.x-surface.width/2,surface.top,surface.width,28,8);
        paint.fillStyle(0xfff1d8).fillRoundedRect(surface.x-surface.width/2,surface.top,surface.width,9,4);
        return;
      }
      const key=surface.kind==='biscuit'||surface.kind==='recovery'?'sweet-platform':'river-marshmallow';
      if(surface.kind==='moving') {
        this.ferry=this.physics.add.image(surface.x,surface.top+surface.height/2,key)
          .setDisplaySize(surface.width,surface.height).setDepth(3).setImmovable(true).setFriction(1,0);
        const body=this.ferry.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false); body.setVelocityX(FERRY.speed);
        this.topOnly(body);
        return;
      }
      const platform=platforms.create(surface.x,surface.top+surface.height/2,key) as Phaser.Physics.Arcade.Image;
      platform.setDisplaySize(surface.width,surface.height).setDepth(3).refreshBody();
      this.topOnly(platform.body as Phaser.Physics.Arcade.StaticBody);
      terrain.set(surface.id,platform);
    });
    this.createPlayer();
    this.physics.add.collider(this.player,banks);
    this.physics.add.collider(this.player,platforms);
    this.physics.add.collider(this.player,this.ferry);
    this.createStars();
    TRUFFINOU_PATROLS.forEach((patrol,i)=>{
      const enemy=this.physics.add.sprite(patrol.x,520,'river-truffinou').setDepth(4);
      const scale=60/1062;
      enemy.setOrigin(.5,1134/1218).setScale(scale).setCollideWorldBounds(true).setGravityY(RIVER_PHYSICS.gravity);
      enemy.body!.setSize(40/scale,48/scale).setOffset((enemy.width-40/scale)/2,1134-48/scale);
      enemy.setVelocityX(i?-32:32).setData('left',patrol.left).setData('right',patrol.right);
      // Each enemy collides ONLY with its own safe bank, not the floating route.
      this.physics.add.collider(enemy,terrain.get(patrol.support)!);
      this.enemies.push(enemy);
      this.tweens.add({targets:enemy,angle:3,duration:600,yoyo:true,repeat:-1});
    });
    this.physics.add.overlap(this.player,this.enemies,(_player,enemy)=>{
      this.takeDamage((enemy as Phaser.Physics.Arcade.Sprite).x);
    });
    const chocolate=this.add.zone((620+2790)/2,RIVER_SURFACE+30,2790-620,60);
    this.physics.add.existing(chocolate,true);
    this.physics.add.overlap(this.player,chocolate,()=>this.fallIntoChocolate());
    this.createCheckpoint(); this.createFinish(); this.createGuide(); this.createHud();
    this.cameras.main.setBounds(0,0,RIVER_WIDTH,650);
    this.cameras.main.startFollow(this.player,true,.12,.12).setDeadzone(140,100);
    this.bindPause();
    this.physics.pause(); this.tweens.pauseAll();
    this.overlay=sweetPanel(this,'Niveau 2 — La Rivière de Chocolat',
      'Croustille : « Le pont est cassé ! Saute sur les guimauves pour traverser ! »',[
        ['C’est parti !',()=>this.begin()],
      ],'river-croustille');
  }

  private topOnly(body:Phaser.Physics.Arcade.Body|Phaser.Physics.Arcade.StaticBody):void {
    // Pass through the underside; land from above. No sideways traps on recovery jumps.
    body.checkCollision.down=false; body.checkCollision.left=false; body.checkCollision.right=false;
  }

  private createPlayer():void {
    this.player=this.physics.add.sprite(START_POINT.x,START_POINT.y,'sweet-hero').setDepth(5);
    const scale=104/1342;
    this.player.setOrigin(.5,1356/1402).setScale(scale).setCollideWorldBounds(true).setGravityY(RIVER_PHYSICS.gravity);
    this.player.body!.setSize(30/scale,74/scale).setOffset((this.player.width-30/scale)/2,1356-74/scale);
    this.cursors=this.input.keyboard!.createCursorKeys();
  }

  private createStars():void {
    const stars=this.physics.add.staticGroup();
    RIVER_STARS.forEach(point=>{
      const star=stars.create(point.x,point.y,'sweet-star') as Phaser.Physics.Arcade.Image;
      star.setDepth(6).setData('id',point.id);
      // Visual rotation does not move the static overlap body.
      this.tweens.add({targets:star,angle:12,alpha:.75,duration:900,yoyo:true,repeat:-1});
    });
    this.physics.add.overlap(this.player,stars,(_player,item)=>this.collectStar(item as Phaser.Physics.Arcade.Image));
  }

  private collectStar(star:Phaser.Physics.Arcade.Image):void {
    const id=star.getData('id') as string;
    if(this.state!=='playing'||!star.active||this.collected.has(id)) return;
    this.collected.add(id); this.burst(star.x,star.y,0xffe49b);
    this.tweens.killTweensOf(star); star.destroy();
    this.counter.setText(this.collected.size+' / '+RIVER_TOTAL);
    if(this.collected.size===RIVER_TOTAL) {
      this.showHint('Dix étoiles ! La Tablette Magique t’attend au portail !');
      this.tweens.add({targets:this.portalGlow,alpha:.6,duration:700,yoyo:true,repeat:-1});
      this.tablet.setAlpha(1);
    }
  }

  private createCheckpoint():void {
    this.add.rectangle(CHECKPOINT_POINT.x,482,6,76,0xdfa060).setDepth(3);
    this.checkpointFlag=this.add.triangle(CHECKPOINT_POINT.x+21,457,0,0,40,15,0,30,0xbfa7e9).setDepth(3);
    sweetText(this,CHECKPOINT_POINT.x,551,'Point de repos',14).setOrigin(.5).setDepth(3);
    const trigger=this.add.zone(CHECKPOINT_POINT.x,475,90,100);
    this.physics.add.existing(trigger,true);
    this.physics.add.overlap(this.player,trigger,()=>this.activateCheckpoint());
  }

  private activateCheckpoint():void {
    if(this.state!=='playing'||this.checkpointActive) return;
    this.checkpointActive=true; this.respawn={...CHECKPOINT_POINT};
    this.checkpointFlag.setFillStyle(0xffe49b);
    this.burst(CHECKPOINT_POINT.x,460,0xfff1d8);
    this.showHint('Point de repos activé ! Tu reviendras ici si tu tombes.');
  }

  private createFinish():void {
    this.portalGlow=this.add.ellipse(PORTAL_POINT.x,460,130,160,0xffe49b,.12).setDepth(2);
    const arch=this.add.graphics().setDepth(3);
    arch.fillStyle(0xbfa7e9).fillRoundedRect(PORTAL_POINT.x-47,390,94,130,{tl:45,tr:45,bl:8,br:8});
    arch.lineStyle(6,0xfff1d8).strokeRoundedRect(PORTAL_POINT.x-47,390,94,130,{tl:45,tr:45,bl:8,br:8});
    this.add.ellipse(PORTAL_POINT.x,460,68,105,0xeadbfa).setDepth(3);
    this.add.star(PORTAL_POINT.x,450,5,10,23,0xffe49b).setDepth(4);
    sweetText(this,PORTAL_POINT.x,367,'PORTAIL',16).setOrigin(.5).setDepth(4);
    this.tablet=this.add.image(3280,444,'river-tablet').setScale(.65).setAlpha(.7).setDepth(4);
    this.tweens.add({targets:this.tablet,y:434,duration:1300,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    sweetText(this,3280,548,'Tablette Magique',14).setOrigin(.5).setDepth(4);
    const portal=this.add.zone(PORTAL_POINT.x,460,94,120);
    this.physics.add.existing(portal,true);
    this.physics.add.overlap(this.player,portal,()=>this.tryFinish());
  }

  private tryFinish():void {
    if(this.state!=='playing') return;
    if(this.collected.size===RIVER_TOTAL) this.win();
    else if(this.clock>=this.portalHintUntil) {
      this.portalHintUntil=this.clock+5000;
      this.showHint('Encore '+(RIVER_TOTAL-this.collected.size)+' étoiles à trouver. Tu peux revenir en arrière !');
    }
  }

  private createGuide():void {
    const guide=this.add.image(225,520,'river-croustille').setOrigin(.5,1242/1283).setScale(92/1198).setDepth(4);
    guide.setInteractive({useHandCursor:true}).on('pointerdown',()=>{
      if(this.state==='playing') this.showHint('Croustille : « Saute sur les guimauves et trouve dix étoiles ! »');
    });
    sweetText(this,225,546,'Croustille',14).setOrigin(.5).setDepth(4);
    sweetText(this,42,170,'La rive des biscuits',20).setAlpha(.7);
    sweetText(this,700,170,'Les guimauves flottantes',20).setAlpha(.7);
    sweetText(this,1390,170,'Le pont biscuit cassé',20).setAlpha(.7);
    sweetText(this,2840,170,'La cascade enchantée',20).setAlpha(.7);
    sweetText(this,1000,574,'Une petite pause au sec',13).setOrigin(.5).setDepth(4);
  }

  private createHud():void {
    const hud=this.add.container(0,0).setDepth(50).setScrollFactor(0);
    hud.add(sweetCard(this,18,16,142,50));
    this.hearts=[0,1,2].map(i=>sweetText(this,34+i*39,21,'♥',32).setColor('#e65d96'));
    hud.add(this.hearts);
    hud.add(sweetCard(this,326,12,248,57));
    hud.add(sweetText(this,450,20,'Niveau 2',20).setOrigin(.5,0));
    hud.add(sweetText(this,450,44,'La Rivière de Chocolat',13).setOrigin(.5,0));
    hud.add(sweetCard(this,653,16,128,50));
    hud.add(this.add.image(675,41,'sweet-star').setDisplaySize(26,26));
    this.counter=sweetText(this,697,29,'0 / 10',21); hud.add(this.counter);
    hud.add(sweetButton(this,835,41,'Pause',()=>this.pauseLevel(),92));
    this.hint=sweetText(this,450,98,'',17).setOrigin(.5).setWordWrapWidth(660).setAlign('center')
      .setBackgroundColor('#fff6ed').setPadding(12,7).setAlpha(0);
    hud.add(this.hint);
  }

  private bindPause():void {
    const escape=()=>{if(this.state==='paused') this.resumeLevel(); else this.pauseLevel();};
    const blur=()=>this.pauseLevel();
    this.input.keyboard!.on('keydown-ESC',escape);
    this.game.events.on(Phaser.Core.Events.BLUR,blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.keyboard?.off('keydown-ESC',escape);
      this.game.events.off(Phaser.Core.Events.BLUR,blur);
    });
  }

  private begin():void {
    if(this.state!=='intro') return;
    this.overlay?.destroy(); this.overlay=undefined; this.state='playing';
    this.physics.resume(); this.tweens.resumeAll(); this.input.keyboard?.resetKeys();
    this.showHint('Trouve dix étoiles ! ← → Marcher · Espace ou ↑ Sauter');
  }

  update(_time:number,delta:number):void {
    if(this.state!=='playing') return;
    this.clock+=delta;
    const body=this.player.body as Phaser.Physics.Arcade.Body;
    const direction=Number(this.cursors.right.isDown)-Number(this.cursors.left.isDown);
    if(this.clock>=this.knockbackUntil) body.setVelocityX(direction*RIVER_PHYSICS.speed);
    if(direction) this.player.setFlipX(direction<0);
    if(body.blocked.down||body.touching.down) this.lastGrounded=this.clock;
    if(Phaser.Input.Keyboard.JustDown(this.cursors.space)||Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.jumpUntil=this.clock+120;
    if(this.jumpUntil>this.clock&&this.clock-this.lastGrounded<110) {
      body.setVelocityY(-RIVER_PHYSICS.jump); this.lastGrounded=-1000; this.jumpUntil=0;
    }
    if(this.ferry.x>=FERRY.right) this.ferry.setVelocityX(-FERRY.speed);
    else if(this.ferry.x<=FERRY.left) this.ferry.setVelocityX(FERRY.speed);
    this.enemies.forEach(enemy=>{
      if(enemy.x>=Number(enemy.getData('right'))) enemy.setVelocityX(-32);
      else if(enemy.x<=Number(enemy.getData('left'))) enemy.setVelocityX(32);
      enemy.setFlipX(enemy.body!.velocity.x<0);
    });
    // Fallback catches even a missed overlap at low frame rates; respawn cannot loop.
    if(body.bottom>625) this.fallIntoChocolate();
  }

  private takeDamage(sourceX:number):boolean {
    if(this.state!=='playing'||this.clock<this.immuneUntil) return false;
    this.health--;
    this.hearts.forEach((heart,i)=>heart.setColor(i<this.health?'#e65d96':'#b9aabd'));
    if(this.health===0) { this.lose(); return true; }
    this.grantProtection(); this.knockbackUntil=this.clock+350;
    this.player.setVelocity(this.player.x<sourceX?-100:100,-240);
    return true;
  }

  private grantProtection():void {
    this.immuneUntil=this.clock+1500;
    this.tweens.killTweensOf(this.player); this.player.setAlpha(1);
    this.tweens.add({targets:this.player,alpha:.45,duration:150,yoyo:true,repeat:4,
      onComplete:()=>this.player.setAlpha(1)});
  }

  private fallIntoChocolate():void {
    if(this.state!=='playing') return;
    this.burst(this.player.x,RIVER_SURFACE,0xdfa060);
    this.takeDamage(this.player.x);
    if(this.state!=='playing') return;
    // Respawn even if already immune: never leave the player stranded in the hazard.
    const body=this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.respawn.x,this.respawn.y);
    this.player.setVelocity(0,0); this.grantProtection();
    this.lastGrounded=-1000; this.jumpUntil=0; this.knockbackUntil=this.clock+100;
    this.cameras.main.stopFollow(); this.cameras.main.centerOn(this.respawn.x,325);
    this.cameras.main.startFollow(this.player,true,.12,.12);
    this.showHint('Plouf ! Le chocolat chatouille. On réessaie !');
  }

  private pauseLevel():void {
    if(this.state!=='playing') return;
    this.state='paused'; this.physics.pause(); this.tweens.pauseAll();
    this.overlay=sweetPanel(this,'Une pause gourmande',
      '← → Marcher · Espace ou ↑ Sauter\nÉchap : pause ou reprise',[
        ['Reprendre',()=>this.resumeLevel()],['REJOUER',()=>this.scene.restart()],
        ['Menu principal',()=>this.scene.start('MenuScene')],
      ]);
  }

  private resumeLevel():void {
    if(this.state!=='paused') return;
    this.overlay?.destroy(); this.overlay=undefined; this.state='playing';
    this.physics.resume(); this.tweens.resumeAll(); this.input.keyboard?.resetKeys();
  }

  private lose():void {
    this.state='lost'; this.physics.pause(); this.tweens.pauseAll(); this.player.setVelocity(0).setAlpha(1);
    this.overlay=sweetPanel(this,'Oups ! Encore une aventure ? 💕','Croustille croit en toi. On repart ensemble !',[
      ['REJOUER',()=>this.scene.restart()],['Menu principal',()=>this.scene.start('MenuScene')],
    ]);
  }

  private win():void {
    this.state='won'; this.physics.pause(); this.tweens.pauseAll(); this.player.setVelocity(0).setAlpha(1);
    this.registry.set('level2Complete',true);
    this.registry.set('magicChocolateTablet',true);
    this.burst(this.player.x,this.player.y-60,0xffe49b);
    this.overlay=sweetPanel(this,'La Tablette de Chocolat Magique !',
      'Croustille : « Bravo ! Cette tablette servira au gâteau final. »\nElle est gardée pendant cette partie.',[
        ['NIVEAU SUIVANT →',()=>this.startNextLevel()],
        ['Retour au menu',()=>this.scene.start('MenuScene')],
        ['Rejouer la rivière',()=>this.scene.restart()],
      ],'river-tablet',0xe16e98);
    this.tweens.add({targets:this.tablet,angle:8,duration:500,yoyo:true,repeat:3});
  }

  private startNextLevel():void {
    if(this.state!=='won'||this.registry.get('level2Complete')!==true
      ||!this.scene.manager.keys['Level3Scene']) return;
    this.overlay?.destroy();
    this.overlay=undefined;
    this.scene.start('Level3Scene');
  }

  private showHint(message:string):void {
    this.tweens.killTweensOf(this.hint); this.hint.setText(message).setAlpha(1);
    this.tweens.add({targets:this.hint,alpha:0,delay:4500,duration:650});
  }

  private burst(x:number,y:number,color:number):void {
    for(let i=0;i<8;i++) {
      const star=this.add.star(x,y,4,2,6,color).setDepth(20);
      this.tweens.add({targets:star,x:x+Math.cos(i*Math.PI/4)*48,y:y+Math.sin(i*Math.PI/4)*40,
        alpha:0,duration:600,onComplete:()=>star.destroy()});
    }
  }
}
