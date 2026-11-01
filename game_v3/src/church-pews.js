/* Adapted from user V9 churchScene.mjs: separate back/front geometry. */
(function () {
  const round = (n) => Math.round(n * 10) / 10;
  function pewArt(bench) {
    const { x, y, w, h, id } = bench;
    const backH = 14 + h * 0.24,
      frontY = y + 9,
      frontH = h * 0.7;
    const back = `<g data-bench="${id}" class="pew click-seat">
 <ellipse cx="${x + w / 2}" cy="${y + h * 0.86}" rx="${w * 0.56}" ry="${h * 0.65}" fill="#57321c" opacity=".23"/>
 <path d="M${x + 5} ${y - 11} Q${x + w / 2} ${y - 18} ${x + w - 5} ${y - 11} L${x + w - 2} ${round(y + backH)} H${x + 2}Z" fill="url(#pewBack)" stroke="#6a361b" stroke-width="6"/>
 <path d="M${x + 10} ${y - 9} H${x + w - 10}" stroke="#f7bf79" stroke-width="5" opacity=".85"/>
 </g>`;
    const ornaments = Array.from({ length: 3 }, (_, i) => {
      const cx = x + ((i + 0.5) * w) / 3,
        cy = frontY + frontH * 0.5;
      return `<path d="M${round(cx - 14)} ${round(cy - 8)} q14-12 28 0 v16 h-28z" fill="none" stroke="#b16e37" stroke-width="2" opacity=".85"/>`;
    }).join('');
    const front = `<g data-bench="${id}" class="pew click-seat">
 <path d="M${x} ${round(frontY)} Q${round(x + w / 2)} ${round(frontY + 3)} ${x + w} ${round(frontY)} L${x + w + 4} ${round(frontY + frontH)} H${x - 4}Z" fill="url(#pewFront)" stroke="#723b20" stroke-width="5"/>
 <path d="M${x + 8} ${round(frontY + 8)} H${x + w - 8}" stroke="#f6c381" stroke-width="4"/>
 ${ornaments}
 <path d="M${x + 12} ${frontY + frontH - 5} H${x + w - 12}" stroke="#e9b56a" stroke-opacity=".55" stroke-width="2"/>
 ${[0, 1, 2]
   .map((i) => {
     const cx = x + ((i + 0.5) * w) / 3,
       cy = frontY + frontH * 0.5;
     return `<path d="M${cx} ${cy - 8}v16 m-5-11h10" stroke="#e3b36d" stroke-width="2"/><path d="M${cx - w / 7} ${frontY + 7}v${frontH - 12}h${w / 3.5}v-${frontH - 12}Z" fill="none" stroke="#4d2819" stroke-opacity=".5" stroke-width="2"/>`;
   })
   .join('')}

 <rect x="${x - 5}" y="${round(frontY - 1)}" width="${round(10 + h * 0.2)}" height="${round(frontH + 10)}" rx="7" fill="url(#woodEnd)" stroke="#744023" stroke-width="3"/>
 <rect x="${round(x + w - 8 - h * 0.2)}" y="${round(frontY - 1)}" width="${round(10 + h * 0.2)}" height="${round(frontH + 10)}" rx="7" fill="url(#woodEnd)" stroke="#744023" stroke-width="3"/>
 </g>`;
    return { back, front };
  }

  window.PARISH_PEW = (b, part) =>
    '<svg viewBox="' +
    [b.x - 15, b.y - 30, b.w + 30, b.h + 60].join(' ') +
    '" preserveAspectRatio="none" aria-hidden="true"><defs>' +
    '  <linearGradient id="pewBack" x2="0" y2="1"><stop stop-color="#d09a58"/><stop offset=".22" stop-color="#925027"/><stop offset="1" stop-color="#642e1e"/></linearGradient>\n  <linearGradient id="pewFront" x2="0" y2="1"><stop stop-color="#a95b2b"/><stop offset=".48" stop-color="#8d4523"/><stop offset="1" stop-color="#66351d"/></linearGradient>\n  <linearGradient id="woodEnd" x2="1" y2="0"><stop stop-color="#5e321d"/><stop offset=".55" stop-color="#d08a48"/><stop offset="1" stop-color="#65381d"/></linearGradient>\n' +
    '</defs>' +
    pewArt(b)[part] +
    '</svg>';
})();
