"use strict";

// Equal progress, not equal physical distance: every lane spans the same 0–100 scale.
// The sampled centreline also gives the straight↔circuit transition matching topology.
window.APEX_TRACK = (() => {
  const NS = 'http://www.w3.org/2000/svg', SAMPLES = 180, CAPACITY = 8;
  const scenes = new Map();
  let wheelOwner=null, wheelUntil=0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const svg = (tag, attrs = {}) => {
    const node = document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v));
    return node;
  };
  const path = points => points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  function pointAt(points, progress) {
    const n = clamp(progress,0,1)*(points.length-1), i = Math.min(points.length-2,Math.floor(n)), f = n-i;
    return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};
  }
  function slice(points, start, end) {
    start=clamp(start,0,1);end=clamp(end,0,1);
    if (end-start < .000001) return '';
    const result = [pointAt(points,start)];
    for(let i=Math.floor(start*SAMPLES)+1;i<end*SAMPLES;i++) result.push(points[i]);
    result.push(pointAt(points,end));
    return path(result);
  }
  function geometry(lane, vertical = false, width = 1024) {
    const w = vertical ? 660 : width, h = vertical ? 440 : 500;
    const radius = h/2-40-lane*(vertical?11:14), left = h/2+10, right=w-left, cy=h/2;
    const straight=right-left, half=straight/2-14, lengths=[half,Math.PI*radius,straight,Math.PI*radius,half];
    const total=lengths.reduce((a,b)=>a+b,0);
    return Array.from({length:SAMPLES+1},(_,i)=>{
      let d=i/SAMPLES*total, p;
      if(d<=lengths[0]) p={x:w/2+14+d,y:cy-radius};
      else if((d-=lengths[0])<=lengths[1]) { const a=-Math.PI/2+d/radius; p={x:right+radius*Math.cos(a),y:cy+radius*Math.sin(a)}; }
      else if((d-=lengths[1])<=lengths[2]) p={x:right-d,y:cy+radius};
      else if((d-=lengths[2])<=lengths[3]) { const a=Math.PI/2+d/radius; p={x:left+radius*Math.cos(a),y:cy+radius*Math.sin(a)}; }
      else { d-=lengths[3]; p={x:left+d,y:cy-radius}; }
      return vertical?{x:p.y,y:w-p.x}:p;
    });
  }
  const interpolate = (a,b,t) => a.map((p,i)=>({x:p.x+(b[i].x-p.x)*t,y:p.y+(b[i].y-p.y)*t}));
  function windowStart(value,total) { return clamp(Math.round(value),0,Math.max(0,total-CAPACITY)); }
  function retirementOpacity(node,now,duration) {
    // Subsequent wheel events must not restart an outgoing driver's fade.
    if(node.exitStarted==null){node.exitStarted=now;node.exitOpacity=node.opacity;}
    const progress=duration?clamp((now-node.exitStarted)/duration,0,1):1;
    return node.exitOpacity*Math.pow(1-progress,2);
  }
  function setRetiring(node,retiring) {
    if(Boolean(node.retiring)===retiring)return;
    node.retiring=retiring;
    [node.group,node.marker].forEach(element=>{
      element.classList.toggle('is-retiring',retiring);
      element.style.pointerEvents=retiring?'none':'';
      if(retiring)element.setAttribute('aria-hidden','true');else element.removeAttribute('aria-hidden');
    });
    [node.badge,node.car].forEach(element=>element.setAttribute('tabindex',retiring?-1:0));
  }
  function removeEntry(scene,key,node) {
    node.group.remove();node.marker.remove();
    if(scene.nodes.get(key)===node)scene.nodes.delete(key);
    scene.alignTransition?.from.delete(key);
  }
  function entry(scene, item) {
    const group=svg('g',{'class':'circuit-driver','data-flow-driver':item.key});
    const track=svg('path',{'class':'circuit-lane'}), segments=svg('g',{'class':'circuit-segments'});
    const leader=svg('path',{'class':'circuit-leader'}), badge=svg('g',{'class':'circuit-badge',tabindex:0,role:'button','data-race-driver':item.key,'aria-label':item.name});
    const portrait=svg('svg',{x:22,y:3,width:22,height:22,viewBox:'0 0 24 24',class:'circuit-badge-portrait','aria-hidden':'true'});
    portrait.append(svg('path',{d:'M0 0h24v24H0z',fill:'#25343e'}),svg('path',{d:'M4 24v-3a8 8 0 0 1 16 0v3M7 10a5 5 0 1 0 10 0a5 5 0 1 0-10 0',fill:'#82949f'}));
    if(item.portrait){const photo=svg('image',{href:item.portrait,width:24,height:24,preserveAspectRatio:'xMidYMin slice'});photo.addEventListener('error',()=>photo.remove(),{once:true});portrait.append(photo);}
    const rankText=svg('text',{x:10,y:18,'text-anchor':'middle',class:'circuit-badge-rank'});
    badge.append(svg('path',{d:'M3 0H84V21L77 28H3Q0 28 0 25V3Q0 0 3 0Z',class:'circuit-badge-shell'}),svg('path',{d:'M1 5V23',class:'circuit-badge-accent'}),rankText,portrait,svg('text',{x:62,y:18,'text-anchor':'middle',class:'circuit-badge-code'}));
    const car=svg('g',{'class':'circuit-car',tabindex:0,role:'button','data-race-driver':item.key});
    car.append(svg('rect',{x:-24,y:-15,width:48,height:30,fill:'transparent'}));
    car.append(svg('use',{href:'./assets/studio/icons.svg#race-car',x:-21,y:-10,width:42,height:20}));
    const marker=svg('g',{'class':'circuit-driver circuit-marker','data-flow-driver':item.key});
    group.append(track,segments); marker.append(leader,badge,car); scene.layer.append(group);scene.markers.append(marker);
    return {group,marker,track,segments,leader,badge,rankText,car,parts:new Map(),values:{},points:geometry(item.lane,scene.vertical,scene.w),score:0,opacity:0};
  }
  function showDriver(scene,key,anchor) {
    const item=scene.items.find(d=>d.key===key); if(!item) return;
    clearTimeout(scene.hoverTimer);clearTimeout(scene.hideTimer);
    if(!anchor.isConnected||!scene.host.getClientRects().length)return;
    scenes.forEach(other=>{if(other!==scene)cancelProfile(other);});
    scene.popup.innerHTML=`<button class="profile-close" aria-label="Close">×</button>`+scene.options.detail(item.driver);
    scene.popup.hidden=false;
    scene.popup.dataset.raceDriver=key;
    scene.popup.setAttribute('aria-label',item.name);
    const rect=anchor.getBoundingClientRect(), box=scene.popup.getBoundingClientRect();
    scene.popup.style.left=`${clamp(rect.left+rect.width/2-box.width/2,8,innerWidth-box.width-8)}px`;
    scene.popup.style.top=`${clamp(rect.bottom+12+box.height<innerHeight?rect.bottom+12:rect.top-box.height-12,8,innerHeight-box.height-8)}px`;
    highlight(key);
    scene.options.onFocus?.(key);
  }
  function cancelProfile(scene) {
    clearTimeout(scene.hoverTimer);clearTimeout(scene.hideTimer);scene.popup.hidden=true;
  }
  function highlight(key) {
    document.querySelectorAll('.race-venue').forEach(venue=>{
      venue.classList.toggle('has-driver-focus',Boolean(key));
      venue.querySelectorAll('[data-flow-driver]').forEach(el=>el.classList.toggle('is-driver-focus',el.dataset.flowDriver===key));
    });
  }
  function create(id,vertical) {
    const host=document.createElement('div'); host.className=`race-venue${vertical?' is-vertical':''}`;
    host.tabIndex=0;
    const scene={id,host,vertical,w:1024,nodes:new Map(),items:[],offset:0,frame:0,options:null,zoom:1,pan:{x:0,y:0}};
    scene.canvas=svg('svg',{class:'circuit-svg',viewBox:vertical?'0 0 440 660':'0 0 1024 500','aria-hidden':'false'});
    const defs=svg('defs'), pattern=svg('pattern',{id:`finish-${id}`,width:10,height:10,patternUnits:'userSpaceOnUse'});
    pattern.append(svg('rect',{width:10,height:10,fill:'#dce3ec'}),svg('path',{d:'M0 0h5v5H0zM5 5h5v5H5z',fill:'#11151a'}));defs.append(pattern);scene.canvas.append(defs);
    scene.scenery=svg('g',{class:'circuit-scenery','aria-hidden':'true'});
    scene.canvas.append(scene.scenery);scene.layer=svg('g',{class:'circuit-racers'});scene.markers=svg('g',{class:'circuit-racers circuit-markers'});
    scene.infield=document.createElement('div');scene.infield.className='circuit-infield';
    scene.foreign=svg('foreignObject',{class:'circuit-infield-anchor'});scene.foreign.append(scene.infield);
    scene.canvas.append(scene.layer,scene.foreign,scene.markers);
    scene.alignmentGuide=svg('g',{class:'circuit-alignment-guide','aria-hidden':'true'});scene.canvas.append(scene.alignmentGuide);
    scene.stage=document.createElement('div');scene.stage.className='circuit-stage';
    scene.camera=document.createElement('div');scene.camera.className='circuit-camera';scene.camera.append(scene.canvas);scene.stage.append(scene.camera);
    scene.left=document.createElement('div');scene.left.className='circuit-grandstand grandstand-left';
    scene.right=document.createElement('div');scene.right.className='circuit-grandstand grandstand-right';
    scene.controls=document.createElement('div');scene.controls.className='circuit-window';
    host.append(scene.left,scene.stage,scene.right,scene.controls);
    let pan=null;
    scene.stage.addEventListener('pointerdown',e=>{
      if(scene.zoom<=1||e.button!==0||e.target.closest('button,a,[data-race-driver],[data-drag-driver]'))return;
      const scale=scene.stage.getBoundingClientRect().width/scene.stage.offsetWidth;
      pan={x:e.clientX,y:e.clientY,px:scene.pan.x,py:scene.pan.y,scale};
      scene.stage.setPointerCapture(e.pointerId);scene.host.classList.add('is-camera-panning');e.preventDefault();e.stopPropagation();
    });
    scene.stage.addEventListener('pointermove',e=>{if(!pan)return;scene.pan={x:pan.px+(e.clientX-pan.x)/pan.scale,y:pan.py+(e.clientY-pan.y)/pan.scale};paintCamera(scene);});
    const endPan=()=>{pan=null;scene.host.classList.remove('is-camera-panning');};
    scene.stage.addEventListener('pointerup',endPan);scene.stage.addEventListener('pointercancel',endPan);
    scene.observer=new ResizeObserver(()=>layout(scene));scene.observer.observe(scene.stage);
    scene.popup=document.createElement('div');scene.popup.className='circuit-profile';scene.popup.hidden=true;scene.popup.setAttribute('role','dialog');
    document.body.append(scene.popup);
    scene.popup.addEventListener('click',e=>{if(e.target.closest('.profile-close')){cancelProfile(scene);highlight(null);}});
    host.addEventListener('mouseover',e=>{const target=e.target.closest('[data-race-driver]');if(target){highlight(target.dataset.raceDriver);scene.options.onFocus?.(target.dataset.raceDriver);}});
    host.addEventListener('mouseout',e=>{if(scene.popup.hidden&&!e.relatedTarget?.closest?.('[data-race-driver]'))highlight(null);});
    host.addEventListener('focusin',e=>{const target=e.target.closest('[data-race-driver]');if(target){highlight(target.dataset.raceDriver);scene.options.onFocus?.(target.dataset.raceDriver);}});
    host.addEventListener('click',e=>{
      const metric=e.target.closest('[data-toggle-metric]');
      if(metric){e.stopPropagation();scene.options.toggleMetric(metric.dataset.toggleMetric);return;}
      const zoom=e.target.closest('[data-race-zoom]');
      if(zoom){setCamera(scene,zoom.dataset.raceZoom==='fit'?1:scene.zoom*(zoom.dataset.raceZoom==='in'?1.25:.8));return;}
      const move=e.target.closest('[data-race-step]');if(move) advance(scene,Number(move.dataset.raceStep));
      const target=e.target.closest('[data-race-driver]');if(target){if(!scene.popup.hidden&&scene.popup.dataset.raceDriver===target.dataset.raceDriver){cancelProfile(scene);highlight(null);}else showDriver(scene,target.dataset.raceDriver,target);}
    });
    let wheel=0,last=0;
    scene.handleWheel=(e,locked=false)=>{
      if(!locked&&e.target.closest('.circuit-grandstand'))return;
      if(e.ctrlKey){e.preventDefault();e.stopPropagation();setCamera(scene,scene.zoom*(e.deltaY<0?1.12:1/1.12));return;}
      if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      e.preventDefault();e.stopPropagation();
      const now=performance.now();
      if(locked||!scene.popup.hidden){wheelOwner=scene;wheelUntil=now+200;}
      cancelProfile(scene);highlight(null);
      if(now-last>180)wheel=0;
      wheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?300:1);
      if(Math.abs(wheel)>=45&&now-last>130){advance(scene,Math.sign(wheel));wheel=0;last=now;}
    };
    host.addEventListener('wheel',e=>scene.handleWheel(e),{passive:false});
    host.addEventListener('keydown',e=>{
      if(e.target.closest('input,a,[data-drag-driver],.circuit-grandstand'))return;
      if(['+','=','-','0'].includes(e.key)){e.preventDefault();e.stopPropagation();setCamera(scene,e.key==='0'?1:scene.zoom*(e.key==='-'?.8:1.25));return;}
      const steps={ArrowDown:1,ArrowUp:-1,PageDown:8,PageUp:-8,Home:-Infinity,End:Infinity};
      if(e.key in steps){e.preventDefault();e.stopPropagation();advance(scene,steps[e.key]);}
      if(e.key==='Escape'){cancelProfile(scene);highlight(null);}
      if((e.key==='Enter'||e.key===' ')&&e.target.matches('.circuit-car,.circuit-badge')){e.preventDefault();showDriver(scene,e.target.dataset.raceDriver,e.target);}
    });
    return scene;
  }
  // Natural portrait cards; select the grid that fits them at the largest scale.
  function comparisonLayout(count,availableWidth,availableHeight) {
    count=Math.max(1,count);const gap=14,height=clamp(availableHeight,440,680);
    const width=Math.round((height-94)*476/696+20);
    let best;
    for(let columns=1;columns<=count;columns++){
      const rows=Math.ceil(count/columns),boardWidth=columns*width+(columns-1)*gap,boardHeight=rows*height+(rows-1)*gap;
      const scale=Math.min(1,availableWidth/boardWidth,availableHeight/boardHeight);
      if(!best||scale>best.scale+.0001)best={height,width,gap,columns,rows,boardWidth,boardHeight,scale};
    }
    return best;
  }
  function infieldBounds(vertical,width=1024) {
    return vertical?{x:146,y:200,w:148,h:260}:{x:222,y:170,w:width-444,h:160};
  }
  function layout(scene) {
    if(!scene.stage.clientWidth||!scene.stage.clientHeight)return;
    const width=scene.vertical?440:Math.round(clamp(scene.stage.clientWidth/scene.stage.clientHeight*500,800,1600));
    if(scene.w===width&&scene.laidOut)return;
    scene.w=width;scene.laidOut=true;
    scene.canvas.setAttribute('viewBox',`-18 -18 ${width+36} ${(scene.vertical?660:500)+36}`);
    const field=infieldBounds(scene.vertical,width);scene.fieldBounds=field;
    Object.entries({x:field.x,y:field.y,width:field.w,height:field.h}).forEach(([k,v])=>scene.foreign.setAttribute(k,v));
    scene.scenery.replaceChildren();
    const vertical=scene.vertical;
    scene.scenery.append(svg('path',{d:path(geometry(-.8,vertical,width)),class:'circuit-kerb'}),svg('path',{d:path(geometry(8,vertical,width)),class:'circuit-inner-edge'}));
    const finish=vertical?{x:35,y:339,width:99,height:10}:{x:width/2-19,y:35,width:10,height:113};
    scene.scenery.append(svg('rect',{...finish,fill:`url(#finish-${scene.id})`}));
    scene.scaleBounds=[];
    const text=(x,y,value,anchor='middle')=>{const el=svg('text',{x,y,class:'circuit-scale','text-anchor':anchor});el.textContent=value;scene.scenery.append(el);const width=String(value).length*7;scene.scaleBounds.push({x:x-(anchor==='middle'?width/2:anchor==='end'?width:0)-3,y:y-12,w:width+6,h:17});};
    if(vertical){text(16,315,'0 →');text(16,366,'100');}
    else {text(width/2+26,18,'0 →','start');text(width/2-28,18,'100','end');}
    [25,50,75].forEach(value=>{
      const p=pointAt(geometry(-.8,vertical,width),value/100),cx=width/2,cy=(vertical?660:500)/2;
      const vx=p.x-cx,vy=p.y-cy,dist=Math.hypot(vx,vy),x=p.x+vx/dist*23,y=p.y+vy/dist*23;
      scene.scenery.append(svg('path',{d:`M${p.x+vx/dist*5},${p.y+vy/dist*5} L${x-vx/dist*9},${y-vy/dist*9}`,class:'circuit-tick'}));text(x,y+3,value);
    });
    const states=scene.items.map(item=>{const node=scene.nodes.get(item.key);return node?{node,item,points:geometry(item.lane,vertical,width),values:node.values,score:node.score,opacity:node.opacity}:null;}).filter(Boolean);
    if(states.length)draw(scene,states);
    paintCamera(scene);
  }
  function paintStands(scene) {
    scene.left.hidden=scene.right.hidden=scene.vertical;
    if(scene.vertical){scene.left.replaceChildren();scene.right.replaceChildren();return;}
    if(scene.standsSignature!==scene.options.controlsSignature){
      const metrics=scene.options.metrics,split=Math.ceil(metrics.length/2);
      scene.left.style.setProperty("--stand-count",split);scene.right.style.setProperty("--stand-count",metrics.length-split);
      scene.left.innerHTML=metrics.slice(0,split).map(scene.options.renderMetric).join('');
      scene.right.innerHTML=metrics.slice(split).map(scene.options.renderMetric).join('');
      scene.standsSignature=scene.options.controlsSignature;
      scene.host.querySelectorAll('[data-align-metric]').forEach(stand=>stand.setAttribute('aria-pressed',String(stand.dataset.alignMetric===scene.alignKey)));
    }
    scene.options.syncControls();
  }
  function paintCamera(scene) {
    const maxX=scene.stage.clientWidth*(scene.zoom-1)/2,maxY=scene.stage.clientHeight*(scene.zoom-1)/2;
    scene.pan.x=clamp(scene.pan.x,-maxX,maxX);scene.pan.y=clamp(scene.pan.y,-maxY,maxY);
    scene.camera.style.transform=`translate(${scene.pan.x}px,${scene.pan.y}px) scale(${scene.zoom})`;
    scene.host.classList.toggle('is-race-zoomed',scene.zoom>1.01);
    const output=scene.controls.querySelector('.race-zoom-value');if(output)output.textContent=`${Math.round(scene.zoom*100)}%`;
  }
  function setCamera(scene,value) { scene.zoom=clamp(value,1,3);if(scene.zoom===1)scene.pan={x:0,y:0};cancelProfile(scene);highlight(null);paintCamera(scene); }
  function advance(scene,amount) {
    cancelProfile(scene);
    const next=windowStart(scene.offset+amount,scene.options.drivers.length);
    if(next===scene.offset)return;
    scene.offset=next;scene.options.offset=next;scene.options.onWindow?.(next);
    highlight(null);update(scene,{...scene.options,animate:true,windowMotion:Math.sign(amount)});
  }
  // A common physical scale is essential: concentric lanes have different lengths.
  function alignedGeometry(lane,vertical,width=1024){
    const w=vertical?440:width,y=(vertical?205:130)+lane*(vertical?33:32);
    return Array.from({length:SAMPLES+1},(_,i)=>({x:100+(w-140)*i/SAMPLES,y}));
  }
  function metricOffsets(metrics,values,key){
    const ordered=key?[...metrics.filter(m=>m.key===key),...metrics.filter(m=>m.key!==key)]:metrics;
    let cursor=0;return Object.fromEntries(ordered.map(m=>{const start=cursor;cursor+=values[m.key]||0;return [m.key,start];}));
  }
  function alignMetric(key){
    scenes.forEach(scene=>{
      if(!scene.host.isConnected||!scene.host.getClientRects().length)return;
      const next=scene.options.metrics.some(m=>m.key===key)?key:null;
      if(scene.alignKey===next)return;
      cancelAnimationFrame(scene.alignFrame);
      // Capture the current visual layout, including an interrupted transition.
      const from=new Map([...scene.nodes].map(([id,n])=>[id,{points:n.displayPoints||n.points,offsets:n.displayOffsets||metricOffsets(scene.options.metrics,n.values,null)}]));
      scene.alignKey=next;
      if(next){
        const top=scene.vertical?175:100,bottom=scene.vertical?450:375,w=scene.vertical?440:scene.w;
        scene.alignmentGuide.replaceChildren(svg('path',{d:`M100 ${top+12}V${bottom}`,stroke:'#c5d6df','stroke-dasharray':'3 4',opacity:'.6'}));
        const label=svg('text',{x:100,y:top,fill:'#d5e4ec','font-size':12});label.textContent=scene.options.metrics.find(m=>m.key===next).name;scene.alignmentGuide.append(label);
        const end=svg('text',{x:w-40,y:top,fill:'#93aab9','font-size':10,'text-anchor':'end'});end.textContent='0–100';scene.alignmentGuide.append(end);
      }
      scene.host.classList.toggle('is-metric-aligned',Boolean(next));
      scene.host.dataset.alignedMetric=next||'';
      scene.host.querySelectorAll('[data-align-metric]').forEach(stand=>stand.setAttribute('aria-pressed',String(stand.dataset.alignMetric===next)));
      const initial=scene.alignMix||0,target=next?1:0,start=performance.now();
      const frame=now=>{
        const t=reduced()?1:clamp((now-start)/480,0,1),ease=t*t*(3-2*t);
        scene.alignMix=initial+(target-initial)*ease;
        scene.alignTransition={from,progress:ease};
        scene.host.style.setProperty('--alignment',scene.alignMix);
        if(scene.lastStates)draw(scene,scene.lastStates);
        if(t<1)scene.alignFrame=requestAnimationFrame(frame);else scene.alignTransition=null;
      };scene.alignFrame=requestAnimationFrame(frame);
    });
  }
  function draw(scene,states) {
    scene.lastStates=states;
    const visual=states.map(s=>{
      const to=scene.alignKey?alignedGeometry(s.item.lane,scene.vertical,scene.w):s.points;
      const offsets=s.orderKey===scene.alignKey&&s.orderOffsets?s.orderOffsets:metricOffsets(scene.options.metrics,s.values,scene.alignKey);
      const transition=scene.alignTransition,from=transition?.from.get(s.item.key);
      const points=from?interpolate(from.points,to,transition.progress):to;
      const displayOffsets=from?Object.fromEntries(scene.options.metrics.map(m=>[m.key,(from.offsets[m.key]||0)+(offsets[m.key]-(from.offsets[m.key]||0))*transition.progress])):offsets;
      return {...s,points,displayOffsets,sourcePoints:s.points};
    });
    const labels=[];
    const cars=visual.filter(s=>s.item.scored&&s.opacity>.1).map(s=>{const p=pointAt(s.points,s.score);return {x:p.x-23,y:p.y-14,w:46,h:28};});
    const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    visual.forEach(s=>{
      const node=s.node;
      const geometryChanged=node.paintedPoints!==s.points;
      const valuesChanged=geometryChanged||scene.options.metrics.some(m=>node.values[m.key]!==s.values[m.key]||node.displayOffsets?.[m.key]!==s.displayOffsets[m.key]);
      node.points=s.sourcePoints;node.displayPoints=s.points;node.displayOffsets=s.displayOffsets;node.values=s.values;node.score=s.score;node.opacity=s.opacity;
      if(geometryChanged)node.track.setAttribute('d',path(s.points));node.group.style.opacity=String(s.opacity);node.marker.style.opacity=String(s.opacity);
      let start=0;
      if(valuesChanged)scene.options.metrics.forEach(metric=>{
        const length=s.values[metric.key]||0,segment=node.parts.get(metric.key);
        start=s.displayOffsets[metric.key];segment.setAttribute('d',slice(s.points,start,Math.min(1,start+length)));
      });
      node.paintedPoints=s.points;
      const p=pointAt(s.points,s.score),p1=pointAt(s.points,Math.max(0,s.score-.002)),p2=pointAt(s.points,Math.min(1,s.score+.002));
      const angle=Math.atan2(p2.y-p1.y,p2.x-p1.x)*180/Math.PI;
      node.car.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle})`);
      node.car.style.visibility=s.item.scored&&s.opacity>.02?'visible':'hidden';
      const w=scene.vertical?440:scene.w,h=scene.vertical?660:500;
      let best;
      const obstacles=[...labels,...cars,scene.fieldBounds||(scene.vertical?{x:142,y:182,w:156,h:290}:{x:255,y:166,w:514,h:170}),...(scene.scaleBounds||[])];
      for(const dx of [p.x>w/2?28:-112,p.x>w/2?-112:28,-42])for(const dy of [-39,15,-71,47,-103,79]){
        const box={x:clamp(p.x+dx,4,w-88),y:clamp(p.y+dy,4,h-32),w:88,h:32};
        box.cost=obstacles.reduce((sum,b)=>sum+overlap(box,b)*20,0)+Math.hypot(box.x+42-p.x,box.y+14-p.y);
        if(!best||box.cost<best.cost)best=box;
      }
      const mix=scene.alignMix||0,anchor=pointAt(s.points,0),x=best.x+(8-best.x)*mix,y=best.y+(anchor.y-14-best.y)*mix;labels.push({...best,x,y});node.badge.setAttribute('transform',`translate(${x} ${y})`);
      node.leader.setAttribute('d',`M${p.x},${p.y} L${x+42},${y+14}`);
    });
  }
  function update(scene,options) {
    cancelAnimationFrame(scene.frame);scene.options=options;
    layout(scene);
    const focusedStep=scene.controls.contains(document.activeElement)?document.activeElement.dataset.raceStep:null;
    const oldRoster=new Map([...scene.infield.querySelectorAll('[data-flow-driver]')].map(el=>[el.dataset.flowDriver,{x:el.offsetLeft,y:el.offsetTop}]));
    scene.offset=windowStart(options.offset??scene.offset,options.drivers.length);
    const chosen=options.drivers.slice(scene.offset,scene.offset+CAPACITY);
    scene.items=chosen.map((driver,lane)=>options.item(driver,lane));
    const activeKeys=new Set(scene.items.map(item=>item.key));
    // An interrupted transition may retain its immediate outgoing window only.
    // A driver that re-enters keeps its rendered position for a smooth reversal.
    for(const [key,node] of scene.nodes)if(node.retiring&&!activeKeys.has(key))removeEntry(scene,key,node);
    const targets=scene.items.map(item=>{
      let node=scene.nodes.get(item.key);if(!node){node=entry(scene,item);scene.nodes.set(item.key,node);}
      setRetiring(node,false);node.exitStarted=null;node.exitOpacity=null;
      node.item=item;
      node.group.style.setProperty('--team',item.team);node.marker.style.setProperty('--team',item.team);
      node.car.setAttribute('aria-label',`${item.name} · ${item.rank} · ${item.scoreLabel}`);
      if(node.rankText)node.rankText.textContent=item.rank;
      node.badge.lastChild.textContent=item.code;
      options.metrics.forEach(metric=>{
        let segment=node.parts.get(metric.key);
        if(!segment){segment=svg('path',{class:'circuit-segment','data-segment-metric':metric.key});segment.append(svg('title'));node.parts.set(metric.key,segment);node.segments.append(segment);}
        segment.style.stroke=metric.color;segment.firstChild.textContent=options.segmentTitle(item.driver,metric.key,item.values[metric.key]||0);
      });
      for(const [key,part] of node.parts)if(!options.metrics.some(m=>m.key===key)){part.remove();node.parts.delete(key);}
      return {node,item,points:geometry(item.lane,scene.vertical,scene.w),values:item.values,score:item.score,opacity:1};
    });
    const leaving=[...scene.nodes].filter(([key])=>!scene.items.some(i=>i.key===key));
    const start=performance.now(),duration=reduced()||options.animate===false?0:(options.windowMotion?320:660),exitDuration=duration?160:0;
    leaving.forEach(([key,node])=>{
      setRetiring(node,true);
      const opacity=retirementOpacity(node,start,exitDuration);
      if(opacity<=.005){removeEntry(scene,key,node);return;}
      // Retire in place: translating a complete loop makes it spill off the track.
      targets.push({node,item:node.item||{key,scored:false},leaving:true,points:node.points,values:node.values,score:node.score,opacity:0});
    });
    const from=targets.map(s=>({offsets:{...(s.node.displayOffsets||metricOffsets(options.metrics,s.node.values,scene.alignKey))},stationary:s.node.points.every((p,i)=>p.x===s.points[i].x&&p.y===s.points[i].y),points:s.node.points,values:{...s.node.values},score:s.node.score,opacity:s.node.opacity}));
    scene.host.dataset.animating=duration?'true':'false';
    const frame=now=>{
      const t=duration?clamp((now-start)/duration,0,1):1;
      draw(scene,targets.map((s,i)=>{
        if(scene.nodes.get(s.item.key)!==s.node)return null;
        const opacity=s.leaving?retirementOpacity(s.node,now,exitDuration):null;
        if(s.leaving&&opacity<=.005){removeEntry(scene,s.item.key,s.node);return null;}
        const ease=1-Math.pow(1-t,3);
        const targetOffsets=metricOffsets(options.metrics,s.values,scene.alignKey);
        return {...s,orderKey:scene.alignKey,orderOffsets:Object.fromEntries(options.metrics.map(m=>[m.key,(from[i].offsets[m.key]||0)+(targetOffsets[m.key]-(from[i].offsets[m.key]||0))*ease])),points:from[i].stationary?s.points:interpolate(from[i].points,s.points,ease),score:from[i].score+(s.score-from[i].score)*ease,opacity:s.leaving?opacity:from[i].opacity+(s.opacity-from[i].opacity)*ease,values:Object.fromEntries(options.metrics.map(m=>[m.key,(from[i].values[m.key]||0)+((s.values[m.key]||0)-(from[i].values[m.key]||0))*ease]))};
      }).filter(Boolean));
      if(t<1&&scene.host.isConnected)scene.frame=requestAnimationFrame(frame);
      else {scene.frame=0;scene.host.dataset.animating='false';leaving.forEach(([key,node])=>removeEntry(scene,key,node));}
    };
    frame(start);
    // The infield is a compact identity key; the same identities also travel with the cars.
    scene.infield.innerHTML=`<div class="circuit-score-key" tabindex="0" title="${options.escape(options.scaleHelp)}" aria-label="${options.escape(options.scaleHelp)}">${options.escape(options.scoreTitle)} <span>0—100</span></div><div class="circuit-roster">${scene.items.map(item=>`<div class="circuit-roster-row" data-flow-driver="${item.key}" style="--team:${item.team}"><button class="circuit-identity" data-race-driver="${item.key}" aria-label="${options.escape(item.name)}"><span class="circuit-rank">${item.rank}</span><span class="circuit-name">${options.flag(item.driver)}${options.escape(item.displayName||item.name)}</span><strong>${item.scoreLabel}${scene.vertical?`<em class="circuit-comparison-delta ${item.comparisonChange>0?'rank-up':item.comparisonChange<0?'rank-down':''}" title="${options.escape(options.comparisonTitle)}">${item.comparisonChange==null?'—':item.comparisonChange>0?'▲'+item.comparisonChange:item.comparisonChange<0?'▼'+(-item.comparisonChange):'='}</em>`:''}</strong><span class="circuit-delta ${item.change>0?'rank-up':item.change<0?'rank-down':''}">${item.change>0?'▲'+item.change:item.change<0?'▼'+(-item.change):'—'}</span></button></div>`).join('')}</div>${!scene.items.length?`<div class="circuit-empty">${options.escape(options.empty)}</div>`:''}`;
    if(!reduced()&&options.animate!==false)scene.infield.querySelectorAll('[data-flow-driver]').forEach(el=>{
      const before=oldRoster.get(el.dataset.flowDriver);
      if(before){const dx=before.x-el.offsetLeft,dy=before.y-el.offsetTop;if(dx||dy)el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:500,easing:'cubic-bezier(.22,.7,.2,1)'});}
      else el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:350});
    });
    scene.controls.innerHTML=`<div class="race-page-controls"><button type="button" data-race-step="-8" aria-label="${options.escape(options.previous)}" ${scene.offset===0?'disabled':''}>‹</button><output aria-live="polite">${chosen.length?scene.offset+1:0}–${scene.offset+chosen.length}<span> / ${options.drivers.length}</span></output><button type="button" data-race-step="8" aria-label="${options.escape(options.next)}" ${scene.offset>=options.drivers.length-CAPACITY?'disabled':''}>›</button></div><div class="race-zoom-controls"><button data-race-zoom="out" aria-label="${options.escape(options.zoomOut)}">−</button><output class="race-zoom-value">${Math.round(scene.zoom*100)}%</output><button data-race-zoom="in" aria-label="${options.escape(options.zoomIn)}">+</button><button data-race-zoom="fit" title="${options.escape(options.fit)}" aria-label="${options.escape(options.fit)}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="./assets/studio/icons.svg#fit"/></svg></button></div>`;
    if(focusedStep){const next=scene.controls.querySelector(`[data-race-step="${focusedStep}"]`);(next.disabled?scene.host:next).focus({preventScroll:true});}
    scene.host.setAttribute('aria-label',options.label);
    paintStands(scene);
    scene.options={...options,windowMotion:0};
    if(!duration)draw(scene,targets.filter(s=>s.opacity>0));
  }
  function render(host,id,options) {
    const key=`${id}-${options.vertical?'v':'h'}`;
    let scene=scenes.get(key);if(!scene){scene=create(key,options.vertical);scenes.set(key,scene);}
    if(scene.host.parentElement!==host)host.replaceChildren(scene.host);
    update(scene,options);return scene;
  }
  function screenPoints(scene,points) {
    const matrix=scene.canvas.getScreenCTM();
    return points.map(p=>({x:matrix.a*p.x+matrix.c*p.y+matrix.e,y:matrix.b*p.x+matrix.d*p.y+matrix.f}));
  }
  function capture(root) {
    const result=new Map();
    scenes.forEach(scene=>{
      if(!root.contains(scene.host)||!scene.host.getClientRects().length)return;
      scene.nodes.forEach((node,key)=>{if(node.opacity>.5)result.set(`${scene.id.split(/-[hv]$/)[0]}:${key}`,{points:screenPoints(scene,node.points),values:{...node.values},score:node.score,key,team:node.group.style.getPropertyValue('--team')});});
    });return result;
  }
  // The actual paths, including each coloured contribution, interpolate between forms.
  function morph(before,after,root) {
    if(reduced()||!before.size||!after.size)return;
    const overlay=svg('svg',{class:'circuit-morph',viewBox:`0 0 ${innerWidth} ${innerHeight}`});
    const matching=[];
    before.forEach((from,key)=>{
      const to=after.get(key);if(!to)return;
      const lane=svg('path',{class:'circuit-lane'}),parts=[];
      Object.keys(to.values).forEach(metric=>{const p=svg('path',{class:'circuit-segment',stroke:to.colors?.[metric]||from.colors?.[metric]||'#ccc'});overlay.append(p);parts.push([metric,p]);});
      overlay.prepend(lane);
      const car=svg('use',{href:'./assets/studio/icons.svg#race-car',x:-21,y:-10,width:42,height:20,color:to.team||from.team});overlay.append(car);
      matching.push({from,to,lane,parts,car});
    });
    if(!matching.length)return;
    document.body.append(overlay);root.classList.add('circuit-morph-target');
    const start=performance.now();
    const frame=now=>{
      const t=clamp((now-start)/800,0,1),ease=t*t*(3-2*t);
      matching.forEach(({from,to,lane,parts,car})=>{
        const points=interpolate(from.points,to.points,ease);lane.setAttribute('d',path(points));
        let cursor=0;parts.forEach(([metric,p])=>{const value=(from.values[metric]||0)+((to.values[metric]||0)-(from.values[metric]||0))*ease;p.setAttribute('d',slice(points,cursor,cursor+value));cursor+=value;});
        const score=from.score+(to.score-from.score)*ease,p=pointAt(points,score),q=pointAt(points,Math.min(1,score+.002));
        car.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI})`);
      });
      if(t<1)requestAnimationFrame(frame);else{overlay.remove();root.classList.remove('circuit-morph-target');}
    };requestAnimationFrame(frame);
  }
  function settle() {
    scenes.forEach(scene=>{cancelProfile(scene);highlight(null);if(scene.host.isConnected){const options=scene.options;update(scene,{...options,animate:false});scene.options=options;}});
  }
  function dismiss() { alignMetric(null);wheelOwner=null;scenes.forEach(cancelProfile);highlight(null); }
  function prune(ids) {
    scenes.forEach((scene,key)=>{if(!ids.some(id=>key===`${id}-h`||key===`${id}-v`)){cancelProfile(scene);if(wheelOwner===scene)wheelOwner=null;cancelAnimationFrame(scene.frame);cancelAnimationFrame(scene.alignFrame);scene.observer.disconnect();scene.popup.remove();scenes.delete(key);}});
  }
  // The floating profile lives under body, outside its race venue. Capture its
  // wheel gesture and keep momentum bound to that venue after the card closes.
  // An outside gesture dismisses the profile and consumes that entire click.
  let dismissedPointer=false;
  const outsideProfile=target=>[...scenes.values()].some(scene=>!scene.popup.hidden&&!scene.popup.contains(target));
  const closeProfiles=()=>{wheelOwner=null;scenes.forEach(cancelProfile);highlight(null);};
  document.addEventListener('pointerdown',e=>{
    dismissedPointer=outsideProfile(e.target);
    if(dismissedPointer){closeProfiles();e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('click',e=>{
    if(dismissedPointer||outsideProfile(e.target)){
      dismissedPointer=false;closeProfiles();e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
  document.addEventListener('wheel',e=>{
    const owner=[...scenes.values()].find(scene=>!scene.popup.hidden&&scene.popup.contains(e.target));
    const scene=owner||(performance.now()<wheelUntil?wheelOwner:null);
    if(scene&&scene.host.isConnected&&scene.host.getClientRects().length)scene.handleWheel(e,true);
  },{capture:true,passive:false});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){dismiss();window.APEX_REFRESH_METRIC?.();}});
  return {render,capture,morph,settle,dismiss,prune,alignMetric,alignedGeometry,metricOffsets,focusDriver:highlight,geometry,infieldBounds,pointAt,windowStart,comparisonLayout,SAMPLES,CAPACITY};
})();
