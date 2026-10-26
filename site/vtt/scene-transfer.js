/* A single GM-only dialog; no file contents are inserted as HTML or executed. */
(function(root){
 'use strict';
 var api,box,epoch=0,busy=false,pack=null,fingerprint='',job='',urls=[];
 var P=root.SacramentScenePack;
 function $(id){return document.getElementById(id);}
 function message(text){$('sceneTransferStatus').textContent=text;}
 function guard(version,turn){if(version!==api.version()||turn!==epoch)throw Error('This scene operation was cancelled.');}
 function lock(value){busy=value;box.querySelectorAll('button,input,textarea').forEach(function(e){e.disabled=value;});}
 function reset(){epoch++;busy=false;pack=null;job='';urls.forEach(URL.revokeObjectURL);urls=[];if(box){box.hidden=true;box.replaceChildren();}}
 function close(){if(busy)return;var old=job;job='';if(old)api.request({op:'sceneCancel',jobId:old}).catch(function(){});root.SacramentDialogs.close(box);reset();}
 function open(mode){
  if(!api.gm())return false;
  reset();box.hidden=false;
  box.innerHTML='<div class="scene-transfer-body"><h2 id="sceneTransferTitle"></h2><p id="sceneTransferIntro"></p><div id="sceneTransferContent"></div><p id="sceneTransferStatus" role="status"></p><div class="row"><button type="button" class="btn" id="sceneTransferGo"></button><button type="button" class="btn ghost" id="sceneTransferClose">Cancel</button></div></div>';
  $('sceneTransferClose').onclick=close;root.SacramentDialogs.open(box,document.activeElement);
  $('sceneTransferTitle').textContent=mode==='export'?'Export scene':'Import scene';
  $('sceneTransferGo').textContent=mode==='export'?'Download scene':'Add scene';
  $('sceneTransferClose').focus();return true;
 }
 function paragraph(text){var p=document.createElement('p');p.textContent=text;$('sceneTransferContent').appendChild(p);return p;}
 function label(text,kind,id){var l=document.createElement('label'),input=document.createElement(kind);l.textContent=text;input.id=id;l.appendChild(input);$('sceneTransferContent').appendChild(l);return input;}
 function summary(m){paragraph(m.name+' · '+m.cards.length+' encounter cards · '+m.drawings.length+' drawings · '+m.images.length+' images.');var ul=document.createElement('ul');m.cards.forEach(function(c){var li=document.createElement('li');li.textContent=c.name+(c.visible?'':' (hidden)');ul.appendChild(li);});$('sceneTransferContent').appendChild(ul);}
 async function digest(bytes){var result=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');}
 function base64(blob){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(String(r.result).split(',')[1]);};r.onerror=function(){reject(Error('Could not read an image.'));};r.readAsDataURL(blob);});}
 function bytes(data){var s=atob(data),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
 function mime(b){if(b[0]===137&&b[1]===80)return 'image/png';if(b[0]===255&&b[1]===216)return 'image/jpeg';if(String.fromCharCode.apply(null,b.subarray(0,4))==='RIFF')return 'image/webp';if(String.fromCharCode.apply(null,b.subarray(0,3))==='GIF')return 'image/gif';throw Error('A scene picture is not a supported image.');}
 async function readPicture(src){
  var u=new URL(src,location.origin);if(u.origin!==location.origin&&u.protocol!=='https:')throw Error('Upload this scene picture directly before exporting.');
  var response=await fetch(u.href,{credentials:u.origin===location.origin?'same-origin':'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('A scene picture could not be downloaded. Upload it directly and try again.');
  var reader=response.body.getReader(),chunks=[],size=0;
  for(;;){var r=await reader.read();if(r.done)break;size+=r.value.length;if(size>12000000){await reader.cancel();throw Error('A linked picture is too large. Upload a smaller copy to this scene first.');}chunks.push(r.value);}
  var b=new Uint8Array(await new Blob(chunks).arrayBuffer()),type=mime(b);P.dimensions(b,type);
  var bitmap=await createImageBitmap(new Blob([b],{type:type})),scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/webp',.86);});if(!blob||blob.size>2500000)throw Error('A picture is too large after optimisation. Please upload a smaller copy.');
  return {mime:blob.type,size:blob.size,sha256:await digest(await blob.arrayBuffer()),data:await base64(blob)};
 }
 async function checkFile(value){
  P.file(value);
  for(var image of value.manifest.images){var a=value.assets.find(function(x){return x.ref===image.ref;}),b=bytes(a.data);if(b.length!==image.size||await digest(b)!==image.sha256)throw Error('A scene image is missing or damaged.');P.dimensions(b,image.mime);var bitmap=await createImageBitmap(new Blob([b],{type:image.mime}));bitmap.close();}
  return digest(new TextEncoder().encode(JSON.stringify(value)));
 }
 async function exportOpen(){
  if(!open('export'))return;var version=api.version(),turn=epoch;lock(true);message('Reading the selected scene…');
  $('sceneTransferIntro').textContent='Share a fresh encounter. Heroes, loot, player information, history and existing private notes are excluded. Anyone receiving the file can inspect hidden cards and included instructions.';
  try{
   var exported=await api.request({op:'sceneExport',sceneId:api.scene()});guard(version,turn);
   if(exported.sources.length>60)throw Error('This scene uses too many different pictures. Keep at most 60 before exporting.');
   var manifest=exported.manifest;summary({...manifest,images:exported.sources});
   paragraph('Enemy HP will reset to full, Effort progress to zero and timers to their full length. Image copies are optimised and embedded; animated images become still pictures.');
   var notes=label('Instructions to share with another GM (optional; remove campaign secrets)','textarea','sceneShareNotes');notes.maxLength=4000;notes.rows=4;
   $('sceneTransferGo').onclick=async function(){
    lock(true);try{guard(version,turn);manifest.instructions=notes.value;manifest.images=[];var assets=[];
     for(var source of exported.sources){message('Preparing picture '+(assets.length+1)+' of '+exported.sources.length+'…');var img=await readPicture(source.src);guard(version,turn);manifest.images.push({ref:source.ref,mime:img.mime,size:img.size,sha256:img.sha256});assets.push({ref:source.ref,data:img.data});}
     var value={manifest:manifest,assets:assets};P.file(value);var blob=new Blob([JSON.stringify(value)],{type:'application/json'});if(blob.size>P.MAX_FILE)throw Error('This scene file is too large. Use fewer or smaller images.');
     var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(manifest.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'scene')+'.sacrament-scene';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);message('Scene file downloaded. Your game has not changed.');
    }catch(e){if(turn===epoch)message(e.message+' No scene file was created.');}finally{if(turn===epoch)lock(false);}
   };message('Ready to export. Review descriptions and pictures for anything you do not want to share.');lock(false);
  }catch(e){if(turn===epoch){message(e.message);lock(false);$('sceneTransferGo').disabled=true;}}
 }
 function importOpen(){
  if(!open('import'))return;var version=api.version(),turn=epoch;
  $('sceneTransferIntro').textContent='Add a separate, prepared scene. Your live scene, heroes, loot, Horror, rules and turn order stay as they are. Timers arrive paused. Review the scene before showing it to players.';
  var input=label('Choose a Sacrament scene file','input','sceneImportFile');input.type='file';input.accept='.sacrament-scene,application/json';
  var preview=document.createElement('div');preview.id='sceneImportPreview';$('sceneTransferContent').appendChild(preview);$('sceneTransferGo').disabled=true;
  input.onchange=async function(){
   if(job){await api.request({op:'sceneCancel',jobId:job}).catch(function(){});job='';}if(version!==api.version()||turn!==epoch)return;pack=null;fingerprint='';urls.forEach(URL.revokeObjectURL);urls=[];preview.replaceChildren();var file=input.files[0];if(!file)return;lock(true);message('Checking scene file and pictures…');
   try{if(file.size>P.MAX_FILE)throw Error('This file exceeds the scene size limit.');var value=JSON.parse(await file.text());var hash=await checkFile(value);guard(version,turn);var result=await api.request({op:'sceneCheck',manifest:value.manifest,packId:hash});guard(version,turn);pack=value;fingerprint=hash;
    var title=document.createElement('h3');title.textContent=value.manifest.name;preview.appendChild(title);
    var p=document.createElement('p');p.textContent=value.manifest.cards.length+' encounter cards, '+value.manifest.drawings.length+' drawings and '+value.manifest.images.length+' images.';preview.appendChild(p);
    if(value.manifest.background){var asset=value.assets.find(function(a){return a.ref===value.manifest.background;}),meta=value.manifest.images.find(function(i){return i.ref===asset.ref;}),url=URL.createObjectURL(new Blob([bytes(asset.data)],{type:meta.mime}));urls.push(url);var img=document.createElement('img');img.src=url;img.alt='Scene background preview';preview.appendChild(img);}
    if(value.manifest.instructions){var instructions=document.createElement('p');instructions.textContent=value.manifest.instructions;preview.appendChild(instructions);}
    if(result.duplicates.length){var check=label('This scene is already in your table. Import another copy?','input','sceneImportDuplicate');check.type='checkbox';check.parentElement.className='check';}
    message('File checked. The new scene will stay private until you show it.');
   }catch(e){if(turn===epoch)message('Cannot import: '+e.message);}finally{if(turn===epoch){lock(false);$('sceneTransferGo').disabled=!pack;}}
  };
  $('sceneTransferGo').onclick=async function(){
   if(!pack||busy)return;var duplicate=$('sceneImportDuplicate');if(duplicate&&!duplicate.checked){message('Tick “Import another copy” to add this scene again.');duplicate.focus();return;}
   lock(true);try{
    guard(version,turn);if(!job){var random=crypto.getRandomValues(new Uint8Array(12));job=Array.from(random).map(function(n){return n.toString(16).padStart(2,'0');}).join('');}
    message('Preparing a private scene…');var begun=await api.request({op:'sceneBegin',jobId:job,packId:fingerprint,manifest:pack.manifest,allowDuplicate:!!duplicate});guard(version,turn);
    var result=begun.result;
    if(!result.alreadyImported){for(var asset of pack.assets){guard(version,turn);message('Uploading picture '+(pack.assets.indexOf(asset)+1)+' of '+pack.assets.length+'…');await api.request({op:'sceneStage',jobId:job,ref:asset.ref,data:asset.data});guard(version,turn);}message('Saving the complete scene…');var committed=await api.commit(job);guard(version,turn);if(!committed)throw Error('The save could not be confirmed. Retry to check it safely.');result=committed.result;}
    job='';message('Scene added privately. Timers are paused. Open it in Scene to review, then choose Show to players.');pack=null;$('sceneTransferGo').hidden=true;$('sceneTransferClose').textContent='Done';
   }catch(e){if(turn===epoch)message(e.message+' You can retry safely; no partial encounter is added.');}finally{if(turn===epoch)lock(false);}
  };
 }
 root.SacramentSceneTransfer={init:function(options){api=options;box=$('sceneTransferOverlay');box.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();}});},export:exportOpen,import:importOpen,reset:reset};
})(window);
