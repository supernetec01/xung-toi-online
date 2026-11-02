/* V10 Studio UI over the existing V4 state, items and server transactions. */
(() => {
  'use strict';
  const labels = { hair: 'Tóc', top: 'Áo', bottom: 'Quần / váy', shoes: 'Giày', acc: 'Phụ kiện' },
    directions = { down: '↓ Trước', up: '↑ Sau', left: '← Trái', right: '→ Phải' },
    poses = {
      idle: 'Đứng',
      walk: 'Đi',
      sit_back: 'Ngồi',
      kneel: 'Quỳ',
      pray: 'Chắp tay',
      wave: 'Vẫy tay',
      read: 'Đọc sách',
    },
    hairs = {
      auto: 'Theo dáng người',
      short: 'Ngắn',
      side: 'Rẽ mái',
      bob: 'Bob',
      pony: 'Buộc cao',
      wave: 'Gợn sóng',
      curl: 'Xoăn',
    };
  window.PARISH_AVATAR_STUDIO = {
    open(o) {
      const A = window.PARISH_ART;
      let direction = 'down',
        pose = 'idle',
        slot = 'top',
        mode = 'owned',
        preview = null,
        busy = false;
      function draw() {
        const state = o.state(),
          catalog = o.catalog(),
          equipped = { ...state.equipped },
          item = catalog.items.find((i) => i.id === preview);
        if (item) equipped[item.slot] = item.id;
        const owned = (id) => state.inventory.includes(id),
          all = catalog.items.filter(
            (i) =>
              i.slot === slot && (!i.archived || owned(i.id)) && (mode === 'shop' || owned(i.id)),
          ),
          btn = (text, attrs, active) =>
            `<button class="btn small ${active ? '' : 'secondary'}" ${attrs} aria-pressed="${active}">${text}</button>`,
          cards = all
            .map(
              (i) =>
                `<button class="studio-item ${state.equipped[i.slot] === i.id ? 'equipped' : ''} ${preview === i.id ? 'previewing' : ''}" data-studio-item="${i.id}"><span class="studio-swatch" style="background:${i.color}">${A.esc(i.icon)}</span><b>${A.esc(i.name)}</b><small>${state.equipped[i.slot] === i.id ? '✓ Đang mặc' : owned(i.id) ? 'Đã sở hữu' : i.price + ' Xu'}</small></button>`,
            )
            .join('');
        const selection = item
          ? `<div class="studio-selection" aria-live="polite">Đang thử: <b>${A.esc(item.name)}</b> · ${owned(item.id) ? 'Đã sở hữu' : item.price + ' Xu'} <button class="btn" data-studio-confirm>${owned(item.id) ? 'Mặc ngay' : 'Mua trang phục'}</button></div>`
          : '<p class="helper">Chạm một món đồ để thử. Thử đồ không trừ Xu.</p>';
        o.window(
          'Avatar Studio',
          'Ngoại hình và trang phục',
          `<div class="studio-layout"><section class="studio-preview"><div class="studio-arch"><div class="studio-hero" id="studioHero">${A.avatar({ ...o.dressed(equipped), direction, pose })}</div><span class="studio-name">${A.esc(state.username)}</span></div><div class="studio-row" aria-label="Hướng xem trước">${Object.entries(
            directions,
          )
            .map(([k, v]) => btn(v, `data-studio-direction="${k}"`, k === direction))
            .join('')}</div><div class="studio-row" aria-label="Tư thế xem trước">${Object.entries(
            poses,
          )
            .map(([k, v]) => btn(v, `data-studio-pose="${k}"`, k === pose))
            .join(
              '',
            )}</div><p class="helper">Hướng và tư thế chỉ để xem thử.</p></section><section class="studio-controls"><h3>Chọn dáng nhân vật</h3><div class="gender-select">${btn('👦 Nam', 'data-gender="male"', state.gender === 'male')}${btn('👧 Nữ', 'data-gender="female"', state.gender === 'female')}</div><h3>Màu da</h3><div class="studio-row">${Object.values(
            PARISH_AVATAR_V10.SKINS,
          )
            .map(
              (s) =>
                `<button class="studio-skin" data-color="${s.main}" style="background:${s.main}" aria-label="Da ${s.label}" aria-pressed="${state.skin === s.main}" title="${s.label}">${state.skin === s.main ? '✓' : ''}</button>`,
            )
            .join('')}</div><h3>Kiểu tóc</h3><div class="studio-row">${Object.entries(hairs)
            .map(([k, v]) => btn(v, `data-studio-hair="${k}"`, k === (state.hairStyle || 'auto')))
            .join(
              '',
            )}</div><div class="studio-closet-title"><h3>Trang phục</h3><div class="studio-row">${btn('Tủ đồ', 'data-studio-mode="owned"', mode === 'owned')}${btn('Cửa hàng', 'data-studio-mode="shop"', mode === 'shop')}</div></div><div class="studio-row">${Object.entries(
            labels,
          )
            .map(([k, v]) => btn(v, `data-studio-slot="${k}"`, k === slot))
            .join(
              '',
            )}</div><div class="studio-items">${cards || '<p>Chưa có vật phẩm trong nhóm này.</p>'}</div>${selection}<p class="helper" id="studioStatus" aria-live="polite">Ngoại hình được lưu khi bạn thay đổi. Đồ mua vẫn được giữ khi đổi Nam/Nữ.</p></section></div>`,
          [['Hoàn tất', o.close, 'primary']],
          true,
        );
        const bind = (sel, fn) =>
          document.querySelectorAll('.window ' + sel).forEach((b) => (b.onclick = () => fn(b)));
        const trait = async (patch) => {
          if (busy) return;
          busy = true;
          const version = o.state().appearanceVersion || 0;
          await o.commit({ ...patch, appearanceVersion: version });
          busy = false;
          preview = null;
          draw();
        };
        bind('[data-gender]', (b) => trait({ gender: b.dataset.gender }));
        bind('[data-color]', (b) => trait({ skin: b.dataset.color }));
        bind('[data-studio-hair]', (b) => trait({ hairStyle: b.dataset.studioHair }));
        bind('[data-studio-direction]', (b) => {
          direction = b.dataset.studioDirection;
          draw();
        });
        bind('[data-studio-pose]', (b) => {
          pose = b.dataset.studioPose;
          draw();
        });
        bind('[data-studio-slot]', (b) => {
          slot = b.dataset.studioSlot;
          preview = null;
          draw();
        });
        bind('[data-studio-mode]', (b) => {
          mode = b.dataset.studioMode;
          preview = null;
          draw();
        });
        bind('[data-studio-item]', (b) => {
          preview = b.dataset.studioItem;
          draw();
        });
        bind('[data-studio-confirm]', async () => {
          if (busy || !item) return;
          const wear = async () => {
            if (busy) return;
            busy = true;
            await o.wear(item.id);
            busy = false;
            preview = null;
            draw();
          };
          if (owned(item.id)) return wear();
          o.window(
            'Xác nhận mua',
            item.name,
            `<p>Mua <b>${A.esc(item.name)}</b> với <b>${item.price} Xu</b>?</p><p>Chỉ trừ Xu sau khi mua thành công.</p>`,
            [
              ['Mua và mặc', wear, 'primary'],
              ['Quay lại', draw, 'secondary'],
            ],
          );
        });
      }
      draw();
    },
  };
})();
