// Optional integration test: a disposable checkout directory and PostgreSQL container.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  crypto = require('node:crypto'),
  net = require('node:net'),
  { execFileSync } = require('node:child_process');
const { docker, dockerOptions } = require('../scripts/lib/docker-local.cjs');
const root = path.resolve(__dirname, '..'),
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'anhoa-install-'));
const container = 'anhoa-install-' + crypto.randomBytes(6).toString('hex');
const env = { ...process.env, NODE_ENV: 'development', ANHOA_DB_CONTAINER: container };
for (const key of [
  'DATABASE_URL',
  'DATA_ENCRYPTION_KEY',
  'ADMIN_BOOTSTRAP_LOGIN',
  'ADMIN_BOOTSTRAP_PASSWORD',
])
  delete env[key];
let log = '',
  created = false;
const run = (cmd, args) => {
  try {
    log += execFileSync(cmd, args, {
      cwd: fixture,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    log += (e.stdout || '') + (e.stderr || '');
    throw Error('Fresh install step failed: ' + cmd + ' ' + args.slice(0, 2).join(' '));
  }
};
(async () => {
  const managed = dockerOptions(
    {
      DOCKER_HOST: 'tcp://example.invalid',
      DOCKER_CONTEXT: 'test',
      DOCKER_CONFIG: '/tmp/registry-config',
      HTTPS_PROXY: 'http://proxy',
    },
    true,
  );
  assert(!managed.env.DOCKER_HOST && !managed.env.DOCKER_CONTEXT);
  assert.equal(managed.env.DOCKER_CONFIG, '/tmp/registry-config');
  assert.equal(managed.env.HTTPS_PROXY, 'http://proxy');
  const desktop = dockerOptions({ DOCKER_CONTEXT: 'desktop-linux' }, false);
  assert.equal(desktop.env.DOCKER_CONTEXT, 'desktop-linux');
  assert.deepEqual(desktop.prefix, []);
  const server = net.createServer();
  env.ANHOA_DB_PORT = String(
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
    }),
  );
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  for (const file of files) {
    assert(!path.isAbsolute(file) && !file.split('/').includes('..'));
    const dest = path.join(fixture, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, file), dest);
  }
  run('npm', ['ci', '--no-audit', '--no-fund']);
  run('npm', ['run', 'db:start']);
  created = true;
  assert(fs.existsSync(path.join(fixture, '.local/pgdata')));
  run('npm', ['run', 'db:migrate']);
  run('npm', ['run', 'admin:bootstrap']);
  const operatorFile = path.join(fixture, '.local/operator.json'),
    before = crypto.createHash('sha256').update(fs.readFileSync(operatorFile)).digest('hex');
  run('npm', ['run', 'db:start']);
  run('npm', ['run', 'db:migrate']);
  run('npm', ['run', 'admin:bootstrap']);
  assert(
    before === crypto.createHash('sha256').update(fs.readFileSync(operatorFile)).digest('hex'),
    'repeat bootstrap preserves credentials',
  );
  run(process.execPath, [
    '-e',
    `const fs=require('node:fs'),A=require('./server/auth.cjs'),S=require('./server/security.cjs'),{pool}=require('./server/db.cjs');
 (async()=>{const c=JSON.parse(fs.readFileSync('.local/operator.json'));let cookie=false;const result=await A.login({socket:{remoteAddress:'127.0.0.1'}},{setHeader:(name,value)=>{if(name==='Set-Cookie'&&value.includes('HttpOnly'))cookie=true;}},{login:c.login,password:c.password,code:S.authenticator.generate(c.totpSecret)});if(!cookie||!result.user.roles.includes('SUPER_ADMIN'))throw Error('Fresh Admin MFA login failed');console.log('PASS fresh Super Admin password/MFA login');})().catch(()=>{console.error('Fresh Admin MFA verification failed');process.exitCode=1;}).finally(()=>pool.end());`,
  ]);
  run('npm', ['run', 'db:backup']);
  run('npm', ['run', 'db:restore-drill']);
  console.log(
    'PASS fresh npm ci → db:start → migrations → bootstrap → MFA login → backup/restore; repeated startup preserves credentials.',
  );
  fs.writeFileSync(
    path.join(root, 'artifacts/online/fresh-install.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        emptyLocalDirectory: true,
        pgdataCreated: true,
        dockerContextsPreservedOutsideCloud: true,
        repeatedStartup: true,
        bootstrapCredentialsPreserved: true,
        freshSuperAdminMfaLogin: true,
        backupRestore: true,
        existingDatabaseChanged: false,
      },
      null,
      2,
    ),
  );
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.writeFileSync(path.join(root, 'artifacts/online/fresh-install-steps.txt'), log);
    try {
      // Only the container and filesystem directory created by this test may be removed.
      if (created) {
        docker(['stop', '--time', '15', container]);
        docker(['rm', container]);
        if (process.getuid && process.getgid)
          docker([
            'run',
            '--rm',
            '--network',
            'none',
            '--user',
            '0:0',
            '--mount',
            `type=bind,src=${path.join(fixture, '.local/pgdata')},dst=/fixture-data`,
            '--entrypoint',
            'chown',
            'postgres:16-bookworm',
            '-R',
            process.getuid() + ':' + process.getgid(),
            '/fixture-data',
          ]);
      }
      fs.rmSync(fixture, { recursive: true, force: true });
    } catch {
      console.error(
        'Disposable install fixture cleanup failed; existing game data was not changed.',
      );
      process.exitCode = 1;
    }
  });
