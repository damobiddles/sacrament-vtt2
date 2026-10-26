import '../../../site/vtt/scene-pack.js';
const P=globalThis.SacramentScenePack;
export function validateScene(manifest){return P.validate(manifest);}
export function exportScene(state,id){
 const scene=Object.hasOwn(state.scenes,id)&&state.scenes[id];if(!scene)throw Error('No such scene.');
 const sources=[],refs=new Map();
 const image=src=>{if(!src)return null;if(!refs.has(src)){const ref='i'+(refs.size+1);refs.set(src,ref);sources.push({ref,src});}return refs.get(src);};
 const belongs=c=>c.sceneId===id||(c.sceneId==null&&id===state.table.scene);
 const eligible=Object.values(state.cards).filter(c=>belongs(c)&&['card','token'].includes(c.kind)&&!c.owner&&!c.charId&&!c.loot);
 const cards=eligible.map(c=>({kind:c.kind,name:c.name,desc:c.desc||'',image:image(c.img),visible:c.visible===true,hideNumbers:!!c.hideNumbers,attack:c.attack??null,hp:c.hp?.max??null,progress:c.progress?{max:c.progress.max,label:c.progress.label||'Effort'}:null,timer:c.timer?{max:c.timer.max,label:c.timer.label||'',auto:c.timer.auto!==false}:null,layout:state.layout[c.id]?{...state.layout[c.id]}:{x:50,y:50,w:16,h:22,z:1}}));
 const manifest={format:'sacrament-scene',version:1,name:scene.name,instructions:'',background:image(scene.bg),cards,drawings:(state.draw||[]).filter(d=>d.sceneId===id||(!d.sceneId&&id===state.table.scene)).map(d=>({color:d.color,points:d.pts.map(p=>p.slice())})),images:[]};
 return {manifest,sources,excluded: Object.values(state.cards).filter(c=>belongs(c)&&!eligible.includes(c)).length};
}
export function capacity(state,manifest,otherImages=0,otherBytes=0){
 validateScene(manifest);
 if(Object.keys(state.scenes).length>=20)throw Error('This table already has 20 scenes. Delete an unused scene first.');
 if(Object.keys(state.cards).length+manifest.cards.length+(manifest.instructions?1:0)>150)throw Error('There is not enough room for these cards. Existing cards will not be removed.');
 if((state.draw||[]).length+manifest.drawings.length>120)throw Error('There is not enough room for these drawings. Existing drawings will not be removed.');
 const images=Object.values(state.images||{});
 if(images.length+manifest.images.length+otherImages>60||images.reduce((n,i)=>n+i.size,0)+manifest.images.reduce((n,i)=>n+i.size,0)+otherBytes>60000000)throw Error('This table does not have enough image storage for the scene.');
}
