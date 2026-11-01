/* Đồ họa 2D nhiều lớp, dùng SVG; không cần ảnh hoặc thư viện tải qua mạng. */
(function () {
  const esc = (s) =>
    String(s).replace(
      /[&<>'"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c],
    );
  const defs = `<defs>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#8eaccd"/><stop offset=".6" stop-color="#e5d4c5"/><stop offset="1" stop-color="#f3d1a2"/></linearGradient>
<linearGradient id="wall" x2="0" y2="1"><stop stop-color="#fffdf4"/><stop offset="1" stop-color="#e5d4cf"/></linearGradient>
<linearGradient id="floor" x2="0" y2="1"><stop stop-color="#ecdfd2"/><stop offset="1" stop-color="#bda5a0"/></linearGradient>
<linearGradient id="wood" x2="0" y2="1"><stop stop-color="#b68161"/><stop offset=".48" stop-color="#85533e"/><stop offset="1" stop-color="#613b3c"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#ffe3a9" stop-opacity=".85"/><stop offset="1" stop-color="#fff0bd" stop-opacity="0"/></radialGradient>
<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#718fb4"/><stop offset=".45" stop-color="#e5a97e"/><stop offset="1" stop-color="#87c0c1"/></linearGradient>
<linearGradient id="garden" x2="0" y2="1"><stop stop-color="#8fc4a9"/><stop offset="1" stop-color="#477f76"/></linearGradient>
<pattern id="tiles" width="85" height="85" patternUnits="userSpaceOnUse"><path d="M0 0H85V85H0Z" fill="none" stroke="#b08e89" opacity=".16"/><path d="M0 0L85 85M85 0L0 85" fill="none" stroke="#fff0e7" opacity=".17"/></pattern>
<filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
</defs>`;
  const svg = (body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" preserveAspectRatio="none" role="img" aria-label="Khung cảnh hoạt hình hai chiều có chiều sâu">${defs}${body}</svg>`;
  const pointed = (x, y, w, h, fill, stroke = '#d5bb9e') =>
    `<path d="M${x - w / 2} ${y + h}V${y + h * 0.32}Q${x - w * 0.44} ${y + h * 0.11} ${x} ${y}Q${x + w * 0.44} ${y + h * 0.11} ${x + w / 2} ${y + h * 0.32}V${y + h}Z" fill="${fill}" stroke="${stroke}" stroke-width="7"/>`;
  const glass = (x, y, w = 43, h = 150) =>
    `${pointed(x, y, w, h, 'url(#glass)', '#ece0d8')}<path d="M${x} ${y + 12}V${y + h}M${x - w / 2 + 4} ${y + h * 0.58}H${x + w / 2 - 4}M${x - w / 2 + 6} ${y + h * 0.79}H${x + w / 2 - 6}" stroke="#f3e5c3" stroke-width="5" fill="none"/><path d="M${x - w * 0.2} ${y + h * 0.24}L${x + w * 0.24} ${y + h * 0.72}" stroke="#ffdfb6" stroke-width="5" opacity=".75"/>`;
  const pillar = (x) =>
    `<g><path d="M${x - 21} 180L${x - 37} 545h70L${x + 21} 180Z" fill="#ede0da" stroke="#e6d2cb" stroke-width="5"/><path d="M${x - 25} 206H${x + 25}M${x - 36} 533H${x + 36}" stroke="#fffdf1" stroke-width="16"/><path d="M${x + 7} 225L${x + 18} 500" stroke="#bda9a0" stroke-width="4" opacity=".3"/></g>`;
  const candle = (x, y) =>
    `<g><path d="M${x - 2} ${y}V${y + 24}" stroke="#b28a57" stroke-width="5"/><rect x="${x - 5}" y="${y - 9}" width="10" height="20" rx="3" fill="#fff4d6"/><ellipse cx="${x}" cy="${y - 15}" rx="4" ry="8" fill="#ffc978"/><ellipse cx="${x}" cy="${y - 14}" rx="2" ry="4" fill="#fff3c3"/></g>`;
  const flower = (x, y, c = '#f4ca94') =>
    `<g><path d="M${x} ${y}v-20" stroke="#597c53" stroke-width="3"/><circle cx="${x - 8}" cy="${y - 17}" r="6" fill="${c}"/><circle cx="${x + 8}" cy="${y - 17}" r="6" fill="${c}"/><circle cx="${x}" cy="${y - 26}" r="6" fill="${c}"/><circle cx="${x}" cy="${y - 12}" r="6" fill="${c}"/><circle cx="${x}" cy="${y - 18}" r="4" fill="#f9eaa8"/></g>`;
  const pew = (x, y, side, scale) => {
    let w = side === 'l' ? 270 : 270;
    return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="${w / 2}" cy="40" rx="${w * 0.55}" ry="22" fill="#433132" opacity=".13"/><rect x="0" y="0" width="${w}" height="28" rx="8" fill="url(#wood)" stroke="#553636" stroke-width="5"/><path d="M8 8H${w - 8}" stroke="#d9a27a" stroke-width="5" opacity=".7"/><rect x="8" y="25" width="12" height="35" rx="3" fill="#795043"/><rect x="${w - 20}" y="25" width="12" height="35" rx="3" fill="#795043"/></g>`;
  };
  function nave() {
    let b = `<rect width="1200" height="720" fill="#efe9e4"/><rect width="1200" height="450" fill="url(#wall)"/>`;
    b += `<path d="M0 450H1200V720H0Z" fill="url(#floor)"/><path d="M0 450L570 430L442 720H0Z" fill="#eee0d2" opacity=".6"/><path d="M1200 450L630 430L758 720H1200Z" fill="#eee0d2" opacity=".6"/><path d="M520 440L680 440L795 720H405Z" fill="#e7bd9c" opacity=".5"/><path d="M574 448L626 448L673 720H527Z" fill="#fff4e0" opacity=".85"/><rect y="450" width="1200" height="270" fill="url(#tiles)"/>`;
    b += `<path d="M30 0Q150 200 185 485M1170 0Q1050 200 1015 485M140 0Q290 200 310 485M1060 0Q910 200 890 485M285 0Q370 162 410 465M915 0Q830 162 790 465M440 0Q500 113 515 450M760 0Q700 113 685 450" stroke="#fffdf6" stroke-width="22" fill="none" opacity=".9"/>`;
    b += `<path d="M335 0Q510 125 600 300Q690 125 865 0" stroke="#e1cfca" stroke-width="12" fill="none"/><path d="M430 0Q570 120 600 252Q630 120 770 0" fill="none" stroke="#fffdf2" stroke-width="16"/>`;
    b += `<path d="M380 455V185Q600 -110 820 185V455Z" fill="#f7f2ed" stroke="#d6c4c1" stroke-width="12"/><path d="M425 408V220Q600 -15 775 220V408Z" fill="#a2b7cb"/><path d="M428 404V250Q600 30 772 250V404Z" fill="#b7cee0"/>`;
    // Blue fresco with stylized angel silhouettes and soft decorative stars.
    b += `<path d="M447 370Q600 280 753 370L753 250Q600 70 447 250Z" fill="#8cacc8"/><path d="M447 370Q600 290 753 370" stroke="#f3e9df" stroke-width="10" fill="none"/>`;
    for (let i = 0; i < 12; i++) {
      let x = 477 + (i % 6) * 47,
        y = 235 + Math.floor(i / 6) * 62;
      b += `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 4 : 2}" fill="#fff6d7" opacity=".8"/>`;
    }
    b += `<ellipse cx="600" cy="310" rx="120" ry="122" fill="url(#glow)"/><path d="M490 419V308Q600 170 710 308V419Z" fill="#f6efdf" stroke="#dfc6a4" stroke-width="16"/><path d="M515 417V318Q600 207 685 318V417Z" fill="#e8e1d8"/>`;
    b += `<ellipse cx="600" cy="285" rx="62" ry="72" fill="url(#glow)"/><path d="M600 274V380M556 298H644" stroke="#74433c" stroke-width="16" stroke-linecap="round"/><circle cx="600" cy="290" r="9" fill="#f4e2ca"/><path d="M596 300L584 347L600 356L616 347L604 300Z" fill="#e8d1bd"/><path d="M592 357L584 385M608 357L616 385" stroke="#d6bdab" stroke-width="7"/>`;
    b += `<path d="M420 430L455 390H745L780 430V470H420Z" fill="#f6efe9" stroke="#e6d5ca" stroke-width="7"/><rect x="500" y="389" width="200" height="48" rx="3" fill="#fff7eb" stroke="#e2c9a5" stroke-width="5"/><rect x="505" y="390" width="190" height="5" fill="#ca9b6c"/>`;
    for (let x of [470, 490, 710, 730]) b += candle(x, 388);
    for (let x of [430, 775]) b += flower(x, 440, '#f2b1bd');
    for (let x of [68, 193, 320, 880, 1007, 1132]) b += glass(x, 165, 55, 230);
    for (let x of [115, 300, 900, 1085]) b += pillar(x);
    b += `<path d="M0 0Q250 275 240 440M1200 0Q950 275 960 440" stroke="#ffffff" stroke-width="21" fill="none" opacity=".5"/><g fill="#f7e8ca" opacity=".55"><path d="M185 240L0 640L0 590Z"/><path d="M1000 240L1200 660L1200 610Z"/></g>`;
    for (let i = 0; i < 4; i++) {
      let y = 490 + i * 55,
        s = 0.66 + i * 0.13;
      b += pew(35 - i * 8, y, 'l', s) + pew(1050 - i * 14, y, 'r', s);
    }
    b += `<path d="M535 545H665L714 720H486Z" fill="none" stroke="#fff9d6" stroke-width="3" opacity=".7"/><circle cx="600" cy="647" r="28" fill="none" stroke="#e9bd8f" stroke-width="4"/><path d="M570 647H630M600 618V675" stroke="#e9bd8f" stroke-width="3"/>`;
    return svg(b);
  }
  function tree(x, y, k = 1) {
    return `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="9" rx="66" ry="19" fill="#375b52" opacity=".3"/><rect x="-13" y="-100" width="26" height="116" rx="7" fill="#866451"/><circle cx="-28" cy="-110" r="49" fill="#558f76"/><circle cx="26" cy="-128" r="55" fill="#5fa384"/><circle cx="3" cy="-167" r="50" fill="#6ab18d"/><circle cx="-36" cy="-150" r="30" fill="#7cba98"/></g>`;
  }
  function churchFront(x = 600, y = 470, scale = 1) {
    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-280 -130L0 -328L280 -130V20H-280Z" fill="#f9e8d7" stroke="#c8aa9a" stroke-width="9"/><path d="M-280 -130L0 -328L280 -130" fill="none" stroke="#cc977d" stroke-width="23"/><rect x="-240" y="-330" width="100" height="350" fill="#f8eee3" stroke="#c2a899" stroke-width="9"/><rect x="140" y="-330" width="100" height="350" fill="#f8eee3" stroke="#c2a899" stroke-width="9"/><path d="M-260 -330L-190 -420L-120 -330M120 -330L190 -420L260 -330" fill="#d5a17e" stroke="#c48a70" stroke-width="9"/><path d="M-205 -425V-452M205 -425V-452M0 -332V-366" stroke="#b17e55" stroke-width="10"/><path d="M-220 -445H-190M190 -445H220M-22 -352H22" stroke="#b17e55" stroke-width="6"/>${glass(-190, -300, 49, 143)}${glass(190, -300, 49, 143)}${glass(0, -190, 90, 120)}<path d="M-75 20V-96Q0 -195 75 -96V20" fill="#764c46" stroke="#d9b18e" stroke-width="11"/><path d="M0 -137V20M-60 -45H60" stroke="#bb8a70" stroke-width="6"/><circle cx="0" cy="-237" r="24" fill="#e9d6be" stroke="#bd966f" stroke-width="7"/><path d="M-15 -237H15M0 -252V-222" stroke="#bd966f" stroke-width="5"/></g>`;
  }
  function outdoor(kind) {
    let b = `<rect width="1200" height="720" fill="url(#sky)"/><path d="M0 330Q220 265 400 320T800 295T1200 300V720H0Z" fill="#94b5a4"/><path d="M0 420Q300 345 570 420T1200 360V720H0Z" fill="url(#garden)"/>`;
    if (kind === 'courtyard') {
      b += `<path d="M420 450L780 450L1070 720H135Z" fill="#e8d0b9"/><path d="M495 450L700 450L770 720H430Z" fill="#f9e5d3"/>${churchFront(603, 460, 0.84)}`;
      b += tree(120, 480, 1.12) + tree(1080, 488, 1.1);
      for (let i = 0; i < 9; i++) {
        b += flower(78 + i * 34, 643, '#f6cbab') + flower(880 + i * 28, 655, '#f7c6d0');
      }
      b += `<ellipse cx="600" cy="636" rx="85" ry="26" fill="#5c6768" opacity=".14"/><ellipse cx="600" cy="609" rx="42" ry="12" fill="#a4cacc"/><path d="M583 602Q600 554 617 602" stroke="#c9eced" stroke-width="12" fill="none"/><circle cx="600" cy="570" r="7" fill="#e3f9f4"/>`;
    }
    if (kind === 'garden') {
      b +=
        tree(158, 453, 1.4) +
        tree(1045, 459, 1.25) +
        `<path d="M0 590L600 485L1200 590V720H0" fill="#dfbf9e" opacity=".68"/>`;
      for (let i = 0; i < 3; i++) {
        let x = 180 + i * 295;
        b += `<ellipse cx="${x + 110}" cy="610" rx="136" ry="55" fill="#5e4939" opacity=".12"/><path d="M${x - 2} 587L${x + 205} 587L${x + 260} 692L${x - 36} 692Z" fill="#886453" stroke="#d2b58c" stroke-width="9"/>`;
        for (let j = 0; j < 5; j++)
          b += flower(x + j * 37, 638 - (j % 2) * 16, ['#f8baca', '#f5d27c', '#b7d6fc'][i]);
      }
      b += `<path d="M80 530H1120" stroke="#f0d8b4" stroke-width="15"/><path d="M80 530V450M1120 530V450" stroke="#e3c69f" stroke-width="19"/>`;
    }
    if (kind === 'christmas') {
      b +=
        churchFront(620, 448, 0.75) +
        tree(1040, 520, 1) +
        `<path d="M350 505L850 505L1000 720H200Z" fill="#ded8d0"/>`;
      b += `<g transform="translate(265 570)"><path d="M0 0L80 -180L160 0Z" fill="#3b8565"/><path d="M20 -55L80 -200L140 -55Z" fill="#4e9c79"/><path d="M40 -120L80 -222L120 -120Z" fill="#68b18b"/><path d="M80 -251L90 -231L112 -230L95 -214L100 -191L80 -204L60 -191L65 -214L48 -230L70 -231Z" fill="#ffe0a0"/></g>`;
      for (let x of [210, 255, 300]) {
        for (let y of [500, 540])
          b += `<circle cx="${x}" cy="${y}" r="7" fill="${(x + y) % 3 ? '#f7cf92' : '#dc9292'}"/>`;
      }
      b += `<path d="M830 583L900 492L970 583Z" fill="#b78861"/><rect x="837" y="580" width="126" height="75" fill="#6f5549"/><path d="M850 631Q900 560 950 631" fill="#f2d8a7"/><circle cx="900" cy="600" r="15" fill="#f8c89c"/>`;
      for (let x of [520, 580, 640, 700, 760])
        b += `<circle cx="${x}" cy="476" r="6" fill="#ffe2a7"/>`;
    }
    return svg(b);
  }
  function indoor(kind) {
    let b = `<rect width="1200" height="720" fill="url(#wall)"/><path d="M0 450H1200V720H0Z" fill="url(#floor)"/><path d="M0 0H1200V450H0Z" fill="#f7eee2"/><path d="M0 440H1200" stroke="#d5b5a1" stroke-width="19"/><path d="M0 450H1200V720H0Z" fill="url(#tiles)"/>`;
    for (let x of [130, 1050]) b += glass(x, 112, 95, 310);
    b += pillar(280) + pillar(920);
    b += `<path d="M300 0Q600 300 900 0" stroke="#fffaf0" stroke-width="24" fill="none"/>`;
    if (kind === 'classroom') {
      b += `<rect x="370" y="165" width="460" height="236" rx="12" fill="#5a867d" stroke="#c69c74" stroke-width="18"/><text x="600" y="245" text-anchor="middle" fill="#fff6df" font-size="34" font-weight="700">LỚP GIÁO LÝ</text><path d="M465 280H735" stroke="#f9e7cb" stroke-width="5"/>`;
      for (let i = 0; i < 3; i++)
        b += `<g transform="translate(${230 + i * 290} ${520 + (i % 2) * 33})"><path d="M0 0h200l55 100H-55Z" fill="#b77e57"/><path d="M12 20H186" stroke="#f1ca95" stroke-width="6"/></g>`;
      b += `<rect x="75" y="420" width="120" height="160" fill="#9c7259"/><path d="M105 443H170M105 490H170M105 537H170" stroke="#e2bd8c" stroke-width="13"/>`;
    }
    if (kind === 'office') {
      b += `<rect x="370" y="190" width="455" height="255" rx="15" fill="#cfaf8f"/><rect x="395" y="211" width="405" height="202" fill="#f9f2e7"/><path d="M480 275H710M480 330H710" stroke="#b68f72" stroke-width="6"/><rect x="300" y="490" width="610" height="150" rx="15" fill="url(#wood)"/><path d="M330 514H875" stroke="#d4a279" stroke-width="10"/><rect x="750" y="460" width="110" height="70" fill="#d7b187"/><path d="M750 460L805 420L860 460" fill="#f4dcad"/><path d="M805 419V527" stroke="#a35c69" stroke-width="12"/>`;
    }
    if (kind === 'choir') {
      b += `<rect x="368" y="175" width="460" height="250" rx="10" fill="#486d73" stroke="#d4ad88" stroke-width="18"/><text x="600" y="270" text-anchor="middle" fill="#f9e8c9" font-size="74">♫ ♬</text><path d="M420 330H780M420 350H780M420 370H780" stroke="#eadbc6" stroke-width="3"/>`;
      for (let x of [260, 500, 740, 980])
        b += `<path d="M${x} 530L${x - 43} 670H${x + 43}Z" fill="#76627a" stroke="#524558" stroke-width="6"/><rect x="${x - 23}" y="480" width="46" height="56" fill="#e9d3b0"/>`;
    }
    if (kind === 'baptistry') {
      b += `<path d="M430 418V204Q600 30 770 204V418" fill="#dce4e4" stroke="#d1bcb0" stroke-width="14"/>${glass(600, 125, 160, 285)}<ellipse cx="600" cy="534" rx="170" ry="70" fill="#b0a7a7"/><path d="M462 510Q600 458 738 510L714 595Q600 655 486 595Z" fill="#efe8e1" stroke="#c8b2a9" stroke-width="11"/><ellipse cx="600" cy="513" rx="145" ry="40" fill="#7cb5ba" stroke="#e8e2d5" stroke-width="12"/><path d="M600 250V300M575 265H625" stroke="#b78b54" stroke-width="10"/>`;
    }
    if (kind === 'confession') {
      b += `<path d="M390 515V200Q600 -30 810 200V515Z" fill="#d8c2b3" stroke="#b1948b" stroke-width="18"/><path d="M420 520V215Q600 15 780 215V520Z" fill="url(#wood)" stroke="#714c42" stroke-width="14"/><path d="M600 150V500" stroke="#c19b77" stroke-width="14"/>`;
      for (let x of [505, 695])
        b += `<rect x="${x - 49}" y="270" width="98" height="115" rx="13" fill="#613d42" stroke="#e7c598" stroke-width="8"/><path d="M${x - 39} 300H${x + 39}M${x - 39} 325H${x + 39}M${x - 39} 350H${x + 39}" stroke="#b17f69" stroke-width="6"/>`;
      b += `<rect x="540" y="540" width="120" height="49" rx="12" fill="#b18d6d"/>`;
    }
    if (kind === 'foyer') {
      b += `<path d="M400 520V170Q600 -80 800 170V520Z" fill="#b17d62" stroke="#b7a59b" stroke-width="14"/><path d="M435 520V190Q600 -15 765 190V520Z" fill="#8b6659"/><path d="M600 137V520" stroke="#deb78e" stroke-width="18"/><path d="M456 355H740" stroke="#dec5a1" stroke-width="8"/>`;
      b += `<rect x="915" y="270" width="180" height="220" fill="#fff9ec" stroke="#caad87" stroke-width="13"/><path d="M944 310H1070M944 350H1070M944 390H1070" stroke="#bc9c82" stroke-width="7"/>`;
    }
    if (kind === 'shoproom') {
      b += `<rect x="380" y="185" width="420" height="208" rx="11" fill="#e8d3b9" stroke="#b78b71" stroke-width="15"/>`;
      for (let j = 0; j < 4; j++) {
        let x = 425 + j * 98;
        b += `<path d="M${x} 226v25M${x - 24} 253h48l-10 80h-28Z" stroke="#b48660" stroke-width="6" fill="${['#c87978', '#77a1bc', '#e5d2b4', '#9b8dba'][j]}"/>`;
      }
      b += `<path d="M350 480H850L900 650H300Z" fill="#b98d66" stroke="#775442" stroke-width="9"/><path d="M360 499H835" stroke="#e7be8b" stroke-width="10"/><rect x="1020" y="410" width="85" height="180" rx="7" fill="#f3e8cf" stroke="#ba9271" stroke-width="10"/>`;
    }
    return svg(b);
  }
  function scene(id) {
    switch (id) {
      case 'nave':
        return nave();
      case 'courtyard':
      case 'garden':
      case 'christmas':
        return outdoor(id);
      default:
        return indoor(id);
    }
  }
  const spriteVersion = 'svg-rig-4.1';
  const directions = ['up', 'down', 'left', 'right'];
  const poses = [
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
  ];
  const avatarCache = new Map();
  function avatar(person = {}) {
    const paint = (v, fallback) => (/^#[a-f0-9]{6}$/i.test(v || '') ? v : fallback);
    const female = person.gender !== 'male',
      skin = paint(person.skin, '#f7cfac'),
      top = paint(person.top || person.shirt, '#f5e6cf'),
      bottom = paint(person.bottom, '#465b75'),
      shoes = paint(person.shoes, '#6a443e'),
      hair = paint(person.hair, '#543932'),
      direction = directions.includes(person.direction) ? person.direction : 'down',
      pose = poses.includes(person.pose)
        ? person.pose
        : { cross: 'sign_cross', clean: 'wipe' }[person.pose] || 'idle',
      acc = ['acc_bow', 'acc_lily', 'acc_bag'].includes(person.acc) ? person.acc : 'acc_none',
      layers = window.PARISH_WARDROBE?.frames(person.assets, pose, direction) || [],
      key = [
        female,
        skin,
        top,
        bottom,
        shoes,
        hair,
        direction,
        pose,
        acc,
        JSON.stringify(layers),
      ].join(':');
    if (avatarCache.has(key)) return avatarCache.get(key);
    const side = direction === 'left' || direction === 'right',
      back = direction === 'up';
    const seated = ['sit', 'kneel', 'genuflect'].includes(pose);
    const head = back
      ? `<path d="M32 48Q23 14 58 12Q96 11 90 52L85 ${female ? 83 : 65}H37Z" fill="${hair}"/><path d="M42 29Q60 17 78 30M44 41Q61 30 81 44" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="3"/>`
      : side
        ? `<path d="M37 47Q26 10 59 12Q86 10 85 40L90 70H38Z" fill="${hair}"/><path d="M53 21Q81 16 84 37L92 48L85 52Q84 71 62 72Q44 67 43 45Z" fill="${skin}"/><path d="M37 39Q33 10 58 11Q79 12 84 31L62 25L57 48L44 53Z" fill="${hair}"/><ellipse cx="77" cy="43" rx="2.5" ry="3.5" fill="#423745"/><path d="M76 59L84 58" stroke="#ad6c68" stroke-width="2.5"/>`
        : `<path d="M32 48Q23 14 58 12Q96 11 90 52L85 70H37Z" fill="${hair}"/><ellipse cx="60" cy="44" rx="26" ry="29" fill="${skin}"/><ellipse cx="35" cy="46" rx="5" ry="8" fill="${skin}"/><ellipse cx="85" cy="46" rx="5" ry="8" fill="${skin}"/><path d="M34 35Q33 9 60 10Q88 13 86 35Q75 31 65 21Q53 36 34 35Z" fill="${hair}"/><ellipse cx="49" cy="46" rx="3" ry="4" fill="#423745"/><ellipse cx="72" cy="46" rx="3" ry="4" fill="#423745"/><path d="M54 59Q60 64 66 59" stroke="#ad6c68" fill="none" stroke-width="2.5" stroke-linecap="round"/>${female ? `<path d="M31 39Q25 65 34 83L38 77Q31 58 39 39M89 39Q94 65 86 83L82 77Q91 58 81 39" fill="${hair}"/>` : ''}`;
    const bent = ['pray', 'read', 'carry', 'sign_cross'].includes(pose),
      armLeft = bent ? 'rotate(-42deg)' : '',
      armRight =
        pose === 'wave'
          ? 'rotate(-145deg)'
          : bent
            ? 'rotate(42deg)'
            : pose === 'decorate'
              ? 'rotate(-110deg)'
              : '',
      arms = `<g data-part="arms"><g data-part="left-arm" style="transform:${armLeft || 'none'}"><path d="M40 71Q25 72 24 91L21 111Q27 116 33 110L42 90Z" fill="${skin}"/><path d="M40 70Q28 72 26 90L38 94L45 77Z" fill="${top}"/></g><g data-part="right-arm" style="transform:${armRight || 'none'}"><path d="M81 71Q95 72 96 91L99 111Q93 116 87 110L78 90Z" fill="${skin}"/><path d="M81 70Q93 72 95 90L83 94L76 78Z" fill="${top}"/></g></g>`,
      frontArms = bent || ['wave', 'decorate'].includes(pose),
      prop =
        pose === 'read'
          ? `<path d="M35 93L60 98L85 93V114L60 119L35 113Z" fill="#e9d3ac" stroke="#695046" stroke-width="2"/><path d="M60 98V119" stroke="#695046"/>`
          : pose === 'carry'
            ? `<rect x="38" y="94" width="45" height="30" rx="3" fill="#c69272"/><path d="M59 94V124M38 104H83" stroke="#f5deb0" stroke-width="5"/>`
            : pose === 'water'
              ? `<path d="M86 102h19v20H86ZM105 108l12-8v5l-12 12" fill="#79abb1" stroke="#56787f" stroke-width="2"/>`
              : ['sweep', 'wipe'].includes(pose)
                ? `<path d="M91 93L105 157" stroke="#a7845d" stroke-width="4"/><path d="M95 148L116 146L120 163H94Z" fill="#e3c68b"/>`
                : pose === 'sing'
                  ? `<text x="88" y="57" fill="#74668e" font-size="20">♫</text>`
                  : '';
    const body = `<g data-part="rig-body" transform="${direction === 'left' ? 'translate(120 0) scale(-1 1)' : ''}"><g data-part="posture" transform="${pose === 'bow' ? 'rotate(13 60 145)' : seated ? 'translate(0 18)' : ''}"><g data-part="legs" transform="${seated ? 'translate(0 44) scale(1 .68)' : ''}"><path d="M42 112L42 147Q43 154 50 154L55 152L61 112Z" fill="${skin}"/><path d="M62 112L65 151Q71 155 76 149L78 110Z" fill="${skin}"/><path d="M39 149Q46 145 55 149L59 158Q55 166 35 162Z" fill="${shoes}" stroke="#56433e" stroke-width="2"/><path d="M64 149Q72 146 79 149L84 162Q65 167 63 159Z" fill="${shoes}" stroke="#56433e" stroke-width="2"/></g>${frontArms ? '' : arms}<g data-part="bottom">${female ? `<path d="M43 106H76L91 133Q60 146 30 133Z" fill="${bottom}" stroke="#ffffff" stroke-opacity=".27" stroke-width="3"/>` : `<path d="M40 105H80L78 130H63L60 115L57 130H43Z" fill="${bottom}" stroke="#ffffff" stroke-opacity=".22" stroke-width="3"/>`}</g><g data-part="torso"><path d="M44 68Q59 62 78 68L81 111Q60 117 39 111Z" fill="${top}" stroke="#8b7b76" stroke-opacity=".35" stroke-width="2"/>${back ? '' : `<path d="M53 69L60 80L68 69" fill="none" stroke="#fffdf3" stroke-width="5"/><circle cx="60" cy="89" r="2" fill="#b09a88"/><circle cx="60" cy="101" r="2" fill="#b09a88"/>`}</g>${frontArms ? arms : ''}<g data-part="head">${head}</g><g data-part="accessory">${acc === 'acc_bow' ? `<path d="M73 19Q96 -1 93 23Q81 23 73 19Q60 2 58 24Z" fill="#df8d9f" stroke="#ad6278" stroke-width="2"/>` : acc === 'acc_lily' ? `<circle cx="83" cy="27" r="6" fill="#f0ce93"/><path d="M83 17L86 22L94 19L89 26L94 32L85 31L83 39L80 31L72 32L78 25L73 19L80 22Z" fill="#fff1c0"/>` : acc === 'acc_bag' ? `<path d="M42 79Q60 97 89 121" fill="none" stroke="#8b6a54" stroke-width="5"/><rect x="76" y="113" width="20" height="21" rx="4" fill="#a7805f"/>` : ''}</g><g data-part="held-prop">${prop}</g></g></g>`;
    const atlasLayers = layers
      .map((layer) =>
        layer.frames
          .map((frame, index) => {
            const columns = layer.width / 120,
              x = (frame % columns) * 120,
              y = Math.floor(frame / columns) * 185;
            return `<svg width="120" height="185" viewBox="${x} ${y} 120 185" overflow="hidden" ${layer.frames.length === 2 ? `class="atlas-frame" data-frame="${index}" style="animation-delay:-${index * 0.4}s"` : ''}><image href="${layer.url}" width="${layer.width}" height="${layer.height}"/></svg>`;
          })
          .join(''),
      )
      .join('');
    const result = `<svg viewBox="0 0 120 185" xmlns="http://www.w3.org/2000/svg" data-sprite-version="${spriteVersion}" data-direction="${direction}" data-pose="${pose}" aria-label="Nhân vật ${female ? 'nữ' : 'nam'}"><ellipse cx="60" cy="175" rx="31" ry="7" fill="#5b4a59" opacity=".25"/>${body}${atlasLayers}</svg>`;
    if (avatarCache.size >= 256) avatarCache.delete(avatarCache.keys().next().value);
    avatarCache.set(key, result);
    return result;
  }
  window.PARISH_ART = { scene, avatar, esc, directions, poses, spriteVersion };
})();
