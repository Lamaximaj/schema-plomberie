(function () {
'use strict';
/* ===== Utilitaires ===== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const GRID = 10;
const snap = v => Math.round(v / GRID) * GRID;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = n => Math.round(n * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm360 = a => ((Math.round(a) % 360) + 360) % 360;
const near = (p, q, t) => { t = t == null ? 0.6 : t; return Math.abs(p.x - q.x) <= t && Math.abs(p.y - q.y) <= t; };
const pkey = p => Math.round(p.x * 10) + ',' + Math.round(p.y * 10);
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
const FONT = 'Arial, Helvetica, "Liberation Sans", sans-serif';
const _mc = document.createElement('canvas').getContext('2d');
function tw(str, size, wt) { _mc.font = (wt || 400) + ' ' + size + 'px ' + FONT; return _mc.measureText(String(str == null ? '' : str)).width; }
function fitText(s, maxW, size, wt) { s = String(s == null ? '' : s); if (tw(s, size, wt) <= maxW) return s; while (s.length > 1 && tw(s + '…', size, wt) > maxW) s = s.slice(0, -1); return s + '…'; }
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return e;
}

/* ===== Primitives de dessin ===== */
const P = (d, a) => `<path d="${d}"${a || ''}/>`;
const Ln = (x1, y1, x2, y2, a) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${a || ''}/>`;
const Ci = (cx, cy, r, a) => `<circle cx="${cx}" cy="${cy}" r="${r}"${a || ''}/>`;
const Re = (x, y, w, hh, a) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}"${a || ''}/>`;
const FILLED = ' fill="currentColor"', NOF = ' fill="none"', THIN = ' stroke-width="1"';
const BOW = P('M-10,-7L-10,7L10,-7L10,7Z');
const BOWV = (y0, y1, w) => { w = w || 4.5; return P(`M${-w},${y0}L${w},${y0}L${-w},${y1}L${w},${y1}Z`); };
const T3 = P('M-10,-7L-10,7L0,0ZM10,-7L10,7L0,0ZM-7,10L7,10L0,0Z');
const ACT = Ln(0, 0, 0, -12) + Re(-7, -22, 14, 10, ' rx="1"');
const FUNNEL = y0 => Ln(0, y0, 0, 15) + P('M-7,19L-2,25L-2,30M7,19L2,25L2,30', NOF);
const stub = (c, i, x1, y1, x2, y2) => Ln(x1, y1, x2, y2, ` stroke="${c.pc(i)}" stroke-width="${c.pw(i)}" stroke-linecap="butt"`);
/* Manomètre intégré à un organe (piqué sur le tuyau du port i, en x) et robinet de purge bouchonné sous un corps */
const MANO_S = (c, i, x) => stub(c, i, x, 0, x, -9) + Ci(x, -14, 5) + Ln(x, -14, r2(x + 2.9), -16.9, ' stroke-width="1.1"') + Ci(x, -14, 0.9, FILLED);
const PURGE = y0 => Ln(0, y0, 0, y0 + 4) + BOWV(y0 + 4, y0 + 13, 4) + Ln(0, y0 + 13, 0, y0 + 16) + Re(-3, y0 + 16, 6, 4.5, ' rx="1"');
/* Émetteur d'impulsions posé sur un compteur */
const EMET = Ln(0, -9, 0, -12, THIN) + Re(-7, -20, 14, 8, ' rx="1"') + P('M-5,-14L-2.5,-14L-2.5,-18L0,-18L0,-14L2.5,-14L2.5,-18L5,-18', NOF + ' stroke-width="0.9"');
const FLAME = 'M0,-9Q9,1 6,9Q4,14 0,14Q-4,14 -6,9Q-8,3 -2,-3Q-1,2 1,3Q1,-3 0,-9Z';
const resNp = el => clamp(Math.round(+el.p.pompe || 0), 0, 2);
const NOCTX = { pc: () => 'currentColor', pw: () => 1.5 };
const IN2 = [[-10, 0], [10, 0]];
const actOf = el => el.p.act || (el.p.mot === false ? 'none' : 'mot');
const colN = el => clamp(Math.round(+el.p.n || 1), 1, 12);
const colE = el => [20, 40, 60, 80, 100, 120, 160, 200].includes(+el.p.esp) ? +el.p.esp : 40;
const colH = el => colN(el) * colE(el) / 2;
const blocW = el => Math.max(40, Math.round((+el.p.w || 80) / 20) * 20);
const blocH = el => Math.max(40, Math.round((+el.p.h || 40) / 20) * 20);
const renvoiW = el => Math.max(40, Math.ceil((tw(el.p.txt || '', 7, 700) + 24) / 10) * 10);

/* ===== Symboles : cat, nom, préfixe de repère, boîte locale, ports, dessin ===== */
const S = {
  vanne: { cat: 'rob', name: "Vanne d'isolement", prefix: 'V', inline: true, box: [-10, -8, 20, 16], ports: IN2,
    params: { nf: { label: 'Normalement fermée (NF)', type: 'check', def: false } },
    draw: el => ({ g: el.p.nf ? P('M-10,-7L-10,7L10,-7L10,7Z', FILLED) : BOW }) },
  vanne_bs: { cat: 'rob', name: 'Vanne ¼ de tour', prefix: 'V', inline: true, box: [-10, -8, 20, 16], ports: IN2, draw: () => ({ g: BOW + Ci(0, 0, 3.6) }) },
  papillon: { cat: 'rob', name: 'Vanne papillon', prefix: 'V', inline: true, box: [-11, -8, 22, 16], ports: IN2,
    draw: (el, c) => ({ g: stub(c, 0, -10, 0, 10, 0) + Ln(-10, -7, -10, 7, ' stroke-width="1.8"') + Ln(10, -7, 10, 7, ' stroke-width="1.8"') + Ln(-4.5, 6, 4.5, -6, ' stroke-width="1.8"') + Ci(0, 0, 1.9, FILLED) }) },
  clapet: { cat: 'rob', name: 'Clapet anti-retour', prefix: 'CL', inline: true, box: [-10, -8, 20, 16], ports: IN2,
    draw: () => ({ g: P('M-10,-7L-10,7L10,0Z') + Ln(10, -7, 10, 7, ' stroke-width="1.9"') }) },
  filtre: { cat: 'rob', name: 'Filtre à tamis', prefix: 'F', inline: true, ports: IN2,
    params: { purge: { label: 'Robinet de purge', type: 'check', def: false } },
    box: el => el.p.purge ? [-10, -10, 20, 40] : [-10, -10, 20, 20],
    draw: el => ({ g: P('M-10,0L0,-9L10,0L0,9Z') + Ln(0, -7.5, 0, 7.5, THIN + ' stroke-dasharray="2 1.5"') + (el.p.purge ? PURGE(9) : '') }) },
  reducteur: { cat: 'rob', name: 'Réducteur de pression', prefix: 'RP', inline: true, tagOn: true, ports: IN2,
    params: { mano: { label: 'Manomètre aval', type: 'check', def: false } },
    box: el => el.p.mano ? [-10, -20, 40, 28] : [-10, -19, 26, 27],
    draw: (el, c) => ({ g: (el.p.mano ? stub(c, 1, 10, 0, 25, 0) + MANO_S(c, 1, 25) : '') + BOW + Ln(0, 0, 0, -11) + P('M-7,-11A7,7 0 0 1 7,-11Z') + P('M6,-15L15,-15L15,-1.5', NOF + THIN + ' stroke-dasharray="2 1.6"') }) },
  equil: { cat: 'rob', name: "Vanne d'équilibrage", prefix: 'VE', inline: true, box: [-10, -9, 20, 18], ports: IN2,
    draw: () => ({ g: BOW + Ln(-8, 8, 4.5, -4.5) + P('M8.5,-8.5L1.8,-5.6L5.6,-1.8Z', FILLED) }) },
  vanne_mot: { cat: 'rob', name: 'Vanne motorisée 2 voies', prefix: 'VM', inline: true, tagOn: true, box: [-10, -23, 20, 31], ports: IN2,
    draw: () => ({ g: BOW + ACT, t: [[0, -17, 'M', 7, 700]] }) },
  electrovanne: { cat: 'rob', name: 'Électrovanne', prefix: 'EV', inline: true, box: [-10, -23, 20, 31], ports: IN2,
    draw: () => ({ g: BOW + ACT + Ln(-7, -12, 7, -22, THIN) }) },
  v3v: { cat: 'rob', name: 'Vanne 3 voies', prefix: 'V3V', inline: true, tagOn: true, ports: [[-10, 0], [10, 0], [0, 10]], pn: ['Voie A', 'Voie AB', 'Voie B'],
    params: { act: { label: 'Actionneur', type: 'select', options: [['mot', 'Servomoteur'], ['therm', 'Tête thermostatique'], ['none', 'Aucun']], def: 'mot' } },
    box: el => actOf(el) === 'none' ? [-10, -8, 20, 19] : [-10, -23, 20, 34],
    draw: el => { const a = actOf(el); return a === 'mot' ? { g: T3 + ACT, t: [[0, -17, 'M', 7, 700]] } : a === 'therm' ? { g: T3 + Ln(0, 0, 0, -10) + Ci(0, -15.5, 5.5), t: [[0, -15.3, 'θ', 7.5, 700]] } : { g: T3 }; } },
  mitigeur: { cat: 'rob', name: 'Mitigeur thermostatique', prefix: 'MT', inline: true, tagOn: true, ports: [[-10, 0], [10, 0], [0, 10]], pn: ['Eau chaude', 'Eau mitigée', 'Eau froide'], box: [-10, -22, 20, 33],
    draw: () => ({ g: T3 + Ln(0, 0, 0, -10) + Ci(0, -15.5, 5.5), t: [[0, -15.3, 'θ', 7.5, 700]] }) },
  vidange: { cat: 'rob', name: 'Robinet de vidange', prefix: 'RV', pin: [0, 1], box: [-5, -1, 10, 30], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, 7) + BOWV(7, 19) + Ln(0, 19, 0, 23) + Re(-3, 23, 6, 5, ' rx="1"') }) },
  reduction: { cat: 'rob', name: 'Réduction', prefix: '', inline: true, box: [-10, -7, 20, 14], ports: IN2, draw: () => ({ g: P('M-10,-6L10,-3L10,3L-10,6Z') }) },
  manchette: { cat: 'rob', name: 'Manchette antivibratile', prefix: 'MA', inline: true, box: [-10, -7, 20, 14], ports: IN2,
    draw: (el, c) => ({ g: Re(-10, -4.5, 20, 9, ' stroke="none"') + P('M-10,0q2.5,-4.5 5,0t5,0t5,0t5,0', NOF + ` stroke="${c.pc(0)}" stroke-width="${Math.min(c.pw(0), 2)}"`) + Ln(-10, -6.5, -10, 6.5, ' stroke-width="1.8"') + Ln(10, -6.5, 10, 6.5, ' stroke-width="1.8"') }) },
  dielec: { cat: 'rob', name: 'Raccord diélectrique', prefix: '', inline: true, box: [-10, -8, 20, 16], ports: IN2,
    draw: (el, c) => ({ g: stub(c, 0, -10, 0, -3, 0) + stub(c, 1, 3, 0, 10, 0) + Re(-3, -4, 6, 8, ' stroke="none"') + Ln(-3, -7, -3, 7, ' stroke-width="1.8"') + Ln(3, -7, 3, 7, ' stroke-width="1.8"') }) },
  bouchon: { cat: 'rob', name: 'Bouchon / attente', prefix: '', box: [-4, -7, 8, 14], ports: [[0, 0]], draw: () => ({ g: Ln(0, -6, 0, 6, ' stroke-width="2.8"') }) },

  disco: { cat: 'secu', name: 'Disconnecteur', prefix: 'DIS', inline: true, tagOn: true, box: [-20, -10, 40, 41], ports: [[-20, 0], [20, 0], [0, 30]], pn: ['Amont', 'Aval', 'Décharge'],
    params: { code: { label: 'Type', type: 'text', def: 'BA', max: 4 } },
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -16, 0) + stub(c, 1, 16, 0, 20, 0) + Re(-16, -9, 32, 18, ' rx="1.5"') + FUNNEL(9), t: [[0, 0.3, el.p.code || '', 7.5, 700]] }) },
  gs: { cat: 'secu', name: 'Groupe de sécurité', prefix: 'GS', inline: true, tagOn: true, box: [-20, -9, 40, 40], ports: [[-20, 0], [20, 0], [0, 30]], pn: ['Entrée', 'Sortie', 'Évacuation'],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -14, 0) + stub(c, 1, 14, 0, 20, 0) + Re(-14, -8, 28, 16, ' rx="2"') + FUNNEL(8), t: [[0, 0.3, 'GS', 7, 700]] }) },
  soupape: { cat: 'secu', name: 'Soupape de sécurité', prefix: 'SS', tagOn: true, box: [-8, -19, 18, 29], ports: [[0, 10], [10, 0]], pn: ['Entrée', 'Échappement'],
    draw: () => ({ g: P('M-7,10L7,10L0,0Z') + P('M10,-7L10,7L0,0Z') + P('M0,0L0,-4L-4,-6L4,-9.5L-4,-13L4,-16.5L0,-18.5', NOF + THIN) }) },
  vase: { cat: 'secu', name: "Vase d'expansion", prefix: 'VX', tagOn: true, pin: [0, 1], box: [-12, -1, 24, 46], ports: [[0, 0]],
    params: { txt: { label: 'Pression de gonflage', type: 'text', def: '', max: 8 } },
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, 10) + Re(-12, 10, 24, 34, ' rx="11" ry="9"') + P('M-12,27q3,-3 6,0t6,0t6,0t6,0', NOF + THIN), t: el.p.txt ? [[0, 35.5, el.p.txt, 5.5, 700]] : [] }) },
  purgeur: { cat: 'secu', name: "Purgeur d'air automatique", prefix: 'PA', pin: [0, -1], box: [-6, -22, 12, 23], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -5) + Re(-5, -14, 10, 9, ' rx="1.5"') + Ln(0, -14, 0, -20) + P('M-2.6,-17.4L0,-20.6L2.6,-17.4', NOF) }) },
  desemb: { cat: 'secu', name: 'Pot à boue / désemboueur', prefix: 'PB', inline: true, box: [-10, -9, 20, 40], ports: [[-10, 0], [10, 0], [0, 30]], pn: ['Entrée', 'Sortie', 'Vidange'],
    draw: (el, c) => ({ g: Re(-10, -8, 20, 30, ' rx="4"') + Ln(0, -4, 0, 18, THIN + ' stroke-dasharray="2 1.5"') + stub(c, 2, 0, 22, 0, 30) }) },
  doseur: { cat: 'secu', name: 'Doseur polyphosphates', prefix: 'DP', inline: true, box: [-10, -6, 20, 36], ports: IN2,
    draw: () => ({ g: Re(-10, -5, 20, 10, ' rx="1.5"') + Re(-7, 5, 14, 24, ' rx="5"') + Ln(-4, 12, 4, 12, THIN) + Ln(-4, 17, 4, 17, THIN) + Ln(-4, 22, 4, 22, THIN) }) },
  entonnoir: { cat: 'secu', name: 'Entonnoir siphonné', prefix: '', box: [-10, -26, 20, 26], ports: [[0, 0]],
    draw: (el, c) => ({ g: P('M-9,-25L-2,-14L2,-14L9,-25', NOF) + stub(c, 0, 0, -14, 0, 0) }) },

  mano: { cat: 'mes', name: 'Manomètre', prefix: 'M', pin: [0, -1], box: [-8, -28, 16, 29], ports: [[0, 0]],
    params: { rob: { label: 'Robinet de manomètre', type: 'check', def: false }, siphon: { label: 'Siphon (vapeur)', type: 'check', def: false } },
    draw: (el, c) => ({ g: (el.p.siphon ? stub(c, 0, 0, 0, 0, -2) + P('M0,-2C-8,-2 -8,-10 0,-10L0,-12', NOF) : stub(c, 0, 0, 0, 0, -12) + (el.p.rob ? BOWV(-11, -3, 3.6) : '')) + Ci(0, -20, 8) + Ln(0, -20, 4.6, -24.6, ' stroke-width="1.3"') + Ci(0, -20, 1.3, FILLED) }) },
  thermo: { cat: 'mes', name: 'Thermomètre', prefix: 'T', pin: [0, -1], box: [-8, -28, 16, 29], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -12) + Ci(0, -20, 8) + Ln(0, -25.5, 0, -18.5, ' stroke-width="1.5"') + Ci(0, -17, 2.1, FILLED) }) },
  thmano: { cat: 'mes', name: 'Thermomanomètre', prefix: 'TM', pin: [0, -1], box: [-8, -28, 16, 29], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -12) + Ci(0, -20, 8) + Ln(1, -20, 5, -24.4, ' stroke-width="1.3"') + Ci(1, -20, 1.1, FILLED) + Ln(-3.6, -25, -3.6, -19.5, ' stroke-width="1.3"') + Ci(-3.6, -18, 1.7, FILLED) }) },
  sonde: { cat: 'mes', name: 'Sonde de température', prefix: 'ST', pin: [0, -1], box: [-6, -20, 12, 21], ports: [[0, 0]],
    params: { txt: { label: 'Grandeur', type: 'text', def: 'T', max: 3 } },
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -8) + Ci(0, -14, 6), t: [[0, -13.8, el.p.txt || '', 6.5, 700]] }) },
  compteur: { cat: 'mes', name: "Compteur d'eau", prefix: 'C', inline: true, tagOn: true, ports: [[-20, 0], [20, 0]],
    params: { txt: { label: 'Inscription', type: 'text', def: 'm³', max: 5 }, emet: { label: 'Émetteur d’impulsions (télérelève)', type: 'check', def: false } },
    box: el => el.p.emet ? [-20, -21, 40, 31] : [-20, -10, 40, 20],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -13, 0) + stub(c, 1, 13, 0, 20, 0) + Re(-13, -9, 26, 18, ' rx="1.5"') + (el.p.emet ? EMET : ''), t: [[0, 0.3, el.p.txt || '', 7, 700]] }) },
  regul: { cat: 'mes', name: 'Régulateur / automate', prefix: 'REG', tagOn: true, box: [-20, -20, 40, 40], ports: [[-20, 0], [20, 0], [0, -20], [0, 20]],
    draw: () => ({ g: Re(-20, -20, 40, 40, ' rx="2.5"') + Re(-14, -14, 28, 13, ' rx="1"') + P('M-11,-6L-6,-6L-3,-11L1,-4L4,-9L11,-9', NOF + THIN), t: [[0, 9, 'RÉGUL.', 6, 700]] }) },

  pompe: { cat: 'pompes', name: 'Circulateur / pompe', prefix: 'P', inline: true, tagOn: true, ports: IN2,
    params: { vv: { label: 'Vitesse variable (variateur)', type: 'check', def: false } },
    box: el => el.p.vv ? [-14, -14, 28, 28] : [-10, -10, 20, 20],
    draw: el => ({ g: Ci(0, 0, 10) + P('M-4.5,-6.2L-4.5,6.2L7.5,0Z', FILLED) + (el.p.vv ? Ln(-12.5, 12.5, 10, -10, THIN) + P('M13,-13L6.4,-11.2L11.2,-6.4Z', FILLED) : '') }) },
  pompe2: { cat: 'pompes', name: 'Circulateur double', prefix: 'P', inline: true, tagOn: true, box: [-20, -12, 40, 24], ports: [[-20, 0], [20, 0]],
    draw: () => ({ g: Re(-20, -12, 40, 24, ' rx="4"') + Ci(-9, 0, 7) + Ci(9, 0, 7) + P('M-12,-4.2L-12,4.2L-4.5,0Z', FILLED) + P('M6,-4.2L6,4.2L13.5,0Z', FILLED) }) },
  surpresseur: { cat: 'pompes', name: 'Groupe de surpression', prefix: 'SUR', tagOn: true, box: [-40, -26, 80, 52], ports: [[-40, 0], [40, 0]], pn: ['Aspiration', 'Refoulement'],
    draw: (el, c) => {
      let g = stub(c, 0, -40, 0, -30, 0) + stub(c, 1, 30, 0, 40, 0) + Re(-30, -26, 60, 52, ' rx="3"') + Ln(-30, 0, -22, 0, THIN) + Ln(22, 0, 30, 0, THIN) + Ln(-22, -12, -22, 12, THIN) + Ln(22, -12, 22, 12, THIN);
      for (const y of [-12, 12]) g += Ln(-22, y, -6, y, THIN) + Ln(6, y, 22, y, THIN) + Ci(0, y, 6) + P(`M-2.6,${y - 3.6}L-2.6,${y + 3.6}L4.2,${y}Z`, FILLED);
      return { g };
    } },

  chaudiere: { cat: 'equip', name: 'Chaudière', prefix: 'CH', tagOn: true, box: [-30, -40, 60, 80], ports: [[30, -30], [30, 30], [0, 40], [0, -40]], pn: ['Départ', 'Retour', 'Combustible', 'Conduit de fumée'],
    params: { txt: { label: 'Énergie', type: 'text', def: 'Gaz', max: 14 } },
    draw: el => ({ g: Re(-30, -40, 60, 80, ' rx="3"') + P(FLAME, ' transform="translate(0,1)"'), t: [[0, -27, 'CHAUDIÈRE', 7, 700], [0, 28, el.p.txt || '', 7, 400]] }) },
  pac: { cat: 'equip', name: 'Pompe à chaleur', prefix: 'PAC', tagOn: true, box: [-30, -30, 60, 60], ports: [[30, -20], [30, 20]], pn: ['Départ', 'Retour'],
    draw: () => { let g = Re(-30, -30, 60, 60, ' rx="3"') + Ci(0, 5, 15); for (const a of [0, 120, 240]) g += P('M0,5C-3,-1 -2,-8 3,-9.5C6,-4 4.5,1 0,5Z', ` transform="rotate(${a} 0 5)"`); return { g: g + Ci(0, 5, 2.2, FILLED), t: [[0, -21, 'PAC', 7, 700]] }; } },
  ballon: { cat: 'equip', name: 'Préparateur ECS', prefix: 'B', tagOn: true, box: [-30, -60, 60, 120], ports: [[-30, -40], [-30, 0], [-30, 40], [30, -20], [30, 40], [0, 60]],
    pn: ['Eau chaude (départ)', 'Bouclage', 'Eau froide', 'Primaire entrée', 'Primaire sortie', 'Vidange'],
    params: { coil: { label: 'Type', type: 'select', options: [['serp', 'Serpentin (préparateur)'], ['res', 'Résistance électrique'], ['none', 'Stockage seul']], def: 'serp' }, txt: { label: 'Inscription', type: 'text', def: 'ECS', max: 10 } },
    draw: (el, c) => {
      let g = Re(-30, -60, 60, 120, ' rx="30" ry="14"');
      if (el.p.coil === 'serp') { const pts = [[30, -20], [14, -20]]; for (let i = 1; i <= 7; i++) pts.push([i % 2 ? -6 : 14, -20 + i * 7.5]); pts.push([14, 40], [30, 40]); g += P('M' + pts.map(p => p.join(',')).join('L'), NOF + ` stroke="${c.pc(3)}" stroke-width="1.6"`); }
      else if (el.p.coil === 'res') g += P('M30,40L16,40L13,35L9,45L5,35L1,45L-3,35L-6,40L-12,40', NOF + THIN);
      return { g, t: el.p.txt ? [[0, -34, el.p.txt, 8, 700]] : [] };
    } },
  echangeur: { cat: 'equip', name: 'Échangeur à plaques', prefix: 'ECH', tagOn: true, box: [-20, -30, 40, 60], ports: [[-20, -20], [-20, 20], [20, -20], [20, 20]], pn: ['Primaire entrée', 'Primaire sortie', 'Secondaire sortie', 'Secondaire entrée'],
    draw: () => { let g = Re(-20, -30, 40, 60, ' rx="2"'); for (let x = -12; x <= 12; x += 6) g += Ln(x, -26, x, 26, THIN); return { g }; } },
  bouteille: { cat: 'equip', name: 'Bouteille de découplage', prefix: 'BD', tagOn: true, box: [-10, -60, 20, 120], ports: [[-10, -30], [-10, 30], [10, -30], [10, 30], [0, -60], [0, 60]],
    pn: ['Primaire départ', 'Primaire retour', 'Secondaire départ', 'Secondaire retour', 'Purge', 'Vidange'], draw: () => ({ g: Re(-10, -60, 20, 120, ' rx="10" ry="8"') }) },
  collecteur: { cat: 'equip', name: 'Collecteur / nourrice', prefix: 'COL', tagOn: true,
    params: { n: { label: 'Nombre de départs', type: 'number', def: 3, min: 1, max: 12 }, esp: { label: 'Entraxe des départs', type: 'select', options: [['20', '20'], ['40', '40'], ['60', '60'], ['80', '80'], ['100', '100'], ['120', '120'], ['160', '160'], ['200', '200']], def: '40' } },
    box: el => { const H = colH(el); return [-H, -10, 2 * H, 15]; },
    ports: el => { const H = colH(el), n = colN(el), e = colE(el), a = [[-H, 0], [H, 0]]; for (let i = 0; i < n; i++) a.push([(i - (n - 1) / 2) * e, -10]); return a; },
    draw: (el, c) => { const H = colH(el), n = colN(el), e = colE(el); let g = Re(-H, -5, 2 * H, 10, ' rx="2"'); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * e; g += stub(c, i + 2, x, -5, x, -10); } return { g }; } },
  adoucisseur: { cat: 'equip', name: 'Adoucisseur', prefix: 'ADO', tagOn: true, box: [-30, -40, 60, 80], ports: [[-20, -40], [0, -40], [-30, -30]], pn: ['Entrée', 'Sortie', 'Rejet à l’égout'],
    draw: (el, c) => ({ g: stub(c, 0, -20, -40, -20, -36) + stub(c, 1, 0, -40, 0, -36) + stub(c, 2, -30, -30, -24, -30) + Re(-24, -36, 28, 12, ' rx="2"') + Re(-19, -24, 18, 62, ' rx="9" ry="6"') + Re(8, -10, 20, 48, ' rx="2"') + P('M4,-30L18,-30L18,-10', NOF + THIN) + P('M8,2q2.5,-2 5,0t5,0t5,0t5,0', NOF + THIN), t: [[18, 22, 'SEL', 5.5, 700]] }) },
  reservoir: { cat: 'equip', name: 'Bâche / réservoir', prefix: 'BAC', tagOn: true, box: [-40, -30, 80, 60],
    params: { pompe: { label: 'Pompe de relevage immergée', type: 'select', options: [['0', 'Aucune'], ['1', '1 pompe'], ['2', '2 pompes (normal / secours)']], def: '0' } },
    ports: el => { const a = [[-40, -20], [40, -20], [-40, 20], [40, 20], [0, -30], [0, 30]]; if (resNp(el)) a.push([20, -30]); return a; },
    draw: (el, c) => {
      const np = resNp(el); let g = Re(-40, -30, 80, 60, ' rx="2"') + P('M-40,-14q5,-3 10,0t10,0t10,0t10,0t10,0t10,0t10,0t10,0', NOF + THIN) + P('M-4,-22L4,-22L0,-16Z', NOF + THIN);
      if (np) g += stub(c, 6, 20, 14, 20, -30) + Ci(20, 20, 6) + P('M16.8,23L23.2,23L20,16.5Z', FILLED);
      if (np === 2) g += Ln(-20, 14, -20, 4, THIN) + Ln(-20, 4, 20, 4, THIN) + Ci(-20, 20, 6) + P('M-23.2,23L-16.8,23L-20,16.5Z', FILLED);
      return { g, t: np === 2 ? [[-24.5, 9, 'S', 5, 700], [24.5, 9, 'N', 5, 700]] : [] };
    } },
  emetteur: { cat: 'equip', name: 'Radiateur / émetteurs', prefix: 'R', box: [-30, -15, 60, 35], ports: [[-20, 20], [20, 20]], pn: ['Aller', 'Retour'],
    draw: (el, c) => { let g = stub(c, 0, -20, 15, -20, 20) + stub(c, 1, 20, 15, 20, 20) + Re(-30, -15, 60, 30, ' rx="2"'); for (let x = -20; x <= 20; x += 10) g += Ln(x, -11, x, 11, THIN); return { g }; } },
  bloc: { cat: 'equip', name: 'Bloc équipement', prefix: 'EQ', nolegend: true,
    params: { txt: { label: 'Texte', type: 'area', def: 'Équipement' }, w: { label: 'Largeur', type: 'number', def: 80, min: 40, max: 800, step: 20 }, h: { label: 'Hauteur', type: 'number', def: 40, min: 40, max: 800, step: 20 } },
    box: el => { const w = blocW(el), hh = blocH(el); return [-w / 2, -hh / 2, w, hh]; },
    ports: el => { const w = blocW(el) / 2, hh = blocH(el) / 2, a = []; for (let x = -Math.floor((w - 1) / 20) * 20; x < w; x += 20) a.push([x, -hh], [x, hh]); for (let y = -Math.floor((hh - 1) / 20) * 20; y < hh; y += 20) a.push([-w, y], [w, y]); return a; },
    draw: el => { const w = blocW(el), hh = blocH(el), lines = String(el.p.txt || '').split('\n'); return { g: Re(-w / 2, -hh / 2, w, hh, ' rx="3"'), t: lines.map((s, i) => [0, (i - (lines.length - 1) / 2) * 10, s, 8, 700]) }; } },
  renvoi: { cat: 'annot', name: 'Renvoi de liaison', prefix: '', nolegend: true, nonomen: true, ports: [[0, 0]],
    params: { txt: { label: 'Texte', type: 'text', def: 'Vers…', max: 40 }, sens: { label: 'Sens', type: 'select', options: [['dep', 'Départ (sortant)'], ['arr', 'Arrivée (entrant)']], def: 'dep' } },
    box: el => [0, -9, renvoiW(el), 18],
    draw: el => { const w = renvoiW(el), arr = el.p.sens === 'arr'; return { g: P(arr ? `M0,0L9,-9L${w},-9L${w},9L9,9Z` : `M0,-9L${w - 9},-9L${w},0L${w - 9},9L0,9Z`), t: [[arr ? (w + 9) / 2 : (w - 9) / 2, 0.3, el.p.txt || '', 7, 700]] }; } },
};

/* ===== Composants ajoutés d’après les CCTP lots 12 (chauffage, ventilation) et 13 (plomberie) ===== */
const ACTT = Ln(0, 0, 0, -10) + Ci(0, -15.5, 5.5);
const FAN = (cx, cy, r) => Ci(cx, cy, r) + P(`M${cx},${cy}C${r2(cx + r * 0.35)},${r2(cy - r * 0.85)} ${r2(cx + r * 0.85)},${r2(cy - r * 0.35)} ${cx},${cy}ZM${cx},${cy}C${r2(cx - r * 0.35)},${r2(cy + r * 0.85)} ${r2(cx - r * 0.85)},${r2(cy + r * 0.35)} ${cx},${cy}Z`, FILLED);
const BLADE = ' stroke-width="1.8"';
Object.assign(S, {
  vanne_sp: { cat: 'rob', name: 'Robinet à soupape', prefix: 'V', inline: true, box: [-10, -8, 20, 16], ports: IN2, draw: () => ({ g: BOW + Ci(0, 0, 2.6, FILLED) }) },
  vtherm: { cat: 'rob', name: 'Vanne thermostatique', prefix: 'VT', inline: true, box: [-10, -22, 20, 30], ports: IN2, draw: () => ({ g: BOW + ACTT, t: [[0, -15.3, 'θ', 7.5, 700]] }) },
  decharge: { cat: 'rob', name: 'Vanne de décharge à pression différentielle', prefix: 'VDP', inline: true, box: [-10, -22, 26, 30], ports: IN2,
    draw: () => ({ g: BOW + P('M0,0L0,-4L-4,-6L4,-9.5L-4,-13L4,-16.5L0,-18.5', NOF + THIN) + Ln(-5, -20, 5, -20), t: [[12, -13, 'ΔP', 6, 700]] }) },
  clapet_ap: { cat: 'rob', name: 'Clapet anti-pollution', prefix: 'CL', inline: true, box: [-10, -20, 20, 28], ports: IN2,
    params: { code: { label: 'Type', type: 'text', def: 'EA', max: 3 } },
    draw: el => ({ g: P('M-10,-7L-10,7L10,0Z') + Ln(10, -7, 10, 7, ' stroke-width="1.9"') + Re(-8, -19, 16, 9, ' rx="1"'), t: [[0, -14.4, el.p.code || '', 6, 700]] }) },
  clapet2: { cat: 'rob', name: 'Double clapet anti-pollution', prefix: 'CL', inline: true, box: [-20, -8, 40, 16], ports: [[-20, 0], [20, 0]],
    draw: () => ({ g: P('M-20,-7L-20,7L0,0Z') + P('M0,-7L0,7L20,0Z') + Ln(0, -7, 0, 7, ' stroke-width="1.9"') + Ln(20, -7, 20, 7, ' stroke-width="1.9"') }) },
  compensateur: { cat: 'rob', name: 'Compensateur de dilatation', prefix: 'CD', inline: true, box: [-10, -8, 20, 16], ports: IN2,
    draw: () => ({ g: Re(-10, -5, 20, 10, ' stroke="none"') + P('M-10,-5L-7,-7.5L-4,-5L-1,-7.5L2,-5L5,-7.5L8,-5L10,-5M-10,5L-7,7.5L-4,5L-1,7.5L2,5L5,7.5L8,5L10,5', NOF + THIN) + Ln(-10, -7.5, -10, 7.5, ' stroke-width="1.8"') + Ln(10, -7.5, 10, 7.5, ' stroke-width="1.8"') }) },
  manch_cpt: { cat: 'rob', name: 'Manchette pour compteur', prefix: '', inline: true, box: [-20, -10, 40, 20], ports: [[-20, 0], [20, 0]],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, 20, 0) + Re(-13, -9, 26, 18, ' rx="1.5" fill="none" stroke-dasharray="3 2"') }) },
  puisage: { cat: 'rob', name: 'Robinet de puisage', prefix: 'RPU', pin: [0, 1], box: [-5, -1, 15, 32], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, 7) + BOWV(7, 19) + P('M0,19L0,24Q0,28 4,28L9,28', NOF) + Ln(6.5, 25.5, 6.5, 30.5, THIN) + Ln(8.5, 25.5, 8.5, 30.5, THIN) }) },
  echantillon: { cat: 'rob', name: "Robinet de prise d'échantillon", prefix: 'PE', pin: [0, 1], box: [-5, -1, 15, 28], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, 6) + BOWV(6, 16, 4) + Ci(0, 11, 1.8, FILLED) + P('M0,16L0,21Q0,25 4,25L9,25', NOF) }) },
  purg_vap: { cat: 'rob', name: 'Purgeur vapeur', prefix: 'PV', inline: true, box: [-10, -10, 20, 20], ports: IN2, draw: () => ({ g: Ci(0, 0, 9), t: [[0, 0.3, 'T', 8, 700]] }) },
  antibelier: { cat: 'secu', name: 'Anti-bélier', prefix: 'AB', pin: [0, -1], box: [-8, -36, 16, 37], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -8) + Re(-7, -34, 14, 26, ' rx="7" ry="5"') + P('M-7,-19q1.75,-2.5 3.5,0t3.5,0t3.5,0t3.5,0', NOF + THIN), t: [[0, -26.5, 'AB', 5.5, 700]] }) },
  purge_man: { cat: 'secu', name: 'Purge manuelle', prefix: 'PM', pin: [0, -1], box: [-6, -17, 12, 18], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -4) + BOWV(-14, -4, 4) + Ln(-5, -15.5, 5, -15.5, ' stroke-width="1.8"') }) },
  pot_intro: { cat: 'secu', name: "Pot d'introduction", prefix: 'PI', tagOn: true, box: [-10, -32, 20, 52], ports: [[-10, 10], [10, 10], [0, 20]], pn: ['Entrée', 'Sortie', 'Vidange'],
    draw: () => ({ g: Re(-10, -24, 20, 44, ' rx="3"') + Re(-6, -28, 12, 4) + Ln(0, -28, 0, -31) + Ln(-7, -31, 7, -31, ' stroke-width="1.8"') + Ln(-6, -4, 6, -4, THIN + ' stroke-dasharray="2 1.5"') }) },
  pompier: { cat: 'secu', name: 'Raccord pompier', prefix: 'CS', pin: [0, 1], box: [-9, -1, 18, 31], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, 6) + BOWV(6, 16) + Ln(0, 16, 0, 19) + Ci(0, 24, 5) + Ln(-8.5, 24, -5, 24, BLADE) + Ln(5, 24, 8.5, 24, BLADE) + Ci(0, 24, 1.6, FILLED) }) },
  prise_p: { cat: 'mes', name: 'Prise de pression', prefix: 'PP', pin: [0, -1], box: [-5, -16, 10, 17], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -6) + Re(-3, -10, 6, 4) + Ci(0, -12.8, 2.6, FILLED) }) },
  sonde_ext: { cat: 'mes', name: 'Sonde de température extérieure', prefix: 'STE', box: [-10, -13, 20, 23], ports: [[0, 10]],
    draw: (el, c) => ({ g: Re(-9, -8, 18, 12, ' rx="2"') + P('M-9,-8L-4,-12L4,-12L9,-8', NOF + THIN) + stub(c, 0, 0, 4, 0, 10), t: [[0, -2, 'θe', 6.5, 700]] }) },
  armoire: { cat: 'mes', name: 'Armoire électrique', prefix: 'AE', tagOn: true, box: [-20, -30, 40, 60], ports: [[-20, 0], [20, 0], [0, -30], [0, 30]],
    draw: () => ({ g: Re(-20, -30, 40, 60, ' rx="2"') + Ln(-14, -22, 14, -22, THIN) + P('M3,-14L-5,2L1,2L-3,16L7,-2L1,-2L5,-14Z', FILLED) }) },
  relevage: { cat: 'equip', name: 'Poste de relevage', prefix: 'PR', tagOn: true, box: [-30, -30, 60, 61], pn: ['Arrivée', 'Refoulement', 'Évent'],
    params: { np: { label: 'Pompes', type: 'select', options: [['1', '1 pompe'], ['2', '2 pompes (normal / secours)']], def: '1' }, event: { label: 'Évent en partie haute', type: 'check', def: false } },
    ports: el => el.p.event ? [[-30, -10], [10, -30], [-20, -30]] : [[-30, -10], [10, -30]],
    draw: (el, c) => { let g = (el.p.event ? Ln(-24, -20, 24, -20) + stub(c, 2, -20, -20, -20, -30) : '') + stub(c, 0, -30, -10, -24, -10) + P('M-24,-20L-24,30L24,30L24,-20') + P('M-24,0q3,-2.5 6,0t6,0t6,0t6,0t6,0t6,0t6,0t6,0', NOF + THIN) + stub(c, 1, 10, 14, 10, -30) + Ci(10, 20, 6) + P('M6.8,23L13.2,23L10,16.5Z', FILLED);
      if (String(el.p.np) === '2') g += Ln(-10, 14, -10, -8, THIN) + Ln(-10, -8, 10, -8, THIN) + Ci(-10, 20, 6) + P('M-13.2,23L-6.8,23L-10,16.5Z', FILLED);
      return { g, t: String(el.p.np) === '2' ? [[-10, 4.5, 'S', 5, 700], [10, 4.5, 'N', 5, 700]] : [] }; } },
  pompe_cond: { cat: 'pompes', name: 'Pompe de relevage des condensats', prefix: 'PRC', tagOn: true, box: [-20, -10, 40, 27], ports: [[-20, 0], [10, -10]], pn: ['Arrivée des condensats', 'Refoulement'],
    draw: (el, c) => ({ g: Re(-20, -6, 40, 22, ' rx="2"') + P('M-20,6q2.5,-2 5,0t5,0t5,0t5,0t5,0t5,0t5,0t5,0', NOF + THIN) + Ln(-11, -6, -11, 4, THIN) + Ci(-11, 6.5, 2.5) + Ln(10, 3, 10, -6, THIN) + stub(c, 1, 10, -6, 10, -10) + Ci(10, 8, 5) + P('M7.3,10.6L12.7,10.6L10,5.2Z', FILLED) }) },
  squid: { cat: 'equip', name: 'Sous-station vapeur / eau', prefix: 'SST', tagOn: true, box: [-40, -40, 80, 80], ports: [[-40, -20], [-40, 20], [40, -20], [40, 20]], pn: ['Vapeur (arrivée CPCU)', 'Condensats', 'Départ eau chaude', 'Retour eau chaude'],
    draw: (el, c) => ({ g: Re(-40, -40, 80, 80, ' rx="3"') + Ln(0, -26, 0, 26, THIN + ' stroke-dasharray="3 2"') + P('M-40,-20L-18,-20L-6,-12L-18,-4L-6,4L-18,12L-18,20L-40,20', NOF + ` stroke="${c.pc(0)}" stroke-width="1.6"`) + P('M40,-20L14,-20L14,20L40,20', NOF + ` stroke="${c.pc(2)}" stroke-width="1.6"`), t: [[0, -32, 'VAPEUR / EAU', 6.5, 700], [0, 33, 'CPCU', 6.5, 400]] }) },
  sanitaire: { cat: 'sani', name: 'Appareil sanitaire', prefix: '', box: [-15, -10, 30, 30], ports: [[-10, -10], [10, -10], [0, 20]], pn: ['Eau froide', 'Eau chaude', 'Évacuation'],
    params: { kind: { label: 'Appareil', type: 'select', options: [['lavabo', 'Lavabo'], ['wc', 'WC'], ['douche', 'Douche'], ['evier', 'Évier'], ['ll', 'Lave-linge'], ['bac', 'Bac à laver'], ['poste', 'Poste d’eau']], def: 'lavabo' } },
    draw: (el, c) => {
      const k = el.p.kind; let g = stub(c, 0, -10, -10, -10, -6) + (k === 'wc' ? '' : stub(c, 1, 10, -10, 10, -6)) + stub(c, 2, 0, 14, 0, 20);
      if (k === 'wc') g += Re(-12, -6, 24, 6, ' rx="1"') + P('M-9,0L9,0Q9,14 0,14Q-9,14 -9,0Z');
      else if (k === 'douche') g += Re(-13, -6, 26, 20) + Ln(-13, -6, 13, 14, THIN) + Ln(13, -6, -13, 14, THIN) + Ci(0, 4, 2, FILLED);
      else if (k === 'evier') g += Re(-14, -6, 28, 20) + Re(-11, -3, 10, 13, ' rx="2"') + Re(1, -3, 10, 13, ' rx="2"');
      else if (k === 'll') g += Re(-12, -6, 24, 20, ' rx="2"') + Ci(0, 5, 6);
      else if (k === 'bac') g += Re(-14, -6, 28, 20) + Re(-10, -2, 20, 12, ' rx="2"');
      else if (k === 'poste') g += Re(-12, -6, 24, 20) + BOWV(-1, 9, 3.5);
      else g += P('M-14,-6L14,-6Q14,14 0,14Q-14,14 -14,-6Z') + Ci(0, 5, 1.6, FILLED);
      return { g };
    } },
  siphon_sol: { cat: 'sani', name: 'Siphon de sol', prefix: 'SDS', box: [-9, -9, 18, 19], ports: [[0, 10]],
    params: { kind: { label: 'Type', type: 'select', options: [['siphon', 'Siphon de sol'], ['puisard', 'Puisard']], def: 'siphon' } },
    draw: (el, c) => ({ g: (el.p.kind === 'puisard' ? Re(-9, -9, 18, 17) + Ln(-9, -9, 9, 8, THIN) + Ln(9, -9, -9, 8, THIN) : Ci(0, 0, 8) + Ln(-5.6, -5.6, 5.6, 5.6, THIN) + Ln(5.6, -5.6, -5.6, 5.6, THIN)) + stub(c, 0, 0, 8, 0, 10) }) },
  cta: { cat: 'aero', name: 'Centrale de traitement d’air double flux', prefix: 'CTA', tagOn: true, box: [-60, -30, 120, 60], ports: [[-60, -20], [-60, 20], [60, -20], [60, 20], [0, -30], [20, -30], [10, 30]],
    pn: ['Air neuf', 'Air rejeté', 'Air soufflé', 'Air repris', 'Batterie aller', 'Batterie retour', 'Évacuation des condensats'],
    draw: (el, c) => ({ g: Re(-60, -30, 120, 60, ' rx="2"') + Ln(-60, 0, 60, 0, THIN) + Re(-53, -27, 7, 24) + Ln(-53, -27, -46, -3, THIN) + Re(-32, -27, 24, 54) + Ln(-32, -27, -8, 27, THIN) + Ln(-8, -27, -32, 27, THIN)
      + stub(c, 4, 0, -30, 0, -27) + stub(c, 5, 20, -30, 20, -27) + Re(-2, -27, 24, 24) + P('M1,-6L5,-24L9,-6L13,-24L17,-6L21,-24', NOF + THIN) + FAN(42, -15, 10) + FAN(-45, 15, 10) + Re(46, 3, 7, 24) + Ln(46, 3, 53, 27, THIN)
      + stub(c, 6, 10, 0, 10, 30) + Re(-2, -3, 24, 3, THIN), t: [] }) },
  caisson: { cat: 'aero', name: 'Caisson d’extraction', prefix: 'CE', tagOn: true, box: [-30, -20, 60, 40], ports: [[-30, 0], [30, 0]], pn: ['Aspiration', 'Refoulement'],
    draw: () => ({ g: Re(-30, -20, 60, 40, ' rx="2"') + FAN(0, 0, 12) }) },
  pac_air: { cat: 'aero', name: 'PAC sur air extrait', prefix: 'PAC', tagOn: true, box: [-40, -30, 80, 60], ports: [[-40, 0], [40, 0], [-10, 30], [10, 30]], pn: ['Air extrait (entrée)', 'Air rejeté', 'Eau chaude départ', 'Eau chaude retour'],
    draw: () => ({ g: Re(-40, -30, 80, 60, ' rx="3"') + FAN(-17, 2, 11) + Re(4, -10, 26, 24, ' rx="2"') + Ln(8, -4, 26, -4, THIN) + Ln(8, 2, 26, 2, THIN) + Ln(8, 8, 26, 8, THIN), t: [[0, -21, 'PAC AIR EXTRAIT', 6, 700]] }) },
  ventilo: { cat: 'aero', name: 'Ventilateur de désenfumage', prefix: 'VDF', tagOn: true, inline: true, box: [-20, -14, 40, 28], ports: [[-20, 0], [20, 0]],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -13, 0) + stub(c, 1, 13, 0, 20, 0) + FAN(0, 0, 13) }) },
  batterie: { cat: 'aero', name: 'Batterie à eau chaude', prefix: 'BC', inline: true, tagOn: true, box: [-20, -10, 40, 30], ports: [[-20, 0], [20, 0], [-10, 20], [10, 20]], pn: ['Air amont', 'Air aval', 'Eau aller', 'Eau retour'],
    draw: (el, c) => ({ g: stub(c, 2, -10, 9, -10, 20) + stub(c, 3, 10, 9, 10, 20) + Re(-14, -9, 28, 18) + P('M-11,6L-6,-6L-1,6L4,-6L9,6', NOF + THIN) }) },
  filtre_air: { cat: 'aero', name: 'Filtre à air', prefix: 'FA', inline: true, box: [-10, -10, 20, 20], ports: IN2,
    draw: () => ({ g: Re(-6, -9, 12, 18) + P('M-6,-9L1,-4.5L-6,0L1,4.5L-6,9', NOF + THIN) }) },
  registre: { cat: 'aero', name: 'Registre d’équilibrage', prefix: 'RE', inline: true, box: [-10, -9, 20, 18], ports: IN2,
    draw: (el, c) => ({ g: stub(c, 0, -10, 0, 10, 0) + Re(-8, -8, 16, 16, ' fill="none"') + Ln(-5, 6, 5, -6, BLADE) + Ci(0, 0, 1.6, FILLED) }) },
  silencieux: { cat: 'aero', name: 'Silencieux', prefix: 'SIL', inline: true, box: [-20, -10, 40, 20], ports: [[-20, 0], [20, 0]],
    draw: () => ({ g: Re(-20, -9, 40, 18, ' rx="1"') + Re(-16, -5.5, 32, 11, ' fill="none" stroke-dasharray="1.5 2" stroke-width="1"') }) },
  clapet_cf: { cat: 'aero', name: 'Clapet coupe-feu', prefix: 'CF', inline: true, tagOn: true, box: [-10, -10, 20, 20], ports: IN2,
    draw: () => ({ g: Re(-10, -9, 20, 18) + Ln(-10, 9, 10, -9, THIN) + Ci(0, 0, 1.6, FILLED) }) },
  bouche: { cat: 'aero', name: 'Bouche d’extraction', prefix: '', pin: [0, 1], box: [-12, -1, 24, 23], ports: [[0, 0]],
    params: { sens: { label: 'Type', type: 'select', options: [['ext', 'Extraction'], ['souf', 'Soufflage']], def: 'ext' } },
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, 6) + Re(-11, 6, 22, 6, ' rx="1"') + Ln(-7, 9, 7, 9, THIN) + (el.p.sens === 'souf' ? P('M0,14L0,20.5M-2.5,18L0,20.5L2.5,18', NOF + THIN) : P('M0,21L0,14M-2.5,16.5L0,14L2.5,16.5', NOF + THIN)) }) },
  entree_air: { cat: 'aero', name: 'Entrée d’air autoréglable', prefix: '', box: [-11, -6, 22, 22], ports: [],
    draw: () => ({ g: Re(-10, -5, 20, 10, ' rx="1"') + Ln(-7, -1, 7, -1, THIN) + Ln(-7, 2, 7, 2, THIN) + P('M0,7L0,14.5M-2.5,12L0,14.5L2.5,12', NOF + THIN) }) },
  grille: { cat: 'aero', name: 'Grille extérieure', prefix: '', box: [0, -11, 20, 22], ports: [[0, 0]],
    params: { sens: { label: 'Sens', type: 'select', options: [['rej', 'Rejet (sortie)'], ['pan', 'Prise d’air neuf (entrée)']], def: 'rej' } },
    draw: el => ({ g: Re(0, -10, 6, 20) + Ln(0, -6, 6, -4, THIN) + Ln(0, -1, 6, 1, THIN) + Ln(0, 4, 6, 6, THIN) + (el.p.sens === 'pan' ? P('M19,0L10,0M13,-3L10,0L13,3', NOF + THIN) : P('M10,0L19,0M16,-3L19,0L16,3', NOF + THIN)) }) },
  chapeau: { cat: 'aero', name: 'Chapeau de toiture', prefix: '', pin: [0, -1], box: [-14, -20, 28, 21], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -8) + Ln(-6, -8, 6, -8) + Ln(-6, -12, -6, -8, THIN) + Ln(6, -12, 6, -8, THIN) + P('M-13,-12L0,-19L13,-12Z') }) },
});
const PRE_ADD = [
  ['vanne_sp'], ['robinet_th', 'vtherm', 'Robinet thermostatique de radiateur', null, 'RT'], ['vtherm_becs', 'vtherm', 'Vanne thermostatique de bouclage', null, 'VT'], ['decharge'],
  ['te_reglage', 'equil', 'Té de réglage', null, 'TR'], ['clapet_ea', 'clapet_ap', 'Clapet anti-pollution EA (contrôlable)', { code: 'EA' }], ['clapet_eb', 'clapet_ap', 'Clapet anti-pollution EB (non contrôlable)', { code: 'EB' }], ['clapet2'],
  ['compensateur'], ['manch_cpt'], ['puisage'], ['echantillon'], ['purg_vap'],
  ['v3v_therm', 'v3v', 'Vanne 3 voies thermostatique', { act: 'therm' }], ['v3v_mix', 'v3v', 'Vanne de mixage (adoucisseur)', { act: 'none' }, 'VMX'], ['vanne_auto', 'reducteur', 'Vanne automotrice de détente', null, 'VAD'],
  ['antibelier'], ['purge_man'], ['pot_intro'], ['reserve_vessie', 'vase', 'Réservoir à vessie', null, 'RES'], ['reserve_diaph', 'vase', 'Réservoir à diaphragme', null, 'RES'], ['raccord_pomp', 'pompier', 'Raccord pompier (alimentation colonne sèche)'], ['prise_pomp', 'pompier', 'Prise pompier d’étage', null, 'PIN'],
  ['prise_p'], ['sonde_ext'], ['aquastat', 'sonde', 'Aquastat', { txt: 'AQ' }, 'AQ'], ['sonde_p', 'sonde', 'Sonde de pression', { txt: 'P' }, 'SP'], ['armoire'], ['coffret', 'armoire', 'Coffret de commande', null, 'CC'],
  ['pompe_charge', 'pompe', 'Pompe de charge'], ['relevage'], ['bache_cond', 'relevage', 'Bâche de relevage des condensats', { np: '2', event: true }, 'BRC'], ['pompe_cond'],
  ['squid'], ['echangeur_vap', 'echangeur', 'Échangeur vapeur / eau'], ['prep_inst', 'echangeur', 'Préparateur ECS instantané à plaques'], ['panneau', 'emetteur', 'Panneaux rayonnants'], ['cuve_ep', 'reservoir', 'Bâche de rétention des eaux pluviales', null, 'BR', 'ep'],
  ['cuve_ep_pr', 'reservoir', 'Bâche de rétention EP avec pompe de relevage immergée', { pompe: '1' }, 'BR', 'ep'],
  ['lavabo', 'sanitaire', 'Lavabo', { kind: 'lavabo' }], ['wc', 'sanitaire', 'WC', { kind: 'wc' }], ['douche', 'sanitaire', 'Douche', { kind: 'douche' }], ['evier', 'sanitaire', 'Évier inox', { kind: 'evier' }],
  ['lavelinge', 'sanitaire', 'Lave-linge (attente)', { kind: 'll' }], ['bac', 'sanitaire', 'Bac à laver', { kind: 'bac' }], ['poste_eau', 'sanitaire', 'Poste d’eau', { kind: 'poste' }], ['siphon_sol'], ['puisard', 'siphon_sol', 'Puisard', { kind: 'puisard' }, 'PUI'],
  ['cta'], ['caisson'], ['pac_air'], ['ventilo'], ['batterie'], ['filtre_air'], ['registre'], ['silencieux'], ['clapet_cf'], ['volet_df', 'clapet_cf', 'Volet de désenfumage', null, 'VDE'],
  ['bouche_hygro', 'bouche', 'Bouche d’extraction hygroréglable'], ['bouche_auto', 'bouche', 'Bouche d’extraction autoréglable'], ['bouche_souf', 'bouche', 'Bouche de soufflage', { sens: 'souf' }],
  ['entree_air'], ['grille_rej', 'grille', 'Grille de rejet d’air', { sens: 'rej' }], ['grille_an', 'grille', 'Prise d’air neuf', { sens: 'pan' }], ['chapeau'],
];

/* ===== Eaux pluviales : toitures non accessibles, rétention et réutilisation (CCTP lot 13, Paris Pluie) ===== */
const toitW = el => Math.max(60, Math.round((+el.p.w || 200) / 20) * 20);
Object.assign(S, {
  toiture: { cat: 'ep', name: 'Toiture non accessible', prefix: '', nolegend: true, nonomen: true,
    params: { txt: { label: 'Texte', type: 'text', def: 'Toiture non accessible', max: 50 }, w: { label: 'Largeur', type: 'number', def: 200, min: 60, max: 2000, step: 20 } },
    box: el => { const w = toitW(el); return [-w / 2 - 4, -26, w + 8, 26]; },
    ports: el => { const w = toitW(el) / 2, a = []; for (let x = -Math.floor((w - 1) / 20) * 20; x < w; x += 20) a.push([x, 0]); return a; },
    draw: el => {
      const w = toitW(el), x0 = -w / 2, x1 = w / 2; let g = Re(x0, -8, w, 8, ' fill="none" stroke-width="1"');
      for (let x = x0; x < x1; x += 7) { const xe = Math.min(x + 8, x1); g += Ln(r2(x), 0, r2(xe), r2(-(xe - x)), ' stroke-width="0.6"'); }
      g += Ln(x0, -8, x1, -8, ' stroke-width="2.4"') + Re(x0 - 4, -16, 4, 16) + Re(x1, -16, 4, 16);
      return { g, t: [[0, -20, el.p.txt || '', 7, 700]] };
    } },
  eep: { cat: 'ep', name: "Entrée d'eau pluviale avec crapaudine", prefix: 'EEP', pin: [0, -1], box: [-10, -20, 20, 21], ports: [[0, 0]],
    draw: (el, c) => ({ g: stub(c, 0, 0, 0, 0, -4) + P('M-9,-12L-3,-4L3,-4L9,-12Z') + P('M-8,-12A8,7 0 0 1 8,-12Z') + Ln(-4, -12, -4, -17.5, THIN) + Ln(0, -12, 0, -19, THIN) + Ln(4, -12, 4, -17.5, THIN) }) },
  gargouille: { cat: 'ep', name: 'Trop-plein de sécurité (gargouille)', prefix: 'TP', box: [-2, -5, 24, 17], ports: [[0, 0]],
    draw: () => ({ g: Re(0, -3, 14, 6, ' rx="1"') + P('M14,0Q19,0 19,8', NOF + THIN + ' stroke-dasharray="2 1.6"') + P('M17,7L19,10.5L21,7', NOF + THIN) }) },
  te_deg: { cat: 'ep', name: 'Té de dégorgement', prefix: '', inline: true, box: [-10, -13, 20, 14], ports: IN2,
    draw: (el, c) => ({ g: stub(c, 0, -10, 0, 10, 0) + Ln(0, 0, 0, -8, ` stroke="${c.pc(0)}" stroke-width="${c.pw(0)}" stroke-linecap="butt"`) + Re(-5, -12, 10, 4, ' rx="1"') }) },
  regard: { cat: 'ep', name: 'Regard de visite', prefix: 'RG', box: [-10, -10, 20, 20], ports: [[-10, 0], [10, 0], [0, -10], [0, 10]],
    draw: () => ({ g: Re(-10, -10, 20, 20) + Ci(0, 0, 6) + Ln(-4, 0, 4, 0, THIN) }) },
  surverse: { cat: 'ep', name: 'Disconnexion par surverse totale (AB)', prefix: 'AB', box: [-10, -20, 30, 40], ports: [[0, -20], [0, 20]], pn: ['Eau de ville', 'Vers réservoir'],
    draw: (el, c) => ({ g: stub(c, 0, 0, -20, 0, -8) + P('M-9,-2L-9,12L9,12L9,-2', NOF) + P('M-9,6q2.25,-2 4.5,0t4.5,0t4.5,0t4.5,0', NOF + THIN) + stub(c, 1, 0, 12, 0, 20), t: [[15, 2, 'AB', 6, 700]] }) },
  flotteur: { cat: 'ep', name: 'Robinet à flotteur', prefix: 'RF', inline: true, box: [-10, -8, 25, 30], ports: IN2,
    draw: () => ({ g: BOW + Ln(0, 0, 8, 13, THIN) + Ci(10.5, 17, 4.5) }) },
  recup_ep: { cat: 'ep', name: "Station de gestion d'eau de pluie", prefix: 'SEP', tagOn: true, box: [-50, -40, 100, 80], ports: [[-20, -40], [-50, -20], [50, -20], [0, 40]],
    pn: ['Aspiration (bâche de rétention)', 'Appoint eau de ville', 'Distribution eau non potable', 'Trop-plein vers EU'],
    draw: (el, c) => {
      let g = Re(-50, -40, 100, 80, ' rx="3"');
      g += stub(c, 1, -50, -20, -36, -20) + stub(c, 1, -36, -20, -36, -12) + P('M-46,-8L-46,30L-26,30L-26,-8', NOF) + P('M-46,4q2.5,-2 5,0t5,0t5,0t5,0', NOF + THIN);
      g += stub(c, 0, -20, -40, -20, 24) + Ln(-26, 24, -20, 24, THIN);
      for (const y of [-10, 14]) g += Ln(-20, y, -6, y, THIN) + Ci(0, y, 6) + P(`M-2.6,${y - 3.6}L-2.6,${y + 3.6}L4.2,${y}Z`, FILLED) + Ln(6, y, 30, y, THIN);
      g += Ln(30, 14, 30, -20, THIN) + stub(c, 2, 30, -20, 50, -20) + Ln(30, -2, 36, -2, THIN) + Re(36, -9, 9, 15, ' rx="4.5"');
      g += Ln(-36, 30, -36, 36, THIN) + Ln(-36, 36, 0, 36, THIN) + stub(c, 3, 0, 36, 0, 40);
      return { g, t: [[8, -31, 'GESTION EAU DE PLUIE', 5.5, 700], [-36, -4, 'AB', 5, 700]] };
    } },
});
PRE_ADD.push(
  ['toiture', 'toiture', 'Toiture non accessible'], ['eep'], ['gargouille'], ['te_deg'], ['regard'], ['filtre_ep', 'filtre', 'Filtre eaux pluviales (≤ 1 mm)', null, 'FEP', 'ep'],
  ['clapet_ar_ep', 'clapet', 'Clapet anti-refoulement (trop-plein)', null, 'CL', 'ep'], ['recup_ep'], ['surverse'], ['flotteur'], ['compteur_ep', 'compteur', "Compteur d'eau de pluie", { txt: 'm³' }, 'CEP', 'ep'],
  ['tampon_ev', 'reservoir', 'Réservoir tampon eau de ville', null, 'RT', 'ep']
);

const limH = el => Math.max(40, Math.round((+el.p.h || 120) / 20) * 20);
const spN = el => Math.max(2, Math.min(4, Math.round(+el.p.np || 3))), spL = el => (spN(el) - 1) * 20 + 30;
const spX = el => { const n = spN(el); return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 40); };
const BOWVx = (x, y0, y1) => `<g transform="translate(${x},0)">${BOWV(y0, y1, 4)}</g>`;
const surpReal = (el, c) => { const L = spL(el);
  let g = stub(c, 0, -L, 20, -L + 2, 20) + stub(c, 1, L - 2, -50, L, -50);
  g += Re(-L + 6, 30, 2 * L - 12, 4) + Re(-L + 10, 34, 7, 3, FILLED) + Re(L - 17, 34, 7, 3, FILLED);
  g += Re(-L, 17, 2 * L, 6, ' rx="3"') + Re(L - 4, 15.5, 4, 9, ' rx="1"') + Re(-L, -53, 2 * L, 6, ' rx="3"') + Re(-L, -54.5, 4, 9, ' rx="1"');
  for (const x of spX(el)) {
    g += P(`M${x + 6},20L${x + 14},20L${x + 14},-47`, NOF + ' stroke-width="2.2"') + P(`M${x + 10},9L${x + 18},9L${x + 14},1Z`) + Ln(x + 10, 0.5, x + 18, 0.5, ' stroke-width="1.6"') + BOWVx(x + 14, -40, -32);
    g += Re(x - 9, 25, 18, 5, ' rx="1"') + Re(x - 6, -10, 12, 35); for (let y = -5; y <= 20; y += 5) g += Ln(x - 6, y, x + 6, y, THIN);
    g += Re(x - 8, -40, 16, 30, ' rx="2"') + Re(x - 6, -44, 12, 4, ' rx="1.5"'); for (const dx of [-4.5, 0, 4.5]) g += Ln(x + dx, -38, x + dx, -12, THIN);
    if (el.p.var !== false) g += Re(x - 7, -34, 14, 13, ' rx="1.5"') + Re(x - 4.5, -32, 9, 4, FILLED) + Ci(x - 3, -25, 1, FILLED) + Ci(x, -25, 1, FILLED) + Ci(x + 3, -25, 1, FILLED);
  }
  g += Ln(-L + 12, -53, -L + 12, -59) + Ci(-L + 12, -64.5, 5.5) + Ln(-L + 12, -64.5, -L + 15, -67.5, ' stroke-width="1.1"');
  g += Ln(-14, -62, -14, -53) + Ln(14, -62, 14, -53) + Re(-20, -86, 40, 24, ' rx="2"') + Re(-16, -82, 32, 8); for (const x of [-12, -6, 0, 6, 12]) g += Ln(x, -71, x, -66, THIN);
  if (el.p.res !== false) g += Ln(L - 16, -53, L - 16, -58) + Re(L - 23, -86, 14, 28, ' rx="7" ry="5"') + Ln(L - 23, -72, L - 9, -72, THIN);
  return { g }; };
const surpSch = (el, c) => { const L = spL(el), t = [];
  let g = stub(c, 0, -L, 20, L - 4, 20) + Ln(L - 4, 16, L - 4, 24, ' stroke-width="2"') + stub(c, 1, -L + 4, -50, L, -50) + Ln(-L + 4, -54, -L + 4, -46, ' stroke-width="2"');
  for (const x of spX(el)) {
    g += Ln(x, 20, x, -50) + Ci(x, -2, 9) + P(`M${x - 6.5},2L${x + 6.5},2L${x},-9Z`, FILLED) + P(`M${x - 4},-20L${x + 4},-20L${x},-27Z`) + Ln(x - 4, -28, x + 4, -28, ' stroke-width="1.6"') + BOWVx(x, -42, -34);
    if (el.p.var !== false) { g += Re(x + 10, -8, 10, 9, ' rx="1"'); t.push([x + 15, -2.6, '≈', 7, 700]); }
  }
  g += Ln(-L + 12, -50, -L + 12, -58) + Ci(-L + 12, -63.5, 5.5) + Ln(-L + 12, -63.5, -L + 15, -66.5, ' stroke-width="1.1"');
  g += Ln(-12, -66, -12, -50, THIN) + Ln(12, -66, 12, -50, THIN) + Re(-18, -84, 36, 18, ' rx="2"'); t.push([0, -73.5, 'COFFRET', 5.5, 700]);
  if (el.p.res !== false) g += Ln(L - 16, -50, L - 16, -58) + Re(L - 23, -86, 14, 28, ' rx="7" ry="5"') + Ln(L - 23, -72, L - 9, -72, THIN);
  return { g, t }; };
/* ===== Organes relevés en local eau : filtre à rinçage (type Braukmann F76S), filtre Y à purge, réducteur avec manomètre ===== */
Object.assign(S, {
  filtre_rc: { cat: 'rob', name: 'Filtre à rinçage à contre-courant', prefix: 'F', inline: true, tagOn: true, ports: [[-20, 0], [20, 0], [0, 30]], pn: ['Entrée', 'Sortie', 'Rinçage (vers égout)'],
    params: { mano: { label: 'Manomètres amont / aval', type: 'check', def: true } },
    box: el => el.p.mano ? [-20, -20, 40, 50] : [-20, -10, 40, 40],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -10, 0) + stub(c, 1, 10, 0, 20, 0) + (el.p.mano ? MANO_S(c, 0, -15) + MANO_S(c, 1, 15) : '')
      + P('M-10,0L0,-9L10,0L0,9Z') + Ln(0, -7.5, 0, 7.5, THIN + ' stroke-dasharray="2 1.5"') + Ln(0, 9, 0, 12) + BOWV(12, 21, 4) + stub(c, 2, 0, 21, 0, 30) }) },
  /* Organes du schéma de sous-station CPCU : manchette témoin ECS et limite de prestation entre lots */
  tube_temoin: { cat: 'rob', name: 'Manchette témoin (tube témoin)', prefix: 'TT', inline: true, box: [-20, -7, 40, 14], ports: [[-20, 0], [20, 0]],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -13, 0) + stub(c, 1, 13, 0, 20, 0) + Re(-12, -3.5, 24, 7, ' rx="1"') + Ln(-13, -6, -13, 6, ' stroke-width="1.8"') + Ln(13, -6, 13, 6, ' stroke-width="1.8"') }) },
  limite: { cat: 'annot', name: 'Limite de prestation', prefix: '', nolegend: true, nonomen: true, ports: [],
    params: { txtL: { label: 'Lot à gauche', type: 'text', def: 'Lot A', max: 24 }, txtR: { label: 'Lot à droite', type: 'text', def: 'Lot B', max: 24 }, h: { label: 'Hauteur', type: 'number', def: 120, min: 40, max: 2000, step: 20 } },
    box: el => { const hh = limH(el); return [-50, -hh / 2 - 22, 100, hh + 22]; },
    draw: el => { const hh = limH(el), y0 = -hh / 2, ya = y0 + 4;
      return { g: Ln(0, y0, 0, hh / 2, ' stroke-width="1.2" stroke-dasharray="10 3 2 3"')
        + P(`M-44,${ya - 2.5}L-12,${ya - 2.5}L-12,${ya - 5}L-3,${ya}L-12,${ya + 5}L-12,${ya + 2.5}L-44,${ya + 2.5}Z`, THIN)
        + P(`M44,${ya - 2.5}L12,${ya - 2.5}L12,${ya - 5}L3,${ya}L12,${ya + 5}L12,${ya + 2.5}L44,${ya + 2.5}Z`, THIN),
        t: [[-24, y0 - 12, el.p.txtL || '', 7, 700], [24, y0 - 12, el.p.txtR || '', 7, 700]] }; } },
  /* Surpresseur multipompes à variation de vitesse (type DAB KVC AD) : collecteur d'aspiration en bas, de refoulement en haut,
     pompes verticales multicellulaires avec variateur, clapet et vanne par pompe, coffret, manomètre et réservoir à diaphragme */
  surp_mp: { cat: 'pompes', name: 'Surpresseur multipompes à variateurs', prefix: 'SUR', tagOn: true,
    params: { np: { label: 'Nombre de pompes', type: 'select', options: [['2', '2 pompes'], ['3', '3 pompes'], ['4', '4 pompes']], def: '3' },
      var: { label: 'Variateur de vitesse sur chaque pompe', type: 'check', def: true },
      res: { label: 'Réservoir à diaphragme sur le refoulement', type: 'check', def: true } },
    box: el => { const L = spL(el); return [-L, -88, 2 * L, 126]; },
    ports: el => { const L = spL(el); return [[-L, 20], [L, -50]]; }, pn: ['Aspiration', 'Refoulement'],
    draw: (el, c) => REAL() ? surpReal(el, c) : surpSch(el, c) },
});

/* ===== Organes relevés côté gestionnaire EP : filtre à cartouche (type Cintropur NW), stérilisateur UV (type Cintropur UV) ===== */
const cartBot = el => el.p.purge ? 40 : 27;
const CUVE = (y1) => P(`M-8,4L-8,${y1 - 5}Q-8,${y1} 0,${y1}Q8,${y1} 8,${y1 - 5}L8,4`);
Object.assign(S, {
  filtre_cart: { cat: 'ep', name: 'Filtre à cartouche', prefix: 'F', inline: true, tagOn: true, pn: ['Entrée', 'Sortie', 'Purge'],
    params: { mano: { label: 'Manomètres amont / aval', type: 'check', def: true }, purge: { label: 'Robinet de purge', type: 'check', def: true } },
    box: el => { const y0 = el.p.mano ? -20 : -6; return [-20, y0, 40, cartBot(el) - y0]; },
    ports: el => el.p.purge ? [[-20, 0], [20, 0], [0, 40]] : [[-20, 0], [20, 0]],
    draw: (el, c) => ({ g: stub(c, 0, -20, 0, -10, 0) + stub(c, 1, 10, 0, 20, 0) + (el.p.mano ? MANO_S(c, 0, -15) + MANO_S(c, 1, 15) : '')
      + CUVE(27) + Re(-4.5, 7, 9, 16, ' rx="1" fill="none"' + THIN + ' stroke-dasharray="2 1.5"') + Re(-10, -5, 20, 9, ' rx="1.5"')
      + (el.p.purge ? Ln(0, 27, 0, 29) + BOWV(29, 37, 3.6) + stub(c, 2, 0, 37, 0, 40) : '') }) },
  uv: { cat: 'ep', name: 'Stérilisateur UV', prefix: 'UV', inline: true, tagOn: true, box: [-20, -6, 40, 41], ports: [[-20, 0], [20, 0]], pn: ['Entrée (eau filtrée)', 'Sortie'],
    draw: (el, c) => { let g = stub(c, 0, -20, 0, -10, 0) + stub(c, 1, 10, 0, 20, 0) + CUVE(34) + Re(-1.8, 7, 3.6, 22, ' rx="1.8"' + THIN) + Re(-10, -5, 20, 9, ' rx="1.5"');
      for (const y of [11, 18, 25]) g += Ln(-3.5, y, -6, y - 2, ' stroke-width="0.9"') + Ln(3.5, y, 6, y - 2, ' stroke-width="0.9"');
      return { g, t: [[0, -0.4, 'UV', 6, 700]] }; } },
});
PRE_ADD.push(
  ['filtre_cart'], ['uv'], ['compteur_imp', 'compteur', "Compteur d'eau à émetteur d'impulsions", { emet: true }],
  ['pompe_vv', 'pompe', 'Pompe à vitesse variable', { vv: true }]
);

/* ===== Fosse sous caillebotis avec pompe de relevage immergée haute température (vidanges et purges de chaufferie / sous-station) ===== */
const fcNp = el => String(el.p.np) === '2' ? 2 : 1;
Object.assign(S, {
  fosse_caill: { cat: 'sani', name: 'Fosse sous caillebotis avec pompe de relevage immergée haute température', prefix: 'PR', tagOn: true,
    params: { np: { label: 'Pompes', type: 'select', options: [['1', '1 pompe'], ['2', '2 pompes (normal / secours)']], def: '1' }, txt: { label: 'Inscription', type: 'text', def: 'HT 90 °C', max: 14 } },
    box: [-34, -30, 68, 72], ports: [[-10, -30], [10, -30]], pn: ['Arrivée (déversement sur le caillebotis)', 'Refoulement'],
    draw: (el, c) => {
      let g = Ln(-34, -20, -24, -20, ' stroke-width="2.2"') + Ln(24, -20, 34, -20, ' stroke-width="2.2"');
      for (const x0 of [-34, 24]) for (let x = x0; x < x0 + 10; x += 3.5) g += Ln(r2(x), -16, r2(x + 4), -20, ' stroke-width="0.6"');
      g += P('M-24,-20L-24,30L24,30L24,-20') + P('M-24,6q3,-2.5 6,0t6,0t6,0t6,0t6,0t6,0t6,0t6,0', NOF + THIN) + stub(c, 0, -10, -30, -10, -27) + P('M-13,-27L-7,-27L-10,-23Z', FILLED);
      g += Ln(-17, -18, -17, 2, THIN) + Ci(-17, 5, 2.5);
      g += stub(c, 1, 10, 14, 10, -30) + Ci(10, 20, 6) + P('M6.8,23L13.2,23L10,16.5Z', FILLED);
      if (fcNp(el) === 2) g += Ln(-10, 14, -10, -6, THIN) + Ln(-10, -6, 10, -6, THIN) + Ci(-10, 20, 6) + P('M-13.2,23L-6.8,23L-10,16.5Z', FILLED);
      g += Re(-24, -22, 48, 4, ' fill="none"'); for (let x = -20; x <= 20; x += 4) g += Ln(x, -22, x, -18, THIN);
      const t = [[0, 37, el.p.txt || '', 6, 700]]; if (fcNp(el) === 2) t.push([-5, 10.5, 'S', 5, 700], [15, 10.5, 'N', 5, 700]);
      return { g, t };
    } },
});
PRE_ADD.push(['fosse_caill']);

/* ===== Vue réaliste des équipements (option « Équipements en vue réaliste » du schéma) =====
   Les raccordements (ports) restent identiques : un schéma passe d'une vue à l'autre sans rien redessiner. */
const REAL = () => { try { return !!(doc && doc.opts && doc.opts.real); } catch (e) { return false; } };
const HATCH = (x0, y0, w, h, s) => { let d = ''; for (let x = x0; x <= x0 + w - h; x += s) d += `M${r2(x)},${r2(y0 + h)}L${r2(x + h)},${r2(y0)}`; return P(d, NOF + THIN); };
const FL = (x, y, v) => v ? Ln(x - 3.5, y, x + 3.5, y, ' stroke-width="2"') : Ln(x, y - 3.5, x, y + 3.5, ' stroke-width="2"');
const realTub = (el, c) => { /* échangeur tubulaire vapeur / eau : boîte à eau, brides, calandre, faisceau, pieds et socle */
  let g = stub(c, 0, -20, -20, -12, -20) + stub(c, 1, -20, 20, -12, 20) + stub(c, 2, 12, -20, 20, -20) + stub(c, 3, 12, 20, 20, 20) + FL(-16, -20) + FL(-16, 20) + FL(16, -20) + FL(16, 20);
  g += Re(-9, -50, 18, 8, ' rx="2"') + Re(-14, -42, 28, 4) + Re(-12, -38, 24, 78) + Re(-14, 26, 28, 4);
  for (const x of [-6, 0, 6]) g += Ln(x, -34, x, 24, THIN + ' stroke-dasharray="3 2"');
  return { g: g + Ln(-9, 40, -9, 48) + Ln(9, 40, 9, 48) + Re(-18, 48, 36, 3) + HATCH(-18, 51, 36, 5, 4) }; };
const realPlq = (el, c) => { /* échangeur à plaques : bâti fixe, paquet de plaques, plaque de serrage, barres, semelle */
  let g = stub(c, 0, -20, -20, -15, -20) + stub(c, 1, -20, 20, -15, 20) + stub(c, 2, 13, -20, 20, -20) + stub(c, 3, 13, 20, 20, 20) + FL(-18, -20) + FL(-18, 20) + FL(17, -20) + FL(17, 20);
  g += Re(-15, -33, 30, 3) + Re(-15, 27, 30, 3) + Re(-15, -36, 6, 70, ' rx="1"') + Re(-9, -28, 17, 52);
  for (let x = -7.5; x <= 6.5; x += 2) g += Ln(x, -27, x, 23, THIN);
  return { g: g + Re(8, -31, 5, 58, ' rx="1"') + Re(-18, 34, 12, 3) }; };
const realBou = (el, c) => { /* bouteille à fonds bombés, sur pieds (bouteille de découplage) */
  let g = P('M-10,-50A10,6 0 0 1 10,-50L10,50A10,6 0 0 1 -10,50Z') + Ln(-5, -54, -5, 54, THIN) + Ln(5, -54, 5, 54, THIN) + Ln(-10, -50, 10, -50, THIN) + Ln(-10, 50, 10, 50, THIN) + stub(c, 4, 0, -56, 0, -60) + stub(c, 5, 0, 56, 0, 60);
  if (el.pre !== 'bouteille_hp') g += Ln(-8, 52, -16, 64) + Ln(8, 52, 16, 64) + Ln(-19, 64, -13, 64) + Ln(13, 64, 19, 64);
  return { g }; };
const realBal = (el, c) => { /* ballon / bâche : fonds bombés, piquages à brides, plaque, trou d'homme, pieds */
  let g = P('M-28,-46A28,12 0 0 1 28,-46L28,46A28,9 0 0 1 -28,46Z') + Ln(-28, -46, 28, -46, THIN) + Ln(-28, 46, 28, 46, THIN);
  [[-30, -40], [-30, 0], [-30, 40], [30, -20], [30, 40]].forEach(([x, y], i) => { g += stub(c, i, x, y, x < 0 ? -28 : 28, y) + FL(x, y); });
  if (el.p.coil === 'serp') { const pts = [[28, -20], [14, -20]]; for (let i = 1; i <= 7; i++) pts.push([i % 2 ? -6 : 14, -20 + i * 7.5]); pts.push([14, 40], [28, 40]); g += P('M' + pts.map(p => p.join(',')).join('L'), NOF + ` stroke="${c.pc(3)}" stroke-width="1.6"`); }
  else if (el.p.coil === 'res') g += P('M28,40L16,40L13,35L9,45L5,35L1,45L-3,35L-6,40L-12,40', NOF + THIN);
  else g += Ci(0, 26, 9) + Ci(0, 26, 6.5, THIN);
  g += Re(-20, -34, 40, 13, ' rx="1"') + stub(c, 5, 0, 55, 0, 60) + Ln(-18, 52, -22, 63) + Ln(18, 52, 22, 63) + Ln(-26, 63, -18, 63) + Ln(18, 63, 26, 63);
  return { g, t: [[0, -25.5, el.p.txt || '', 7, 700]] }; };
const realVase = (el, c) => ({ g: stub(c, 0, 0, 0, 0, 8) + P('M-10,14A10,6 0 0 1 10,14L10,34A10,5 0 0 1 -10,34Z') + P('M-10,24q2.5,-2.5 5,0t5,0t5,0t5,0', NOF + THIN) + Ln(-7, 37.5, -9, 45) + Ln(7, 37.5, 9, 45) + Ln(-12, 45, -6, 45) + Ln(6, 45, 12, 45), t: el.p.txt ? [[0, 29.5, el.p.txt, 5, 700]] : [] });
const realRel = (el, c, orig) => { const o = orig(el, c); /* bâche fermée, évent, flotteur, niveau à glace */
  o.g += Ln(-24, -20, 24, -20, THIN) + (el.p.event ? '' : Ln(-16, -20, -16, -26) + Ln(-19.5, -26, -12.5, -26)) + Ln(-2, -18, -2, -3, THIN) + Ci(-2, 0, 3) + Ln(24, -12, 25, -12, THIN) + Ln(24, 24, 25, 24, THIN) + Re(25, -14, 4, 40, ' rx="1"') + Re(26, 0, 2, 25, FILLED); return o; };
const realDes = (el, c) => ({ g: stub(c, 0, -10, 0, -8, 0) + stub(c, 1, 8, 0, 10, 0) + P('M-8,-10A8,4 0 0 1 8,-10L8,14L3,20L-3,20L-8,14Z') + Ln(-6, 15, -11, 26) + Ln(6, 15, 11, 26) + stub(c, 2, 0, 20, 0, 30)
  + (/agn/i.test(el.name || '') ? Re(-1.6, -19, 3.2, 26, FILLED) + Ln(-4, -16, 4, -16, ' stroke-width="1.6"') : Ln(0, -8, 0, 12, THIN + ' stroke-dasharray="2 1.5"')) });
const realFil = (el, c) => { let g = FL(-9, 0) + FL(9, 0) + Re(-8, -3.5, 16, 7, ' rx="1.5"') + P('M-3,2L5,12L9,9L2,0Z') + Ln(-0.5, 3, 5.5, 10.5, THIN + ' stroke-dasharray="2 1.5"');
  if (el.p.purge) g += `<g transform="translate(7,10.5)">${PURGE(0)}</g>`; return { g }; };
const realTh = (el, c) => ({ g: stub(c, 0, 0, 0, 0, -6) + Ln(-4.5, -6, 4.5, -6, ' stroke-width="1.6"') + Re(-3.5, -29, 7, 23, ' rx="3.5"') + Ln(0, -25, 0, -12, ' stroke-width="1.8"') + Ci(0, -10, 2.4, FILLED) });
const realDet = (el, c) => ({ g: FL(-10, 0) + FL(10, 0) + Re(-9, -4, 18, 8) + Ci(0, 0, 6) + Ln(0, -6, 0, -10) + Ln(-4, -10, 4, -10, ' stroke-width="1.6"') + Ln(0, 6, 0, 11) + Re(-8, 11, 16, 3) + Re(-6, 14, 12, 16) + Ln(-3, 15, -3, 29, THIN) + Ln(0, 15, 0, 29, THIN) + Ln(3, 15, 3, 29, THIN) });
const REAL_V = {
  echangeur: { draw: (el, c) => el.pre === 'echangeur_vap' ? realTub(el, c) : realPlq(el, c), box: el => el.pre === 'echangeur_vap' ? [-20, -50, 40, 106] : [-22, -36, 44, 73] },
  bouteille: { draw: realBou, box: el => el.pre === 'bouteille_hp' ? [-10, -60, 20, 120] : [-19, -60, 38, 126] },
  ballon: { draw: realBal, box: () => [-31, -60, 62, 124] },
  vase: { draw: realVase, box: () => [-12, -1, 24, 47] },
  relevage: { draw: realRel },
  desemb: { draw: realDes, box: () => [-12, -19, 24, 49] },
  filtre: { draw: realFil, box: el => el.p.purge ? [-10, -6, 20, 38] : [-10, -6, 20, 20] },
  thermo: { draw: realTh, box: () => [-8, -29, 16, 30] },
  reducteur: { draw: (el, c, o) => el.pre === 'vanne_auto' ? realDet(el, c) : o(el, c), box: (el, o) => el.pre === 'vanne_auto' ? [-10, -11, 20, 42] : o(el) },
};
for (const k in REAL_V) {
  const d = S[k], v = REAL_V[k], dr = d.draw, bx = d.box, ob = el => typeof bx === 'function' ? bx(el) : bx;
  d.draw = (el, c) => REAL() ? v.draw(el, c, dr) : dr(el, c);
  if (v.box) d.box = el => REAL() ? v.box(el, ob) : ob(el);
}

/* ===== Préréglages de la bibliothèque ===== */
const PRE_LIST = [
  ['vanne'], ['vanne_nf', 'vanne', "Vanne d'isolement normalement fermée", { nf: true }], ['vanne_bs'], ['papillon'], ['clapet'], ['filtre'], ['filtre_y', 'filtre', 'Filtre à tamis en Y avec purge', { purge: true }], ['filtre_rc'],
  ['reducteur'], ['reducteur_m', 'reducteur', 'Réducteur de pression avec manomètre', { mano: true }], ['equil'], ['vanne_mot'], ['electrovanne'], ['v3v'], ['mitigeur'], ['vidange'], ['reduction'], ['manchette'], ['tube_temoin'], ['dielec'], ['bouchon'],
  ['disco', 'disco', 'Disconnecteur BA', { code: 'BA' }], ['disco_ca', 'disco', 'Disconnecteur CA', { code: 'CA' }], ['gs'], ['soupape'], ['vase'], ['vase_san', 'vase', "Vase d'expansion sanitaire", null, 'VXS'], ['purgeur'], ['desemb'], ['doseur'], ['entonnoir'],
  ['mano'], ['thermo'], ['thmano'], ['sonde'], ['pressostat', 'sonde', 'Pressostat', { txt: 'P' }, 'PS'], ['compteur'], ['compteur_e', 'compteur', "Compteur d'énergie", { txt: 'kWh' }, 'CE'], ['compteur_g', 'compteur', 'Compteur gaz', { txt: 'Gaz' }, 'CG'], ['regul'],
  ['pompe'], ['pompe2'], ['surpresseur'], ['surp_mp'],
  ['chaudiere'], ['pac'], ['ballon'], ['ballon_st', 'ballon', 'Ballon de stockage ECS', { coil: 'none' }], ['cumulus', 'ballon', 'Chauffe-eau électrique', { coil: 'res' }], ['ballon_tampon', 'ballon', 'Ballon tampon', { coil: 'none', txt: 'TAMPON' }, 'BT'], ['echangeur'], ['bouteille'], ['bouteille_hp', 'bouteille', 'Bouteille vapeur HP (nourrice)', null, 'BV'], ['collecteur'], ['adoucisseur'], ['reservoir'], ['emetteur'], ['bloc'],
  ['renvoi'], ['renvoi_arr', 'renvoi', "Renvoi d'arrivée", { sens: 'arr', txt: 'Arrivée…' }], ['limite'],
];
PRE_LIST.push(...PRE_ADD);
const PRE = {};
for (const [k, type, name, p, prefix, cat] of PRE_LIST) { const t = type || k; PRE[k] = { k, type: t, name: name || S[t].name, p: p || {}, prefix: prefix || S[t].prefix, cat: cat || S[t].cat }; }
const CATS = [['rob', 'Robinetterie'], ['secu', 'Sécurité et protection'], ['mes', 'Mesure et régulation'], ['pompes', 'Pompes'], ['equip', 'Équipements'], ['sani', 'Appareils sanitaires et évacuations'], ['ep', 'Eaux pluviales'], ['aero', 'Ventilation et désenfumage'], ['annot', 'Annotations et mise en page']];
const CAT_IDX = Object.fromEntries(CATS.map(([k], i) => [k, i]));
const PALETTE = Object.values(PRE).filter(p => p.cat !== 'annot').map(p => ({ k: p.k, name: p.name, cat: p.cat })).concat([
  { k: '@text', name: 'Texte', cat: 'annot' }, { k: '@zone', name: 'Zone / local', cat: 'annot' }, { k: 'renvoi', name: PRE.renvoi.name, cat: 'annot' }, { k: 'renvoi_arr', name: PRE.renvoi_arr.name, cat: 'annot' }, { k: 'limite', name: PRE.limite.name, cat: 'annot' },
  { k: '@legend', name: 'Légende', cat: 'annot' }, { k: '@nomen', name: 'Nomenclature', cat: 'annot' }, { k: '@cart', name: 'Cartouche', cat: 'annot' }]);

/* ===== Raccordements : réseau attendu et conseils, point par point (onglet « Raccordement ») ===== */
const RP = (nets, tip) => ({ nets: nets ? nets.split(' ') : [], tip: tip || '' });
const ISO = 'Vanne d’isolement';
const RACC = {
  chaudiere: el => ({ c: 'Départ en haut à droite, retour en bas à droite. Le combustible arrive par le dessous, le conduit de fumée part par le dessus.', p: [
    RP('dch', 'Soupape de sécurité au plus près de la chaudière, sans vanne entre les deux. Puis thermomanomètre et vanne d’isolement.'),
    RP('rch', 'Vanne d’isolement, pot à boue ou désemboueur, et piquage du vase d’expansion.'),
    RP(/gaz/i.test(el.p.txt || 'Gaz') ? 'gaz' : '', 'Robinet de barrage accessible au plus près de l’appareil.'),
    RP('', 'Conduit de fumée : il ne se trace pas avec un réseau d’eau. Indiquez-le par un texte ou un renvoi.')] }),
  pac: { c: 'Départ en haut, retour en bas, côté droit.', p: [RP('dch', ISO + ' et manchette antivibratile.'), RP('rch', 'Filtre à tamis pour protéger l’échangeur, vanne d’isolement et manchette antivibratile. Vase d’expansion et soupape s’ils ne sont pas intégrés.')] },
  ballon: el => { const serp = el.p.coil === 'serp', off = RP('', 'Sans serpentin : charge par un échangeur extérieur, ou point laissé libre.'); return { c: 'Eau froide en bas, eau chaude en haut, retour de bouclage en partie médiane. ' + (serp ? 'Primaire (serpentin) à droite : entrée en haut, sortie en bas.' : 'Sans serpentin, les raccordements de droite servent à la charge par un échangeur extérieur ou restent libres.'), p: [
    RP('ecs', 'Thermomètre en sortie, puis mitigeur thermostatique si la distribution l’exige.'),
    RP('becs', 'Retour de boucle : vanne d’équilibrage, clapet anti-retour, circulateur de bouclage et vanne d’isolement.'),
    RP('ef', 'Vanne d’isolement et clapet anti-retour, puis groupe de sécurité raccordé directement sur le ballon, sans vanne entre les deux.'),
    serp ? RP('dch', 'Depuis le départ chauffage : vanne d’isolement et pompe de charge (ou vanne 3 voies) commandée par l’aquastat.') : off,
    serp ? RP('rch', 'Vers le retour chauffage : vanne d’isolement et vanne d’équilibrage.') : off,
    RP('eu', 'Robinet de vidange au point bas, vers l’évacuation.')] }; },
  echangeur: { c: 'Raccordement à contre-courant : le primaire entre en haut à gauche, le secondaire entre en bas à droite.', p: [
    RP('dch', ISO + ', filtre et vanne de régulation (2 ou 3 voies) sur le primaire.'), RP('rch', ISO + ' et vanne d’équilibrage.'),
    RP('dch', 'Thermomètre et vanne d’isolement. Soupape de sécurité côté secondaire.'), RP('rch', ISO + ' et thermomètre.')] },
  echangeur_vap: { c: 'Raccordement à contre-courant : la vapeur entre en haut à gauche, les condensats sortent en bas.', p: [
    RP('vap', 'Vanne d’arrêt, filtre, détendeur et vanne de régulation vapeur.'), RP('cond', 'Purgeur vapeur, puis retour des condensats.'),
    RP('dch', 'Thermomètre et vanne d’isolement. Soupape de sécurité côté eau.'), RP('rch', ISO + ' et thermomètre.')] },
  prep_inst: { c: 'Raccordement à contre-courant : le primaire chauffage entre en haut à gauche, l’eau froide entre en bas à droite.', p: [
    RP('dch', ISO + ', filtre et vanne de régulation sur le primaire.'), RP('rch', ISO + ' et vanne d’équilibrage.'),
    RP('ecs', 'Eau chaude produite : thermomètre, puis distribution ECS.'), RP('ef becs', 'Eau froide d’alimentation, rejointe par le retour de bouclage.')] },
  bouteille: { c: 'À gauche les générateurs (primaire), à droite les circuits (secondaire). Départs en haut, retours en bas.', p: [
    RP('dch', 'Départ des générateurs.'), RP('rch', 'Retour vers les générateurs.'), RP('dch', 'Départ vers les circuits.'), RP('rch', 'Retour des circuits.'),
    RP('', 'Purgeur d’air automatique en partie haute.'), RP('eu', 'Robinet de vidange en partie basse, pour le désembouage.')] },
  collecteur: el => ({ c: 'Alimentez par une extrémité. Le nombre de départs se règle dans l’onglet Propriétés.',
    n: ['Alimentation', 'Extrémité opposée'].concat(Array.from({ length: colN(el) }, (_, i) => 'Départ ' + (i + 1))),
    p: [RP('', 'Arrivée du réseau qui alimente la nourrice.'), RP('', 'Bouchon, purge ou vidange, ou seconde alimentation.')].concat(Array.from({ length: colN(el) }, () => RP('', 'Une vanne d’isolement par départ, repérée par circuit.'))) }),
  adoucisseur: { c: 'Monté en by-pass (3 vannes) pour pouvoir l’isoler sans couper l’eau.', p: [
    RP('ef', 'Filtre et clapet anti-pollution en amont, puis vanne d’entrée du by-pass.'), RP('ea', 'Vanne de mixage pour régler la dureté, puis réseau d’eau adoucie.'),
    RP('eu', 'Vers un entonnoir siphonné avec garde d’air, jamais en direct à l’égout.')] },
  reservoir: el => { const ep = /^cuve_ep/.test(el.pre || ''), ev = el.pre === 'tampon_ev'; return { c: 'Remplissage et trop-plein en partie haute, aspiration en partie basse, vidange au fond.',
    n: ['Remplissage', 'Trop-plein', 'Aspiration', 'Second départ', 'Évent', 'Vidange', 'Refoulement de la pompe immergée'], p: [
    RP(ep ? 'ep' : ev ? 'ef' : '', ep ? 'Arrivée des eaux pluviales filtrées.' : ev ? 'Appoint d’eau de ville par robinet à flotteur, au-dessus du niveau de débordement.' : 'Arrivée par robinet à flotteur ou surverse, au-dessus du niveau maximal.'),
    RP(ep ? 'ep eu' : 'eu', 'Trop-plein vers l’évacuation, avec clapet anti-retour et garde d’air.'),
    RP(ep ? 'enp ep' : '', 'Aspiration au-dessus du fond pour ne pas reprendre les dépôts.'),
    RP('', 'Second départ ou aspiration de secours.'), RP('', 'Évent, avec grille anti-insectes.'), RP('eu', 'Vidange au point bas.'),
    RP(ep ? 'ep' : 'eu ep', 'Clapet anti-retour et vanne d’isolement, puis boucle de refoulement au-dessus du niveau de mise en charge du réseau.' + (ep ? ' Le débit de la pompe fixe le débit de fuite vers le réseau public.' : ''))].slice(0, portsOf(el).length) }; },
  emetteur: { c: 'Aller et retour par le dessous.', p: [RP('dch', 'Robinet thermostatique ou robinet de réglage sur l’aller.'), RP('rch', 'Té de réglage sur le retour.')] },
  bloc: { c: 'Bloc libre : raccordez chaque point selon l’équipement représenté. Les points sont répartis tous les 20 sur le contour.' },
  regul: el => ({ c: 'Reliez-le aux sondes, vannes motorisées et pompes avec le réseau « Liaison de régulation ».', p: portsOf(el).map(() => RP('reg', '')) }),
  surpresseur: { c: 'Aspiration à gauche, refoulement à droite.', p: [
    RP('ef', ISO + ' et manchette antivibratile. Depuis une bâche, ou depuis le réseau avec une protection contre le manque d’eau.'),
    RP('ef', 'Clapet anti-retour, vanne d’isolement, manchette antivibratile, réservoir à vessie et manomètre.')] },
  relevage: el => { const n = el.pre === 'bache_cond' ? 'cond' : 'eu'; return { c: 'Arrivée gravitaire sur le côté, refoulement par le dessus' + (el.p.event ? ', évent en partie haute.' : '.'), p: [
    RP(n, 'Arrivée gravitaire dans la bâche.'), RP(n, 'Clapet anti-retour et vanne d’isolement, avec une boucle de refoulement au-dessus du niveau du réseau d’évacuation.'),
    RP('', n === 'cond' ? 'Évent mené à l’extérieur, sans vanne ni contre-pente, pour évacuer la vapeur de revaporisation et les buées hors du local.' : 'Ventilation menée à l’extérieur ou en toiture, sans vanne.')].slice(0, portsOf(el).length) }; },
  pompe_cond: { p: [RP('cond', 'Condensats des chaudières ou de la CTA, en gravitaire.'), RP('cond eu', 'Refoulement vers l’évacuation, avec clapet anti-retour.')] },
  squid: { c: 'À gauche, la vapeur et les condensats CPCU. À droite, le circuit d’eau chaude.', p: [
    RP('vap', 'Vanne d’arrêt, filtre, détendeur et vanne de régulation vapeur.'), RP('cond', 'Purgeur vapeur, puis retour des condensats vers le réseau CPCU.'),
    RP('dch', 'Départ vers les circuits : vanne d’isolement et thermomètre.'), RP('rch', 'Retour des circuits : vanne d’isolement, pot à boue et vase d’expansion.')] },
  cta: { c: 'Air extérieur à gauche (air neuf en haut, rejet en bas), air intérieur à droite (soufflage en haut, reprise en bas). La batterie se raccorde par le dessus, les condensats sortent par le dessous.', p: [
    RP('an', 'Vers la prise d’air neuf extérieure, avec registre.'), RP('aj', 'Vers la grille de rejet, éloignée de la prise d’air neuf.'),
    RP('as', 'Silencieux, puis réseau de soufflage. Clapet coupe-feu à chaque traversée de paroi coupe-feu.'), RP('ar', 'Réseau de reprise et silencieux. Clapet coupe-feu aux traversées.'),
    RP('dch', ISO + ' sur l’aller de la batterie.'), RP('rch', 'Vanne 3 voies motorisée et vanne d’équilibrage sur le retour.'),
    RP('cond eu', 'Siphon dimensionné selon la pression de la CTA, puis évacuation avec rupture de charge (entonnoir siphonné) ou pompe de relevage des condensats.')] },
  caisson: { c: 'Aspiration à gauche, refoulement à droite.', p: [RP('ar', 'Réseau d’extraction, avec manchette souple.'), RP('aj', 'Vers le rejet extérieur, avec manchette souple.')] },
  pac_air: { c: 'Air à gauche et à droite, eau par le dessous.', p: [RP('ar', 'Air extrait des logements.'), RP('aj', 'Rejet vers l’extérieur.'),
    RP('dch ecs', 'Vers le primaire du ballon ou le circuit à alimenter, avec vanne d’isolement.'), RP('rch ef', 'Retour, avec vanne d’isolement et filtre.')] },
  batterie: { p: [RP('', 'Gaine amont.'), RP('', 'Gaine aval.'), RP('dch', ISO + ' sur l’aller.'), RP('rch', 'Vanne 3 voies motorisée et vanne d’équilibrage sur le retour.')] },
  sanitaire: el => ({ c: 'Alimentations en partie haute, évacuation par le dessous.', p: [
    RP('ef', 'Robinet d’arrêt en attente de l’appareil.'),
    el.p.kind === 'wc' ? RP('', 'Pas d’eau chaude sur un WC : laissez ce point libre.') : RP('ecs', 'Robinet d’arrêt en attente de l’appareil.'),
    RP('eu', 'Siphon, puis raccordement à la chute ou au collecteur EU.')] }),
  siphon_sol: { p: [RP('eu', 'Vers le collecteur d’évacuation.')] },
  fosse_caill: { c: 'Fosse en point bas du local, sous caillebotis amovible. Arrivée et refoulement par le dessus. La pompe immergée doit admettre la température des vidanges (souvent 90 °C en chaufferie ou en sous-station) : vérifier la fiche du modèle.', p: [
    RP('eu cond', 'Par le dessus : vidanges, purges, soupapes et condensats du local se déversent sur le caillebotis, écoulement visible.'),
    RP('eu', 'Clapet anti-retour à boule et vanne d’isolement, puis boucle de refoulement au-dessus du niveau de mise en charge du réseau. Tuyauterie résistant à la température. Le rejet au réseau public est en général limité à 30 °C : prévoir un refroidissement si besoin.')] },
  entonnoir: { c: 'Reçoit les décharges des soupapes, disconnecteurs et groupes de sécurité, avec un écoulement visible.', p: [RP('eu', 'Vers la chute ou le collecteur d’évacuation.')] },
  disco: { c: 'Entre deux vannes avec un filtre en amont, à une hauteur accessible pour l’entretien.', p: [
    RP('ef', ISO + ' et filtre.'), RP('ef', ISO + '.'), RP('eu', 'Vers un entonnoir siphonné, avec garde d’air visible.')] },
  filtre_rc: { c: 'En tête d’installation, juste après le compteur, entre deux vannes d’isolement et à une hauteur accessible pour le rinçage.', p: [
    RP('ef', ISO + '.'), RP('ef', ISO + ', puis protections et réducteur de pression.'), RP('eu', 'Vers un entonnoir siphonné, avec garde d’air visible.')] },
  surp_mp: { c: 'Groupe posé sur son socle à silent-blocs. Aspiration en bas à gauche, refoulement en haut à droite.', p: [
    RP('ef', 'Vanne d’isolement, manchette antivibratile et sécurité manque d’eau (pressostat ou bâche de disconnexion).'),
    RP('ef', 'Vanne d’isolement et manchette antivibratile. Réservoir à diaphragme prégonflé environ 0,2 bar sous la pression d’enclenchement.')] },
  ballon_tampon: { c: 'Le générateur (PAC) se raccorde à droite, l’utilisation à gauche. Chaud en haut, froid en bas.',
    n: ['Départ vers l’utilisation', 'Piquage intermédiaire', 'Retour de l’utilisation', 'Arrivée du générateur', 'Retour vers le générateur', 'Vidange'],
    p: [RP('', ISO + '.'), RP('', 'Libre, ou sonde de température.'), RP('', ISO + '.'), RP('', ISO + ' et thermomètre.'), RP('', 'Filtre, pompe de charge et vanne d’isolement.'), RP('eu', 'Robinet de vidange au point bas.')] },
  bouteille_hp: { c: 'Arrivée de vapeur en haut, purge des condensats au point bas.',
    n: ['Arrivée vapeur', 'Piquage (manomètre)', 'Départ vapeur', 'Purge des condensats', 'Évent', 'Purge basse'],
    p: [RP('vap', 'Depuis l’arrivée CPCU, après la vanne d’arrêt.'), RP('', 'Manomètre avec siphon.'), RP('vap', 'Vers les échangeurs.'), RP('cond', 'Robinet et purgeur vers la bâche de relevage.'), RP('', ''), RP('cond', 'Robinet de purge vers la bâche de relevage.')] },
  gs: { c: 'Toujours sur l’arrivée d’eau froide du ballon.', p: [RP('ef', 'Arrivée d’eau froide.'),
    RP('ef', 'Directement sur l’entrée eau froide du ballon, sans vanne ni clapet intermédiaire.'), RP('eu', 'Vers un entonnoir siphonné, écoulement visible.')] },
  soupape: { p: [RP('', 'Sur le départ du générateur, sans organe d’isolement en amont.'), RP('eu', 'Échappement vers un entonnoir siphonné, écoulement visible.')] },
  vase: { p: [RP('', 'Piquage sur le retour, avec une vanne cadenassable.')] },
  vase_san: { p: [RP('ef', 'Piquage sur l’arrivée d’eau froide du ballon.')] },
  reserve_vessie: { p: [RP('ef', 'Piquage sur le refoulement du surpresseur, avec vanne d’isolement.')] },
  reserve_diaph: { p: [RP('ef', 'Piquage sur le refoulement du surpresseur, avec vanne d’isolement. Prégonflage environ 0,2 bar sous la pression d’enclenchement.')] },
  desemb: { c: 'Sur le retour, en amont du générateur.', p: [RP('', 'Arrivée du retour des circuits.'), RP('', 'Vers le générateur.'), RP('eu', 'Vidange des boues vers l’évacuation.')] },
  pot_intro: { c: 'En dérivation, entre deux vannes, pour injecter le produit de traitement.', p: [RP('', ''), RP('', ''), RP('eu', 'Vidange.')] },
  mitigeur: { c: 'En tête de la distribution d’eau chaude.', p: [RP('ecs', 'Arrivée d’eau chaude du ballon.'), RP('ecs', 'Départ d’eau mitigée vers la distribution.'), RP('ef', 'Arrivée d’eau froide, avec clapet anti-retour.')] },
  v3v: { c: 'Montage en mélange : la voie AB alimente le circuit.', p: [RP('dch', 'Voie A : arrivée chaude, depuis le générateur.'), RP('dch', 'Voie AB : départ mélangé vers le circuit.'), RP('rch', 'Voie B : by-pass depuis le retour du circuit.')] },
  v3v_mix: { c: 'Règle la dureté de l’eau distribuée.', p: [RP('ea', 'Eau adoucie.'), RP('ea', 'Eau mélangée vers la distribution.'), RP('ef', 'Eau brute, non adoucie.')] },
  recup_ep: { c: 'Aspiration dans la bâche par le dessus, appoint d’eau de ville à gauche, distribution à droite, trop-plein par le dessous.', p: [
    RP('ep enp', 'Depuis la bâche de rétention, par crépine flottante.'), RP('ef', 'Appoint par la disconnexion par surverse totale (AB) intégrée : jamais de liaison directe avec l’eau potable.'),
    RP('enp', 'Réseau d’eau non potable séparé et repéré.'), RP('eu', 'Trop-plein vers les eaux usées, avec clapet anti-retour.')] },
  filtre_cart: el => ({ c: 'Sur la distribution, entre deux vannes d’isolement et avant le stérilisateur UV. Cartouche à changer au moins deux fois par an, ou dès que l’écart entre les deux manomètres augmente.', p: [
    RP('enp ef', ISO + '.'), RP('enp ef', ISO + ', puis stérilisateur UV s’il est prévu.'), RP('eu', 'Purge des dépôts vers un entonnoir siphonné ou un siphon de sol.')].slice(0, portsOf(el).length) }),
  uv: { c: 'Toujours après la filtration : les UV n’agissent que sur une eau claire. Alimentation électrique permanente, lampe à remplacer environ une fois par an.', p: [
    RP('enp ef', 'Depuis le filtre à cartouche, avec vanne d’isolement.'), RP('enp ef', ISO + ', puis distribution.')] },
  compteur_ep: { c: 'Mesure l’eau de pluie consommée dans le bâtiment, pour déclarer les volumes rejetés à l’égout (arrêté du 21 août 2008).', p: [
    RP('enp', 'Refoulement du surpresseur, avec vanne d’isolement.'), RP('enp', 'Distribution d’eau non potable.')] },
  surverse: { p: [RP('ef', 'Arrivée d’eau de ville, au-dessus du niveau de débordement.'), RP('', 'Vers le réservoir.')] },
  toiture: el => ({ c: 'Chaque point marque un emplacement possible d’entrée d’eau pluviale.', n: portsOf(el).map((_, i) => 'Évacuation ' + (i + 1)), p: portsOf(el).map(() => RP('ep', 'Entrée d’eau pluviale avec crapaudine, puis descente EP.')) }),
  eep: { p: [RP('ep', 'Descente d’eaux pluviales.')] },
  gargouille: { p: [RP('', 'Trop-plein en façade, à l’air libre.')] },
  renvoi: { p: [RP('', 'Terminez un tuyau ici pour indiquer qu’il continue sur un autre plan ou dans un autre local.')] },
};
RACC.armoire = RACC.regul;
const raccOf = el => { const r = RACC[el.pre] || RACC[el.type]; return (typeof r === 'function' ? r(el) : r) || {}; };
function portName(el, i) {
  const d = S[el.type], r = raccOf(el), n = portsOf(el).length;
  if (r.n && r.n[i]) return r.n[i];
  if (d.pn && d.pn[i]) return d.pn[i];
  if (d.inline && n === 2) return i ? 'Aval' : 'Amont';
  if (n === 1) return d.pin ? 'Piquage sur le tuyau' : 'Raccordement';
  return 'Raccordement ' + (i + 1);
}
function portSide(el, i) {
  const d = S[el.type], n = portsOf(el).length;
  if ((d.pin && n === 1) || (d.inline && n === 2)) return '';
  const [x, y] = portVec(el, i);
  return Math.abs(x) >= Math.abs(y) ? (x > 0 ? 'à droite' : 'à gauche') : (y > 0 ? 'en bas' : 'en haut');
}
function raccAdvice(el) {
  const d = S[el.type], r = raccOf(el);
  if (r.c) return r.c;
  if (d.inline) return 'Symbole en ligne : posez-le directement sur un tuyau déjà tracé. Il s’aligne seul dans le sens d’écoulement ; « Sens » (F) inverse l’amont et l’aval.';
  if (d.pin) return 'Piquage : posez-le sur un tuyau, il s’y accroche perpendiculairement. « Côté » (Maj+F) le fait passer de l’autre côté.';
  return 'Tracez un tuyau depuis chaque point numéroté.';
}

/* ===== Document ===== */
const DEFAULT_NETS = [
  { id: 'ef', abbr: 'EF', name: 'Eau froide', color: '#1c7ed6', dash: 'solid', w: 2.4 },
  { id: 'ea', abbr: 'EA', name: 'Eau adoucie', color: '#0ca5b8', dash: 'solid', w: 2.4 },
  { id: 'ecs', abbr: 'ECS', name: 'Eau chaude sanitaire', color: '#e03131', dash: 'solid', w: 2.4 },
  { id: 'becs', abbr: 'BECS', name: 'Bouclage ECS', color: '#d6336c', dash: 'dash', w: 2.4 },
  { id: 'dch', abbr: 'DCH', name: 'Départ chauffage', color: '#f76707', dash: 'solid', w: 2.4 },
  { id: 'rch', abbr: 'RCH', name: 'Retour chauffage', color: '#7048e8', dash: 'solid', w: 2.4 },
  { id: 'gaz', abbr: 'GAZ', name: 'Gaz', color: '#c99a06', dash: 'solid', w: 2.4 },
  { id: 'eu', abbr: 'EU', name: 'Évacuation / vidange', color: '#8d6e63', dash: 'dash', w: 2 },
  { id: 'reg', abbr: '', name: 'Liaison de régulation', color: '#7d868c', dash: 'dot', w: 1.2 },
  { id: 'ep', abbr: 'EP', name: 'Eaux pluviales', color: '#0b7285', dash: 'dash', w: 2 },
  { id: 'enp', abbr: 'ENP', name: 'Eau non potable (récupération EP)', color: '#74b816', dash: 'solid', w: 2.4 },
  { id: 'vap', abbr: 'VAP', name: 'Vapeur CPCU', color: '#a61e4d', dash: 'solid', w: 2.4 },
  { id: 'cond', abbr: 'COND', name: 'Condensats', color: '#9c36b5', dash: 'dash', w: 2 },
  { id: 'an', abbr: 'AN', name: 'Air neuf', color: '#37b24d', dash: 'solid', w: 4.5 },
  { id: 'as', abbr: 'AS', name: 'Air soufflé', color: '#4dabf7', dash: 'solid', w: 4.5 },
  { id: 'ar', abbr: 'AR', name: 'Air repris / extrait', color: '#f59f00', dash: 'solid', w: 4.5 },
  { id: 'aj', abbr: 'AJ', name: 'Air rejeté', color: '#a9712f', dash: 'solid', w: 4.5 },
];
const FALLBACK_NET = { id: '?', abbr: '', name: 'Réseau', color: '#495057', dash: 'solid', w: 2.4 };
const DASHES = { solid: '', dash: '9 4', dot: '0.1 3.4', dashdot: '12 3 2 3' };
const DASH_OPTS = [['solid', 'Continu'], ['dash', 'Tirets'], ['dot', 'Pointillé'], ['dashdot', 'Mixte']];
const LS_KEY = 'schema-plomberie:v1', LS_CART = 'schema-plomberie:cart';
function newDoc() { return { v: 2, name: 'Sans titre', nets: clone(DEFAULT_NETS), items: [], opts: { hops: true } }; }
let doc = newDoc();
const state = { tool: 'select', pre: null, ghost: null, gRot: 0, gFh: false, activeNet: 'ef', grid: true, sel: new Set(), draft: null, snap: null, space: false, mouse: null, mouseIn: false, libId: null, itab: 'prop', hiPort: null };
const view = { k: 1.5, tx: 60, ty: 60 };
let drag = null;
const byId = id => doc.items.find(i => i.id === id);
const els = () => doc.items.filter(i => i.kind === 'el');
const pipes = () => doc.items.filter(i => i.kind === 'pipe');
const netOf = id => doc.nets.find(n => n.id === id) || FALLBACK_NET;
const netLabel = n => n.name + (n.abbr ? ' (' + n.abbr + ')' : '');
const selItems = () => [...state.sel].map(byId).filter(Boolean);
const prefixOf = el => (PRE[el.pre] && PRE[el.pre].prefix) || (S[el.type] && S[el.type].prefix) || '';
function nextTag(prefix) { if (!prefix) return ''; const re = new RegExp('^' + reEsc(prefix) + '(\\d+)$'); let m = 0; for (const it of doc.items) if (it.kind === 'el' && it.tag) { const r = re.exec(it.tag); if (r) m = Math.max(m, +r[1]); } return prefix + (m + 1); }
function makeEl(k, x, y, ghost) {
  const pre = PRE[k], def = S[pre.type], p = {};
  for (const key in (def.params || {})) p[key] = def.params[key].def;
  Object.assign(p, clone(pre.p));
  return { id: uid(), kind: 'el', type: pre.type, pre: k, x, y, rot: 0, fh: false, p, tag: ghost ? '' : nextTag(pre.prefix), name: pre.name, note: '', st: !!def.tagOn, sn: false, sv: false, lx: 0, ly: 0 };
}
const today = () => new Date().toLocaleDateString('fr-FR');
function makeText(x, y, txt) { return { id: uid(), kind: 'text', x, y, txt: txt || 'Texte', size: 9, bold: false, color: '', align: 'start', bg: false }; }
function makeZone(x, y, w, hh) { return { id: uid(), kind: 'zone', x, y, w: w || 200, h: hh || 120, title: 'Local technique', color: '#5c656b', style: 'dash', fill: false }; }
function makeLegend(x, y) { return { id: uid(), kind: 'legend', x, y, title: 'LÉGENDE', rows: 12, nets: true, syms: true }; }
function makeNomen(x, y) { return { id: uid(), kind: 'nomen', x, y, title: 'NOMENCLATURE' }; }
function makeCart(x, y) { let last = null; try { last = JSON.parse(localStorage.getItem(LS_CART) || 'null'); } catch (e) { /* stockage indisponible */ } return { id: uid(), kind: 'cart', x, y, f: Object.assign({ ent: '', ope: '', titre: 'Schéma de principe', lot: 'Plomberie', phase: 'EXE', ind: 'A', date: today(), ech: 'Sans échelle', auteur: '' }, last || {}, { date: today() }) }; }

/* ===== Géométrie ===== */
function rotv(x, y, deg) { const d = norm360(deg); if (d === 0) return [x, y]; if (d === 90) return [-y, x]; if (d === 180) return [-x, -y]; if (d === 270) return [y, -x]; const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
function xf(el, x, y) { const [a, b] = rotv(el.fh ? -x : x, y, el.rot || 0); return { x: r2(el.x + a), y: r2(el.y + b) }; }
const boxOf = el => { const d = S[el.type]; return typeof d.box === 'function' ? d.box(el) : d.box; };
const portsOf = el => { const d = S[el.type]; return typeof d.ports === 'function' ? d.ports(el) : (d.ports || []); };
const portsW = el => portsOf(el).map(([x, y]) => xf(el, x, y));
function aabb(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; } return { x0, y0, x1, y1 }; }
function elBox(el) { const [x, y, w, hh] = boxOf(el); return aabb([xf(el, x, y), xf(el, x + w, y), xf(el, x, y + hh), xf(el, x + w, y + hh)]); }
function distPtSeg(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; const t = L2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L2, 0, 1) : 0; const x = a.x + t * dx, y = a.y + t * dy; return { d: Math.hypot(p.x - x, p.y - y), t, x, y }; }
function onPoly(p, pts, tol) { tol = tol || 0.6; for (let i = 0; i < pts.length - 1; i++) if (distPtSeg(p, pts[i], pts[i + 1]).d <= tol) return true; return false; }
function segDir(a, b) { const hz = Math.abs(a.y - b.y) < 0.01, vt = Math.abs(a.x - b.x) < 0.01; return hz && !vt ? 'h' : vt && !hz ? 'v' : hz && vt ? 'z' : 'd'; }
function simplify(pts) {
  const out = [];
  for (const p of pts) { if (out.length && near(out[out.length - 1], p, 0.01)) continue; out.push({ x: r2(p.x), y: r2(p.y) }); }
  let ch = true;
  while (ch && out.length > 2) { ch = false; for (let i = 1; i < out.length - 1; i++) { const a = out[i - 1], b = out[i], c = out[i + 1]; const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x), dt = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y); if (Math.abs(cr) < 0.01 && dt > 0) { out.splice(i, 1); ch = true; break; } } }
  return out;
}
function readable(a) { a = ((a % 360) + 360) % 360; if (a > 90 && a <= 270) a -= 180; else if (a > 270) a -= 360; if (Math.abs(a - 90) < 0.01) a = -90; return a; }
/* Direction de sortie d'un raccordement, dans le repère du plan */
function portVec(el, i) {
  const [px, py] = portsOf(el)[i], [bx, by, bw, bh] = boxOf(el), d = S[el.type]; let lx = 0, ly = 0;
  if (px === 0 && py === 0 && d.pin) { lx = -d.pin[0]; ly = -d.pin[1]; }
  else if (px <= bx + 0.5) lx = -1; else if (px >= bx + bw - 0.5) lx = 1; else if (py <= by + 0.5) ly = -1; else if (py >= by + bh - 0.5) ly = 1;
  else if (Math.abs(px) >= Math.abs(py) && px !== 0) lx = Math.sign(px); else if (py !== 0) ly = Math.sign(py); else lx = -1;
  return rotv(el.fh ? -lx : lx, ly, el.rot || 0);
}
function portDir(el, i) { const [x, y] = portVec(el, i); return Math.abs(x) >= Math.abs(y) ? 'h' : 'v'; }

/* ===== Rendu ===== */
function buildCtx() {
  const nets = {}; for (const n of doc.nets) nets[n.id] = n;
  const P_ = pipes(), E_ = els(), ends = new Map();
  for (const p of P_) { const n = nets[p.net] || FALLBACK_NET; for (const q of [p.pts[0], p.pts[p.pts.length - 1]]) { const k = pkey(q); if (!ends.has(k)) ends.set(k, n); } }
  return { nets, pipes: P_, els: E_, ends, boxes: null };
}
function netAt(ctx, pt) { const e = ctx.ends.get(pkey(pt)); if (e) return e; for (const p of ctx.pipes) for (let i = 0; i < p.pts.length - 1; i++) if (distPtSeg(pt, p.pts[i], p.pts[i + 1]).d < 0.6) return ctx.nets[p.net] || FALLBACK_NET; return null; }
function portCtx(el, ctx) {
  if (!ctx) return NOCTX;
  const wp = portsW(el), cache = {};
  const get = i => (i in cache) ? cache[i] : (cache[i] = wp[i] ? netAt(ctx, wp[i]) : null);
  return { pc: i => { const n = get(i); return n ? n.color : 'currentColor'; }, pw: i => { const n = get(i); return n ? n.w : 1.5; } };
}
function elSVG(el, ctx, o) {
  const def = S[el.type]; if (!def) return '';
  let out; try { out = def.draw(el, portCtx(el, ctx)) || {}; } catch (e) { out = { g: '' }; }
  const col = isHex(el.color) ? el.color : 'var(--ink)', b = boxOf(el), op = o.ghost ? ' opacity="0.55"' : '';
  const tr = `translate(${r2(el.x)} ${r2(el.y)})${el.rot ? ` rotate(${el.rot})` : ''}${el.fh ? ' scale(-1 1)' : ''}`;
  let s = `<g data-id="${el.id}" data-hit="item" transform="${tr}" style="color:${col};fill:var(--paper)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"${op}>`;
  if (!o.exp) s += `<rect x="${b[0] - 2}" y="${b[1] - 2}" width="${b[2] + 4}" height="${b[3] + 4}" fill="transparent" stroke="none"/>`;
  s += (out.g || '') + '</g>';
  if (out.t) { const a = readable(el.rot || 0); for (const [x, y, str, size, wt] of out.t) { if (str === '' || str == null) continue; const w = xf(el, x, y); s += `<text x="${w.x}" y="${w.y}"${a ? ` transform="rotate(${r2(a)} ${w.x} ${w.y})"` : ''} font-size="${size}" font-weight="${wt || 400}" text-anchor="middle" dominant-baseline="central" style="fill:${col}" stroke="none" pointer-events="none"${op}>${esc(str)}</text>`; } }
  return s;
}
function haloText(x, y, str, size, wt, anchor, color, rot) {
  const a = `x="${r2(x)}" y="${r2(y)}" font-size="${size}" font-weight="${wt}" text-anchor="${anchor}"${rot ? ` transform="rotate(${r2(rot)} ${r2(x)} ${r2(y)})"` : ''}`;
  return `<text ${a} style="fill:none;stroke:var(--paper)" stroke-width="3" stroke-linejoin="round">${esc(str)}</text><text ${a} style="fill:${color}" stroke="none">${esc(str)}</text>`;
}
function labelLayout(el) {
  const L = []; if (el.st && el.tag) L.push([el.tag, 8, 700]); if (el.sn && el.name) L.push([el.name, 7, 400]); if (el.sv && el.note) L.push([el.note, 7, 400]);
  if (!L.length) return null;
  const bb = elBox(el), W = Math.max(...L.map(([s, z, w]) => tw(s, z, w))), H = L.reduce((a, l) => a + l[1] * 1.2, 0);
  let x, y, anchor;
  if (bb.x1 - bb.x0 >= bb.y1 - bb.y0) { anchor = 'middle'; x = (bb.x0 + bb.x1) / 2; y = bb.y0 - 3 - H; } else { anchor = 'start'; x = bb.x1 + 4; y = (bb.y0 + bb.y1) / 2 - H / 2; }
  x += el.lx || 0; y += el.ly || 0;
  return { L, x, y, anchor, W, H, x0: anchor === 'middle' ? x - W / 2 : x };
}
function labelSVG(el, o) {
  const lay = labelLayout(el); if (!lay) return '';
  let s = `<g data-id="${el.id}" data-hit="label">`;
  if (!o.exp) s += `<rect x="${r2(lay.x0 - 2)}" y="${r2(lay.y - 1)}" width="${r2(lay.W + 4)}" height="${r2(lay.H + 2)}" fill="transparent"/>`;
  let y = lay.y;
  for (const [str, size, wt] of lay.L) { y += size * 1.2; s += haloText(lay.x, y - size * 0.28, str, size, wt, lay.anchor, 'var(--ink)'); }
  return s + '</g>';
}
const HOP = 4.5;
function computeHops(P_) {
  const H = [], V = [];
  for (const p of P_) for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], b = p.pts[i + 1], d = segDir(a, b); if (d === 'h') H.push({ p, i, y: a.y, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x) }); else if (d === 'v') V.push({ p, i, x: a.x, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }); }
  const out = new Map(), m = HOP + 1;
  for (const hs of H) for (const vs of V) {
    if (hs.p === vs.p && Math.abs(hs.i - vs.i) <= 1) continue;
    if (vs.x > hs.x0 + m && vs.x < hs.x1 - m && hs.y > vs.y0 + m && hs.y < vs.y1 - m) { if (!out.has(hs.p.id)) out.set(hs.p.id, new Map()); const mp = out.get(hs.p.id); if (!mp.has(hs.i)) mp.set(hs.i, []); mp.get(hs.i).push(vs.x); }
  }
  return out;
}
const polyD = pts => 'M' + pts.map(p => p.x + ',' + p.y).join('L');
function pipeD(pts, hops) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], xs = hops && hops.get(i - 1);
    if (xs && xs.length) { const dir = Math.sign(b.x - a.x); let last = -1e9; for (const x of xs.slice().sort((u, v) => dir * (u - v))) { if (Math.abs(x - last) < HOP * 2 + 1) continue; d += `L${r2(x - dir * HOP)},${a.y}A${HOP},${HOP} 0 0 ${dir > 0 ? 1 : 0} ${r2(x + dir * HOP)},${a.y}`; last = x; } }
    d += `L${b.x},${b.y}`;
  }
  return d;
}
function arrowsSVG(p, n, ctx) {
  if (!ctx.boxes) ctx.boxes = ctx.els.map(elBox);
  const sz = Math.max(4.2, n.w * 1.9); let s = '';
  for (let i = 0; i < p.pts.length - 1; i++) {
    const a = p.pts[i], b = p.pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 30) continue;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, m = sz + 3; let pos = null;
    for (const f of [0.5, 0.36, 0.64, 0.24, 0.76, 0.14, 0.86]) { const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f; if (!ctx.boxes.some(q => x > q.x0 - m && x < q.x1 + m && y > q.y0 - m && y < q.y1 + m)) { pos = [x, y]; break; } }
    if (!pos) continue;
    const [x, y] = pos, px = -uy, py = ux;
    s += `<path d="M${r2(x + ux * sz)},${r2(y + uy * sz)}L${r2(x - ux * sz * 0.7 + px * sz * 0.72)},${r2(y - uy * sz * 0.7 + py * sz * 0.72)}L${r2(x - ux * sz * 0.7 - px * sz * 0.72)},${r2(y - uy * sz * 0.7 - py * sz * 0.72)}Z" fill="${n.color}" stroke="none"/>`;
  }
  return s;
}
function pipeSVG(p, ctx, hops, o, selected) {
  if (!p.pts || p.pts.length < 2) return '';
  const n = ctx.nets[p.net] || FALLBACK_NET, d = pipeD(p.pts, hops), dash = DASHES[n.dash] || '';
  let s = `<g data-id="${p.id}" data-hit="item">`;
  if (selected) s += `<path d="${d}" fill="none" style="stroke:var(--sel)" stroke-opacity="0.3" stroke-width="${r2(n.w + 7)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="${d}" fill="none" stroke="${n.color}" stroke-width="${n.w}" stroke-linejoin="round" stroke-linecap="${n.dash === 'dot' ? 'round' : 'butt'}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  if (p.arr) s += arrowsSVG(p, n, ctx);
  if (!o.exp) s += `<path d="${polyD(p.pts)}" fill="none" stroke="transparent" stroke-width="11" stroke-linejoin="round"/>`;
  return s + '</g>';
}
function pointAlong(pts, f) {
  const seg = []; let L = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); seg.push(l); L += l; }
  if (!L) return null; let t = L * f;
  for (let i = 0; i < seg.length; i++) { if (t <= seg[i] || i === seg.length - 1) { const a = pts[i], b = pts[i + 1], l = seg[i] || 1, u = Math.min(1, t / l); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, ux: (b.x - a.x) / l, uy: (b.y - a.y) / l }; } t -= seg[i]; }
  return null;
}
const autoLabel = p => { const n = netOf(p.net); return [n.abbr, p.dn].filter(Boolean).join(' '); };
function pipeLabelSVG(p, ctx) {
  if (!p.lab) return '';
  const n = ctx.nets[p.net] || FALLBACK_NET, txt = (p.txt && p.txt.trim()) || [n.abbr, p.dn].filter(Boolean).join(' ');
  if (!txt) return '';
  const at = pointAlong(p.pts, clamp(p.lp == null ? 0.5 : +p.lp, 0, 1)); if (!at) return '';
  const a = readable(Math.atan2(at.uy, at.ux) * 180 / Math.PI), ar = a * Math.PI / 180, off = n.w / 2 + 3;
  return `<g data-id="${p.id}" data-hit="item">` + haloText(at.x + Math.sin(ar) * off, at.y - Math.cos(ar) * off, txt, 7.5, 700, 'middle', n.color, a) + '</g>';
}
function junctionsSVG(ctx) {
  const cnt = new Map(), dots = new Map(), endsOf = p => [p.pts[0], p.pts[p.pts.length - 1]];
  for (const p of ctx.pipes) for (const q of endsOf(p)) cnt.set(pkey(q), (cnt.get(pkey(q)) || 0) + 1);
  for (const p of ctx.pipes) for (const q of endsOf(p)) {
    const k = pkey(q); if (dots.has(k)) continue;
    for (const o of ctx.pipes) { if (o === p || endsOf(o).some(e => near(e, q))) continue; if (onPoly(q, o.pts)) { const n = ctx.nets[o.net] || FALLBACK_NET; dots.set(k, { x: q.x, y: q.y, c: n.color, w: n.w }); break; } }
    if (!dots.has(k) && cnt.get(k) >= 3) { const n = ctx.nets[p.net] || FALLBACK_NET; dots.set(k, { x: q.x, y: q.y, c: n.color, w: n.w }); }
  }
  let s = ''; for (const d of dots.values()) s += `<circle cx="${d.x}" cy="${d.y}" r="${r2(Math.max(2.8, d.w * 1.35))}" fill="${d.c}" stroke="none"/>`;
  return s;
}
const ZDASH = { dash: '7 4', solid: '', dashdot: '14 4 3 4' };
function zoneSVG(z, o) {
  const dash = ZDASH[z.style] == null ? '7 4' : ZDASH[z.style], col = isHex(z.color) ? z.color : '#5c656b';
  let s = `<g data-id="${z.id}" data-hit="item">`;
  if (z.fill) s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${col}" fill-opacity="0.06" stroke="none"/>`;
  s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="none" stroke="${col}" stroke-width="1.3"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  if (!o.exp) s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="none" stroke="transparent" stroke-width="10"/>`;
  if (z.title) { s += `<text x="${z.x + 7}" y="${z.y + 14}" font-size="9" font-weight="700" fill="${col}" stroke="none">${esc(z.title)}</text>`; if (!o.exp) s += `<rect x="${z.x + 4}" y="${z.y + 3}" width="${r2(tw(z.title, 9, 700) + 6)}" height="14" fill="transparent"/>`; }
  return s + '</g>';
}
function textLayout(t) { const lines = String(t.txt == null ? '' : t.txt).split('\n'), wt = t.bold ? 700 : 400, size = +t.size || 9, lh = size * 1.25; const W = Math.max(6, ...lines.map(l => tw(l, size, wt))); return { lines, wt, size, lh, W, H: lines.length * lh, x0: t.align === 'middle' ? t.x - W / 2 : t.align === 'end' ? t.x - W : t.x }; }
function textSVG(t, o) {
  const L = textLayout(t), col = isHex(t.color) ? t.color : 'var(--ink)', an = ['start', 'middle', 'end'].includes(t.align) ? t.align : 'start';
  let s = `<g data-id="${t.id}" data-hit="item">`;
  if (t.bg) s += `<rect x="${r2(L.x0 - 3)}" y="${r2(t.y - 2)}" width="${r2(L.W + 6)}" height="${r2(L.H + 3)}" style="fill:var(--paper)" stroke="none"/>`;
  else if (!o.exp) s += `<rect x="${r2(L.x0 - 2)}" y="${r2(t.y - 1)}" width="${r2(L.W + 4)}" height="${r2(L.H + 2)}" fill="transparent"/>`;
  L.lines.forEach((ln, i) => { s += `<text x="${t.x}" y="${r2(t.y + L.size * 0.95 + i * L.lh)}" font-size="${L.size}" font-weight="${L.wt}" text-anchor="${an}" style="fill:${col}" stroke="none">${esc(ln)}</text>`; });
  return s + '</g>';
}
function symInner(el, sc, cx, cy) {
  const b = boxOf(el), def = S[el.type], tx = cx - (b[0] + b[2] / 2) * sc, ty = cy - (b[1] + b[3] / 2) * sc;
  let out; try { out = def.draw(el, NOCTX) || {}; } catch (e) { out = { g: '' }; }
  let s = `<g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(sc)})" style="color:var(--ink);fill:var(--paper)" stroke="currentColor" stroke-width="${r2(Math.max(1.5, 0.9 / sc))}" stroke-linejoin="round" stroke-linecap="round">`;
  if (def.inline || def.pin) s += Ln(r2(b[0] - 5), 0, r2(b[0] + b[2] + 5), 0, ' stroke-width="1.2"');
  s += (out.g || '') + '</g>';
  for (const [x, y, str, size, wt] of (out.t || [])) if (str) s += `<text x="${r2(tx + x * sc)}" y="${r2(ty + y * sc)}" font-size="${r2(size * sc)}" font-weight="${wt || 400}" text-anchor="middle" dominant-baseline="central" style="fill:var(--ink)" stroke="none" font-family="Arial, Helvetica, sans-serif">${esc(str)}</text>`;
  return s;
}
function thumbSVG(el, minW, minH) {
  minW = minW || 46; minH = minH || 32;
  const b = boxOf(el); let x = b[0] - 6, y = b[1] - 6, w = b[2] + 12, hh = b[3] + 12;
  if (w < minW) { x -= (minW - w) / 2; w = minW; } if (hh < minH) { y -= (minH - hh) / 2; hh = minH; }
  return `<svg viewBox="${r2(x)} ${r2(y)} ${r2(w)} ${r2(hh)}" aria-hidden="true">${symInner(Object.assign({}, el, { x: 0, y: 0, rot: 0, fh: false }), 1, b[0] + b[2] / 2, b[1] + b[3] / 2)}</svg>`;
}
function legendLayout(it, ctx) {
  const rows = [];
  if (it.nets !== false) { const used = new Set(ctx.pipes.map(p => p.net)); for (const n of doc.nets) if (used.has(n.id)) rows.push({ t: 'net', n, label: n.abbr ? n.abbr + ' : ' + n.name : n.name }); }
  if (it.syms !== false) {
    const seen = new Map(); for (const e of ctx.els) { const d = S[e.type]; if (!d || d.nolegend) continue; const k = PRE[e.pre] ? e.pre : e.type; if (!seen.has(k)) seen.set(k, e); }
    for (const [k, e] of [...seen.entries()].sort((a, b) => CAT_IDX[S[a[1].type].cat] - CAT_IDX[S[b[1].type].cat])) rows.push({ t: 'sym', e, label: (PRE[k] && PRE[k].name) || S[e.type].name });
  }
  const fs = 7.5, rh = 22, th = 40, pad = 8, titleH = 20, per = clamp(Math.round(+it.rows || 12), 3, 60), cols = [];
  for (let i = 0; i < rows.length; i += per) cols.push(rows.slice(i, i + per)); if (!cols.length) cols.push([]);
  const cw = cols.map(c => th + 8 + Math.max(70, ...c.map(r => tw(r.label, fs, 400))) + 14);
  return { rows, cols, cw, W: pad * 2 + cw.reduce((a, b) => a + b, 0) - 14, H: titleH + 6 + Math.max(1, ...cols.map(c => c.length)) * rh + 4, fs, rh, th, pad, titleH };
}
function legendSVG(it, ctx) {
  const L = legendLayout(it, ctx);
  let s = `<g data-id="${it.id}" data-hit="item"><rect x="${it.x}" y="${it.y}" width="${r2(L.W)}" height="${r2(L.H)}" style="fill:var(--paper);stroke:var(--ink)" stroke-width="1"/>`;
  s += `<text x="${it.x + L.pad}" y="${it.y + 13.5}" font-size="9" font-weight="700" style="fill:var(--ink)">${esc(it.title || 'LÉGENDE')}</text><line x1="${it.x}" y1="${it.y + L.titleH}" x2="${r2(it.x + L.W)}" y2="${it.y + L.titleH}" style="stroke:var(--ink)" stroke-width="0.8"/>`;
  if (!L.rows.length) s += `<text x="${it.x + L.pad}" y="${it.y + L.titleH + 16}" font-size="7.5" font-style="italic" style="fill:var(--muted-ink)">Aucun élément pour l’instant</text>`;
  let cx = it.x + L.pad;
  L.cols.forEach((col, ci) => {
    col.forEach((r, ri) => {
      const my = it.y + L.titleH + 6 + ri * L.rh + L.rh / 2;
      if (r.t === 'net') { const d = DASHES[r.n.dash]; s += `<line x1="${r2(cx + 4)}" y1="${r2(my)}" x2="${r2(cx + L.th - 4)}" y2="${r2(my)}" stroke="${r.n.color}" stroke-width="${r.n.w}"${d ? ` stroke-dasharray="${d}"` : ''} stroke-linecap="${r.n.dash === 'dot' ? 'round' : 'butt'}"/>`; }
      else { const e = Object.assign({}, r.e, { x: 0, y: 0, rot: 0, fh: false }), b = boxOf(e), sc = Math.min((L.th - 8) / Math.max(b[2], 1), (L.rh - 5) / Math.max(b[3], 1), 1); s += symInner(e, sc, cx + L.th / 2, my); }
      s += `<text x="${r2(cx + L.th + 8)}" y="${r2(my + L.fs * 0.35)}" font-size="${L.fs}" style="fill:var(--ink)">${esc(r.label)}</text>`;
    });
    cx += L.cw[ci];
  });
  return s + '</g>';
}
function compressTags(tags) {
  const by = new Map(), other = [], parts = [];
  for (const t of tags) { const m = /^(.*?)(\d+)$/.exec(t); if (m) { if (!by.has(m[1])) by.set(m[1], []); by.get(m[1]).push(+m[2]); } else other.push(t); }
  for (const [p, nums] of [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const u = [...new Set(nums)].sort((a, b) => a - b);
    for (let i = 0; i < u.length;) { let j = i; while (j + 1 < u.length && u[j + 1] === u[j] + 1) j++; if (j - i >= 2) parts.push(p + u[i] + ' à ' + p + u[j]); else for (let k = i; k <= j; k++) parts.push(p + u[k]); i = j + 1; }
  }
  return parts.concat(other).join(', ');
}
const NOM_HEAD = ['Qté', 'Désignation', 'Caractéristiques', 'Repères'];
function nomenLayout(it, ctx) {
  const groups = new Map();
  for (const e of ctx.els) { const d = S[e.type]; if (!d || d.nonomen) continue; const name = String(e.name || d.name).trim(), note = String(e.note || '').trim(), k = name + '\u0001' + note; let g = groups.get(k); if (!g) groups.set(k, g = { name, note, tags: [], n: 0, ci: CAT_IDX[d.cat] == null ? 9 : CAT_IDX[d.cat] }); g.n++; if (e.tag) g.tags.push(e.tag); }
  const cells = [...groups.values()].sort((a, b) => a.ci - b.ci || a.name.localeCompare(b.name, 'fr')).map(r => [String(r.n), r.name, r.note, compressTags(r.tags)]);
  const fs = 7, rh = 13, pad = 5, titleH = 20, maxW = [30, 210, 170, 150];
  const widths = NOM_HEAD.map((hd, i) => Math.min(maxW[i], Math.max(tw(hd, fs, 700), ...cells.map(c => tw(c[i], fs, 400)))) + pad * 2);
  /* Lignes par colonne : 0 ou vide = une seule colonne ; sinon la nomenclature se répartit en colonnes côte à côte */
  const per = +it.rows > 0 ? clamp(Math.round(+it.rows), 5, 200) : Math.max(1, cells.length), cols = Math.max(1, Math.ceil(cells.length / per)), CW = widths.reduce((a, b) => a + b, 0);
  return { cells, widths, per, cols, CW, W: CW * cols, H: titleH + rh * (Math.min(per, Math.max(1, cells.length)) + 1) + 3, fs, rh, pad, titleH };
}
function nomenSVG(it, ctx) {
  const L = nomenLayout(it, ctx), x0 = it.x, y0 = it.y, yT = y0 + L.titleH;
  let s = `<g data-id="${it.id}" data-hit="item"><rect x="${x0}" y="${y0}" width="${r2(L.W)}" height="${r2(L.H)}" style="fill:var(--paper);stroke:var(--ink)" stroke-width="1"/>`;
  s += `<text x="${x0 + 8}" y="${y0 + 13.5}" font-size="9" font-weight="700" style="fill:var(--ink)">${esc(it.title || 'NOMENCLATURE')}</text>`;
  s += `<rect x="${x0}" y="${yT}" width="${r2(L.W)}" height="${L.rh}" style="fill:var(--hdr)" stroke="none"/><line x1="${x0}" y1="${yT}" x2="${r2(x0 + L.W)}" y2="${yT}" style="stroke:var(--ink)" stroke-width="0.8"/>`;
  for (let k = 0; k < L.cols; k++) {
    const bx = x0 + k * L.CW, rows = L.cells.slice(k * L.per, (k + 1) * L.per);
    if (k) s += `<line x1="${r2(bx)}" y1="${yT}" x2="${r2(bx)}" y2="${r2(y0 + L.H)}" style="stroke:var(--ink)" stroke-width="1"/>`;
    for (let r = 0; r < rows.length; r++) { const y = yT + L.rh * (r + 1); s += `<line x1="${r2(bx)}" y1="${y}" x2="${r2(bx + L.CW)}" y2="${y}" style="stroke:var(--ink)" stroke-width="${r === 0 ? 0.8 : 0.4}"/>`; }
    let cx = bx;
    L.widths.forEach((w, ci) => {
      if (ci) s += `<line x1="${r2(cx)}" y1="${yT}" x2="${r2(cx)}" y2="${r2(yT + L.rh * (rows.length + 1))}" style="stroke:var(--ink)" stroke-width="0.5"/>`;
      const tx = ci === 0 ? cx + w / 2 : cx + L.pad, an = ci === 0 ? 'middle' : 'start';
      s += `<text x="${r2(tx)}" y="${r2(yT + L.rh * 0.72)}" font-size="${L.fs}" font-weight="700" text-anchor="${an}" style="fill:var(--ink)">${esc(NOM_HEAD[ci])}</text>`;
      rows.forEach((c, ri) => { s += `<text x="${r2(tx)}" y="${r2(yT + L.rh * (ri + 1.72))}" font-size="${L.fs}" text-anchor="${an}" style="fill:var(--ink)">${esc(fitText(c[ci], w - L.pad * 2, L.fs, 400))}</text>`; });
      cx += w;
    });
  }
  if (!L.cells.length) s += `<text x="${x0 + 8}" y="${r2(yT + L.rh + 10)}" font-size="7" font-style="italic" style="fill:var(--muted-ink)">Aucun symbole</text>`;
  return s + '</g>';
}
const CART_W = 420, CART_H = 88;
function cartSVG(it) {
  const f = it.f || {}, x = it.x, y = it.y;
  const cell = (cx, cy, w, hh, cap, val, vs, vw) => `<rect x="${cx}" y="${cy}" width="${w}" height="${hh}" fill="none" style="stroke:var(--ink)" stroke-width="0.8"/><text x="${cx + 4}" y="${cy + 8}" font-size="5.5" style="fill:var(--muted-ink)">${esc(cap)}</text><text x="${cx + 4}" y="${cy + hh - 7}" font-size="${vs}" font-weight="${vw}" style="fill:var(--ink)">${esc(fitText(val, w - 8, vs, vw))}</text>`;
  let s = `<g data-id="${it.id}" data-hit="item"><rect x="${x}" y="${y}" width="${CART_W}" height="${CART_H}" style="fill:var(--paper);stroke:var(--ink)" stroke-width="1.4"/>`;
  s += cell(x, y, 170, 30, 'Entreprise', f.ent, 10, 700) + cell(x + 170, y, 250, 30, 'Opération', f.ope, 9, 400) + cell(x, y + 30, CART_W, 30, 'Titre du document', f.titre, 11, 700);
  let cx = x; for (const [cap, val, w] of [['Lot', f.lot, 90], ['Phase', f.phase, 60], ['Indice', f.ind, 50], ['Date', f.date, 80], ['Échelle', f.ech, 70], ['Dessiné par', f.auteur, 70]]) { s += cell(cx, y + 60, w, 28, cap, val, 8, 400); cx += w; }
  return s + '</g>';
}
function bboxOf(it, ctx) {
  switch (it.kind) {
    case 'el': return elBox(it);
    case 'pipe': { const b = aabb(it.pts), w = netOf(it.net).w / 2 + 1; return { x0: b.x0 - w, y0: b.y0 - w, x1: b.x1 + w, y1: b.y1 + w }; }
    case 'text': { const L = textLayout(it); return { x0: L.x0, y0: it.y, x1: L.x0 + L.W, y1: it.y + L.H }; }
    case 'zone': return { x0: it.x, y0: it.y, x1: it.x + it.w, y1: it.y + it.h };
    case 'legend': { const L = legendLayout(it, ctx || buildCtx()); return { x0: it.x, y0: it.y, x1: it.x + L.W, y1: it.y + L.H }; }
    case 'nomen': { const L = nomenLayout(it, ctx || buildCtx()); return { x0: it.x, y0: it.y, x1: it.x + L.W, y1: it.y + L.H }; }
    case 'cart': return { x0: it.x, y0: it.y, x1: it.x + CART_W, y1: it.y + CART_H };
  }
  return null;
}
function contentBBox(ctx) {
  let b = null; const add = q => { if (!q || !isFinite(q.x0)) return; b = b ? { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) } : Object.assign({}, q); };
  for (const it of doc.items) {
    const q = bboxOf(it, ctx); add(q);
    if (it.kind === 'el') { const L = labelLayout(it); if (L) add({ x0: L.x0, y0: L.y, x1: L.x0 + L.W, y1: L.y + L.H }); }
    if (it.kind === 'pipe' && it.lab && q) add({ x0: q.x0 - 14, y0: q.y0 - 14, x1: q.x1 + 14, y1: q.y1 + 14 });
  }
  return b;
}
function contentSVG(o) {
  const ctx = buildCtx(), hops = doc.opts.hops !== false ? computeHops(ctx.pipes) : null, sel = o.exp ? null : state.sel;
  let z = '', p = '', e = '', l = '', a = '';
  for (const it of doc.items) {
    if (it.kind === 'zone') z += zoneSVG(it, o);
    else if (it.kind === 'pipe') { p += pipeSVG(it, ctx, hops && hops.get(it.id), o, sel && sel.has(it.id)); l += pipeLabelSVG(it, ctx); }
    else if (it.kind === 'el') { e += elSVG(it, ctx, o); l += labelSVG(it, o); }
    else if (it.kind === 'text') a += textSVG(it, o);
    else if (it.kind === 'legend') a += legendSVG(it, ctx);
    else if (it.kind === 'nomen') a += nomenSVG(it, ctx);
    else if (it.kind === 'cart') a += cartSVG(it);
  }
  return z + p + junctionsSVG(ctx) + e + l + a;
}
