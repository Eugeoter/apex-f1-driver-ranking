"use strict";
// Shared color and texture identity for every metric view.
window.APEX_METRIC_TEXTURES=(()=>{
  // Exactly eight categorical hues. Each metric has a unique hue/surface pair.
  const palette={points:'#fa4e55',starts:'#86d9ff',wins:'#ffc24b',podiums:'#d2a7ff',qualifying:'#ff8b4d',racecraft:'#43c4a7',grid:'#667fe0',reliability:'#a6d665'};
  const encoding={
    championship_points:['points','solid'],points_per_start:['points','diagonal'],team_points_share:['points','dots'],
    race_starts:['starts','solid'],overtakes_per_start:['starts','diagonal'],net_overtakes_per_start:['starts','dots'],
    wins:['wins','solid'],win_rate:['wins','diagonal'],
    podiums:['podiums','solid'],podium_rate:['podiums','diagonal'],
    pole_positions:['qualifying','solid'],race_pace_score:['qualifying','diagonal'],
    average_finish_position:['racecraft','solid'],average_positions_gained:['racecraft','dots'],
    average_qualifying_position:['grid','solid'],
    finish_rate:['reliability','solid'],lap_consistency_score:['reliability','diagonal']
  };
  const color=key=>palette[encoding[key]?.[0]||'points'];
  const ns='http://www.w3.org/2000/svg', brushes=new WeakMap(), images=new Map();
  let serial=0;
  const kind=key=>encoding[key]?.[1]||'solid';
  const marks=type=>type==='diagonal'
    ? '<path d="M-2 2L2-2M0 8L8 0M6 10L10 6" fill="none" stroke="#101820" stroke-opacity=".36" stroke-width="1.6"/>'
    : '<circle cx="2" cy="2" r="1.2" fill="#101820" fill-opacity=".43"/><circle cx="6" cy="6" r="1.2" fill="#101820" fill-opacity=".43"/>';
  function css(key){
    const type=kind(key);
    if(type==='solid')return 'none';
    if(!images.has(type))images.set(type,`url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${ns}" width="8" height="8">${marks(type)}</svg>`)}')`);
    return images.get(type);
  }
  function stroke(canvas,key,color){
    const type=kind(key);
    if(type==='solid')return color;
    let brush=brushes.get(canvas);
    if(!brush){const defs=document.createElementNS(ns,'defs');canvas.prepend(defs);brush={defs,colors:new Map(),prefix:`metric-pattern-${++serial}`};brushes.set(canvas,brush);}
    const token=`${type}:${color}`;
    if(!brush.colors.has(token)){
      const id=`${brush.prefix}-${brush.colors.size}`,pattern=document.createElementNS(ns,'pattern');
      Object.entries({id,width:8,height:8,patternUnits:'userSpaceOnUse'}).forEach(([k,v])=>pattern.setAttribute(k,v));
      pattern.innerHTML=`<rect width="8" height="8" fill="${color}"/>${marks(type)}`;
      brush.defs.append(pattern);brush.colors.set(token,`url(#${id})`);
    }
    return brush.colors.get(token);
  }
  return {color,kind,css,stroke};
})();
