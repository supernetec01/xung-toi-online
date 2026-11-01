(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function inside(poly, x, y) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [a, b] = poly[i],
        [c, d] = poly[j];
      if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) hit = !hit;
    }
    return hit;
  }
  function walkable(scene, x, y) {
    const [l, t, r, b] = scene.bounds,
      [rx, ry] = scene.contract?.feet || [0, 0],
      corners = [
        [x - rx, y - ry],
        [x + rx, y - ry],
        [x + rx, y + ry],
        [x - rx, y + ry],
      ];
    return (
      x - rx >= l &&
      x + rx <= r &&
      y - ry >= t &&
      y + ry <= b &&
      (!scene.walkPolygons ||
        scene.walkPolygons.some((p) => corners.every(([px, py]) => inside(p, px, py)))) &&
      !scene.blockers.some(
        ([l, t, r, b]) => x + rx >= l && x - rx <= r && y + ry >= t && y - ry <= b,
      )
    );
  }
  function nearest(scene, [x, y], connected = false) {
    if (
      walkable(scene, x, y) &&
      Math.abs((x - scene.bounds[0]) / 2 - Math.round((x - scene.bounds[0]) / 2)) < 0.0001 &&
      Math.abs((y - scene.bounds[1]) / 2 - Math.round((y - scene.bounds[1]) / 2)) < 0.0001
    )
      return [x, y];
    let best = null,
      d = Infinity;
    const [l, t, r, b] = scene.bounds;
    for (let px = l; px <= r; px += 2)
      for (let py = t; py <= b; py += 2) {
        const dist = (px - x) ** 2 + (py - y) ** 2;
        if (
          walkable(scene, px, py) &&
          dist < d &&
          (!connected || segment(scene, [x, y], [px, py]))
        ) {
          best = [px, py];
          d = dist;
        }
      }
    return best;
  }
  function segment(scene, a, b) {
    if (!walkable(scene, ...a) || !walkable(scene, ...b)) return false;
    const [rx, ry] = scene.contract?.feet || [0, 0];
    // Slab intersection with expanded solid rectangles: even a very thin wall
    // cannot be skipped by a long frame, a fast packet or sparse path samples.
    for (const [l, t, r, bot] of scene.blockers) {
      let enter = 0,
        leave = 1,
        hit = true;
      for (const [axis, min, max] of [
        [0, l - rx, r + rx],
        [1, t - ry, bot + ry],
      ]) {
        const delta = b[axis] - a[axis];
        if (Math.abs(delta) < 1e-10) {
          if (a[axis] < min || a[axis] > max) {
            hit = false;
            break;
          }
        } else {
          const near = (min - a[axis]) / delta,
            far = (max - a[axis]) / delta;
          enter = Math.max(enter, Math.min(near, far));
          leave = Math.min(leave, Math.max(near, far));
          if (enter > leave) {
            hit = false;
            break;
          }
        }
      }
      if (hit && enter <= 1 && leave >= 0) return false;
    }
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4));
    for (let i = 0; i <= n; i++)
      if (!walkable(scene, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n))
        return false;
    return true;
  }
  function route(scene, from, to) {
    const start = nearest(scene, from, walkable(scene, ...from)),
      goal = nearest(scene, to, walkable(scene, ...to));
    if (!start || !goal) return [];
    // Preserve an exact valid pointer position, but connect it to the path grid
    // only with a tested segment. Snapping must never tunnel across a prop.
    const prefix = walkable(scene, ...from) && segment(scene, from, start) ? [from] : [];
    const suffix = walkable(scene, ...to) && segment(scene, goal, to) ? [to] : [];
    if (segment(scene, start, goal)) return [...prefix, start, goal, ...suffix];
    const key = (p) => p.join(','),
      heuristic = (p) => Math.abs(p[0] - goal[0]) + Math.abs(p[1] - goal[1]);
    const queue = [],
      previous = new Map([[key(start), null]]),
      scores = new Map([[key(start), 0]]),
      closed = new Set();
    const less = (a, b) =>
      a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.order < b.order)));
    let order = 0;
    function push(p, g) {
      const node = { p, g, h: heuristic(p), order: order++ };
      node.f = node.g + node.h;
      queue.push(node);
      let i = queue.length - 1;
      while (i) {
        const parent = (i - 1) >> 1;
        if (!less(queue[i], queue[parent])) break;
        [queue[i], queue[parent]] = [queue[parent], queue[i]];
        i = parent;
      }
    }
    function pop() {
      const first = queue[0],
        last = queue.pop();
      if (queue.length) {
        queue[0] = last;
        let i = 0;
        for (;;) {
          let next = i,
            left = i * 2 + 1,
            right = left + 1;
          if (left < queue.length && less(queue[left], queue[next])) next = left;
          if (right < queue.length && less(queue[right], queue[next])) next = right;
          if (next === i) break;
          [queue[i], queue[next]] = [queue[next], queue[i]];
          i = next;
        }
      }
      return first;
    }
    push(start, 0);
    let end = null;
    while (queue.length) {
      const node = pop(),
        p = node.p,
        k = key(p);
      if (closed.has(k) || node.g !== scores.get(k)) continue;
      closed.add(k);
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
        const qk = key(q),
          g = node.g + 2;
        if (
          !closed.has(qk) &&
          g < (scores.get(qk) ?? Infinity) &&
          walkable(scene, ...q) &&
          segment(scene, p, q)
        ) {
          previous.set(qk, p);
          scores.set(qk, g);
          push(q, g);
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
    return [...prefix, ...path, ...suffix];
  }
  root.PARISH_NAV = { walkable, nearest, segment, route, clamp };
})(typeof window === 'undefined' ? globalThis : window);
