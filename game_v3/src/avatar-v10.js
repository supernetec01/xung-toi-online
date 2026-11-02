/* Adapted from the supplied V10 renderer. Rendering only: no demo wallet/shop/store. */
(function (root) {
  'use strict';
  const SKINS = {
    porcelain: { label: 'Sáng', main: '#f5c7a4', dark: '#d99572', light: '#ffe4c7' },
    peach: { label: 'Ấm', main: '#edb38a', dark: '#ca865f', light: '#ffdab4' },
    tan: { label: 'Nâu sáng', main: '#cd946c', dark: '#a96b49', light: '#eab48c' },
    brown: { label: 'Nâu', main: '#aa7455', dark: '#825035', light: '#c89270' },
    deep: { label: 'Nâu đậm', main: '#76513f', dark: '#583a2d', light: '#9b7057' },
  };
  const HAIR_COLORS = {
    espresso: '#382826',
    chestnut: '#70402d',
    auburn: '#a55432',
    honey: '#bc8552',
    black: '#22242b',
    silver: '#9998a0',
  };

  const HAIR_STYLES = ['auto', 'short', 'side', 'bob', 'pony', 'wave', 'curl'];
  const paint = (v, f) => (/^#[a-f0-9]{6}$/i.test(v || '') ? v : f);
  const shade = (hex, delta) =>
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + delta))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  const palette = (hex) =>
    Object.values(SKINS).find((s) => s.main === hex) || {
      main: hex,
      dark: shade(hex, -30),
      light: shade(hex, 24),
    };
  function normalize(s = {}) {
    const female = s.gender !== 'male';
    return {
      gender: female ? 'female' : 'male',
      skin: paint(s.skin, '#f7cfac'),
      hair: paint(s.hair, '#543932'),
      top: paint(s.top, '#f5e6cf'),
      bottom: paint(s.bottom, '#465b75'),
      shoes: paint(s.shoes, '#6a443e'),
      direction: ['front', 'back', 'left', 'right'].includes(s.direction) ? s.direction : 'front',
      pose: ['idle', 'walk', 'sit', 'kneel', 'pray', 'wave', 'bow', 'interact'].includes(s.pose)
        ? s.pose
        : 'idle',
      hairStyle:
        HAIR_STYLES.includes(s.hairStyle) && s.hairStyle !== 'auto'
          ? s.hairStyle
          : female
            ? 'bob'
            : 'short',
      topKind: ['shirt', 'jacket', 'sweater', 'aodai'].includes(s.topKind) ? s.topKind : 'shirt',
      bottomKind: ['pants', 'skirt', 'long-skirt'].includes(s.bottomKind)
        ? s.bottomKind
        : female
          ? 'skirt'
          : 'pants',
      acc: ['none', 'bow', 'scarf', 'glasses'].includes(s.acc) ? s.acc : 'none',
    };
  }
  function renderAvatar(raw, opts = {}) {
    const s = normalize(raw),
      skin = palette(s.skin),
      hair = s.hair,
      gender = s.gender,
      dir = s.direction,
      pose = s.pose,
      side = dir === 'left' || dir === 'right';
    const top = { color: s.top, trim: shade(s.top, -24), kind: s.topKind },
      bottom = { color: s.bottom, kind: s.bottomKind },
      shoes = { color: s.shoes },
      hairstyle = s.hairStyle,
      acc = s.acc;
    const uid = 'av' + String(opts.id || 'main').replace(/[^a-zA-Z0-9_-]/g, '');
    const topColor = top.color,
      bottomColor = bottom.color,
      shoeColor = shoes.color;
    const female = gender === 'female',
      xx = side ? 10 : 0,
      mirror = dir === 'left' ? 'translate(320 0) scale(-1 1)' : '';
    const bodyOffset = pose === 'sit' ? 24 : pose === 'kneel' ? 30 : 0;
    const outline = '#553e38';
    const back = dir === 'back';
    let face = back
      ? ''
      : side
        ? `<ellipse cx="177" cy="159" rx="6" ry="10" fill="${skin.dark}"/><ellipse cx="196" cy="166" rx="7" ry="4" fill="${skin.main}"/><ellipse cx="181" cy="169" rx="5.5" ry="7.5" fill="#42313a"/><circle cx="183" cy="166" r="2" fill="#fff"/><path d="M184 187q8 6 12-1" stroke="#a05e5c" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
        : `<ellipse cx="124" cy="174" rx="12" ry="7" fill="#f09d9b" opacity=".45"/><ellipse cx="197" cy="174" rx="12" ry="7" fill="#f09d9b" opacity=".45"/><ellipse cx="140" cy="161" rx="8" ry="11" fill="#443540"/><ellipse cx="181" cy="161" rx="8" ry="11" fill="#443540"/><circle cx="143" cy="156" r="3" fill="white"/><circle cx="184" cy="156" r="3" fill="white"/><path d="M153 185q8 10 16 0" fill="none" stroke="#a66065" stroke-width="4" stroke-linecap="round"/><path d="M151 172q9-4 17 0" fill="none" stroke="${skin.dark}" stroke-width="2" stroke-linecap="round"/>`;
    // Hair behind head and front, both always from the same shared scalp anchors.
    const hairBack =
      hairstyle === 'bob' || hairstyle === 'wave' || hairstyle === 'pony' || hairstyle === 'curl'
        ? `<path d="M102 135 Q86 165 90 226 Q98 250 121 242 L136 200 L186 202 Q201 249 225 237 Q233 167 216 127Z" fill="${hair}" stroke="${outline}" stroke-width="3" opacity=".98"/>`
        : '';
    const pony =
      hairstyle === 'pony'
        ? `<path d="M207 122q52 0 43 48q-8 29-28 33q19-47-15-53" fill="${hair}" stroke="${outline}" stroke-width="3"/>`
        : '';
    const curls =
      hairstyle === 'curl'
        ? Array.from(
            { length: 7 },
            (_, i) =>
              `<circle cx="${104 + i * 19}" cy="${115 + (i % 2) * -10}" r="16" fill="${hair}" stroke="${outline}" stroke-width="2"/>`,
          ).join('')
        : '';
    const frontHair =
      hairstyle === 'short'
        ? `<path d="M101 145Q95 84 153 79Q210 73 220 136L200 130Q186 126 180 106Q152 141 108 145Z" fill="${hair}" stroke="${outline}" stroke-width="3"/><path d="M118 111q35-30 73-12" stroke="#ffffff" stroke-opacity=".12" stroke-width="7" fill="none" stroke-linecap="round"/>`
        : hairstyle === 'side'
          ? `<path d="M99 144Q92 83 155 77Q220 78 220 139Q196 132 174 100Q162 134 107 144Z" fill="${hair}" stroke="${outline}" stroke-width="3"/><path d="M137 92q38 4 57 34" stroke="#fff" stroke-opacity=".15" stroke-width="5" fill="none"/>`
          : hairstyle === 'wave'
            ? `<path d="M105 144Q94 88 149 77Q207 71 219 144Q205 140 196 114Q173 131 139 119Q119 140 105 144Z" fill="${hair}" stroke="${outline}" stroke-width="3"/><path d="M95 151q-12 30 0 51q12 10 7 28M223 151q10 31-1 52q-5 12 4 26" fill="none" stroke="${hair}" stroke-width="16" stroke-linecap="round"/>`
            : hairstyle === 'pony'
              ? `<path d="M102 145Q97 80 163 77Q215 81 216 141L193 123Q178 109 166 106Q138 141 102 145Z" fill="${hair}" stroke="${outline}" stroke-width="3"/>`
              : hairstyle === 'curl'
                ? `<path d="M106 139Q100 88 156 80Q213 80 214 142Q189 123 170 113Q146 133 106 139Z" fill="${hair}" stroke="${outline}" stroke-width="3"/>`
                : `<path d="M101 142Q95 81 154 78Q214 75 220 144Q201 135 184 116Q157 144 103 148Z" fill="${hair}" stroke="${outline}" stroke-width="3"/><path d="M105 153Q97 190 112 211M213 151Q228 185 209 212" stroke="${hair}" stroke-width="19" stroke-linecap="round" fill="none"/>`;
    const hairNorth = back
      ? ['short', 'side'].includes(hairstyle)
        ? `<path d="M100 160Q93 88 156 80Q218 82 222 160Q220 195 194 207L126 207Q100 198 100 160Z" fill="${hair}" stroke="${outline}" stroke-width="3"/><path d="M114 137Q156 108 211 136" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="8"/>`
        : `<path d="M100 160Q93 88 156 80Q218 82 222 160Q218 211 197 217L118 215Q101 206 100 160Z" fill="${hair}" stroke="${outline}" stroke-width="3"/><path d="M114 137Q156 108 211 136" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="8"/>`
      : '';
    const legs =
      pose === 'sit'
        ? `<g class="avatar-leg-left" data-part="left-leg"><path d="M125 339L112 368L147 369" stroke="${bottomColor}" stroke-width="25" fill="none" stroke-linecap="round"/><ellipse cx="143" cy="369" rx="24" ry="13" fill="${shoeColor}" stroke="${outline}" stroke-width="3"/></g><g class="avatar-leg-right" data-part="right-leg"><path d="M183 339L193 369L158 369" stroke="${bottomColor}" stroke-width="25" fill="none" stroke-linecap="round"/><ellipse cx="173" cy="370" rx="24" ry="13" fill="${shoeColor}" stroke="${outline}" stroke-width="3"/></g>`
        : pose === 'kneel'
          ? `<path d="M126 342q-20 24-8 38l28 3M183 342q18 28 5 39l-27 2" fill="none" stroke="${bottomColor}" stroke-width="26" stroke-linecap="round"/><ellipse cx="123" cy="390" rx="26" ry="11" fill="${shoeColor}"/><ellipse cx="187" cy="390" rx="26" ry="11" fill="${shoeColor}"/>`
          : `<g class="avatar-leg-left" data-part="left-leg"><path d="M135 329L128 390" stroke="${bottomColor}" stroke-width="29" stroke-linecap="round"/><path d="M128 361L126 398" stroke="${skin.main}" stroke-width="16" stroke-linecap="round"/><path d="M127 392L116 411Q118 421 143 420L153 411Q150 396 127 392Z" fill="${shoeColor}" stroke="${outline}" stroke-width="3"/></g><g class="avatar-leg-right" data-part="right-leg"><path d="M182 329L188 390" stroke="${bottomColor}" stroke-width="29" stroke-linecap="round"/><path d="M188 361L190 398" stroke="${skin.main}" stroke-width="16" stroke-linecap="round"/><path d="M190 392L202 411Q201 421 176 420L164 411Q169 396 190 392Z" fill="${shoeColor}" stroke="${outline}" stroke-width="3"/></g>`;
    const bottomGraphic =
      bottom.kind === 'skirt' || bottom.kind === 'long-skirt'
        ? `<path d="M123 320L198 320L${bottom.kind === 'long-skirt' ? 221 : 211} ${bottom.kind === 'long-skirt' ? 388 : 353}L${bottom.kind === 'long-skirt' ? 98 : 109} ${bottom.kind === 'long-skirt' ? 388 : 353}Z" fill="${bottomColor}" stroke="${outline}" stroke-width="3.2"/><path d="M144 330L135 346M176 330L184 346" stroke="#fff" stroke-opacity=".2" stroke-width="3"/>`
        : `<path d="M123 320H198L194 358L166 353L161 337L155 354L126 358Z" fill="${bottomColor}" stroke="${outline}" stroke-width="3"/><path d="M160 324v22" stroke="#dae9fa" stroke-opacity=".6" stroke-width="2"/>`;
    const armL =
      pose === 'pray'
        ? `<path d="M119 250Q103 277 153 290" stroke="${topColor}" stroke-width="25" stroke-linecap="round" fill="none"/><ellipse cx="153" cy="290" rx="11" ry="12" fill="${skin.main}"/>`
        : `<path d="M120 251Q104 279 99 315" stroke="${topColor}" stroke-width="26" stroke-linecap="round" fill="none"/><ellipse cx="98" cy="324" rx="12" ry="16" fill="${skin.main}"/>`;
    const armR =
      pose === 'wave'
        ? `<path d="M198 249Q225 236 224 185" stroke="${topColor}" stroke-width="26" stroke-linecap="round" fill="none"/><ellipse cx="224" cy="181" rx="13" ry="17" fill="${skin.main}"/><path d="M219 169v-20M228 171l7-16" stroke="${skin.main}" stroke-width="7" stroke-linecap="round"/>`
        : pose === 'pray'
          ? `<path d="M198 250Q214 277 167 290" stroke="${topColor}" stroke-width="25" stroke-linecap="round" fill="none"/><ellipse cx="167" cy="290" rx="11" ry="12" fill="${skin.main}"/>`
          : `<path d="M199 251Q215 279 222 315" stroke="${topColor}" stroke-width="26" stroke-linecap="round" fill="none"/><ellipse cx="223" cy="325" rx="12" ry="16" fill="${skin.main}"/>`;
    const jacket =
      top.kind === 'jacket'
        ? `<path d="M160 244V327" stroke="${top.trim}" stroke-width="9"/><path d="M144 247l16 25l16-25" stroke="${top.trim}" stroke-width="6" fill="none"/>`
        : top.kind === 'sweater'
          ? `<path d="M128 262h63M136 295h49" stroke="${top.trim}" stroke-width="4" stroke-opacity=".85"/>`
          : top.kind === 'shirt'
            ? `<path d="M145 244l15 19l14-19" fill="none" stroke="${top.trim}" stroke-width="6"/>`
            : `<path d="M147 243l13 17l13-17M160 260v67" fill="none" stroke="${top.trim}" stroke-width="5"/>`;
    const fancy =
      top.kind === 'aodai'
        ? `<path d="M123 303L111 389L145 375L160 330L174 375L211 389L197 303" fill="${topColor}" stroke="${top.trim}" stroke-width="3" opacity=".93"/>`
        : '';
    const accessories =
      acc === 'glasses' && !back
        ? `<g fill="none" stroke="#715747" stroke-width="3"><circle cx="${side ? 180 : 141}" cy="163" r="17"/><circle cx="${side ? 215 : 181}" cy="163" r="17"/><path d="M158 162h7"/></g>`
        : acc === 'bow'
          ? `<path d="M199 100q33-18 20 14q-14 6-20-2q-6 19-22-1q-3-18 22-11" fill="#dcb264" stroke="#8d5e47" stroke-width="3"/>`
          : acc === 'scarf'
            ? `<path d="M123 217q35 19 71 0" fill="none" stroke="#f7d5a9" stroke-width="15" stroke-linecap="round"/><path d="M186 222q12 21 0 49" fill="none" stroke="#d34f5b" stroke-width="14"/>`
            : '';
    if (pose === 'pray' && !side && !back)
      face = face.replace(/<(ellipse|circle) cx="(?:140|181|143|184)"[^>]*\/>/g, '');
    const eyesClosed =
      pose === 'pray' && !back && !side
        ? `<path d="M130 161q10 8 19 0M174 161q10 8 19 0" stroke="#523b43" stroke-width="3.5" fill="none"/>`
        : '';
    return `<svg class="anhoa-avatar" role="img" aria-label="Nhân vật ${gender === 'male' ? 'nam' : 'nữ'}, hướng ${dir}, tư thế ${pose}" viewBox="0 0 320 480" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" data-pose="${pose}" data-direction="${dir}" data-body-type="${gender}">
 <defs><radialGradient id="${uid}-shadow"><stop stop-color="#644a3c" stop-opacity=".28"/><stop offset="1" stop-color="#644a3c" stop-opacity="0"/></radialGradient><linearGradient id="${uid}-skin" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${skin.light}"/><stop offset=".65" stop-color="${skin.main}"/><stop offset="1" stop-color="${skin.dark}"/></linearGradient><linearGradient id="${uid}-shirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${topColor}"/><stop offset="1" stop-color="${top.trim || topColor}" stop-opacity=".87"/></linearGradient></defs>
 <ellipse cx="160" cy="464" rx="77" ry="20" fill="url(#${uid}-shadow)"/>
 <g transform="${mirror}"><g transform="translate(${xx} ${bodyOffset})"><g transform="${pose === 'bow' ? 'rotate(12 160 420)' : ''}">
 <g data-part="hair-back">${pony}${hairBack}</g>
 <g data-part="legs"><g transform="translate(0 -65.8) scale(1 1.2)">${legs}</g></g><g data-part="bottom">${bottomGraphic}${fancy}</g>
 <g data-part="left-arm">${armL}</g>
 <g data-part="torso" data-color="${topColor}"><path d="M129 230Q160 222 190 230L206 326Q160 346 114 326Z" fill="url(#${uid}-shirt)" stroke="${outline}" stroke-width="3.2" stroke-linejoin="round"/><path d="M132 249q28 7 54 0" fill="none" stroke="#fff" stroke-opacity=".27" stroke-width="5"/>${jacket}</g>
 <rect x="149" y="211" width="22" height="29" rx="10" fill="${skin.dark}"/>
 <g data-part="right-arm">${armR}</g>
 <g data-part="head">
 <ellipse cx="104" cy="166" rx="14" ry="19" fill="${skin.main}" stroke="${skin.dark}" stroke-width="2"/><ellipse cx="216" cy="166" rx="14" ry="19" fill="${skin.main}" stroke="${skin.dark}" stroke-width="2"/>
 <ellipse cx="160" cy="153" rx="61" ry="70" fill="url(#${uid}-skin)" stroke="${outline}" stroke-width="3.3"/>
 ${face}${back ? '' : frontHair}${back ? '' : curls}${hairNorth}</g><g data-part="accessory">${accessories}</g>${eyesClosed}
 </g></g></g></svg>`;
  }

  const cache = new Map();
  function adapt(person = {}, wardrobe) {
    const gender = person.gender === 'male' ? 'male' : 'female',
      direction =
        person.pose === 'sit_back'
          ? 'up'
          : ['up', 'down', 'left', 'right'].includes(person.direction)
            ? person.direction
            : 'down',
      pose =
        { cross: 'sign_cross', clean: 'wipe', sit_back: 'sit' }[person.pose] ||
        ([
          'idle',
          'walk',
          'sit',
          'stand',
          'kneel',
          'genuflect',
          'bow',
          'sign_cross',
          'pray',
          'wave',
          'sweep',
          'water',
          'wipe',
          'sing',
          'read',
          'decorate',
          'carry',
        ].includes(person.pose)
          ? person.pose
          : 'idle'),
      skin = paint(person.skin, '#f7cfac'),
      top = paint(person.top || person.shirt, '#f5e6cf'),
      bottom = paint(person.bottom, '#465b75'),
      shoes = paint(person.shoes, '#6a443e'),
      hair = paint(person.hair, '#543932'),
      acc = ['acc_bow', 'acc_lily', 'acc_bag'].includes(person.acc) ? person.acc : 'acc_none',
      layers = wardrobe?.frames(person.assets, pose, direction) || [],
      raw = normalize({
        gender,
        skin,
        top,
        bottom,
        shoes,
        hair,
        hairStyle: person.hairStyle,
        topKind: person.topKind,
        bottomKind: person.bottomKind,
        direction: { up: 'back', down: 'front', left: 'left', right: 'right' }[direction],
        pose: ['walk', 'sit', 'kneel', 'pray', 'wave', 'bow'].includes(pose)
          ? pose
          : ['genuflect'].includes(pose)
            ? 'kneel'
            : ['sign_cross', 'read', 'carry'].includes(pose)
              ? 'pray'
              : ['water', 'sweep', 'wipe'].includes(pose)
                ? 'interact'
                : ['decorate', 'sing'].includes(pose)
                  ? 'wave'
                  : 'idle',
        acc: acc === 'acc_bow' ? 'bow' : 'none',
      }),
      key = JSON.stringify([raw, pose, layers, acc]);
    if (cache.has(key)) return cache.get(key);
    const body = renderAvatar(raw, { id: 's' + skin.slice(1) + 't' + top.slice(1) }).replace(
      '<svg class="anhoa-avatar"',
      '<svg class="v10-art" x="-10.4" y="-31.2" width="140.8" height="211.2"',
    );
    const extras =
      acc === 'acc_lily'
        ? '<g data-part="accessory-extra"><circle cx="83" cy="27" r="6" fill="#f0ce93"/><path d="M83 17L86 22L94 19L89 26L94 32L85 31L83 39L80 31L72 32L78 25L73 19L80 22Z" fill="#fff1c0"/></g>'
        : acc === 'acc_bag'
          ? '<g data-part="accessory-extra"><path d="M42 79Q60 97 89 121" fill="none" stroke="#8b6a54" stroke-width="5"/><rect x="76" y="113" width="20" height="21" rx="4" fill="#a7805f"/></g>'
          : '';
    const prop =
      pose === 'read'
        ? '<path d="M35 93L60 98L85 93V114L60 119L35 113Z" fill="#e9d3ac" stroke="#695046" stroke-width="2"/>'
        : pose === 'carry'
          ? '<rect x="38" y="94" width="45" height="30" rx="3" fill="#c69272"/>'
          : pose === 'water'
            ? '<path d="M86 102h19v20H86ZM105 108l12-8v5l-12 12" fill="#79abb1"/>'
            : ['sweep', 'wipe'].includes(pose)
              ? '<path d="M91 93L105 157" stroke="#a7845d" stroke-width="4"/><path d="M95 148L116 146L120 163H94Z" fill="#e3c68b"/>'
              : pose === 'sing'
                ? '<text x="88" y="57" fill="#74668e" font-size="20">♫</text>'
                : '';
    const atlas = layers
      .map((layer) =>
        layer.frames
          .map((frame, i) => {
            const columns = layer.width / 120,
              x = (frame % columns) * 120,
              y = Math.floor(frame / columns) * 185;
            return `<svg width="120" height="185" viewBox="${x} ${y} 120 185" overflow="hidden" ${layer.frames.length === 2 ? `class="atlas-frame" data-frame="${i}" style="animation-delay:-${i * 0.4}s"` : ''}><image href="${layer.url}" width="${layer.width}" height="${layer.height}"/></svg>`;
          })
          .join(''),
      )
      .join('');
    const result = `<svg class="v10-render" viewBox="0 0 120 185" xmlns="http://www.w3.org/2000/svg" data-sprite-version="v10-v4-1" data-hair-style="${raw.hairStyle}" data-skin="${skin}" data-direction="${direction}" data-pose="${pose}" data-seating-pose="${pose === 'sit' ? 'sit_back' : ''}" aria-label="Nhân vật ${gender === 'male' ? 'nam' : 'nữ'}">${body}${extras}<g data-part="held-prop">${prop}</g>${atlas}</svg>`;
    if (cache.size >= 256) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  }
  const SKIN_HEX = [...Object.values(SKINS).map((s) => s.main), '#f7cfac', '#d9a77f', '#ae7658'];
  const api = { renderAvatar, adapt, SKINS, SKIN_HEX, HAIR_COLORS, HAIR_STYLES, normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PARISH_AVATAR_V10 = api;
})(typeof window !== 'undefined' ? window : globalThis);
