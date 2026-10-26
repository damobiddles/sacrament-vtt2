/* Portable scene data only. Shared by browser and authoritative import validation. */
(function(root){
 'use strict';
 var MAX_FILE=28000000,MAX_IMAGES=60,MAX_BYTES=20000000,MAX_IMAGE=2500000;
 function bad(message){throw new Error(message);}
 function object(v,keys){if(!v||typeof v!=='object'||Array.isArray(v))bad('Invalid scene data.');Object.keys(v).forEach(function(k){if(!keys.includes(k))bad('Unexpected scene field: '+k);});return v;}
 function text(v,max){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))bad('Invalid or overlong scene text.');return v;}
 function num(v,min,max,integer){if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))bad('A scene number is outside its allowed range.');return v;}
 function bool(v){if(typeof v!=='boolean')bad('Invalid scene setting.');return v;}
 function list(v,max){if(!Array.isArray(v)||v.length>max)bad('Too many scene entries.');return v;}
 function validate(m){
  object(m,['format','version','name','instructions','background','cards','drawings','images']);
  if(m.format!=='sacrament-scene')bad('This is not a Sacrament scene file.');
  if(m.version!==1)bad('This scene uses an unsupported file version. Refresh the VTT or ask for a compatible export.');
  if(!text(m.name,60).trim())bad('Give the scene a name.');text(m.instructions,4000);
  var ids=new Set(),bytes=0;
  list(m.images,MAX_IMAGES).forEach(function(i){object(i,['ref','mime','size','sha256']);if(!/^i[1-9][0-9]{0,2}$/.test(i.ref)||ids.has(i.ref))bad('Invalid or duplicate image reference.');ids.add(i.ref);if(!['image/webp','image/png','image/jpeg'].includes(i.mime)||!/^[a-f0-9]{64}$/.test(i.sha256))bad('Invalid image description.');bytes+=num(i.size,1,MAX_IMAGE,true);});
  if(bytes>MAX_BYTES)bad('Scene images exceed the 20 MB limit.');
  function image(ref){if(ref!==null&&!ids.has(ref))bad('An image is missing from this scene.');}
  image(m.background);
  list(m.cards,149).forEach(function(c){object(c,['kind','name','desc','image','visible','hideNumbers','attack','hp','progress','timer','layout']);if(!['card','token'].includes(c.kind))bad('Heroes and loot cannot be imported in a scene.');text(c.name,60);text(c.desc,2000);image(c.image);bool(c.visible);bool(c.hideNumbers);if(c.attack!==null)num(c.attack,-10,10,true);if(c.hp!==null)num(c.hp,1,999,true);if(c.progress!==null){object(c.progress,['max','label']);num(c.progress.max,1,999,true);text(c.progress.label,40);}if(c.timer!==null){object(c.timer,['max','label','auto']);num(c.timer.max,1,99,true);text(c.timer.label,40);bool(c.timer.auto);}object(c.layout,['x','y','w','h','z']);num(c.layout.x,0,100);num(c.layout.y,0,100);num(c.layout.w,3,60);num(c.layout.h,3,80);num(c.layout.z,0,1000000);});
  list(m.drawings,120).forEach(function(d){object(d,['color','points']);if(!/^#[a-f0-9]{6}$/i.test(d.color))bad('Invalid drawing colour.');if(list(d.points,160).length<2)bad('A drawing needs two points.');d.points.forEach(function(p){if(!Array.isArray(p)||p.length!==2)bad('Invalid drawing point.');num(p[0],0,100);num(p[1],0,100);});});
  var used=new Set([m.background]);m.cards.forEach(function(c){used.add(c.image);});if(m.images.some(function(i){return !used.has(i.ref);}))bad('The file contains unused images.');
  return m;
 }
 function file(value){object(value,['manifest','assets']);validate(value.manifest);if(!Array.isArray(value.assets)||value.assets.length!==value.manifest.images.length)bad('Scene images are missing.');var seen=new Set();value.assets.forEach(function(a){object(a,['ref','data']);if(seen.has(a.ref)||!value.manifest.images.some(function(i){return i.ref===a.ref;}))bad('Invalid image reference.');seen.add(a.ref);if(typeof a.data!=='string'||a.data.length>MAX_IMAGE*1.4||(a.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.data)))bad('Invalid image encoding.');});return value;}
 function dimensions(bytes,mime){
  var v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=bytes.byteLength,w=0,h=0;
  function ascii(at,len){return String.fromCharCode.apply(null,bytes.subarray(at,at+len));}
  if(mime==='image/png'&&n>=45&&ascii(1,3)==='PNG'&&ascii(12,4)==='IHDR'&&ascii(n-8,4)==='IEND'){w=v.getUint32(16);h=v.getUint32(20);}
  if(mime==='image/webp'&&n>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'&&v.getUint32(4,true)+8===n){
   var type=ascii(12,4);
   if(type==='VP8X'){w=1+bytes[24]+256*bytes[25]+65536*bytes[26];h=1+bytes[27]+256*bytes[28]+65536*bytes[29];}
   if(type==='VP8 '&&ascii(23,3)==='\x9d\x01\x2a'){w=v.getUint16(26,true)&16383;h=v.getUint16(28,true)&16383;}
   if(type==='VP8L'&&bytes[20]===47){var bits=v.getUint32(21,true);w=(bits&16383)+1;h=((bits>>>14)&16383)+1;}
  }
  if(mime==='image/gif'&&n>=10&&ascii(0,3)==='GIF'){w=v.getUint16(6,true);h=v.getUint16(8,true);}
  if(mime==='image/jpeg'&&n>4&&bytes[0]===255&&bytes[1]===216&&bytes[n-2]===255&&bytes[n-1]===217){
   for(var at=2;at+8<n;){if(bytes[at++]!==255)break;while(bytes[at]===255)at++;var marker=bytes[at++];if(marker===218||marker===217)break;var len=v.getUint16(at);if(len<2||at+len>n)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){h=v.getUint16(at+3);w=v.getUint16(at+5);break;}at+=len;}
  }
  if(!w||!h||w>4096||h>4096||w*h>16000000)bad('A scene image is invalid or exceeds the safe image dimensions.');return {width:w,height:h};
 }
 root.SacramentScenePack={validate:validate,file:file,dimensions:dimensions,MAX_FILE:MAX_FILE,MAX_BYTES:MAX_BYTES};
})(typeof window==='undefined'?globalThis:window);
