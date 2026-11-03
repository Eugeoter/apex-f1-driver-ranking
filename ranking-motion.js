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
        widths: new Map([...row.querySelectorAll('[data-segment-metric]')].map(s => [s.dataset.segmentMetric, s.style.width])),
        car: row.querySelector('.race-car')?.style.getPropertyValue('--car-position')
      });
    });
    return result;
  }
  function animate(root, selector, attribute, before, enabled = true) {
    if (!enabled || reduced() || !root?.getClientRects().length || !before.size) return;
    const bounds = root.getBoundingClientRect();
    const scale = bounds.width / root.offsetWidth || 1;
    root.querySelectorAll(selector).forEach(row => {
      const rect = row.getBoundingClientRect();
      if (rect.bottom < bounds.top || rect.top > bounds.bottom) return;
      const previous = before.get(row.getAttribute(attribute));
      if (!previous) { row.animate([{opacity:.25}, {opacity:1}], {duration:260}); return; }
      const dy = previous.top - ((rect.top - bounds.top) / scale + root.scrollTop);
      if (Math.abs(dy) > .5) row.animate([
        {transform:`translateY(${dy}px)`, zIndex:3}, {transform:'translateY(0)', zIndex:3}
      ], {duration:460, easing:'cubic-bezier(.22,.7,.2,1)'});
      row.querySelectorAll('[data-segment-metric]').forEach(segment => {
        const from = previous.widths.get(segment.dataset.segmentMetric) || '0%';
        if (from !== segment.style.width) segment.animate([{width:from}, {width:segment.style.width}], {duration:460,easing:'cubic-bezier(.22,.7,.2,1)'});
      });
      const car = row.querySelector('.race-car');
      if (car && previous.car) car.animate([
        {left:`clamp(14px, ${previous.car}, calc(100% - 15px))`},
        {left:`clamp(14px, ${car.style.getPropertyValue('--car-position')}, calc(100% - 15px))`}
      ], {duration:460,easing:'cubic-bezier(.22,.7,.2,1)'});
    });
  }
  function slider(input, target, from = Number(input.value), enabled = true) {
    cancelAnimationFrame(input.motionFrame);
    const paint = value => { input.value = String(value); input.style.setProperty('--weight-fill', `${value}%`); };
    if (!enabled || reduced() || Math.abs(target - from) < .01) { paint(target); return; }
    const start = performance.now();
    paint(from);
    const frame = time => {
      const progress = Math.min(1, (time - start) / 400);
      paint(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) input.motionFrame = requestAnimationFrame(frame);
    };
    input.motionFrame = requestAnimationFrame(frame);
  }
  return {history, snapshot, animate, slider};
})();
