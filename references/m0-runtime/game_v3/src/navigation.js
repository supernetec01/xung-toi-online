(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function walkable(scene, x, y) {
    const [l, t, r, b] = scene.bounds;
    return (
      x >= l &&
      x <= r &&
      y >= t &&
      y <= b &&
      !scene.blockers.some(([l, t, r, b]) => x >= l && x <= r && y >= t && y <= b)
    );
  }
  function nearest(scene, [x, y]) {
    let best = null,
      d = Infinity;
    const [l, t, r, b] = scene.bounds;
    for (let px = l; px <= r; px += 2)
      for (let py = t; py <= b; py += 2) {
        const dist = (px - x) ** 2 + (py - y) ** 2;
        if (walkable(scene, px, py) && dist < d) {
          best = [px, py];
          d = dist;
        }
      }
    return best;
  }
  function segment(scene, a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let i = 0; i <= n; i++)
      if (!walkable(scene, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n))
        return false;
    return true;
  }
  function route(scene, from, to) {
    const start = nearest(scene, from),
      goal = nearest(scene, to);
    if (!start || !goal) return [];
    const key = (p) => p.join(',');
    const queue = [start],
      previous = new Map([[key(start), null]]);
    let end = null;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (key(p) === key(goal)) {
        end = p;
        break;
      }
      for (const [dx, dy] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        const q = [p[0] + dx, p[1] + dy];
        if (walkable(scene, ...q) && !previous.has(key(q))) {
          previous.set(key(q), p);
          queue.push(q);
        }
      }
    }
    if (!end) return [];
    const full = [];
    for (let p = end; p; p = previous.get(key(p))) full.unshift(p);
    const path = [full[0]];
    for (let i = 1; i < full.length; i++) {
      if (!segment(scene, path.at(-1), full[i])) path.push(full[i - 1]);
    }
    if (key(path.at(-1)) !== key(goal)) path.push(goal);
    return path;
  }
  root.PARISH_NAV = { walkable, nearest, segment, route, clamp };
})(typeof window === 'undefined' ? globalThis : window);
