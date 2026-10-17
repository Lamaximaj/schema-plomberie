
/* ===== Fichiers : ouvrir, enregistrer dans un dossier, exports rouvrables, application hors connexion =====
   - Chaque export (SVG, PNG, PDF) porte les données du schéma : Fichier > Ouvrir le rouvre modifiable.
   - Avec Chrome ou Edge sur ordinateur, « Enregistrer » écrit directement dans le dossier choisi (NAS, OneDrive…) et
     Ctrl+S réécrit le même fichier. Ailleurs (Safari, Firefox, page dans claude.ai), on télécharge comme avant.
   - Sur le site, un service worker garde la page et ses bibliothèques pour travailler hors connexion. */

const DATA_FMT = 'schema-plomberie/schema', DATA_KEY = 'schema-plomberie', SVG_DATA_ID = 'schema-plomberie-donnees';
const PDF_MARK = ['SCHEMA-PLOMBERIE:', ':FIN'];
/* Accès direct aux fichiers : fenêtre principale seulement (refusé dans un cadre, comme sur claude.ai) */
const FSA = typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function' && !!window.isSecureContext && window.self === window.top;
const FTYPES = {
  json: { description: 'Schéma modifiable (.json)', accept: { 'application/json': ['.json'] } },
  svg: { description: 'Dessin SVG, se rouvre dans l’outil (.svg)', accept: { 'image/svg+xml': ['.svg'] } },
  pdf: { description: 'PDF, se rouvre dans l’outil (.pdf)', accept: { 'application/pdf': ['.pdf'] } },
  png: { description: 'Image PNG, se rouvre dans l’outil (.png)', accept: { 'image/png': ['.png'] } },
  open: { description: 'Schémas (JSON, SVG, PDF, PNG)', accept: { 'application/json': ['.json'], 'image/svg+xml': ['.svg'], 'application/pdf': ['.pdf'], 'image/png': ['.png'] } },
};
const fmtOfName = n => { const m = /\.(json|svg|pdf|png)$/i.exec(n || ''); return m ? m[1].toLowerCase() : null; };
const docHash = () => sigHash(snapshot());

/* ----- Données intégrées aux exports ----- */
const payload = extra => JSON.stringify(Object.assign({ format: DATA_FMT, v: 1, doc }, extra || {}));
const fromPayload = o => o && o.format === DATA_FMT && o.doc && Array.isArray(o.doc.items) ? { doc: o.doc, exp: o.exp || null } : o && Array.isArray(o.items) && Array.isArray(o.nets) ? { doc: o, exp: null } : null;
function svgWithData(svg, json) { const i = svg.indexOf('>', svg.indexOf('<svg')); return svg.slice(0, i + 1) + `<metadata id="${SVG_DATA_ID}">${esc(json)}</metadata>` + svg.slice(i + 1); }
function svgData(text) {
  const d = new DOMParser().parseFromString(text, 'image/svg+xml'), m = d.querySelector('[id="' + SVG_DATA_ID + '"]');
  if (!m) return null; try { return fromPayload(JSON.parse(m.textContent)); } catch (e) { return null; }
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u, a, b) { let c = 0xffffffff; for (let i = a; i < b; i++) c = CRC_T[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
/* PNG : bloc de texte iTXt « schema-plomberie » (UTF-8, non compressé) inséré avant la fin de l'image */
async function pngWithData(blob, json) {
  const src = new Uint8Array(await blob.arrayBuffer()), key = new TextEncoder().encode(DATA_KEY), txt = new TextEncoder().encode(json);
  const body = new Uint8Array(key.length + 5 + txt.length); body.set(key, 0); body.set(txt, key.length + 5);
  const ch = new Uint8Array(12 + body.length), dv = new DataView(ch.buffer);
  dv.setUint32(0, body.length); ch.set([105, 84, 88, 116], 4); ch.set(body, 8); dv.setUint32(8 + body.length, crc32(ch, 4, 8 + body.length));
  let p = 8, end = src.length; const sv = new DataView(src.buffer, src.byteOffset, src.byteLength);
  while (p + 8 <= src.length) { const len = sv.getUint32(p); if (String.fromCharCode(src[p + 4], src[p + 5], src[p + 6], src[p + 7]) === 'IEND') { end = p; break; } p += 12 + len; }
  return new Blob([src.subarray(0, end), ch, src.subarray(end)], { type: 'image/png' });
}
async function pngData(u) {
  if (u.length < 8 || u[0] !== 0x89 || u[1] !== 0x50) return null;
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = 8;
  while (p + 8 <= u.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]), s = p + 8, e = s + len;
    if (e > u.length) break;
    if (type === 'iTXt') {
      let k = s; while (k < e && u[k]) k++;
      if (new TextDecoder().decode(u.subarray(s, k)) === DATA_KEY) {
        const comp = u[k + 1]; let q = k + 3; while (q < e && u[q]) q++; q++; while (q < e && u[q]) q++; q++;
        let data = u.subarray(q, e);
        if (comp) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
        try { return fromPayload(JSON.parse(new TextDecoder().decode(data))); } catch (err) { return null; }
      }
    }
    if (type === 'IEND') break;
    p = e + 4;
  }
  return null;
}
/* PDF : données en base64 dans les métadonnées XMP, flux non compressé (jsPDF addMetadata) */
function pdfAddData(pdf, json) { if (typeof pdf.addMetadata === 'function') pdf.addMetadata(PDF_MARK[0] + abToB64(new TextEncoder().encode(json)) + PDF_MARK[1], 'urn:schema-plomberie'); }
function pdfData(u) {
  const s = new TextDecoder('latin1').decode(u), m = new RegExp(PDF_MARK[0] + '([A-Za-z0-9+/=]+)' + PDF_MARK[1]).exec(s);
  if (!m) return null;
  try { const b = atob(m[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return fromPayload(JSON.parse(new TextDecoder().decode(a))); } catch (e) { return null; }
}

/* ----- Contenu des fichiers, par format ----- */
function svgFileText() { const e = buildExport(); return e ? '<?xml version="1.0" encoding="UTF-8"?>\n' + svgWithData(e.svg, payload()) : null; }
async function pngFileBlob() {
  const e = buildExport(); if (!e) return null;
  return pngWithData(await svgToPng(e.svg, e.w, e.h, clamp(Math.sqrt(16e6 / (e.w * e.h)), 1, 4)), payload());
}
const jsonFileText = () => JSON.stringify(doc, null, 1);
const pdfDefaultFmt = () => (pageOn() && doc.opts.page.fmt) || 'a3';
async function fileData(fmt, pdfFmt) {
  if (fmt === 'json') return jsonFileText();
  if (fmt === 'svg') return svgFileText();
  if (fmt === 'png') return pngFileBlob();
  if (fmt === 'pdf') return pdfBlob(pdfFmt || pdfDefaultFmt());
  return null;
}

/* ----- Lien du schéma ouvert : fichier du disque (state.file), projet de Mes projets (state.libId) ----- */
state.file = null; state.fileHash = null; state.libHash = null;
const docLinks = new Map();
const curLink = () => ({ file: state.file, libId: state.libId, fileHash: state.fileHash, libHash: state.libHash });
function applyLink(l) {
  state.file = l && l.file || null; state.libId = l && l.libId || null; state.fileHash = l && l.fileHash || null; state.libHash = l && l.libHash || null;
  persistLink(); fileStatus();
}
/* Change de schéma en gardant l'annulation : Ctrl+Z revient au schéma précédent et au fichier auquel il était lié */
function switchDoc(nd, link, keepView) {
  const before = snapshot(), prev = curLink();
  doc = nd; state.sel = new Set();
  const after = snapshot(), h = sigHash(after), L = link ? { file: link.file || null, libId: link.libId || null, fileHash: link.file ? h : null, libHash: link.libId ? h : null } : null;
  docLinks.set(before, prev); docLinks.set(after, L);
  applyLink(L); commit(before); syncDocName(); buildInspector(); if (!keepView) fitView();
}
function onRestoreSnap(s) { if (docLinks.has(s)) applyLink(docLinks.get(s)); else fileStatus(); }
const fileDirty = () => !!state.file && state.fileHash !== docHash();
function fileStatus() {
  const el = $('#filestat'); if (!el) return;
  const h = docHash(), f = state.file, nm = f ? f.name : state.libId ? 'Mes projets : ' + (doc.name || 'Sans titre') : '';
  const dirty = f ? state.fileHash !== h : state.libId ? state.libHash !== h : false;
  el.textContent = nm ? nm + (dirty ? ' — modifications non enregistrées' : ' — enregistré') : doc.items.length ? 'Brouillon gardé dans ce navigateur' : '';
  el.classList.toggle('dirty', !!nm && dirty);
  el.title = f ? (f.handle ? 'Ctrl+S réécrit ce fichier' : 'Ctrl+S : choisir où enregistrer') : state.libId ? 'Ctrl+S met à jour ce projet' : 'Ctrl+S pour enregistrer';
  if (!window.claude) document.title = (nm && dirty ? '• ' : '') + (doc.name && doc.name !== 'Sans titre' ? doc.name + ' — ' : '') + 'Schéma de principe plomberie';
}

/* ----- Base locale : fichier courant et fichiers récents (poignées de fichiers, Chrome et Edge) ----- */
let kvP = null, recents = [];
function kvDb() {
  if (!kvP) kvP = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('idb')); return; }
    const r = indexedDB.open('schema-plomberie-fichiers', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }).catch(e => { kvP = null; throw e; });
  return kvP;
}
async function kvGet(k) { const db = await kvDb(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function kvSet(k, v) { const db = await kvDb(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error); }); }
function persistLink() {
  scheduleSave();
  if (!FSA) return;
  const f = state.file; kvSet('courant', f && f.handle ? { handle: f.handle, name: f.name } : null).catch(() => {});
}
async function addRecent(handle, fmt) {
  if (!FSA || !handle) return;
  const list = [{ name: handle.name, fmt, at: Date.now(), handle }];
  for (const r of recents) { let same = false; try { same = await r.handle.isSameEntry(handle); } catch (e) { /* poignée périmée */ } if (!same && list.length < 8) list.push(r); }
  recents = list; kvSet('recents', recents).catch(() => {});
}
async function permOK(h, write) {
  const o = { mode: write ? 'readwrite' : 'read' };
  try { if ((await h.queryPermission(o)) === 'granted') return true; return (await h.requestPermission(o)) === 'granted'; } catch (e) { return false; }
}
const fsErr = (e, verb) => e && e.name === 'NotFoundError' ? 'Fichier introuvable : il a été déplacé, renommé ou supprimé.' : e && e.name === 'NotAllowedError' ? 'Accès au fichier refusé.'
  : e && e.name === 'NoModificationAllowedError' ? 'Fichier en lecture seule, ou ouvert dans un autre logiciel.' : e && e.name === 'QuotaExceededError' ? 'Plus de place sur le disque.' : verb + ' impossible.';

/* ----- Ouvrir ----- */
async function openFile(file, handle) {
  const name = file.name || '', u = new Uint8Array(await file.arrayBuffer());
  const head = new TextDecoder().decode(u.subarray(0, 512)).replace(/^\uFEFF/, '').trimStart();
  const kind = u[0] === 0x89 && u[1] === 0x50 ? 'png' : head.slice(0, 5) === '%PDF-' ? 'pdf' : head[0] === '{' || head[0] === '[' ? 'json' : /<svg[\s>]/.test(new TextDecoder().decode(u.subarray(0, 4096))) ? 'svg' : fmtOfName(name);
  let res = null, legacy = null;
  try {
    if (kind === 'json') {
      const o = JSON.parse(new TextDecoder().decode(u));
      if (o && Array.isArray(o.projets)) { toast('Ce fichier est une sauvegarde de Mes projets : utilisez Mes projets > Restaurer…'); return false; }
      res = fromPayload(o);
    } else if (kind === 'svg') {
      const t = new TextDecoder().decode(u); res = svgData(t);
      if (!res) { legacy = importLegacySVG(t, name); res = { doc: legacy.doc, exp: null }; }
    } else if (kind === 'png') res = await pngData(u);
    else if (kind === 'pdf') res = pdfData(u);
  } catch (e) { res = null; }
  if (!res && (kind === 'png' || kind === 'pdf')) { toast((kind === 'pdf' ? 'Ce PDF' : 'Cette image') + ' ne contient pas le schéma (export d’une version précédente) : rouvrez le .json ou le .svg.'); return false; }
  if (!res) { toast(kind === 'svg' ? 'Ce SVG n’a pas été dessiné avec l’outil.' : 'Fichier illisible : choisissez un .json, .svg, .pdf ou .png enregistré depuis l’outil.'); return false; }
  if (legacy && !legacy.stats.els) { toast('Ce SVG n’a pas été dessiné avec l’outil.'); return false; }
  let nd; try { nd = sanitize(res.doc); } catch (e) { toast('Fichier illisible.'); return false; }
  /* Un ancien SVG est importé : on ne le réécrit pas en place, il faudra choisir où enregistrer le schéma */
  const link = handle && !legacy ? { file: { handle, name: handle.name || name, fmt: kind, pdf: res.exp && res.exp.pdf || null } } : null;
  switchDoc(nd, link);
  if (link) addRecent(handle, kind);
  if (legacy) {
    const s = legacy.stats, pl = (n, a, b) => n + ' ' + (n > 1 ? b : a);
    toast(`Ancien SVG rouvert : ${pl(s.els, 'symbole', 'symboles')}, ${pl(s.pipes, 'tuyau', 'tuyaux')}` + (s.unknown ? `, ${pl(s.unknown, 'élément non reconnu', 'éléments non reconnus')}` : '')
      + (s.nomen ? '. Vérifiez les désignations de la nomenclature' : '') + '. Ctrl+S pour l’enregistrer en version modifiable.');
  }
  else toast('Schéma ouvert : ' + (handle ? handle.name : name || doc.name));
  return true;
}
async function openHandle(h) {
  try { if (!(await permOK(h, true)) && !(await permOK(h, false))) { toast('Accès au fichier refusé.'); return; } await openFile(await h.getFile(), h); }
  catch (e) { toast(fsErr(e, 'Ouverture')); if (e && e.name === 'NotFoundError') { recents = recents.filter(r => r.handle !== h); kvSet('recents', recents).catch(() => {}); } }
}
async function openDialog() {
  if (!FSA) { $('#file-in').click(); return; }
  let hs; try { hs = await window.showOpenFilePicker({ id: 'schemas', types: [FTYPES.open], multiple: false }); } catch (e) { if (e && e.name !== 'AbortError') $('#file-in').click(); return; }
  try { await openFile(await hs[0].getFile(), hs[0]); } catch (e) { toast(fsErr(e, 'Ouverture')); }
}

/* ----- Enregistrer ----- */
async function writeHandle(h, fmt, pdfFmt) {
  if (!(await permOK(h, true))) { toast('Accès en écriture refusé : choisissez un autre emplacement.'); return false; }
  if (fmt === 'pdf' || fmt === 'png') toast('Enregistrement en cours…');
  const data = await fileData(fmt, pdfFmt); if (data == null) return false;
  const w = await h.createWritable(); await w.write(data); await w.close();
  return true;
}
async function saveToHandle(h, fmt, pdfFmt) {
  try {
    if (!(await writeHandle(h, fmt, pdfFmt))) return false;
    state.file = { handle: h, name: h.name, fmt, pdf: fmt === 'pdf' ? pdfFmt || pdfDefaultFmt() : null }; state.fileHash = docHash();
    persistLink(); fileStatus(); addRecent(h, fmt);
    toast('Enregistré : ' + h.name);
    return true;
  } catch (e) { toast(fsErr(e, 'Enregistrement')); return false; }
}
async function saveAs() {
  if (!FSA) { saveJSON(); return; }
  const f = state.file, o = { id: 'schemas', suggestedName: fileBase() + '.json', types: [FTYPES.json, FTYPES.svg, FTYPES.pdf] };
  if (f && f.handle) o.startIn = f.handle;
  let h;
  try { h = await window.showSaveFilePicker(o); }
  catch (e) { if (e && e.name !== 'AbortError') { toast('Enregistrement impossible ici : le schéma est téléchargé en .json.'); saveJSON(); } return; }
  await saveToHandle(h, fmtOfName(h.name) || 'json');
}
/* Ctrl+S : le fichier lié ; sinon le projet de Mes projets ; sinon, choisir un emplacement (ou Mes projets sans accès aux fichiers) */
async function saveCurrent() {
  const f = state.file;
  if (f && f.handle) { const ok = await saveToHandle(f.handle, f.fmt, f.pdf); if (ok && state.libId && lib.ok) saveLib(false, true); return; }
  if (state.libId && lib.ok) { saveLib(false); return; }
  if (FSA) { saveAs(); return; }
  if (lib.ok) saveLib(false); else saveJSON();
}
/* Exports : avec l'accès aux fichiers, on choisit le dossier (le dernier est retenu) ; sinon téléchargement */
async function saveOut(name, fmt, make) {
  if (FSA) {
    const o = { id: 'schemas', suggestedName: name, types: [FTYPES[fmt]] }; if (state.file && state.file.handle) o.startIn = state.file.handle;
    let h; try { h = await window.showSaveFilePicker(o); } catch (e) { if (!e || e.name === 'AbortError') return; h = null; }
    if (h) {
      try { const data = await make(); if (data == null) return; const w = await h.createWritable(); await w.write(data); await w.close(); addRecent(h, fmt); toast('Enregistré : ' + h.name + ' (se rouvre dans l’outil)'); }
      catch (e) { toast(fsErr(e, 'Export')); }
      return;
    }
  }
  try { const data = await make(); if (data != null) saveFile(name, data); } catch (e) { toast('Export impossible.'); }
}

/* ----- Application : mise à jour, installation, ouverture par double-clic (fichiers .json et .svg) ----- */
let installEvt = null;
function notify(msg, label, fn) {
  const old = $('#notice'); if (old) old.remove();
  const b = h('div', { class: 'notice', id: 'notice', role: 'status' }, h('span', null, msg),
    h('button', { class: 'btn sm primary', type: 'button', onclick: () => { b.remove(); fn(); } }, label),
    h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Fermer', onclick: () => b.remove() }, '✕'));
  document.body.append(b);
}
function initPWA() {
  if (window.claude || !/^https?:$/.test(location.protocol)) return;
  document.head.append(h('link', { rel: 'manifest', href: 'manifest.webmanifest' }));
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('Application installée : elle s’ouvre aussi hors connexion.'); });
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!('serviceWorker' in navigator) || (location.protocol !== 'https:' && !local)) return;
  const had = !!navigator.serviceWorker.controller; let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || reloading) return; reloading = true; saveNow(); location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = w => notify('Nouvelle version de l’outil disponible.', 'Mettre à jour', () => w.postMessage('maj'));
    if (reg.waiting && had) offer(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
async function installApp() { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* refus */ } installEvt = null; }
function initFiles() {
  if ('launchQueue' in window && window.launchQueue) window.launchQueue.setConsumer(p => { if (p && p.files && p.files.length) openHandle(p.files[0]); });
  window.addEventListener('beforeunload', e => { saveNow(); if (fileDirty()) { e.preventDefault(); e.returnValue = ''; } });
  if (FSA) (async () => {
    try { recents = (await kvGet('recents')) || []; } catch (e) { recents = []; }
    try { const c = await kvGet('courant'); if (c && c.handle && state.file && !state.file.handle && c.name === state.file.name) state.file.handle = c.handle; } catch (e) { /* base indisponible */ }
    fileStatus();
  })();
  initPWA(); fileStatus();
}
/* Accès de test (?test) : utilisé par tests/e2e.cjs */
function testHook() {
  if (!/[?&]test(?:[=&]|$)/.test(location.search)) return;
  window.__sp = { get doc() { return doc; }, set doc(v) { doc = v; }, S, PRE, makeEl, newDoc, sanitize, snapshot, buildExport, contentSVG, payload, svgFileText, pngFileBlob, pdfBlob, fileData, svgData, pngData, pdfData,
    importLegacySVG, openFile, openHandle, sigIndex, sigHash, loadExample, loadModele, switchDoc, saveCurrent, saveAs, exportPDF, exportSVG, exportPNG, undo, redo, commit, curLink, fileStatus, state, FSA, recents: () => recents };
}
