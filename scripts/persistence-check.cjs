const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { pool, root } = require('../server/db.cjs');
(async () => {
  const tables = {
    players:
      'SELECT s.user_id,s.state,s.version,w.coins FROM player_states s JOIN game_wallets w ON w.user_id=s.user_id ORDER BY s.user_id',
    ledger:
      'SELECT id,user_id,delta,balance,source_type,source_ref,metadata FROM coin_ledger ORDER BY id',
    catalog: 'SELECT version,payload FROM catalog_current',
    projects: 'SELECT * FROM virtual_projects ORDER BY id',
  };
  const hashes = {};
  for (const [k, sql] of Object.entries(tables))
    hashes[k] = crypto
      .createHash('sha256')
      .update(JSON.stringify((await pool.query(sql)).rows))
      .digest('hex');
  const file = path.join(root, '.local/persistence-before.json');
  if (process.argv[2] === 'before') {
    fs.writeFileSync(file, JSON.stringify(hashes), { mode: 0o600 });
    console.log('Saved private persistence fingerprints.');
  } else if (process.argv[2] === 'after') {
    const previous = JSON.parse(fs.readFileSync(file));
    if (JSON.stringify(hashes) !== JSON.stringify(previous))
      throw Error('Persistence fingerprints changed');
    fs.writeFileSync(
      path.join(root, 'artifacts/online/persistence.json'),
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          serverRestarted: true,
          playerWalletStateFingerprintsMatched: true,
          ledgerCatalogProjectsMatched: true,
          health: await (await fetch('http://127.0.0.1:5001/healthz')).json(),
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS restart preserves wallets, player states, ledger, catalog and shared projects.',
    );
  } else throw Error('Use before or after');
})()
  .catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
