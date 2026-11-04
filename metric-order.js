"use strict";
window.APEX_METRIC_ORDER=(()=>{
 const storage='apex-metric-order';
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function ordered(metrics){let keys=[];try{keys=JSON.parse(localStorage.getItem(storage)||'[]');}catch{}if(!Array.isArray(keys))keys=[];const rank=new Map(keys.map((k,i)=>[k,i]));return [...metrics].sort((a,b)=>(rank.get(a.key)??Infinity)-(rank.get(b.key)??Infinity));}
 function moved(keys,source,target,after){if(source===target||!keys.includes(source)||!keys.includes(target))return [...keys];const next=keys.filter(k=>k!==source);next.splice(next.indexOf(target)+(after?1:0),0,source);return next;}
 function save(keys){try{const old=JSON.parse(localStorage.getItem(storage)||'[]');localStorage.setItem(storage,JSON.stringify([...keys,...(Array.isArray(old)?old:[]).filter(k=>!keys.includes(k))]));}catch{}}
 function preview(card){
  const ghost=card.cloneNode(true),originals=[card,...card.querySelectorAll('*')],copies=[ghost,...ghost.querySelectorAll('*')];
  // Keep the seat/control layout when the preview leaves its original container.
  originals.forEach((original,i)=>{const copy=copies[i],style=getComputedStyle(original);for(const name of ['display','grid-template-rows','grid-template-columns','gap','padding','height','min-height','max-height','align-items'])copy.style.setProperty(name,style.getPropertyValue(name));for(const attr of [...copy.attributes])if(attr.name.startsWith('data-')||attr.name==='id')copy.removeAttribute(attr.name);});
  ghost.classList.remove('weight-control');ghost.classList.add('metric-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;return ghost;
 }
 function bind({getMetrics,commit}){
  let drag=null,suppressClick=false;
  const cards=()=>[...document.querySelectorAll('.grandstand-card[data-control-metric]')].filter(e=>e.getClientRects().length&&!e.classList.contains('metric-drag-ghost'));
  const clearHints=()=>document.querySelectorAll('.metric-drop-before,.metric-drop-after').forEach(e=>e.classList.remove('metric-drop-before','metric-drop-after'));
  function frame(){
   if(!drag?.started)return;
   const d=drag;d.ghost.style.transform=`translate3d(${d.x-d.dx}px,${d.y-d.dy}px,0)`;
   const dock=document.querySelector('#metric-dock'),r=dock?.getBoundingClientRect();
   if(r&&r.height&&d.y>=r.top&&d.y<=r.bottom){const step=d.x<r.left+36?-12:d.x>r.right-36?12:0;if(step)dock.scrollLeft+=step;}
   const hit=document.elementFromPoint(d.x,d.y)?.closest('.grandstand-card[data-control-metric]');
   clearHints();d.target=null;
   if(hit&&hit!==d.card){const b=hit.getBoundingClientRect(),horizontal=!!hit.closest('#metric-dock');d.after=horizontal?d.x>b.left+b.width/2:d.y>b.top+b.height/2;d.target=hit.dataset.controlMetric;hit.classList.add(d.after?'metric-drop-after':'metric-drop-before');}
   d.frame=requestAnimationFrame(frame);
  }
  function finish(cancel=false){
   const d=drag;if(!d)return;drag=null;cancelAnimationFrame(d.frame);clearHints();d.card.classList.remove('metric-is-dragging');document.body.classList.remove('metric-order-dragging');
   if(!d.started)return;
   suppressClick=true;setTimeout(()=>{suppressClick=false;},0);
   const before=new Map(cards().map(e=>[e.dataset.controlMetric,e.getBoundingClientRect()]));
   const cellBefore=new Map([...document.querySelectorAll('.metric-cell,.metric-heading')].filter(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0&&r.left<innerWidth;}).map(e=>[`${e.closest('[data-driver]')?.dataset.driver||'head'}:${e.dataset.metric}`,e.getBoundingClientRect()]));
   const ghostRect=d.ghost.getBoundingClientRect();d.ghost.remove();
   if(!cancel&&d.target){const keys=getMetrics().map(m=>m.key),next=moved(keys,d.key,d.target,d.after);if(next.join()!==keys.join()){save(next);commit(next);}}
   const duration=reduced()?0:340,timing={duration,easing:'cubic-bezier(.22,.7,.2,1)'};
   // Read all destinations before starting transforms.
   const changes=cards().map(e=>({e,old:before.get(e.dataset.controlMetric),now:e.getBoundingClientRect()}));
   const cellChanges=[...document.querySelectorAll('.metric-cell,.metric-heading')].map(e=>({e,old:cellBefore.get(`${e.closest('[data-driver]')?.dataset.driver||'head'}:${e.dataset.metric}`),now:e.getBoundingClientRect()}));
   [...changes,...cellChanges].forEach(({e,old,now})=>{if(old&&(old.x!==now.x||old.y!==now.y))e.animate([{transform:`translate(${old.x-now.x}px,${old.y-now.y}px)`},{transform:'none'}],timing);});
   const destination=changes.find(c=>c.e.dataset.controlMetric===d.key);
   if(destination&&duration){document.body.append(d.ghost);const b=destination.now;d.ghost.animate([{transform:`translate(${ghostRect.x}px,${ghostRect.y}px)`,opacity:.6},{transform:`translate(${b.x}px,${b.y}px)`,opacity:0}],timing).onfinish=()=>d.ghost.remove();}
  }
  document.addEventListener('pointerdown',e=>{
   suppressClick=false;if(e.button!==0||e.target.closest('input,button,a'))return;
   const card=e.target.closest('.grandstand-card[data-control-metric]');if(!card)return;
   const r=card.getBoundingClientRect();drag={card,key:card.dataset.controlMetric,id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,dx:e.clientX-r.x,dy:e.clientY-r.y};
  });
  document.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;const d=drag;d.x=e.clientX;d.y=e.clientY;
   if(!d.started&&Math.hypot(d.x-d.startX,d.y-d.startY)>6){d.started=true;d.card.setPointerCapture(d.id);const r=d.card.getBoundingClientRect();d.ghost=preview(d.card);d.ghost.style.cssText+=`;position:fixed;left:0;top:0;width:${r.width}px;height:${r.height}px;min-height:${r.height}px;`;document.body.append(d.ghost);d.card.classList.add('metric-is-dragging');document.body.classList.add('metric-order-dragging');frame();}
   if(d.started)e.preventDefault();
  },{passive:false});
  document.addEventListener('pointerup',()=>finish());document.addEventListener('pointercancel',()=>finish(true));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')finish(true);});
  document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 }
 return {ordered,moved,bind};
})();
