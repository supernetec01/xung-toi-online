/* Clean architecture, floor and individual sprites. No V8 screenshot or baked HUD. */
(function () {
  'use strict';
  const svg = (box, url, cls) =>
    `<svg class="${cls}" viewBox="${box.join(' ')}" preserveAspectRatio="none" aria-hidden="true"><image href="${url}" width="${url.includes('objects') ? 1254 : 1672}" height="${url.includes('objects') ? 1254 : 941}"/></svg>`;
  function mount(stage, sc) {
    stage.querySelectorAll('.scene-prop,.scene-light').forEach((el) => el.remove());
    stage.dataset.art = sc.artVersion || 'legacy';
    stage.parentElement.classList.toggle('layered-world', !!sc.art);
    if (!sc.art) return false;
    const { tile, props } = sc.art;
    const name = ['nave', 'foyer', 'choir', 'garden', 'office', 'shoproom'][tile];
    const texture = 'assets/v8/' + name + '.webp';
    document.getElementById('scenery').innerHTML =
      svg([0, 0, 1672, 941 * 0.58], texture, 'scene-wall') +
      svg([0, 941 * 0.58, 1672, 941 * 0.42], texture, 'scene-floor');
    for (const p of props) {
      const el = document.createElement('div');
      el.className = 'scene-prop';
      el.dataset.prop = p.id;
      Object.assign(el.style, {
        left: p.x + '%',
        top: p.y + '%',
        width: p.w + '%',
        height: p.h + '%',
        zIndex: String(Math.round(p.depth * 10)),
      });
      // Tight, measured source rectangles prevent adjacent atlas sprites bleeding.
      const rects = [
        [12, 32, 308, 290],
        [320, 28, 362, 292],
        [704, 25, 191, 304],
        [944, 24, 308, 304],
        [12, 330, 365, 305],
        [391, 352, 208, 284],
        [660, 336, 248, 294],
        [944, 365, 302, 268],
        [14, 644, 333, 291],
        [371, 637, 215, 300],
        [609, 677, 410, 263],
        [1030, 658, 199, 279],
        [10, 949, 375, 262],
        [383, 954, 312, 265],
        [718, 950, 208, 250],
        [1001, 936, 263, 280],
      ];
      el.innerHTML = svg(
        rects[p.sprite].map((v) => (v * 1254) / 1280),
        'assets/v8/objects.webp',
        'prop-sprite',
      );
      stage.append(el);
    }
    return true;
  }
  const depth = (y) => Math.round(y * 10),
    scale = (y) => Math.max(0.6, Math.min(1.2, 0.6 + (y - 56) * 0.014));
  window.PARISH_SCENE_ART = { mount, depth, scale };
})();
