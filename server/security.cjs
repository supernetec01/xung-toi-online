const crypto = require('node:crypto'),
  fs = require('node:fs'),
  path = require('node:path'),
  { promisify } = require('node:util'),
  { authenticator } = require('otplib');
const { root } = require('./db.cjs');
const scrypt = promisify(crypto.scrypt);
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
const random = () => crypto.randomBytes(32).toString('hex');
let key;
if (process.env.DATA_ENCRYPTION_KEY) {
  key = Buffer.from(process.env.DATA_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes hex');
} else {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Production requires DATA_ENCRYPTION_KEY');
  const file = path.join(root, '.local/encryption.key');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32), { mode: 0o600 });
  key = fs.readFileSync(file);
}
function encrypt(v) {
  const iv = crypto.randomBytes(12),
    c = crypto.createCipheriv('aes-256-gcm', key, iv),
    b = Buffer.concat([c.update(v, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), b]).toString('base64');
}
function decrypt(v) {
  const b = Buffer.from(v, 'base64'),
    d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
async function password(v) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await scrypt(v, salt, 64)).toString('hex')}`;
}
async function verify(v, stored) {
  try {
    const [, salt, key] = stored.split(':'),
      b = await scrypt(v, salt, 64);
    return crypto.timingSafeEqual(b, Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}
function fail(status, code, message) {
  const e = new Error(message || code);
  e.status = status;
  e.code = code;
  throw e;
}
function text(value, min = 1, max = 160) {
  if (typeof value !== 'string') fail(400, 'INVALID_TEXT');
  const s = value
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim();
  if ([...s].length < min || [...s].length > max) fail(400, 'INVALID_TEXT');
  return s;
}
function exact(data, keys) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    Object.keys(data).some((k) => !keys.includes(k))
  )
    fail(400, 'INVALID_FIELDS');
}
const policy = require('../config/rbac.json');
function allowed(user, permission) {
  return Boolean(user && policy.permissions[permission]?.some((r) => user.roles.includes(r)));
}
function authorize(user, permission) {
  if (!user) fail(401, 'LOGIN_REQUIRED');
  if (!allowed(user, permission)) fail(403, 'FORBIDDEN');
}
function mfa(user) {
  if (!user.mfa_at || Date.now() - new Date(user.mfa_at).getTime() > 5 * 60 * 1000)
    fail(403, 'MFA_REQUIRED', 'Cần xác minh MFA gần đây.');
}
const limits = new Map();
function rate(key, max, windowMs) {
  const now = Date.now(),
    items = (limits.get(key) || []).filter((t) => t > now - windowMs);
  if (items.length >= max) fail(429, 'RATE_LIMITED');
  items.push(now);
  limits.set(key, items);
  if (limits.size > 10000)
    for (const [k, v] of limits) if (v.at(-1) < now - windowMs) limits.delete(k);
}
function totpCounter(secret, token) {
  authenticator.options = { window: 1 };
  if (!/^\d{6}$/.test(String(token))) return null;
  const delta = authenticator.checkDelta(String(token), secret);
  return Number.isInteger(delta) ? Math.floor(Date.now() / 30000) + delta : null;
}
function checkTotp(secret, token) {
  return totpCounter(secret, token) !== null;
}
module.exports = {
  hash,
  random,
  encrypt,
  decrypt,
  password,
  verify,
  fail,
  text,
  exact,
  allowed,
  authorize,
  mfa,
  rate,
  checkTotp,
  totpCounter,
  authenticator,
};
