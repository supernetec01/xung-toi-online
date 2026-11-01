const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { pool } = require('../../server/db.cjs'),
  C = require('../../server/catalog.cjs');
(async () => {
  const rows = [],
    baseline = process.argv.includes('--baseline');
  for (let i = 0; i < 2; i++) {
    const f = await require('./fixture.cjs')(),
      catalog = await C.current(),
      seat = catalog.scenes.nave.seats.seat_a[1];
    await pool.query('UPDATE player_states SET state=state||$2::jsonb WHERE user_id=$1', [
      f.id,
      JSON.stringify({
        scene: 'nave',
        seated: true,
        seatId: 'nave:seat_a:1',
        x: seat.position[0],
        y: seat.position[1],
      }),
    ]);
    await pool.query(
      "INSERT INTO seat_leases(seat_id,user_id,expires_at) VALUES('nave:seat_a:1',$1,now()-interval'1 minute') ON CONFLICT(seat_id) DO UPDATE SET user_id=$1,expires_at=now()-interval'1 minute'",
      [f.id],
    );
    const r = await fetch('http://127.0.0.1:5001/api/me', {
        headers: { Cookie: 'anhoa_session=' + f.token },
      }),
      st = (await r.json()).state;
    rows.push({ seated: st.seated, leaseExpired: true, position: [st.x, st.y] });
    if (!baseline) {
      assert.equal(st.seated, false);
      assert.equal(st.seatId, null);
      assert(C.N.walkable(catalog.scenes.nave, st.x, st.y));
    }
  }
  fs.writeFileSync(
    'qa/evidence/seat-recovery-' + (baseline ? 'before' : 'after') + '.json',
    JSON.stringify({ baseline, rows }, null, 2) + '\n',
  );
  console.log(
    baseline
      ? 'REPRODUCED expired lease still renders seated player twice.'
      : 'PASS expired lease reconnect recovers standing position twice.',
  );
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
