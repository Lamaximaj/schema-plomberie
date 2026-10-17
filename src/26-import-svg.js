
/* ===== Import des anciens exports SVG (sans données intégrées) =====
   Avant l'intégration des données dans les exports, un SVG ne contenait que le dessin. On le relit pour en refaire un schéma
   modifiable : chaque symbole est reconnu par l'empreinte de son dessin (version actuelle, puis versions précédentes, puis
   dessins de la légende du fichier), les tuyaux par leur tracé et leur couleur, les repères et libellés par leur position. */

/* <empreintes> — ce bloc est aussi exécuté dans les anciennes versions par outils/signatures-anciennes.cjs : il ne doit
   utiliser que l'objet api qu'on lui passe. Empreinte = forme canonique du dessin (attributs triés, sans les couleurs et
   épaisseurs des piquages, qui dépendent du réseau raccordé), réduite par un hachage FNV-1a. */
function sigCanonEl(n) {
  const st = n.hasAttribute('stroke'), at = [];
  for (const a of n.attributes) { const k = a.name; if (k === 'stroke' || (k === 'stroke-width' && st) || k.indexOf('data-') === 0) continue; at.push(k + '=' + a.value); }
  at.sort(); let s = '<' + n.localName + ' ' + at.join(' ') + '>';
  for (const c of n.children) s += sigCanonEl(c);
  return s + '</>';
}
function sigCanon(node) { let s = ''; for (const c of node.children) s += sigCanonEl(c); return s; }
function sigHash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
/* Toutes les variantes de dessin de chaque préréglage : réglages à cases et à liste, nombres à moins de 120 valeurs, vue
   normale et vue réaliste. Le bloc équipement et le renvoi, dont la taille suit le texte, sont reconnus à part.
   Les dessins sont relus d'un seul tenant (un groupe par variante), beaucoup plus vite qu'un par un. */
function sigEnumerate(api) {
  const out = [], seen = new Map(), todo = [];
  for (const real of [false, true]) {
    api.setReal(real);
    for (const k of Object.keys(api.PRE)) {
      const pr = api.PRE[k], def = api.S[pr.type]; if (!def || pr.type === 'bloc' || pr.type === 'renvoi') continue;
      const base = {}, dims = [], prm = def.params || {};
      for (const pk in prm) base[pk] = prm[pk].def;
      Object.assign(base, JSON.parse(JSON.stringify(pr.p || {})));
      for (const pk in prm) {
        const sp = prm[pk];
        if (sp.type === 'check') dims.push([pk, [false, true]]);
        else if (sp.type === 'select') dims.push([pk, sp.options.map(o => o[0])]);
        else if (sp.type === 'number') { const st = sp.step || 1, n = Math.floor((sp.max - sp.min) / st) + 1; if (n > 0 && n <= 120) { const v = []; for (let i = 0; i < n; i++) v.push(sp.min + i * st); dims.push([pk, v]); } }
      }
      let combos = [{}];
      for (const [pk, vals] of dims) { const nx = []; for (const c of combos) for (const v of vals) nx.push(Object.assign({}, c, { [pk]: v })); combos = nx; if (combos.length > 3000) break; }
      for (const c of combos) {
        const p = Object.assign({}, base, c), el = { id: 'x', kind: 'el', type: pr.type, pre: k, x: 0, y: 0, rot: 0, fh: false, p, name: pr.name, tag: '', note: '' };
        let o; try { o = def.draw(el, api.NOCTX) || {}; } catch (e) { continue; }
        todo.push({ g: o.g || '', pre: k, type: pr.type, p: c, real });
      }
    }
  }
  api.setReal(false);
  const parse = s => { const d = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + s + '</svg>', 'image/svg+xml'); return d.getElementsByTagName('parsererror').length ? null : [...d.documentElement.children]; };
  let nodes = parse(todo.map(t => '<g>' + t.g + '</g>').join(''));
  if (!nodes || nodes.length !== todo.length) nodes = todo.map(t => { const n = parse('<g>' + t.g + '</g>'); return n && n[0]; });
  todo.forEach((t, i) => {
    const node = nodes[i]; if (!node) return;
    const sig = sigHash(sigCanon(node)), key = t.pre + '|' + JSON.stringify(t.p);
    if (!t.real) { seen.set(key, sig); out.push({ sig, pre: t.pre, type: t.type, p: t.p, real: null, node }); }
    else if (seen.get(key) !== sig) { out.push({ sig, pre: t.pre, type: t.type, p: t.p, real: true, node }); const e0 = out.find(e => e.real === null && e.pre === t.pre && e.sig === seen.get(key) && JSON.stringify(e.p) === JSON.stringify(t.p)); if (e0) e0.real = false; }
  });
  return out;
}
/* </empreintes> */

let sigIdx = null;
function sigIndex() {
  if (sigIdx) return sigIdx;
  const saved = doc.opts.real, map = new Map(), all = [];
  try {
    for (const e of sigEnumerate({ S, PRE, NOCTX, setReal: v => { doc.opts.real = v; } })) {
      e.toks = [...e.node.children].map(sigCanonEl); delete e.node;
      if (!map.has(e.sig)) map.set(e.sig, []); map.get(e.sig).push(e); all.push(e);
    }
  } finally { doc.opts.real = saved; }
  sigIdx = { map, all };
  return sigIdx;
}
/* Ressemblance de deux dessins (multiensembles de primitives) : sert quand un dessin a changé depuis l'export */
function sigLike(a, b) {
  const m = new Map(); for (const t of a) m.set(t, (m.get(t) || 0) + 1);
  let inter = 0; for (const t of b) { const n = m.get(t) || 0; if (n) { inter++; m.set(t, n - 1); } }
  return inter / (a.length + b.length - inter || 1);
}

const IMP_INK = '#16191b';
const numA = (n, k) => { const v = parseFloat(n.getAttribute(k)); return isFinite(v) ? v : 0; };
const styleFill = n => { const m = /fill:\s*(#[0-9a-fA-F]{6}|none)/.exec(n.getAttribute('style') || ''); return m ? m[1].toLowerCase() : (n.getAttribute('fill') || '').toLowerCase(); };
const isHalo = n => n.localName === 'text' && /fill:\s*none/.test(n.getAttribute('style') || '');
const kidsOf = n => [...n.children];
const dashOf = s => { s = (s || '').trim(); for (const k in DASHES) if (DASHES[k] && DASHES[k] === s) return k; return s ? 'dash' : 'solid'; };
/* Points d'un tracé de tuyau : extrémités des M, L et des arcs des sauts, puis suppression des points alignés */
function pathPts(d) {
  const pts = [], re = /([MLA])([^MLAZz]*)/g; let m;
  while ((m = re.exec(d))) { const v = m[2].trim().split(/[\s,]+/).map(Number); if (v.length >= 2 && v.every(isFinite)) pts.push({ x: v[v.length - 2], y: v[v.length - 1] }); }
  return simplify(pts);
}
function rotOf(n) { const m = /rotate\(([-\d.e]+)/.exec(n.getAttribute('transform') || ''); return m ? +m[1] : 0; }
function scaleOf(n) { const m = /matrix\(([-\d.e]+) 0 0/.exec(n.getAttribute('transform') || ''); return m ? +m[1] : 1; }
function lenAlong(pts, q) {
  let L = 0, best = Infinity, at = 0;
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y), r = distPtSeg(q, a, b); if (r.d < best) { best = r.d; at = L + r.t * l; } L += l; }
  return { d: best, f: L ? at / L : 0.5 };
}
/* Textes d'un symbole (lettres dans le dessin, texte d'un renvoi…) → réglages texte, alignés sur la version actuelle */
function textParams(el, texts) {
  const def = S[el.type], tps = Object.keys(def.params || {}).filter(k => ['text', 'area'].includes(def.params[k].type));
  if (!tps.length) return;
  if (el.type === 'bloc') { el.p.txt = texts.join('\n'); return; }
  const probe = Object.assign({}, el, { p: Object.assign({}, el.p) }), SENT = {};
  for (const k of tps) { probe.p[k] = '\u0007' + k; SENT['\u0007' + k] = k; }
  let o; try { o = def.draw(probe, NOCTX) || {}; } catch (e) { return; }
  const exp = (o.t || []).map(t => t[2]).filter(s => s !== '' && s != null); let j = 0;
  for (let i = 0; i < exp.length; i++) {
    const e = exp[i];
    if (SENT[e]) { const nextC = exp.slice(i + 1).find(x => !SENT[x]); if (j < texts.length && texts[j] !== nextC) el.p[SENT[e]] = texts[j++]; else el.p[SENT[e]] = ''; }
    else if (texts[j] === e) j++;
  }
}
/* Défauts d'un préréglage, comme makeEl, sans repère (attribué à la fin) */
function impEl(pre, x, y) {
  const pr = PRE[pre], def = S[pr.type], p = {};
  for (const k in (def.params || {})) p[k] = def.params[k].def;
  Object.assign(p, clone(pr.p));
  return { id: uid(), kind: 'el', type: pr.type, pre, x, y, rot: 0, fh: false, p, tag: '', name: pr.name, note: '', st: false, sn: false, sv: false, lx: 0, ly: 0 };
}

/* Attribution des libellés aux symboles : affectation de coût minimal (méthode hongroise), par groupes de libellés et de
   symboles voisins. Un libellé peut rester seul (coût fixe) : il devient alors un texte libre. Mieux qu'au plus proche
   quand l'utilisateur a décalé plusieurs libellés du même côté (chacun finit plus près du symbole voisin). */
function hungarian(a) {
  const n = a.length, m = a[0].length, INF = 1e18, u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) { const cur = a[i0 - 1][j - 1] - u[i0] - v[j]; if (cur < minv[j]) { minv[j] = cur; way[j] = j0; } if (minv[j] < delta) { delta = minv[j]; j1 = j; } }
      for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const ans = new Array(n).fill(-1); for (let j = 1; j <= m; j++) if (p[j]) ans[p[j] - 1] = j - 1;
  return ans;
}
function assignLabels(pairs) {
  const LONE = 400, BIG = 1e9, par = new Map(), find = k => { while (par.get(k) !== k) { par.set(k, par.get(par.get(k))); k = par.get(k); } return k; };
  for (const q of pairs) for (const k of ['l' + q.li, 'e' + q.ei]) if (!par.has(k)) par.set(k, k);
  for (const q of pairs) { const a = find('l' + q.li), b = find('e' + q.ei); if (a !== b) par.set(a, b); }
  const groups = new Map(); for (const q of pairs) { const g = find('l' + q.li); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(q); }
  const out = [];
  for (const qs of groups.values()) {
    const L = [...new Set(qs.map(q => q.li))], E = [...new Set(qs.map(q => q.ei))], li = new Map(L.map((x, i) => [x, i])), ei = new Map(E.map((x, i) => [x, i]));
    const a = L.map((x, i) => { const r = new Array(E.length + L.length).fill(BIG); r[E.length + i] = LONE; return r; });
    for (const q of qs) a[li.get(q.li)][ei.get(q.ei)] = Math.min(a[li.get(q.li)][ei.get(q.ei)], q.cost);
    hungarian(a).forEach((j, i) => { if (j >= 0 && j < E.length && a[i][j] < BIG) out.push(qs.find(q => q.li === L[i] && q.ei === E[j])); });
  }
  return out;
}

function importLegacySVG(text, fileName) {
  const dom = new DOMParser().parseFromString(text, 'image/svg+xml'), root = dom.documentElement;
  if (!root || root.localName !== 'svg' || dom.getElementsByTagName('parsererror').length) throw new Error('svg');
  const kids = kidsOf(root), vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const R = { els: [], pipes: [], zones: [], annots: [], labels: [], plabels: [], legNets: [], legSyms: [], legNames: new Set(), nomTags: new Map(), border: false, unknown: 0 };
  const realVotes = [0, 0];

  /* 1. Lecture des nœuds de premier niveau, dans l'ordre de l'export : zones, tuyaux, piquages, symboles, libellés, mise en page */
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i], tag = n.localName;
    if (tag === 'metadata' || tag === 'circle' || tag === 'defs') continue;
    if (tag === 'rect') { if (i > 0 && (n.getAttribute('fill') === 'none') && /stroke/.test(n.getAttribute('style') || '')) R.border = true; continue; }
    if (tag !== 'g') continue;
    const tr = n.getAttribute('transform') || '', ks = kidsOf(n);
    const em = /^translate\(([-\d.e]+) ([-\d.e]+)\)(?: rotate\(([-\d.e]+)\))?( scale\(-1 1\))?$/.exec(tr);
    if (em && /color:/.test(n.getAttribute('style') || '')) {
      const texts = []; while (i + 1 < kids.length && kids[i + 1].localName === 'text' && kids[i + 1].getAttribute('pointer-events') === 'none') texts.push(kids[++i].textContent);
      const col = (/color:\s*(#[0-9a-fA-F]{6})/.exec(n.getAttribute('style')) || [])[1];
      R.els.push({ node: n, x: +em[1], y: +em[2], rot: em[3] ? norm360(+em[3]) : 0, fh: !!em[4], texts, color: col && col.toLowerCase() !== IMP_INK ? col : null });
      continue;
    }
    if (ks.length && ks.every(c => c.localName === 'text') && isHalo(ks[0])) { const lines = ks.filter(c => !isHalo(c)); (numA(lines[0], 'font-size') === 7.5 ? R.plabels : R.labels).push(lines); continue; }
    if (ks.some(c => c.localName === 'rect' && c.getAttribute('stroke-width') === '1.3')) { R.zones.push(n); continue; }
    const first = ks[0];
    if (first && first.localName === 'rect' && first.getAttribute('stroke-width') === '1.4') { R.annots.push({ kind: 'cart', n }); continue; }
    if (first && first.localName === 'rect' && first.getAttribute('stroke-width') === '1' && /fill:\s*#ffffff/i.test(first.getAttribute('style') || '')) {
      R.annots.push({ kind: ks.some(c => c.localName === 'text' && c.textContent === 'Qté' && c.getAttribute('font-weight') === '700') ? 'nomen' : 'legend', n }); continue;
    }
    const pp = ks.find(c => c.localName === 'path' && c.getAttribute('fill') === 'none' && c.hasAttribute('stroke'));
    if (pp && !ks.some(c => c.localName === 'rect' || c.localName === 'text')) { R.pipes.push({ node: n, path: pp }); continue; }
    if (ks.length && ks.some(c => c.localName === 'text') && ks.every(c => c.localName === 'text' || c.localName === 'rect')) { R.annots.push({ kind: 'text', n }); continue; }
    R.unknown++;
  }

  /* 2. Légende : réseaux (trait + libellé) et symboles (dessin + désignation), qui servent à reconnaître les dessins du fichier */
  for (const a of R.annots) {
    if (a.kind !== 'legend') continue;
    const ks = kidsOf(a.n);
    for (let i = 0; i < ks.length; i++) {
      const c = ks[i], nextLabel = () => { for (let j = i + 1; j < ks.length; j++) { const t = ks[j]; if (t.localName === 'text' && !t.hasAttribute('font-family') && numA(t, 'font-size') === 7.5) return t.textContent; if (t.localName !== 'text') return null; } return null; };
      if (c.localName === 'line' && c.hasAttribute('stroke')) { const lab = nextLabel(); if (lab != null) R.legNets.push({ color: c.getAttribute('stroke').toLowerCase(), w: numA(c, 'stroke-width'), dash: dashOf(c.getAttribute('stroke-dasharray')), label: lab }); }
      else if (c.localName === 'g' && /scale\(/.test(c.getAttribute('transform') || '')) {
        const lab = nextLabel(); if (lab == null) continue; R.legNames.add(lab);
        const cs = kidsOf(c), axis = cs[0] && cs[0].localName === 'line' && cs[0].getAttribute('y1') === '0' && cs[0].getAttribute('y2') === '0' && cs[0].getAttribute('stroke-width') === '1.2';
        const sigs = [sigHash(sigCanon(c))]; if (axis) { let s = ''; for (const x of cs.slice(1)) s += sigCanonEl(x); sigs.push(sigHash(s)); }
        R.legSyms.push({ sigs, label: lab });
      }
    }
  }
  /* Nomenclature : désignation et caractéristiques par repère */
  for (const a of R.annots) {
    if (a.kind !== 'nomen') continue;
    const cols = []; let cur = null;
    for (const t of kidsOf(a.n)) { if (t.localName !== 'text' || numA(t, 'font-size') !== 7) continue; if (t.getAttribute('font-weight') === '700') { cur = []; cols.push(cur); } else if (cur) cur.push(t.textContent); }
    for (let b = 0; b + 3 < cols.length; b += 4) for (let r = 0; r < cols[b + 1].length; r++) {
      const name = cols[b + 1][r], note = cols[b + 2][r] || '', reps = cols[b + 3][r] || '';
      if (/…$/.test(name) || /…$/.test(note) || /…$/.test(reps)) continue;
      for (const part of reps.split(', ').filter(Boolean)) {
        const rg = /^(.*?)(\d+) à \1(\d+)$/.exec(part);
        if (rg) for (let k = +rg[2]; k <= +rg[3]; k++) R.nomTags.set(rg[1] + k, { name, note }); else R.nomTags.set(part, { name, note });
      }
    }
  }

  /* 3. Réseaux : ceux par défaut, corrigés par la légende du fichier ; un réseau par couleur inconnue */
  const nets = clone(DEFAULT_NETS);
  for (const ln of R.legNets) {
    const m = /^(.+?) : (.+)$/.exec(ln.label), abbr = m ? m[1].trim() : '', name = m ? m[2].trim() : ln.label.trim();
    let n = nets.find(x => abbr && x.abbr.toLowerCase() === abbr.toLowerCase()) || nets.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!n) { n = { id: 'n' + uid(), abbr: abbr.slice(0, 6), name: name.slice(0, 40), color: ln.color, dash: ln.dash, w: ln.w || 2.4 }; nets.push(n); }
    else Object.assign(n, { name: name.slice(0, 40), color: ln.color, dash: ln.dash, w: ln.w || n.w });
  }
  const netByColor = (col, w, dash) => {
    col = (col || '').toLowerCase();
    let n = nets.find(x => x.color.toLowerCase() === col && x.dash === dash && Math.abs(x.w - w) < 0.01) || nets.find(x => x.color.toLowerCase() === col);
    if (!n) { n = { id: 'n' + uid(), abbr: '', name: 'Réseau importé ' + (nets.filter(x => /^Réseau importé/.test(x.name)).length + 1), color: isHex(col) ? col : '#495057', dash, w: w || 2.4 }; nets.push(n); }
    return n;
  };

  /* 4. Tuyaux : tracé (points des M, L et des sauts), réseau d'après la couleur, flèches de sens */
  const pipesOut = [];
  let arcs = false;
  for (const P_ of R.pipes) {
    const d = P_.path.getAttribute('d') || ''; if (/A/.test(d)) arcs = true;
    const pts = pathPts(d); if (pts.length < 2) continue;
    const w = numA(P_.path, 'stroke-width'), n = netByColor(P_.path.getAttribute('stroke'), w, dashOf(P_.path.getAttribute('stroke-dasharray')));
    const arr = kidsOf(P_.node).some(c => c !== P_.path && c.localName === 'path' && c.getAttribute('stroke') === 'none');
    pipesOut.push({ id: uid(), kind: 'pipe', net: n.id, pts, dn: '', lab: false, lp: 0.5, arr, txt: '' });
  }
  const netAtPort = q => { for (const p of pipesOut) if (near(p.pts[0], q) || near(p.pts[p.pts.length - 1], q)) return p.net; for (const p of pipesOut) if (onPoly(q, p.pts)) return p.net; return null; };

  /* 5. Symboles */
  const idx = sigIndex(), OLD = typeof SIG_ANCIENNES !== 'undefined' ? SIG_ANCIENNES : {};
  const presetsNamed = lab => Object.keys(PRE).filter(k => PRE[k].name === lab);
  const els = [];
  for (const E of R.els) {
    const ks = kidsOf(E.node), sig = sigHash(sigCanon(E.node)); let cands = null, el = null;
    /* Renvoi : flèche de départ ou d'arrivée, largeur selon son texte */
    if (ks.length === 1 && ks[0].localName === 'path') {
      const d = ks[0].getAttribute('d') || '', dep = /^M0,-9L([\d.]+),-9L([\d.]+),0L\1,9L0,9Z$/.exec(d), arr = /^M0,0L9,-9L([\d.]+),-9L\1,9L9,9Z$/.exec(d);
      if (dep || arr) { el = impEl(arr ? 'renvoi_arr' : 'renvoi', E.x, E.y); el.p.sens = arr ? 'arr' : 'dep'; el.p.txt = E.texts.join(' '); }
    }
    /* Bloc équipement : un seul rectangle centré à coins arrondis */
    if (!el && ks.length === 1 && ks[0].localName === 'rect' && ks[0].getAttribute('rx') === '3') {
      const w = numA(ks[0], 'width'), hh = numA(ks[0], 'height');
      if (Math.abs(numA(ks[0], 'x') + w / 2) < 0.01 && Math.abs(numA(ks[0], 'y') + hh / 2) < 0.01) { el = impEl('bloc', E.x, E.y); el.p.w = w; el.p.h = hh; el.p.txt = E.texts.join('\n'); }
    }
    if (!el) {
      cands = (idx.map.get(sig) || []).map(c => ({ pre: c.pre, p: c.p, real: c.real }));
      if (!cands.length && OLD[sig]) cands = OLD[sig].map(([pre, type, p, real]) => ({ pre: PRE[pre] ? pre : Object.keys(PRE).find(k => PRE[k].type === type), p: p || {}, real })).filter(c => c.pre);
      if (!cands.length) { const L = R.legSyms.find(s => s.sigs.includes(sig)); if (L) cands = presetsNamed(L.label).map(pre => ({ pre, p: {}, real: null })); }
      if (!cands.length) {
        const toks = ks.map(sigCanonEl); let best = null, bs = 0;
        for (const c of idx.all) { const s = sigLike(toks, c.toks); if (s > bs) { bs = s; best = c; } }
        if (best && bs >= 0.5) cands = [{ pre: best.pre, p: best.p, real: best.real }];
      }
      if (!cands.length) { R.unknown++; continue; }
      /* Plusieurs préréglages au même dessin : celui que nomme la légende, puis le premier */
      const pick = cands.find(c => R.legNames.has(PRE[c.pre].name)) || cands[0];
      el = impEl(pick.pre, E.x, E.y); Object.assign(el.p, pick.p);
      if (pick.real === true) realVotes[1]++; else if (pick.real === false) realVotes[0]++;
      textParams(el, E.texts);
      el.cands = cands;
    }
    el.rot = E.rot; el.fh = E.fh; if (E.color) el.color = E.color; el.raw = E.texts;
    els.push(el);
  }
  const real = realVotes[1] > realVotes[0];

  /* 6. Repères et libellés des symboles : chaque groupe va au symbole dont la position par défaut est la plus proche. Un repère
     du type préfixe + numéro (V3, BRC1) ne peut aller qu'à un symbole de ce préfixe, même si le libellé a été déplacé. */
  const saveReal = doc.opts.real; doc.opts.real = real;
  const labs = [], rnd = v => { v = Math.round(v * 100) / 100; return Math.abs(v) < 0.05 ? 0 : v; }, doneL = new Set(), doneE = new Set();
  const prefs = els.map(el => { const s = new Set([prefixOf(el)]); for (const c of el.cands || []) s.add(PRE[c.pre].prefix); s.delete(''); return s; });
  try {
    R.labels.forEach((lines, li) => {
      const l0 = lines[0], an = l0.getAttribute('text-anchor') || 'start', sizes = lines.map(l => numA(l, 'font-size')), H = sizes.reduce((a, s) => a + s * 1.2, 0);
      const lx = numA(l0, 'x'), ly = numA(l0, 'y') - sizes[0] * 0.92, tagTxt = sizes[0] === 8 && l0.getAttribute('font-weight') === '700' ? l0.textContent : null;
      const want = tagTxt && (/^(.*?)\d+$/.exec(tagTxt) || [])[1], strict = !!want && prefs.some(s => s.has(want));
      els.forEach((el, ei) => {
        if (strict && !prefs[ei].has(want)) return;
        const bb = elBox(el), mid = bb.x1 - bb.x0 >= bb.y1 - bb.y0; if ((an === 'middle') !== mid) return;
        const dx = mid ? (bb.x0 + bb.x1) / 2 : bb.x1 + 4, dy = mid ? bb.y0 - 3 - H : (bb.y0 + bb.y1) / 2 - H / 2;
        const cost = Math.hypot(lx - dx, ly - dy);
        if (cost < 400) labs.push({ li, ei, cost, ox: lx - dx, oy: ly - dy });
      });
    });
    for (const m of assignLabels(labs)) {
      doneL.add(m.li); doneE.add(m.ei);
      const el = els[m.ei], lines = R.labels[m.li]; let k = 0;
      if (numA(lines[0], 'font-size') === 8 && lines[0].getAttribute('font-weight') === '700') { el.tag = lines[0].textContent; el.st = true; k = 1; }
      const rest = lines.slice(k).map(l => l.textContent);
      if (rest.length >= 2) { el.name = rest[0]; el.sn = true; el.note = rest[1]; el.sv = true; }
      else if (rest.length === 1) {
        const s = rest[0], nt = el.tag && R.nomTags.get(el.tag);
        const asName = nt ? nt.name === s || nt.note !== s : (s === PRE[el.pre].name || R.legNames.has(s) || !(/\d/.test(s) && s.length <= 18));
        if (asName) { el.name = s; el.sn = true; } else { el.note = s; el.sv = true; }
      }
      el.lx = rnd(m.ox); el.ly = rnd(m.oy);
    }
    /* Plusieurs préréglages au même dessin (vase et vase sanitaire, échangeur et préparateur…) : le repère, les mots de la
       désignation (affichée ou de la nomenclature), les réseaux raccordés et les textes du dessin départagent. À égalité, la
       légende tranche : ses lignes suivent l'ordre de première apparition des préréglages. */
    const STOP = new Set(['les', 'des', 'sur', 'pour', 'avec', 'une', 'dans', 'par', 'aux', 'eau']), words = t => new Set(String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w)));
    const nameLike = (shown, preName) => { const a = words(shown), b = words(preName); if (!a.size || !b.size) return 0; let n = 0; for (const w of b) if (a.has(w)) n++; return n / b.size; };
    const netsLike = (el, c) => {
      const t = Object.assign({}, el, { pre: c.pre, type: PRE[c.pre].type, p: Object.assign({}, el.p, PRE[c.pre].p, c.p) }); let r; try { r = raccOf(t); } catch (e) { return 0; }
      const exp = (r && r.p) || [], ws = portsW(t); let ok = 0, ko = 0;
      exp.forEach((rp, i) => { if (!rp || !rp.nets || !rp.nets.length || !ws[i]) return; const n = netAtPort(ws[i]); if (!n) return; if (rp.nets.includes(n)) ok++; else ko++; });
      return ok + ko ? (ok - ko) / (ok + ko) : 0;
    };
    /* Changer de préréglage peut changer la boîte du symbole : le libellé garde sa place sur le dessin */
    const setPre = (el, c) => {
      if (c.pre === el.pre) return;
      const lay0 = labelLayout(el), keep = { tag: el.tag, st: el.st, sn: el.sn, sv: el.sv, note: el.note, lx: el.lx, ly: el.ly, rot: el.rot, fh: el.fh, color: el.color }, name = el.sn ? el.name : null;
      const ne = impEl(c.pre, el.x, el.y); Object.assign(ne.p, c.p); textParams(ne, el.raw || []);
      Object.assign(el, { type: ne.type, pre: ne.pre, p: ne.p, name: name == null ? ne.name : name }, keep); if (!keep.color) delete el.color;
      const lay1 = labelLayout(el); if (lay0 && lay1 && lay0.anchor === lay1.anchor) { el.lx = rnd(el.lx + lay0.x - lay1.x); el.ly = rnd(el.ly + lay0.y - lay1.y); }
    };
    const legOrder = new Map(); R.legSyms.forEach((s, i) => { if (!legOrder.has(s.label)) legOrder.set(s.label, i); });
    const catOf = pre => S[PRE[pre].type].cat, legPre = pre => legOrder.has(PRE[pre].name) ? legOrder.get(PRE[pre].name) : -1;
    const opts = els.map(el => {
      if (!el.cands || el.cands.length < 2) return [{ c: { pre: el.pre, p: {} }, v: 0, fixed: true }];
      const nt = el.tag && R.nomTags.get(el.tag), shown = el.sn ? el.name : nt ? nt.name : '', score = c => { const pr = PRE[c.pre]; let v = 0;
        if (el.st && pr.prefix && new RegExp('^' + reEsc(pr.prefix) + '\\d+$').test(el.tag)) v += 4;
        if (shown) v += shown === pr.name ? 4 : 3 * nameLike(shown, pr.name);
        if (R.legNames.has(pr.name)) v += 1;
        v += 2 * netsLike(el, c);
        for (const k in pr.p) v += String(el.p[k]) === String(pr.p[k]) ? 2 : -3; /* textes du dessin : BA ou CA, m³ ou kWh… */
        return Math.round(v * 1000) / 1000; };
      return el.cands.map(c => ({ c, v: score(c) }));
    });
    /* Par famille de la légende : l'ordre de première apparition des préréglages doit suivre l'ordre des lignes de la légende.
       Programmation dynamique sur les symboles dans l'ordre du dessin (état : nombre de préréglages déjà apparus). */
    const fams = new Map();
    els.forEach((el, i) => { const cs = new Set(opts[i].map(o => catOf(o.c.pre))); if (cs.size !== 1) return; const k = [...cs][0]; if (!fams.has(k)) fams.set(k, []); fams.get(k).push(i); });
    const choice = opts.map(o => o.reduce((a, b) => b.v > a.v ? b : a, o[0]));
    for (const idx of fams.values()) {
      if (!idx.some(i => opts[i].length > 1)) continue;
      const pres = new Set(); for (const i of idx) for (const o of opts[i]) pres.add(o.c.pre);
      const L = [...pres].filter(p => legPre(p) >= 0).sort((a, b) => legPre(a) - legPre(b)), K = L.length, pos = new Map(L.map((p, j) => [p, j]));
      let best = new Array(K + 1).fill(-Infinity); best[0] = 0; const back = [];
      for (const i of idx) {
        const nx = new Array(K + 1).fill(-Infinity), bk = new Array(K + 1).fill(null);
        for (let k = 0; k <= K; k++) { if (best[k] === -Infinity) continue;
          for (const o of opts[i]) { const j = pos.has(o.c.pre) ? pos.get(o.c.pre) : -1, k2 = j < 0 || j < k ? k : j === k ? k + 1 : -1; if (k2 < 0) continue; const val = best[k] + o.v; if (val > nx[k2]) { nx[k2] = val; bk[k2] = { k, o }; } } }
        back.push(bk); best = nx;
      }
      let k = K; while (k > 0 && best[k] === -Infinity) k--; if (best[k] === -Infinity) continue;
      for (let t = idx.length - 1; t >= 0; t--) { const b = back[t][k]; if (!b) break; choice[idx[t]] = b.o; k = b.k; }
    }
    els.forEach((el, i) => { if (opts[i].length > 1) setPre(el, choice[i].c); });
  } finally { doc.opts.real = saveReal; }
  /* Désignation et caractéristiques non affichées : reprises de la nomenclature quand le repère est connu */
  for (const el of els) { const nt = el.tag && R.nomTags.get(el.tag); if (nt) { if (!el.sn) el.name = nt.name; if (!el.sv) el.note = nt.note; } }
  /* Libellés sans symbole : gardés en texte libre */
  const freeTexts = [];
  R.labels.forEach((lines, li) => { if (doneL.has(li)) return; const l0 = lines[0], sz = numA(l0, 'font-size'); freeTexts.push(Object.assign(makeText(numA(l0, 'x'), r2(numA(l0, 'y') - sz * 0.95), lines.map(l => l.textContent).join('\n')), { size: sz, bold: l0.getAttribute('font-weight') === '700', align: l0.getAttribute('text-anchor') || 'start' })); });

  /* 7. Libellés des tuyaux */
  for (const lines of R.plabels) {
    const l = lines[0], col = styleFill(l), a = rotOf(l), ar = a * Math.PI / 180, x = numA(l, 'x'), y = numA(l, 'y'), txt = l.textContent;
    let best = null;
    for (const p of pipesOut) {
      const n = nets.find(q => q.id === p.net); if (!n || n.color.toLowerCase() !== col) continue;
      const off = n.w / 2 + 3, q = { x: x - Math.sin(ar) * off, y: y + Math.cos(ar) * off }, r = lenAlong(p.pts, q);
      if (r.d < 4 && (!best || r.d < best.d)) best = { p, n, f: r.f, d: r.d };
    }
    if (!best) { freeTexts.push(Object.assign(makeText(x, r2(y - 7.5 * 0.95), txt), { size: 7.5, bold: true, align: 'middle', color: isHex(col) ? col : '' })); continue; }
    const p = best.p, ab = best.n.abbr; p.lab = true; p.lp = Math.round(best.f * 1000) / 1000;
    if (ab && txt === ab) p.dn = ''; else if (ab && txt.indexOf(ab + ' ') === 0) p.dn = txt.slice(ab.length + 1); else p.txt = txt;
  }

  /* 8. Zones, textes, légende, nomenclature, cartouche */
  const zonesOut = R.zones.map(n => {
    const ks = kidsOf(n), sr = ks.find(c => c.localName === 'rect' && c.getAttribute('stroke-width') === '1.3'), t = ks.find(c => c.localName === 'text');
    const dash = (sr.getAttribute('stroke-dasharray') || '').trim(), style = dash === '' ? 'solid' : dash === '14 4 3 4' ? 'dashdot' : 'dash';
    return { id: uid(), kind: 'zone', x: numA(sr, 'x'), y: numA(sr, 'y'), w: numA(sr, 'width'), h: numA(sr, 'height'), title: t ? t.textContent : '', color: sr.getAttribute('stroke') || '#5c656b', style, fill: ks.some(c => c.getAttribute('fill-opacity') === '0.06') };
  });
  const annots = [];
  for (const a of R.annots) {
    const ks = kidsOf(a.n), r0 = ks[0], sc = scaleOf(a.n);
    if (a.kind === 'text') {
      const ts = ks.filter(c => c.localName === 'text'), t0 = ts[0], sz = numA(t0, 'font-size') || 9, col = styleFill(t0);
      annots.push({ id: uid(), kind: 'text', x: numA(t0, 'x'), y: r2(numA(t0, 'y') - sz * 0.95), txt: ts.map(t => t.textContent).join('\n'), size: sz, bold: t0.getAttribute('font-weight') === '700', color: col && col !== IMP_INK && isHex(col) ? col : '', align: t0.getAttribute('text-anchor') || 'start', bg: ks[0].localName === 'rect' });
    } else if (a.kind === 'legend') {
      const t = ks.find(c => c.localName === 'text'), labX = new Map();
      for (const c of ks) if (c.localName === 'text' && numA(c, 'font-size') === 7.5 && !c.hasAttribute('font-family') && c.getAttribute('font-style') !== 'italic') { const k = Math.round(numA(c, 'x')); labX.set(k, (labX.get(k) || 0) + 1); }
      const counts = [...labX.entries()].sort((p, q) => p[0] - q[0]).map(e => e[1]), rows = counts.length > 1 ? counts[0] : Math.max(12, counts[0] || 0);
      annots.push({ id: uid(), kind: 'legend', x: numA(r0, 'x'), y: numA(r0, 'y'), title: t ? t.textContent : 'LÉGENDE', rows, nets: R.legNets.length > 0 || !pipesOut.length, syms: R.legSyms.length > 0 || !els.length, sc });
    } else if (a.kind === 'nomen') {
      const t = ks.find(c => c.localName === 'text'), heads = ks.filter(c => c.localName === 'text' && c.textContent === 'Qté' && c.getAttribute('font-weight') === '700').length;
      let rows = 0; if (heads > 1) { let cur = 0, inQ = false; for (const c of ks) { if (c.localName !== 'text' || numA(c, 'font-size') !== 7) continue; if (c.getAttribute('font-weight') === '700') { if (inQ) break; inQ = c.textContent === 'Qté'; } else if (inQ) cur++; } rows = cur; }
      annots.push({ id: uid(), kind: 'nomen', x: numA(r0, 'x'), y: numA(r0, 'y'), title: t ? t.textContent : 'NOMENCLATURE', rows, sc });
    } else if (a.kind === 'cart') {
      const f = {}, CAP = { 'Entreprise': 'ent', 'Opération': 'ope', 'Titre du document': 'titre', 'Lot': 'lot', 'Phase': 'phase', 'Indice': 'ind', 'Date': 'date', 'Échelle': 'ech', 'Dessiné par': 'auteur' };
      const ts = ks.filter(c => c.localName === 'text');
      for (let i = 0; i < ts.length - 1; i++) { const k = CAP[ts[i].textContent]; if (k && numA(ts[i], 'font-size') === 5.5) { f[k] = ts[i + 1].textContent.replace(/…$/, ''); i++; } }
      annots.push({ id: uid(), kind: 'cart', x: numA(r0, 'x'), y: numA(r0, 'y'), w: numA(r0, 'width') || 420, f: Object.assign({ ent: '', ope: '', titre: '', lot: '', phase: '', ind: '', date: '', ech: '', auteur: '' }, f), sc });
    }
  }

  /* 9. Repères des symboles sans repère visible, numérotés après ceux du fichier */
  const d = newDoc(); d.nets = nets; d.name = String(fileName || 'Schéma importé').replace(/\.[^.]+$/, '').slice(0, 80) || 'Schéma importé';
  for (const el of els) { delete el.cands; delete el.raw; }
  d.items = [...zonesOut, ...pipesOut, ...els, ...annots, ...freeTexts];
  const saved = doc; doc = d;
  try { for (const el of els) if (!el.tag) el.tag = nextTag(prefixOf(el)); } finally { doc = saved; }
  d.opts = { hops: arcs || !computeHops(pipesOut).size, real };
  if (R.border && vb.length === 4 && vb.every(isFinite)) { const land = vb[2] >= vb[3]; d.opts.page = { on: true, fmt: 'a3', land, x: vb[0], y: vb[1], w: vb[2], border: true }; }
  return { doc: d, stats: { els: els.length, pipes: pipesOut.length, unknown: R.unknown, nomen: R.annots.some(a => a.kind === 'nomen') } };
}
