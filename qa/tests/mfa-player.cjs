const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  { pool } = require('../../server/db.cjs'),
  S = require('../../server/security.cjs');
(async () => {
  const baseline = process.argv.includes('--baseline'),
    runs = [];
  for (let i = 0; i < 2; i++) {
    const f = await require('./fixture.cjs')(),
      secret = S.authenticator.generateSecret();
    await pool.query('UPDATE game_users SET mfa_secret=$2,mfa_counter=-1 WHERE id=$1', [
      f.id,
      S.encrypt(secret),
    ]);
    const r = await fetch('http://127.0.0.1:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: f.login, password: f.password }),
    });
    runs.push({ mfaEnabled: true, withoutOtpStatus: r.status });
    if (!baseline) {
      assert.equal(r.status, 401);
      const valid = await fetch('http://127.0.0.1:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: f.login,
          password: f.password,
          code: S.authenticator.generate(secret),
        }),
      });
      assert.equal(valid.status, 200);
    }
  }
  fs.writeFileSync(
    'qa/evidence/mfa-player-' + (baseline ? 'before' : 'after') + '.json',
    JSON.stringify({ baseline, runs }, null, 2) + '\n',
  );
  console.log(
    baseline
      ? 'REPRODUCED PLAYER MFA login bypass twice.'
      : 'PASS PLAYER MFA requires OTP and accepts valid OTP twice.',
  );
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
