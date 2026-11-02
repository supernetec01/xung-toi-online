const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto');
const { pool } = require('../server/db.cjs'),
  C = require('../server/catalog.cjs');
const { ids } = require('../scripts/v12-layout.cjs');
if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL)
  throw Error('Isolated test database only');
const sql = fs.readFileSync('db/migrations/012_v12_p0_scenes.sql', 'utf8');
async function fingerprint(db) {
  const rows = {};
  for (const table of ['game_users', 'player_states', 'game_wallets', 'coin_ledger'])
    rows[table] = (
      await db.query(
        `SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS data FROM ${table} t`,
      )
    ).rows[0].data;
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
(async () => {
  const db = await pool.connect();
  try {
    const original = await C.current(db),
      hash = await fingerprint(db);
    await db.query('BEGIN');
    try {
      const custom = structuredClone(original);
      delete custom.version;
      custom.items[0].name = 'Giữ vật phẩm Admin';
      custom.scenes.classroom.spots.find((s) => s[0] === 'book')[2] = 'Tên sách Admin';
      await db.query('UPDATE catalog_current SET payload=$1', [custom]);
      await db.query(sql);
      const next = await C.current(db);
      assert.deepEqual(C.validate(next), []);
      assert.deepEqual(next.items, custom.items);
      assert.deepEqual(next.quests, custom.quests);
      assert.equal(next.scenes.classroom.spots.find((s) => s[0] === 'book')[2], 'Tên sách Admin');
      for (const id of Object.keys(next.scenes).filter((id) => !ids.includes(id)))
        assert.deepEqual(next.scenes[id], custom.scenes[id]);
      assert.equal(await fingerprint(db), hash);
    } finally {
      await db.query('ROLLBACK');
    }
    assert.deepEqual(await C.current(db), original);
    await db.query('BEGIN');
    let rejected = false;
    try {
      const bad = structuredClone(original);
      delete bad.version;
      bad.scenes.courtyard.anchors.custom_content = [17, 90];
      await db.query('UPDATE catalog_current SET payload=$1', [bad]);
      await db.query(sql);
      const errors = C.validate(await C.current(db));
      assert(errors.some((e) => e.includes('custom_content')));
      rejected = true;
    } finally {
      await db.query('ROLLBACK');
    }
    assert(rejected);
    assert.deepEqual(await C.current(db), original);
    assert.equal(await fingerprint(db), hash);
    fs.writeFileSync(
      'artifacts/v12/p0-migration.json',
      JSON.stringify(
        {
          additiveSqlValidated: true,
          customLabelsAndEconomyPreserved: true,
          otherSixMapsPreserved: true,
          invalidCustomAnchorRejected: true,
          transactionRollbackVerified: true,
          playerTablesUnchanged: true,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      'PASS additive layout SQL, custom content preservation, invalid-anchor rejection and rollback; player/account/wallet/ledger fingerprints unchanged.',
    );
  } finally {
    db.release();
  }
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
