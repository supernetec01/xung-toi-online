const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { loadCatalog } = require('../scripts/lib/m0-project.cjs');
const N = loadCatalog().PARISH_NAV;
let checks = 0;
const ok = (v, label) => {
  assert(v, label);
  checks++;
};
const lab = {
  bounds: [0, 0, 100, 100],
  contract: { version: 1, feet: [0.65, 0.35] },
  blockers: [[40, 40, 60, 60]],
  walkPolygons: [
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
  ],
};
ok(!N.walkable(lab, 39.8, 50), 'feet cannot overlap collider while center stays outside');
ok(N.walkable(lab, 39, 50), 'clear foot rectangle remains walkable');
ok(!N.walkable(lab, 0.3, 20), 'whole footprint must remain on floor');
ok(!N.segment(lab, [20, 50], [80, 50]), 'large frame cannot cross obstacle');
const thin = { ...lab, contract: { feet: [0, 0] }, blockers: [[50.01, 10, 50.02, 90]] };
ok(!N.segment(thin, [10, 50], [90, 50]), 'analytical sweep catches 0.01-unit wall');
ok(N.segment(thin, [10, 5], [90, 5]), 'unobstructed segment is accepted');
ok(!N.segment(lab, [30, 39.8], [70, 39.8]), 'footprint expansion prevents corner grazing');
const path = N.route(lab, [20, 50], [80, 50]);
ok(path.length > 2, 'A* finds route around central collider');
ok(
  path.every((p) => N.walkable(lab, ...p)),
  'all path nodes have valid feet',
);
ok(
  path.slice(1).every((p, i) => N.segment(lab, path[i], p)),
  'smoothed path does not cut corners',
);
ok(Math.hypot(path.at(-1)[0] - 80, path.at(-1)[1] - 50) < 0.01, 'valid exact target retained');
const projected = N.nearest(lab, [50, 50]);
ok(projected && N.walkable(lab, ...projected), 'blocked spawn recovers to valid feet position');
const divided = { ...lab, blockers: [[49, 0, 51, 100]] };
ok(N.route(divided, [20, 50], [80, 50]).length === 0, 'unreachable island refused');
const start = performance.now();
for (let i = 0; i < 100; i++) assert(N.route(lab, [20, 50], [80, 50]).length);
const elapsed = performance.now() - start;
fs.writeFileSync(
  'artifacts/v12/t02-navigation.json',
  JSON.stringify({ checks, route100Ms: elapsed, passed: true }, null, 2) + '\n',
);
console.log(
  `PASS ${checks} feet/A*/swept-collision checks; 100 routes in ${elapsed.toFixed(1)}ms.`,
);
