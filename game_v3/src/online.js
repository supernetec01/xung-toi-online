/* Server bridge: authenticated state never overwrites the local demo save. */
(() => {
  'use strict';
  const O = {
    active: false,
    available: false,
    state: null,
    user: null,
    csrf: null,
    version: 0,
    offset: 0,
    serverAt: 0,
    monoAt: 0,
    primary: true,
    ws: null,
    catalogVersion: 0,
    open: null,
    messages: new Map(),
  };
  const clientId = crypto.randomUUID();
  O.clientId = clientId;
  O.now = () => (O.active ? O.serverAt + (performance.now() - O.monoAt) : Date.now());
  function clock(now) {
    if (now) {
      O.serverAt = now;
      O.monoAt = performance.now();
    }
  }
  O.request = async (url, data, method, key) => {
    const response = await fetch(url, {
      method: method || (data ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(O.csrf ? { 'X-CSRF-Token': O.csrf } : {}),
        'X-Client-Id': clientId,
        'Idempotency-Key': key || crypto.randomUUID(),
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      signal: AbortSignal.timeout(12000),
    });
    const b = await response.json();
    if (!response.ok) {
      const e = Error(b.message || b.code);
      e.code = b.code;
      e.status = response.status;
      throw e;
    }
    clock(b.serverNow);
    return b;
  };
  O.command = async (intent) => {
    const key = intent.key || crypto.randomUUID();
    let r;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        r = await O.request(intent.url, intent.data, intent.method, key);
        break;
      } catch (e) {
        if (e.status || attempt === 1) throw e;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (r.state && r.state.stateVersion >= O.version) {
      if (O.state?.scene !== r.state.scene) O.resetActors?.();
      O.state = r.state;
      O.applyCatalog();
      O.version = r.state.stateVersion;
    }
    if (r.catalogVersion && r.catalogVersion !== O.catalogVersion) await O.catalog();
    return r;
  };
  O.applyCatalog = () => {
    if (!O.baseCatalog) return;
    Object.assign(window.PARISH_DATA, O.baseCatalog, {
      quests: O.baseCatalog.quests.map((q) => O.state?.questSnapshots?.[q.id] || q),
    });
  };
  O.catalog = async () => {
    const c = await O.request('/api/catalog');
    O.baseCatalog = c;
    O.applyCatalog();
    window.PARISH_ACTIVITIES.splice(0, window.PARISH_ACTIVITIES.length, ...c.actions);
    O.catalogVersion = c.version;
    return c;
  };
  O.init = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.status === 401) {
        O.available = true;
        return;
      }
      if (!response.ok) return;
      const s = await response.json();
      O.user = s.user;
      O.csrf = s.csrfToken;
      O.available = true;
      await O.catalog();
      const me = await O.request('/api/me');
      O.state = me.state;
      O.applyCatalog();
      O.version = me.state.stateVersion;
      O.active = true;
      clock(me.serverNow);
    } catch {
      O.active = false;
    }
  };
  function status(text) {
    const el = document.getElementById('onlineStatus');
    if (el) el.textContent = text;
  }
  function person(actor) {
    const v = actor.visual || {},
      D = window.PARISH_DATA,
      e = v.equipped || {};
    return {
      ...v,
      top: D.items.find((i) => i.id === e.top)?.color || v.top,
      bottom: D.items.find((i) => i.id === e.bottom)?.color || v.bottom,
      hair: D.items.find((i) => i.id === e.hair)?.color || v.hair,
      shoes: D.items.find((i) => i.id === e.shoes)?.color || v.shoes,
      acc: e.acc,
      assets: ['bottom', 'shoes', 'top', 'hair', 'acc']
        .map((slot) => D.items.find((i) => i.id === e[slot])?.assets?.[v.gender])
        .filter(Boolean),
    };
  }
  const nodes = new Map();
  let lastSeq = 0,
    currentRoom = '';
  O.resetActors = () => {
    for (const node of nodes.values()) node.remove();
    nodes.clear();
    currentRoom = '';
  };
  function actors(packet) {
    if (packet.roomSeq <= lastSeq) return;
    lastSeq = packet.roomSeq;
    if (packet.roomId !== O.state?.scene) return;
    const stage = document.getElementById('stage');
    let mount = document.getElementById('onlineActors');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'onlineActors';
      stage.append(mount);
    }
    if (currentRoom !== packet.roomId) {
      for (const node of nodes.values()) node.remove();
      nodes.clear();
      currentRoom = packet.roomId;
    }
    const ids = new Set();
    for (const actor of packet.actors) {
      if (actor.fixed || actor.self) continue;
      ids.add(actor.entityId);
      let el = nodes.get(actor.entityId);
      if (!el) {
        el = document.createElement('div');
        el.className = 'online-actor';
        const visual = document.createElement('div');
        visual.innerHTML = window.PARISH_ART.avatar(person(actor));
        const name = document.createElement('span');
        name.textContent = actor.displayName;
        el.append(visual, name);
        el.title =
          actor.publicKind === 'resident'
            ? 'Cư dân giáo xứ · nhân vật mô phỏng'
            : actor.publicKind === 'live_guest'
              ? 'Khách LIVE · một hoạt động'
              : 'Người chơi';
        if (actor.publicKind === 'resident')
          el.onclick = (e) => {
            e.stopPropagation();
            O.resident = actor;
            O.open?.('resident');
          };
        mount.append(el);
        nodes.set(actor.entityId, el);
      }
      const previous = el._position || actor.position;
      const dx = actor.position[0] - previous[0],
        dy = actor.position[1] - previous[1];
      const direction =
        dx || dy
          ? Math.abs(dx) >= Math.abs(dy)
            ? dx > 0
              ? 'right'
              : 'left'
            : dy > 0
              ? 'down'
              : 'up'
          : el.dataset.direction || 'down';
      const facingDirection = actor.pose === 'sit' ? 'up' : direction;
      el.dataset.direction = facingDirection;
      const signature = JSON.stringify([actor.visual, actor.pose, facingDirection]);
      if (el._visualSignature !== signature) {
        el.firstElementChild.innerHTML = window.PARISH_ART.avatar({
          ...person(actor),
          direction: facingDirection,
          pose: actor.pose,
        });
        el._visualSignature = signature;
      }
      el.children[1].textContent = actor.displayName;
      el._position = actor.position;
      el.style.left = actor.position[0] + '%';
      el.style.top = actor.position[1] + '%';
      el.style.zIndex = Math.round(actor.position[1] * 10);
      el.style.transform =
        'translate(-50%,-100%) scale(' + window.PARISH_SCENE_ART.scale(actor.position[1]) + ')';
      el.classList.toggle('leaving', !!actor.leaving);
      el.dataset.pose = actor.pose;
    }
    for (const [id, node] of nodes)
      if (!ids.has(id)) {
        node.remove();
        nodes.delete(id);
      }
  }
  async function showBubble(message) {
    if (localStorage.getItem('anhoa-hide-chat-bubbles') === 'true') return;
    const key =
      'player:' +
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message.author.id)),
        ),
      )
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 20);
    const actor =
      message.author.id === O.user?.id ? document.getElementById('worldPlayer') : nodes.get(key);
    if (!actor) return;
    actor.querySelector('.chat-bubble')?.remove();
    const bubble = document.createElement('em');
    bubble.className = 'chat-bubble';
    bubble.textContent = message.body;
    actor.append(bubble);
    setTimeout(() => bubble.remove(), 4000);
  }
  let heartbeat,
    retry,
    reconnect = 500;
  function connect() {
    if (!O.active) return;
    const ws = new WebSocket(
      (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
    );
    O.ws = ws;
    ws.onopen = () => {
      lastSeq = 0;
      O.resetActors?.();
      O.chatRefresh?.();
      reconnect = 500;
      ws.send(JSON.stringify({ type: 'auth', csrfToken: O.csrf, clientId }));
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'heartbeat' }));
      }, 15000);
    };
    ws.onmessage = (e) => {
      const p = JSON.parse(e.data);
      if (p.type === 'ready' || p.type === 'heartbeat.ack') {
        O.primary = p.primary;
        status(p.primary ? 'Đã lưu trên máy chủ' : 'Tab xem · tab khác đang điều khiển');
      }
      if (p.type === 'catalog.updated' && p.version > O.catalogVersion) {
        O.catalog()
          .then(() => {
            O.resetActors();
            O.refreshProject();
            window.dispatchEvent(new CustomEvent('parish:catalog'));
          })
          .catch(() => status('Nội dung vừa cập nhật · hãy tải lại khi mạng ổn định'));
      }
      if (p.type === 'room.snapshot') actors(p);
      if (p.type === 'player.state' && p.state.stateVersion >= O.version) {
        if (O.state?.scene !== p.state.scene) O.resetActors?.();
        O.state = p.state;
        O.applyCatalog();
        O.version = p.state.stateVersion;
        window.dispatchEvent(new CustomEvent('parish:server-state', { detail: p.state }));
      }
      if (p.type === 'chat.message') {
        O.messages.set(p.message.id, p.message);
        while (O.messages.size > 200) O.messages.delete(O.messages.keys().next().value);
        O.renderChat?.();
        showBubble(p.message);
      }
      if (p.type === 'chat.message_hidden') {
        O.messages.delete(String(p.messageId));
        O.renderChat?.();
      }
      if (p.type === 'chat.sanction_updated') O.sanctionChanged?.();
      if (p.type === 'error') status(p.code === 'CHAT_MUTED' ? 'Chat đang bị tạm khóa' : p.code);
    };
    ws.onclose = (e) => {
      clearInterval(heartbeat);
      if (e.code === 4001) {
        status('Phiên hết hạn · đăng nhập lại');
        return;
      }
      status('Mất kết nối · đang nối lại');
      retry = setTimeout(connect, reconnect);
      reconnect = Math.min(10000, reconnect * 2);
    };
  }
  O.mount = () => {
    if (!O.available) return;
    const game = document.getElementById('game'),
      controls = document.createElement('div');
    controls.id = 'onlineControls';
    const account = document.createElement('a');
    account.href = '/account';
    account.textContent = O.active ? O.user.displayName : 'Đăng nhập / lưu game';
    controls.append(account);
    if (O.active) {
      const chat = document.createElement('button');
      chat.id = 'openChat';
      chat.textContent = 'Chat';
      chat.onclick = () => O.open?.('chat');
      const events = document.createElement('button');
      events.textContent = 'Noel & album';
      events.onclick = () => O.open?.('events');
      controls.append(chat, events);
      if (O.user.roles.some((r) => r !== 'PLAYER')) {
        const admin = document.createElement('a');
        admin.href = '/admin';
        admin.textContent = 'Admin';
        controls.append(admin);
      }
    }
    const state = document.createElement('small');
    state.id = 'onlineStatus';
    state.textContent = O.active ? 'Đang kết nối...' : 'Chơi thử trên máy · chưa đồng bộ';
    controls.append(state);
    game.append(controls);
    if (O.active) {
      connect();
      O.refreshProject();
      const projectTimer = setInterval(() => {
        if (!document.hidden) O.refreshProject();
      }, 30000);
      window.addEventListener('pagehide', () => clearInterval(projectTimer), { once: true });
      window.addEventListener('parish:server-state', () => O.paintProject());
    }
    if (new URLSearchParams(location.search).get('camera') === 'live')
      document.body.classList.add('live-camera');
  };
  O.paintProject = () => {
    const stage = document.getElementById('stage');
    if (!stage) return;
    let el = document.getElementById('sharedNoelDecor');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sharedNoelDecor';
      stage.append(el);
    }
    el.replaceChildren();
    if (O.state?.scene !== 'christmas' || O.project?.event?.enabled === false) return;
    const icons = ['🌟', '🎀', '🎁', '✨'];
    for (const [i, level] of [25, 50, 75, 100].entries()) {
      if ((O.project?.project.percent || 0) < level) continue;
      const ornament = document.createElement('span');
      ornament.textContent = icons[i];
      ornament.style.left = 36 + i * 10 + '%';
      ornament.title = 'Trang trí cộng đồng đã mở';
      el.append(ornament);
    }
  };
  O.refreshProject = async () => {
    try {
      O.project = await O.request('/api/events');
      O.paintProject();
    } catch {}
  };
  const h = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  O.panel = async (type, mount) => {
    mount.replaceChildren();
    if (!O.active) {
      const a = h('a', 'Đăng nhập để chat và lưu trên server');
      a.href = '/account';
      mount.append(a);
      return;
    }
    if (type === 'resident') {
      mount.append(
        h('h3', 'Cư dân giáo xứ'),
        h('p', 'Đây là nhân vật mô phỏng sinh hoạt trong giáo xứ, không phải người chơi thật.'),
        h('p', 'Chúc bạn một ngày bình an!'),
      );
      return;
    }
    if (type === 'events') {
      const data = await O.request('/api/events'),
        c = h('div');
      O.project = data;
      O.paintProject();
      c.append(
        h('h3', data.event?.title || 'Noel · chung tay trang trí'),
        h('p', `${data.project.total}/${data.project.goal} Xu ảo · ${data.project.percent}%`),
      );
      const progress = h('progress');
      progress.max = 100;
      progress.value = data.project.percent;
      c.append(
        progress,
        h('p', 'Mốc trang trí 25 / 50 / 75 / 100%. Xu ảo không quy đổi tiền thật.'),
      );
      const album = h('p', 'Album: ' + (data.album.join(', ') || 'Chưa có bưu thiếp'));
      c.append(album);
      const claim = h('button', 'Nhận bưu thiếp đã mở');
      claim.className = 'btn';
      claim.disabled = data.event?.enabled === false;
      if (claim.disabled)
        c.append(h('p', 'Sự kiện đang đóng. Album và tiến độ đã lưu vẫn được giữ.'));
      claim.onclick = async () => {
        try {
          await O.command({ url: '/api/events/claim', data: {} });
          await O.panel(type, mount);
        } catch (e) {
          status(e.message);
        }
      };
      const daily = h('button', 'Nhận 10 Xu · 3 việc phục vụ hôm nay');
      daily.className = 'btn secondary';
      daily.onclick = async () => {
        try {
          const r = await O.command({ url: '/api/daily/claim', data: {} });
          window.dispatchEvent(new CustomEvent('parish:server-state', { detail: r.state }));
          await O.panel(type, mount);
        } catch (e) {
          status(e.message);
        }
      };
      c.append(claim, daily);
      mount.append(c);
      return;
    }
    const head = h('div'),
      room = h('select');
    for (const [id, label] of [
      [O.state.scene, 'Khu vực'],
      ['global', 'Toàn giáo xứ'],
      ['system', 'Thông báo'],
    ]) {
      const o = h('option', label);
      o.value = id;
      room.append(o);
    }
    const list = h('div');
    list.id = 'chatMessages';
    const form = h('form'),
      input = h('input');
    input.id = 'chatInput';
    input.maxLength = 160;
    input.placeholder = 'Viết lời nhắn tôn trọng...';
    const send = h('button', 'Gửi');
    send.className = 'btn';
    send.type = 'submit';
    const info = h('p');
    info.id = 'chatInfo';
    head.append(room);
    form.append(input, send);
    mount.append(
      head,
      list,
      form,
      info,
      h('p', 'Không chia sẻ thông tin cá nhân hoặc đường dẫn. Chat được kiểm duyệt.'),
    );
    function render() {
      if (!list.isConnected) return;
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 50;
      const scroll = list.scrollTop;
      list.replaceChildren();
      for (const m of [...O.messages.values()].filter((m) => m.room === room.value).slice(-100)) {
        const line = h('div'),
          name = h('b', m.author.displayName + ': '),
          body = h('span', m.body);
        line.append(name, body);
        if (m.author.id !== O.user.id) {
          const report = h('button', 'Báo cáo');
          report.className = 'btn small secondary';
          report.onclick = async () => {
            const reason = prompt('Lý do báo cáo:');
            if (!reason) return;
            try {
              await O.request('/api/chat/messages/' + m.id + '/report', { reason });
              info.textContent = 'Đã gửi báo cáo cho người kiểm duyệt.';
            } catch (e) {
              info.textContent = e.message;
            }
          };
          line.append(report);
        }
        list.append(line);
      }
      list.scrollTop = atBottom ? list.scrollHeight : scroll;
    }
    O.renderChat = render;
    let before = null,
      older = false;
    async function history() {
      try {
        if (room.value === 'system') {
          const d = await O.request('/api/chat/notices');
          list.replaceChildren(...d.notices.map((n) => h('p', 'THÔNG BÁO · ' + n.body)));
          input.disabled = send.disabled = true;
          return;
        }
        input.disabled = send.disabled = false;
        const data = await O.request(
          '/api/chat/messages?room=' +
            encodeURIComponent(room.value) +
            (before ? '&before=' + before : ''),
        );
        for (const [id, m] of O.messages) if (m.room === room.value) O.messages.delete(id);
        for (const m of data.messages) O.messages.set(m.id, m);
        while (O.messages.size > 200) O.messages.delete(O.messages.keys().next().value);
        render();
      } catch (e) {
        info.textContent = e.message;
      }
    }
    O.chatRefresh = async () => {
      if (!mount.isConnected || older || room.value === 'system') return;
      const latest = Math.max(
        0,
        ...[...O.messages.values()].filter((m) => m.room === room.value).map((m) => m.seq),
      );
      const selected = room.value;
      let cursor = latest;
      try {
        for (let page = 0; page < 4; page++) {
          const d = await O.request(
            '/api/chat/messages?room=' + encodeURIComponent(selected) + '&after=' + cursor,
          );
          if (!mount.isConnected || room.value !== selected || older) return;
          for (const m of d.messages) O.messages.set(m.id, m);
          while (O.messages.size > 200) O.messages.delete(O.messages.keys().next().value);
          if (d.messages.length < 50) break;
          cursor = d.messages.at(-1).seq;
        }
        render();
      } catch {}
    };
    const earlier = h('button', 'Tin cũ hơn'),
      latest = h('button', 'Mới nhất');
    earlier.className = latest.className = 'btn small secondary';
    earlier.onclick = () => {
      before = Math.min(
        ...[...O.messages.values()].filter((m) => m.room === room.value).map((m) => m.seq),
      );
      if (Number.isFinite(before)) {
        older = true;
        history();
      }
    };
    latest.onclick = () => {
      before = null;
      older = false;
      history();
    };
    head.append(earlier, latest);
    const setting = h('label'),
      hide = h('input');
    hide.type = 'checkbox';
    hide.checked = localStorage.getItem('anhoa-hide-chat-bubbles') === 'true';
    hide.onchange = () => localStorage.setItem('anhoa-hide-chat-bubbles', String(hide.checked));
    setting.append(hide, h('span', 'Ẩn bong bóng chat'));
    mount.append(setting);
    room.onchange = () => {
      before = null;
      older = false;
      history();
    };
    await history();
    O.sanctionChanged = () => {
      if (mount.isConnected) O.panel(type, mount);
    };
    const sanction = await O.request('/api/me/chat-sanctions');
    if (sanction.sanction) {
      input.disabled = send.disabled = true;
      info.textContent =
        'Cấm chat đến ' +
        new Date(sanction.sanction.ends_at).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        }) +
        ' · ' +
        sanction.sanction.reason;
      const appeal = h('button', 'Khiếu nại');
      appeal.className = 'btn secondary';
      appeal.onclick = async () => {
        const body = prompt('Nội dung khiếu nại:');
        if (body)
          try {
            await O.request('/api/me/chat-appeals', { sanctionId: sanction.sanction.id, body });
            info.textContent = 'Đã gửi khiếu nại.';
          } catch (e) {
            info.textContent = e.message;
          }
      };
      mount.append(appeal);
    }
    if (sanction.sanction) {
      setTimeout(
        () => {
          if (mount.isConnected) O.panel(type, mount);
        },
        Math.max(1000, new Date(sanction.sanction.ends_at).getTime() - Date.now() + 1000),
      );
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      send.disabled = true;
      try {
        const data = await O.request('/api/chat/send', {
          roomId: room.value,
          body: input.value,
          requestId: crypto.randomUUID(),
        });
        if (data.message.status !== 'published')
          info.textContent = 'Tin chưa được phát vì cần kiểm duyệt. Bạn có thể chỉnh lại nội dung.';
        else {
          O.messages.set(data.message.id, data.message);
          input.value = '';
          info.textContent = 'Đã gửi';
          render();
        }
      } catch (e) {
        info.textContent =
          e.code === 'CHAT_MUTED'
            ? 'Bạn đang bị cấm chat; có thể mở lại Chat để gửi khiếu nại.'
            : e.message;
      } finally {
        send.disabled = false;
      }
    };
  };
  window.PARISH_ONLINE = O;
})();
