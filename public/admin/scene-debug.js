/* Served only to authenticated ADMIN/SUPER_ADMIN. Never part of public startup. */
(() => {
  'use strict';
  if (window.PARISH_SCENE_DEBUG) return;
  const flags = Object.fromEntries(
    ['showWalkable', 'showColliders', 'showSeats', 'showPortals', 'showAnchors', 'showDepth'].map(
      (k) => [k, true],
    ),
  );
  const panel = document.createElement('aside');
  panel.id = 'sceneDebugPanel';
  panel.setAttribute('aria-label', 'Developer scene overlays');
  Object.assign(panel.style, {
    position: 'fixed',
    right: '12px',
    top: '175px',
    width: '230px',
    zIndex: '9999',
    background: '#102c32ef',
    color: '#fff2ca',
    padding: '12px',
    borderRadius: '12px',
    font: '12px system-ui',
  });
  const title = document.createElement('b');
  title.textContent = 'Developer · Scene V12';
  panel.append(title);
  let overlay;
  function render() {
    overlay?.remove();
    const stage = document.getElementById('stage'),
      sc = window.PARISH_DATA?.scenes[stage?.dataset.scene];
    if (!sc || !window.PARISH_SCENE_CONTRACT) return;
    const d = PARISH_SCENE_CONTRACT.describe(stage.dataset.scene, sc);
    const ns = 'http://www.w3.org/2000/svg';
    overlay = document.createElementNS(ns, 'svg');
    overlay.id = 'sceneDebugOverlay';
    overlay.setAttribute('viewBox', '0 0 100 100');
    overlay.setAttribute('preserveAspectRatio', 'none');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '1800',
      pointerEvents: 'none',
      overflow: 'visible',
    });
    const shape = (name, attrs) => {
      const el = document.createElementNS(ns, name);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      overlay.append(el);
      return el;
    };
    const label = (point, text, color) => {
      const el = shape('text', {
        x: point[0],
        y: point[1],
        fill: color,
        'font-size': '.85',
        'paint-order': 'stroke',
        stroke: '#13232b',
        'stroke-width': '.18',
      });
      el.textContent = text;
    };
    const dot = (p, color, text) => {
      shape('circle', { cx: p[0], cy: p[1], r: '.45', fill: color });
      label([p[0] + 0.7, p[1]], text, color);
    };
    if (flags.showWalkable)
      for (const p of d.walkablePolygons)
        shape('polygon', {
          points: p.map((v) => v.join(',')).join(' '),
          fill: '#47efb014',
          stroke: '#47efb0',
          'stroke-width': '.15',
        });
    if (flags.showColliders)
      for (const [l, t, r, b] of d.colliders)
        shape('rect', {
          x: l,
          y: t,
          width: r - l,
          height: b - t,
          fill: '#ed6d6d33',
          stroke: '#ff6e72',
          'stroke-width': '.15',
        });
    if (flags.showAnchors) for (const p of d.interactions) dot(p.accessPoint, '#d8ff6a', p.id);
    if (flags.showPortals)
      for (const p of d.portals) dot(p.position, '#5adfff', p.id + ' → ' + p.destinationSceneId);
    if (flags.showSeats)
      for (const [id, list] of Object.entries(d.seats))
        for (const [i, s] of list.entries()) {
          dot(s.position, '#c3a3ff', id + ':' + i + ' ↑');
          shape('line', {
            x1: s.position[0],
            y1: s.position[1],
            x2: s.approach[0],
            y2: s.approach[1],
            stroke: '#c3a3ff',
            'stroke-width': '.12',
          });
        }
    if (flags.showDepth)
      for (const p of d.entities)
        label([p.x, p.depth], p.id + ' @' + p.depth.toFixed(1), '#ffcb87');
    stage.append(overlay);
  }
  for (const key of Object.keys(flags)) {
    const row = document.createElement('label');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '30px',
    });
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    input.dataset.debugFlag = key;
    input.onchange = () => {
      flags[key] = input.checked;
      render();
    };
    row.append(input, document.createTextNode(key));
    panel.append(row);
  }
  const close = document.createElement('button');
  close.textContent = 'Đóng debug';
  close.style.minHeight = '44px';
  panel.append(close);
  document.body.append(panel);
  const stage = document.getElementById('stage');
  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(render, 30);
  });
  if (stage)
    observer.observe(stage, { attributes: true, attributeFilter: ['data-scene', 'data-art'] });
  const ready = setInterval(() => {
    if (document.getElementById('stage')?.dataset.scene) {
      clearInterval(ready);
      render();
    }
  }, 100);
  window.addEventListener('parish:catalog', render);
  window.PARISH_SCENE_DEBUG = {
    flags,
    render,
    destroy() {
      clearInterval(ready);
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('parish:catalog', render);
      overlay?.remove();
      panel.remove();
      delete window.PARISH_SCENE_DEBUG;
    },
  };
  close.onclick = () => window.PARISH_SCENE_DEBUG.destroy();
})();
