/* Clean architecture, floor and individual sprites. No V8 screenshot or baked HUD. */
(function () {
  'use strict';
  const svg = (box, url, cls) =>
    `<svg class="${cls}" viewBox="${box.join(' ')}" preserveAspectRatio="none" aria-hidden="true"><image href="${url}" width="${url.includes('objects') ? 1254 : 1672}" height="${url.includes('objects') ? 1254 : 941}"/></svg>`;
  const christmasAssets = {
    tree: 'tree',
    nativity: 'nativity',
    stall: 'stall',
    gifts: 'gifts',
  };
  const assetCache = new Map();
  const v8Names = ['nave', 'foyer', 'choir', 'garden', 'office', 'shoproom'];
  function assetList(sc) {
    if (!sc.art) return [];
    if (sc.art.theme === 'v12')
      return [
        'assets/v12/' + sc.art.background + '.webp',
        ...new Set(
          sc.art.props
            .filter((p) => typeof p.sprite === 'string')
            .map((p) => 'assets/v12/' + p.sprite + '.webp'),
        ),
        ...(sc.art.props.some((p) => typeof p.sprite === 'number' && !p.bench)
          ? ['assets/v8/objects.webp']
          : []),
      ];
    if (sc.art.theme === 'christmas-night')
      return [
        'assets/christmas/architecture.webp',
        ...Object.values(christmasAssets).map((name) => 'assets/christmas/' + name + '.webp'),
      ];
    return ['assets/v8/' + v8Names[sc.art.tile] + '.webp', 'assets/v8/objects.webp'];
  }
  function loadAsset(url) {
    if (assetCache.has(url)) return assetCache.get(url);
    const ready = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(url);
      img.onerror = () => {
        assetCache.delete(url);
        reject(Error('ASSET_UNAVAILABLE'));
      };
      img.src = url;
    });
    if (assetCache.size >= 32) assetCache.delete(assetCache.keys().next().value);
    assetCache.set(url, ready);
    return ready;
  }
  async function preload(sc) {
    const results = await Promise.allSettled(assetList(sc).map(loadAsset));
    return {
      ready: results.every((r) => r.status === 'fulfilled'),
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }
  function lantern(side) {
    return `<svg viewBox="0 0 90 340" aria-hidden="true"><defs><linearGradient id="noel-metal-${side}" x2="1" y2="0"><stop stop-color="#171e25"/><stop offset=".5" stop-color="#817453"/><stop offset="1" stop-color="#202935"/></linearGradient><radialGradient id="noel-lamp-${side}"><stop stop-color="#fffce1"/><stop offset=".35" stop-color="#ffd783" stop-opacity=".65"/><stop offset="1" stop-color="#e6a93b" stop-opacity="0"/></radialGradient></defs><ellipse cx="45" cy="327" rx="30" ry="9" fill="#09182c" opacity=".5"/><circle cx="45" cy="54" r="43" fill="url(#noel-lamp-${side})"/><path d="M32 314h26l6 14H26Zm6-218h14v219H38Z" fill="url(#noel-metal-${side})"/><path d="M22 40h46L61 91H29Z" fill="#ffe8a3" stroke="#595444" stroke-width="4"/><path d="M17 40 31 22h28l14 18ZM45 11v13M28 91h34l-9 11H37Z" fill="url(#noel-metal-${side})" stroke="#82734e" stroke-width="2"/><path d="M45 40v51M24 51h43" stroke="#66563e" stroke-width="3"/><path d="M23 139q22 28 44 0M23 149q22 28 44 0" fill="none" stroke="#2c604e" stroke-width="10"/><path d="M45 161c-35-26-34 23 0 0 33 23 34-26 0 0l-9 36 9-7 9 7Z" fill="#a83f46" stroke="#dc8066" stroke-width="1.5"/><circle cx="34" cy="151" r="3" fill="#efd092"/><circle cx="56" cy="151" r="3" fill="#efd092"/></svg>`;
  }
  function christmasLights(stage) {
    const layer = document.createElement('div');
    layer.className = 'scene-light christmas-lights';
    layer.setAttribute('aria-hidden', 'true');
    let bulbs = '';
    for (let i = 1; i < 32; i++) {
      const x = (i / 32) * 1672,
        t = (i % 16) / 16,
        y = 230 + 115 * 4 * t * (1 - t);
      bulbs += `<g class="christmas-bulb"><path d="M${x} ${y}v10" stroke="#b2a077" stroke-width="2"/><circle cx="${x}" cy="${y + 13}" r="11" fill="#ffc86d" opacity=".13"/><circle cx="${x}" cy="${y + 13}" r="3.5" fill="#fff1be"/></g>`;
    }
    layer.innerHTML = `<svg viewBox="0 0 1672 941" preserveAspectRatio="none"><path d="M0 230Q418 460 836 230Q1254 460 1672 230" fill="none" stroke="#a9976a" stroke-width="1.5" opacity=".7"/>${bulbs}</svg>`;
    stage.append(layer);
  }
  function mount(stage, sc) {
    delete stage.dataset.assetWarned;
    stage.querySelectorAll('.scene-prop,.scene-light').forEach((el) => el.remove());
    stage.dataset.art = sc.artVersion || 'legacy';
    const loadingScene = stage.dataset.scene;
    stage.dataset.assetsReady = 'false';
    preload(sc).then((result) => {
      if (stage.dataset.scene === loadingScene) stage.dataset.assetsReady = String(result.ready);
    });
    stage.closest('.game').dataset.worldTheme = sc.art?.theme || '';
    stage.parentElement.classList.toggle('layered-world', !!sc.art);
    if (!sc.art) return false;
    const { tile, props } = sc.art;
    const christmas = sc.art.theme === 'christmas-night',
      name = ['nave', 'foyer', 'choir', 'garden', 'office', 'shoproom'][tile],
      texture = christmas ? 'assets/christmas/architecture.webp' : 'assets/v8/' + name + '.webp';
    document.getElementById('scenery').innerHTML =
      svg([0, 0, 1672, 941 * 0.58], texture, 'scene-wall') +
      svg([0, 941 * 0.58, 1672, 941 * 0.42], texture, 'scene-floor');
    if (christmas) christmasLights(stage);
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
      if (christmas && (christmasAssets[p.sprite] || p.sprite === 'lantern')) {
        el.innerHTML =
          p.sprite === 'lantern'
            ? lantern(p.x < 50 ? 'left' : 'right')
            : `<img class="prop-sprite" src="assets/christmas/${christmasAssets[p.sprite]}.webp" alt="" draggable="false"/>`;
        stage.append(el);
        continue;
      }
      if (p.bench) {
        el.dataset.benchPart = 'back';
        el.style.zIndex = String(Math.round(p.depth * 10) - 1);
        el.innerHTML = window.PARISH_PEW({ ...p.bench, id: p.id }, 'back');
        const front = el.cloneNode(false);
        front.dataset.benchPart = 'front';
        front.style.zIndex = String(Math.round(p.depth * 10) + 1);
        front.innerHTML = window.PARISH_PEW({ ...p.bench, id: p.id }, 'front');
        stage.append(el, front);
        continue;
      }
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
    for (const img of stage.querySelectorAll('#scenery image,.scene-prop image,.scene-prop img'))
      img.addEventListener(
        'error',
        () => {
          const element = img.closest('.scene-prop') || img.parentElement;
          element.classList.add('asset-unavailable');
          if (!stage.dataset.assetWarned) {
            stage.dataset.assetWarned = 'true';
            window.dispatchEvent(new Event('parish:asset-error'));
          }
        },
        { once: true },
      );
    return true;
  }
  const depth = (y) => Math.round(y * 10),
    scale = (y) => Math.max(0.6, Math.min(1.2, 0.6 + (y - 56) * 0.014));
  window.PARISH_SCENE_ART = { mount, depth, scale, preload, assetList };
})();
