"use strict";
// Texture supplements the existing hue. Reuse just three surfaces, not 17 patterns.
window.APEX_METRIC_TEXTURES=(()=>{
  const styles={
    points_per_start:'diagonal',win_rate:'dots',pole_positions:'diagonal',
    average_qualifying_position:'diagonal',average_positions_gained:'dots',
    finish_rate:'diagonal',team_points_share:'dots',race_pace_score:'dots',
    lap_consistency_score:'diagonal',overtakes_per_start:'dots',net_overtakes_per_start:'diagonal'
  };
  const ns='http://www.w3.org/2000/svg', brushes=new WeakMap(), images=new Map();
  let serial=0;
  const kind=key=>styles[key]||'solid';
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
  return {kind,css,stroke};
})();
