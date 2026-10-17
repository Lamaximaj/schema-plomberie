/* Tests de bout en bout de l'outil, dans Chromium : npm test (construit la page puis lance ce fichier).
   - les exports SVG, PNG, PDF et JSON se rouvrent à l'identique ;
   - les SVG exportés sans données (versions précédentes, dont tests/anciens-exports/) se rouvrent modifiables ;
   - enregistrement dans un dossier (sélecteurs de fichiers simulés), Ctrl+S, Ctrl+O, récents, annulation entre fichiers ;
   - hors connexion : la page et l'export PDF fonctionnent sans réseau, puis la mise à jour est proposée. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIST = path.join(__dirname, '..', 'dist'), FIX = path.join(__dirname, 'anciens-exports');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain' };
let swOverride = null;
const serve = () => new Promise(res => {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(DIST, u); if (!f.startsWith(DIST)) { r.writeHead(403); r.end(); return; }
    if (u === '/sw.js' && swOverride) { r.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-cache' }); r.end(swOverride); return; }
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d); });
  });
  srv.listen(0, '127.0.0.1', () => res(srv));
});

const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(true); console.log('✓ ' + name + ' (' + (Date.now() - t0) + ' ms)'); }
  catch (e) { results.push(false); console.log('✗ ' + name + '\n    ' + String(e && e.stack || e).split('\n').slice(0, 8).join('\n    ')); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'différence') + '\n      attendu : ' + JSON.stringify(b).slice(0, 600) + '\n      obtenu  : ' + JSON.stringify(a).slice(0, 600)); };

/* Aides exécutées dans la page */
function helpers() {
  const sp = window.__sp, T = window.__t = {};
  T.exportNoMeta = () => '<?xml version="1.0" encoding="UTF-8"?>\n' + sp.buildExport().svg;
  T.catalogue = real => {
    const d = sp.newDoc(); sp.doc = d; if (real) d.opts.real = true;
    Object.keys(sp.PRE).forEach((k, i) => {
      const el = sp.makeEl(k, 60 + (i % 12) * 150, 60 + Math.floor(i / 12) * 160);
      el.rot = [0, 90, 180, 270][i % 4]; el.fh = i % 3 === 0; el.st = !!el.tag; if (i % 5 === 0) el.sn = true; if (i % 7 === 0) { el.note = 'DN' + (15 + i); el.sv = true; }
      d.items.push(el);
    });
    d.items.push({ id: 'lg', kind: 'legend', x: 60, y: 60 + Math.ceil(Object.keys(sp.PRE).length / 12) * 160 + 40, title: 'LÉGENDE', rows: 30, nets: true, syms: true });
    return JSON.parse(JSON.stringify(d));
  };
  /* Résumé d'un SVG exporté : transformations des symboles, libellés (texte et position), tracés des tuyaux */
  T.sig = text => {
    const d = new DOMParser().parseFromString(text, 'image/svg+xml'), out = { els: [], labels: [], pipes: [] }, halo = c => /fill:\s*none/.test(c.getAttribute('style') || '');
    for (const n of d.documentElement.children) {
      if (n.localName !== 'g') continue;
      const tr = n.getAttribute('transform') || '', ks = [...n.children];
      if (/^translate/.test(tr) && /color:/.test(n.getAttribute('style') || '')) { out.els.push(tr); continue; }
      if (ks.length && ks.every(c => c.localName === 'text') && halo(ks[0])) { out.labels.push(ks.filter(c => !halo(c)).map(c => [c.getAttribute('x'), c.getAttribute('y'), c.getAttribute('transform') || '', c.textContent].join('|')).join(' / ')); continue; }
      const pp = ks.find(c => c.localName === 'path' && c.getAttribute('fill') === 'none' && c.hasAttribute('stroke'));
      if (pp && !ks.some(c => c.localName === 'rect' || c.localName === 'text')) out.pipes.push(pp.getAttribute('stroke') + ' ' + pp.getAttribute('d'));
    }
    for (const k in out) out[k].sort();
    return out;
  };
  /* Nœuds d'un export, triés (l'ordre des libellés entre tuyaux et symboles n'est pas gardé), sans la nomenclature :
     les désignations non affichées sur le dessin ne se retrouvent pas dans un ancien SVG */
  T.parts = text => { const d = new DOMParser().parseFromString(text, 'image/svg+xml'), xs = new XMLSerializer(); return [...d.documentElement.children].slice(1).map(n => xs.serializeToString(n)).filter(s => !/>NOMENCLATURE</.test(s)).sort(); };
  T.reexport = d => { const saved = sp.doc; sp.doc = sp.sanitize(d); try { return T.exportNoMeta(); } finally { sp.doc = saved; } };
  T.bytes = async v => new Uint8Array(await new Blob([v]).arrayBuffer());
  T.readBack = async (fmt, v) => {
    const u = await T.bytes(v);
    if (fmt === 'svg') return sp.svgData(new TextDecoder().decode(u));
    if (fmt === 'png') return sp.pngData(u);
    if (fmt === 'pdf') return sp.pdfData(u);
    return { doc: JSON.parse(new TextDecoder().decode(u)) };
  };
}
/* Sélecteurs de fichiers simulés : fichiers gardés en mémoire dans window.__fs */
function fsMock() {
  const store = window.__fs = { files: {}, next: null, picks: [], writes: 0 };
  const mk = name => ({
    kind: 'file', name,
    async getFile() { const v = store.files[name]; if (v === undefined) { const e = new Error('absent'); e.name = 'NotFoundError'; throw e; } return new File([v], name); },
    async createWritable() { const parts = []; return { async write(d) { parts.push(d); }, async close() { store.files[name] = parts.length === 1 ? parts[0] : new Blob(parts); store.writes++; } }; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
    async isSameEntry(o) { return !!o && o.name === name; },
  });
  store.handle = mk;
  window.showSaveFilePicker = async o => { store.picks.push(o); const n = store.next || o.suggestedName; store.next = null; return mk(n); };
  window.showOpenFilePicker = async o => { store.picks.push(o); const n = store.next; store.next = null; return [mk(n)]; };
}

/* Comparaison d'un schéma importé d'un ancien SVG avec le schéma d'origine */
function cmpDocs(T, I, lab) {
  const te = T.items.filter(i => i.kind === 'el'), ie = I.items.filter(i => i.kind === 'el');
  eq(ie.length, te.length, lab + ' : nombre de symboles');
  te.forEach((a, i) => {
    const b = ie[i], w = lab + ' : symbole n° ' + i + ' (' + a.pre + ')';
    eq([b.x, b.y, (b.rot || 0) % 360, !!b.fh], [a.x, a.y, (a.rot || 0) % 360, !!a.fh], w + ', position');
    eq(b.pre, a.pre, w + ', préréglage');
    eq([!!b.st, !!b.sn, !!b.sv], [!!(a.st && a.tag), !!(a.sn && a.name), !!(a.sv && a.note)], w + ', libellés affichés');
    if (a.st && a.tag) eq(b.tag, a.tag, w + ', repère');
    if (a.sn && a.name) eq(b.name, a.name, w + ', désignation');
    if (a.sv && a.note) eq(b.note, a.note, w + ', caractéristiques');
    for (const k of Object.keys(a.p || {})) if (k in b.p && (typeof a.p[k] !== 'object' || a.p[k] === null)) eq(String(b.p[k]), String(a.p[k]), w + ', réglage ' + k);
  });
  const tp = T.items.filter(i => i.kind === 'pipe'), ip = I.items.filter(i => i.kind === 'pipe'), net = (d, id) => d.nets.find(n => n.id === id) || {};
  eq(ip.length, tp.length, lab + ' : nombre de tuyaux');
  tp.forEach((a, i) => {
    const b = ip[i], w = lab + ' : tuyau n° ' + i, na = net(T, a.net), nb = net(I, b.net), shown = (p, n) => (p.txt && p.txt.trim()) || [n.abbr, p.dn].filter(Boolean).join(' ');
    eq(b.pts, a.pts, w + ', tracé'); eq(nb.color, na.color, w + ', réseau');
    /* Flèches demandées mais sans place pour les dessiner (tronçons courts) : invisibles, donc non récupérables ; le dessin est comparé à part */
    if (!(a.arr && !b.arr)) eq(!!b.arr, !!a.arr, w + ', flèches');
    const la = !!a.lab && !!shown(a, na); eq(!!b.lab, la, w + ', libellé affiché');
    if (la) { eq(shown(b, nb), shown(a, na), w + ', texte du libellé'); assert(Math.abs(b.lp - a.lp) < 0.003, w + ', position du libellé : ' + b.lp + ' au lieu de ' + a.lp); }
  });
  const pick = (d, k) => d.items.filter(i => i.kind === k);
  eq(pick(I, 'zone').map(z => [z.x, z.y, z.w, z.h, z.title, z.style]), pick(T, 'zone').map(z => [z.x, z.y, z.w, z.h, z.title, z.style || 'dash']), lab + ' : zones');
  for (const k of ['legend', 'nomen', 'cart']) eq(pick(I, k).map(z => [z.x, z.y, z.title || '', +z.sc || 1]), pick(T, k).map(z => [z.x, z.y, z.title || '', +z.sc || 1]), lab + ' : ' + k);
  eq(pick(I, 'text').length, pick(T, 'text').length, lab + ' : textes libres');
}

(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(fsMock);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdn|unpkg/, r => r.abort());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + 'index.html?test'); await page.waitForFunction(() => !!window.__sp);
  await page.evaluate(helpers);
  const eauJSON = await page.evaluate(() => { __sp.loadExample('eau'); return __sp.snapshot(); });

  await test('les exports SVG, PNG, PDF et JSON se rouvrent à l’identique', async () => {
    for (const src of ['eau', 'chauf', 'ep', 'modele', 'catalogue']) {
      await page.evaluate(src => { const sp = __sp; if (src === 'modele') sp.loadModele(0); else if (src === 'catalogue') sp.switchDoc(sp.sanitize(__t.catalogue(false)), null); else sp.loadExample(src); }, src);
      for (const fmt of ['json', 'svg', 'png', 'pdf']) {
        const r = await page.evaluate(async fmt => { const sp = __sp, ref = JSON.stringify(sp.sanitize(JSON.parse(sp.snapshot()))), v = await sp.fileData(fmt, 'a3'); const back = await __t.readBack(fmt, v); return { ok: !!back, same: back && JSON.stringify(sp.sanitize(back.doc)) === ref, exp: back && back.exp }; }, fmt);
        assert(r.ok && r.same, `${src} en ${fmt} : schéma relu différent`);
        if (fmt === 'pdf') eq(r.exp, { pdf: 'a3' }, `${src} en pdf : format retenu`);
      }
    }
  });

  await test('un SVG sans données de la version actuelle se rouvre (exemples, catalogue, vue réaliste)', async () => {
    for (const src of ['eau', 'chauf', 'ep', 'modele', 'modele-reel', 'catalogue', 'catalogue-reel']) {
      const r = await page.evaluate(src => {
        const sp = __sp; let truth;
        if (src.indexOf('catalogue') === 0) truth = __t.catalogue(src === 'catalogue-reel');
        else if (src.indexOf('modele') === 0) { sp.loadModele(0); truth = JSON.parse(sp.snapshot()); truth.opts.real = src === 'modele-reel'; }
        else { sp.loadExample(src); truth = JSON.parse(sp.snapshot()); }
        sp.doc = sp.sanitize(truth); const svg = __t.exportNoMeta(), res = sp.importLegacySVG(svg, src + '.svg');
        return { truth, imp: res.doc, stats: res.stats, same: JSON.stringify(__t.parts(__t.reexport(res.doc))) === JSON.stringify(__t.parts(svg)), real: !!res.doc.opts.real };
      }, src);
      eq(r.stats.unknown, 0, src + ' : éléments non reconnus');
      cmpDocs(r.truth, r.imp, src);
      eq(r.real, /-reel$/.test(src), src + ' : vue réaliste');
      assert(r.same, src + ' : le dessin réexporté diffère de l’original');
    }
  });

  await test('les SVG exportés par les versions précédentes se rouvrent', async () => {
    const names = fs.readdirSync(FIX).filter(f => f.endsWith('.svg.gz')).map(f => f.slice(0, -7)).sort();
    assert(names.length >= 4, 'exports anciens absents de tests/anciens-exports');
    for (const n of names) {
      const svg = zlib.gunzipSync(fs.readFileSync(path.join(FIX, n + '.svg.gz'))).toString('utf8'), truth = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FIX, n + '.json.gz'))).toString('utf8'));
      const r = await page.evaluate(svg => { const res = __sp.importLegacySVG(svg, 'ancien.svg'), a = __t.sig(svg), b = __t.sig(__t.reexport(res.doc)); return { imp: res.doc, stats: res.stats, a, b, real: !!res.doc.opts.real }; }, svg);
      eq(r.stats.unknown, 0, n + ' : éléments non reconnus');
      cmpDocs(truth, r.imp, n);
      eq(r.real, !!(truth.opts && truth.opts.real), n + ' : vue réaliste');
      eq(r.b.els, r.a.els, n + ' : position des symboles réexportés');
      eq(r.b.labels, r.a.labels, n + ' : repères et libellés réexportés');
      eq(r.b.pipes, r.a.pipes, n + ' : tracés réexportés');
    }
  });

  await test('Ctrl+S enregistre dans un dossier, puis réécrit le même fichier', async () => {
    await page.evaluate(() => { __sp.loadExample('chauf'); __fs.picks.length = 0; __fs.writes = 0; });
    await page.keyboard.press('Control+s'); await page.waitForFunction(() => __fs.writes === 1);
    let r = await page.evaluate(async () => ({ picks: __fs.picks.length, name: __sp.state.file && __sp.state.file.name, same: JSON.stringify(JSON.parse(await new Blob([__fs.files[__sp.state.file.name]]).text())) === __sp.snapshot(), stat: document.getElementById('filestat').textContent }));
    eq([r.picks, r.name, r.same], [1, 'Chaufferie gaz — exemple.json', true], 'premier enregistrement'); assert(/enregistré$/.test(r.stat), 'état : ' + r.stat);
    await page.evaluate(() => { const sp = __sp, b = sp.snapshot(); sp.doc.items.find(i => i.kind === 'el').x += 10; sp.commit(b); });
    assert(/modifications non enregistrées/.test(await page.textContent('#filestat')), 'modification non signalée');
    await page.keyboard.press('Control+s'); await page.waitForFunction(() => __fs.writes === 2);
    r = await page.evaluate(async () => ({ picks: __fs.picks.length, same: JSON.stringify(JSON.parse(await new Blob([__fs.files['Chaufferie gaz — exemple.json']]).text())) === __sp.snapshot(), stat: document.getElementById('filestat').textContent }));
    eq([r.picks, r.same], [1, true], 'second enregistrement sans redemander'); assert(/enregistré$/.test(r.stat), 'état : ' + r.stat);
  });

  await test('un PDF exporté se rouvre et Ctrl+S le réécrit en PDF', async () => {
    await page.evaluate(() => { __fs.writes = 0; __sp.exportPDF('a3'); });
    await page.waitForFunction(() => __fs.writes === 1, null, { timeout: 60000 });
    const pdfName = await page.evaluate(() => __fs.picks[__fs.picks.length - 1].suggestedName);
    eq(pdfName, 'Chaufferie gaz — exemple A3.pdf', 'nom proposé');
    await page.evaluate(n => { __fs.next = n; }, pdfName);
    await page.keyboard.press('Control+o'); await page.waitForFunction(n => __sp.state.file && __sp.state.file.name === n, pdfName);
    eq(await page.evaluate(() => [__sp.state.file.fmt, __sp.state.file.pdf]), ['pdf', 'a3'], 'fichier lié');
    await page.evaluate(() => { const sp = __sp, b = sp.snapshot(); sp.doc.name = 'Chaufferie modifiée'; sp.commit(b); __fs.writes = 0; });
    await page.keyboard.press('Control+s'); await page.waitForFunction(() => __fs.writes === 1, null, { timeout: 60000 });
    const r = await page.evaluate(async n => { const back = await __t.readBack('pdf', __fs.files[n]); return back && back.doc.name; }, pdfName);
    eq(r, 'Chaufferie modifiée', 'PDF réécrit avec la modification');
    assert((await page.evaluate(() => __sp.recents().map(r => r.name))).includes(pdfName), 'PDF absent des récents');
  });

  await test('Ctrl+Z après l’ouverture d’un autre fichier revient aussi au fichier précédent', async () => {
    const before = await page.evaluate(() => __sp.state.file.name);
    await page.evaluate(j => { __fs.files['eau.json'] = j; __fs.next = 'eau.json'; }, eauJSON);
    await page.keyboard.press('Control+o'); await page.waitForFunction(() => __sp.state.file && __sp.state.file.name === 'eau.json');
    await page.evaluate(() => __sp.undo());
    eq(await page.evaluate(() => [__sp.state.file && __sp.state.file.name, __sp.doc.name]), [before, 'Chaufferie modifiée'], 'retour au fichier précédent');
    await page.evaluate(() => __sp.redo());
    eq(await page.evaluate(() => __sp.state.file && __sp.state.file.name), 'eau.json', 'rétablir revient au second fichier');
  });

  await test('un ancien SVG importé n’est pas réécrit en place', async () => {
    const svg = zlib.gunzipSync(fs.readFileSync(path.join(FIX, fs.readdirSync(FIX).find(f => /-ep\.svg\.gz$/.test(f))))).toString('utf8');
    const r = await page.evaluate(async svg => { __fs.files['ancien.svg'] = svg; const ok = await __sp.openFile(new File([svg], 'ancien.svg'), __fs.handle('ancien.svg')); return { ok, file: __sp.state.file, n: __sp.doc.items.length, msg: document.getElementById('toast').textContent }; }, svg);
    assert(r.ok && r.n > 10 && r.file === null, 'import : ' + JSON.stringify(r).slice(0, 200)); assert(/Ancien SVG rouvert/.test(r.msg), r.msg);
  });

  await test('un PNG ou un PDF sans données est refusé avec un message clair', async () => {
    const r = await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = c.height = 4; const png = await new Promise(r => c.toBlob(r, 'image/png')); const ok = await __sp.openFile(new File([png], 'photo.png'), null); return { ok, msg: document.getElementById('toast').textContent }; });
    assert(!r.ok && /ne contient pas le schéma/.test(r.msg), r.msg);
  });

  await test('hors connexion : la page, ses bibliothèques et l’export PDF fonctionnent', async () => {
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await c2.route(/fonts\.(googleapis|gstatic)\.com|cdn|unpkg/, r => r.abort());
    const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push('hors connexion : ' + e.message));
    await p2.goto(base + '?test'); await p2.evaluate(() => navigator.serviceWorker.ready);
    await p2.reload(); await p2.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert(await p2.evaluate(() => !!document.querySelector('link[rel="manifest"]')), 'manifeste absent');
    await c2.setOffline(true); await p2.reload(); await p2.waitForFunction(() => !!window.__sp);
    const r = await p2.evaluate(async () => { __sp.loadExample('ep'); const b = await __sp.pdfBlob('a4'); const s = b ? new TextDecoder('latin1').decode(new Uint8Array(await b.arrayBuffer())) : ''; return { size: b ? b.size : 0, vect: !!window.svg2pdf, arimo: /Arimo/.test(s), data: !!__sp.pdfData(new TextEncoder().encode(s)) }; });
    assert(r.size > 5000 && r.vect && r.arimo && r.data, 'PDF hors connexion : ' + JSON.stringify(r));
    await c2.setOffline(false);
    swOverride = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8').replace(/const VERSION = '[^']*'/, "const VERSION = 'essai-maj'");
    await p2.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await p2.waitForSelector('#notice', { timeout: 20000 });
    await Promise.all([p2.waitForNavigation({ timeout: 20000 }), p2.click('#notice .btn.primary')]);
    await p2.waitForFunction(() => !!window.__sp);
    const keys = await p2.evaluate(() => caches.keys());
    assert(keys.includes('schema-plomberie-essai-maj') && keys.filter(k => /^schema-plomberie-\d/.test(k)).length === 0, 'caches après mise à jour : ' + keys.join(', '));
    swOverride = null; await c2.close();
  });

  await test('aucune erreur dans la page', async () => { eq(errors, [], 'erreurs'); });
  await browser.close(); srv.close();
  const ko = results.filter(x => !x).length;
  console.log(ko ? `\n${ko} test(s) en échec sur ${results.length}` : `\n${results.length} tests réussis`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
