// Operator CLI. Only scene geometry/anchors are published; player tables are untouched.
const fs = require('node:fs');
const path = require('node:path');
const C = require('../server/catalog.cjs');
const { pool, tx } = require('../server/db.cjs');
const mode = process.argv[2];
const apply = process.argv.includes('--apply');
const keys = [
  'bounds',
  'blockers',
  'anchors',
  'npcPoints',
  'entry',
  'art',
  'artVersion',
  'walkPolygons',
  'seats',
];
async function publish(db, selected, write = false) {
  const current = await C.current(db),
    next = structuredClone(current);
  delete next.version;
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/layouts/pre-v8.json')));
  const reference =
    selected === 'v4'
      ? old.scenes
      : selected === 'v8'
        ? {
            ...C.seed.scenes,
            nave: JSON.parse(fs.readFileSync(path.join(__dirname, '../db/layouts/pre-v9.json'))),
          }
        : C.seed.scenes;
  for (const id of Object.keys(old.scenes)) {
    const source = reference[id],
      sc = next.scenes[id];
    for (const key of keys) {
      if (['anchors', 'npcPoints'].includes(key)) {
        const points = { ...sc[key] };
        for (const generated of new Set([
          ...Object.keys(old.scenes[id][key] || {}),
          ...Object.keys(C.seed.scenes[id][key] || {}),
        ]))
          delete points[generated];
        sc[key] = { ...points, ...source[key] };
      } else if (source[key] !== undefined) sc[key] = structuredClone(source[key]);
      else delete sc[key];
    }
    for (const s of sc.spots) {
      const original = source.spots.find((x) => x[0] === s[0]);
      if (original) {
        [s[3], s[4]] = [original[3], original[4]];
        if (s[5] === 'go' && original[5] === 'go') s[6] = original[6];
      }
    }
    // Legacy fixed NPC points sometimes sat inside the old counter/piano.
    // Reproject only bundled NPCs; invalid custom content must be reviewed.
    for (const npc of Object.keys(source.npcPoints || {})) {
      if (!C.N.walkable(sc, ...sc.npcPoints[npc]))
        sc.npcPoints[npc] = C.N.nearest(sc, sc.npcPoints[npc]);
    }
  }
  for (const a of next.actions) {
    const point =
      selected === 'v4' ? old.actions[a.id] : C.seed.actions.find((x) => x.id === a.id)?.anchor;
    if (point) a.anchor = structuredClone(point);
  }
  const errors = C.validate(next);
  for (const [id, sc] of Object.entries(next.scenes)) {
    for (const [npc, point] of Object.entries(sc.npcPoints))
      if (!C.N.walkable(sc, ...point)) errors.push('NPC outside floor: ' + id + '/' + npc);
    for (const [spot, point] of Object.entries(sc.anchors))
      if (!C.N.walkable(sc, ...point)) errors.push('Anchor outside floor: ' + id + '/' + spot);
  }
  if (errors.length) throw Error('LAYOUT_INVALID: ' + errors.join('; '));
  if (write) {
    await db.query('UPDATE catalog_current SET version=version+1,payload=$1', [next]);
    await db.query('INSERT INTO catalog_publications(version,payload,reason) VALUES($1,$2,$3)', [
      current.version + 1,
      next,
      'Operator scene layout ' + selected + '; player data preserved',
    ]);
  }
  return {
    from: current.version,
    to: write ? current.version + 1 : null,
    layout: selected,
    dryRun: !write,
    scenes: Object.keys(old.scenes),
  };
}
if (require.main === module) {
  if (!['v4', 'v8', 'v9'].includes(mode)) {
    console.error('Usage: node scripts/scene-layout.cjs v4|v8|v9 [--apply] (default: dry run)');
    process.exitCode = 1;
    pool.end();
  } else
    tx(async (db) => {
      await db.query('SELECT 1 FROM catalog_current WHERE singleton=true FOR UPDATE');
      console.log(JSON.stringify(await publish(db, mode, apply), null, 2));
    })
      .catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
      })
      .finally(() => pool.end());
}
module.exports = { publish };
