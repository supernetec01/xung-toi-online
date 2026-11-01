// Local QC only: create an empty, isolated database. Never clone or reset player data.
const fs = require('node:fs'),
  path = require('node:path'),
  { spawn } = require('node:child_process'),
  { Pool } = require('pg');
const root = path.resolve(__dirname, '../..'),
  dir = path.join(root, '.local/qc');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const cfg = JSON.parse(fs.readFileSync(path.join(root, '.local/database.json'))),
  file = path.join(dir, 'database.json');
if (process.argv[2] === 'init') {
  (async () => {
    if (fs.existsSync(file)) throw Error('QC database already configured; refusing replacement');
    const name = 'anhoa_qc_' + Date.now(),
      pool = new Pool({
        host: '127.0.0.1',
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
      });
    try {
      await pool.query('CREATE DATABASE ' + name);
      fs.writeFileSync(file, JSON.stringify({ name }), { mode: 0o600 });
      console.log('Created empty QC database ' + name);
    } finally {
      await pool.end();
    }
  })().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
} else if (process.argv[2] === 'run') {
  const profile = JSON.parse(fs.readFileSync(file));
  if (!profile.instance) {
    profile.instance = require('node:crypto').randomUUID();
    fs.writeFileSync(file, JSON.stringify(profile), { mode: 0o600 });
  }
  const { name, instance } = profile;
  if (!/^anhoa_qc_\d+$/.test(name)) throw Error('Invalid isolated database name');
  const url = new URL('postgresql://127.0.0.1');
  url.port = cfg.port;
  url.username = cfg.user;
  url.password = cfg.password;
  url.pathname = '/' + name;
  (async () => {
    const args = process.argv.slice(4),
      starting = args.includes('server/main.cjs'),
      migrating = args.includes('scripts/migrate.cjs');
    if (!starting && !migrating) {
      const health = await (await fetch('http://127.0.0.1:5001/healthz')).json();
      if (health.testInstance !== instance)
        throw Error('Refusing QC: port 5001 is not the selected isolated test server');
    }
    const child = spawn(process.argv[3], process.argv.slice(4), {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: url.href,
        NODE_ENV: 'test',
        QC_INSTANCE_ID: instance,
        CHROMIUM_PATH: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      },
    });
    if (starting)
      fs.writeFileSync(path.join(dir, 'server.pid'), String(child.pid), { mode: 0o600 });
    child.on('exit', (code) => (process.exitCode = code ?? 1));
  })().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
} else {
  console.error('node qa/tools/env.cjs init | run <command> [args]');
  process.exitCode = 1;
}
