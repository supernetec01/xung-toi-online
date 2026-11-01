const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'),
  dir = path.join(root, '.local');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const file = path.join(dir, 'database.json');
let c;
if (fs.existsSync(file)) c = JSON.parse(fs.readFileSync(file));
else {
  c = {
    user: 'anhoa',
    password: crypto.randomBytes(32).toString('hex'),
    database: 'anhoa',
    port: 55432,
    container: 'anhoa-postgres-v4',
  };
  fs.writeFileSync(file, JSON.stringify(c), { mode: 0o600 });
}
const env = { ...process.env };
for (const key of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
])
  delete env[key];
const docker = (args, options = {}) =>
  execFileSync('docker', ['--host=unix:///var/run/docker.sock', ...args], {
    env,
    stdio: 'pipe',
    ...options,
  });
try {
  docker(['inspect', c.container]);
  docker(['start', c.container]);
} catch {
  const envfile = path.join(dir, 'postgres.env');
  fs.writeFileSync(
    envfile,
    `POSTGRES_USER=${c.user}\nPOSTGRES_PASSWORD=${c.password}\nPOSTGRES_DB=${c.database}\n`,
    { mode: 0o600 },
  );
  try {
    docker([
      'run',
      '-d',
      '--name',
      c.container,
      '--restart',
      'unless-stopped',
      '--env-file',
      envfile,
      '-p',
      `127.0.0.1:${c.port}:5432`,
      '--mount',
      `type=bind,src=${dir}/pgdata,dst=/var/lib/postgresql/data`,
      'postgres:16-bookworm',
    ]);
  } finally {
    fs.rmSync(envfile, { force: true });
  }
}
async function ready() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      docker(['exec', c.container, 'pg_isready', '-U', c.user, '-d', c.database]);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw Error('POSTGRES_NOT_READY');
}
ready()
  .then(() =>
    console.log('PostgreSQL local sẵn sàng; cấu hình riêng ở .local/database.json (không commit).'),
  )
  .catch(() => {
    console.error('PostgreSQL chưa sẵn sàng; kiểm tra container anhoa-postgres-v4.');
    process.exitCode = 1;
  });
