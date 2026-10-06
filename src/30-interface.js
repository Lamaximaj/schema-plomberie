
/* ===== Panneau de propriétés ===== */
const IB = $('#insp-body');
function live(inp, apply, after) {
  let prev = null;
  inp.addEventListener('focus', () => { prev = snapshot(); });
  inp.addEventListener('input', () => { if (prev === null) prev = snapshot(); apply(); render(); if (after) after(); });
  inp.addEventListener('change', () => { if (prev === null) prev = snapshot(); apply(); commit(prev); prev = snapshot(); if (after) after(); });
  inp.addEventListener('blur', () => { prev = null; });
  return inp;
}
function fText(get, set, o) { o = o || {}; const i = h('input', { class: 'inp', type: 'text', placeholder: o.ph, maxlength: o.max || 200, 'data-k': o.k, list: o.list, 'aria-label': o.aria, spellcheck: 'false', autocomplete: 'off' }); i.value = get() == null ? '' : get(); return live(i, () => set(i.value), o.after); }
function fArea(get, set, o) { o = o || {}; const t = h('textarea', { class: 'inp', rows: o.rows || 3, 'data-k': o.k, spellcheck: 'false' }); t.value = get() == null ? '' : get(); return live(t, () => set(t.value), o.after); }
function fNum(get, set, o) { o = o || {}; const i = h('input', { class: 'inp', type: 'number', min: o.min, max: o.max, step: o.step || 1 }); i.value = get(); return live(i, () => { const v = parseFloat(i.value); if (!isNaN(v)) set(clamp(v, o.min == null ? -1e9 : o.min, o.max == null ? 1e9 : o.max)); }); }
function fColor(get, set) { const i = h('input', { type: 'color', 'aria-label': 'Couleur' }); i.value = get(); return live(i, () => set(i.value)); }
function fRange(get, set) { const i = h('input', { type: 'range', min: 0, max: 1, step: 0.01, 'aria-label': 'Position du libellé' }); i.value = get(); return live(i, () => set(+i.value)); }
function fCheck(get, set, label, after) { const c = h('input', { type: 'checkbox' }); c.checked = !!get(); c.addEventListener('change', () => { const b = snapshot(); set(c.checked); commit(b); if (after) after(); }); return h('label', { class: 'chk' }, c, h('span', null, label)); }
function fSelect(opts, get, set, after) { const s = h('select', { class: 'inp' }, opts.map(([v, l]) => h('option', { value: v }, l))); s.value = String(get()); s.addEventListener('change', () => { const b = snapshot(); set(s.value); commit(b); if (after) after(); }); return s; }
const F = (label, ctrl, extra) => h('div', { class: 'f' }, h('div', { class: 'lab' }, h('span', null, label), extra || null), ctrl);
const SEC = (title, ...kids) => h('section', { class: 'sec' }, title ? h('h3', null, title) : null, ...kids);
const btn = (label, fn, cls, title) => h('button', { class: 'btn sm ghost' + (cls ? ' ' + cls : ''), type: 'button', title, onclick: fn }, label);
const headNode = (thumb, title, sub) => h('div', { class: 'ins-head' }, h('div', { class: 'th', html: thumb }), h('div', null, h('div', { class: 'ins-type' }, title), sub ? h('div', { class: 'ins-sub' }, sub) : null));
const ICO = { rl: '<path d="M4 5v5h5"/><path d="M4.6 14.5A7.5 7.5 0 1 0 6.3 7L4 10"/>', rr: '<path d="M20 5v5h-5"/><path d="M19.4 14.5A7.5 7.5 0 1 1 17.7 7L20 10"/>', fh: '<path d="M4 8h15l-3-3M20 16H5l3 3"/>', fv: '<path d="M3 12h18" stroke-dasharray="2 2"/><path d="M8 9l4-5 4 5z"/><path d="M8 15l4 5 4-5z"/>' };
function orientPad(group) {
  const b = (ic, label, fn, title) => h('button', { class: 'btn', type: 'button', title, onclick: fn, html: `<svg class="ico" viewBox="0 0 24 24">${ICO[ic]}</svg><span>${label}</span>` });
  return h('div', { class: 'orient' }, b('rl', '−90°', () => rotateCmd(-90), 'Tourner de −90° (Maj+R)'), b('rr', '+90°', () => rotateCmd(90), 'Tourner de +90° (R)'),
    b('fh', group ? 'Miroir' : 'Sens', () => flipCmd('h'), group ? 'Symétrie gauche-droite (F)' : 'Inverser le sens (F)'), b('fv', group ? 'Miroir' : 'Côté', () => flipCmd('v'), group ? 'Symétrie haut-bas (Maj+F)' : 'Passer de l’autre côté du tuyau (Maj+F)'));
}
const AL_ICO = { l: 'M4 3v18M8 6h11v4H8zM8 14h7v4H8z', c: 'M12 3v18M6 6h12v4H6zM8.5 14h7v4h-7z', r: 'M20 3v18M5 6h11v4H5zM9 14h7v4H9z',
  t: 'M3 4h18M6 8h4v11H6zM14 8h4v7h-4z', m: 'M3 12h18M6 6h4v12H6zM14 8.5h4v7h-4z', b: 'M3 20h18M6 5h4v11H6zM14 9h4v7h-4z', x: 'M4 4v16M20 4v16M9.5 8h5v8h-5z', y: 'M4 4h16M4 20h16M8 9.5h8v5H8z' };
/* Alignement et répartition des blocs de mise en page sélectionnés */
function alignSec(L) {
  const b = (m, label, fn, title) => h('button', { class: 'btn', type: 'button', title, onclick: fn, html: `<svg class="ico" viewBox="0 0 24 24"><path d="${AL_ICO[m]}"/></svg><span>${label}</span>` });
  const ref = L.ref !== L.mov, n = L.mov.length;
  return SEC('Aligner la mise en page',
    h('div', { class: 'align' }, b('l', 'Gauche', () => alignLayout('l'), 'Aligner les bords gauches'), b('c', 'Centre', () => alignLayout('c'), 'Centrer horizontalement'), b('r', 'Droite', () => alignLayout('r'), 'Aligner les bords droits'),
      b('t', 'Haut', () => alignLayout('t'), 'Aligner les bords hauts'), b('m', 'Milieu', () => alignLayout('m'), 'Centrer verticalement'), b('b', 'Bas', () => alignLayout('b'), 'Aligner les bords bas')),
    n > 2 ? h('div', { class: 'btnrow' }, btn('Répartir en largeur', () => distributeLayout('x')), btn('Répartir en hauteur', () => distributeLayout('y'))) : null,
    h('p', { class: 'hint' }, (ref ? 'Les blocs s’alignent sur la zone sélectionnée, qui ne bouge pas.' : 'Les blocs s’alignent entre eux, sur les bords de l’ensemble sélectionné.') + ' En les faisant glisser un par un, ils s’aimantent aussi aux bords des autres blocs et des zones.'));
}
const actionsSec = () => SEC(null, h('div', { class: 'btnrow' }, btn('Dupliquer', duplicateSel, '', 'Ctrl+D'), btn('Premier plan', () => zorder(true)), btn('Arrière-plan', () => zorder(false)), btn('Supprimer', deleteSel, 'danger', 'Suppr')));
function buildInspector() {
  IB.innerHTML = '';
  const items = selItems();
  if (!items.length) return inspDoc();
  if (items.length > 1) return inspMulti(items);
  const it = items[0];
  ({ el: inspEl, pipe: inspPipe, text: inspText, zone: inspZone, legend: inspLegend, nomen: inspNomen, cart: inspCart })[it.kind](it);
}
function paramField(el, k, sp) {
  const get = () => el.p[k], set = v => { el.p[k] = v; };
  if (sp.type === 'check') return h('div', { class: 'f' }, fCheck(get, set, sp.label));
  if (sp.type === 'select') return F(sp.label, fSelect(sp.options, get, set));
  if (sp.type === 'number') return F(sp.label, fNum(get, set, sp));
  if (sp.type === 'area') return F(sp.label, fArea(get, set, { k: 'p-' + k }));
  return F(sp.label, fText(get, set, { k: 'p-' + k, max: sp.max || 40 }));
}
const ITABS = [['prop', 'Propriétés'], ['racc', 'Raccordement'], ['fonc', 'Fonction']];
function setItab(k) { state.itab = k; state.hiPort = null; buildInspector(); renderUI(); }
const tabsNode = racc => h('div', { class: 'itabs', role: 'tablist' }, ITABS.filter(([k]) => racc || k !== 'racc').map(([k, l]) => h('button', { class: 'itab' + (state.itab === k ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(state.itab === k), onclick: () => setItab(k) }, l)));
function inspEl(el) {
  const def = S[el.type], pre = PRE[el.pre];
  IB.append(headNode(thumbSVG(el), (pre && pre.name) || def.name, CATS[CAT_IDX[def.cat]][1]));
  const racc = portsOf(el).length > 0; IB.append(tabsNode(racc));
  if (state.itab === 'racc' && racc) { inspRacc(el); return; }
  if (state.itab === 'fonc') { inspFonc(el); return; }
  IB.append(SEC(null,
    F('Repère', fText(() => el.tag, v => { el.tag = v; }, { k: 'tag', max: 24, aria: 'Repère' }), fCheck(() => el.st, v => { el.st = v; }, 'Afficher')),
    F('Désignation', fText(() => el.name, v => { el.name = v; }, { k: 'name', max: 120, aria: 'Désignation' }), fCheck(() => el.sn, v => { el.sn = v; }, 'Afficher')),
    F('Caractéristiques', fText(() => el.note, v => { el.note = v; }, { k: 'note', ph: 'DN, PN, débit, volume…', max: 120, aria: 'Caractéristiques' }), fCheck(() => el.sv, v => { el.sv = v; }, 'Afficher'))));
  const cur = norm360(el.rot || 0), angles = [0, 45, 90, 135, 180, 225, 270, 315]; if (!angles.includes(cur)) angles.push(cur);
  IB.append(SEC('Orientation', orientPad(false),
    h('div', { class: 'row2' }, F('Angle', fSelect(angles.sort((a, b) => a - b).map(a => [a, a + '°']), () => cur, v => { transformEl(el, e => { e.rot = +v; }); }, buildInspector)), F('Miroir', fSelect([['0', 'Non'], ['1', 'Oui']], () => el.fh ? '1' : '0', v => { transformEl(el, e => { e.fh = v === '1'; }); }, buildInspector))),
    h('p', { class: 'hint' }, def.inline ? 'Lâché sur un tuyau, ce symbole s’aligne seul dans le sens du tracé. « Sens » l’inverse, « Côté » passe le corps ou le moteur de l’autre côté du tuyau.' : 'Tournez l’élément pour placer ses raccordements comme sur le terrain.')));
  if (def.params) IB.append(SEC('Réglages', ...Object.entries(def.params).map(([k, sp]) => paramField(el, k, sp))));
  IB.append(SEC('Apparence', F('Couleur du symbole', h('div', { class: 'btnrow' }, fColor(() => isHex(el.color) ? el.color : '#16191b', v => { el.color = v; }), btn('Par défaut', () => { const b = snapshot(); delete el.color; commit(b); buildInspector(); }))),
    (el.lx || el.ly) ? btn('Replacer les libellés', () => { const b = snapshot(); el.lx = 0; el.ly = 0; commit(b); buildInspector(); }) : null));
  IB.append(actionsSec());
}
/* ===== Onglet « Raccordement » : où et comment raccorder chaque point ===== */
const elRef = (o, j) => (o.tag || o.name || S[o.type].name) + (portsOf(o).length > 1 ? ', ' + portName(o, j).toLowerCase() : '');
function portAt(q, skip, ctx) { for (const o of ctx.els) { if (o === skip) continue; const j = portsW(o).findIndex(w => near(w, q)); if (j >= 0) return elRef(o, j); } return ''; }
function portStatus(el, q, ctx) {
  for (const p of ctx.pipes) {
    const a = p.pts[0], b = p.pts[p.pts.length - 1], end = near(a, q) ? 0 : near(b, q) ? 1 : -1; if (end < 0) continue;
    const far = end ? a : b, n = netOf(p.net); let to = portAt(far, el, ctx);
    if (!to) { const host = ctx.pipes.find(o => o !== p && onPoly(far, o.pts)); if (host) to = 'piquage sur ' + (netOf(host.net).abbr || netOf(host.net).name); }
    return { net: n, txt: (n.abbr || n.name) + (to ? ' vers ' + to : '') };
  }
  const host = ctx.pipes.find(p => onPoly(q, p.pts)); if (host) { const n = netOf(host.net); return { net: n, txt: 'Posé sur le tuyau ' + (n.abbr || n.name) }; }
  const to = portAt(q, el, ctx); return to ? { net: null, txt: 'Accolé à ' + to } : null;
}
function raccFigure(el, ctx) {
  const W = 268, H = 150, P = 30, b = elBox(el), bw = Math.max(b.x1 - b.x0, 1), bh = Math.max(b.y1 - b.y0, 1), k = Math.min((W - 2 * P) / bw, (H - 2 * P) / bh, 4);
  const vw = W / k, vh = H / k, x0 = (b.x0 + b.x1) / 2 - vw / 2, y0 = (b.y0 + b.y1) / 2 - vh / 2;
  return `<svg viewBox="${r2(x0)} ${r2(y0)} ${r2(vw)} ${r2(vh)}" width="${W}" height="${H}" aria-hidden="true">${elSVG(el, ctx, { exp: true })}${portBadges(el, k, ctx, -1)}</svg>`;
}
function traceFrom(el, i, net) {
  const q = portsW(el)[i];
  if (net) setActiveNet(net.id);
  setTool('pipe');
  state.draft = { pts: [{ x: q.x, y: q.y }], net: state.activeNet, flip: false, start: { kind: 'port', el, i, x: q.x, y: q.y }, preview: null };
  app.classList.remove('show-insp'); showDraftBar(); updateHint(); renderUI();
  toast('Tuyau ' + netLabel(netOf(state.activeNet)) + ' depuis « ' + portName(el, i) + ' » : cliquez les coudes, puis le point d’arrivée.');
}
function hoverPort(el, i) { state.hiPort = el ? { id: el.id, i } : null; renderUI(); }
function raccRow(el, i, st, info) {
  const want = info.nets.map(id => doc.nets.find(n => n.id === id)).filter(Boolean), side = portSide(el, i), net = st && st.net;
  const bad = net && want.length && !want.some(n => n.id === net.id);
  const chip = n => h('span', { class: 'chip' }, h('span', { class: 'sw', style: 'background:' + n.color }), n.abbr || n.name);
  return h('li', { class: 'racc-row' + (st ? ' done' : ''), onmouseenter: () => hoverPort(el, i), onmouseleave: () => hoverPort(null) },
    h('span', { class: 'rn' + (net ? ' ok' : ''), style: net ? 'background:' + net.color : null }, String(i + 1)),
    h('div', { class: 'rb' },
      h('div', { class: 'rt' }, h('b', null, portName(el, i)), side ? h('span', { class: 'rside' }, side) : null),
      h('div', { class: 'rs' + (st ? '' : ' free') }, net ? h('span', { class: 'sw', style: 'background:' + net.color }) : null, st ? st.txt : 'Libre'),
      want.length ? h('div', { class: 'rw' }, h('span', null, 'Réseau attendu'), want.map(chip)) : null,
      bad ? h('div', { class: 'rbad' }, 'Raccordé sur un autre réseau que celui attendu.') : null,
      info.tip ? h('p', { class: 'rtip' }, info.tip) : null,
      st ? null : h('div', { class: 'btnrow', style: 'margin-top:7px' }, h('button', { class: 'btn sm ghost', type: 'button', title: 'Commencer un tuyau depuis ce point', onclick: () => traceFrom(el, i, want[0]), onfocus: () => hoverPort(el, i), onblur: () => hoverPort(null) }, 'Tracer depuis ce point'))));
}
/* Onglet Fonction : rôle de l’organe et règles de pose */
function foncBody(f) {
  return f ? [SEC('À quoi il sert', h('p', { class: 'fonc' }, f[0])), SEC('Où et comment le poser', h('p', { class: 'fonc' }, f[1]))]
    : [SEC(null, h('p', { class: 'hint' }, 'Pas encore de fiche pour ce symbole.'))];
}
function inspFonc(el) {
  IB.append(...foncBody(foncOf(el)), SEC(null, h('div', { class: 'btnrow' }, btn('Voir la fonction de tous les organes', () => openFonctions()))));
}
function openFonctions() {
  const q = h('input', { class: 'search', type: 'search', placeholder: 'Rechercher un organe ou une fonction', 'aria-label': 'Rechercher un organe ou une fonction', autocomplete: 'off' }), list = h('div', { class: 'fonc-list' });
  const fill = () => {
    const t = norm(q.value.trim()); list.innerHTML = '';
    for (const [cat, label] of CATS) {
      const rows = Object.values(PRE).filter(p => p.cat === cat).map(p => ({ p, f: FONC[p.k] || FONC[p.type] })).filter(r => r.f && (!t || norm(r.p.name + ' ' + r.f[0] + ' ' + r.f[1]).includes(t)));
      if (!rows.length) continue;
      list.append(h('h3', { class: 'fonc-cat' }, label), ...rows.map(({ p, f }) => h('div', { class: 'fonc-row' }, h('div', { class: 'th', html: thumbSVG(makeEl(p.k, 0, 0, true)) }), h('div', { class: 'fonc-txt' }, h('b', null, p.name), h('p', null, f[0]), h('p', { class: 'fonc-pose' }, f[1])))));
    }
    if (!list.children.length) list.append(h('p', { class: 'hint' }, 'Aucun organe ne correspond à cette recherche.'));
  };
  q.addEventListener('input', fill); fill();
  modal('Fonction des organes', h('div', null, q, list), [h('button', { class: 'btn primary', type: 'button', onclick: closeModal }, 'Fermer')]);
  $('.modal').classList.add('wide'); q.focus();
}
function inspRacc(el) {
  const ctx = buildCtx(), r = raccOf(el), wp = portsW(el), st = wp.map(q => portStatus(el, q, ctx)), done = st.filter(Boolean).length;
  IB.append(SEC(null, h('div', { class: 'racc-fig', html: raccFigure(el, ctx) }),
    h('div', { class: 'racc-sum' }, h('b', null, done + ' / ' + wp.length), wp.length > 1 ? ' points raccordés' : ' point raccordé'),
    h('p', { class: 'racc-tip' }, raccAdvice(el)),
    (norm360(el.rot || 0) || el.fh) && raccOf(el).c ? h('p', { class: 'hint' }, 'Ces repères décrivent le symbole dans son sens d’origine. Ici il est tourné ou retourné : suivez les numéros et le côté indiqué pour chaque point.') : null));
  IB.append(SEC('Points de raccordement', h('ol', { class: 'racc' }, wp.map((q, i) => raccRow(el, i, st[i], (r.p && r.p[i]) || RP())))));
  IB.append(SEC(null, h('p', { class: 'hint', style: 'margin:0' }, 'Les numéros restent affichés sur le plan tant que cet onglet est ouvert. Avec l’outil Tuyauterie (L), vous pouvez aussi partir du cercle vert d’un point.')));
}
function inspPipe(p) {
  const n = netOf(p.net), dash = DASHES[n.dash];
  IB.append(headNode(`<svg viewBox="0 0 64 46"><line x1="8" y1="23" x2="56" y2="23" stroke="${n.color}" stroke-width="3"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg>`, 'Tuyauterie', netLabel(n)));
  IB.append(SEC(null,
    F('Réseau', fSelect(doc.nets.map(x => [x.id, netLabel(x)]), () => p.net, v => { p.net = v; }, buildInspector)),
    F('Diamètre', fText(() => p.dn, v => { p.dn = v; }, { ph: 'DN50, Ø32, PER 20…', list: 'dn-list', k: 'dn' })),
    h('div', { class: 'f' }, fCheck(() => p.arr, v => { p.arr = v; }, 'Flèches de sens d’écoulement')),
    h('div', { class: 'btnrow' }, btn('Inverser le sens du tracé', () => { const b = snapshot(); p.pts.reverse(); commit(b); toast('Sens du tracé inversé.'); })),
    h('p', { class: 'hint' }, 'Glissez un point carré pour le déplacer, un rond pour décaler un segment. Double-clic sur le tuyau : ajouter un coude.')));
  IB.append(SEC('Libellé', h('div', { class: 'f' }, fCheck(() => p.lab, v => { p.lab = v; }, 'Afficher sur le tuyau')), F('Texte', fText(() => p.txt, v => { p.txt = v; }, { ph: autoLabel(p) || 'Automatique', k: 'txt' })), F('Position le long du tuyau', fRange(() => p.lp == null ? 0.5 : p.lp, v => { p.lp = v; }))));
  IB.append(actionsSec());
}
function inspText(t) {
  IB.append(headNode('<svg viewBox="0 0 64 46"><text x="32" y="30" text-anchor="middle" font-size="20" font-family="Arial" fill="#16191b">Aa</text></svg>', 'Texte'));
  IB.append(SEC(null, F('Contenu', fArea(() => t.txt, v => { t.txt = v; }, { k: 'txt', rows: 4 })),
    h('div', { class: 'row2' }, F('Taille', fNum(() => t.size, v => { t.size = v; }, { min: 5, max: 60, step: 0.5 })), F('Alignement', fSelect([['start', 'Gauche'], ['middle', 'Centre'], ['end', 'Droite']], () => t.align || 'start', v => { t.align = v; }))),
    h('div', { class: 'f' }, fCheck(() => t.bold, v => { t.bold = v; }, 'Gras')), h('div', { class: 'f' }, fCheck(() => t.bg, v => { t.bg = v; }, 'Fond blanc sous le texte')),
    F('Couleur', fColor(() => isHex(t.color) ? t.color : '#16191b', v => { t.color = v; }))));
  IB.append(actionsSec());
}
function inspZone(z) {
  IB.append(headNode('<svg viewBox="0 0 64 46"><rect x="8" y="8" width="48" height="30" fill="none" stroke="#5c656b" stroke-width="1.5" stroke-dasharray="5 3"/></svg>', 'Zone ou local'));
  IB.append(SEC(null, F('Titre', fText(() => z.title, v => { z.title = v; }, { k: 'title', max: 80 })),
    h('div', { class: 'row2' }, F('Largeur', fNum(() => z.w, v => { z.w = snap(v); }, { min: 40, max: 6000, step: 10 })), F('Hauteur', fNum(() => z.h, v => { z.h = snap(v); }, { min: 40, max: 6000, step: 10 }))),
    F('Trait', fSelect([['dash', 'Tirets'], ['dashdot', 'Mixte (limite de prestation)'], ['solid', 'Continu']], () => z.style, v => { z.style = v; })),
    h('div', { class: 'f' }, fCheck(() => z.fill, v => { z.fill = v; }, 'Fond teinté')), F('Couleur', fColor(() => isHex(z.color) ? z.color : '#5c656b', v => { z.color = v; }))));
  IB.append(actionsSec());
}
const sizeField = (it, label) => F(label, h('div', null, fNum(() => Math.round(cartSc(it) * 100), v => { it.sc = clamp(Math.round(+v || 100), 50, 400) / 100; }, { min: 50, max: 400, step: 25 }), h('p', { class: 'hint' }, 'Ou tirez un coin vert du bloc sur le schéma.')));
function inspLegend(it) {
  IB.append(headNode('<svg viewBox="0 0 64 46"><rect x="12" y="8" width="40" height="30" fill="#fff" stroke="#16191b"/><line x1="16" y1="17" x2="26" y2="17" stroke="#1c7ed6" stroke-width="2.5"/><line x1="16" y1="28" x2="26" y2="28" stroke="#e03131" stroke-width="2.5"/></svg>', 'Légende', 'Mise à jour automatique'));
  IB.append(SEC(null, sizeField(it, 'Taille de la légende (%)'), F('Titre', fText(() => it.title, v => { it.title = v; }, { k: 'title', max: 60 })), F('Lignes par colonne', fNum(() => it.rows, v => { it.rows = Math.round(v); }, { min: 3, max: 60 })),
    h('div', { class: 'f' }, fCheck(() => it.nets !== false, v => { it.nets = v; }, 'Réseaux utilisés')), h('div', { class: 'f' }, fCheck(() => it.syms !== false, v => { it.syms = v; }, 'Symboles utilisés'))));
  IB.append(actionsSec());
}
function inspNomen(it) {
  IB.append(headNode('<svg viewBox="0 0 64 46"><rect x="10" y="8" width="44" height="30" fill="#fff" stroke="#16191b"/><path d="M10 16H54M10 23H54M10 30H54M20 8V38M38 8V38" stroke="#16191b" stroke-width=".8"/></svg>', 'Nomenclature', 'Mise à jour automatique'));
  IB.append(SEC(null, sizeField(it, 'Taille de la nomenclature (%)'), F('Titre', fText(() => it.title, v => { it.title = v; }, { k: 'title', max: 60 })), F('Lignes par colonne (0 : une seule colonne)', fNum(() => +it.rows || 0, v => { it.rows = Math.max(0, Math.round(v)); }, { min: 0, max: 200 })), h('p', { class: 'hint' }, 'Les symboles sont regroupés par désignation et caractéristiques. Renseignez-les dans les propriétés de chaque symbole pour obtenir les quantités par référence.')));
  IB.append(actionsSec());
}
function inspCart(it) {
  IB.append(headNode('<svg viewBox="0 0 64 46"><rect x="6" y="11" width="52" height="24" fill="#fff" stroke="#16191b" stroke-width="1.4"/><path d="M6 19H58M6 27H58M24 11V19M18 27V35M30 27V35M44 27V35" stroke="#16191b" stroke-width=".8"/></svg>', 'Cartouche'));
  const keep = () => { try { localStorage.setItem(LS_CART, JSON.stringify({ ent: it.f.ent, auteur: it.f.auteur })); } catch (e) { /* stockage indisponible */ } };
  const fld = (k, label) => F(label, fText(() => it.f[k], v => { it.f[k] = v; }, { k: 'f-' + k, max: 120, after: keep }));
  IB.append(SEC(null, sizeField(it, 'Taille du cartouche (%)'), fld('ent', 'Entreprise'), fld('ope', 'Opération'), fld('titre', 'Titre du document'), h('div', { class: 'row2' }, fld('lot', 'Lot'), fld('phase', 'Phase')), h('div', { class: 'row2' }, fld('ind', 'Indice'), fld('date', 'Date')), h('div', { class: 'row2' }, fld('ech', 'Échelle'), fld('auteur', 'Dessiné par'))));
  IB.append(actionsSec());
}
function inspMulti(items) {
  const nE = items.filter(i => i.kind === 'el').length, ps = items.filter(i => i.kind === 'pipe');
  IB.append(headNode('<svg viewBox="0 0 64 46"><rect x="10" y="9" width="30" height="20" rx="2" fill="none" stroke="#2c9a46" stroke-dasharray="3 2"/><rect x="24" y="17" width="30" height="20" rx="2" fill="none" stroke="#2c9a46" stroke-dasharray="3 2"/></svg>', items.length + ' éléments sélectionnés', [nE ? nE + ' symbole' + (nE > 1 ? 's' : '') : '', ps.length ? ps.length + ' tuyau' + (ps.length > 1 ? 'x' : '') : ''].filter(Boolean).join(', ')));
  const L = layoutSets(items); if (L) IB.append(alignSec(L));
  if (nE || ps.length) IB.append(SEC('Orienter l’ensemble', orientPad(true), h('p', { class: 'hint' }, 'L’ensemble pivote autour de son centre et les tuyaux raccordés suivent.')));
  if (ps.length) IB.append(SEC('Tuyauteries', F('Réseau', fSelect([['', 'Inchangé'], ...doc.nets.map(x => [x.id, netLabel(x)])], () => '', v => { if (v) for (const p of ps) p.net = v; })),
    F('Diamètre', fText(() => '', v => { for (const p of ps) p.dn = v; }, { ph: 'Appliquer à tous', list: 'dn-list' })),
    h('div', { class: 'btnrow' }, btn('Afficher les libellés', () => { const b = snapshot(); for (const p of ps) p.lab = true; commit(b); }), btn('Masquer les libellés', () => { const b = snapshot(); for (const p of ps) p.lab = false; commit(b); }), btn('Flèches de sens', () => { const b = snapshot(), v = !ps.every(p => p.arr); for (const p of ps) p.arr = v; commit(b); }))));
  if (nE > 1) IB.append(SEC('Aligner les symboles', h('div', { class: 'btnrow' }, btn('Sur une même ligne', () => alignEls('y')), btn('Sur une même colonne', () => alignEls('x')))));
  IB.append(SEC(null, h('div', { class: 'btnrow' }, btn('Dupliquer', duplicateSel, '', 'Ctrl+D'), btn('Supprimer', deleteSel, 'danger', 'Suppr'))));
}
function inspDoc() {
  IB.append(headNode('<svg viewBox="0 0 64 46"><path d="M6 23H58" stroke="#1c7ed6" stroke-width="2.5"/><path d="M22 17L22 29L32 17L32 29Z" fill="#fff" stroke="#16191b" stroke-width="1.4"/><circle cx="44" cy="23" r="6" fill="#fff" stroke="#16191b" stroke-width="1.4"/><path d="M41.8 19.5L41.8 26.5L48 23Z" fill="#16191b"/></svg>', doc.name || 'Sans titre', els().length + ' symboles, ' + pipes().length + ' tuyaux'));
  const list = h('div', { class: 'nets' }); doc.nets.forEach((n, i) => list.append(netRow(n, i)));
  IB.append(SEC('Réseaux', h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Cliquez sur la pastille d’un réseau pour tracer avec. Au clavier : touches 1 à 9.'), list, h('div', { class: 'btnrow', style: 'margin-top:8px' }, btn('Ajouter un réseau', addNet))));
  const g = h('input', { type: 'checkbox' }); g.checked = state.grid; g.addEventListener('change', () => { state.grid = g.checked; updateGrid(); });
  IB.append(SEC('Affichage', h('div', { class: 'f' }, h('label', { class: 'chk' }, g, h('span', null, 'Grille'))), h('div', { class: 'f' }, fCheck(() => doc.opts.hops !== false, v => { doc.opts.hops = v; }, 'Sauts aux croisements de tuyaux')), h('div', { class: 'f' }, fCheck(() => !!doc.opts.real, v => { doc.opts.real = v; }, 'Équipements en vue réaliste'))));
  IB.append(SEC('Repères', h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Numérote les symboles de gauche à droite, ligne par ligne.'), btn('Renuméroter les repères', renumber)));
  const keys = [['V', 'Sélection'], ['L', 'Tuyauterie'], ['T', 'Texte'], ['Z', 'Zone ou local'], ['R', 'Tourner de 90°'], ['F', 'Inverser le sens'], ['Maj+F', 'Passer de l’autre côté'], ['1 à 9', 'Réseau du tracé'], ['/', 'Autre coude pendant le tracé'], ['Maj', 'Tracé à 45°, ou déplacement droit'], ['Alt + glisser', 'Dupliquer'], ['Ctrl+Z', 'Annuler'], ['Suppr', 'Supprimer'], ['Flèches', 'Décaler d’un pas'], ['Espace + glisser', 'Déplacer la vue'], ['0', 'Ajuster à l’écran'], ['G', 'Grille']];
  IB.append(SEC('Raccourcis', h('div', { class: 'keys' }, keys.flatMap(([k, t]) => [h('kbd', null, k), h('span', null, t)]))));
}
function netRow(n, i) {
  const on = state.activeNet === n.id, row = h('div', { class: 'net' + (on ? ' on' : '') });
  const pick = h('button', { class: 'pick', type: 'button', title: 'Tracer avec ce réseau', 'aria-pressed': on ? 'true' : 'false', onclick: () => { setActiveNet(n.id); setTool('pipe'); } }, h('span', { class: 'sw', style: 'background:' + n.color }), i < 9 ? String(i + 1) : '');
  const col = h('input', { type: 'color', 'aria-label': 'Couleur du réseau' }); col.value = n.color; live(col, () => { n.color = col.value; }, () => { pick.firstChild.style.background = col.value; updateNetBtn(); });
  const ab = h('input', { class: 'inp', type: 'text', maxlength: 6, 'aria-label': 'Abréviation' }); ab.value = n.abbr; live(ab, () => { n.abbr = ab.value; }, updateNetBtn);
  const nm = h('input', { class: 'inp', type: 'text', maxlength: 40, 'aria-label': 'Nom du réseau' }); nm.value = n.name; live(nm, () => { n.name = nm.value; });
  const ext = h('div', { class: 'ext', hidden: true }, fSelect(DASH_OPTS, () => n.dash, v => { n.dash = v; }), fSelect([['1.2', 'Fin'], ['2', 'Moyen'], ['2.4', 'Normal'], ['3.2', 'Épais'], ['4.5', 'Gaine']], () => String(n.w), v => { n.w = +v; }), btn('Supprimer', () => delNet(n), 'danger'));
  const more = h('button', { class: 'btn sm ghost more', type: 'button', title: 'Style du trait', 'aria-expanded': 'false', onclick: () => { ext.hidden = !ext.hidden; more.setAttribute('aria-expanded', String(!ext.hidden)); } }, '…');
  row.append(pick, col, ab, nm, more, ext);
  return row;
}
function addNet() { const before = snapshot(), id = 'n' + uid(); doc.nets.push({ id, abbr: 'R' + (doc.nets.length + 1), name: 'Nouveau réseau', color: '#2f9e44', dash: 'solid', w: 2.4 }); commit(before); buildInspector(); }
function delNet(n) {
  const used = pipes().filter(p => p.net === n.id).length;
  if (used) { toast('Ce réseau est utilisé par ' + used + ' tuyau' + (used > 1 ? 'x' : '') + '. Réaffectez-les avant de le supprimer.'); return; }
  if (doc.nets.length <= 1) return;
  const before = snapshot(); doc.nets = doc.nets.filter(x => x !== n); if (state.activeNet === n.id) state.activeNet = doc.nets[0].id; commit(before); updateNetBtn(); buildInspector();
}
function setActiveNet(id) { state.activeNet = id; if (state.draft) state.draft.net = id; updateNetBtn(); updateHint(); renderUI(); if (!state.sel.size) buildInspector(); scheduleSave(); }
function updateNetBtn() { const n = netOf(state.activeNet); $('#net-sw').style.background = n.color; $('#net-ab').textContent = n.abbr || n.name.slice(0, 8); }
function focusField(k, select) { const f = IB.querySelector(`[data-k="${k}"]`); if (!f) return; if (window.innerWidth <= 860) app.classList.add('show-insp'); setTimeout(() => { f.focus(); if (select && f.select) f.select(); }, 30); }

/* ===== Bibliothèque de symboles ===== */
const SPECIAL_THUMB = {
  '@text': '<svg viewBox="0 0 46 32"><text x="23" y="21" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#16191b">Aa</text></svg>',
  '@zone': '<svg viewBox="0 0 46 32"><rect x="6" y="6" width="34" height="20" fill="none" stroke="#5c656b" stroke-width="1.4" stroke-dasharray="4 2.5"/></svg>',
  '@legend': '<svg viewBox="0 0 46 32"><rect x="5" y="4" width="36" height="24" fill="#fff" stroke="#16191b"/><line x1="9" y1="12" x2="17" y2="12" stroke="#1c7ed6" stroke-width="2"/><line x1="20" y1="12" x2="36" y2="12" stroke="#9aa2a7"/><line x1="9" y1="20" x2="17" y2="20" stroke="#e03131" stroke-width="2"/><line x1="20" y1="20" x2="33" y2="20" stroke="#9aa2a7"/></svg>',
  '@nomen': '<svg viewBox="0 0 46 32"><rect x="5" y="4" width="36" height="24" fill="#fff" stroke="#16191b"/><path d="M5 10H41M5 16H41M5 22H41M13 4V28M28 4V28" stroke="#16191b" stroke-width=".8" fill="none"/></svg>',
  '@cart': '<svg viewBox="0 0 46 32"><rect x="4" y="6" width="38" height="20" fill="#fff" stroke="#16191b" stroke-width="1.4"/><path d="M4 13H42M4 19H42M19 6V13M14 19V26M26 19V26M34 19V26" stroke="#16191b" stroke-width=".8" fill="none"/></svg>',
};
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let palDrag = null;
let palReal = null;
function buildPalette() {
  palReal = REAL();
  const list = $('#pal-list'), q = norm($('#pal-q').value.trim()); list.innerHTML = '';
  for (const [cat, label] of CATS) {
    const entries = PALETTE.filter(p => p.cat === cat && (!q || norm(p.name).includes(q))); if (!entries.length) continue;
    list.append(h('details', { class: 'cat', open: true }, h('summary', null, h('span', null, label), h('span', { class: 'cnt' }, String(entries.length))), h('div', { class: 'tiles' }, entries.map(tile))));
  }
  if (!list.children.length) list.append(h('p', { class: 'hint', style: 'padding:12px 4px' }, 'Aucun symbole ne correspond à cette recherche.'));
  updateToolUI();
}
function tile(p) {
  const th = p.k[0] === '@' ? SPECIAL_THUMB[p.k] : thumbSVG(makeEl(p.k, 0, 0, true));
  const f = FONC[p.k] || (PRE[p.k] && FONC[PRE[p.k].type]), b = h('button', { class: 'tile', type: 'button', 'data-k': p.k, title: f ? p.name + ' : ' + f[0] : p.name, html: th + '<span>' + esc(p.name) + '</span>' });
  b.addEventListener('pointerdown', e => tileDown(e, p));
  b.addEventListener('click', () => { if (palDrag && palDrag.done) return; activateTile(p); });
  return b;
}
function activateTile(p) {
  if (p.k === '@text') setTool(state.tool === 'text' ? 'select' : 'text');
  else if (p.k === '@zone') setTool(state.tool === 'zone' ? 'select' : 'zone');
  else if (state.tool === 'place' && state.pre === p.k) setTool('select');
  else startPlace(p.k);
  if (window.innerWidth <= 860) app.classList.remove('show-pal');
}
function tileDown(e, p) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || p.k === '@text' || p.k === '@zone') return;
  palDrag = { x: e.clientX, y: e.clientY, active: false, done: false };
  const inside = ev => { const r = svg.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; };
  const mv = ev => { if (!palDrag) return; if (!palDrag.active && Math.hypot(ev.clientX - palDrag.x, ev.clientY - palDrag.y) > 6) { palDrag.active = true; startPlace(p.k); } if (palDrag.active) { state.mouseIn = inside(ev); if (state.mouseIn) { state.mouse = toWorld(ev.clientX, ev.clientY); moveGhost(state.mouse); } renderUI(); } };
  const up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (!palDrag) return; if (palDrag.active) { palDrag.done = true; if (inside(ev)) placeDown(ev, toWorld(ev.clientX, ev.clientY)); setTool('select'); setTimeout(() => { palDrag = null; }, 0); } else palDrag = null; };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}

/* ===== Menus, fenêtres, messages ===== */
let menuEl = null, modalEl = null, toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
function openMenu(anchor, items, id) {
  closeMenu(); const m = h('div', { class: 'menu', role: 'menu' });
  for (const it of items) {
    if (it === '-') { m.append(h('div', { class: 'menu-sep', role: 'separator' })); continue; }
    if (it.head) { m.append(h('div', { class: 'menu-label' }, it.head)); continue; }
    m.append(h('button', { class: 'menu-it' + (it.on ? ' on' : ''), type: 'button', role: 'menuitem', disabled: it.disabled ? true : null, onclick: () => { closeMenu(); it.run(); } }, it.sw ? h('span', { class: 'sw', style: 'background:' + it.sw }) : null, h('span', { class: 'grow' }, it.label), it.kbd ? h('kbd', null, it.kbd) : null));
  }
  document.body.append(m); m.dataset.for = id;
  const r = anchor.getBoundingClientRect(); let y = r.bottom + 6; if (y + m.offsetHeight > window.innerHeight - 8) y = Math.max(8, r.top - m.offsetHeight - 6);
  m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8)) + 'px'; m.style.top = y + 'px';
  menuEl = m; const f = m.querySelector('.menu-it:not(:disabled)'); if (f) f.focus();
}
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function toggleMenu(id, anchor) { if (menuEl && menuEl.dataset.for === id) { closeMenu(); return; } ({ file: fileMenu, exp: expMenu, net: netMenu })[id](anchor); }
document.addEventListener('pointerdown', e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('[data-menu]')) closeMenu(); }, true);
function fileMenu(a) {
  openMenu(a, [{ label: 'Nouveau schéma', run: newSchema }, { label: 'Ouvrir un fichier .json…', run: () => $('#file-in').click() }, { label: 'Enregistrer en fichier .json', run: saveJSON, disabled: !canDownload() }, '-',
    { head: 'Mes projets' }, { label: lib.ok ? 'Enregistrer dans Mes projets' : 'Indisponible dans cette vue', kbd: lib.ok ? 'Ctrl+S' : null, run: () => saveLib(false), disabled: !lib.ok }, { label: 'Enregistrer une copie…', run: () => saveLib(true), disabled: !lib.ok }, { label: 'Ouvrir depuis Mes projets…', run: openLib, disabled: !lib.ok }, '-',
    { head: 'Exemples' }, { label: 'Local eau : comptage, protection, distribution', run: () => loadExample('eau') }, { label: 'Chaufferie gaz : 2 circuits et ECS', run: () => loadExample('chauf') }, { label: 'Eaux pluviales : toitures non accessibles', run: () => loadExample('ep') }]
    .concat(MODS.length ? ['-', { head: 'Modèles' }].concat(MODS.map((m, i) => ({ label: (m.doc && m.doc.name) || m.file, run: () => loadModele(i) }))) : []), 'file');
}
function expMenu(a) { const d = !canDownload(); openMenu(a, [{ label: 'Image PNG', run: exportPNG, disabled: d }, { label: 'Vectoriel SVG', run: exportSVG, disabled: d }, { label: 'PDF A4', run: () => exportPDF('a4'), disabled: d }, { label: 'PDF A3', run: () => exportPDF('a3'), disabled: d }, { label: 'PDF A0', run: () => exportPDF('a0'), disabled: d }], 'exp'); }
function netMenu(a) { openMenu(a, doc.nets.map((n, i) => ({ label: netLabel(n), sw: n.color, kbd: i < 9 ? String(i + 1) : null, on: n.id === state.activeNet, run: () => { setActiveNet(n.id); setTool('pipe'); } })), 'net'); }
function modal(title, body, actions) {
  closeModal(); const bg = h('div', { class: 'modal-bg' }); bg.addEventListener('pointerdown', e => { if (e.target === bg) closeModal(); });
  bg.append(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('header', null, h('h2', null, title), h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Fermer', onclick: closeModal }, '✕')), h('div', { class: 'body' }, body), actions && actions.length ? h('footer', null, ...actions) : null));
  document.body.append(bg); modalEl = bg;
}
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
function promptModal(title, label, value) {
  return new Promise(res => {
    const inp = h('input', { class: 'inp', type: 'text', maxlength: 80, 'aria-label': label }); inp.value = value || '';
    const done = v => { closeModal(); res(v); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(inp.value); });
    modal(title, F(label, inp), [h('button', { class: 'btn ghost', type: 'button', onclick: () => done(null) }, 'Annuler'), h('button', { class: 'btn primary', type: 'button', onclick: () => done(inp.value) }, 'Enregistrer')]);
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  });
}

/* ===== Fichiers, exports, sauvegarde ===== */
let saveT = 0, dl = null; const lib = { ok: false, kind: '', db: null, uid: null, idb: null };
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify({ doc, libId: state.libId, net: state.activeNet })); } catch (e) { /* stockage indisponible */ } }, 400); }
function sanitize(d) {
  if (!d || !Array.isArray(d.items) || !Array.isArray(d.nets)) throw new Error('format');
  const out = newDoc(), num = v => (isFinite(+v) ? +v : 0), ids = new Set();
  out.name = String(d.name || 'Sans titre').slice(0, 80);
  out.nets = d.nets.filter(n => n && n.id).map(n => ({ id: String(n.id).slice(0, 40), abbr: String(n.abbr || '').slice(0, 6), name: String(n.name || '').slice(0, 40), color: isHex(n.color) ? n.color : '#495057', dash: DASHES[n.dash] != null ? n.dash : 'solid', w: clamp(+n.w || 2.4, 0.5, 6) }));
  if (!out.nets.length) out.nets = clone(DEFAULT_NETS);
  if ((+d.v || 1) < 2) for (const n of DEFAULT_NETS) if (!out.nets.some(x => x.id === n.id)) out.nets.push(clone(n));
  for (const it of d.items) {
    if (!it || typeof it !== 'object') continue; const c = clone(it);
    c.id = typeof c.id === 'string' && /^[\w-]{1,40}$/.test(c.id) && !ids.has(c.id) ? c.id : uid(); ids.add(c.id);
    if (c.kind === 'el') { if (!S[c.type]) continue; if (!PRE[c.pre]) c.pre = PRE[c.type] ? c.type : Object.keys(PRE).find(k => PRE[k].type === c.type); c.x = num(c.x); c.y = num(c.y); c.rot = norm360(num(c.rot)); c.fh = !!c.fh; c.p = c.p && typeof c.p === 'object' ? c.p : {}; if (c.type === 'v3v' && c.p.act == null && c.p.mot === false) c.p.act = 'none'; { const pp = (PRE[c.pre] && PRE[c.pre].p) || {}; for (const k in (S[c.type].params || {})) if (c.p[k] == null) c.p[k] = pp[k] != null ? clone(pp[k]) : S[c.type].params[k].def; } c.lx = num(c.lx); c.ly = num(c.ly); if (!isHex(c.color)) delete c.color; ['tag', 'name', 'note'].forEach(k => { c[k] = String(c[k] == null ? '' : c[k]); }); }
    else if (c.kind === 'pipe') { if (!Array.isArray(c.pts) || c.pts.length < 2) continue; c.pts = c.pts.map(q => ({ x: num(q && q.x), y: num(q && q.y) })); c.net = String(c.net); c.lp = clamp(num(c.lp == null ? 0.5 : c.lp), 0, 1); c.dn = String(c.dn || ''); c.txt = String(c.txt || ''); }
    else if (['text', 'zone', 'legend', 'nomen', 'cart'].includes(c.kind)) { c.x = num(c.x); c.y = num(c.y); if (c.kind === 'zone') { c.w = Math.max(10, num(c.w)); c.h = Math.max(10, num(c.h)); if (!isHex(c.color)) c.color = '#5c656b'; } if (c.kind === 'text') { c.size = clamp(num(c.size) || 9, 4, 80); if (!isHex(c.color)) c.color = ''; } if (c.kind === 'cart') c.f = c.f && typeof c.f === 'object' ? c.f : {}; }
    else continue;
    out.items.push(c);
  }
  out.opts = { hops: !d.opts || d.opts.hops !== false, real: !!(d.opts && d.opts.real) };
  return out;
}
function restore() { try { const raw = localStorage.getItem(LS_KEY); if (!raw) return false; const o = JSON.parse(raw); doc = sanitize(o.doc); state.libId = o.libId || null; if (o.net && doc.nets.some(n => n.id === o.net)) state.activeNet = o.net; return true; } catch (e) { return false; } }
function loadDocObj(d) { const nd = sanitize(d), before = snapshot(); doc = nd; state.sel = new Set(); commit(before); syncDocName(); buildInspector(); fitView(); }
function syncDocName() { $('#docname').value = doc.name || 'Sans titre'; }
function newSchema() { const before = snapshot(), nets = doc.nets; doc = newDoc(); doc.nets = nets; state.libId = null; state.sel = new Set(); commit(before); syncDocName(); buildInspector(); view.k = 1.5; view.tx = 60; view.ty = 60; applyView(); toast('Nouveau schéma. Ctrl+Z pour revenir au précédent.'); }
function loadExample(k) { const before = snapshot(); doc = k === 'eau' ? exLocalEau() : k === 'ep' ? exEauxPluviales() : exChaufferie(); state.libId = null; state.sel = new Set(); commit(before); syncDocName(); buildInspector(); fitView(); }
const MODS = typeof MODELES !== 'undefined' ? MODELES : [];
function loadModele(i) { const before = snapshot(); doc = sanitize(clone(MODS[i].doc)); state.libId = null; state.sel = new Set(); commit(before); syncDocName(); buildInspector(); fitView(); toast('Modèle ouvert. Ctrl+Z pour revenir au schéma précédent.'); }
const canDownload = () => !!dl || !window.claude;
async function saveFile(name, data) {
  if (dl) {
    try { const r = await dl.save({ filename: name, data }); if (r && r.status === 'saved') toast('Fichier enregistré : ' + name); }
    catch (e) { const c = e && e.code; if (c === 'declined') return; toast(c === 'rate_limited' ? 'Une demande d’enregistrement est déjà ouverte.' : c === 'too_large' ? 'Fichier trop volumineux : essayez le PNG ou le SVG.' : 'Export impossible dans cette vue.'); }
    return;
  }
  if (!window.claude) { const blob = data instanceof Blob ? data : new Blob([data]), url = URL.createObjectURL(blob), a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); return; }
  toast('Export indisponible dans cette vue.');
}
const EXPORT_VARS = { '--ink': '#16191b', '--paper': '#ffffff', '--hdr': '#ececec', '--muted-ink': '#6b7378', '--sel': '#2c9a46' };
const fileBase = () => (doc.name || 'schema').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'schema';
function buildExport() {
  const ctx = buildCtx(), b = contentBBox(ctx); if (!b) { toast('Le schéma est vide.'); return null; }
  const m = 20, x = Math.floor(b.x0 - m), y = Math.floor(b.y0 - m), w = Math.ceil(b.x1 - b.x0 + 2 * m), hh = Math.ceil(b.y1 - b.y0 + 2 * m);
  const inner = contentSVG({ exp: true }).replace(/var\((--[\w-]+)\)/g, (_, v) => EXPORT_VARS[v] || '#16191b').replace(/ data-(?:id|hit)="[^"]*"/g, '');
  /* wrap : SVG d'une zone du schéma (vx, vy, vw, vh) rendue en pw × ph pixels — sert aussi au découpage en tuiles du PDF */
  const wrap = (vx, vy, vw, vh, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${r2(vx)} ${r2(vy)} ${r2(vw)} ${r2(vh)}" font-family='${FONT}'><rect x="${r2(vx)}" y="${r2(vy)}" width="${r2(vw)}" height="${r2(vh)}" fill="#ffffff"/>${inner}</svg>`;
  return { svg: wrap(x, y, w, hh, w, hh), w, h: hh, x, y, wrap };
}
function svgToPng(str, w, hh, scale) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(hh * scale)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => b ? res(b) : rej(new Error('png')), 'image/png'); } catch (err) { rej(err); } };
    img.onerror = () => rej(new Error('img')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  });
}
function exportSVG() { const e = buildExport(); if (e) saveFile(fileBase() + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + e.svg); }
async function exportPNG() { const e = buildExport(); if (!e) return; try { saveFile(fileBase() + '.png', await svgToPng(e.svg, e.w, e.h, clamp(Math.sqrt(16e6 / (e.w * e.h)), 1, 4))); } catch (err) { toast('Création de l’image impossible.'); } }
/* Formats PDF (mm, paysage) et marge. Export vectoriel (svg2pdf, police Arimo, de même chasse qu'Arial) : net à toutes les échelles.
   Si ces bibliothèques ne se chargent pas, repli sur un rendu image d'environ 300 dpi, découpé en tuiles de 3000 px au plus
   (un A0 dépasse la taille d'image que certains navigateurs savent dessiner d'un seul tenant). */
const PDF_FMT = { a4: [297, 210, 10], a3: [420, 297, 10], a0: [1189, 841, 15] }, PDF_PXMM = 12, PDF_TILE = 3000;
/* Bibliothèques servies avec la page (dossier vendor/), CDN en secours */
const PDF_LIBS = {
  jspdf: ['vendor/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'],
  svg2pdf: ['vendor/svg2pdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.3/dist/svg2pdf.umd.min.js'],
  reg: ['vendor/Arimo-Regular.ttf', 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/arimo@0.4.3/400Regular/Arimo_400Regular.ttf'],
  bold: ['vendor/Arimo-Bold.ttf', 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/arimo@0.4.3/700Bold/Arimo_700Bold.ttf'],
};
const blobToURL = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
const loadScript = src => new Promise((res, rej) => { const sc = h('script', { src }); sc.onload = res; sc.onerror = () => { sc.remove(); rej(new Error(src)); }; document.head.append(sc); });
/* Essaie chaque adresse dans l'ordre jusqu'à ce que ok() soit vrai */
async function loadFirst(urls, ok) { for (const u of urls) { if (ok()) return; try { await loadScript(u); } catch (e) { /* adresse suivante */ } } if (!ok()) throw new Error('script'); }
async function fetchFirst(urls) { for (const u of urls) { try { const r = await fetch(u); if (r.ok) return await r.arrayBuffer(); } catch (e) { /* adresse suivante */ } } throw new Error('police'); }
const abToB64 = ab => { const u = new Uint8Array(ab); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const hasJsPDF = () => !!(window.jspdf && window.jspdf.jsPDF), hasSvg2pdf = () => !!(window.svg2pdf && window.svg2pdf.svg2pdf);
let pdfVecP = null;
function pdfVecLibs() {
  if (!pdfVecP) pdfVecP = (async () => {
    await loadFirst(PDF_LIBS.svg2pdf, hasSvg2pdf);
    /* Police Arimo facultative : si elle ne se charge pas (page hébergée qui interdit ces téléchargements), le PDF reste
       vectoriel en Helvetica (même chasse qu'Arial) et les quelques caractères hors de cette police sont dessinés. */
    try { const [reg, bold] = await Promise.all([fetchFirst(PDF_LIBS.reg), fetchFirst(PDF_LIBS.bold)]); return { reg: abToB64(reg), bold: abToB64(bold) }; }
    catch (e) { return { reg: null, bold: null }; }
  })().catch(e => { pdfVecP = null; throw e; });
  return pdfVecP;
}
async function pdfVector(pdf, e, ox, oy, dw, dh) {
  const libs = await pdfVecLibs(), arimo = !!libs.reg;
  if (arimo) {
    pdf.addFileToVFS('Arimo-Regular.ttf', libs.reg); pdf.addFont('Arimo-Regular.ttf', 'Arimo', 'normal');
    pdf.addFileToVFS('Arimo-Bold.ttf', libs.bold); pdf.addFont('Arimo-Bold.ttf', 'Arimo', 'bold');
  }
  const el = new DOMParser().parseFromString(e.svg, 'image/svg+xml').documentElement;
  const host = h('div', { style: 'position:fixed;left:-99999px;top:0;width:4000px;height:4000px;overflow:hidden', 'aria-hidden': 'true' }); host.append(document.importNode(el, true)); document.body.append(host);
  try {
    const sv = host.firstChild, NS = 'http://www.w3.org/2000/svg';
    /* Halo blanc des libellés (texte contourné de blanc) : svg2pdf le décale ; on le remplace par un rectangle blanc mesuré
       ici avec la police d'origine (Arimo a la même chasse qu'Arial), avec la même rotation que le texte. */
    for (const t of [...sv.querySelectorAll('text')]) {
      if (!/fill:\s*none/.test(t.getAttribute('style') || '')) continue;
      const b = t.getBBox(), r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', r2(b.x - 1)); r.setAttribute('y', r2(b.y + b.height * 0.12)); r.setAttribute('width', r2(b.width + 2)); r.setAttribute('height', r2(b.height * 0.8)); r.setAttribute('fill', '#ffffff');
      if (t.getAttribute('transform')) r.setAttribute('transform', t.getAttribute('transform'));
      t.replaceWith(r);
    }
    /* Texte centré verticalement (dominant-baseline central) : svg2pdf le place trop haut ; on le ramène sur sa ligne de base
       (centre de la boîte d'Arial / Helvetica / Arimo à 0,3465 em au-dessus de la ligne de base). */
    for (const t of sv.querySelectorAll('text[dominant-baseline="central"]')) {
      const fs = parseFloat(t.getAttribute('font-size')) || 9; t.removeAttribute('dominant-baseline'); t.setAttribute('y', r2((parseFloat(t.getAttribute('y')) || 0) + fs * 0.3465));
    }
    if (!arimo) pdfGlyphs(sv);
    for (const n of [sv, ...sv.querySelectorAll('[font-family]')]) n.setAttribute('font-family', arimo ? 'Arimo' : 'helvetica');
    await window.svg2pdf.svg2pdf(sv, pdf, { x: ox, y: oy, width: dw, height: dh });
  } finally { host.remove(); }
}
/* Sans police intégrée (Helvetica, jeu WinAnsi) : θ, Δ, ≈ et ≤ sont dessinés en traits. Chaque texte qui en contient est
   recomposé caractère par caractère, à la position mesurée par le navigateur dans la police d'origine. */
const PDF_GLYPH = /[θΔ≈≤]/;
function pdfGlyphPath(ch, x, base, em, w) {
  const l = x + w * 0.12, r = x + w * 0.88, top = base - em * 0.72, mid = base - em * 0.36, cx = (l + r) / 2;
  if (ch === 'θ') { const rx = (r - l) / 2; return `M${cx},${top}C${cx + rx * 1.33},${top} ${cx + rx * 1.33},${base} ${cx},${base}C${cx - rx * 1.33},${base} ${cx - rx * 1.33},${top} ${cx},${top}ZM${l},${mid}L${r},${mid}`; }
  if (ch === 'Δ') return `M${l},${base}L${cx},${top}L${r},${base}Z`;
  if (ch === '≈') { const a = em * 0.09, y1 = base - em * 0.47, y2 = base - em * 0.25, q = (r - l) / 4; return [y1, y2].map(y => `M${l},${y}Q${l + q},${y - a * 2} ${cx},${y}T${r},${y}`).join(''); }
  return `M${r},${top + em * 0.05}L${l},${base - em * 0.36}L${r},${base - em * 0.18}M${l},${base}L${r},${base}`;
}
function pdfGlyphs(sv) {
  const NS = 'http://www.w3.org/2000/svg';
  for (const t of [...sv.querySelectorAll('text')]) {
    const str = t.textContent; if (!PDF_GLYPH.test(str)) continue;
    const fs = parseFloat(t.getAttribute('font-size')) || 9, bold = +(t.getAttribute('font-weight') || 400) >= 600;
    const st = t.getAttribute('style') || '', col = (st.match(/fill:\s*([^;]+)/) || [])[1] || t.getAttribute('fill') || '#16191b';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], b = t.getExtentOfChar(i); if (ch === ' ') continue;
      if (PDF_GLYPH.test(ch)) {
        const base = b.y + b.height * 0.81, p = document.createElementNS(NS, 'path');
        p.setAttribute('d', pdfGlyphPath(ch, b.x, base, fs, b.width)); p.setAttribute('fill', 'none'); p.setAttribute('stroke', col);
        p.setAttribute('stroke-width', r2(fs * (bold ? 0.12 : 0.085))); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('stroke-linecap', 'round');
        if (t.getAttribute('transform')) p.setAttribute('transform', t.getAttribute('transform'));
        frag.append(p);
      } else { const n = t.cloneNode(false); n.textContent = ch; n.setAttribute('x', r2(b.x)); n.setAttribute('text-anchor', 'start'); frag.append(n); }
    }
    t.replaceWith(frag);
  }
}
async function pdfRaster(pdf, e, ox, oy, s) {
  const k = Math.max(1, s * PDF_PXMM), tu = PDF_TILE / k, ov = 2 / k; /* k : pixels par unité du schéma ; tu : côté d'une tuile ; ov : recouvrement contre les liserés */
  for (let ty = 0; ty < e.h; ty += tu) for (let tx = 0; tx < e.w; tx += tu) {
    const tw = Math.min(tu + ov, e.w - tx), th = Math.min(tu + ov, e.h - ty), pw = Math.max(1, Math.round(tw * k)), ph = Math.max(1, Math.round(th * k));
    const url = await blobToURL(await svgToPng(e.wrap(e.x + tx, e.y + ty, tw, th, pw, ph), pw, ph, 1));
    pdf.addImage(url, 'PNG', ox + tx * s, oy + ty * s, tw * s, th * s, undefined, 'FAST');
  }
}
async function exportPDF(fmt) {
  try { await loadFirst(PDF_LIBS.jspdf, hasJsPDF); } catch (e) { toast('Le module PDF n’a pas pu être chargé. Exportez en PNG ou en SVG.'); return; }
  const J = window.jspdf.jsPDF;
  const e = buildExport(); if (!e) return;
  const [L, l, mg] = PDF_FMT[fmt] || PDF_FMT.a4, land = e.w >= e.h, PW = land ? L : l, PH = land ? l : L;
  const s = Math.min((PW - 2 * mg) / e.w, (PH - 2 * mg) / e.h), dw = e.w * s, dh = e.h * s, ox = (PW - dw) / 2, oy = (PH - dh) / 2;
  const mk = () => new J({ orientation: land ? 'landscape' : 'portrait', unit: 'mm', format: fmt, compress: true });
  toast('Création du PDF ' + fmt.toUpperCase() + '…');
  let pdf = mk();
  try { await pdfVector(pdf, e, ox, oy, dw, dh); }
  catch (err) {
    try { pdf = mk(); await pdfRaster(pdf, e, ox, oy, s); toast('PDF en image (environ 300 dpi) : le mode vectoriel n’a pas pu être chargé.'); }
    catch (err2) { toast('Création du PDF impossible.'); return; }
  }
  saveFile(fileBase() + '-' + fmt.toUpperCase() + '.pdf', pdf.output('blob'));
}
function saveJSON() { saveFile(fileBase() + '.json', JSON.stringify(doc, null, 1)); }
async function initCaps() {
  if (window.claude && typeof window.claude.use === 'function') {
    try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    try { const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); if (db && user) { const id = await user.id(); if (id) { lib.ok = true; lib.kind = 'claude'; lib.db = db; lib.uid = id; } } } catch (e) { lib.ok = false; }
  }
  if (!lib.ok) try { lib.idb = await idbOpen(); lib.ok = true; lib.kind = 'local'; } catch (e) { lib.ok = false; }
}

/* ===== Mes projets : base du site sur claude.ai, sinon base locale du navigateur (IndexedDB) ===== */
function idbOpen() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('idb')); return; }
    const r = indexedDB.open('schema-plomberie', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('projets')) r.result.createObjectStore('projets', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
  });
}
function idbReq(mode, fn) {
  return new Promise((res, rej) => {
    const tx = lib.idb.transaction('projets', mode), r = fn(tx.objectStore('projets')); let out;
    if (r) r.onsuccess = () => { out = r.result; };
    tx.oncomplete = () => res(out); tx.onerror = tx.onabort = () => rej(tx.error || new Error('idb'));
  });
}
const libCol = () => lib.db.collection('data/users/' + lib.uid);
const libStore = {
  async list() {
    if (lib.kind === 'local') return ((await idbReq('readonly', st => st.getAll())) || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const q = await libCol().orderBy('updatedAt', 'desc').limit(200).get(); return q.docs.map(d => Object.assign({}, d.data() || {}, { id: d.id }));
  },
  put(id, v) { return lib.kind === 'local' ? idbReq('readwrite', st => st.put(Object.assign({}, v, { id }))) : libCol().doc(id).set(v); },
  del(id) { return lib.kind === 'local' ? idbReq('readwrite', st => st.delete(id)) : libCol().doc(id).delete(); },
};
const libErr = e => e && (e.code === 'quota_exceeded' || e.name === 'QuotaExceededError') ? 'Espace plein : supprimez d’anciens projets.' : e && e.code === 'invalid_argument' ? 'Vos droits sur cette page ne permettent pas d’enregistrer.' : 'Enregistrement impossible pour le moment.';
async function saveLib(asNew) {
  if (!lib.ok) { toast('Mes projets n’est pas disponible ici : utilisez Enregistrer en fichier .json.'); return; }
  let name = doc.name || 'Sans titre';
  if (asNew || !state.libId) { const r = await promptModal(asNew ? 'Enregistrer une copie' : 'Enregistrer dans Mes projets', 'Nom du projet', asNew ? name + ' (copie)' : name); if (r == null) return; name = r.trim() || 'Sans titre'; doc.name = name; syncDocName(); }
  const json = JSON.stringify(doc); if (lib.kind === 'claude' && json.length > 240000) { toast('Projet trop volumineux pour Mes projets : enregistrez-le en fichier .json.'); return; }
  const id = (!asNew && state.libId) || ('s' + Date.now().toString(36) + uid().slice(0, 4));
  try {
    await libStore.put(id, { name, updatedAt: Date.now(), json, n: doc.items.length }); state.libId = id; scheduleSave();
    if (lib.kind === 'local' && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    toast('Enregistré dans Mes projets.');
  } catch (e) { toast(libErr(e)); }
}
async function backupLib() {
  try {
    const all = await libStore.list(); if (!all.length) { toast('Aucun projet à sauvegarder.'); return; }
    const data = { format: 'schema-plomberie/projets', v: 1, date: new Date().toISOString(), projets: all.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, n: p.n, json: p.json })) };
    saveFile('mes-projets-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(data));
  } catch (e) { toast('Sauvegarde impossible pour le moment.'); }
}
function restoreLib() {
  const inp = h('input', { type: 'file', accept: '.json,application/json' });
  inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return; let o;
    try { o = JSON.parse(await f.text()); } catch (e) { toast('Fichier illisible.'); return; }
    if (!o || !Array.isArray(o.projets)) { toast('Ce fichier n’est pas une sauvegarde de Mes projets. Pour un seul schéma, utilisez Fichier > Ouvrir un fichier .json.'); return; }
    try {
      const have = new Map((await libStore.list()).map(p => [p.id, p.updatedAt || 0])); let n = 0;
      for (const p of o.projets) {
        if (!p || typeof p.json !== 'string' || !p.id) continue;
        try { JSON.parse(p.json); } catch (e) { continue; }
        if (have.has(p.id) && have.get(p.id) >= (p.updatedAt || 0)) continue;
        await libStore.put(String(p.id), { name: p.name || 'Sans titre', updatedAt: p.updatedAt || Date.now(), json: p.json, n: p.n || 0 }); n++;
      }
      toast(n ? n + (n > 1 ? ' projets restaurés.' : ' projet restauré.') : 'Rien à restaurer : vos projets sont déjà à jour.'); openLib();
    } catch (e) { toast(libErr(e)); }
  });
  inp.click();
}
async function openLib() {
  const body = h('div', null, h('p', { class: 'hint' }, 'Chargement…'));
  const acts = [h('button', { class: 'btn ghost', type: 'button', onclick: backupLib, disabled: !canDownload() }, 'Sauvegarder tout (.json)'), h('button', { class: 'btn ghost', type: 'button', onclick: restoreLib }, 'Restaurer…'), h('button', { class: 'btn ghost', type: 'button', onclick: closeModal }, 'Fermer')];
  modal('Mes projets', body, acts);
  try {
    const all = await libStore.list(); body.innerHTML = '';
    if (lib.kind === 'local') body.append(h('p', { class: 'hint' }, 'Vos projets sont enregistrés dans ce navigateur, sur cet appareil. Pour les retrouver ailleurs ou ne pas les perdre si les données du navigateur sont effacées, utilisez « Sauvegarder tout » de temps en temps.'));
    if (!all.length) { body.append(h('p', { class: 'hint' }, 'Aucun projet enregistré. Utilisez Fichier, puis Enregistrer dans Mes projets (Ctrl+S).')); return; }
    const list = h('div'), q = h('input', { class: 'search', type: 'search', placeholder: 'Rechercher un projet', 'aria-label': 'Rechercher un projet', autocomplete: 'off', style: 'margin:4px 0 6px' });
    q.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); for (const r of list.children) r.hidden = !!t && !r.dataset.nm.includes(t); });
    if (all.length > 6) body.append(q);
    body.append(list);
    for (const v of all) {
      const del = btn('Supprimer', null, 'danger');
      const row = h('div', { class: 'lib-row', 'data-nm': String(v.name || '').toLowerCase() }, h('div', { class: 'nm' }, h('b', null, v.name || 'Sans titre'), h('small', null, new Date(v.updatedAt || 0).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + (v.n ? ', ' + v.n + ' objets' : '') + (v.id === state.libId ? ' · ouvert' : ''))),
        h('button', { class: 'btn sm primary', type: 'button', onclick: () => { try { loadDocObj(JSON.parse(v.json)); state.libId = v.id; scheduleSave(); closeModal(); toast('Projet ouvert : ' + (v.name || 'Sans titre')); } catch (e) { toast('Ce projet est illisible.'); } } }, 'Ouvrir'), del);
      del.addEventListener('click', async () => { if (del.dataset.arm !== '1') { del.dataset.arm = '1'; del.textContent = 'Confirmer'; setTimeout(() => { del.dataset.arm = ''; del.textContent = 'Supprimer'; }, 3000); return; } try { await libStore.del(v.id); row.remove(); if (state.libId === v.id) state.libId = null; toast('Projet supprimé.'); } catch (e) { toast('Suppression impossible.'); } });
      list.append(row);
    }
  } catch (e) { body.innerHTML = ''; body.append(h('p', { class: 'hint' }, 'Impossible de lire Mes projets pour le moment.')); }
}

/* ===== Aide contextuelle ===== */
function updateHint() {
  const K = s => '<kbd>' + esc(s) + '</kbd>'; let parts;
  if (state.tool === 'pipe') parts = state.draft ? [[K('Clic'), 'coude'], [K('Double-clic'), 'terminer'], [K('/'), 'autre coude'], [K('Maj'), 'tracé à 45°'], [K('Retour arrière'), 'retirer un point'], [K('Échap'), 'terminer']] : [['', 'Cliquez sur un raccordement (cercle vert) ou sur la feuille pour commencer un tuyau ' + netLabel(netOf(state.activeNet)) + '.'], [K('1') + '…' + K('9'), 'changer de réseau']];
  else if (state.tool === 'place') parts = [[K('Clic'), 'poser'], [K('R'), 'tourner'], [K('F'), 'inverser le sens'], [K('Maj+F'), 'changer de côté'], [K('Échap'), 'terminer'], ['', 'Lâché sur un tuyau, le symbole s’aligne seul.']];
  else if (state.tool === 'text') parts = [['', 'Cliquez à l’endroit où placer le texte.']];
  else if (state.tool === 'zone') parts = [['', 'Glissez pour tracer le contour d’un local ou d’une limite de prestation.']];
  else if (state.tool === 'hand') parts = [['', 'Glissez pour déplacer la vue. Molette pour zoomer.']];
  else parts = [[K('Glisser'), 'déplacer'], [K('Maj') + ' + clic', 'ajouter à la sélection'], [K('Alt') + ' + glisser', 'dupliquer'], [K('R'), 'tourner'], [K('F'), 'inverser le sens'], [K('Double-clic'), 'sur un tuyau : ajouter un coude'], [K('Espace') + ' + glisser', 'vue']];
  $('#hint').innerHTML = parts.map(([k, t]) => '<span>' + k + (k ? ' ' : '') + esc(t) + '</span>').join('');
}
function showCoords(w) {
  const s = state.snap, c = $('#coords');
  if (state.tool === 'pipe' && s && s.kind === 'port') c.textContent = (s.el.tag ? s.el.tag + ' : ' : '') + portName(s.el, s.i);
  else c.textContent = 'x ' + Math.round(w.x) + '   y ' + Math.round(w.y);
}

/* ===== Clavier ===== */
window.addEventListener('keydown', e => {
  const tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
  if (modalEl) { if (e.key === 'Escape') closeModal(); return; }
  if (menuEl) { if (e.key === 'Escape') { closeMenu(); return; } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const its = $$('.menu-it:not(:disabled)', menuEl), i = its.indexOf(document.activeElement); const n = its[(i + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length]; if (n) n.focus(); return; } }
  if (typing) { if (e.key === 'Escape') tg.blur(); return; }
  const mod = e.ctrlKey || e.metaKey, k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (mod) {
    if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); } else if (k === 'y') { e.preventDefault(); redo(); }
    else if (k === 'c' && state.sel.size) { e.preventDefault(); copySel(); } else if (k === 'x' && state.sel.size) { e.preventDefault(); copySel(); deleteSel(); }
    else if (k === 'v' && clip) { e.preventDefault(); paste(); } else if (k === 'd') { e.preventDefault(); duplicateSel(); }
    else if (k === 'a') { e.preventDefault(); setSel(doc.items.map(i => i.id)); } else if (k === 's') { e.preventDefault(); if (lib.ok) saveLib(false); else saveJSON(); }
    return;
  }
  if (e.altKey) return;
  if (k === ' ') { e.preventDefault(); if (!state.space) { state.space = true; svg.classList.add('pan-ready'); } return; }
  if (k === 'Escape') { onEscape(); return; }
  if (k === 'Enter') { if (state.draft) { e.preventDefault(); finishDraft(); } return; }
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (state.draft) popDraft(); else deleteSel(); return; }
  if (k.indexOf('Arrow') === 0) { if (state.sel.size) { e.preventDefault(); const st = e.shiftKey ? GRID * 5 : GRID; nudge(k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0); } return; }
  const dm = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  if (dm) { const n = +dm[1]; if (n === 0) { fitView(); return; } const net = doc.nets[n - 1]; if (!net) return; const ps = selItems().filter(i => i.kind === 'pipe'); if (ps.length && state.tool === 'select') { const b = snapshot(); for (const p of ps) p.net = net.id; commit(b); buildInspector(); } setActiveNet(net.id); return; }
  if (k === 'r') rotateCmd(e.shiftKey ? -90 : 90);
  else if (k === 'f') flipCmd(e.shiftKey ? 'v' : 'h');
  else if (k === '/' || k === ':') { if (state.draft) { state.draft.flip = !state.draft.flip; if (state.snap) state.draft.preview = route(state.snap); renderUI(); } }
  else if (k === 'v') setTool('select'); else if (k === 'l') setTool('pipe'); else if (k === 't') setTool('text'); else if (k === 'z') setTool('zone'); else if (k === 'h') setTool('hand');
  else if (k === 'g') { state.grid = !state.grid; updateGrid(); if (!state.sel.size) buildInspector(); }
});
window.addEventListener('keyup', e => { if (e.key === ' ') { state.space = false; svg.classList.remove('pan-ready'); } });
window.addEventListener('blur', () => { state.space = false; svg.classList.remove('pan-ready'); });

/* ===== Exemples ===== */
function exampleDoc(build) {
  const saved = doc; doc = newDoc();
  try {
    build({
      E(k, x, y, o) { const el = makeEl(k, x, y); if (o) { const p = o.p, rest = Object.assign({}, o); delete rest.p; Object.assign(el, rest); if (p) Object.assign(el.p, p); } doc.items.push(el); return el; },
      port(el, i) { const pp = portsOf(el)[i]; return xf(el, pp[0], pp[1]); },
      pipe(net, pts, o) { const p = Object.assign({ id: uid(), kind: 'pipe', net, pts: simplify(pts.map(q => Array.isArray(q) ? { x: q[0], y: q[1] } : { x: q.x, y: q.y })), dn: '', lab: false, lp: 0.5, arr: false, txt: '' }, o || {}); doc.items.push(p); return p; },
    });
    return doc;
  } finally { doc = saved; }
}
function frameExample(title, zoneTitle, cartTitle, ope) {
  const b = contentBBox(buildCtx()), z = makeZone(snap(b.x0 - 30), snap(b.y0 - 50));
  z.w = snap(b.x1 - z.x + 30); z.h = snap(b.y1 - z.y + 30); z.title = zoneTitle; doc.items.unshift(z);
  const yB = z.y + z.h + 30, lg = makeLegend(z.x, yB); lg.rows = 10; doc.items.push(lg);
  const LL = legendLayout(lg, buildCtx()), nm = makeNomen(snap(z.x + LL.W + 30), yB); doc.items.push(nm);
  const NL = nomenLayout(nm, buildCtx()), ct = makeCart(0, 0); ct.f.titre = cartTitle; ct.f.ope = ct.f.ope || ope;
  ct.x = snap(Math.max(z.x + z.w - CART_W, nm.x + NL.W + 30)); ct.y = snap(yB + Math.max(LL.H, NL.H) - CART_H); doc.items.push(ct);
  doc.name = title;
}
function exLocalEau() {
  return exampleDoc(({ E, port, pipe }) => {
    const Y = 200, arr = E('renvoi_arr', 60, Y, { rot: 180, p: { txt: 'Réseau public' } });
    E('vanne_bs', 100, Y, { name: 'Robinet avant compteur' }); E('compteur', 150, Y, { name: 'Compteur général', note: 'DN40', sn: true }); E('vanne_bs', 200, Y, { name: 'Robinet après compteur' });
    E('vidange', 230, Y, { name: 'Robinet de purge' }); E('vanne', 270, Y, { name: 'Vanne amont protection' }); E('filtre', 310, Y);
    const ba = E('disco', 360, Y, { name: 'Disconnecteur BA', sn: true });
    E('vanne', 410, Y, { name: 'Vanne aval protection' }); E('mano', 440, Y, { name: 'Manomètre amont' }); E('reducteur', 480, Y, { note: '3 bar' }); E('mano', 520, Y, { name: 'Manomètre aval' }); E('vanne', 560, Y, { name: 'Vanne générale' });
    const col = E('collecteur', 710, Y, { name: 'Collecteur EF', p: { n: 3, esp: '60' } });
    pipe('ef', [port(arr, 0), port(col, 0)], { dn: 'DN50', lab: true, lp: 0.955 });
    const eu = E('renvoi', 360, 280, { rot: 90, p: { txt: 'Vers EU' } }); pipe('eu', [port(ba, 2), port(eu, 0)]);
    ['Colonnes EF', 'Arrosage', 'Vers adoucisseur'].forEach((txt, i) => {
      const p0 = port(col, 2 + i);
      E('vanne', p0.x, 150, { rot: 90, fh: true, name: 'Vanne de départ' });
      if (i === 1) E('clapet', p0.x, 120, { rot: 90, fh: true });
      const r = E('renvoi', p0.x, 70, { rot: 270, p: { txt } }); pipe('ef', [p0, port(r, 0)], { arr: true });
    });
    E('bouchon', 800, Y);
    frameExample('Local eau — exemple', 'LOCAL EAU — SOUS-SOL', 'Schéma de principe du local eau', 'Exemple');
  });
}
function exChaufferie() {
  return exampleDoc(({ E, port, pipe }) => {
    const ch = E('chaudiere', 100, 260, { note: '120 kW', sv: true }), bd = E('bouteille', 420, 260), ss = E('soupape', 160, 200, { note: '3 bar', sv: true });
    E('thermo', 270, 230, { name: 'Thermomètre départ' }); E('pompe', 320, 230, { name: 'Circulateur primaire', sn: true }); E('vanne', 370, 230);
    pipe('dch', [port(ch, 0), port(bd, 0)], { arr: true }); pipe('dch', [[160, 230], port(ss, 0)]);
    const reu = E('renvoi', 200, 200, { p: { txt: 'EU' } }); pipe('eu', [port(ss, 1), port(reu, 0)]);
    E('purgeur', 420, 200);
    E('vanne', 380, 290, { fh: true }); E('desemb', 330, 290, { fh: true }); E('thermo', 270, 290, { name: 'Thermomètre retour' }); E('mano', 230, 290);
    pipe('rch', [port(bd, 1), port(ch, 1)], { arr: true }); pipe('rch', [[180, 290], [180, 350]]); E('vase', 180, 350, { note: '35 L', sv: true });
    const rg = E('renvoi_arr', 100, 400, { rot: 90, p: { txt: 'Arrivée gaz' } });
    E('electrovanne', 100, 330, { rot: 90, fh: true, name: 'Électrovanne gaz' }); E('vanne_bs', 100, 365, { rot: 90, fh: true, name: 'Robinet de barrage gaz' });
    pipe('gaz', [port(rg, 0), port(ch, 2)]);
    const b1 = E('ballon', 780, 250, { fh: true, note: '500 L', sv: true, lx: -56, ly: -88 });
    E('vanne', 460, 230); E('pompe', 650, 230, { name: 'Circulateur ECS', sn: true }); E('clapet', 690, 230); E('vanne', 720, 230);
    pipe('dch', [port(bd, 2), port(b1, 3)], { arr: true });
    E('vanne', 720, 290, { fh: true }); E('vanne', 460, 290, { fh: true });
    pipe('rch', [port(b1, 4), port(bd, 3)], { arr: true });
    const v3 = E('v3v', 510, 170, { rot: 270, name: 'Vanne 3 voies radiateurs' });
    E('pompe2', 510, 115, { rot: 270, name: 'Circulateur radiateurs' }); E('thermo', 510, 80, { rot: 90 });
    const rd = E('renvoi', 510, 60, { rot: 270, p: { txt: 'Départ radiateurs' } }); pipe('dch', [[510, 230], port(rd, 0)]);
    const rr = E('renvoi_arr', 570, 60, { rot: 270, p: { txt: 'Retour radiateurs' } });
    E('equil', 570, 110, { rot: 90 }); E('vanne', 570, 140, { rot: 90 });
    pipe('rch', [port(rr, 0), [570, 290]]); pipe('rch', [[570, 170], port(v3, 2)]);
    E('thermo', 840, 210, { name: 'Thermomètre ECS' }); E('vanne', 880, 210);
    const recs = E('renvoi', 930, 210, { p: { txt: 'Distribution ECS' } }); pipe('ecs', [port(b1, 0), port(recs, 0)], { arr: true });
    const rb = E('renvoi_arr', 930, 250, { p: { txt: 'Retour bouclage' } });
    E('vanne', 900, 250, { fh: true }); E('pompe', 870, 250, { fh: true, name: 'Circulateur bouclage' }); E('clapet', 840, 250, { fh: true });
    pipe('becs', [port(rb, 0), port(b1, 1)]);
    const ref = E('renvoi_arr', 930, 290, { p: { txt: 'Arrivée EF' } }); E('vanne', 900, 290, { fh: true });
    const gs = E('gs', 850, 290, { fh: true }); pipe('ef', [port(ref, 0), port(b1, 2)]);
    const reu2 = E('renvoi', 850, 350, { rot: 90, p: { txt: 'EU' } }); pipe('eu', [port(gs, 2), port(reu2, 0)]);
    E('vidange', 780, 310, { name: 'Vidange ballon' });
    frameExample('Chaufferie gaz — exemple', 'CHAUFFERIE — REZ-DE-CHAUSSÉE', 'Schéma de principe chaufferie gaz', 'Exemple');
  });
}

function exEauxPluviales() {
  return exampleDoc(({ E, port, pipe }) => {
    E('toiture', 200, 40, { p: { txt: 'Toiture non accessible R+6', w: 240 } });
    E('toiture', 480, 160, { p: { txt: 'Terrasse non accessible R+3', w: 120 } });
    E('eep', 120, 40); E('eep', 280, 40); E('eep', 480, 160);
    E('gargouille', 324, 34); E('gargouille', 544, 154);
    pipe('ep', [[120, 40], [120, 420], [680, 420]], { arr: true, dn: 'Ø100', lab: true, lp: 0.62 });
    pipe('ep', [[280, 40], [280, 420]], { arr: true, dn: 'Ø100', lab: true, lp: 0.45 });
    pipe('ep', [[480, 160], [480, 420]], { arr: true, dn: 'Ø100', lab: true, lp: 0.45 });
    for (const x of [120, 280, 480]) E('te_deg', x, 380, { rot: 90 });
    E('filtre_ep', 620, 420);
    const b1 = E('cuve_ep', 720, 440, { note: '6,5 m³ au total', sv: true }), b2 = E('cuve_ep', 840, 440);
    pipe('ep', [port(b1, 3), port(b2, 2)]);
    E('clapet_ar_ep', 940, 420);
    const rv = E('renvoi', 1000, 420, { p: { txt: 'Trop-plein vers réseau ville' } });
    pipe('ep', [port(b2, 1), port(rv, 0)], { arr: true });
    const st = E('recup_ep', 840, 600);
    pipe('ep', [port(b2, 5), [840, 510], [820, 510], port(st, 0)]);
    const ev = E('renvoi_arr', 690, 580, { rot: 180, p: { txt: 'Eau de ville' } });
    E('vanne_bs', 740, 580, { name: "Vanne d'isolement" });
    pipe('ef', [port(ev, 0), port(st, 1)]);
    const ll = E('lavelinge', 1190, 660, { name: 'Lave-linge laverie R-1', sn: true });
    pipe('enp', [port(st, 2), [1180, 580], port(ll, 0)], { arr: true, lab: true, txt: 'EAU NON POTABLE', lp: 0.06 });
    E('compteur_ep', 980, 580); E('vanne_bs', 1025, 580); E('vanne_bs', 1180, 620, { rot: 90 });
    const pu = E('puisage', 1060, 650, { name: 'Robinet de puisage local OM', sn: true });
    pipe('enp', [[1060, 580], port(pu, 0)]); E('vanne_bs', 1060, 615, { rot: 90 });
    E('clapet', 840, 680, { rot: 90 }); const eu = E('renvoi', 840, 720, { rot: 90, p: { txt: 'Vers EU' } });
    pipe('eu', [port(st, 3), port(eu, 0)]);
    const z = makeZone(560, 360, 680, 400); z.title = 'LOCAL RÉTENTION EP — 2e SOUS-SOL'; doc.items.unshift(z);
    frameExample('Eaux pluviales — toitures non accessibles', 'EAUX PLUVIALES — TOITURES NON ACCESSIBLES', 'Schéma de principe eaux pluviales', 'Exemple');
  });
}

/* ===== Démarrage ===== */
function bindUI() {
  for (const b of $$('[data-tool]')) b.addEventListener('click', () => setTool(b.dataset.tool));
  $('#b-rl').onclick = () => rotateCmd(-90); $('#b-rr').onclick = () => rotateCmd(90); $('#b-fh').onclick = () => flipCmd('h'); $('#b-fv').onclick = () => flipCmd('v');
  $('#b-undo').onclick = undo; $('#b-redo').onclick = redo; $('#b-del').onclick = deleteSel;
  $('#b-file').onclick = e => toggleMenu('file', e.currentTarget); $('#b-exp').onclick = e => toggleMenu('exp', e.currentTarget); $('#b-fonc').onclick = () => openFonctions(); $('#b-net').onclick = e => toggleMenu('net', e.currentTarget);
  $('#b-zi').onclick = () => zoomCenter(1.25); $('#b-zo').onclick = () => zoomCenter(0.8); $('#b-fit').onclick = fitView;
  $('#b-pal').onclick = () => { app.classList.toggle('show-pal'); app.classList.remove('show-insp'); };
  $('#b-insp').onclick = () => { app.classList.toggle('show-insp'); app.classList.remove('show-pal'); };
  $('#d-back').onclick = popDraft; $('#d-end').onclick = finishDraft; $('#d-cancel').onclick = cancelDraft;
  $('#pal-q').addEventListener('input', buildPalette);
  for (const b of $$('[data-ex]')) b.onclick = () => loadExample(b.dataset.ex);
  const dn = $('#docname'); let dnPrev = null;
  dn.addEventListener('focus', () => { dnPrev = snapshot(); });
  dn.addEventListener('input', () => { doc.name = dn.value; scheduleSave(); });
  dn.addEventListener('change', () => { doc.name = dn.value.trim() || 'Sans titre'; commit(dnPrev); dnPrev = snapshot(); if (!state.sel.size) buildInspector(); });
  dn.addEventListener('keydown', e => { if (e.key === 'Enter') dn.blur(); });
  $('#file-in').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { loadDocObj(JSON.parse(await f.text())); state.libId = null; toast('Schéma ouvert.'); } catch (err) { toast('Fichier illisible : choisissez un .json enregistré depuis cet outil.'); } });
  $('#stage').addEventListener('dragover', e => e.preventDefault());
  $('#stage').addEventListener('drop', async e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (!f) return; try { loadDocObj(JSON.parse(await f.text())); toast('Schéma ouvert.'); } catch (err) { toast('Fichier illisible.'); } });
  if (window.ResizeObserver) new ResizeObserver(() => { updateGrid(); renderUI(); }).observe($('#stage'));
  const art = [makeEl('vanne', 70, 30), makeEl('pompe', 130, 30), makeEl('clapet', 180, 30), makeEl('filtre', 230, 30)];
  $('#empty-art').innerHTML = '<line x1="20" y1="30" x2="280" y2="30" stroke="#1c7ed6" stroke-width="2.4"/>' + art.map(a => elSVG(a, null, { exp: true })).join('');
}
function init() {
  buildPalette(); bindUI();
  const had = restore(); syncDocName(); updateNetBtn(); updateHint();
  render(); buildInspector(); updateUndo(); updateToolUI();
  requestAnimationFrame(() => { if (had && doc.items.length) fitView(); else applyView(); });
  initCaps();
}
init();
})();
