// Additive layout publication only. Never writes player states, inventory or wallets.
const fs = require('node:fs'),
  path = require('node:path'),
  C = require('../server/catalog.cjs'),
  { pool, tx } = require('../server/db.cjs');
const ids = ['courtyard', 'nave', 'classroom', 'baptistry', 'confession'],
  keys = ['bounds', 'blockers', 'entry', 'art', 'artVersion', 'walkPolygons', 'seats', 'contract'];
const previous = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/layouts/pre-v12-p0.json')));
function build(current, mode = 'p0') {
  const next = structuredClone(current);
  delete next.version;
  for (const id of ids) {
    const source = mode === 'previous' ? previous.scenes[id] : C.seed.scenes[id],
      sc = next.scenes[id];
    for (const key of keys) {
      if (source[key] === undefined) delete sc[key];
      else sc[key] = structuredClone(source[key]);
    }
    const generated = new Set([
      ...Object.keys(previous.scenes[id].anchors),
      ...Object.keys(C.seed.scenes[id].anchors),
    ]);
    sc.anchors = Object.fromEntries(
      Object.entries(sc.anchors || {}).filter(([key]) => !generated.has(key)),
    );
    Object.assign(sc.anchors, structuredClone(source.anchors));
    sc.npcPoints = { ...sc.npcPoints, ...source.npcPoints };
    sc.npc = [...new Set([...sc.npc, ...source.npc])];
    for (const spot of sc.spots) {
      const p = source.spots.find((s) => s[0] === spot[0]);
      if (p) [spot[3], spot[4]] = [p[3], p[4]];
    }
    for (const spot of source.spots)
      if (!sc.spots.some((s) => s[0] === spot[0])) sc.spots.push(structuredClone(spot));
    sc.entry = C.N.nearest(sc, sc.entry);
    if (mode === 'previous')
      for (const spot of sc.spots)
        if (
          !source.spots.some((s) => s[0] === spot[0]) &&
          C.seed.scenes[id].spots.some((s) => s[0] === spot[0])
        )
          sc.anchors[spot[0]] = C.N.nearest(sc, [spot[3], spot[4]]);
  }
  for (const a of next.actions)
    if (ids.includes(a.scene))
      a.anchor = structuredClone(
        mode === 'previous'
          ? previous.actions[a.id] || a.anchor
          : C.seed.actions.find((n) => n.id === a.id)?.anchor || a.anchor,
      );
  next.lessons = { ...C.seed.lessons, ...next.lessons };
  const errors = C.validate(next);
  for (const id of ids) {
    const sc = next.scenes[id];
    for (const p of Object.values({ ...sc.anchors, ...sc.npcPoints }))
      if (!C.N.walkable(sc, ...p) || !C.N.route(sc, sc.entry, p).length)
        errors.push('Unreachable ' + id + ' target ' + p);
  }
  if (errors.length) throw Error('LAYOUT_REVIEW_REQUIRED: ' + errors.join('; '));
  return next;
}
if (require.main === module) {
  const mode = process.argv[2],
    apply = process.argv.includes('--apply');
  if (!['p0', 'previous'].includes(mode)) {
    console.error('node scripts/v12-layout.cjs p0|previous [--apply]');
    process.exitCode = 1;
    pool.end();
  } else
    tx(async (db) => {
      await db.query('SELECT 1 FROM catalog_current WHERE singleton=true FOR UPDATE');
      const current = await C.current(db),
        next = build(current, mode);
      if (apply) {
        await db.query('UPDATE catalog_current SET payload=$1,version=version+1', [next]);
        await db.query(
          'INSERT INTO catalog_publications(version,payload,reason) VALUES($1,$2,$3)',
          [current.version + 1, next, 'V12 operator layout ' + mode + '; player data preserved'],
        );
      }
      console.log(
        JSON.stringify({
          mode,
          dryRun: !apply,
          from: current.version,
          to: apply ? current.version + 1 : null,
          scenes: ids,
        }),
      );
    })
      .catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
      })
      .finally(() => pool.end());
}
module.exports = { build, ids, keys };
