(() => {
  'use strict';
  const D = window.PARISH_DATA,
    A = window.PARISH_ART,
    ACT = window.PARISH_ACTIVITIES,
    $ = (id) => document.getElementById(id),
    fmt = (n) => Number(n).toLocaleString('vi-VN');
  const R = window.PARISH_RULES,
    N = window.PARISH_NAV;
  const O = window.PARISH_ONLINE || { active: false, available: false };
  let rawSaveProblem = null,
    rawSaveBytes;
  const KEY = 'giao-xu-an-hoa-2d-v3',
    initial = R.defaults;
  function readState() {
    if (O.active) return structuredClone(O.state);
    let bytes;
    try {
      bytes = localStorage.getItem(KEY) ?? localStorage.getItem('giao-xu-an-hoa-2d-v2');
      if (bytes === null) return initial();
      const raw = JSON.parse(bytes);
      if (!R.validSave(raw)) throw Error('INVALID_SAVE_SHAPE');
      return R.migrate(raw, D);
    } catch {
      rawSaveProblem = true;
      rawSaveBytes = bytes;
      return initial();
    }
  }
  let st = readState();
  let facing = 'down',
    motionPoint = null;
  st.lowMotion = st.lowMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let previewEquipment = null,
    returnFocus = null,
    activeTab = 'all',
    shopSlot = 'top',
    activityBusy = !!st.activeAction;
  let movement = 0,
    moving = false,
    activityStarting = false,
    completionTimer = null;
  // Every write reads the newest state under the same cross-tab lock. UI state is separate.
  const intent = (url, data, method = 'POST', value = true, key) => ({
    url,
    data,
    method,
    value,
    key,
  });
  async function mutate(fn, operation) {
    if (O.active) {
      if (!operation) {
        toast('Tác vụ này chỉ có trong bản demo local.');
        return undefined;
      }
      try {
        await O.command(operation);
        st = readState();
        activityBusy = !!st.activeAction;
        renderHud();
        renderCooldowns();
        refreshMarkers();
        return operation.value;
      } catch (error) {
        toast(error.message);
        return undefined;
      }
    }
    if (rawSaveProblem) {
      toast('Save cần khôi phục. Dữ liệu gốc đang được giữ; hãy tải bản sao trong Cài đặt.');
      return undefined;
    }

    const run = () => {
      const draft = readState();
      if (rawSaveProblem) {
        toast('Save cần khôi phục; bản gốc chưa bị ghi đè.');
        return undefined;
      }
      let result;
      const previous = st;
      st = draft;
      try {
        result = fn();
        localStorage.setItem(KEY, JSON.stringify(st));
      } catch (error) {
        st = previous;
        toast('Không lưu được tiến độ. Hãy kiểm tra bộ nhớ trình duyệt.');
        console.error(error);
        return undefined;
      }
      activityBusy = !!st.activeAction;
      renderHud();
      renderCooldowns();
      refreshMarkers();
      return result;
    };
    if (!navigator.locks) {
      toast('Trình duyệt cần hỗ trợ Web Locks để lưu tiến độ.');
      return undefined;
    }
    return navigator.locks.request(KEY, run);
  }
  function item(id) {
    return D.items.find((i) => i.id === id);
  }
  function dressed(e = st.equipped) {
    return {
      gender: st.gender,
      skin: st.skin,
      top: item(e.top)?.color || '#f8e8d6',
      bottom: item(e.bottom)?.color || '#465b75',
      shoes: item(e.shoes)?.color || '#6a443e',
      hair: item(e.hair)?.color || '#543932',
      acc: e.acc,
      assets: ['bottom', 'shoes', 'top', 'hair', 'acc']
        .map((slot) => item(e[slot])?.assets?.[st.gender])
        .filter(Boolean),
    };
  }
  function npcDressed(id) {
    const npc = D.npcs[id];
    return {
      gender: npc.gender,
      shirt: npc.shirt,
      hair: npc.hair,
      bottom: npc.gender === 'female' ? '#5e5d7d' : '#3b475c',
      skin: '#ecc5a5',
      shoes: '#554642',
    };
  }
  function toast(t) {
    $('toastMount').innerHTML = `<div class="toast">${A.esc(t)}</div>`;
    clearTimeout(window.__toast);
    window.__toast = setTimeout(() => $('toastMount').replaceChildren(), 2600);
  }
  function log(t) {
    st.logs.unshift({ time: new Date().toISOString(), text: t });
    st.logs = st.logs.slice(0, 35);
  }
  const rewardCoins = (q) => st.questRewards?.[q.id] ?? q.rewardCoins;
  const visibleQuest = (q) =>
    !q.archived || st.accepted.includes(q.id) || st.claimed.includes(q.id);
  function isAccepted(q) {
    return st.accepted.includes(q.id);
  }
  function isClaimed(q) {
    return R.status(st, q) === 'claimed';
  }
  function canAccept(q) {
    return q.requires.every((id) => st.claimed.includes(id));
  }
  function obj(q, event) {
    return st.progress[q.id]?.[event] || { count: 0, ids: [] };
  }
  function progressOf(q) {
    const p = R.progress(st, q);
    return { ...p, done: p.cur === p.total };
  }
  function record(event, unique) {
    R.record(st, D, event, unique);
  }
  async function acceptQuest(id) {
    const ok = await mutate(
      () => {
        if (!R.accept(st, D, id)) return false;
        log('Đã nhận nhiệm vụ: ' + D.quests.find((q) => q.id === id).name);
        return true;
      },
      intent('/api/quests/' + id + '/accept', {}),
    );
    if (ok) {
      toast('📜 Đã nhận nhiệm vụ! Các việc đã làm được ghi nhận.');
      openQuests('active');
    }
  }
  async function claimQuest(id) {
    const ok = await mutate(
      () => {
        if (!R.claim(st, D, id)) return false;
        log('Nhận thưởng: ' + D.quests.find((q) => q.id === id).name);
        return true;
      },
      intent('/api/quests/' + id + '/claim', {}),
    );
    if (ok) {
      toast('🎁 Đã nhận ' + rewardCoins(D.quests.find((q) => q.id === id)) + ' Xu');
      openQuests('active');
    }
  }
  function nextTarget(q) {
    if (!isAccepted(q))
      return {
        scene: Object.keys(D.scenes).find((id) => D.scenes[id].npc.includes(q.giverId)),
        npc: q.giverId,
        label: 'Gặp ' + q.giver,
      };
    for (let i = 0; i < q.steps.length; i++) {
      const [event, n, label] = q.steps[i];
      if (obj(q, event).count >= n) continue;
      const target = { ...q.guidance[i], label };
      if (target.spots)
        target.spot = target.spots.find((id) => !(st.achievements[event] || []).includes(id));
      return target;
    }
    return null;
  }
  function targetLabel(q) {
    const t = nextTarget(q);
    return t ? `${t.label} · ${D.scenes[t.scene].name}` : 'Đủ điều kiện nhận quà';
  }
  function refreshMarkers() {
    document.querySelectorAll('[data-npc]').forEach((el) => {
      const id = el.dataset.npc;
      const quests = D.quests
        .filter(visibleQuest)
        .filter((q) => q.giverId === id && visibleQuest(q));
      const badge = el.querySelector('.actor-badge');
      const ready = quests.some((q) => R.status(st, q) === 'ready'),
        available = quests.some((q) => R.status(st, q) === 'available');
      badge.textContent = ready
        ? '🎁'
        : available
          ? '!'
          : quests.some((q) => R.status(st, q) === 'active')
            ? '…'
            : '';
      badge.hidden = !badge.textContent;
    });
    document.querySelectorAll('[data-spot]').forEach((el) => {
      const id = el.dataset.spot;
      el.classList.toggle(
        'done',
        st.watered.includes(id) || st.decorated.includes(id) || (id === 'book' && st.bookReturned),
      );
    });
  }
  async function guideQuest(id) {
    const q = D.quests.find((q) => q.id === id);
    if (!q) return;
    if (R.status(st, q) === 'locked') {
      toast('Hãy hoàn thành nhiệm vụ trước đó.');
      return;
    }
    const target = nextTarget(q);
    if (!target) {
      openQuests('active');
      return;
    }
    await mutate(
      () => {
        st.tracked = id;
      },
      intent('/api/player/appearance', { tracked: id }, 'PUT'),
    );
    closeModal();
    if (st.scene !== target.scene && !(await travel(target.scene))) return;
    if (target.npc) {
      await visitNPC(target.npc);
    } else if (target.spot) {
      const spot = D.scenes[st.scene].spots.find((s) => s[0] === target.spot);
      if (spot) await approach(spot);
    } else toast(target.label);
  }
  function renderHud() {
    $('hudName').textContent = st.username || 'Khách mới';
    $('hudCoins').textContent = fmt(st.coins);
    $('hudFace').innerHTML = A.avatar(dressed());
    $('sceneName').textContent = D.scenes[st.scene].name;
    $('sceneSubtitle').textContent = D.scenes[st.scene].sub;
    const q =
      D.quests.find((q) => q.id === st.tracked && !isClaimed(q)) ||
      D.quests.find((q) => isAccepted(q) && !isClaimed(q)) ||
      D.quests.find((q) => visibleQuest(q) && canAccept(q) && !isClaimed(q));
    $('trackerTitle').textContent = q ? q.name : 'Đã hoàn tất nhiệm vụ';
    const p = q ? progressOf(q) : null;
    $('trackerProgress').textContent = p
      ? `${p.cur}/${p.total} · ${p.done ? 'Có quà để nhận' : targetLabel(q)}`
      : 'Khám phá các khu vực';
    $('questDot').classList.toggle(
      'active',
      D.quests.some((q) => isAccepted(q) && !isClaimed(q) && progressOf(q).done),
    );
  }
  function actorPoint(npcId, scene) {
    return D.scenes[scene].npcPoints[npcId];
  }
  function renderScene() {
    const sc = D.scenes[st.scene];
    const seatedLayout = st.seated && seatOf(sc);
    if (seatedLayout) [st.x, st.y] = seatedLayout.position;
    motionPoint = null;
    $('stage').dataset.scene = st.scene;
    if (!window.PARISH_SCENE_ART.mount($('stage'), sc)) $('scenery').innerHTML = A.scene(st.scene);
    $('actors').replaceChildren();
    for (const id of sc.npc) {
      const npc = D.npcs[id],
        pos = actorPoint(id, st.scene),
        b = document.createElement('button');
      b.className = 'actor';
      b.dataset.npc = id;
      b.style.left = pos[0] + '%';
      b.style.top = pos[1] + '%';
      b.style.zIndex = Math.round(pos[1] * 10);
      b.style.transform = `translate(-50%,-100%) scale(${window.PARISH_SCENE_ART.scale(pos[1]).toFixed(3)})`;
      b.setAttribute('aria-label', 'Trò chuyện với ' + npc.name);
      b.innerHTML = `${A.avatar(npcDressed(id))}<span class="actor-name">${A.esc(npc.name)}</span><span class="actor-badge" hidden></span>`;
      b.onclick = (e) => {
        e.stopPropagation();
        visitNPC(id);
      };
      $('actors').append(b);
    }
    for (const spot of sc.spots) {
      const [id, icon, label, x, y] = spot,
        b = document.createElement('button');
      b.className = 'hotspot';
      b.dataset.spot = id;
      b.style.left = x + '%';
      b.style.top = y + '%';
      b.style.zIndex = Math.round(y * 10);
      b.setAttribute('aria-label', label);
      b.innerHTML = `${icon}<small>${A.esc(label)}</small>`;
      b.onclick = (e) => {
        e.stopPropagation();
        approach(spot);
      };
      $('actors').append(b);
    }
    // Artwork itself is interactive; keep the existing V4 hotspot/service IDs.
    const propLinks = {
      christmas: {
        nativity: 'star',
        market_left: 'action_hub_christmas',
        market_right: 'action_hub_christmas',
      },
      choir: { piano: 'rhythm', stand_0: 'rhythm', stand_1: 'rhythm', stand_2: 'rhythm' },
      office: { gifts: 'pack' },
      shoproom: { rack_left: 'browse', rack_right: 'browse', counter: 'browse' },
      foyer: { reception: 'schedule' },
      garden: { bed_left: 'flower1', bed_back: 'flower2', bed_right: 'flower3' },
    };
    for (const el of $('stage').querySelectorAll('.scene-prop')) {
      const id = el.dataset.prop,
        target = sc.spots.find((s) => s[0] === (propLinks[st.scene]?.[id] || id));
      let activate = target ? () => approach(target) : null,
        label = target?.[2];
      if (st.scene === 'shoproom' && id === 'mirror') {
        activate = () => moveTo(67, 92, openAvatar);
        label = 'Gương thử trang phục';
      }
      if (st.scene === 'foyer' && id === 'font') {
        activate = () => moveTo(31, 79, () => travel('baptistry'));
        label = 'Tìm hiểu tại giếng Rửa Tội';
      }
      if (!activate) continue;
      el.classList.add('interactive-prop');
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', label);
      el.onclick = (e) => {
        e.stopPropagation();
        activate();
      };
      el.onkeydown = (e) => {
        if (['Enter', ' '].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          activate();
        }
      };
    }
    $('hint').textContent = 'Chạm NPC hoặc điểm tương tác • Sổ nhiệm vụ có nút Đến mục tiêu';
    refreshMarkers();
    showPlayer();
    renderDecorations();
    cameraTo(st.x, st.y);
  }
  function renderDecorations() {
    let el = $('worldDecor');
    if (!el) {
      el = document.createElement('div');
      el.id = 'worldDecor';
      $('stage').append(el);
    }
    if (D.scenes[st.scene].art?.theme === 'christmas-night') {
      for (const prop of $('stage').querySelectorAll('.scene-prop')) {
        const target = prop.dataset.prop === 'nativity' ? 'star' : prop.dataset.prop;
        prop.classList.toggle('is-decorated', st.decorated.includes(target));
      }
      el.innerHTML = '';
      return;
    }
    el.innerHTML =
      st.scene === 'christmas'
        ? st.decorated
            .map((id) => {
              const sp = D.scenes.christmas.spots.find((s) => s[0] === id);
              return `<span style="left:${sp[3]}%;top:${sp[4]}%">${sp[1]} ✓</span>`;
            })
            .join('')
        : st.scene === 'garden'
          ? st.watered
              .map((id) => {
                const sp = D.scenes.garden.spots.find((s) => s[0] === id);
                return `<span style="left:${sp[3]}%;top:${sp[4]}%">🌸</span>`;
              })
              .join('')
          : '';
  }
  function showPlayer() {
    const el = $('worldPlayer');
    el.style.left = st.x + '%';
    el.style.top = st.y + '%';
    el.style.zIndex = Math.round(st.y * 10);
    el.style.transform = `translate(-50%,-100%) scale(${window.PARISH_SCENE_ART.scale(st.y).toFixed(3)})`;
    el.innerHTML =
      A.avatar({
        ...dressed(),
        direction: st.seated ? 'up' : facing,
        pose: st.activeAction
          ? ACT.find((a) => a.id === st.activeAction.actionId)?.pose
          : st.seated
            ? 'sit_back'
            : 'idle',
      }) + `<span class="name">${A.esc(st.username || 'Người chơi')}</span>`;
    el.classList.toggle('sitting', !!st.seated);
  }
  function cameraTo(x, y = motionPoint?.[1] ?? st.y) {
    const v = $('viewport'),
      stage = $('stage'),
      scene = D.scenes[st.scene],
      horizontalBias =
        scene.art?.theme === 'christmas-night' && v.clientWidth < 650
          ? Math.max(0.25, Math.min(0.75, 0.5 + (50 - x) * 0.02))
          : 0.5,
      cameraBias =
        scene.art?.theme === 'christmas-night' && v.clientWidth >= 1024
          ? 0.84
          : scene.art
            ? 0.78
            : 0.56;
    v.scrollLeft = Math.max(
      0,
      Math.min(
        stage.clientWidth - v.clientWidth,
        (stage.clientWidth * x) / 100 - v.clientWidth * horizontalBias,
      ),
    );
    v.scrollTop = Math.max(
      0,
      Math.min(
        v.scrollHeight - v.clientHeight,
        (stage.clientHeight * y) / 100 - v.clientHeight * cameraBias,
      ),
    );
  }
  function seatOf(sc) {
    const parts = st.seatId?.split(':') || [];
    return sc.seats?.[parts.length === 3 ? parts[1] : parts[0]]?.[Number(parts.at(-1))];
  }
  let locationSync = Promise.resolve(),
    syncPending = false,
    lastLocationSync = 0;
  function streamLocation(point, scene, token) {
    if (!O.active || syncPending || performance.now() - lastLocationSync < 250) return;
    syncPending = true;
    lastLocationSync = performance.now();
    locationSync = locationSync
      .then(async () => {
        if (token !== movement || scene !== st.scene) return;
        await O.command(intent('/api/player/location', { x: point[0], y: point[1] }));
      })
      .catch(() => {
        if (token === movement) toast('Chưa đồng bộ được vị trí. Kiểm tra kết nối rồi thử lại.');
      })
      .finally(() => {
        syncPending = false;
      });
  }
  async function moveTo(x, y, cb) {
    if (activityBusy || activityStarting) return false;
    if (!st.username) {
      onboard();
      return false;
    }
    const scene = st.scene,
      sc = D.scenes[scene],
      token = ++movement,
      seat = st.seated ? seatOf(sc) : null,
      origin = motionPoint || seat?.approach || [st.x, st.y],
      path = N.route(sc, origin, [x, y]);
    if (!path.length) {
      moving = false;
      $('worldPlayer').classList.remove('walking');
      toast('Không có lối đi đến đây.');
      return false;
    }

    const actor = $('worldPlayer');
    moving = true;
    actor.classList.remove('sitting');
    actor.classList.add('walking');
    let previous = origin;
    if (seat && !motionPoint) {
      actor.style.left = origin[0] + '%';
      actor.style.top = origin[1] + '%';
    }
    for (const point of path) {
      if (token !== movement || st.scene !== scene) return false;
      const from = [...previous],
        dx = point[0] - from[0],
        dy = point[1] - from[1];
      if (!dx && !dy) continue;
      facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      const sprite = actor.querySelector('svg');
      if (sprite) sprite.outerHTML = A.avatar({ ...dressed(), direction: facing, pose: 'walk' });
      const stage = $('stage'),
        distance = Math.hypot((dx * stage.clientWidth) / 100, (dy * stage.clientHeight) / 100);
      const duration = distance / 0.32;
      await new Promise((resolve) => {
        let previousTime = performance.now(),
          elapsed = 0;
        const frame = (now) => {
          if (token !== movement || st.scene !== scene) {
            resolve();
            return;
          }
          elapsed += Math.min(50, Math.max(0, now - previousTime));
          previousTime = now;
          const t = Math.min(1, elapsed / Math.max(1, duration));
          motionPoint = [from[0] + dx * t, from[1] + dy * t];
          actor.style.left = motionPoint[0] + '%';
          actor.style.top = motionPoint[1] + '%';
          actor.style.zIndex = Math.round(motionPoint[1] * 10);
          actor.style.transform = `translate(-50%,-100%) scale(${window.PARISH_SCENE_ART.scale(motionPoint[1]).toFixed(3)})`;
          cameraTo(...motionPoint);
          streamLocation([...motionPoint], scene, token);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      previous = point;
    }
    if (token !== movement || st.scene !== scene) return false;
    if (O.active) {
      await locationSync;
      // A slow request may leave the server behind the predicted avatar.
      // Replay small, paced steps; never bypass the server's movement budget.
      locationSync = locationSync
        .then(async () => {
          const server = O.state,
            parts = server.seatId?.split(':') || [],
            seat = sc.seats?.[parts.length === 3 ? parts[1] : parts[0]]?.[Number(parts.at(-1))];
          const origin = (server.seated && seat?.approach) || [server.x, server.y],
            goal = path.at(-1);
          if (Math.hypot(origin[0] - goal[0], origin[1] - goal[1]) < 6) return;
          const catchup = N.route(sc, origin, goal);
          for (let j = 1; j < catchup.length; j++) {
            const a = catchup[j - 1],
              b = catchup[j],
              n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4);
            for (let i = 1; i <= n; i++) {
              await new Promise((resolve) => setTimeout(resolve, 120));
              if (token !== movement || scene !== st.scene) return;
              lastLocationSync = performance.now();
              await O.command(
                intent('/api/player/location', {
                  x: a[0] + ((b[0] - a[0]) * i) / n,
                  y: a[1] + ((b[1] - a[1]) * i) / n,
                }),
              );
            }
          }
        })
        .catch(() => toast('Chưa đồng bộ được vị trí. Hãy kiểm tra kết nối.'));
      await locationSync;
      const delay = Math.max(0, 250 - (performance.now() - lastLocationSync));
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (token !== movement || st.scene !== scene) return false;
      lastLocationSync = performance.now();
    }
    actor.classList.remove('walking');
    const persist = () =>
      mutate(
        () => {
          if (token !== movement || st.scene !== scene || st.activeAction) return false;
          st.x = path.at(-1)[0];
          st.y = path.at(-1)[1];
          st.seated = false;
          st.seatId = null;
          return true;
        },
        intent('/api/player/location', { x: path.at(-1)[0], y: path.at(-1)[1] }),
      );
    const committed = O.active
      ? await (locationSync = locationSync.then(() =>
          token === movement && st.scene === scene ? persist() : false,
        ))
      : await persist();
    if (token !== movement || st.scene !== scene) return false;
    moving = false;
    motionPoint = null;
    if (!committed && O.active) st = readState();
    showPlayer();
    if (!committed) return false;
    if (token === movement && st.scene === scene) await cb?.();
    return true;
  }
  async function approach(spot) {
    const anchor = D.scenes[st.scene].anchors[spot[0]] || [spot[3], spot[4]];
    return moveTo(...anchor, () => act(spot));
  }
  async function travel(target) {
    if (activityBusy || activityStarting) {
      toast('Hãy đợi hoàn tất hành động.');
      return false;
    }
    if (!D.scenes[target]) return false;
    movement++;
    moving = false;
    await locationSync;
    const ok = await mutate(
      () => {
        if (st.activeAction) return false;
        st.scene = target;
        st.seated = false;
        st.seatId = null;
        const p = N.nearest(D.scenes[target], D.scenes[target].entry);
        [st.x, st.y] = p;
        if (target === 'nave') record('enter_nave', 'nave');
        return true;
      },
      intent('/api/player/travel', { sceneId: target }),
    );
    if (!ok) return false;
    renderScene();
    cameraTo(st.x);
    toast('📍 ' + D.scenes[target].name);
    return true;
  }
  async function visitNPC(id) {
    const pos = actorPoint(id, st.scene);
    return moveTo(pos[0] + 5, pos[1] + 3, () => talk(id));
  }
  async function talk(id) {
    if (!D.scenes[st.scene].npc.includes(id)) return;
    await mutate(
      () => record(D.npcs[id].event, 'npc:' + id),
      intent('/api/player/interact', { npcId: id }),
    );
    const n = D.npcs[id],
      related = D.quests.filter((q) => q.giverId === id && visibleQuest(q)),
      buttons = [['Tiếp tục', closeModal, 'secondary']];
    let line = n.line;
    if (id === 'anna' && st.bookReturned)
      line = 'Cảm ơn cháu đã trả sách! Nếu muốn, cháu có thể giúp bác Phêrô chăm ba luống hoa.';
    else if (id === 'anna' && st.book)
      line = 'Cháu đã tìm thấy sách rồi! Cảm ơn cháu, hãy trao lại cho bà nhé.';
    else if (related.length && related.every(isClaimed))
      line =
        'Cảm ơn bạn đã hoàn thành mọi việc cùng mình! Mở sổ nhiệm vụ để tìm những người còn cần giúp nhé.';
    if (id === 'anna' && st.book)
      buttons.unshift([
        'Trả cuốn sách',
        async () => {
          await mutate(
            () => {
              if (!st.book) return;
              st.book = false;
              st.bookReturned = true;
              record('pickup_book', 'book');
              record('return_book', 'anna');
              log('Đã trả sách cho bà Anna');
            },
            intent('/api/player/interact', { npcId: 'anna', choice: 'return_book' }),
          );
          await talk(id);
          toast('📚 Đã trả sách cho bà Anna!');
        },
        'primary',
      ]);
    if (id === 'shopkeeper') buttons.unshift(['Mở Shop', () => openShop(), 'primary']);
    if (id === 'guard') buttons.unshift(['Xem bản đồ', openMap, 'primary']);
    const rows = related
      .map((q) => {
        const status = R.status(st, q),
          p = progressOf(q);
        return `<div class="npc-quest"><b>${A.esc(q.name)}</b><p>${A.esc(isAccepted(q) && !isClaimed(q) ? targetLabel(q) : q.desc)}</p><small>${status === 'claimed' ? '✓ Đã nhận quà' : status === 'locked' ? 'Cần hoàn thành: ' + q.requires.map((id) => D.quests.find((q) => q.id === id).name).join(', ') : `${p.cur}/${p.total} · +${rewardCoins(q)} Xu`}</small>${status === 'available' ? `<button class="btn small" data-npc-accept="${q.id}">Nhận nhiệm vụ</button>` : status === 'ready' ? `<button class="btn small" data-npc-claim="${q.id}">Nhận quà</button>` : status === 'active' ? `<button class="btn small secondary" data-guide="${q.id}">Đến mục tiêu</button>` : ''}</div>`;
      })
      .join('');
    openWindow(
      n.name,
      n.role,
      `<div class="npc-dialogue"><div class="npc-portrait">${A.avatar(npcDressed(id))}</div><div><div class="dialogue-name">${A.esc(n.role)}</div><p class="dialogue-text">${A.esc(line)}</p></div></div>${rows}`,
      buttons,
    );
    document
      .querySelectorAll('[data-npc-accept]')
      .forEach((b) => (b.onclick = () => acceptQuest(b.dataset.npcAccept)));
    document
      .querySelectorAll('[data-npc-claim]')
      .forEach((b) => (b.onclick = () => claimQuest(b.dataset.npcClaim)));
    bindGuides();
  }
  function bindGuides() {
    document
      .querySelectorAll('[data-guide]')
      .forEach((b) => (b.onclick = () => guideQuest(b.dataset.guide)));
  }
  const info = {
    altar: [
      'Bàn thờ trong Thánh lễ',
      'Bàn thờ là trung tâm cử hành Thánh lễ. Trong game, đây là điểm tìm hiểu kiến thức; người chơi không đi vào cung thánh tự do.',
    ],
    schedule: [
      'Bảng giờ lễ (hư cấu)',
      'Chủ nhật: 07:00 và 17:30. Ngày thường: 06:00. Đây chỉ là lịch minh họa trong trò chơi, không phải giờ lễ thực tế.',
    ],
  };
  async function act(spot) {
    const [id, , , x, y, kind, arg] = spot;
    switch (kind) {
      case 'go':
        await travel(arg);
        break;
      case 'repeat':
        openActivity(arg);
        break;
      case 'activity_hub':
        openActivities('here');
        break;
      case 'seat':
        openWindow(
          'Chọn chỗ ngồi',
          'Hướng về cung thánh',
          `<p>Chọn một vị trí trên hàng ghế.</p><div class="choices">${[0, 1, 2].map((i) => `<button class="choice" data-seat="${i}">Chỗ ${i + 1}</button>`).join('')}</div>`,
          [['Đứng dậy', closeModal, 'secondary']],
        );
        document.querySelectorAll('[data-seat]').forEach(
          (b) =>
            (b.onclick = async () => {
              const seated = await mutate(
                () => {
                  st.seated = true;
                  st.seatId = id + ':' + b.dataset.seat;
                  const seat = D.scenes[st.scene].seats?.[id]?.[Number(b.dataset.seat)];
                  [st.x, st.y] = seat?.position || [x + (Number(b.dataset.seat) - 1) * 3, y];
                  record('sit_pew', st.seatId);
                  return true;
                },
                intent('/api/player/interact', { spotId: id, choice: Number(b.dataset.seat) }),
              );
              if (!seated) return;
              closeModal();
              showPlayer();
              toast('🪑 Đã ngồi. Chạm lối đi để đứng dậy.');
            }),
        );
        break;
      case 'info':
        openWindow(info[arg][0], 'Tìm hiểu nhà thờ', `<p>${A.esc(info[arg][1])}</p>`, [
          ['Đã hiểu', closeModal, 'primary'],
        ]);
        break;
      case 'learn':
        await mutate(
          () => record(arg === 'baptism' ? 'learn_baptism' : 'learn_confession', arg),
          intent('/api/player/interact', { spotId: id }),
        );
        if (arg === 'baptism')
          openWindow(
            'Tìm hiểu Rửa Tội',
            'Bài học giáo lý',
            '<p>Bí tích Rửa Tội là nghi thức khai tâm Kitô giáo; theo đức tin Công giáo, một người chỉ lãnh nhận bí tích này một lần.</p><p class="muted">Đây là bài học, không cử hành Rửa Tội thật.</p>',
            [
              ['Làm câu hỏi', () => quiz('baptism'), 'primary'],
              ['Đóng', closeModal, 'secondary'],
            ],
          );
        else
          openWindow(
            'Tìm hiểu Hòa Giải',
            'Bài học giáo lý',
            '<p>Bí tích Hòa Giải gắn với ăn năn, xưng tội, đón nhận ơn tha thứ và quyết tâm sửa đổi.</p><p class="muted">Trò chơi không hỏi hay lưu lời xưng tội và không giả lập ban ơn xá giải.</p>',
            [['Đã hiểu', closeModal, 'primary']],
          );
        break;
      case 'quiz':
        quiz(arg);
        break;
      case 'book':
        await mutate(
          () => {
            if (st.bookReturned) {
              toast('Cuốn sách đã được trả lại bà Anna.');
              return;
            }
            st.book = true;
            record('pickup_book', 'book');
            toast('📗 Đã nhặt sách! Đến vườn tìm bà Anna.');
          },
          intent('/api/player/interact', { spotId: id }),
        );
        refreshMarkers();
        break;
      case 'water':
      case 'decorate': {
        const list = kind === 'water' ? 'watered' : 'decorated';
        await mutate(
          () => {
            if (st[list].includes(id)) {
              toast('Điểm này đã hoàn thành. Hãy chọn điểm khác.');
              return;
            }
            st[list].push(id);
            record(kind === 'water' ? 'water_flower' : 'decorate', id);
            toast(kind === 'water' ? '💧 Đã tưới một luống hoa!' : '⭐ Đã thêm một món trang trí!');
          },
          intent('/api/player/interact', { spotId: id }),
        );
        renderDecorations();
        break;
      }
      case 'pack':
        giftGame();
        break;
      case 'rhythm':
        rhythmGame();
        break;
      case 'shop':
        openShop();
        break;
    }
  }
  function quiz(type) {
    const q = D.quizzes[type];
    openWindow(
      q.title,
      'Học mà chơi',
      `<p><b>${A.esc(q.question)}</b></p><div class="choices">${q.choices.map((c, i) => `<button class="choice" data-answer="${i}">${A.esc(c)}</button>`).join('')}</div><p class="helper">Có thể thử lại nếu chọn nhầm.</p>`,
      [['Để sau', closeModal, 'secondary']],
    );
    document.querySelectorAll('[data-answer]').forEach(
      (b) =>
        (b.onclick = async () => {
          if (+b.dataset.answer !== q.correct) {
            toast('Chưa đúng, hãy thử lại.');
            return;
          }
          await mutate(
            () => record(q.event, type),
            intent('/api/player/interact', {
              spotId: type === 'baptism' ? 'quiz_baptism' : 'quiz_class',
              answer: Number(b.dataset.answer),
            }),
          );
          closeModal();
          toast('🌟 Chính xác! Tiến độ đã được lưu.');
        }),
    );
  }
  function giftGame() {
    openWindow(
      'Gói hộp quà sẻ chia',
      'Chọn ba món khác nhau',
      `<p>${st.giftDone ? '🎁 Hộp quà đã sẵn sàng!' : 'Tiến độ được giữ khi đóng cửa sổ hoặc tải lại.'}</p><div class="choices">${D.giftItems.map((name, i) => `<button class="choice" data-gift="${i}" ${st.giftDone || st.giftItems.includes(i) ? 'disabled' : ''}>${st.giftDone || st.giftItems.includes(i) ? '✅ ' : ''}${A.esc(name)}</button>`).join('')}</div><p>Đã chuẩn bị ${st.giftDone ? 3 : st.giftItems.length}/3 món</p>`,
      [['Đóng', closeModal, 'secondary']],
    );
    document.querySelectorAll('[data-gift]').forEach(
      (b) =>
        (b.onclick = async () => {
          await mutate(
            () => {
              const i = +b.dataset.gift;
              if (!st.giftItems.includes(i)) st.giftItems.push(i);
              if (st.giftItems.length === 3) {
                st.giftDone = true;
                record('complete_gift', 'gift');
              }
            },
            intent('/api/player/interact', { spotId: 'pack', choice: Number(b.dataset.gift) }),
          );
          giftGame();
          if (st.giftDone) toast('🎁 Hộp quà hoàn tất!');
        }),
    );
  }
  function rhythmGame() {
    let index = 0;
    const sequence = D.rhythmSequence;
    const paint = () => {
      openWindow(
        'Nhịp chuông vui',
        'Nhớ và chạm theo đúng thứ tự',
        `<p>Thứ tự: <b>${sequence.join(' → ')}</b></p><div class="progress-rail"><i style="width:${(index / sequence.length) * 100}%"></i></div><p>${index}/${sequence.length} nhịp đúng</p><div class="choices rhythm-keys">${sequence.map((s, i) => `<button class="choice" data-rhythm="${i}">${s}</button>`).join('')}</div>`,
        [['Rời trò chơi', closeModal, 'secondary']],
      );
      document.querySelectorAll('[data-rhythm]').forEach(
        (b) =>
          (b.onclick = async () => {
            if (+b.dataset.rhythm !== index) {
              index = 0;
              paint();
              toast('Lệch nhịp! Thử lại từ đầu.');
              return;
            }
            index++;
            if (index === sequence.length) {
              await mutate(
                () => record('complete_rhythm', 'rhythm'),
                intent('/api/player/interact', { spotId: 'rhythm', sequence: [0, 1, 2] }),
              );
              closeModal();
              toast('🎵 Hoàn thành bài nhịp!');
            } else paint();
          }),
      );
    };
    paint();
  }
  function openWindow(title, subtitle, body, buttons = [], wide = false) {
    movement++;
    moving = false;
    $('worldPlayer').classList.remove('walking');
    const m = $('modalMount');
    if (!m.childNodes.length) returnFocus = document.activeElement;
    document
      .querySelectorAll('#game > :not(#modalMount):not(#toastMount)')
      .forEach((el) => (el.inert = true));
    m.innerHTML = `<div class="scrim"><section class="window ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${A.esc(title)}"><header class="window-head"><div><h2>${A.esc(title)}</h2>${subtitle ? `<small>${A.esc(subtitle)}</small>` : ''}</div><button class="close" aria-label="Đóng">×</button></header><div class="window-body">${body}</div><footer class="window-foot"></footer></section></div>`;
    m.querySelector('.close').onclick = closeModal;
    m.querySelector('.scrim').onclick = (e) => {
      if (e.target.classList.contains('scrim') && st.username) closeModal();
    };
    const ft = m.querySelector('.window-foot');
    for (const [name, fn, type] of buttons) {
      const b = document.createElement('button');
      b.className = 'btn' + (type === 'secondary' ? ' secondary' : '');
      b.textContent = name;
      b.onclick = fn;
      ft.append(b);
    }
    if (!buttons.length) ft.remove();
    queueMicrotask(() => m.querySelector('input,button')?.focus());
  }
  function closeModal() {
    $('modalMount').replaceChildren();
    previewEquipment = null;
    document.querySelectorAll('#game > [inert]').forEach((el) => (el.inert = false));
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }
  function openMap() {
    const cards = Object.entries(D.scenes)
      .map(
        ([id, s]) =>
          `<button class="map-tile ${st.scene === id ? 'active' : ''}" data-travel="${id}"><span>${s.icon}</span><strong>${A.esc(s.name)}</strong><small>${st.scene === id ? 'Đang ở đây' : 'Chạm để di chuyển'}</small></button>`,
      )
      .join('');
    openWindow(
      'Bản đồ giáo xứ',
      'Ẩn khi không sử dụng',
      `<p class="muted">Mỗi khu vực có NPC và hoạt động riêng. Chọn một địa điểm để chuyển cảnh.</p><div class="map-grid">${cards}</div>`,
      [['Đóng', closeModal, 'secondary']],
      true,
    );
    document.querySelectorAll('[data-travel]').forEach(
      (b) =>
        (b.onclick = () => {
          closeModal();
          travel(b.dataset.travel);
        }),
    );
  }
  function openQuests(filter = 'active') {
    activeTab = filter;
    const tabs = [
      ['active', 'Đang làm'],
      ['all', 'Có thể nhận'],
      ['done', 'Đã nhận quà'],
    ];
    const quests = D.quests
      .filter(visibleQuest)
      .filter((q) =>
        filter === 'active'
          ? ['active', 'ready'].includes(R.status(st, q))
          : filter === 'all'
            ? ['available', 'locked'].includes(R.status(st, q))
            : isClaimed(q),
      );
    const body =
      `<p class="muted">Đã hoàn thành ${st.claimed.length}/${D.quests.length} nhiệm vụ. Hoạt động khám phá trước khi nhận nhiệm vụ vẫn được ghi nhận.</p><div class="pilltabs">${tabs.map(([id, n]) => `<button data-quest-tab="${id}" class="${id === filter ? 'active' : ''}">${n}</button>`).join('')}</div>` +
      quests
        .map((q) => {
          const p = progressOf(q),
            status = R.status(st, q);
          return `<div class="quest-row"><div><h3>${A.esc(q.name)}</h3><p>${A.esc(q.desc)}</p><div class="step">${q.steps.map(([event, n, title]) => `${A.esc(title)} (${Math.min(n, obj(q, event).count)}/${n})`).join(' · ')}</div><p class="quest-destination">${status === 'locked' ? 'Cần hoàn thành: ' + q.requires.map((id) => D.quests.find((q) => q.id === id).name).join(', ') : status === 'claimed' ? '✓ Đã nhận quà' : A.esc(targetLabel(q))}</p><div class="reward">+${rewardCoins(q)} Xu</div></div><div class="quest-buttons"><button class="btn small" data-quest-action="${q.id}" ${['locked', 'claimed'].includes(status) ? 'disabled' : ''}>${{ locked: 'Chưa mở', claimed: 'Đã hoàn thành', available: 'Nhận nhiệm vụ', active: 'Theo dõi', ready: 'Nhận quà' }[status]}</button>${['available', 'active'].includes(status) ? `<button class="btn small secondary" data-guide="${q.id}">Đến mục tiêu</button>` : ''}</div></div>`;
        })
        .join('') +
      (quests.length
        ? ''
        : `<p class="empty">${st.claimed.length === D.quests.length ? '🎉 Bạn đã hoàn thành tất cả nhiệm vụ! Tiếp tục gặp bạn bè, làm hoạt động và phối trang phục.' : 'Không còn nhiệm vụ trong nhóm này. Mở Có thể nhận để tiếp tục khám phá.'}</p>`);
    openWindow(
      'Sổ nhiệm vụ',
      'Làm việc nhỏ, khám phá và nhận Xu',
      body,
      [['Đóng', closeModal, 'secondary']],
      true,
    );
    document
      .querySelectorAll('[data-quest-tab]')
      .forEach((b) => (b.onclick = () => openQuests(b.dataset.questTab)));
    document.querySelectorAll('[data-quest-action]').forEach(
      (b) =>
        (b.onclick = async () => {
          const q = D.quests.find((q) => q.id === b.dataset.questAction),
            status = R.status(st, q);
          if (status === 'available') return acceptQuest(q.id);
          if (status === 'ready') return claimQuest(q.id);
          if (status !== 'active') {
            openQuests(activeTab);
            return;
          }
          await mutate(
            () => {
              st.tracked = q.id;
            },
            intent('/api/player/appearance', { tracked: q.id }, 'PUT'),
          );
          closeModal();
          toast(targetLabel(q));
        }),
    );
    bindGuides();
  }
  const slotTitles = { top: 'Áo', bottom: 'Quần/Váy', shoes: 'Giày', hair: 'Tóc', acc: 'Phụ kiện' };
  function shopCards(slot, onlyOwned = false) {
    return D.items
      .filter(
        (i) =>
          i.slot === slot &&
          (!i.archived || st.inventory.includes(i.id)) &&
          (!onlyOwned || st.inventory.includes(i.id)),
      )
      .map((i) => {
        const owned = st.inventory.includes(i.id),
          equip = st.equipped[i.slot] === i.id;
        return `<div class="item-card ${equip ? 'equipped' : ''}"><span class="item-visual">${i.thumbnail ? `<img src="${A.esc(i.thumbnail)}" alt="${A.esc(i.name)}">` : i.icon}</span><strong>${A.esc(i.name)}</strong><small>${i.price ? '🪙 ' + fmt(i.price) + ' Xu' : 'Miễn phí'}</small>${!onlyOwned ? `<button class="btn small secondary" data-preview="${i.id}">Thử</button>` : ''}<button class="btn small" data-item="${i.id}" ${equip ? 'disabled' : ''}>${equip ? 'Đang mặc' : owned ? 'Mặc' : 'Mua'}</button></div>`;
      })
      .join('');
  }
  function openShop(slot = shopSlot) {
    shopSlot = slot;
    previewEquipment ??= { ...st.equipped };
    const tabs = Object.entries(slotTitles)
      .map(
        ([id, name]) =>
          `<button class="${id === slot ? 'active' : ''}" data-slot="${id}">${name}</button>`,
      )
      .join('');
    openWindow(
      'Shop trang phục',
      `🪙 ${fmt(st.coins)} Xu · thử đồ miễn phí`,
      `<div class="outfit-layout"><div><div class="avatar-stage" id="shopPreview">${A.avatar(dressed(previewEquipment))}</div><p class="equip-label" id="previewLabel">Bản xem thử · chưa thay trang phục</p></div><div><div class="pilltabs">${tabs}</div><div class="items-grid">${shopCards(slot)}</div></div></div><p class="helper">Thử không trừ Xu. Chỉ mua khi xác nhận; đóng Shop để bỏ bản thử. Trang phục thường ngày và lễ hội.</p>`,
      [['Đóng', closeModal, 'secondary']],
      true,
    );
    document
      .querySelectorAll('[data-slot]')
      .forEach((b) => (b.onclick = () => openShop(b.dataset.slot)));
    document.querySelectorAll('[data-preview]').forEach(
      (b) =>
        (b.onclick = () => {
          const i = item(b.dataset.preview);
          previewEquipment[i.slot] = i.id;
          $('shopPreview').innerHTML = A.avatar(dressed(previewEquipment));
          $('previewLabel').textContent = 'Đang thử: ' + i.name + ' · chưa mua';
        }),
    );
    document.querySelectorAll('[data-item]').forEach(
      (b) =>
        (b.onclick = () => {
          const i = item(b.dataset.item);
          if (st.inventory.includes(i.id)) return buyOrEquip(i.id, () => openShop(shopSlot));
          openWindow(
            'Xác nhận mua',
            i.name,
            `<p>Mua <b>${A.esc(i.name)}</b> với <b>${fmt(i.price)} Xu</b>?</p><p>Đồ sẽ được lưu vào túi và mặc ngay.</p>`,
            [
              ['Mua và mặc', () => buyOrEquip(i.id, () => openShop(shopSlot)), 'primary'],
              ['Quay lại', () => openShop(shopSlot), 'secondary'],
            ],
          );
        }),
    );
  }
  async function buyOrEquip(id, rerender) {
    const result = await mutate(
      () => R.purchase(st, D, id),
      intent(
        st.inventory.includes(id) ? '/api/player/equipment' : '/api/shop/purchase',
        { itemId: id },
        st.inventory.includes(id) ? 'PUT' : 'POST',
        'ok',
      ),
    );
    if (result === 'insufficient') {
      toast('Chưa đủ Xu. Hãy làm nhiệm vụ hoặc các hành động nhỏ!');
      openShop(shopSlot);
      return;
    }
    if (result !== 'ok') return;
    previewEquipment = { ...st.equipped };
    showPlayer();
    rerender?.();
  }
  function openBag(slot = 'top') {
    const tabs = Object.entries(slotTitles)
      .map(
        ([id, n]) =>
          `<button class="${id === slot ? 'active' : ''}" data-bag-tab="${id}">${n}</button>`,
      )
      .join('');
    openWindow(
      'Túi đồ',
      'Chỉ hiển thị những món đã sở hữu',
      `<div class="pilltabs">${tabs}</div><div class="items-grid">${shopCards(slot, true)}</div><p class="muted">Bạn có ${st.inventory.length} món đồ. Nhấn Mặc để cập nhật ngay trang phục nhân vật trên bản đồ.</p>`,
      [['Đóng', closeModal, 'secondary']],
      true,
    );
    document
      .querySelectorAll('[data-bag-tab]')
      .forEach((b) => (b.onclick = () => openBag(b.dataset.bagTab)));
    document
      .querySelectorAll('[data-item]')
      .forEach((b) => (b.onclick = () => buyOrEquip(b.dataset.item, () => openBag(slot))));
  }
  function openAvatar() {
    openWindow(
      'Nhân vật',
      'Chọn giới tính nhân vật và phối đồ',
      `<div class="outfit-layout"><div class="avatar-stage">${A.avatar(dressed())}</div><div><p><b>${A.esc(st.username)}</b> · Cư dân giáo xứ</p><p class="muted">Avatar được vẽ bằng các lớp: đầu, tóc, thân, tay, chân, áo, quần/váy và phụ kiện.</p><div class="gender-select"><button class="btn ${st.gender === 'male' ? '' : 'secondary'}" data-gender="male">👦 Nam</button><button class="btn ${st.gender === 'female' ? '' : 'secondary'}" data-gender="female">👧 Nữ</button></div><div class="pilltabs"><button class="active" data-color="#f7cfac">Da sáng</button><button data-color="#d9a77f">Da ấm</button><button data-color="#ae7658">Da nâu</button></div><button class="btn block" data-open="bag">🎒 Chọn trang phục đã mua</button></div></div>`,
      [['Xong', closeModal, 'primary']],
      true,
    );
    document.querySelectorAll('[data-gender]').forEach(
      (b) =>
        (b.onclick = async () => {
          await mutate(
            () => {
              st.gender = b.dataset.gender;
            },
            intent('/api/player/appearance', { gender: b.dataset.gender }, 'PUT'),
          );
          showPlayer();
          openAvatar();
        }),
    );
    document.querySelectorAll('[data-color]').forEach(
      (b) =>
        (b.onclick = async () => {
          await mutate(
            () => {
              st.skin = b.dataset.color;
            },
            intent('/api/player/appearance', { skin: b.dataset.color }, 'PUT'),
          );
          showPlayer();
          openAvatar();
        }),
    );
    document.querySelectorAll('.window [data-open]').forEach((b) => (b.onclick = () => openBag()));
  }
  function openEvents() {
    const q = D.quests.find((q) => q.id === 'q_noel');
    openWindow(
      'Sự kiện Giáng sinh',
      'Lễ hội trong thế giới hư cấu của game',
      `<div class="event-art"><strong>⭐ Đêm ánh sáng An Hòa</strong><p>Giúp mọi người hoàn thiện khu vực hang đá và cây thông, không cần cày điểm vô hạn.</p></div><div class="card" style="margin-top:12px"><h3>🎄 Nhiệm vụ: ${q.name}</h3><p>${q.desc}</p><div class="reward">${rewardCoins(q)} Xu</div><button class="btn" data-noel>Đến quảng trường</button></div><p class="helper">Sự kiện này có thể chơi thử ngay trong bản offline. Phiên bản online có thể thêm lịch theo mùa, nhưng không dùng ngày ngoài đời làm điều kiện bắt buộc.</p>`,
      [['Đóng', closeModal, 'secondary']],
    );
    document.querySelector('[data-noel]').onclick = () => {
      closeModal();
      travel('christmas');
    };
  }
  function openMenu() {
    openWindow(
      'Cài đặt & thông tin',
      'Tối ưu máy yếu, lưu tiến độ',
      `<p><b>Điều khiển:</b> chạm NPC để nói chuyện; chạm điểm sáng để hành động; chạm nền để nhân vật đi tới. Trên điện thoại dọc, vuốt ngang để ngắm toàn bộ bản đồ.</p><label class="theme-checkbox"><input type="checkbox" id="reduceMotion" ${st.lowMotion ? 'checked' : ''}> Chế độ tiết kiệm hiệu ứng</label><p class="helper">Đồ họa SVG 2D tĩnh và animation CSS nhẹ. ${O.active ? 'Tiến độ tài khoản đang lưu trên máy chủ. Bản demo local được giữ riêng.' : 'Bản demo này lưu trong trình duyệt. Đăng nhập để lưu tiến độ trên máy chủ.'}</p><div class="choices"><button class="choice" id="exportSave">Tải bản sao dữ liệu demo local</button><button class="choice" id="goDonation">💝 Hòm ủng hộ & bảng tri ân</button><button class="choice" id="goActivities">🙌 Xem các hoạt động</button><button class="choice" id="goWardrobe">🎒 Túi đồ đã mua</button><button class="choice" id="goEvents">🎄 Trang trí Giáng sinh</button><button class="choice" id="goFoyer">🚪 Đến tiền sảnh nhà thờ</button><button class="choice" id="goShopRoom">🛍️ Tham quan gian trang phục</button><button class="choice" id="resetGame" style="color:#a6454a">🗑️ Xóa dữ liệu chơi thử và tạo lại nhân vật</button></div>`,
      [['Đóng', closeModal, 'secondary']],
    );
    $('exportSave').onclick = () => {
      const bytes =
        rawSaveProblem && typeof rawSaveBytes === 'string'
          ? rawSaveBytes
          : (localStorage.getItem(KEY) ?? localStorage.getItem('giao-xu-an-hoa-2d-v2') ?? '{}');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
      a.download = 'anhoa-demo-backup.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('goDonation').onclick = () => openDonations();
    $('goActivities').onclick = () => openActivities();
    $('goWardrobe').onclick = () => openBag();
    $('goEvents').onclick = () => openEvents();
    $('reduceMotion').onchange = async (e) => {
      const checked = e.target.checked;
      await mutate(
        () => {
          st.lowMotion = checked;
        },
        intent('/api/player/appearance', { lowMotion: checked }, 'PUT'),
      );
      document.body.classList.toggle('low-motion', st.lowMotion);
    };
    $('goFoyer').onclick = () => {
      closeModal();
      travel('foyer');
    };
    $('goShopRoom').onclick = () => {
      closeModal();
      travel('shoproom');
    };
    $('resetGame').onclick = async () => {
      if (O.active) {
        toast(
          'Tiến độ tài khoản được lưu trên máy chủ. Đăng xuất qua Tài khoản để chơi demo riêng.',
        );
        return;
      }
      if (
        confirm('Tạo lại bản demo trên trình duyệt? Dữ liệu tài khoản online không bị thay đổi.')
      ) {
        if (rawSaveProblem) {
          try {
            if (typeof rawSaveBytes !== 'string') throw Error('SAVE_UNREADABLE');
            localStorage.setItem(KEY + ':backup:' + Date.now(), rawSaveBytes);
            localStorage.setItem(KEY, JSON.stringify(initial()));
            rawSaveProblem = null;
          } catch {
            toast('Không thể tạo bản sao, dữ liệu gốc chưa bị ghi đè.');
            return;
          }
        }
        movement++;
        clearTimeout(completionTimer);
        await mutate(() => {
          st = initial();
        });
        closeModal();
        renderScene();
        onboard();
      }
    };
  }
  function open(name) {
    if (!st.username && !rawSaveProblem) return onboard();
    switch (name) {
      case 'map':
        openMap();
        break;
      case 'actions':
        openActivities();
        break;
      case 'donations':
        openDonations();
        break;
      case 'quests':
        openQuests('active');
        break;
      case 'avatar':
        openAvatar();
        break;
      case 'shop':
        openShop();
        break;
      case 'bag':
        openBag();
        break;
      case 'events':
        openEvents();
        break;
      case 'menu':
        openMenu();
        break;
    }
  }
  function onboard() {
    let gender = st.gender,
      name = '';
    const paint = () => {
      openWindow(
        'Chào mừng đến Giáo Xứ An Hòa',
        'Tạo nhân vật để bắt đầu hành trình',
        `<div class="onboard"><div class="avatar-stage">${A.avatar({ ...dressed(), gender })}</div><div><p class="muted">Khám phá giáo xứ 2D, gặp NPC và giúp mọi người. Game hư cấu, không cử hành bí tích thật.</p>${O.available ? '<p><a href="/account">Đăng nhập / tạo tài khoản để lưu trên máy chủ</a></p>' : ''}<label class="field">Tên nhân vật<input id="inputName" maxlength="20" autocomplete="off" placeholder="Ví dụ: An Nhiên" value="${A.esc(name)}"></label><div class="gender-select"><button class="btn ${gender === 'male' ? '' : 'secondary'}" data-choose="male">👦 Nhân vật nam</button><button class="btn ${gender === 'female' ? '' : 'secondary'}" data-choose="female">👧 Nhân vật nữ</button></div></div></div>`,
        [
          [
            'Bắt đầu chơi',
            async () => {
              const username = $('inputName')
                .value.replace(/[\p{Cc}\p{Cf}<>]/gu, '')
                .trim()
                .slice(0, 20);
              if (!username) {
                toast('Hãy nhập tên hợp lệ!');
                return;
              }
              const ok = await mutate(() => {
                st.username = username;
                st.gender = gender;
                return true;
              });
              if (!ok) return;
              closeModal();
              renderScene();
              toast('🌷 Chào ' + username + '! Hãy gặp Lucia ở sân.');
            },
            'primary',
          ],
        ],
      );
      document.querySelectorAll('[data-choose]').forEach(
        (b) =>
          (b.onclick = () => {
            name = $('inputName').value;
            gender = b.dataset.choose;
            paint();
          }),
      );
      $('modalMount').querySelector('.close').hidden = true;
    };
    paint();
  }

  // ======= CÁC HÀNH ĐỘNG LẶP LẠI (DEMO LOCAL; production phải xác thực trên server) =======
  const cooldownFor = (id) => ACT.find((a) => a.id === id);
  const remaining = (id) =>
    Math.max(0, Number(st.cooldowns?.[id] || 0) - (O.active ? O.now() : Date.now()));
  function formatRemaining(ms) {
    const n = Math.ceil(ms / 1000),
      m = Math.floor(n / 60),
      s = n % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  function renderCooldowns() {
    document.querySelectorAll('[data-action-timer]').forEach((el) => {
      const a = cooldownFor(el.dataset.actionTimer);
      if (!a) return;
      const rem = remaining(a.id);
      el.textContent = rem ? formatRemaining(rem) : '+' + a.coins + ' Xu';
      el.closest('.hotspot')?.classList.toggle('cooling', !!rem);
    });
    document.querySelectorAll('[data-activity-button]').forEach((b) => {
      const a = cooldownFor(b.dataset.activityButton);
      if (!a) return;
      const rem = remaining(a.id);
      b.textContent = activityStarting
        ? 'Đang đi tới...'
        : st.activeAction?.actionId === a.id
          ? 'Đang thực hiện...'
          : rem
            ? '⏳ ' + formatRemaining(rem)
            : 'Thực hiện +' + a.coins + ' Xu';
      b.disabled = !!rem || activityBusy || activityStarting;
    });
  }
  function openActivities(category = 'all') {
    const tabs = [
      ['here', 'Tại đây'],
      ['all', 'Tất cả'],
      ['cau_nguyen', 'Cầu nguyện'],
      ['phuc_vu', 'Phục vụ'],
      ['sinh_hoat', 'Sinh hoạt'],
    ]
      .map(
        ([id, n]) =>
          `<button data-act-category="${id}" class="${category === id ? 'active' : ''}">${n}</button>`,
      )
      .join('');
    const rows = ACT.filter((a) => !a.archived)
      .filter(
        (a) =>
          category === 'all' ||
          (category === 'here' && a.scene === st.scene) ||
          a.category === category,
      )
      .map(
        (a) =>
          `<div class="activity-row"><div class="activity-icon">${a.icon}</div><div class="activity-info"><b>${A.esc(a.name)}</b><small>${A.esc(D.scenes[a.scene].name)} · Hồi ${a.cooldown / 60} phút · +${a.coins} Xu</small></div><button class="btn small secondary" ${st.scene === a.scene ? `data-activity-button="${a.id}"` : `data-activity-open="${a.id}"`}>${st.scene === a.scene ? (remaining(a.id) ? '⏳ ' + formatRemaining(remaining(a.id)) : 'Thực hiện +' + a.coins + ' Xu') : 'Đến nơi'}</button></div>`,
      )
      .join('');
    openWindow(
      'Hành động',
      'Công việc nhỏ, hoạt động ngắn; nút có thời gian hồi',
      `<div class="pilltabs">${tabs}</div><div class="activity-rows">${rows}</div><p class="helper">Xu là điểm trò chơi, không đo công phúc và không thay thế việc cầu nguyện/Thánh lễ thật. Các hành động tôn kính mô phỏng đúng ngữ cảnh, không thực hiện trước bàn thờ như trò biểu diễn.</p>`,
      [['Đóng', closeModal, 'secondary']],
      true,
    );
    document
      .querySelectorAll('[data-act-category]')
      .forEach((b) => (b.onclick = () => openActivities(b.dataset.actCategory)));
    document
      .querySelectorAll('[data-activity-button]')
      .forEach((b) => (b.onclick = () => runActivity(b.dataset.activityButton)));
    renderCooldowns();
    document.querySelectorAll('[data-activity-open]').forEach(
      (b) =>
        (b.onclick = () => {
          let a = cooldownFor(b.dataset.activityOpen);
          if (st.scene !== a.scene) {
            closeModal();
            travel(a.scene).then((ok) => {
              if (ok) openActivity(a.id);
            });
          } else openActivity(a.id);
        }),
    );
  }
  function openActivity(id) {
    const a = cooldownFor(id);
    if (!a) return;
    const rem = remaining(id);
    openWindow(
      a.name,
      `Vị trí: ${D.scenes[a.scene].name}`,
      `<div class="action-detail"><div class="action-big">${a.icon}</div><div><p>${A.esc(a.tip)}</p><p class="reward">🪙 +${a.coins} Xu · ⏱ Hồi ${a.cooldown / 60} phút</p><p class="muted">Sau khi hoàn tất, đồng hồ sẽ chạy ngay trong nút hành động tại đây và ngoài bản đồ.</p></div></div><button class="btn block" data-activity-button="${id}" ${rem ? 'disabled' : ''}>${rem ? '⏳ ' + formatRemaining(rem) : 'Thực hiện +' + a.coins + ' Xu'}</button>`,
      [['Đóng', closeModal, 'secondary']],
    );
    document.querySelector('[data-activity-button]').onclick = () => runActivity(id);
    renderCooldowns();
  }
  function playExecution() {
    const execution = st.activeAction;
    if (!execution) return;
    const a = cooldownFor(execution.actionId);
    if (!a) return;
    activityBusy = true;
    showPlayer();
    $('worldPlayer').classList.add('pose-' + a.pose);
    let tool = $('actionTool');
    if (!tool) {
      tool = document.createElement('span');
      tool.id = 'actionTool';
      $('worldPlayer').append(tool);
    }
    tool.textContent = a.icon;
    clearTimeout(completionTimer);
    completionTimer = setTimeout(
      () => finishExecution(execution.id),
      Math.max(0, execution.completeAt - (O.active ? O.now() : Date.now())),
    );
  }
  async function finishExecution(id) {
    const completed = await mutate(
      () => {
        const a = R.complete(st, ACT, id, Date.now());
        if (a) log(`Hoàn thành ${a.name} +${a.coins} Xu`);
        return a;
      },
      intent(
        '/api/actions/executions/' + id + '/complete',
        {},
        'POST',
        ACT.find((a) => a.id === st.activeAction?.actionId),
      ),
    );
    $('worldPlayer').className = 'world-player';
    showPlayer();
    renderCooldowns();
    if (completed) {
      toast(`🪙 +${completed.coins} Xu!`);
      if (!$('modalMount').childNodes.length) openActivity(completed.id);
    } else if (st.activeAction?.id === id) {
      completionTimer = setTimeout(() => finishExecution(id), 5000);
    }
  }
  async function runActivity(id) {
    const a = cooldownFor(id);
    if (!a || activityBusy || activityStarting || remaining(id) || st.scene !== a.scene) return;
    closeModal();
    const arrived = await moveTo(...a.anchor);
    if (!arrived) return;
    activityStarting = true;
    renderCooldowns();
    try {
      const started = await mutate(
        () => R.start(st, ACT, id, Date.now(), crypto.randomUUID()),
        intent('/api/actions/' + id + '/start', {}),
      );
      if (started) {
        toast(`${a.icon} ${a.name}...`);
        playExecution();
      }
    } finally {
      activityStarting = false;
      renderCooldowns();
    }
  }
  window.addEventListener('storage', (e) => {
    if (O.active || e.key !== KEY) return;
    movement++;
    moving = false;
    st = readState();
    activityBusy = !!st.activeAction;
    const safe = N.nearest(D.scenes[st.scene], [st.x, st.y]);
    if (!st.seated) [st.x, st.y] = safe;
    document.body.classList.toggle('low-motion', st.lowMotion);
    renderHud();
    renderScene();
    renderCooldowns();
    if (st.activeAction) playExecution();
    else clearTimeout(completionTimer);
  });
  // ======= HÒM ỦNG HỘ: QUỸ ẢO KHÁC HOÀN TOÀN TIỀN THẬT =======
  function openDonations(tab = 'virtual') {
    const tabs = [
      ['virtual', '🏘️ Xu xây dựng'],
      ['real', '💝 Ủng hộ thật'],
      ['board', '🏅 Bảng tri ân'],
    ]
      .map(
        ([id, n]) =>
          `<button data-donation-tab="${id}" class="${tab === id ? 'active' : ''}">${n}</button>`,
      )
      .join('');
    let body = '';
    if (tab === 'virtual')
      body = `<div class="card"><h3>🌷 Chung tay trang trí giáo xứ trong trò chơi</h3><p>Dùng Xu ảo để hỗ trợ mục tiêu chung; không phải tiền thật hoặc công đức tôn giáo.</p><p>Đã đóng góp trên máy này: <b>${fmt(st.virtualFund)} Xu</b> · ${st.virtualFund >= 300 ? '🌷 Góc hoa đã hoàn thiện' : 'Mục tiêu đầu: 300 Xu'}</p><p><b>Số Xu của bạn:</b> 🪙 ${fmt(st.coins)}</p><div class="choices"><button class="choice" data-virtual-give="50">Đóng góp 50 Xu · Trang trí chậu hoa</button><button class="choice" data-virtual-give="150">Đóng góp 150 Xu · Thêm đèn Noel</button><button class="choice" data-virtual-give="300">Đóng góp 300 Xu · Sửa góc sinh hoạt</button></div></div>`;
    if (tab === 'real')
      body = `<div class="card"><h3>Ủng hộ tiền thật chưa được bật</h3><p>Trò chơi hiện không nhận chuyển khoản. QR NGÂN HÀNG: chưa cấu hình.</p><p class="muted">Chỉ mở sau khi có máy chủ xác minh giao dịch, người thụ hưởng rõ ràng và kiểm duyệt. Không tạo yêu cầu hoặc tự xác nhận thanh toán ở bản chơi thử.</p></div>`;
    if (tab === 'board')
      body = `<div class="card"><h3>Những tấm lòng đồng hành</h3><p>Chưa có tên được công khai. Bảng tri ân cần giao dịch được xác minh, sự đồng ý công khai (donorConsent) và kiểm duyệt từ máy chủ.</p></div>`;
    openWindow(
      'Hòm ủng hộ & Tri ân',
      'Hai hệ thống độc lập: Xu ảo và ủng hộ tiền thật',
      `<div class="pilltabs">${tabs}</div>${body}`,
      [['Đóng', closeModal, 'secondary']],
      true,
    );
    document
      .querySelectorAll('[data-donation-tab]')
      .forEach((b) => (b.onclick = () => openDonations(b.dataset.donationTab)));
    document.querySelectorAll('[data-virtual-give]').forEach(
      (b) =>
        (b.onclick = () => {
          const amount = Number(b.dataset.virtualGive),
            id = crypto.randomUUID();
          openWindow(
            'Xác nhận góp Xu',
            'Chỉ dùng Xu ảo',
            `<p>Đóng góp ${amount} Xu để trang trí trong trò chơi?</p>`,
            [
              [
                'Xác nhận',
                async () => {
                  const ok = await mutate(
                    () => R.contribute(st, amount, id),
                    intent(
                      '/api/virtual-projects/noel/contribute',
                      { coins: amount },
                      'POST',
                      true,
                      id,
                    ),
                  );
                  if (!ok) toast('Chưa đủ Xu hoặc khoản đóng góp đã được xử lý.');
                  openDonations('virtual');
                },
                'primary',
              ],
              ['Quay lại', () => openDonations('virtual'), 'secondary'],
            ],
          );
        }),
    );
  }
  setInterval(() => {
    if (st.username) renderCooldowns();
  }, 1000);

  window.addEventListener('resize', () =>
    cameraTo(motionPoint?.[0] ?? st.x, motionPoint?.[1] ?? st.y),
  );

  // Events
  window.addEventListener('parish:asset-error', () =>
    toast('Một số hình chưa tải được. Bạn vẫn có thể chơi; tải lại trang để thử lại.'),
  );
  for (const b of document.querySelectorAll('.dock [data-open]'))
    b.onclick = () => open(b.dataset.open);
  $('profileQuick').onclick = () => open('avatar');
  $('tracker').onclick = () => openQuests('active');
  $('stage').onclick = (e) => {
    if (!st.username || $('modalMount').childNodes.length) return;
    const r = $('stage').getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * 100,
      y = ((e.clientY - r.top) / r.height) * 100;
    if (N.walkable(D.scenes[st.scene], x, y)) moveTo(x, y);
  };
  let steerTimer;
  const heldKeys = new Map();
  const directions = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
    arrowright: [1, 0],
    d: [1, 0],
  };
  function stopSteer() {
    clearInterval(steerTimer);
    heldKeys.clear();
  }
  function steer() {
    clearInterval(steerTimer);
    const step = () => {
      if ($('modalMount').childNodes.length) {
        stopSteer();
        return;
      }
      let dx = 0,
        dy = 0;
      for (const key of new Set(heldKeys.values())) {
        dx += directions[key][0];
        dy += directions[key][1];
      }
      const length = Math.hypot(dx, dy);
      if (!length) return;
      moveTo(
        (motionPoint?.[0] ?? st.x) + (dx / length) * 3,
        (motionPoint?.[1] ?? st.y) + (dy / length) * 3,
      );
    };
    if (heldKeys.size) {
      step();
      steerTimer = setInterval(step, 120);
    }
  }
  document.addEventListener('keyup', (e) => {
    heldKeys.delete('key:' + e.key.toLowerCase());
    steer();
  });
  window.addEventListener('blur', stopSteer);
  for (const button of document.querySelectorAll('.mobile-pad button')) {
    button.onpointerdown = (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      heldKeys.set('touch:' + e.pointerId, button.dataset.dir.toLowerCase());
      steer();
    };
    const release = (e) => {
      heldKeys.delete('touch:' + e.pointerId);
      steer();
    };
    button.onpointerup = button.onpointercancel = button.onlostpointercapture = release;
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && $('modalMount').childNodes.length) {
      const nodes = [
        ...document.querySelectorAll('.window button:not(:disabled),.window input'),
      ].filter((el) => el.getClientRects().length);
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    if (e.key === 'Escape' && st.username) closeModal();
    if (Object.hasOwn(directions, e.key.toLowerCase()) && !$('modalMount').childNodes.length) {
      e.preventDefault();
      if (e.repeat) return;
      heldKeys.set('key:' + e.key.toLowerCase(), e.key.toLowerCase());
      steer();
    }
  });
  const safe = N.nearest(D.scenes[st.scene], [st.x, st.y]);
  if (!st.seated) [st.x, st.y] = safe;
  document.body.classList.toggle('low-motion', st.lowMotion);
  renderHud();
  renderScene();
  if (st.activeAction) playExecution();
  if (!st.username && !rawSaveProblem) onboard();
  if (rawSaveProblem)
    toast('Dữ liệu demo bị lỗi. Hãy mở Khác để tải bản sao; bản gốc chưa bị ghi đè.');
  if (window.innerWidth < 650) {
    setTimeout(() => cameraTo(st.x, st.y), 40);
  }
  if (O.available) {
    O.open = async (type) => {
      openWindow(
        type === 'chat'
          ? 'Chat cộng đồng'
          : type === 'resident'
            ? 'Cư dân giáo xứ'
            : 'Noel & album',
        'Tài khoản lưu trên máy chủ',
        '<div id="onlinePanel"></div>',
        [['Đóng', closeModal, 'secondary']],
        true,
      );
      try {
        await O.panel(type, $('onlinePanel'));
      } catch (e) {
        toast(e.message);
      }
    };
    O.mount();
    window.addEventListener('parish:catalog', () => {
      renderHud();
      renderScene();
      if ($('shopPreview')) {
        openShop(shopSlot);
        toast('Nội dung cửa hàng đã cập nhật.');
      }
    });
    window.addEventListener('parish:server-state', (event) => {
      if (!O.active || event.detail.stateVersion < st.stateVersion) return;
      const previousScene = st.scene;
      st = structuredClone(event.detail);
      activityBusy = !!st.activeAction;
      renderHud();
      if (st.scene !== previousScene) {
        movement++;
        renderScene();
        cameraTo(st.x);
      } else if (!moving) showPlayer();
      renderCooldowns();
      refreshMarkers();
      if (st.activeAction) playExecution();
    });
  }
})();
