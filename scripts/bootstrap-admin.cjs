const fs = require('node:fs'),
  path = require('node:path'),
  { pool, tx, migrate, root } = require('../server/db.cjs'),
  S = require('../server/security.cjs'),
  A = require('../server/auth.cjs'),
  C = require('../server/catalog.cjs');
(async () => {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_BOOTSTRAP_LOGIN)
    throw Error('Production requires explicit operator bootstrap settings');
  await migrate();
  await C.initCatalog();
  const file = path.join(root, '.local/operator.json');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  if (fs.existsSync(file)) {
    console.log('Đã có cấu hình operator tại .local/operator.json. Không đổi mật khẩu/quyền.');
    return;
  }
  if ((await pool.query("SELECT 1 FROM game_users WHERE 'SUPER_ADMIN'=ANY(roles)")).rowCount)
    throw Error('Super Admin already exists; use authenticated role management.');
  const login = (process.env.ADMIN_BOOTSTRAP_LOGIN || 'operator').trim().toLowerCase(),
    password = process.env.ADMIN_BOOTSTRAP_PASSWORD || S.random(),
    secret = S.authenticator.generateSecret();
  if (!/^[a-z0-9_]{3,32}$/.test(login))
    throw Error('Bootstrap login requires 3–32 characters a-z/0-9/_.');
  if (password.length < 16 || password.length > 128)
    throw Error('Bootstrap password requires 16–128 characters');
  await tx(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(40002)');
    if ((await db.query("SELECT 1 FROM game_users WHERE 'SUPER_ADMIN'=ANY(roles)")).rowCount)
      throw Error('Super Admin already exists');
    const id = await A.newUser(
      db,
      login,
      'Quản trị An Hòa',
      await S.password(password),
      ['SUPER_ADMIN'],
      S.encrypt(secret),
    );
    await A.audit(db, { id }, 'bootstrap.super_admin', id, 'Operator CLI bootstrap');
  });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        login,
        password,
        totpSecret: secret,
        otpauthUri: S.authenticator.keyuri(login, 'Giáo Xứ An Hòa', secret),
        instructions:
          'Keep private; add totpSecret to Authenticator, sign in at /admin, rotate password in /account.',
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    'Đã tạo Super Admin. Thông tin và khóa MFA nằm trong .local/operator.json (600); không in credentials ra log.',
  );
})()
  .catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
