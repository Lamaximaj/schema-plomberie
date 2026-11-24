
/* ===== Fonds de plan, calques, réseaux estompés, tronçons (neuf, existant, à curer, curé) ===== */
const EYE_ON = '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 20L20 4"/></svg>';
const LOCK_ON = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const LOCK_OFF = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/></svg>';
const DOT_ON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>';
const DOT_OFF = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>';

/* ----- Images des fonds de plan -----
   Gardées hors du schéma (l'historique d'annulation reste léger) : en mémoire, dans le navigateur (IndexedDB),
   et jointes au fichier .json et à Mes projets sous « assets ». */
const ASSETS = new Map();
const FOND_DB = 'schema-plomberie-fonds';
let fondDbP = null;
function fondDb() {
  if (!fondDbP) fondDbP = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('idb')); return; }
    const r = indexedDB.open(FOND_DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('img')) r.result.createObjectStore('img', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
  }).catch(e => { fondDbP = null; throw e; });
  return fondDbP;
}
async function fondDbDo(mode, fn) {
  const db = await fondDb();
  return new Promise((res, rej) => { const tx = db.transaction('img', mode), r = fn(tx.objectStore('img')); let out; if (r) r.onsuccess = () => { out = r.result; }; tx.oncomplete = () => res(out); tx.onerror = tx.onabort = () => rej(tx.error || new Error('idb')); });
}
const IMG_DATA = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;
function dataToBlobURL(src) {
  const i = src.indexOf(','), mime = src.slice(5, src.indexOf(';')), bin = atob(src.slice(i + 1)), u = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
  return URL.createObjectURL(new Blob([u], { type: mime }));
}
function assetPut(id, src, w, hh, persist) {
  if (!IMG_DATA.test(src)) return false;
  const old = ASSETS.get(id); if (old && old.src === src) return true;
  let url = src; try { url = dataToBlobURL(src); } catch (e) { /* l'adresse data: reste utilisable */ }
  ASSETS.set(id, { src, w: +w || 0, h: +hh || 0, url });
  if (persist !== false) fondDbDo('readwrite', st => st.put({ id, src, w: +w || 0, h: +hh || 0 })).catch(() => {});
  return true;
}
/* Images jointes à un schéma ouvert (fichier .json, Mes projets) */
function takeAssets(d) {
  if (!d || !d.assets || typeof d.assets !== 'object') return;
  for (const id of Object.keys(d.assets)) { const a = d.assets[id]; if (a && typeof a.src === 'string' && /^[\w-]{1,60}$/.test(id)) assetPut(id, a.src, a.w, a.h); }
}
function docWithAssets() {
  const used = new Set(doc.items.filter(i => i.kind === 'fond').map(i => i.img)), assets = {};
  for (const id of used) { const a = ASSETS.get(id); if (a) assets[id] = { src: a.src, w: a.w, h: a.h }; }
  return Object.keys(assets).length ? Object.assign({}, doc, { assets }) : doc;
}
/* Au démarrage : images des fonds du travail en cours, depuis le navigateur */
async function loadFondAssets() {
  const miss = [...new Set(doc.items.filter(i => i.kind === 'fond' && !ASSETS.has(i.img)).map(i => i.img))]; if (!miss.length) return;
  for (const id of miss) { try { const a = await fondDbDo('readonly', st => st.get(id)); if (a && a.src) assetPut(id, a.src, a.w, a.h, false); } catch (e) { /* base indisponible */ } }
  render();
}

/* ----- Dessin des fonds ----- */
function fondSVG(it, o) {
  const a = ASSETS.get(it.img); if (!a) return '';
  return `<image x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="none" opacity="${it.op}" href="${o.exp ? a.src : a.url}"/>`;
}
function fondsLayerSVG() {
  let s = '';
  for (const it of doc.items) {
    if (it.kind !== 'fond' || !isVis(it)) continue;
    const a = ASSETS.get(it.img), lk = isLocked(it);
    s += `<g data-id="${it.id}" data-hit="item"${lk ? ' pointer-events="none"' : ''}>`;
    if (a) s += fondSVG(it, {});
    else s += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="#f1f3f5" stroke="#adb5bd" stroke-dasharray="8 5"/><text x="${r2(it.x + it.w / 2)}" y="${r2(it.y + it.h / 2)}" text-anchor="middle" font-size="${r2(Math.max(10, it.w / 40))}" fill="#868e96">Image du fond « ${esc(it.name)} » introuvable : réimportez-la</text>`;
    s += '</g>';
  }
  return s;
}

/* ----- Import d'un fond : PDF (1re page ou page choisie) ou image ----- */
const PDFJS = ['vendor/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'];
const PDFJS_W = ['vendor/pdf.worker.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'];
const FOND_MAX = 5000; /* côté maximal de l'image du fond, en pixels */
const isFondFile = f => /^(application\/pdf|image\/(png|jpeg|webp|gif|svg\+xml))$/.test(f.type) || /\.(pdf|png|jpe?g|webp|gif|svg)$/i.test(f.name || '');
const isPdfFile = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
async function pdfLib() {
  if (window.pdfjsLib) return window.pdfjsLib;
  for (let i = 0; i < PDFJS.length; i++) {
    try { await loadScript(PDFJS[i]); } catch (e) { continue; }
    if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_W[i]; return window.pdfjsLib; }
  }
  throw new Error('pdflib');
}
function canvasData(c) {
  const png = c.toDataURL('image/png'), jpg = c.toDataURL('image/jpeg', 0.86);
  return jpg.length < png.length * 0.8 ? jpg : png;
}
function choosePage(n) {
  return new Promise(res => {
    const sel = h('select', { class: 'inp' }, Array.from({ length: n }, (_, i) => h('option', { value: i + 1 }, 'Page ' + (i + 1))));
    const done = v => { closeModal(); res(v); };
    modal('Page du PDF à importer', F('Ce PDF a ' + n + ' pages', sel), [h('button', { class: 'btn ghost', type: 'button', onclick: () => done(null) }, 'Annuler'), h('button', { class: 'btn primary', type: 'button', onclick: () => done(+sel.value) }, 'Importer')]);
  });
}
async function pdfToImage(f) {
  const L = await pdfLib(), pdf = await L.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
  let n = 1; if (pdf.numPages > 1) { n = await choosePage(pdf.numPages); if (!n) return null; }
  toast('Lecture de la page ' + n + ' du PDF…');
  const page = await pdf.getPage(n), v1 = page.getViewport({ scale: 1 }), sc = Math.min(6, FOND_MAX / Math.max(v1.width, v1.height)), vp = page.getViewport({ scale: sc });
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, viewport: vp }).promise;
  const out = { src: canvasData(c), w: c.width, h: c.height }; c.width = c.height = 0; try { pdf.destroy(); } catch (e) { /* ignore */ }
  return out;
}
async function imageToData(f) {
  const src = await blobToURL(f);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = src; });
  let w = img.naturalWidth || 2000, hh = img.naturalHeight || 1400;
  if (IMG_DATA.test(src) && Math.max(w, hh) <= FOND_MAX) return { src, w, h: hh };
  const k = Math.min(1, FOND_MAX / Math.max(w, hh)); w = Math.round(w * k); hh = Math.round(hh * k);
  const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(img, 0, 0, w, hh);
  const out = { src: canvasData(c), w, h: hh }; c.width = c.height = 0; return out;
}
function fondLayer() {
  let L = doc.layers.find(l => l.name === 'Fond de plan');
  if (!L) { L = newLayer('Fond de plan'); doc.layers.unshift(L); }
  return L;
}
async function importFond(f, at) {
  if (!isFondFile(f)) { toast('Choisissez un PDF ou une image (PNG, JPEG).'); return; }
  toast('Import du fond de plan…');
  let r;
  try { r = isPdfFile(f) ? await pdfToImage(f) : await imageToData(f); }
  catch (e) { toast(e && e.message === 'pdflib' ? 'Le lecteur PDF n’a pas pu être chargé : importez le plan en image (PNG, JPEG).' : 'Ce fichier n’a pas pu être lu.'); return; }
  if (!r) return;
  const id = 'f' + uid() + uid(); if (!assetPut(id, r.src, r.w, r.h)) { toast('Ce fichier n’a pas pu être lu.'); return; }
  const rc = svg.getBoundingClientRect(), vw = rc.width / view.k, vh = rc.height / view.k, ratio = r.h / r.w;
  let W = Math.max(400, vw * 0.9); if (W * ratio > vh * 0.9) W = Math.max(400, vh * 0.9 / ratio);
  const c = at || toWorld(rc.left + rc.width / 2, rc.top + rc.height / 2), before = snapshot(), L = fondLayer();
  if (!L.show || L.lock) { L.show = true; L.lock = false; }
  const it = { id: uid(), kind: 'fond', img: id, name: String(f.name || 'Fond de plan').slice(0, 120), x: snap(c.x - W / 2), y: snap(c.y - W * ratio / 2), w: r2(W), h: r2(W * ratio), op: 0.5, lock: false, prt: true, cal: L.id };
  doc.items.unshift(it); commit(before); setTool('select'); setSel([it.id]);
  toast('Fond importé : placez-le et ajustez sa taille, puis verrouillez-le pour tracer dessus.');
}
function inspFond(it) {
  const a = ASSETS.get(it.img);
  IB.append(headNode('<svg viewBox="0 0 64 46"><rect x="8" y="7" width="48" height="32" fill="#f1f3f5" stroke="#868e96"/><path d="M12 33V18h14v8h14V12h12v21z" fill="none" stroke="#adb5bd" stroke-width="1.4"/><path d="M8 26H56" stroke="#f76707" stroke-width="2.2"/></svg>', 'Fond de plan', it.name + (a ? ' — ' + a.w + ' × ' + a.h + ' px' : ' — image introuvable')));
  const op = h('input', { type: 'range', min: 0.05, max: 1, step: 0.05, 'aria-label': 'Opacité du fond' }); op.value = it.op; live(op, () => { it.op = +op.value; });
  const ratio = it.h / it.w;
  IB.append(SEC(null,
    F('Opacité', op),
    h('div', { class: 'f' }, fCheck(() => it.lock, v => { it.lock = v; if (v) state.sel.delete(it.id); }, 'Verrouiller : le fond ne bouge plus, on trace dessus', buildInspector)),
    h('div', { class: 'f' }, fCheck(() => it.prt !== false, v => { it.prt = v; }, 'Imprimer le fond à l’export (PNG, SVG, PDF)')),
    F('Largeur sur le plan', fNum(() => Math.round(it.w), v => { const cx = it.x + it.w / 2, cy = it.y + it.h / 2; it.w = Math.max(50, v); it.h = r2(it.w * ratio); it.x = r2(cx - it.w / 2); it.y = r2(cy - it.h / 2); }, { min: 50, max: 100000, step: 10 })),
    h('p', { class: 'hint' }, 'Glissez le fond pour le placer, tirez un coin pour l’agrandir (les proportions sont gardées). Une fois calé, verrouillez-le : il ne se sélectionne plus et les clics passent aux tuyaux. Pour le déverrouiller : rubrique « Fonds de plan » du panneau, sans rien sélectionner.'),
    h('div', { class: 'btnrow' }, btn('Cadrer la vue sur le fond', () => fitBox(it)))));
  IB.append(actionsSec());
}
function fitBox(b) {
  const r = svg.getBoundingClientRect(), pad = 30, k = clamp(Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h), 0.15, 6);
  view.k = k; view.tx = r.width / 2 - (b.x + b.w / 2) * k; view.ty = r.height / 2 - (b.y + b.h / 2) * k; applyView();
}
function fondsSec() {
  const fonds = doc.items.filter(i => i.kind === 'fond'), list = h('div', { class: 'lys' });
  for (const it of fonds) {
    const tg = h('button', { class: 'btn sm ghost', type: 'button', title: it.lock ? 'Déverrouiller pour le déplacer' : 'Verrouiller pour tracer dessus', onclick: () => { const b = snapshot(); it.lock = !it.lock; if (it.lock) state.sel.delete(it.id); commit(b); buildInspector(); } }, it.lock ? 'Déverrouiller' : 'Verrouiller');
    const sel = h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { if (it.lock) { const b = snapshot(); it.lock = false; commit(b); } if (!isVis(it)) { const b = snapshot(); layerOf(it).show = true; commit(b); } setSel([it.id]); fitBox(it); } }, 'Régler');
    list.append(h('div', { class: 'fd' }, h('b', { title: it.name }, it.name + (isVis(it) ? '' : ' (calque masqué)')), h('div', { class: 'btnrow', style: 'margin:0' }, sel, tg)));
  }
  return SEC('Fonds de plan', h('p', { class: 'hint', style: 'margin:0 0 8px' }, fonds.length ? 'Plans importés sous le schéma. Verrouillés, ils ne gênent pas le tracé.' : 'Importez le plan d’un niveau (PDF ou image) et tracez vos réseaux dessus. Vous pouvez aussi déposer le fichier sur le plan.'),
    list, h('div', { class: 'btnrow', style: 'margin-top:8px' }, btn('Importer un fond de plan…', () => $('#fond-in').click())));
}

/* ----- Calques ----- */
function updateLayerBtn() { const L = (doc.layers || []).find(l => l.id === state.layer), n = $('#ly-name'); if (n) n.textContent = L ? L.name : 'Calque'; }
function dropHiddenSel() { for (const id of [...state.sel]) { const it = byId(id); if (!it || !editable(it)) state.sel.delete(id); } }
function setActiveLayer(id) {
  const L = doc.layers.find(l => l.id === id); if (!L) return;
  state.layer = id;
  if (L.show === false || L.lock) { const b = snapshot(); L.show = true; L.lock = false; commit(b); } else render();
  updateLayerBtn(); if (!state.sel.size) buildInspector();
  toast('Calque actif : ' + L.name + '. Les nouveaux éléments y sont placés.');
}
function setLayerProp(L, k, v) {
  const b = snapshot(); L[k] = v;
  if ((k === 'show' && !v) || (k === 'lock' && v)) {
    dropHiddenSel();
    if (L.id === state.layer) { const o = doc.layers.find(l => l.show !== false && !l.lock); if (o) state.layer = o.id; }
  }
  commit(b); buildInspector();
}
function addLayer() { const b = snapshot(), L = newLayer('Calque ' + (doc.layers.length + 1)); doc.layers.push(L); state.layer = L.id; commit(b); buildInspector(); setTimeout(() => { const i = IB.querySelector('[data-ly="' + L.id + '"]'); if (i) { i.focus(); i.select(); } }, 30); }
function delLayer(L) {
  if (doc.layers.length <= 1) { toast('Il faut au moins un calque.'); return; }
  const its = doc.items.filter(i => layerOf(i) === L), other = doc.layers.find(l => l !== L);
  const run = keep => { const b = snapshot(); if (keep) for (const i of its) i.cal = other.id; else { const ids = new Set(its.map(i => i.id)); doc.items = doc.items.filter(i => !ids.has(i.id)); for (const id of ids) state.sel.delete(id); } doc.layers = doc.layers.filter(l => l !== L); if (state.layer === L.id) state.layer = other.id; commit(b); closeModal(); buildInspector(); };
  if (!its.length) { run(true); return; }
  modal('Supprimer le calque « ' + L.name + ' »', h('p', null, 'Ce calque contient ' + its.length + ' élément' + (its.length > 1 ? 's' : '') + '.'),
    [h('button', { class: 'btn ghost', type: 'button', onclick: closeModal }, 'Annuler'), h('button', { class: 'btn ghost', type: 'button', onclick: () => run(true) }, 'Les déplacer vers « ' + other.name + ' »'), h('button', { class: 'btn primary', type: 'button', onclick: () => run(false) }, 'Les supprimer aussi')]);
}
/* Un calque par réseau tracé ; chaque symbole rejoint le calque du réseau qui le traverse */
function layersPerNet() {
  const ps = doc.items.filter(i => i.kind === 'pipe'); if (!ps.length) { toast('Aucun tuyau tracé pour l’instant.'); return; }
  const b = snapshot(), byNet = new Map(); let made = 0;
  for (const p of ps) {
    if (!byNet.has(p.net)) { const name = netLabel(netOf(p.net)).slice(0, 40); let L = doc.layers.find(l => l.name === name); if (!L) { L = newLayer(name); doc.layers.push(L); made++; } byNet.set(p.net, L); }
    p.cal = byNet.get(p.net).id;
  }
  for (const el of doc.items.filter(i => i.kind === 'el')) { for (const q of portsW(el)) { const p = ps.find(o => onPoly(q, o.pts)); if (p) { el.cal = byNet.get(p.net).id; break; } } }
  commit(b); buildInspector(); toast(byNet.size + ' réseau' + (byNet.size > 1 ? 'x rangés chacun' : ' rangé') + ' dans son calque' + (made ? ' (' + made + ' créé' + (made > 1 ? 's' : '') + ')' : '') + '. Les symboles suivent le réseau qui les traverse.');
}
function layerRow(L) {
  const on = L.id === state.layer, shown = L.show !== false, n = doc.items.filter(i => layerOf(i) === L).length;
  const tg = (svgS, title, fn, cls) => h('button', { class: 'tg' + (cls ? ' ' + cls : ''), type: 'button', title, 'aria-label': title, onclick: fn, html: svgS });
  const nm = h('input', { class: 'inp', type: 'text', maxlength: 40, 'aria-label': 'Nom du calque', 'data-ly': L.id }); nm.value = L.name; live(nm, () => { L.name = nm.value; }, updateLayerBtn);
  return h('div', { class: 'ly' + (on ? ' on' : '') },
    tg(on ? DOT_ON : DOT_OFF, on ? 'Calque actif' : 'Rendre actif (les nouveaux éléments y vont)', () => setActiveLayer(L.id), on ? 'act' : ''),
    tg(shown ? EYE_ON : EYE_OFF, shown ? 'Masquer le calque' : 'Afficher le calque', () => setLayerProp(L, 'show', !shown), shown ? '' : 'off'),
    tg(L.lock ? LOCK_ON : LOCK_OFF, L.lock ? 'Déverrouiller' : 'Verrouiller (visible, mais plus modifiable)', () => setLayerProp(L, 'lock', !L.lock), L.lock ? 'act' : ''),
    nm, h('span', { class: 'n', title: n + ' élément' + (n > 1 ? 's' : '') }, String(n)),
    h('button', { class: 'tg', type: 'button', title: 'Supprimer le calque', 'aria-label': 'Supprimer le calque', onclick: () => delLayer(L) }, '✕'));
}
function layersSec() {
  const list = h('div', { class: 'lys' }); for (const L of doc.layers) list.append(layerRow(L));
  return SEC('Calques', h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Le calque actif (pastille pleine) reçoit ce que vous tracez et posez. L’œil masque un calque (écran et export), le cadenas le fige.'), list,
    h('div', { class: 'btnrow', style: 'margin-top:8px' }, btn('Ajouter un calque', addLayer), btn('Un calque par réseau', layersPerNet)));
}
function layerMenu(a) {
  openMenu(a, [{ head: 'Calque actif' }].concat(doc.layers.map(L => ({ label: L.name + (L.show === false ? ' (masqué)' : L.lock ? ' (verrouillé)' : ''), on: L.id === state.layer, run: () => setActiveLayer(L.id) })),
    ['-', { label: 'Nouveau calque', run: () => { setSel([]); addLayer(); } }, { label: 'Gérer les calques…', run: () => { setSel([]); app.classList.add('show-insp'); app.classList.remove('show-pal'); const s = [...IB.querySelectorAll('h3')].find(x => x.textContent === 'Calques'); if (s) s.scrollIntoView({ block: 'start' }); } }]), 'ly');
}
function layerField(items) {
  if (!items || !items.length || (doc.layers || []).length <= 1) return null;
  const cur = new Set(items.map(i => layerOf(i).id)), mixed = cur.size > 1;
  return F('Calque', fSelect((mixed ? [['', 'Plusieurs calques']] : []).concat(doc.layers.map(L => [L.id, L.name + (L.show === false ? ' (masqué)' : L.lock ? ' (verrouillé)' : '')])), () => mixed ? '' : [...cur][0], v => { if (v) for (const i of items) i.cal = v; }, () => { dropHiddenSel(); buildInspector(); render(); }));
}

/* ----- Circuits : estomper ou isoler la partie d'un réseau où le fluide peut aller -----
   Un circuit, ce sont les tuyaux d'un même réseau reliés bout à bout, par un piquage ou à travers un équipement.
   Une vanne normalement fermée l'arrête, même posée sur un tuyau continu : le tuyau est alors coupé en morceaux. */
const isClosedEl = el => !!(el.p && el.p.nf === true);
function arcPos(pts, q) {
  let s = 0, best = null;
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y), r = distPtSeg(q, a, b); if (!best || r.d < best.d) best = { d: r.d, s: s + r.t * L }; s += L; }
  return best || { d: 0, s: 0 };
}
const polyLen = pts => { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); return L; };
function subPoly(pts, s0, s1) {
  const out = []; let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L > 0 && s1 >= s && s0 <= s + L) { const u0 = clamp((s0 - s) / L, 0, 1), u1 = clamp((s1 - s) / L, 0, 1), P = u => ({ x: r2(a.x + (b.x - a.x) * u), y: r2(a.y + (b.y - a.y) * u) }); if (!out.length) out.push(P(u0)); const q = P(u1); if (!near(out[out.length - 1], q, 0.01)) out.push(q); }
    s += L;
  }
  return out;
}
function buildCircuits() {
  const ps = pipes(), all = els(), closed = all.filter(isClosedEl), pieces = [], byPipe = new Map();
  for (const p of ps) {
    const L = polyLen(p.pts), cuts = [];
    for (const v of closed) { if (!onPoly(v, p.pts, 1)) continue; const a = arcPos(p.pts, v); if (a.s > 0.5 && a.s < L - 0.5) cuts.push(a.s); }
    cuts.sort((x, y) => x - y);
    const bd = [0, ...cuts, L], list = [];
    for (let k = 0; k < bd.length - 1; k++) { const pc = { i: pieces.length, p, k, pts: cuts.length ? subPoly(p.pts, bd[k], bd[k + 1]) : p.pts }; pieces.push(pc); list.push(pc); }
    byPipe.set(p.id, { cuts, list });
  }
  const par = pieces.map((_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const adj = pieces.map(() => []), uni = (x, y) => { if (x !== y) { adj[x].push(y); adj[y].push(x); } x = find(x); y = find(y); if (x !== y) par[x] = y; };
  const pieceAt = (p, q) => { const B = byPipe.get(p.id); if (!B) return null; if (!B.cuts.length) return B.list[0]; const a = arcPos(p.pts, q); let k = 0; while (k < B.cuts.length && a.s > B.cuts[k]) k++; return B.list[k]; };
  /* Bouts communs et piquages, entre tuyaux du même réseau */
  for (const p of ps) for (const q of [p.pts[0], p.pts[p.pts.length - 1]]) {
    const me = pieceAt(p, q);
    for (const o of ps) if (o !== p && o.net === p.net && onPoly(q, o.pts)) uni(me.i, pieceAt(o, q).i);
  }
  /* À travers un équipement ouvert (pompe, vanne ouverte, collecteur…) : tuyaux du même réseau raccordés à ses points */
  for (const el of all) {
    if (isClosedEl(el)) continue; const touch = [];
    for (const q of portsW(el)) for (const p of ps) if (onPoly(q, p.pts)) touch.push({ net: p.net, pc: pieceAt(p, q) });
    for (let x = 0; x < touch.length; x++) for (let y = x + 1; y < touch.length; y++) if (touch[x].net === touch[y].net) uni(touch[x].pc.i, touch[y].pc.i);
  }
  return { pieces, byPipe, find, pieceAt, adj };
}
const seedPiece = (G, sd) => { const p = sd && byId(sd.p); return p && p.kind === 'pipe' && G.byPipe.has(p.id) ? G.pieceAt(p, sd) : null; };
/* Groupe d'un morceau de tuyau : le circuit défini à la main, sinon le chemin du fluide */
const circuitOf = p => p && p.ci ? (doc.circuits || []).find(c => c.id === p.ci) || null : null;
const keyOf = (G, pc) => { const c = circuitOf(pc.p); return c ? 'c:' + c.id : 'r:' + G.find(pc.i); };
const seedKey = (G, sd) => { if (!sd) return null; if (sd.c) return (doc.circuits || []).some(c => c.id === sd.c) ? 'c:' + sd.c : null; const pc = seedPiece(G, sd); return pc ? keyOf(G, pc) : null; };
/* État d'affichage des circuits, ou null s'il n'y a rien d'estompé ni d'isolé */
function circState() {
  const c = doc.opts && doc.opts.circ; if (!c || (!(c.dim || []).length && !c.iso)) return null;
  const G = buildCircuits(), dimK = new Set();
  for (const sd of c.dim || []) { const k = seedKey(G, sd); if (k) dimK.add(k); }
  const isoK = c.iso ? seedKey(G, c.iso) : null;
  if (!dimK.size && !isoK) return null;
  return { G, isoK, dimK, dimmed: pc => { if (!pc) return false; const k = keyOf(G, pc); return dimK.has(k) || (!!isoK && k !== isoK); } };
}
const circOpts = () => doc.opts.circ || (doc.opts.circ = { dim: [], iso: null });
const anyCirc = () => { const c = doc.opts.circ; return !!(c && ((c.dim || []).length || c.iso)); };
function pickPipe(w) {
  const R = 7 / view.k; let best = null;
  for (const p of pipes()) { const hw = netOf(p.net).w / 2; for (let i = 0; i < p.pts.length - 1; i++) { const r = distPtSeg(w, p.pts[i], p.pts[i + 1]), d = r.d - hw; if (d <= R && (!best || d < best.d)) best = { d, p, q: { x: r2(r.x), y: r2(r.y) } }; } }
  return best;
}
/* Isoler / estomper un groupe désigné par sa clé (sd : graine enregistrée, c ou p+x+y) */
function applyCirc(mode, G, k, sd, lab) {
  const c = circOpts(), b = snapshot(); let msg;
  c.dim = (c.dim || []).filter(x => seedKey(G, x)); if (c.iso && !seedKey(G, c.iso)) c.iso = null;
  if (mode === 'iso') {
    if (c.iso && seedKey(G, c.iso) === k) { c.iso = null; msg = 'Isolement annulé : tout est réaffiché.'; }
    else { c.iso = sd; c.dim = c.dim.filter(x => seedKey(G, x) !== k); msg = 'Isolé : ' + lab + '. Le reste est estompé. Recliquez dessus pour tout réafficher.'; }
  } else {
    const n0 = c.dim.length; c.dim = c.dim.filter(x => seedKey(G, x) !== k);
    if (c.dim.length === n0) { c.dim.push(sd); msg = 'Estompé : ' + lab + '. Recliquez dessus pour le réafficher.'; } else msg = 'Réaffiché : ' + lab + '.';
  }
  commit(b); if (!state.sel.size) buildInspector(); toast(msg);
}
const circLabel = (G, k, p) => { const c = circuitOf(p); const n = c ? doc.items.filter(i => i.kind === 'pipe' && i.ci === c.id).length : new Set(G.pieces.filter(x => keyOf(G, x) === k).map(x => x.p.id)).size; return (c ? 'circuit « ' + c.name + ' »' : 'circuit ' + netLabel(netOf(p.net))) + ' — ' + n + ' tuyau' + (n > 1 ? 'x' : ''); };
/* Clic avec l'outil Estomper (mode 'dim') ou Isoler (mode 'iso') : circuit défini du tuyau, sinon chemin du fluide */
function circDown(e, w, mode) {
  const hit = pickPipe(w), c = circOpts();
  if (!hit) {
    if (mode === 'iso' && c.iso) { const b = snapshot(); c.iso = null; commit(b); if (!state.sel.size) buildInspector(); toast('Isolement annulé : tout est réaffiché.'); }
    else toast(mode === 'iso' ? 'Cliquez sur un tuyau pour isoler son circuit.' : 'Cliquez sur un tuyau pour estomper son circuit, ou pour le réafficher.');
    return;
  }
  const G = buildCircuits(), pc = G.pieceAt(hit.p, hit.q), k = keyOf(G, pc), ci = circuitOf(hit.p);
  applyCirc(mode, G, k, ci ? { c: ci.id } : { p: hit.p.id, x: hit.q.x, y: hit.q.y }, circLabel(G, k, hit.p));
}
const dimDown = (e, w) => circDown(e, w, 'dim');
const isoDown = (e, w) => circDown(e, w, 'iso');
function circPanel(mode, C) { const G = buildCircuits(); applyCirc(mode, G, 'c:' + C.id, { c: C.id }, circLabel(G, 'c:' + C.id, { ci: C.id })); }

/* ----- Circuits définis à la main (départs d'une nourrice, colonnes…) ----- */
const CI_COLORS = ['#e8590c', '#1971c2', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#c2255c', '#5c940d', '#495057', '#d6336c'];
const activeCircuit = () => { const L = doc.circuits || []; return L.find(c => c.id === state.circ) || L[0] || null; };
function newCircuit(name) {
  if (!doc.circuits) doc.circuits = [];
  const C = { id: 'k' + uid(), name: name || 'Circuit ' + (doc.circuits.length + 1), color: CI_COLORS[doc.circuits.length % CI_COLORS.length] };
  doc.circuits.push(C); state.circ = C.id; return C;
}
function addCircuit() { const b = snapshot(), C = newCircuit(); commit(b); buildInspector(); setTimeout(() => { const i = IB.querySelector('[data-ci="' + C.id + '"]'); if (i) { i.focus(); i.select(); } }, 30); return C; }
function delCircuit(C) {
  const b = snapshot(); for (const p of doc.items) if (p.kind === 'pipe' && p.ci === C.id) p.ci = '';
  doc.circuits = doc.circuits.filter(x => x !== C); const c = circOpts(); c.dim = (c.dim || []).filter(x => x.c !== C.id); if (c.iso && c.iso.c === C.id) c.iso = null;
  commit(b); buildInspector();
}
function setActiveCircuit(id) { state.circ = id; if (!state.sel.size) buildInspector(); renderUI(); const C = activeCircuit(); if (C) toast('Circuit actif : ' + C.name + '. Outil Circuits (C) : clic pour ajouter ou retirer un tuyau, Maj+clic pour toute la branche.'); }
/* Outil Circuits : clic = ajouter / retirer le tuyau ; Maj+clic = toute la branche, sans passer par les tuyaux
   d'un autre circuit ni par une vanne fermée */
function defDown(e, w) {
  const hit = pickPipe(w); if (!hit) { toast('Cliquez sur un tuyau pour le ranger dans le circuit actif (Maj+clic : toute la branche).'); return; }
  const b = snapshot(); let C = activeCircuit(); if (!C) C = newCircuit();
  let msg;
  if (e.shiftKey) {
    const G = buildCircuits(), start = G.pieceAt(hit.p, hit.q), seen = new Set([start.i]), Q = [start], got = new Set();
    while (Q.length) { const pc = Q.shift(); got.add(pc.p); for (const j of G.adj[pc.i]) { if (seen.has(j)) continue; const nb = G.pieces[j]; seen.add(j); if (nb.p.ci && nb.p.ci !== C.id && circuitOf(nb.p)) continue; Q.push(nb); } }
    let n = 0; for (const p of got) if (p.ci !== C.id) { p.ci = C.id; n++; }
    msg = n ? n + ' tuyau' + (n > 1 ? 'x ajoutés' : ' ajouté') + ' à « ' + C.name + ' » (branche jusqu’aux autres circuits et aux vannes fermées).' : 'Cette branche est déjà dans « ' + C.name + ' ».';
  } else if (hit.p.ci === C.id) { hit.p.ci = ''; msg = 'Tuyau retiré de « ' + C.name + ' ».'; }
  else { const o = circuitOf(hit.p); hit.p.ci = C.id; msg = 'Tuyau ' + (o ? 'déplacé de « ' + o.name + ' » vers' : 'ajouté à') + ' « ' + C.name + ' ».'; }
  commit(b); if (!state.sel.size) buildInspector(); toast(msg);
}
/* Halo des circuits pendant leur définition (couche d'interface) */
function circHalosSVG() {
  if (state.tool !== 'def' || !(doc.circuits || []).length) return '';
  const A = activeCircuit(); let s = '';
  for (const p of pipes()) { const C = circuitOf(p); if (!C) continue; const on = A && C.id === A.id; s += `<path d="${polyD(p.pts)}" fill="none" stroke="${isHex(C.color) ? C.color : '#495057'}" stroke-opacity="${on ? 0.5 : 0.2}" stroke-width="${r2(netOf(p.net).w + (on ? 9 : 6))}" stroke-linejoin="round" stroke-linecap="round"/>`; }
  return s;
}
const ISO_ICO = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg>';
function circuitRow(C) {
  const on = activeCircuit() === C, n = doc.items.filter(i => i.kind === 'pipe' && i.ci === C.id).length, c = doc.opts.circ || {};
  const isIso = !!(c.iso && c.iso.c === C.id), isDim = (c.dim || []).some(x => x.c === C.id);
  const tg = (svgS, title, fn, cls) => h('button', { class: 'tg' + (cls ? ' ' + cls : ''), type: 'button', title, 'aria-label': title, onclick: fn, html: svgS });
  const nm = h('input', { class: 'inp', type: 'text', maxlength: 40, 'aria-label': 'Nom du circuit', 'data-ci': C.id }); nm.value = C.name; live(nm, () => { C.name = nm.value; });
  const col = h('input', { type: 'color', 'aria-label': 'Couleur du circuit' }); col.value = isHex(C.color) ? C.color : '#495057'; live(col, () => { C.color = col.value; });
  return h('div', { class: 'ci' + (on ? ' on' : '') },
    tg(on ? DOT_ON : DOT_OFF, on ? 'Circuit actif' : 'Rendre actif (outil Circuits)', () => setActiveCircuit(C.id), on ? 'act' : ''), col, nm,
    h('span', { class: 'n', title: n + ' tuyau' + (n > 1 ? 'x' : '') }, String(n)),
    tg(ISO_ICO, isIso ? 'Annuler l’isolement' : 'Isoler ce circuit', () => circPanel('iso', C), isIso ? 'act' : ''),
    tg(isDim ? EYE_OFF : EYE_ON, isDim ? 'Réafficher ce circuit' : 'Estomper ce circuit', () => circPanel('dim', C), isDim ? 'off' : ''),
    h('button', { class: 'tg', type: 'button', title: 'Supprimer le circuit (ses tuyaux restent)', 'aria-label': 'Supprimer le circuit', onclick: () => delCircuit(C) }, '✕'));
}
/* Coupe chaque tuyau aux piquages qu'il reçoit : un tronçon par portion entre deux tés */
function splitAtTees() {
  const ps = doc.items.filter(i => i.kind === 'pipe' && editable(i)), b = snapshot(); let made = 0;
  for (const p of ps) {
    const L = polyLen(p.pts), cuts = [];
    for (const o of doc.items) {
      if (o.kind !== 'pipe' || o === p || !isVis(o)) continue;
      for (const q of [o.pts[0], o.pts[o.pts.length - 1]]) {
        if (!onPoly(q, p.pts) || near(q, p.pts[0]) || near(q, p.pts[p.pts.length - 1])) continue;
        const a = arcPos(p.pts, q); if (a.s > 1 && a.s < L - 1 && !cuts.some(c => Math.abs(c - a.s) < 1)) cuts.push(a.s);
      }
    }
    if (!cuts.length) continue;
    cuts.sort((x, y) => x - y); const bd = [0, ...cuts, L], parts = [];
    for (let k = 0; k < bd.length - 1; k++) { const pts = simplify(subPoly(p.pts, bd[k], bd[k + 1])); if (pts.length >= 2) parts.push(pts); }
    if (parts.length < 2) continue;
    p.pts = parts[0]; let at = doc.items.indexOf(p);
    for (const pts of parts.slice(1)) { doc.items.splice(++at, 0, Object.assign(clone(p), { id: uid(), pts, lab: false })); made++; }
  }
  if (!made) { toast('Aucun tuyau à découper : chaque tuyau va déjà d’un té au suivant.'); return; }
  commit(b); if (!state.sel.size) buildInspector();
  toast(made + ' tronçon' + (made > 1 ? 's' : '') + ' de plus : chaque tuyau va maintenant d’un té au suivant. Annulable (Ctrl+Z).');
}
function circuitsSec() {
  const list = h('div', { class: 'lys' }); for (const C of doc.circuits || []) list.append(circuitRow(C));
  return SEC('Circuits', h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Découpez l’installation en circuits (départs d’une nourrice, colonnes…). Outil Circuits (C) : clic sur un tuyau pour le ranger dans le circuit actif ou l’en retirer, Maj+clic pour toute la branche. Si un tuyau va d’un départ à l’autre, « Découper en tronçons » le coupe à chaque té (ou les ciseaux, X, à un endroit précis). Rangez d’abord la nourrice dans son propre circuit : les branches s’arrêtent aux tuyaux d’un autre circuit et aux vannes fermées. Isoler et Estomper agissent ensuite sur ces circuits.'),
    list, h('div', { class: 'btnrow', style: 'margin-top:8px' }, btn('Nouveau circuit', () => { addCircuit(); setTool('def'); }), btn('Définir les circuits (C)', () => setTool(state.tool === 'def' ? 'select' : 'def')), btn('Découper en tronçons', splitAtTees, '', 'Coupe chaque tuyau à chaque piquage (té) pour pouvoir ranger chaque tronçon dans son circuit'), anyCirc() ? btn('Tout réafficher', undimAll) : null));
}
function circuitField(ps, multi) {
  const L = doc.circuits || [], cur = new Set(ps.map(p => p.ci || '')), mixed = cur.size > 1;
  const opts = (multi ? [['*', mixed ? 'Plusieurs (inchangé)' : 'Inchangé']] : []).concat([['', 'Aucun']], L.map(c => [c.id, c.name]), [['+', 'Nouveau circuit…']]);
  return F('Circuit', fSelect(opts, () => multi ? '*' : (ps[0].ci && L.some(c => c.id === ps[0].ci) ? ps[0].ci : ''), v => { if (v === '*') return; let id = v; if (v === '+') id = newCircuit().id; for (const p of ps) p.ci = id; }, buildInspector));
}

/* Œil du panneau : tout un réseau (tous ses circuits) */
function toggleDim(id) {
  const b = snapshot(), d = doc.opts.dim || (doc.opts.dim = []), i = d.indexOf(id);
  if (i >= 0) d.splice(i, 1); else d.push(id);
  commit(b); if (!state.sel.size) buildInspector();
}
function undimAll() { const b = snapshot(); doc.opts.dim = []; doc.opts.circ = { dim: [], iso: null }; commit(b); buildInspector(); toast('Tout est réaffiché.'); }

/* ----- Ciseaux : couper un tuyau en deux tronçons ----- */
function cutDown(e, w) {
  const R = 8 / view.k; let best = null;
  for (const p of pipes()) { if (!editable(p)) continue; const hw = netOf(p.net).w / 2; for (let i = 0; i < p.pts.length - 1; i++) { const r = distPtSeg(w, p.pts[i], p.pts[i + 1]); if (r.d <= R + hw && (!best || r.d < best.r.d)) best = { p, i, r }; } }
  if (!best) { toast('Cliquez sur un tuyau, à l’endroit où le couper.'); return; }
  const { p, i, r } = best, a = p.pts[i], b = p.pts[i + 1], sd = segDir(a, b), n = p.pts.length;
  let q = sd === 'h' ? { x: snap(r.x), y: a.y } : sd === 'v' ? { x: a.x, y: snap(r.y) } : { x: r2(r.x), y: r2(r.y) };
  if (sd === 'h') q.x = clamp(q.x, Math.min(a.x, b.x), Math.max(a.x, b.x)); else if (sd === 'v') q.y = clamp(q.y, Math.min(a.y, b.y), Math.max(a.y, b.y));
  if ((i === 0 && near(q, a)) || (i + 1 === n - 1 && near(q, b))) q = { x: r2(r.x), y: r2(r.y) };
  const first = simplify(p.pts.slice(0, i + 1).concat([q])), second = simplify([q].concat(p.pts.slice(i + 1)));
  if (first.length < 2 || second.length < 2 || near(first[0], first[first.length - 1]) || near(second[0], second[second.length - 1])) { toast('Coupez un peu plus loin de l’extrémité du tuyau.'); return; }
  const before = snapshot(), np = Object.assign(clone(p), { id: uid(), pts: second, lab: false });
  p.pts = first; doc.items.splice(doc.items.indexOf(p) + 1, 0, np); commit(before);
  toast('Tuyau coupé en deux tronçons. Sélectionnez-en un (V) pour lui donner son état.');
}

/* ----- États des tronçons ----- */
const ETAT_DASH = [['', 'Trait du réseau'], ['solid', 'Continu'], ['dash', 'Tirets'], ['dot', 'Pointillé'], ['dashdot', 'Mixte']];
function etatRow(e, n) {
  const smp = h('span', { class: 'smp', html: `<svg viewBox="0 0 52 24" width="52" height="24" aria-hidden="true">${etatSample(e, 7, 45, 12)}</svg>` });
  const nm = h('input', { class: 'inp', type: 'text', maxlength: 40, 'aria-label': 'Nom de l’état' }); nm.value = e.name; live(nm, () => { e.name = nm.value; });
  const ck = h('input', { type: 'checkbox' }); ck.checked = isHex(e.hl);
  const col = h('input', { type: 'color', 'aria-label': 'Couleur du surlignage' }); col.value = isHex(e.hl) ? e.hl : '#ffd43b';
  const setHl = () => { const b = snapshot(); e.hl = ck.checked ? col.value : ''; commit(b); buildInspector(); };
  ck.addEventListener('change', setHl); col.addEventListener('change', () => { ck.checked = true; setHl(); });
  return h('div', { class: 'et' }, smp, nm, h('button', { class: 'tg btn sm ghost', type: 'button', title: 'Supprimer cet état', onclick: () => delEtat(e) }, '✕'),
    h('div', { class: 'opts' }, h('label', { class: 'chk' }, ck, h('span', null, 'Surligner')), col,
      fSelect(ETAT_DASH, () => e.dash || '', v => { e.dash = v; }, buildInspector),
      fCheck(() => e.x, v => { e.x = v; }, 'Croix', buildInspector), fCheck(() => e.fade, v => { e.fade = v; }, 'Estompé', buildInspector),
      h('span', { class: 'hint', style: 'margin:0' }, n ? n + ' tronçon' + (n > 1 ? 's' : '') : 'inutilisé')));
}
function delEtat(e) { const b = snapshot(); for (const p of doc.items) if (p.kind === 'pipe' && p.et === e.id) p.et = ''; doc.etats = doc.etats.filter(x => x !== e); commit(b); buildInspector(); }
function addEtat() { const b = snapshot(); doc.etats.push({ id: 'e' + uid(), name: 'Nouvel état', hl: '#ffd43b', dash: '', x: false, fade: false }); commit(b); buildInspector(); }
function etatsSec() {
  const cnt = {}; for (const p of doc.items) if (p.kind === 'pipe' && p.et) cnt[p.et] = (cnt[p.et] || 0) + 1;
  const list = h('div', { class: 'ets' }); for (const e of doc.etats || []) list.append(etatRow(e, cnt[e.id] || 0));
  return SEC('États des tronçons', h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Sélectionnez un ou plusieurs tuyaux et choisissez leur état. Les ciseaux (X) coupent un tuyau pour n’en marquer qu’une partie. Les états utilisés s’ajoutent à la légende.'),
    list, h('div', { class: 'btnrow', style: 'margin-top:8px' }, btn('Ajouter un état', addEtat)));
}
