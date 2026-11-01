const crypto = require('node:crypto'),
  { pool } = require('./db.cjs'),
  C = require('./catalog.cjs'),
  S = require('./security.cjs'),
  A = require('./auth.cjs'),
  G = require('./game.cjs');
function desiredAmbient({ target, fixed, real, guest, max, cap }) {
  return Math.max(0, Math.min(max, Math.min(target, cap) - fixed - real - guest));
}
class World {
  constructor() {
    this.clients = new Set();
    this.presence = new Map();
    this.ambient = new Map();
    this.guests = [];
    this.queue = [];
    this.seq = 0;
    this.counter = 0;
    this.live = null;
    this.settings = { targetVisualActors: 16, ambientMax: 18, renderCap: 32 };
    this.catalog = null;
    this.busy = false;
    this.lastReconcile = 0;
    this.targets = new Map();
    this.timer = null;
  }
  async init() {
    this.catalog = await C.current();
    const r = (await pool.query("SELECT value FROM settings WHERE key='ambient'")).rows[0];
    this.settings = r.value;
    await pool.query('UPDATE live_sessions SET running=false WHERE running=true');
    await pool.query(
      "UPDATE live_events SET status='expired' WHERE status IN ('queued','visible')",
    );
    this.timer = setInterval(
      () => this.tick().catch((e) => console.error('world:', e.code || 'error')),
      1000,
    );
    this.timer.unref();
  }
  async close() {
    clearInterval(this.timer);
    for (const c of this.clients) c.ws.close(1001, 'Server restart');
  }
  async revoke(userId, tokenHash) {
    for (const c of [...this.clients])
      if (c.user.id === userId && (!tokenHash || c.user.token_hash === tokenHash)) {
        c.ws.close(4001, 'Session revoked');
        this.clients.delete(c);
        this.presence.get(userId)?.sockets.delete(c);
      }
    const p = this.presence.get(userId);
    if (!p || !p.sockets.size) {
      this.presence.delete(userId);
      await pool.query('DELETE FROM seat_leases WHERE user_id=$1', [userId]);
    } else if (![...p.sockets].some((c) => c.id === p.primary)) p.primary = [...p.sockets][0].id;
  }
  broadcast(data) {
    for (const c of this.clients) if (c.ready) this.send(c, data);
  }
  notify(userId, data) {
    for (const c of this.clients) if (c.ready && c.user.id === userId) this.send(c, data);
  }
  canControl(user, client) {
    const p = this.presence.get(user.id);
    if (p && p.sockets.size && p.primary !== client)
      S.fail(409, 'ANOTHER_TAB_CONTROLS', 'Tab khác đang điều khiển nhân vật.');
  }
  update(id, state) {
    if (state.scene === 'nave' && state.seatId)
      this.ambient.set(
        'nave',
        (this.ambient.get('nave') || []).filter((a) => a.seatId !== state.seatId),
      );
    const p = this.presence.get(id);
    if (p) {
      p.state = state;
      p.last = Date.now();
    }
    for (const c of this.clients)
      if (c.user.id === id && c.ready) this.send(c, { type: 'player.state', state });
  }
  send(c, data) {
    if (c.ws.readyState === 1 && c.ws.bufferedAmount < 256000) c.ws.send(JSON.stringify(data));
    else if (c.ws.bufferedAmount >= 256000) c.ws.close(1013, 'Slow client');
  }
  async connect(ws, req, user) {
    const client = { ws, req, user, ready: false, id: null };
    this.clients.add(client);
    const timeout = setTimeout(() => {
      if (!client.ready) ws.close(4001, 'Authentication required');
    }, 5000);
    timeout.unref();
    ws.on('close', () => {
      clearTimeout(timeout);
      this.clients.delete(client);
      const p = this.presence.get(user.id);
      if (p) {
        p.sockets.delete(client);
        if (p.primary === client.id) p.primary = [...p.sockets][0]?.id || null;
      }
    });
    ws.on('message', async (bytes) => {
      try {
        S.rate('ws:' + user.id, 60, 10000);
        const current = await A.session(req);
        if (!current) {
          ws.close(4001, 'Session expired');
          return;
        }
        client.user = current;
        const msg = JSON.parse(bytes.toString());
        if (!client.ready) {
          if (
            msg.type !== 'auth' ||
            msg.csrfToken !== current.csrf ||
            !/^[a-zA-Z0-9_-]{8,80}$/.test(msg.clientId || '')
          )
            S.fail(403, 'WS_AUTH_REQUIRED');
          client.id = msg.clientId;
          client.ready = true;
          clearTimeout(timeout);
          let p = this.presence.get(user.id);
          if (!p) {
            p = {
              state: await G.state(user.id),
              sockets: new Set(),
              last: Date.now(),
              primary: client.id,
            };
            this.presence.set(user.id, p);
          }
          p.sockets.add(client);
          p.primary ??= client.id;
          p.last = Date.now();
          this.send(client, { type: 'ready', primary: p.primary === client.id });
          this.send(client, {
            type: 'room.snapshot',
            roomSeq: ++this.seq,
            roomId: p.state.scene,
            actors: this.snapshot(p.state.scene, user.id),
          });
          return;
        }
        if (msg.type === 'heartbeat') {
          const p = this.presence.get(user.id);
          if (p) p.last = Date.now();
          await pool.query(
            "UPDATE seat_leases SET expires_at=now()+interval'60 seconds' WHERE user_id=$1",
            [user.id],
          );
          this.send(client, {
            type: 'heartbeat.ack',
            primary: p?.primary === client.id,
            serverNow: Date.now(),
          });
        } else if (msg.type === 'admin.subscribe') {
          if (!require('./features.cjs').admin) S.fail(403, 'DISABLED');
          S.authorize(current, 'presence.metrics');
          client.admin = true;
        } else if (msg.type === 'chat.send') {
          if (!this.chat) S.fail(503, 'CHAT_UNAVAILABLE');
          const message = await this.chat.send(current, msg);
          this.send(client, { type: 'chat.ack', requestId: msg.requestId, message });
          if (message.status === 'published' && !message.replayed) this.chatBroadcast(message);
        } else S.fail(400, 'UNKNOWN_MESSAGE');
      } catch (e) {
        this.send(client, {
          type: 'error',
          code: e.code || 'INVALID_MESSAGE',
          status: e.status || 400,
        });
        if (e.status === 401 || e.code === 'ACCOUNT_SUSPENDED') {
          ws.close(4001, 'Access revoked');
        }
      }
    });
  }
  chatBroadcast(message) {
    for (const c of this.clients) {
      const scene = this.presence.get(c.user.id)?.state.scene;
      if (c.ready && (message.room === 'global' || message.room === scene))
        this.send(c, { type: 'chat.message', message });
    }
  }
  async hidden(id) {
    for (const c of this.clients)
      if (c.ready) this.send(c, { type: 'chat.message_hidden', messageId: id });
  }
  stats() {
    const now = Date.now(),
      byScene = {};
    for (const id of Object.keys(this.catalog.scenes)) {
      const real = [...this.presence.values()].filter(
        (p) => p.last > now - 45000 && p.state.scene === id,
      );
      byScene[id] = {
        realOnlineUnique: real.length,
        realConnections: real.reduce((s, p) => s + p.sockets.size, 0),
        fixedNpcActive: this.catalog.scenes[id].npc.length,
        ambientNpcActive: (this.ambient.get(id) || []).length,
        liveGuestVisible: this.guests.filter((g) => g.scene === id).length,
      };
    }
    return {
      observedAt: new Date().toISOString(),
      realOnlineUnique: Object.values(byScene).reduce((s, x) => s + x.realOnlineUnique, 0),
      realConnections: Object.values(byScene).reduce((s, x) => s + x.realConnections, 0),
      ambientNpcActive: Object.values(byScene).reduce((s, x) => s + x.ambientNpcActive, 0),
      fixedNpcActive: Object.values(byScene).reduce((s, x) => s + x.fixedNpcActive, 0),
      liveGuestVisible: this.guests.length,
      liveQueueLength: this.queue.length,
      countsByScene: byScene,
    };
  }
  snapshot(scene, userId) {
    const sc = this.catalog.scenes[scene],
      now = Date.now();
    if (!sc) return [];
    const actors = sc.npc.map((id) => ({
      entityId: `fixed:${scene}:${id}`,
      publicKind: 'resident',
      displayName: this.catalog.npcs[id].name,
      position: sc.npcPoints[id],
      pose: 'idle',
      fixed: true,
    }));
    for (const [id, p] of this.presence) {
      if (p.last < now - 45000 || p.state.scene !== scene) continue;
      actors.push({
        entityId: 'player:' + S.hash(id).slice(0, 20),
        publicKind: 'player',
        displayName: p.state.username,
        position: [p.state.x, p.state.y],
        pose: p.state.seated ? 'sit' : p.state.activeAction?.actionId || 'idle',
        visual: { gender: p.state.gender, skin: p.state.skin, equipped: p.state.equipped },
        self: id === userId,
      });
    }
    for (const a of this.ambient.get(scene) || []) {
      if (scene === 'nave' && a.pose !== 'sit') continue;
      actors.push({
        entityId: a.id,
        publicKind: 'resident',
        displayName: 'Cư dân giáo xứ',
        position: a.position,
        pose: a.pose,
        leaving: a.leaving,
        visual: a.visual,
      });
    }
    for (const g of this.guests.filter((g) => g.scene === scene))
      actors.push({
        entityId: g.id,
        publicKind: 'live_guest',
        displayName: g.name,
        position: g.position,
        pose: now < g.actionUntil ? g.pose : 'idle',
        leaving: now >= g.actionUntil,
        visual: g.visual,
      });
    const self = actors.find((a) => a.self);
    return actors
      .sort((a, b) => Number(Boolean(b.fixed || b.self)) - Number(Boolean(a.fixed || a.self)))
      .slice(0, (this.settings.scenes?.[scene] || this.settings).renderCap);
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = Date.now();
      for (const [id, p] of this.presence)
        if (p.last < now - 45000) {
          this.presence.delete(id);
          await pool.query('DELETE FROM seat_leases WHERE user_id=$1', [id]);
        }
      if (now - this.lastReconcile >= 3000) {
        this.lastReconcile = now;
        for (const [scene, sc] of Object.entries(this.catalog.scenes)) {
          const list = this.ambient.get(scene) || [],
            real = [...this.presence.values()].filter((p) => p.state.scene === scene).length,
            target = desiredAmbient({
              target: (this.settings.scenes?.[scene] || this.settings).targetVisualActors,
              fixed: sc.npc.length,
              real,
              guest: this.guests.filter((g) => g.scene === scene).length,
              max: (this.settings.scenes?.[scene] || this.settings).ambientMax,
              cap: (this.settings.scenes?.[scene] || this.settings).renderCap,
            });
          const active = list.filter((a) => !a.leaving);
          this.targets.set(scene, require('./features.cjs').ambient ? target : 0);
          this.ambient.set(scene, list);
        }
      }
      const occupiedSeats = new Set(
        (await pool.query('SELECT seat_id FROM seat_leases WHERE expires_at>now()')).rows.map(
          (r) => r.seat_id,
        ),
      );
      for (const [scene, list] of this.ambient) {
        const sc = this.catalog.scenes[scene],
          cfg = this.settings.scenes?.[scene] || this.settings,
          target = this.targets.get(scene) || 0,
          active = list.filter((a) => !a.leaving);
        if (active.length > target) {
          for (const a of active.slice(target, target + 3)) {
            a.leaving = true;
            a.until = now + 2000;
            if (scene !== 'nave') {
              a.pose = 'walk';
              a.position = C.N.nearest(sc, sc.entry);
            }
          }
        } else if (active.length < target) {
          const point = C.N.nearest(sc, sc.entry);
          list.push({
            id: 'resident:' + scene + ':' + ++this.counter,
            position: point,
            pose: 'wave',
            until: now + 3000,
            visual: {
              gender: this.counter % 2 ? 'female' : 'male',
              top: ['#7c9cc1', '#dda6ac', '#6e9b79'][this.counter % 3],
              bottom: '#465b75',
              hair: '#543932',
            },
          });
        }
        this.ambient.set(
          scene,
          list.filter((a) => !(a.leaving && a.until < now)),
        );
        if (scene === 'nave') {
          const seats = sc.spots
            .filter((s) => s[5] === 'seat')
            .flatMap((s) =>
              [0, 1, 2].map((choice) => ({
                id: 'nave:' + s[0] + ':' + choice,
                position: sc.seats?.[s[0]]?.[choice]?.position || [s[3] + (choice - 1) * 3, s[4]],
              })),
            );
          const claimed = new Set(occupiedSeats);
          for (const a of list.filter((a) => !a.leaving)) {
            const seat =
              seats.find((s) => s.id === a.seatId && !claimed.has(s.id)) ||
              seats.find((s) => !claimed.has(s.id));
            if (!seat) {
              a.leaving = true;
              a.until = now + 1000;
              continue;
            }
            claimed.add(seat.id);
            a.seatId = seat.id;
            a.position = seat.position;
            a.pose = 'sit';
            a.route = [];
          }
          continue;
        }
        for (const a of list) {
          if (a.leaving || a.until > now) continue;
          if (a.route?.length) {
            a.position = a.route.shift();
            a.pose = 'walk';
            a.until = now + 1000;
            continue;
          }
          const hour = Number(
              new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                hourCycle: 'h23',
              }).format(new Date()),
            ),
            schedule = cfg.schedules?.find((s) => hour >= s.fromHour && hour < s.toHour);
          a.pose = a.pose === 'walk' ? schedule?.pose || 'pray' : 'walk';
          if (a.pose === 'walk') {
            const waypoint = cfg.waypoints?.[this.counter++ % (cfg.waypoints?.length || 1)],
              candidate = C.N.nearest(
                sc,
                waypoint || [
                  a.position[0] + (Math.random() - 0.5) * 15,
                  a.position[1] + (Math.random() - 0.5) * 10,
                ],
              );
            a.route = C.N.route(sc, a.position, candidate).slice(1);
            if (a.route.length) a.position = a.route.shift();
          }
          a.until = now + (a.route?.length ? 1000 : 4000);
        }
      }
      this.guests = this.guests.filter((g) => g.expiresAt > now);
      if (
        this.live?.running &&
        this.queue.length &&
        this.guests.length < this.live.settings.maxVisibleGuests
      ) {
        const event = this.queue.shift(),
          sc = this.catalog.scenes[this.live.settings.sceneId],
          anchor = C.N.nearest(sc, sc.entry);
        this.guests.push({
          id: 'live:' + event.id,
          scene: this.live.settings.sceneId,
          name: event.name,
          position: anchor,
          pose: this.live.settings.action,
          actionUntil: now + 3000,
          expiresAt: now + 6000,
          visual: { gender: 'female', top: '#dda6ac', bottom: '#465b75' },
        });
        await pool.query(
          "UPDATE live_events SET status='consumed' WHERE session_id=$1 AND event_id=$2",
          [this.live.id, event.id],
        );
      }
      for (const c of this.clients) {
        if (!c.ready) continue;
        let user;
        try {
          user = await A.session(c.req);
        } catch {}
        if (!user) {
          c.ws.close(4001, 'Session revoked');
          continue;
        }
        c.user = user;
        const p = this.presence.get(user.id);
        if (!p) continue;
        this.send(c, {
          type: 'room.snapshot',
          roomSeq: ++this.seq,
          roomId: p.state.scene,
          actors: this.snapshot(p.state.scene, user.id),
        });
        if (c.admin) {
          if (S.allowed(user, 'presence.metrics'))
            this.send(c, { type: 'admin.presence_snapshot', ...this.stats() });
          else {
            c.admin = false;
            this.send(c, { type: 'error', code: 'FORBIDDEN' });
          }
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
module.exports = { World, desiredAmbient };
