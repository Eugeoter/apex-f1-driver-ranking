"use strict";
window.APEX_RANK_TRACE = (() => {
  function pathFor(points) {
    let connected=false;
    return points.map(p=>{if(p.y==null){connected=false;return '';}const part=`${connected?'L':'M'}${p.x},${p.y}`;connected=true;return part;}).join(' ').trim();
  }
  // Ranks are ordinal positions, not scores. Never connect missing observations.
  function layout(entries) {
    const ranks=entries.map(e=>e.rank).filter(Number.isFinite);
    const maximum=Math.max(5,Math.ceil(Math.max(1,...ranks)/5)*5);
    const width=Math.max(228,56+(entries.length-1)*38),left=36,right=width-16,top=22,bottom=116;
    const points=entries.map((entry,i)=>({x:left+i*(right-left)/Math.max(1,entries.length-1),y:Number.isFinite(entry.rank)?top+(entry.rank-1)/(maximum-1)*(bottom-top):null}));
    const ticks=[1,Math.round((maximum+1)/2),maximum].map(rank=>({rank,y:top+(rank-1)/(maximum-1)*(bottom-top)}));
    const path=pathFor(points);
    return {maximum,width,points,ticks,path};
  }
  function render(host,{name,flag,key,entries,labels,escape,collapsed}) {
    const signature=JSON.stringify([name,flag,key,entries,labels,collapsed]);
    if(host.traceSignature===signature)return;
    cancelAnimationFrame(host.traceFrame);host.traceFrame=0;
    const oldDriver=host.dataset.driver,previous=host.traceLayout,oldPoints=new Map((host.traceEntries||[]).map((e,i)=>[e.id,(host.traceDisplayed||previous?.points)?.[i]]));
    const scroll=host.querySelector('.rank-trace-plot')?.scrollLeft||0,listScroll=host.querySelector('.rank-trace-list')?.scrollTop||0;
    const plot=layout(entries),base=entries[0]?.rank;
    const delta=rank=>rank==null||base==null?'—':base-rank>0?`▲${base-rank}`:base-rank<0?`▼${rank-base}`:'=';
    const description=entries.map(e=>`${e.name}: ${e.rank==null?'—':'P'+e.rank}`).join('; ');
    host.traceSignature=signature;host.dataset.driver=key;host.classList.toggle('is-collapsed',collapsed);
    host.setAttribute('aria-label',labels.title);host.setAttribute('role','region');
    host.innerHTML=`<div class="rank-trace-head"><div class="rank-trace-driver">${flag}<strong title="${escape(name)}">${escape(name)}</strong></div><button class="rank-trace-toggle" data-trace-toggle aria-expanded="${!collapsed}" aria-label="${escape(collapsed?labels.title:labels.collapse)}" title="${escape(collapsed?labels.title:labels.collapse)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 9 11l5 3 6-9M4 4v16h17"/></svg></button></div>
      <div class="rank-trace-content" ${collapsed?'hidden':''}>
        <div class="rank-trace-caption"><span>${escape(labels.title)}</span><span>${escape(labels.bestFirst)}</span></div>
        <div class="rank-trace-plot"><svg class="rank-trace-chart" viewBox="0 0 ${plot.width} 143" style="min-width:${plot.width}px" role="img" aria-label="${escape(description)}">
          ${plot.ticks.map(t=>`<path class="rank-trace-grid" d="M36 ${t.y}H${plot.width-16}"/><text class="rank-trace-axis" x="28" y="${t.y+3}" text-anchor="end">P${t.rank}</text>`).join('')}
          <path class="rank-trace-line" d="${plot.path}"/>
          ${entries.map((entry,i)=>{const p=plot.points[i];return `<g class="rank-trace-point" data-trace-point="${escape(entry.id)}"><title>${escape(entry.name)}: ${entry.rank==null?'—':'P'+entry.rank}</title>${p.y==null?`<text class="rank-trace-missing" x="${p.x}" y="72" text-anchor="middle">—</text>`:`<circle cx="${p.x}" cy="${p.y}" r="4"/><text class="rank-trace-value" x="${p.x}" y="${p.y-9}" text-anchor="middle">P${entry.rank}</text>`}</g><text class="rank-trace-axis" x="${p.x}" y="137" text-anchor="middle">${i+1}</text>`;}).join('')}
        </svg></div>
        <div class="rank-trace-columns"><span>${escape(labels.setup)}</span><span>${escape(labels.rank)}</span><span title="${escape(labels.reference)}">Δ / 1</span></div>
        <div class="rank-trace-list">${entries.map((entry,i)=>`<button class="rank-trace-entry" data-locate-scenario="${escape(entry.id)}" data-locate-driver="${escape(key)}" title="${escape(entry.name+' · '+labels.reference)}"><span class="rank-trace-index">${i+1}</span><span class="rank-trace-setup">${escape(entry.name)}</span><strong>${entry.rank==null?'—':'P'+entry.rank}</strong><small class="${entry.rank!=null&&base!=null&&entry.rank<base?'rank-up':entry.rank!=null&&base!=null&&entry.rank>base?'rank-down':''}">${i===0?'·':delta(entry.rank)}</small></button>`).join('')}</div>
      </div>`;
    host.querySelector('.rank-trace-plot').scrollLeft=scroll;host.querySelector('.rank-trace-list').scrollTop=listScroll;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!collapsed&&!reduced){
      if(oldDriver===key&&previous?.maximum===plot.maximum&&previous?.width===plot.width&&entries.every((e,i)=>oldPoints.get(e.id)?.x===plot.points[i].x)){
        const elements=[...host.querySelectorAll('[data-trace-point]')],line=host.querySelector('.rank-trace-line'),start=performance.now();
        const frame=now=>{
          const progress=Math.min(1,(now-start)/300),ease=1-Math.pow(1-progress,3);
          const points=plot.points.map((point,i)=>{const old=oldPoints.get(entries[i].id);return {...point,y:point.y!=null&&old?.y!=null?old.y+(point.y-old.y)*ease:point.y};});
          line.setAttribute('d',pathFor(points));
          points.forEach((point,i)=>{if(point.y!=null){elements[i].querySelector('circle').setAttribute('cy',point.y);elements[i].querySelector('.rank-trace-value').setAttribute('y',point.y-9);}});
          host.traceDisplayed=points;if(progress<1&&host.isConnected)host.traceFrame=requestAnimationFrame(frame);else host.traceFrame=0;
        };
        frame(start);
      }
      host.querySelector('.rank-trace-chart').animate([{opacity:.35},{opacity:1}],{duration:180});
    }
    host.traceLayout=plot;host.traceEntries=entries;if(!host.traceFrame)host.traceDisplayed=plot.points;
  }
  return {layout,render};
})();
