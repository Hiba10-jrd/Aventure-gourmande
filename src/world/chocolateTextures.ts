import Phaser from 'phaser';
import heroUrl from '../assets/characters/heroine/new-heroine-transparent.png?url';
import starUrl from '../assets/objects/etoile.svg?url&no-inline';
import biscuitUrl from '../assets/objects/plateforme-biscuit.svg?url&no-inline';
import marshmallowUrl from '../assets/objects/guimauve.svg?url&no-inline';
import tabletUrl from '../assets/objects/tablette-magique.svg?url&no-inline';
import truffinouUrl from '../assets/enemies/truffinou.png?url';
import croustilleUrl from '../assets/characters/croustille/croustille.png?url';

export function preloadChocolateAssets(scene:Phaser.Scene):void {
  for(const [key,url] of [['sweet-hero',heroUrl],['river-truffinou',truffinouUrl],['river-croustille',croustilleUrl]]) {
    if(!scene.textures.exists(key)) scene.load.image(key,url);
  }
  const vectors=[
    {key:'sweet-star',url:starUrl,width:40,height:40},
    {key:'sweet-platform',url:biscuitUrl,width:170,height:28},
    {key:'river-marshmallow',url:marshmallowUrl,width:180,height:32},
    {key:'river-tablet',url:tabletUrl,width:96,height:112},
  ];
  vectors.forEach(({key,url,width,height})=>{
    if(!scene.textures.exists(key)) scene.load.svg(key,url,{width,height});
  });
}
