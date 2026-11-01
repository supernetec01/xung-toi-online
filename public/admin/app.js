(async () => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let session,
    tab = 'dashboard',
    catalogData = null,
    draftEdit = null,
    refreshTimer = null;
  const errors = (e) => {
    $('error').textContent = e.message || String(e);
  };
  const h = (tag, text, attrs = {}) => {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const button = (label, fn, kind = '') => {
    const b = h('button', label, { type: 'button', class: kind });
    b.onclick = async () => {
      b.disabled = true;
      $('error').textContent = '';
      try {
        await fn();
      } catch (e) {
        errors(e);
      } finally {
        b.disabled = false;
      }
    };
    return b;
  };
  const card = (title) => {
    const c = h('section', null, { class: 'card' });
    if (title) c.append(h('h2', title));
    return c;
  };
  function field(parent, label, value = '', type = 'text', choices) {
    const l = h('label'),
      i = choices ? h('select') : h(type === 'textarea' ? 'textarea' : 'input');
    if (!choices && type !== 'textarea') i.type = type;
    if (choices)
      for (const x of choices) {
        const o = h('option', typeof x === 'string' ? x : x[1]);
        o.value = typeof x === 'string' ? x : x[0];
        i.append(o);
      }
    i.value = value;
    l.append(h('span', label), i);
    parent.append(l);
    return i;
  }
  function table(headers, rows) {
    const wrap = h('div', null, { class: 'table-scroll' }),
      t = h('table'),
      head = h('tr');
    for (const label of headers) head.append(h('th', label));
    t.append(head);
    for (const row of rows) {
      const tr = h('tr');
      for (const value of row) {
        const td = h('td');
        if (Array.isArray(value)) td.append(...value);
        else if (value instanceof Node) td.append(value);
        else td.textContent = value === undefined ? '' : String(value);
        tr.append(td);
      }
      t.append(tr);
    }
    wrap.append(t);
    return wrap;
  }
  async function api(url, data, method, extra = {}) {
    const r = await fetch(url, {
      method: method || (data ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.csrfToken,
        'Idempotency-Key': crypto.randomUUID(),
        ...extra,
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.message || b.code);
    return b;
  }
  function reason() {
    const r = prompt('Lý do thao tác (ít nhất 3 ký tự):');
    if (!r || r.trim().length < 3) throw Error('Chưa nhập lý do hợp lệ.');
    return r.trim();
  }
  async function refresh() {
    await show(tab);
  }
  async function show(which) {
    clearInterval(refreshTimer);
    tab = which;
    $('error').textContent = '';
    for (const b of $('nav').children) b.classList.toggle('active', b.dataset.tab === tab);
    const root = $('content');
    root.replaceChildren(h('p', 'Đang tải...'));
    try {
      if (tab === 'dashboard') {
        const data = await api('/api/admin/dashboard');
        root.replaceChildren();
        const cards = h('div', null, { class: 'cards' });
        for (const [key, label] of [
          ['realOnlineUnique', 'Người chơi thực'],
          ['ambientNpcActive', 'NPC cư dân nền'],
          ['fixedNpcActive', 'NPC chức năng'],
          ['liveGuestVisible', 'Khách LIVE'],
        ]) {
          const c = h('div', null, { class: 'metric' });
          c.append(h('small', label), h('b', data[key]), h('small', 'Chỉ Admin · số liệu server'));
          cards.append(c);
        }
        root.append(cards);
        const c = card('Hiện diện theo khu vực');
        c.append(
          h('p', 'Mỗi tài khoản được tính một người, kể cả khi mở nhiều tab.', { class: 'muted' }),
          table(
            ['Khu vực', 'Người thật', 'NPC nền', 'NPC chức năng', 'Khách LIVE'],
            Object.entries(data.countsByScene).map(([id, s]) => [
              id,
              s.realOnlineUnique,
              s.ambientNpcActive,
              s.fixedNpcActive,
              s.liveGuestVisible,
            ]),
          ),
          button('Cập nhật', refresh),
        );
        root.append(c);
        refreshTimer = setInterval(() => show('dashboard'), 10000);
      } else if (tab === 'users') {
        root.replaceChildren();
        const search = card('Tìm người chơi'),
          query = field(search, 'Tài khoản hoặc tên nhân vật');
        query.id = 'userSearch';
        const results = h('div');
        async function load(cursor) {
          const d = await api(
            '/api/admin/users?search=' +
              encodeURIComponent(query.value) +
              (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
          );
          results.replaceChildren(
            table(
              ['Tên / tài khoản', 'Quyền', 'Xu', 'Thao tác'],
              d.users.map((u) => [
                u.display_name + ' / ' + u.login,
                u.roles.join(', '),
                u.coins,
                button('Chi tiết', () => userDetail(u.id, root)),
              ]),
            ),
          );
          if (d.nextCursor) results.append(button('Trang tiếp theo', () => load(d.nextCursor)));
        }
        search.append(
          button('Tìm kiếm', () => load()),
          results,
        );
        root.append(search);
        await load();
      } else if (tab === 'catalog') {
        catalogData = await api('/api/admin/catalog');
        root.replaceChildren();
        const c = card('Shop & tủ đồ · phiên bản ' + catalogData.catalog.version);
        c.append(
          table(
            ['Món đồ', 'Slot', 'Giá Xu', 'Trạng thái', 'Thao tác'],
            catalogData.catalog.items.map((i) => [
              i.name,
              i.slot,
              i.price,
              i.archived ? 'Ngừng bán' : 'Đang bán',
              button('Sửa / xem thử', () => itemForm(root, i)),
            ]),
          ),
          button('Thêm trang phục', () =>
            itemForm(root, {
              id: '',
              name: '',
              slot: 'top',
              price: 100,
              color: '#7c9cc1',
              icon: '👕',
            }),
          ),
        );
        root.append(c);
        renderDrafts(root);
      } else if (tab === 'content') {
        catalogData = await api('/api/admin/catalog');
        root.replaceChildren();
        const box = card('Nội dung động · NPC, nhiệm vụ, hành động, sự kiện');
        const kind = field(box, 'Loại nội dung', 'npc', 'text', [
            'npc',
            'quest',
            'action',
            'event',
          ]),
          id = field(box, 'ID ổn định', 'lucia'),
          data = field(box, 'JSON bản nháp', '', 'textarea');
        function fill() {
          const c = catalogData.catalog;
          let value;
          if (kind.value === 'npc') value = c.npcs[id.value] || {};
          else if (kind.value === 'event')
            value = c.event || {
              title: 'Noel An Hòa',
              enabled: true,
              startsAt: null,
              endsAt: null,
            };
          else
            value =
              c[{ quest: 'quests', action: 'actions' }[kind.value]].find(
                (x) => x.id === id.value,
              ) || {};
          data.value = JSON.stringify(value, null, 2);
        }
        kind.onchange = () => {
          id.value = { npc: 'lucia', quest: 'q_welcome', action: 'sweep', event: 'noel' }[
            kind.value
          ];
          fill();
        };
        id.onchange = fill;
        fill();
        box.append(
          h(
            'p',
            'ID, liên kết quest, giá/thưởng và cooldown sẽ được kiểm tra trên server. Không xuất bản trực tiếp từ trình duyệt.',
            { class: 'hint' },
          ),
          button('Lưu bản nháp', async () => {
            await api('/api/admin/catalog/drafts', {
              kind: kind.value,
              stableId: id.value,
              payload: JSON.parse(data.value),
              reason: reason(),
            });
            await refresh();
          }),
        );
        root.append(box);
        renderDrafts(root);
      } else if (tab === 'chat') {
        const data = await api('/api/admin/chat/reports');
        root.replaceChildren();
        if (session.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
          const box = card('Cấu hình & thông báo cộng đồng'),
            settings = await api('/api/admin/chat/settings');
          box.append(
            button(settings.enabled ? 'Tạm tắt gửi chat' : 'Bật gửi chat', async () => {
              await api(
                '/api/admin/chat/settings',
                { enabled: !settings.enabled, reason: reason() },
                'PUT',
              );
              await refresh();
            }),
          );
          const notice = field(box, 'Thông báo hệ thống', '', 'textarea');
          box.append(
            button('Đăng thông báo', async () => {
              await api('/api/admin/chat/notices', { body: notice.value, reason: reason() });
              await refresh();
            }),
          );
          root.append(box);
        }
        const c = card('Tin nhắn & kiểm duyệt');
        c.append(
          table(
            ['Người gửi', 'Kênh / trạng thái', 'Nội dung (text)', 'Thao tác'],
            data.messages.map((m) => [
              m.display_name,
              m.room + ' / ' + m.status,
              m.body,
              [
                button('Ẩn', async () => {
                  await api('/api/admin/chat/messages/' + m.id + '/hide', { reason: reason() });
                  await refresh();
                }),
                button('Cấm chat', () => sanctionForm(root, m.user_id)),
                ...(m.status === 'held' || m.status === 'hidden'
                  ? [
                      button('Cho phép', async () => {
                        await api('/api/admin/chat/messages/' + m.id + '/approve', {
                          reason: reason(),
                        });
                        await refresh();
                      }),
                    ]
                  : []),
              ],
            ]),
          ),
        );
        root.append(c);
        const reports = card('Báo cáo');
        reports.append(
          table(
            ['ID / tin', 'Lý do', 'Trạng thái', 'Xử lý'],
            data.reports.map((r) => [
              r.id + ' / ' + r.message_id,
              r.reason,
              r.status,
              [
                button('Bỏ qua', async () => {
                  await api('/api/admin/chat/reports/' + r.id + '/resolve', {
                    status: 'dismissed',
                    reason: reason(),
                  });
                  await refresh();
                }),
                button('Đã xử lý', async () => {
                  await api('/api/admin/chat/reports/' + r.id + '/resolve', {
                    status: 'resolved',
                    reason: reason(),
                  });
                  await refresh();
                }),
              ],
            ]),
          ),
        );
        root.append(reports);
        const appeals = card('Khiếu nại');
        appeals.append(
          table(
            ['Tài khoản', 'Nội dung', 'Trạng thái', 'Xử lý'],
            data.appeals.map((a) => [
              a.user_id,
              a.body,
              a.status,
              [
                button('Chấp nhận / bỏ cấm', async () => {
                  await api('/api/admin/chat/appeals/' + a.id + '/resolve', {
                    status: 'accepted',
                    reason: reason(),
                  });
                  await refresh();
                }),
                button('Từ chối có lý do', async () => {
                  await api('/api/admin/chat/appeals/' + a.id + '/resolve', {
                    status: 'rejected',
                    reason: reason(),
                  });
                  await refresh();
                }),
              ],
            ]),
          ),
        );
        root.append(appeals);
      } else if (tab === 'world') {
        const settings = await api('/api/admin/ambient-configs');
        root.replaceChildren();
        const c = card('Cư dân mô phỏng · version ' + settings.version),
          scene = field(c, 'Phạm vi', 'all', 'text', [
            'all',
            'courtyard',
            'nave',
            'foyer',
            'baptistry',
            'confession',
            'classroom',
            'garden',
            'office',
            'choir',
            'christmas',
            'shoproom',
          ]),
          target = field(c, 'Mục tiêu nhân vật nhìn thấy', settings.targetVisualActors, 'number'),
          max = field(c, 'NPC nền tối đa', settings.ambientMax, 'number'),
          cap = field(c, 'Render cap', settings.renderCap, 'number'),
          waypoints = field(c, 'Waypoints JSON (khi chọn khu vực)', '[]', 'textarea'),
          schedules = field(c, 'Lịch JSON: fromHour / toHour / pose', '[]', 'textarea');
        scene.onchange = () => {
          const cfg = settings.scenes?.[scene.value] || settings;
          target.value = cfg.targetVisualActors;
          max.value = cfg.ambientMax;
          cap.value = cfg.renderCap;
          waypoints.value = JSON.stringify(cfg.waypoints || []);
          schedules.value = JSON.stringify(cfg.schedules || []);
        };
        c.append(
          h(
            'p',
            'Chỉ NPC nền rút dần khi người thật đến. NPC giao nhiệm vụ không bị xóa; dữ liệu thống kê không gửi ra public.',
            { class: 'muted' },
          ),
          button('Lưu phiên bản cấu hình', async () => {
            await api(
              '/api/admin/ambient-configs',
              {
                targetVisualActors: Number(target.value),
                ambientMax: Number(max.value),
                renderCap: Number(cap.value),
                ...(scene.value !== 'all'
                  ? {
                      sceneId: scene.value,
                      waypoints: JSON.parse(waypoints.value),
                      schedules: JSON.parse(schedules.value),
                    }
                  : {}),
                reason: reason(),
              },
              'PUT',
              { 'If-Match': String(settings.version) },
            );
            await refresh();
          }),
        );
        root.append(c);
        const history = card('Lịch sử / rollback');
        history.append(
          table(
            ['Version', 'Lý do', 'Thao tác'],
            settings.history.map((v) => [
              v.version,
              v.reason,
              button('Khôi phục', async () => {
                await api(
                  '/api/admin/ambient-configs/rollback',
                  { version: v.version, reason: reason() },
                  'POST',
                  { 'If-Match': String(settings.version) },
                );
                await refresh();
              }),
            ]),
          ),
        );
        root.append(history);
      } else if (tab === 'live') {
        const status = await api('/api/admin/live/health');
        root.replaceChildren();
        const split = h('div', null, { class: 'split' }),
          c = card('TikTok LIVE Simulator · MOCK');
        c.append(
          h(
            'p',
            'Không kết nối tài khoản TikTok thật. Khách chỉ thực hiện một động tác, không có ví hoặc chat.',
            { class: 'muted' },
          ),
          h(
            'p',
            status.running
              ? 'ĐANG CHẠY · ' + status.visible + ' khách · ' + status.queue + ' trong hàng chờ'
              : 'Đã dừng',
            { class: 'badge' },
          ),
        );
        const scene = field(c, 'Cảnh', status.settings?.sceneId || 'courtyard', 'text', [
            'courtyard',
            'garden',
            'christmas',
          ]),
          keyword = field(c, 'Một từ khóa đang hoạt động', 'NOEL'),
          action = field(c, 'Động tác', 'wave', 'text', ['wave', 'water', 'decorate', 'carry']);
        c.append(
          button('Bắt đầu phiên giả lập', async () => {
            await api('/api/admin/live/start', {
              sceneId: scene.value,
              keyword: keyword.value,
              action: action.value,
              maxVisibleGuests: 20,
              queueMax: 100,
              reason: reason(),
            });
            await refresh();
          }),
          button(
            'Dừng khẩn cấp & dọn khách',
            async () => {
              await api('/api/admin/live/stop', { reason: reason() });
              await refresh();
            },
            'danger',
          ),
        );
        const sim = card('Gửi bình luận thử');
        const name = field(sim, 'Tên hiển thị', 'Khách An Hòa'),
          comment = field(sim, 'Bình luận', status.settings?.keyword || 'NOEL');
        sim.append(
          button('Giả lập một bình luận', async () => {
            await api('/api/admin/live/simulate-comment', {
              eventId: crypto.randomUUID(),
              viewerKey: crypto.randomUUID(),
              displayName: name.value,
              text: comment.value,
            });
            await refresh();
          }),
        );
        const preview = card('Camera 9:16');
        const frame = h('div', null, { class: 'camera' });
        async function drawLive() {
          if (!frame.isConnected) return;
          try {
            const [d, health] = await Promise.all([
              api('/api/admin/live/preview?scene=' + encodeURIComponent(scene.value)),
              api('/api/admin/live/health'),
            ]);
            const badge = c.querySelector('.badge');
            if (badge)
              badge.textContent = health.running
                ? 'ĐANG CHẠY · ' + health.visible + ' khách · ' + health.queue + ' trong hàng chờ'
                : 'Đã dừng';
            if (!frame.isConnected) return;
            const world = h('div', null, { class: 'camera-world' });
            world.style.width = Math.round((frame.clientHeight * 1200) / 720) + 'px';
            world.innerHTML = window.PARISH_ART.scene(d.sceneId);
            for (const actor of d.actors) {
              const el = h('div', null, { class: 'camera-avatar' });
              el.style.left = actor.position[0] + '%';
              el.style.top = actor.position[1] + '%';
              el.innerHTML = window.PARISH_ART.avatar({ ...actor.visual, pose: actor.pose });
              el.append(h('small', actor.displayName));
              world.append(el);
            }
            frame.replaceChildren(world, h('strong', 'Xem trước LIVE · ' + d.sceneId));
          } catch (e) {
            errors(e);
          }
        }
        scene.onchange = drawLive;
        refreshTimer = setInterval(drawLive, 1000);
        preview.append(
          frame,
          h('a', 'Mở game với camera LIVE', {
            href: '/?camera=live',
            target: '_blank',
            rel: 'noopener',
          }),
        );
        split.append(c, preview);
        root.append(split, sim);
        await drawLive();
      } else if (tab === 'audit') {
        const data = await api('/api/admin/audit');
        root.replaceChildren();
        const c = card('Nhật ký bất biến');
        c.append(
          table(
            ['Thời gian', 'Actor', 'Thao tác', 'Lý do', 'Chi tiết'],
            data.events.map((e) => [
              new Date(e.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
              e.actor_id,
              e.action + ' / ' + e.target,
              e.reason,
              JSON.stringify(e.details),
            ]),
          ),
        );
        root.append(c);
      }
      $('title').textContent = labels[which] || which;
    } catch (e) {
      root.replaceChildren();
      errors(e);
    }
  }
  function renderDrafts(root) {
    const c = card('Bản nháp & xuất bản');
    c.append(
      table(
        ['Loại / ID', 'Version', 'Trạng thái', 'Thao tác'],
        catalogData.drafts.map((d) => [
          d.kind + ' / ' + d.stable_id,
          d.version,
          d.status,
          [
            button('Xem / sửa JSON', () => {
              const box = card('Sửa nháp ' + d.stable_id),
                input = field(box, 'Payload', JSON.stringify(d.payload, null, 2), 'textarea');
              box.append(
                button('Lưu với kiểm tra version', async () => {
                  await api(
                    '/api/admin/catalog/drafts/' + d.id,
                    { payload: JSON.parse(input.value), reason: reason() },
                    'PATCH',
                    { 'If-Match': String(d.version) },
                  );
                  await refresh();
                }),
              );
              root.prepend(box);
            }),
            ...(session.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r)) &&
            d.status === 'draft'
              ? [
                  button('Xuất bản', async () => {
                    await api(
                      '/api/admin/catalog/drafts/' + d.id + '/publish',
                      { reason: reason() },
                      'POST',
                      { 'If-Match': String(d.version) },
                    );
                    await refresh();
                  }),
                ]
              : []),
          ],
        ]),
      ),
    );
    root.append(c);
    if (session.user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
      const history = card('Phiên bản catalog / rollback');
      history.append(
        table(
          ['Version', 'Lý do', 'Khôi phục'],
          catalogData.publications.map((p) => [
            p.version,
            p.reason,
            button('Rollback nội dung', async () => {
              if (
                !confirm('Khôi phục nội dung phiên bản này? Ví Xu và quyền sở hữu sẽ giữ nguyên.')
              )
                return;
              await api('/api/admin/catalog/publications/' + p.version + '/rollback', {
                reason: reason(),
              });
              await refresh();
            }),
          ]),
        ),
      );
      root.append(history);
    }
  }
  function itemForm(root, item) {
    const box = card(item.id ? 'Sửa ' + item.name : 'Trang phục mới'),
      row = h('div', null, { class: 'split' }),
      form = h('div'),
      preview = h('div', null, { class: 'preview' });
    const id = field(form, 'ID ổn định', item.id),
      name = field(form, 'Tên trang phục', item.name),
      slot = field(form, 'Slot', item.slot, 'text', ['top', 'bottom', 'shoes', 'hair', 'acc']),
      price = field(form, 'Giá Xu', item.price, 'number'),
      color = field(form, 'Màu', item.color, 'color'),
      icon = field(form, 'Icon', item.icon),
      archived = field(form, 'Trạng thái', item.archived ? 'true' : 'false', 'text', [
        ['false', 'Đang bán'],
        ['true', 'Ngừng bán (giữ quyền đã mua)'],
      ]),
      gender = field(form, 'Preview dáng', 'female', 'text', ['female', 'male']),
      direction = field(form, 'Hướng xem thử', 'down', 'text', window.PARISH_ART.directions),
      pose = field(form, 'Tư thế xem thử', 'idle', 'text', window.PARISH_ART.poses),
      compatibility = field(
        form,
        'Dáng tương thích',
        item.rigCompatibility?.length === 1 ? item.rigCompatibility[0] : 'unisex',
        'text',
        ['unisex', 'male', 'female'],
      ),
      atlas = field(
        form,
        'Atlas JSON (bỏ trống để dùng rig SVG)',
        item.assets ? JSON.stringify(item.assets, null, 2) : '',
        'textarea',
      );
    const draw = () => {
      const person = {
        gender: gender.value,
        top: '#f4ede0',
        bottom: '#465b75',
        hair: '#543932',
        shoes: '#6a443e',
        acc: 'acc_none',
      };
      person[slot.value] = color.value;
      person.direction = direction.value;
      person.pose = pose.value;
      if (atlas.value.trim())
        person.assets = [JSON.parse(atlas.value)[gender.value]].filter(Boolean);
      preview.innerHTML = window.PARISH_ART.avatar(person);
    };
    color.oninput = draw;
    slot.onchange = draw;
    gender.onchange = draw;
    direction.onchange = pose.onchange = () => {
      try {
        draw();
      } catch (e) {
        errors(e);
      }
    };
    atlas.onchange = () => {
      try {
        draw();
      } catch (e) {
        errors(e);
      }
    };
    draw();
    let thumbnail = item.thumbnail;
    const file = field(form, 'Thumbnail / atlas PNG/WebP ≤ 2MB', '', 'file');
    file.accept = 'image/png,image/webp';
    form.append(
      button('Tải ảnh và lấy URL', async () => {
        const selected = file.files[0];
        if (!selected || selected.size > 2 * 1024 * 1024)
          throw Error('Chọn ảnh PNG/WebP không quá 2MB.');
        const bytes = new Uint8Array(await selected.arrayBuffer());
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        const data = await api('/api/admin/assets', { data: btoa(binary), reason: reason() });
        thumbnail = data.url;
        file.after(h('p', 'Đã lưu ảnh: ' + data.url + ' · ' + data.width + '×' + data.height));
      }),
      button('Lưu thành bản nháp', async () => {
        const payload = {
          ...item,
          id: id.value,
          name: name.value,
          slot: slot.value,
          price: Number(price.value),
          color: color.value,
          icon: icon.value,
          archived: archived.value === 'true',
          rigCompatibility:
            compatibility.value === 'unisex' ? ['male', 'female'] : [compatibility.value],
          ...(atlas.value.trim()
            ? { assets: JSON.parse(atlas.value), spriteVersion: (item.spriteVersion || 0) + 1 }
            : { assets: null }),
          ...(thumbnail ? { thumbnail } : {}),
        };
        await api('/api/admin/catalog/drafts', {
          kind: 'item',
          stableId: id.value,
          payload,
          reason: reason(),
        });
        await refresh();
      }),
    );
    row.append(form, preview);
    box.append(row);
    root.prepend(box);
    box.scrollIntoView({ behavior: 'smooth' });
  }
  async function userDetail(id, root) {
    const data = await api('/api/admin/users/' + id),
      box = card(data.display_name + ' · ' + data.login);
    box.append(
      h('p', 'Quyền: ' + data.roles.join(', ')),
      h('p', 'Số dư: ' + data.state.coins + ' Xu (read-only)'),
      table(
        ['Nguồn', 'Thay đổi', 'Sau giao dịch', 'Thời điểm'],
        data.ledger.map((l) => [
          l.source_type,
          l.delta,
          l.balance,
          new Date(l.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ]),
      ),
      button('Cấm chat / khóa tài khoản', () => sanctionForm(root, id, true)),
      button('Thu hồi mọi phiên', async () => {
        await api('/api/admin/users/' + id + '/sessions/revoke', { reason: reason() });
        await userDetail(id, root);
      }),
    );
    for (const s of data.sanctions)
      if (!s.revoked_at)
        box.append(
          h(
            'p',
            s.scope +
              ' · ' +
              s.reason +
              ' · đến ' +
              new Date(s.ends_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
          ),
          button('Gỡ chế tài', async () => {
            await api('/api/admin/sanctions/' + s.id, { reason: reason() }, 'DELETE');
            await userDetail(id, root);
          }),
        );
    const delta = field(box, 'Bồi hoàn / điều chỉnh qua ledger (tối đa ±1000)', 0, 'number');
    box.append(
      button('Ghi giao dịch điều chỉnh', async () => {
        await api('/api/admin/coin-adjustments', {
          userId: id,
          delta: Number(delta.value),
          reason: reason(),
        });
        await userDetail(id, root);
      }),
    );
    if (session.user.roles.includes('SUPER_ADMIN')) {
      const role = field(box, 'Cấp quyền (target phải có MFA)', data.roles.at(-1), 'text', [
        'PLAYER',
        'MODERATOR',
        'CONTENT_EDITOR',
        'ADMIN',
        'SUPER_ADMIN',
      ]);
      box.append(
        button('Đổi quyền với MFA gần đây', async () => {
          await api('/api/admin/users/' + id + '/roles', { roles: [role.value], reason: reason() });
          await userDetail(id, root);
        }),
      );
    }
    const details = h('details');
    details.append(
      h('summary', 'Inventory / quest / appearance'),
      h('pre', JSON.stringify(data.state, null, 2)),
    );
    box.append(details);
    root.prepend(box);
  }
  function sanctionForm(root, id, admin = false) {
    const box = card('Áp dụng chế tài'),
      scope = field(box, 'Phạm vi', 'CHAT', 'text', admin ? ['CHAT', 'ACCOUNT'] : ['CHAT']),
      duration = field(box, 'Thời hạn (giây)', 3600, 'number'),
      why = field(box, 'Lý do');
    box.append(
      button('Xác nhận', async () => {
        await api('/api/admin/users/' + id + '/sanctions', {
          scope: scope.value,
          durationSeconds: Number(duration.value),
          reason: why.value,
        });
        await refresh();
      }),
    );
    root.prepend(box);
  }
  const labels = {
    dashboard: 'Tổng quan',
    users: 'Người chơi',
    catalog: 'Shop & tủ đồ',
    content: 'NPC & nhiệm vụ',
    chat: 'Chat & vi phạm',
    world: 'Cư dân & khu vực',
    live: 'TikTok LIVE Studio',
    audit: 'Nhật ký',
  };
  try {
    const r = await fetch('/api/auth/me');
    if (!r.ok) {
      location.href = '/account';
      return;
    }
    session = await r.json();
    $('identity').textContent = session.user.displayName + ' · ' + session.user.roles.join(', ');
    const roles = session.user.roles,
      isAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));
    const allowed = isAdmin
      ? Object.keys(labels)
      : roles.includes('CONTENT_EDITOR')
        ? ['catalog', 'content']
        : ['chat'];
    for (const id of allowed) {
      const b = button(labels[id], () => show(id));
      b.dataset.tab = id;
      $('nav').append(b);
    }
    await show(allowed[0]);
  } catch (e) {
    errors(e);
  }
})();
