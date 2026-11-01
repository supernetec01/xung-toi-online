const assert = require('node:assert/strict'),
  fs = require('node:fs');
const { loadCatalog } = require('../scripts/lib/m0-project.cjs'),
  V = require('../game_v3/src/scene-contract.js');
const base = loadCatalog(),
  D = base.PARISH_DATA,
  N = base.PARISH_NAV;
let checks = 0;
const ok = (v, message) => {
  assert(v, message);
  checks++;
};
ok(V.validate(D, N).length === 0, 'current eleven scenes retain a valid legacy adapter');
ok(Object.keys(V.aliases).length === 11, 'eleven design aliases resolve to stable IDs');
for (const id of Object.keys(D.scenes)) {
  const d = V.describe(id, D.scenes[id]);
  ok(d.interactions.length === D.scenes[id].spots.length, 'all interactions retained ' + id);
  ok(
    d.portals.every((p) => D.scenes[p.destinationSceneId]),
    'all portals resolve ' + id,
  );
}
const scene = {
  contract: { version: 1, feet: [0.4, 0.3] },
  bounds: [0, 0, 100, 100],
  entry: [50, 90],
  blockers: [[40, 40, 60, 60]],
  anchors: { notice: [50, 65] },
  npcPoints: {},
  npc: [],
  spots: [['notice', '📋', 'Bảng tin', 50, 55, 'info']],
};
ok(
  !V.validate({ scenes: { room: scene } }, N).length,
  'strict contract accepts reachable geometry',
);
for (const mutation of [
  (s) => (s.entry = [50, 50]),
  (s) => (s.anchors.notice = [50, 50]),
  (s) => (s.contract.feet = [5, 5]),
  (s) => (s.blockers = [[70, 20, 50, 30]]),
  (s) => s.spots.push([...s.spots[0]]),
  (s) => s.spots.push(['bad_gate', '🚪', 'Cửa', 20, 80, 'go', 'unknown']),
  (s) => (s.art = { theme: 'v12', background: '../../private', props: [] }),
  (s) =>
    (s.art = {
      theme: 'v12',
      background: 'nave',
      props: [
        { id: 'unsafe', sprite: 'https://example.test/x', x: 30, y: 80, w: 10, h: 10, depth: 80 },
      ],
    }),
]) {
  const draft = structuredClone(scene);
  mutation(draft);
  ok(V.validate({ scenes: { room: draft } }, N).length > 0, 'bad scene refused');
}
fs.mkdirSync('artifacts/v12', { recursive: true });
fs.writeFileSync(
  'artifacts/v12/t01-contract.json',
  JSON.stringify({ checks, legacyScenes: 11, passed: true }, null, 2) + '\n',
);
console.log(`PASS ${checks} shared scene contract checks.`);
