// Operator-only, reversible scene publication. Player/economy tables are never changed.
const fs = require('node:fs'),
  path = require('node:path'),
  C = require('../server/catalog.cjs'),
  { pool, tx } = require('../server/db.cjs');
const keys = ['bounds', 'blockers', 'entry', 'art', 'artVersion', 'walkPolygons'];
function patch(current, mode) {
  const previous = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../db/layouts/pre-christmas-night.json')),
    ),
    source = mode === 'previous' ? previous.scene : C.seed.scenes.christmas,
    next = structuredClone(current),
    sc = next.scenes.christmas;
  delete next.version;
  for (const key of keys) {
    if (source[key] === undefined) delete sc[key];
    else sc[key] = structuredClone(source[key]);
  }
  sc.anchors = { ...sc.anchors, ...source.anchors };
  sc.npcPoints = { ...sc.npcPoints, ...source.npcPoints };
  for (const spot of sc.spots) {
    const original = source.spots.find((p) => p[0] === spot[0]);
    if (original) [spot[3], spot[4]] = [original[3], original[4]];
  }
  for (const a of next.actions)
    if (a.id === 'noel')
      a.anchor =
        mode === 'previous' ? previous.action : C.seed.actions.find((p) => p.id === 'noel').anchor;
  const errors = C.validate(next);
  for (const point of [...Object.values(sc.anchors), ...Object.values(sc.npcPoints), sc.entry])
    if (!C.N.walkable(sc, ...point) || !C.N.route(sc, sc.entry, point).length)
      errors.push('Christmas target is unreachable');
  if (errors.length) throw Error(errors.join('; '));
  return next;
}
if (require.main === module) {
  const mode = process.argv[2],
    apply = process.argv.includes('--apply');
  if (!['night', 'previous'].includes(mode)) {
    console.error('Usage: node scripts/christmas-layout.cjs night|previous [--apply]');
    process.exitCode = 1;
    pool.end();
  } else
    tx(async (db) => {
      await db.query('SELECT 1 FROM catalog_current WHERE singleton=true FOR UPDATE');
      const current = await C.current(db),
        next = patch(current, mode);
      if (apply) {
        await db.query('UPDATE catalog_current SET version=version+1,payload=$1', [next]);
        await db.query(
          'INSERT INTO catalog_publications(version,payload,reason) VALUES($1,$2,$3)',
          [
            current.version + 1,
            next,
            'Operator Christmas layout ' + mode + '; player data preserved',
          ],
        );
      }
      console.log(
        JSON.stringify({
          mode,
          dryRun: !apply,
          from: current.version,
          to: apply ? current.version + 1 : null,
        }),
      );
    })
      .catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
      })
      .finally(() => pool.end());
}
module.exports = { patch };
