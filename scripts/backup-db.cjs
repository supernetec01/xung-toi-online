// Operator-only local backup; never served over HTTP or included in Git.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { execFileSync } = require('node:child_process'),
  { docker } = require('./lib/docker-local.cjs');
const root = path.resolve(__dirname, '..'),
  dir = path.join(root, '.local'),
  c = JSON.parse(fs.readFileSync(path.join(dir, 'database.json'))),
  out = path.join(dir, 'backups');
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, '-'),
  target = path.join(out, stamp + '.dump');
const fd = fs.openSync(target, 'wx', 0o600);
try {
  docker(
    [
      'exec',
      c.container,
      'sh',
      '-c',
      'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl',
    ],
    { stdio: ['ignore', fd, 'pipe'] },
  );
} finally {
  fs.closeSync(fd);
}
const bundle = path.join(out, stamp + '.tar.gz'),
  files = [path.relative(dir, target), 'encryption.key'];
for (const name of ['uploads', 'database.json', 'operator.json'])
  if (fs.existsSync(path.join(dir, name))) files.push(name);
execFileSync('tar', ['-czf', bundle, '-C', dir, ...files]);
fs.chmodSync(bundle, 0o600);
const meta = {
  createdAt: new Date().toISOString(),
  dump: path.basename(target),
  bundle: path.basename(bundle),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex'),
  contains:
    'PostgreSQL dump + MFA encryption key + uploads + local operator/database config; keep private',
};
fs.writeFileSync(bundle + '.json', JSON.stringify(meta, null, 2), { mode: 0o600 });
console.log('Đã lưu backup riêng tại ' + path.relative(root, bundle));
