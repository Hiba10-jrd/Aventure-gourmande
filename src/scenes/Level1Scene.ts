import Phaser from 'phaser';
import { preloadForestAssets } from '../world/forestTextures';

const TOTAL = 9;
// The grass surface in the 900 × 650 background, independent of its brown soil.
const GROUND_Y = 520;
const PLATFORM_HEIGHT = 28;
// Jump apex: 490² / (2 × 900) ≈ 133px. First rise: 120px; next rises: 90px.
// Coordinates refer to sprite centers; the walkable surface is 14px higher.
const LEDGES = [
  { x: 260, y: GROUND_Y - 120 + PLATFORM_HEIGHT / 2 },
  { x: 455, y: GROUND_Y - 210 + PLATFORM_HEIGHT / 2 },
  { x: 660, y: GROUND_Y - 300 + PLATFORM_HEIGHT / 2 },
];

export class Level1Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies: Phaser.Physics.Arcade.Sprite[] = [];
  private counter!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private exitGlow!: Phaser.GameObjects.Ellipse;
  private overlay?: Phaser.GameObjects.Container;
  private collected = 0;
  private state: 'playing' | 'paused' | 'won' | 'lost' = 'playing';
  private health = 3;
  private hearts: Phaser.GameObjects.Text[] = [];
  private pausedAt = 0;
  private knockbackUntil = 0;
  private immuneUntil = 0;
  private lastGrounded = -1000;
  private jumpUntil = 0;

  constructor() { super('Level1Scene'); }

  preload(): void {
    preloadForestAssets(this);
  }

  create(): void {
    this.health = 3; this.hearts = []; this.pausedAt = 0; this.knockbackUntil = 0;
    this.tweens.resumeAll();
    this.collected = 0; this.state = 'playing'; this.enemies = [];
    this.overlay = undefined; this.immuneUntil = 0; this.lastGrounded = -1000; this.jumpUntil = 0;
    this.physics.resume();
    this.drawForest();
    const platforms = this.physics.add.staticGroup();
    const ground = this.add.zone(450, GROUND_Y + 65, 900, 130);
    this.physics.add.existing(ground, true);
    // Keep ground and floating platforms separate: candy monsters patrol only the ground.
    LEDGES.forEach(p => platforms.create(p.x, p.y, 'sweet-platform'));
    this.player = this.physics.add.sprite(65, GROUND_Y, 'sweet-hero').setDepth(5);
    // The 1122 × 1402 PNG has visible artwork from y=14 to y=1355.
    // Anchor at the soles so the initial position matches the collision surface.
    const heroScale = 104 / 1342;
    this.player.setOrigin(.5, 1356 / 1402).setScale(heroScale);
    this.player.setCollideWorldBounds(true).setGravityY(900);
    // Center a 30 × 74 world-pixel body, excluding the ponytail/backpack.
    // Symmetric horizontal padding keeps the hitbox aligned when flipped.
    this.player.body!.setSize(30 / heroScale, 74 / heroScale)
      .setOffset((this.player.width - 30 / heroScale) / 2, 1356 - 74 / heroScale);
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.player, ground);
    this.cursors = this.input.keyboard!.createCursorKeys();
    const candies = this.physics.add.staticGroup();
    [{x:120,y:GROUND_Y-42},{x:440,y:GROUND_Y-42},{x:735,y:GROUND_Y-42},
      ...LEDGES.flatMap(p => [-45,45].map(offset => ({
        x:p.x+offset, y:p.y-PLATFORM_HEIGHT/2-34,
      })))].forEach(p => {
      const star = candies.create(p.x, p.y, 'sweet-star') as Phaser.Physics.Arcade.Image;
      star.setDepth(4);
      this.tweens.add({targets:star, angle:12, scale:1.12, duration:800, yoyo:true, repeat:-1});
    });
    this.physics.add.overlap(this.player, candies, (_player, item) => {
      const star = item as Phaser.Physics.Arcade.Image;
      if (!star.active || this.state !== 'playing') return;
      this.sparkles(star.x, star.y); this.tweens.killTweensOf(star); star.destroy();
      this.collected++; this.counter.setText(this.collected + ' / ' + TOTAL);
      this.tone(660 + this.collected * 45);
      if (this.collected === TOTAL) {
        this.showHint('Bravo ! Rejoins la porte magique à droite !');
        this.tweens.add({targets:this.exitGlow,alpha:.65,duration:700,yoyo:true,repeat:-1});
      }
    });
    [365, 620].forEach((x, i) => {
      const enemy = this.physics.add.sprite(x, GROUND_Y, 'sweet-jelly').setDepth(4);
      enemy.setOrigin(.5, .955).setDisplaySize(60, 60 * enemy.height / enemy.width);
      // Exclude transparent padding and keep the collision base at the candy's feet.
      enemy.body!.setSize(enemy.width * .76, enemy.height * .885)
        .setOffset(enemy.width * .12, enemy.height * .07);
      enemy.setCollideWorldBounds(true).setGravityY(900).setVelocityX(i ? -40 : 40).setData('home', x);
      this.physics.add.collider(enemy, ground); this.enemies.push(enemy);
      // Rotation is visual only: the Arcade body keeps a stable size and floor contact.
      this.tweens.add({targets:enemy,angle:3,duration:380+i*70,
        yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    });
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => this.bump(enemy as Phaser.Physics.Arcade.Sprite));
    const exit = this.add.zone(835, GROUND_Y-60, 80, 120);
    this.physics.add.existing(exit, true);
    this.physics.add.overlap(this.player, exit, () => {
      if (this.state !== 'playing') return;
      if (this.collected === TOTAL) this.win();
      else if(this.hint.alpha===0) this.showHint('Encore ' + (TOTAL-this.collected) + ' étoiles à trouver. Tu peux le faire !');
    });
    this.hudCard(18,16,142,50);
    this.hearts = [0,1,2].map(i=>this.label(34+i*39,21,'♥',32).setColor('#e65d96').setDepth(11));
    this.hudCard(326,12,248,57);
    this.label(450,20,'Niveau 1',20).setOrigin(.5,0).setDepth(11);
    this.label(450,44,'La Forêt des Bonbons',13).setOrigin(.5,0).setDepth(11);
    this.hudCard(665,16,116,50);
    this.add.image(686,41,'sweet-star').setDisplaySize(26,26).setDepth(11);
    this.counter = this.label(707,29,'0 / 9',21).setDepth(11);
    this.button(835,41,'Pause',()=>this.pauseLevel(),92).setDepth(11);
    this.hint = this.label(450,94,'',17).setOrigin(.5).setDepth(10)
      .setBackgroundColor('#fff6ed').setPadding(12,7);
    this.showHint('Trouve les 9 étoiles, puis rejoins la porte !');
    this.children.list.forEach(child=>{
      const ui = child as Phaser.GameObjects.Text;
      if(ui.depth>=10) ui.setScrollFactor(0);
    });
    const pause = () => { if (this.state === 'paused') this.resumeLevel(); else this.pauseLevel(); };
    const blur = () => this.pauseLevel();
    this.input.keyboard!.on('keydown-ESC',pause);
    this.game.events.on(Phaser.Core.Events.BLUR,blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.keyboard?.off('keydown-ESC',pause);
      this.game.events.off(Phaser.Core.Events.BLUR,blur);
    });
  }

  update(time:number):void {
    if(this.state !== 'playing') return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const direction = Number(this.cursors.right.isDown)-Number(this.cursors.left.isDown);
    if(time > this.knockbackUntil) body.setVelocityX(direction*235);
    if(direction) this.player.setFlipX(direction<0);
    if(body.blocked.down) this.lastGrounded=time;
    if(Phaser.Input.Keyboard.JustDown(this.cursors.space)||Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.jumpUntil=time+120;
    if(this.jumpUntil>time && time-this.lastGrounded<110) {
      body.setVelocityY(-490); this.lastGrounded=-1000; this.jumpUntil=0;
    }
    this.enemies.forEach(enemy=>{
      const home=enemy.getData('home') as number;
      if(enemy.x>home+65) enemy.setVelocityX(-40);
      if(enemy.x<home-65) enemy.setVelocityX(40);
      enemy.setFlipX(enemy.body!.velocity.x<0);
    });
  }

  private bump(enemy:Phaser.Physics.Arcade.Sprite):void {
    if(this.state!=='playing'||this.time.now<this.immuneUntil)return;
    this.health--;
    this.hearts.forEach((heart,i)=>heart.setColor(i<this.health?'#e65d96':'#b9aabd'));
    if(this.health===0) {
      this.state='lost'; this.physics.pause(); this.tweens.pauseAll();
      this.player.setVelocity(0).setAlpha(1);
      this.showPanel('Oh non ! On réessaie ? 💕','La forêt t’attend pour une nouvelle aventure !',[
        ['REJOUER',()=>this.scene.restart()],['Menu principal',()=>this.scene.start('MenuScene')]]);
      return;
    }
    this.immuneUntil=this.time.now+1500;
    this.knockbackUntil=this.time.now+350;
    this.player.setVelocity(this.player.x<enemy.x?-100:100,-240);
    this.tweens.add({targets:this.player,alpha:.45,duration:150,yoyo:true,repeat:4,
      onComplete:()=>this.player.setAlpha(1)});
    this.showHint('Boing ! Saute par-dessus les petits bonbons !');
  }

  private pauseLevel():void {
    if(this.state!=='playing')return;
    this.pausedAt=this.time.now;
    this.state='paused'; this.physics.pause(); this.tweens.pauseAll();
    this.showPanel('Une petite pause','← → Marcher · Espace ou ↑ Sauter\nÉchap : pause ou reprise',[
      ['Reprendre',()=>this.resumeLevel()],['Recommencer',()=>this.scene.restart()],
      ['Menu principal',()=>this.scene.start('MenuScene')]]);
  }

  private resumeLevel():void {
    if(this.state!=='paused')return;
    this.overlay?.destroy(); this.overlay=undefined; this.state='playing';
    const pauseDuration=this.time.now-this.pausedAt;
    this.immuneUntil+=pauseDuration; this.knockbackUntil+=pauseDuration;
    this.physics.resume(); this.tweens.resumeAll(); this.input.keyboard?.resetKeys();
  }

  private win():void {
    this.state='won'; this.physics.pause(); this.player.setVelocity(0); this.tone(1047);
    this.registry.set('level1Complete',true);
    this.showPanel('Bravo, petite aventurière !','9 étoiles trouvées ! La forêt brille grâce à toi.',[
      ['Rejouer',()=>this.scene.restart()],
      ['Niveau suivant',()=>this.scene.start('Level2Scene')],
      ['Menu principal',()=>this.scene.start('MenuScene')]]);
    for(let i=0;i<12;i++)this.sparkles(Phaser.Math.Between(100,800),Phaser.Math.Between(140,450));
  }

  private showPanel(title:string,subtitle:string,actions:[string,()=>void][]):void {
    const shade=this.add.rectangle(450,325,900,650,0x36234e,.6).setInteractive();
    const card=this.add.rectangle(450,325,650,410,0xfffaf1).setStrokeStyle(4,0xe5add1);
    const heading=this.label(450,175,title,29).setOrigin(.5);
    const detail=this.label(450,232,subtitle,19).setOrigin(.5).setAlign('center');
    this.overlay=this.add.container(0,0,[shade,card,heading,detail]).setDepth(30).setScrollFactor(0);
    actions.forEach(([name,action],i)=>this.overlay!.add(this.button(450,310+i*75,name,action,330)));
  }

  private label(x:number,y:number,text:string,size:number):Phaser.GameObjects.Text {
    return this.add.text(x,y,text,{fontFamily:'Trebuchet MS, sans-serif',fontSize:size+'px',color:'#54375d',fontStyle:'bold'});
  }

  private showHint(message:string):void {
    this.tweens.killTweensOf(this.hint);
    this.hint.setText(message).setAlpha(1);
    this.tweens.add({targets:this.hint,alpha:0,delay:4500,duration:650});
  }

  private hudCard(x:number,y:number,width:number,height:number):void {
    const card=this.add.graphics().setDepth(10).setScrollFactor(0);
    card.fillStyle(0x54375d,.12).fillRoundedRect(x,y+3,width,height,16);
    card.fillStyle(0xfffaf1,.84).fillRoundedRect(x,y,width,height,16);
    card.lineStyle(1,0xeac4de,.9).strokeRoundedRect(x,y,width,height,16);
  }

  private button(x:number,y:number,text:string,action:()=>void,width:number):Phaser.GameObjects.Container {
    const bg=this.add.graphics();
    const paint=(color:number)=>{
      bg.clear().fillStyle(0x54375d,.15).fillRoundedRect(-width/2,-24,width,54,16);
      bg.fillStyle(color).fillRoundedRect(-width/2,-27,width,54,16);
      bg.lineStyle(2,0xe1c5ef).strokeRoundedRect(-width/2,-27,width,54,16);
    };
    paint(0x8660a9);
    const label=this.label(0,0,text,width<100?17:21).setColor('#ffffff').setOrigin(.5);
    const button=this.add.container(x,y,[bg,label]).setSize(width,54).setInteractive({useHandCursor:true});
    button.on('pointerover',()=>paint(0xa077bf));
    button.on('pointerout',()=>paint(0x8660a9));
    button.on('pointerdown',action);
    return button;
  }

  private sparkles(x:number,y:number):void {
    for(let i=0;i<8;i++){
      const spark=this.add.star(x,y,4,2,6,i%2?0xffdf75:0xffffff).setDepth(40);
      this.tweens.add({targets:spark,x:x+Math.cos(i*Math.PI/4)*48,y:y+Math.sin(i*Math.PI/4)*48,alpha:0,duration:550,onComplete:()=>spark.destroy()});
    }
  }

  private tone(frequency:number):void {
    if(!(this.sound instanceof Phaser.Sound.WebAudioSoundManager)||this.sound.locked)return;
    const context=this.sound.context;
    if(context.state!=='running')return;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.frequency.setValueAtTime(frequency,context.currentTime);
    gain.gain.setValueAtTime(.08,context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime+.2);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }

  private drawForest():void {
    this.add.image(0, 0, 'sweet-background').setOrigin(0).setDisplaySize(900, 650);
    this.exitGlow=this.add.ellipse(840,GROUND_Y-58,100,134,0xffe49b,.12).setDepth(1);
    const frame=this.add.graphics().setDepth(2);
    frame.fillStyle(0xa97bc1).fillRoundedRect(800,GROUND_Y-120,80,120,{tl:38,tr:38,bl:8,br:8});
    frame.lineStyle(5,0xffe5a0).strokeRoundedRect(800,GROUND_Y-120,80,120,{tl:38,tr:38,bl:8,br:8});
    this.add.ellipse(840,GROUND_Y-61,60,100,0xe9c8f6).setDepth(2);
    this.add.star(840,GROUND_Y-65,5,10,22,0xffe49b).setDepth(3);
    this.add.circle(861,GROUND_Y-34,4,0xfffaf1).setDepth(3);
    this.label(840,GROUND_Y-140,'SORTIE',15).setOrigin(.5).setDepth(3);
  }

}

