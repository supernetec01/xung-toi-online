import {WORLD,FURNITURE,COLLIDERS} from './geometry.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const round=n=>Math.round(n*10)/10;
function floorArt(){
 let lines='';
 for(let y=423;y<941;y+=24+(y-410)*0.064){
   lines+=`<path d="M 0 ${round(y)} H 1672" stroke="#fff4db" stroke-opacity=".23" stroke-width="2"/>`;
 }
 for(let i=-11;i<=11;i++){
   const x=836+i*87;
   lines+=`<line x1="836" y1="383" x2="${x}" y2="941" stroke="#7c544a" stroke-opacity=".15" stroke-width="2"/>`;
 }
 let aisle='';
 for(const y of [462,508,559,618,686,763,852]){
   const m=(y-403)/(941-403),left=738+(558-738)*m,right=934+(1114-934)*m;
   aisle+=`<path d="M ${round(left)} ${y} H ${round(right)}" stroke="#ffd79a" stroke-width="3" stroke-opacity=".46"/>`;
   const cx=836; aisle+=`<path d="M ${cx} ${y-9} l 8 9 -8 9 -8 -9 z" fill="#f6c971" fill-opacity=".38"/>`;
 }
 return `<rect y="354" width="1672" height="587" fill="url(#stone)"/>
 <path d="M 0 400 Q 836 368 1672 400 L1672 941 H0Z" fill="url(#floor)"/>
 <g>${lines}</g>
 <path d="M738 402 H934 L1114 941 H558Z" fill="url(#carpet)" stroke="#f9dca2" stroke-width="8"/>
 <path d="M749 402 H925 L1092 941 H580Z" fill="none" stroke="#f3b969" stroke-width="3"/>
 <g>${aisle}</g>
 <path d="M 556 394 H1116 L1170 422 H502Z" fill="url(#step)" stroke="#e8d3b1" stroke-width="5"/>
 <path d="M 575 368 H1097 L1128 398 H544Z" fill="url(#step)" stroke="#f6e2bf" stroke-width="3"/>
 <path d="M 606 344 H1066 L1082 369 H590Z" fill="#f2e1c5" stroke="#fff5e3" stroke-width="3"/>
 `;
}
function sideColumn(x,offset=0){
 return `<g transform="translate(${x} ${offset})">
 <path d="M -35 0 Q-46 45 -23 110 V407 H23 V110 Q46 45 35 0Z" fill="url(#pillar)" stroke="#ddbd8f" stroke-width="4"/>
 <path d="M -47 146 H47 L35 168 H-35Z" fill="#f6dfb5" stroke="#e1b47d" stroke-width="3"/>
 <path d="M -42 358 H42 L52 398 H-52Z" fill="#f7e6ca" stroke="#d0a47e" stroke-width="3"/>
 <path d="M -24 30 V358" stroke="#fff" stroke-opacity=".55" stroke-width="7"/>
 </g>`;
}
function stainedWindow(x,side){
 return `<g transform="translate(${x} 70)"><path d="M-45 268 V80 Q0-10 45 80 V268Z" fill="url(#glass)" stroke="#b88253" stroke-width="10"/>
 <path d="M-43 151 H43 M-43 216 H43 M0 30 V265" stroke="#dfb36b" stroke-width="6"/>
 <path d="M-22 140 l17-36 16 36 M16 205 l-12-35-20 35" fill="none" stroke="#ffeabc" stroke-width="6" opacity=".8"/></g>`;
}
function pewArt(bench){
 const {x,y,w,h,id}=bench;const backH=14+h*.24,frontY=y+9,frontH=h*.70;
 const back=`<g data-bench="${id}" class="pew click-seat">
 <ellipse cx="${x+w/2}" cy="${y+h*.86}" rx="${w*.56}" ry="${h*.65}" fill="#57321c" opacity=".23"/>
 <path d="M${x+5} ${y-11} Q${x+w/2} ${y-18} ${x+w-5} ${y-11} L${x+w-2} ${round(y+backH)} H${x+2}Z" fill="url(#pewBack)" stroke="#6a361b" stroke-width="6"/>
 <path d="M${x+10} ${y-9} H${x+w-10}" stroke="#f7bf79" stroke-width="5" opacity=".85"/>
 </g>`;
 const ornaments=Array.from({length:3},(_,i)=>{
  const cx=x+(i+0.5)*w/3,cy=frontY+frontH*.50;
  return `<path d="M${round(cx-14)} ${round(cy-8)} q14-12 28 0 v16 h-28z" fill="none" stroke="#b16e37" stroke-width="2" opacity=".85"/>`;
 }).join('');
 const front=`<g data-bench="${id}" class="pew click-seat">
 <path d="M${x} ${round(frontY)} Q${round(x+w/2)} ${round(frontY+3)} ${x+w} ${round(frontY)} L${x+w+4} ${round(frontY+frontH)} H${x-4}Z" fill="url(#pewFront)" stroke="#723b20" stroke-width="5"/>
 <path d="M${x+8} ${round(frontY+8)} H${x+w-8}" stroke="#f6c381" stroke-width="4"/>
 ${ornaments}
 <rect x="${x-5}" y="${round(frontY-1)}" width="${round(10+h*.20)}" height="${round(frontH+15)}" rx="7" fill="url(#woodEnd)" stroke="#744023" stroke-width="3"/>
 <rect x="${round(x+w-8-h*.20)}" y="${round(frontY-1)}" width="${round(10+h*.20)}" height="${round(frontH+15)}" rx="7" fill="url(#woodEnd)" stroke="#744023" stroke-width="3"/>
 </g>`;
 return {back,front};
}
export function actorMarkup({name='Antony',front=false,shirt='#7fa4c5',kind='player',scale=1}){
 const face=front?`<circle cx="-7" cy="-57" r="2.5" fill="#47363b"/><circle cx="7" cy="-57" r="2.5" fill="#47363b"/><path d="M-5 -48 Q0 -43 5 -48" stroke="#a85b69" stroke-width="2.5" fill="none"/>`:'';
 return `<g class="actor-wrapper" data-actor="${esc(kind)}" transform="scale(${scale})">
 <ellipse cx="0" cy="0" rx="26" ry="8" fill="#3c2b2d" opacity=".18"/>
 <path d="M-12 -24 L-10 -6 M12 -24 L10 -6" stroke="#d3a17d" stroke-width="10" stroke-linecap="round"/>
 <path d="M-15 -3 H-3 M3 -3 H15" stroke="#503a2b" stroke-width="7" stroke-linecap="round"/>
 <path d="M-18 -47 Q0 -57 18 -47 L19 -22 H-19Z" fill="${shirt}" stroke="#5b6776" stroke-width="2"/>
 <path d="M-19 -41 L-25 -25 M19 -41 L25 -25" stroke="#edc4ac" stroke-width="8" stroke-linecap="round"/>
 <ellipse cx="0" cy="-57" rx="21" ry="23" fill="#f5cbae"/>
 <path d="M-23 -61 Q-23 -86 0 -86 Q25 -85 23 -60 L20 -45 Q13 -43 12 -51 L9 -74 Q-9 -74 -11 -58 L-18 -46 Q-27 -48 -23 -61Z" fill="#583d39"/>
 ${face}
 </g>`;
}
export function createChurchSVG(){
 let backs='',fronts='';for(const bench of FURNITURE.benches){const p=pewArt(bench);backs+=p.back;fronts+=p.front;}
 return `<svg id="scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Gian chính nhà thờ 2.5D, bốn hàng ghế mỗi bên và lối đi trung tâm">
 <defs>
  <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#f2dcc1"/><stop offset="1" stop-color="#f7e9d4"/></linearGradient>
  <linearGradient id="pillar"><stop stop-color="#c49368"/><stop offset=".45" stop-color="#fff6e3"/><stop offset="1" stop-color="#e1b781"/></linearGradient>
  <linearGradient id="floor" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fce8cc"/><stop offset=".48" stop-color="#e1b189"/><stop offset="1" stop-color="#fce9ce"/></linearGradient>
  <linearGradient id="stone" x2="0" y2="1"><stop stop-color="#fff2e2"/><stop offset="1" stop-color="#e5c19d"/></linearGradient>
  <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#508fa4"/><stop offset=".35" stop-color="#f2ce87"/><stop offset=".7" stop-color="#d38183"/><stop offset="1" stop-color="#79c2cb"/></linearGradient>
  <linearGradient id="step" x2="0" y2="1"><stop stop-color="#fff1da"/><stop offset="1" stop-color="#cda984"/></linearGradient>
  <linearGradient id="carpet" x2="0" y2="1"><stop stop-color="#ad584f"/><stop offset=".5" stop-color="#a04d4d"/><stop offset="1" stop-color="#9b444b"/></linearGradient>
  <linearGradient id="pewBack" x2="0" y2="1"><stop stop-color="#d09a58"/><stop offset=".22" stop-color="#925027"/><stop offset="1" stop-color="#642e1e"/></linearGradient>
  <linearGradient id="pewFront" x2="0" y2="1"><stop stop-color="#a95b2b"/><stop offset=".48" stop-color="#8d4523"/><stop offset="1" stop-color="#66351d"/></linearGradient>
  <linearGradient id="woodEnd" x2="1" y2="0"><stop stop-color="#5e321d"/><stop offset=".55" stop-color="#d08a48"/><stop offset="1" stop-color="#65381d"/></linearGradient>
  <radialGradient id="daylight"><stop stop-color="#fff9ca" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="softMask" x1="0" x2="0" y1="0" y2="1"><stop stop-color="white" offset=".55"/><stop stop-color="white" offset=".78"/><stop stop-color="black" offset="1"/></linearGradient>
  <mask id="topFade"><rect x="0" y="0" width="1672" height="397" fill="url(#softMask)"/></mask>
 </defs>
 <g id="architecture-static">
  <rect width="1672" height="941" fill="url(#wall)"/>
  <path d="M0 0 Q180 150 300 340 H0Z" fill="#e4c49d" opacity=".75"/>
  <path d="M1672 0 Q1492 150 1372 340 H1672Z" fill="#e4c49d" opacity=".75"/>
  ${[145,300,1372,1527].map((x,i)=>stainedWindow(x,i<2?'left':'right')).join('')}
  <image href="assets/architecture_center.webp" x="510" y="0" width="652" height="385" mask="url(#topFade)"/>
  <path d="M465 0 Q836 130 1207 0" stroke="#fff1d2" stroke-width="28" fill="none" opacity=".78"/>
  ${[90,390,1282,1582].map(x=>sideColumn(x)).join('')}
  <ellipse cx="836" cy="330" rx="480" ry="180" fill="url(#daylight)" opacity=".38"/>
 </g>
 <g id="ground-static">${floorArt()}</g>
 <g id="pews-back">${backs}</g>
 <g id="npc-layer"></g>
 <g id="player-layer"></g>
 <g id="pews-front">${fronts}</g>
 <g id="interaction-layer"></g>
 <g id="collision-layer" visibility="hidden">${COLLIDERS.map(o=>`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="#e83957" fill-opacity=".35" stroke="#ff2b57" stroke-width="2"/><text x="${o.x}" y="${o.y-3}" fill="#ff3863" font-size="13">${esc(o.id)}</text>`).join('')}</g>
 </svg>`;
}
