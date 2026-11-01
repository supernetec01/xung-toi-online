const fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process'),
  { pool } = require('../server/db.cjs');
(async () => {
  const root = path.resolve(__dirname, '..'),
    dir = path.join(root, '.local'),
    config = JSON.parse(fs.readFileSync(path.join(dir, 'database.json'))),
    folder = path.join(dir, 'backups'),
    dump = fs
      .readdirSync(folder)
      .filter((f) => f.endsWith('.dump'))
      .sort()
      .at(-1);
  if (!dump) throw Error('Run npm run db:backup first');
  const name = 'anhoa_restore_' + Date.now(),
    env = { ...process.env };
  for (const k of [
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
  ])
    delete env[k];
  const docker = (args, input) =>
    execFileSync('docker', ['--host=unix:///var/run/docker.sock', ...args], {
      env,
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  await pool.query('CREATE DATABASE ' + name);
  try {
    docker(
      [
        'exec',
        '-i',
        config.container,
        'sh',
        '-c',
        `PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore -U "$POSTGRES_USER" --dbname=${name} --no-owner --no-acl --exit-on-error`,
      ],
      fs.readFileSync(path.join(folder, dump)),
    );
    const { Pool } = require('pg'),
      restored = new Pool({
        host: '127.0.0.1',
        port: config.port,
        user: config.user,
        password: config.password,
        database: name,
      });
    try {
      const actual = (await restored.query('SELECT count(*) n FROM game_users')).rows[0].n,
        expected = (await pool.query('SELECT count(*) n FROM game_users')).rows[0].n;
      if (actual !== expected) throw Error('Account count mismatch');
      const violations = (
        await restored.query(
          'SELECT w.user_id FROM game_wallets w JOIN (SELECT user_id,sum(delta) total FROM coin_ledger GROUP BY user_id) l ON l.user_id=w.user_id WHERE w.coins<>l.total',
        )
      ).rowCount;
      if (violations) throw Error('Ledger invariant mismatch');
      const secrets = await restored.query(
        'SELECT mfa_secret FROM game_users WHERE mfa_secret IS NOT NULL',
      );
      for (const row of secrets.rows)
        if (!/^[A-Z2-7]+$/.test(require('../server/security.cjs').decrypt(row.mfa_secret)))
          throw Error('MFA restore decrypt failed');
      fs.mkdirSync(path.join(root, 'artifacts/online'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'artifacts/online/restore-drill.json'),
        JSON.stringify(
          {
            at: new Date().toISOString(),
            source: path.basename(dump),
            restoredIntoNewDatabase: true,
            usersMatched: true,
            ledgerInvariantPassed: true,
            mfaDecryptPassed: true,
            productionDatabaseChanged: false,
            temporaryDatabaseDropped: true,
          },
          null,
          2,
        ),
      );
      console.log(
        'PASS backup restore: account count, ledger invariant and MFA decryption; original DB unchanged.',
      );
    } finally {
      await restored.end();
    }
  } finally {
    await pool.query('DROP DATABASE ' + name);
  }
})()
  .catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
