const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { Pool } = require('pg');
const root = path.resolve(__dirname, '..');
function connection() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  const c = JSON.parse(fs.readFileSync(path.join(root, '.local/database.json')));
  return {
    host: '127.0.0.1',
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database,
  };
}
const pool = new Pool({ ...connection(), max: 12, connectionTimeoutMillis: 5000 });
async function tx(fn) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const r = await fn(db);
    await db.query('COMMIT');
    return r;
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally {
    db.release();
  }
}
async function migrate() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())',
  );
  await pool.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum text');
  for (const file of fs.readdirSync(path.join(root, 'db/migrations')).sort()) {
    const version = Number(file.split('_')[0]);
    const checksum = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, 'db/migrations', file)))
      .digest('hex');
    const applied = (
      await pool.query('SELECT checksum FROM schema_migrations WHERE version=$1', [version])
    ).rows[0];
    if (applied) {
      if (applied.checksum && applied.checksum !== checksum)
        throw Error('MIGRATION_CHECKSUM_MISMATCH ' + file);
      await pool.query(
        'UPDATE schema_migrations SET checksum=$2 WHERE version=$1 AND checksum IS NULL',
        [version, checksum],
      );
      continue;
    }
    await tx(async (db) => {
      await db.query('SELECT pg_advisory_xact_lock(40001)');
      if (
        !(await db.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version])).rowCount
      ) {
        await db.query(fs.readFileSync(path.join(root, 'db/migrations', file), 'utf8'));
        if (
          version === 12 &&
          (await db.query('SELECT 1 FROM catalog_current WHERE singleton=true')).rowCount
        ) {
          const catalog = require('./catalog.cjs'),
            errors = catalog.validate(await catalog.current(db));
          if (errors.length) throw Error('LAYOUT_REVIEW_REQUIRED: ' + errors.join('; '));
        }
        await db.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)', [
          version,
          checksum,
        ]);
      }
    });
  }
}
module.exports = { pool, tx, migrate, root };
