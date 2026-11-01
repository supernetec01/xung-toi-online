const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { docker } = require('./lib/docker-local.cjs');
const root = path.resolve(__dirname, '..'),
  dir = path.join(root, '.local');
(async () => {
  try {
    docker(['info', '--format', '{{.ServerVersion}}']);
  } catch {
    throw Error(
      'DOCKER_NOT_READY: mở Docker Desktop (Linux containers) hoặc khởi động Docker Engine rồi chạy lại.',
    );
  }
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, 'database.json');
  let c;
  if (fs.existsSync(file)) c = JSON.parse(fs.readFileSync(file));
  else {
    if (fs.existsSync(path.join(dir, 'pgdata/PG_VERSION')))
      throw Error(
        'CONFIG_MISSING: dữ liệu PostgreSQL đã có; khôi phục .local/database.json trước, không tạo mật khẩu mới.',
      );
    c = {
      user: 'anhoa',
      password: crypto.randomBytes(32).toString('hex'),
      database: 'anhoa',
      port: Number(process.env.ANHOA_DB_PORT || 55432),
      container: process.env.ANHOA_DB_CONTAINER || 'anhoa-postgres-v4',
    };
    if (
      !Number.isInteger(c.port) ||
      c.port < 1024 ||
      c.port > 65535 ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,63}$/.test(c.container)
    )
      throw Error('INVALID_LOCAL_DB_SETTINGS');
    fs.writeFileSync(file, JSON.stringify(c), { mode: 0o600 });
  }
  // --mount type=bind requires its source to exist on a fresh clone.
  fs.mkdirSync(path.join(dir, 'pgdata'), { recursive: true, mode: 0o700 });
  let exists = false;
  try {
    docker(['container', 'inspect', '--format', '{{.Name}}', c.container]);
    exists = true;
  } catch (e) {
    if (!/No such (?:object|container)/i.test(e.stderr?.toString() || ''))
      throw Error('DOCKER_INSPECT_FAILED: kiểm tra Docker và quyền truy cập daemon.');
  }
  if (exists) {
    const mounts = JSON.parse(
      docker(['container', 'inspect', '--format', '{{json .Mounts}}', c.container]).toString(),
    );
    const projectRoot = docker([
      'container',
      'inspect',
      '--format',
      '{{index .Config.Labels "org.anhoa.project-root"}}',
      c.container,
    ])
      .toString()
      .trim();
    if (
      projectRoot !== root &&
      !mounts.some(
        (m) =>
          m.Destination === '/var/lib/postgresql/data' &&
          path.resolve(m.Source) === path.join(dir, 'pgdata'),
      )
    )
      throw Error(
        'CONTAINER_IN_USE: tên container thuộc thư mục khác; dùng tên riêng khi khởi tạo clone mới.',
      );
    docker(['start', c.container]);
  } else {
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
        '--label',
        'org.anhoa.project-root=' + root,
        '--restart',
        'unless-stopped',
        '--env-file',
        envfile,
        '-p',
        `127.0.0.1:${c.port}:5432`,
        '--mount',
        `type=bind,src=${path.join(dir, 'pgdata')},dst=/var/lib/postgresql/data`,
        'postgres:16-bookworm',
      ]);
    } finally {
      fs.rmSync(envfile, { force: true });
    }
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker(['exec', c.container, 'pg_isready', '-U', c.user, '-d', c.database]);
      console.log(
        'PostgreSQL local sẵn sàng; cấu hình riêng ở .local/database.json (không commit).',
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw Error('POSTGRES_NOT_READY: kiểm tra log container PostgreSQL đã cấu hình.');
})().catch((e) => {
  console.error(e.code || e.message);
  process.exitCode = 1;
});
