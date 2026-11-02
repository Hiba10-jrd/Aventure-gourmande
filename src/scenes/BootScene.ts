import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#fce7b2');

    this.add.text(400, 250, 'L\'AVENTURE GOURMANDE', {
      fontSize: '36px',
      color: '#7b3f20',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 310, 'Notre aventure commence !', {
      fontSize: '22px',
      color: '#9b5b35',
    }).setOrigin(0.5);
  }
}