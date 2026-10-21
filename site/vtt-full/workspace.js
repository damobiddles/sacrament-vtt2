
/* Workspace navigation delegates to the existing VTT event handlers.
   No rules, network actions or persistence formats are reimplemented here. */
(function(){
  'use strict';
  const nav=document.getElementById('worknav');
  if(!nav)return;
  const panel=document.getElementById('panel');
  const app=document.getElementById('app');
  const buttons=Array.from(nav.querySelectorAll('[data-worktab]'));
  function active(tab){buttons.forEach(b=>b.classList.toggle('active',b.dataset.worktab===tab));}
  function openTab(tab){
    document.body.classList.remove('work-hide-panel');
    document.getElementById('workPanel').setAttribute('aria-pressed','true');
    // Existing selection can be dismissed using the application's own action.
    if(!panel.querySelector('[data-do="gmtab"]')){
      const existing=panel.querySelector('[data-do="deselect"]');
      if(existing)existing.click();
      else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    }
    const original=panel.querySelector('[data-do="gmtab"][data-t="'+tab+'"]');
    if(original){original.click();active(tab);}
    else active(null); // Player mode or no active table: never invent GM permissions.
  }
  nav.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.worktab){openTab(b.dataset.worktab);return;}
    if(b.id==='workFeed'||b.id==='workPanel'){
      const isFeed=b.id==='workFeed',cls=isFeed?'work-hide-feed':'work-hide-panel';
      document.body.classList.toggle(cls);
      b.setAttribute('aria-pressed',String(!document.body.classList.contains(cls)));
    }
  });
  // A selected token is inspected in the same existing panel, not in a duplicate UI.
  const observer=new MutationObserver(()=>{
    if(app.hidden)return;
    const selected=panel.querySelector('[data-do="deselect"]');
    if(selected)active(null);
  });
  observer.observe(panel,{childList:true});
  active('play');
})();
