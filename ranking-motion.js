"use strict";

// Rank history belongs to a setup, not a view. Repainting or opening another
// view must not erase the last change indicators.
window.APEX_MOTION = (() => {
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function history(setup, ranking, key, period) {
    const signature = JSON.stringify([period, setup.weights, setup.enabled]);
    if (signature !== setup.rankSignature) {
      const next = new Map(ranking.map((driver, i) => [key(driver), i + 1]));
      setup.rankChanges = new Map([...next].map(([id, rank]) => [id, setup.rankPositions?.has(id) ? setup.rankPositions.get(id) - rank : 0]));
      setup.rankPositions = next;
      setup.rankSignature = signature;
    }
    return setup.rankChanges || new Map();
  }
  // Read every visible box before writing any animation styles. Capturing the
  // rendered boxes (rather than target CSS widths) preserves interrupted motion.
  function measureRow(row, scale) {
    const track = row.querySelector('.stack-track');
    if (!track) return {segments:new Map(), car:null};
    const bounds = track.getBoundingClientRect();
    const relative = element => {
      const rect=element.getBoundingClientRect();
      return {left:(rect.left-bounds.left)/scale,width:rect.width/scale};
    };
    const segments=new Map([...row.querySelectorAll('[data-segment-metric]')].map(s=>[s.dataset.segmentMetric,{element:s,...relative(s)}]));
    const car=row.querySelector('.race-car');
    return {segments,car:car?{element:car,...relative(car)}:null};
  }
  function snapshot(root, selector, attribute) {
    const result = new Map();
    if (!root || !root.getClientRects().length) return result;
    const bounds = root.getBoundingClientRect();
    const scale = bounds.width / root.offsetWidth || 1;
    root.querySelectorAll(selector).forEach(row => {
      const rect = row.getBoundingClientRect();
      if (rect.bottom < bounds.top - 100 || rect.top > bounds.bottom + 100) return;
      result.set(row.getAttribute(attribute), {
        top: (rect.top - bounds.top) / scale + root.scrollTop,
        ...measureRow(row,scale)
      });
    });
    return result;
  }
  function animate(root, selector, attribute, before, enabled = true) {
    if (!enabled || reduced() || !root?.getClientRects().length || !before.size) return;
    const bounds = root.getBoundingClientRect();
    const scale = bounds.width / root.offsetWidth || 1;
    const rows=[];
    root.querySelectorAll(selector).forEach(row=>{
      const rect=row.getBoundingClientRect();
      if(rect.bottom<bounds.top||rect.top>bounds.bottom)return;
      rows.push({row,top:(rect.top-bounds.top)/scale+root.scrollTop,previous:before.get(row.getAttribute(attribute)),...measureRow(row,scale)});
    });
    const timing={duration:460,easing:'cubic-bezier(.22,.7,.2,1)'};
    rows.forEach(({row,top,previous,segments,car})=>{
      if(!previous){row.animate([{opacity:.25},{opacity:1}],{duration:260});return;}
      const dy=previous.top-top;
      if(Math.abs(dy)>.5)row.animate([{transform:`translateY(${dy}px)`,zIndex:3},{transform:'translateY(0)',zIndex:3}],timing);
      segments.forEach((to,key)=>{
        const from=previous.segments.get(key)||{left:to.left,width:0};
        if(Math.abs(from.left-to.left)<.05&&Math.abs(from.width-to.width)<.05)return;
        const segment=to.element;
        // A disabled contribution collapses in place without pushing adjacent bars.
        if(to.width<.01){
          if(from.width<.01)return;
          Object.assign(segment.style,{position:'absolute',left:`${to.left}px`,width:`${from.width}px`});
          const motion=segment.animate([{transformOrigin:'0 50%',transform:`translateX(${from.left-to.left}px) scaleX(1)`},{transformOrigin:'0 50%',transform:'scaleX(0)'}],timing);
          motion.onfinish=()=>{segment.style.position='';segment.style.left='';segment.style.width='0%';};
        }else segment.animate([
          {transformOrigin:'0 50%',transform:`translateX(${from.left-to.left}px) scaleX(${from.width/to.width})`},
          {transformOrigin:'0 50%',transform:'translateX(0) scaleX(1)'}
        ],timing);
      });
      if(car&&previous.car){const dx=previous.car.left-car.left;if(Math.abs(dx)>.05)car.element.animate([
        {transform:`translate(calc(-50% + ${dx}px), -50%)`},{transform:'translate(-50%, -50%)'}
      ],timing);}
    });
  }
  function slider(input, target, from = Number(input.value), enabled = true) {
    if(enabled && input.motionFrame && input.motionTarget===target)return;
    cancelAnimationFrame(input.motionFrame);input.motionFrame=0;input.motionTarget=target;
    const paint = value => { input.value = String(value); input.style.setProperty('--weight-fill', `${value}%`); };
    if (!enabled || reduced() || Math.abs(target - from) < .01) { paint(target); return; }
    const start = performance.now();
    paint(from);
    const frame = time => {
      const progress = Math.min(1, (time - start) / 400);
      paint(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) input.motionFrame = requestAnimationFrame(frame);
      else input.motionFrame=0;
    };
    input.motionFrame = requestAnimationFrame(frame);
  }
  return {history, snapshot, animate, slider};
})();
