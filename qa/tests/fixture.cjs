const crypto = require('node:crypto'),
  { tx } = require('../../server/db.cjs'),
  A = require('../../server/auth.cjs'),
  S = require('../../server/security.cjs');
module.exports = async () => {
  if (!process.env.DATABASE_URL?.includes('/anhoa_qc_')) throw Error('QC database required');
  const login = 'fixture_' + crypto.randomBytes(6).toString('hex'),
    password = S.random(),
    token = S.random(),
    csrf = S.random();
  const hash = await S.password(password);
  const id = await tx(async (db) => {
    const id = await A.newUser(db, login, 'Bạn QC', hash);
    await db.query(
      "INSERT INTO user_sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval'1 hour')",
      [S.hash(token), id, csrf],
    );
    return id;
  });
  return { id, login, password, token, csrf };
};
