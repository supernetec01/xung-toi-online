// API fixtures walk through the same validated navigation and rate limits as clients.
const { N } = require('../../server/catalog.cjs');
module.exports = async function walk(target, send, get) {
  const me = await get('/api/me'),
    catalog = await get('/api/catalog'),
    st = me.state,
    sc = catalog.scenes[st.scene];
  if (!N.walkable(sc, target.x, target.y)) return send(target);
  const parts = st.seatId?.split(':') || [],
    seat = sc.seats?.[parts.length === 3 ? parts[1] : parts[0]]?.[Number(parts.at(-1))];
  const path = N.route(sc, (st.seated && seat?.approach) || [st.x, st.y], [target.x, target.y]);
  if (!path.length) return send(target);
  let from = path[0],
    last;
  for (const goal of path.slice(1)) {
    const n = Math.max(1, Math.ceil(Math.hypot(goal[0] - from[0], goal[1] - from[1]) / 4));
    for (let i = 1; i <= n; i++) {
      await new Promise((r) => setTimeout(r, 100));
      last = await send({
        x: from[0] + ((goal[0] - from[0]) * i) / n,
        y: from[1] + ((goal[1] - from[1]) * i) / n,
      });
      if (last.status !== 200) return last;
    }
    from = goal;
  }
  return last || send(target);
};
