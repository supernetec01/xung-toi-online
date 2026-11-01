const crypto = require('node:crypto'),
  { pool, tx } = require('./db.cjs'),
  S = require('./security.cjs'),
  { R } = require('./catalog.cjs');
async function newUser(db, login, displayName, passwordHash, roles = ['PLAYER'], secret = null) {
  const id = crypto.randomUUID(),
    state = R.defaults();
  state.username = displayName;
  const catalog = await require('./catalog.cjs').current(db);
  state.questRewards = Object.fromEntries(
    state.accepted.map((id) => [id, catalog.quests.find((q) => q.id === id)?.rewardCoins || 0]),
  );
  state.questSnapshots = Object.fromEntries(
    state.accepted.map((id) => [id, catalog.quests.find((q) => q.id === id)]),
  );
  delete state.coins;
  await db.query(
    'INSERT INTO game_users(id,login,display_name,password_hash,roles,mfa_secret) VALUES($1,$2,$3,$4,$5,$6)',
    [id, login, displayName, passwordHash, roles, secret],
  );
  await db.query('INSERT INTO player_states(user_id,state) VALUES($1,$2)', [id, state]);
  await db.query('INSERT INTO game_wallets(user_id) VALUES($1)', [id]);
  await db.query(
    "INSERT INTO coin_ledger(user_id,delta,balance,source_type,source_ref) VALUES($1,150,150,'welcome','initial')",
    [id],
  );
  return id;
}
function cookie(req) {
  const str = req.headers.cookie || '';
  const match = str.match(/(?:^|;\s*)anhoa_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1];
}
async function session(req) {
  const token = cookie(req);
  if (!token) return null;
  const u = (
    await pool.query(
      'SELECT u.id,u.login,u.display_name,u.roles,(u.mfa_secret IS NOT NULL) AS requires_mfa,s.csrf,s.mfa_at,s.token_hash,s.expires_at FROM user_sessions s JOIN game_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [S.hash(token)],
    )
  ).rows[0];
  if (!u) return null;
  if (u.requires_mfa && !u.mfa_at) return null;
  if (await sanction(u.id, 'ACCOUNT')) S.fail(403, 'ACCOUNT_SUSPENDED');
  return u;
}
async function sanction(id, scope, db = pool) {
  return (
    (
      await db.query(
        'SELECT id,reason,ends_at FROM sanctions WHERE user_id=$1 AND scope=$2 AND revoked_at IS NULL AND ends_at>now() ORDER BY ends_at DESC LIMIT 1',
        [id, scope],
      )
    ).rows[0] || null
  );
}
function setCookie(res, token, clear = false) {
  res.setHeader(
    'Set-Cookie',
    `anhoa_session=${clear ? '' : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 43200}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
}
async function login(req, res, body) {
  S.exact(body, ['login', 'password', 'code']);
  const login = S.text(body.login, 3, 32).toLowerCase();
  S.rate('login:' + req.socket.remoteAddress, 20, 900000);
  if (typeof body.password !== 'string' || body.password.length > 128) S.fail(401, 'INVALID_LOGIN');
  let user = (await pool.query('SELECT * FROM game_users WHERE login=$1', [login])).rows[0];
  const ok = await S.verify(
    body.password,
    user?.password_hash || 'scrypt:dummy:' + '00'.repeat(64),
  );
  if (!user || !ok) S.fail(401, 'INVALID_LOGIN', 'Thông tin đăng nhập không đúng.');
  if (await sanction(user.id, 'ACCOUNT')) S.fail(403, 'ACCOUNT_SUSPENDED');
  const staff = user.roles.some((r) => r !== 'PLAYER');
  if (staff && !user.mfa_secret) S.fail(403, 'MFA_SETUP_REQUIRED');
  const requiresMfa = staff || Boolean(user.mfa_secret);
  const counter = requiresMfa ? S.totpCounter(S.decrypt(user.mfa_secret), body.code) : null;
  if (requiresMfa && counter === null) S.fail(401, 'MFA_REQUIRED', 'Nhập mã xác thực 6 số.');
  const token = S.random(),
    csrf = S.random();
  await tx(async (db) => {
    if (requiresMfa) {
      const updated = await db.query(
        'UPDATE game_users SET mfa_counter=$2 WHERE id=$1 AND mfa_counter<$2 RETURNING id',
        [user.id, counter],
      );
      if (!updated.rowCount) S.fail(409, 'MFA_CODE_USED', 'Đợi mã MFA tiếp theo.');
    }
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at,mfa_at) VALUES($1,$2,$3,now()+interval'12 hours',$4)",
      [S.hash(token), user.id, csrf, requiresMfa ? new Date() : null],
    );
  });
  setCookie(res, token);
  return {
    user: { id: user.id, displayName: user.display_name, roles: user.roles },
    csrfToken: csrf,
  };
}
async function register(req, res, body) {
  S.exact(body, ['login', 'password', 'displayName']);
  S.rate('register:' + req.socket.remoteAddress, 10, 60000);
  const login = S.text(body.login, 3, 32).toLowerCase(),
    display = S.text(body.displayName, 1, 20);
  if (
    !/^[a-z0-9_]{3,32}$/.test(login) ||
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    body.password.length > 128
  )
    S.fail(
      400,
      'INVALID_REGISTRATION',
      'Tên tài khoản 3–32 ký tự a-z/0-9/_, mật khẩu từ 12 ký tự.',
    );
  const pass = await S.password(body.password);
  try {
    await tx((db) => newUser(db, login, display, pass));
  } catch (e) {
    if (e.code === '23505') S.fail(409, 'LOGIN_EXISTS');
    throw e;
  }
  return loginForRegistered(req, res, body.login, body.password);
}
async function loginForRegistered(req, res, loginName, password) {
  return login(req, res, { login: loginName, password });
}
async function audit(db, user, action, target, reason, details = {}) {
  await db.query(
    'INSERT INTO admin_audit_events(actor_id,action,target,reason,details) VALUES($1,$2,$3,$4,$5)',
    [user?.id || null, action, String(target), S.text(reason, 3, 300), details],
  );
}
module.exports = { newUser, session, sanction, setCookie, login, register, audit };
