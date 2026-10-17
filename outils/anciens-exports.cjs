/* Exports SVG produits par d'anciennes versions de l'outil, pour tester leur réouverture (tests/anciens-exports/).
   Pour chaque version listée : construction de la page de l'époque (git archive + build.sh), puis export SVG des exemples
   et d'un catalogue de tous les symboles, avec le schéma d'origine (.json) pour comparer. Fichiers compressés en .gz.

   Usage : node outils/anciens-exports.cjs [commit…]   (dépôt complet : git fetch --unshallow si besoin) */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'tests', 'anciens-exports');
const VERSIONS = process.argv.slice(2).length ? process.argv.slice(2) : ['4a9b5b4', '830840c'];
const HOOK = 'window.__old = { loadExample, buildExport, makeEl, PRE, S, newDoc, get doc() { return doc; }, set doc(v) { doc = v; } };\n';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1400, height: 900 } });
  for (const c of VERSIONS) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-' + c + '-'));
    execFileSync('bash', ['-c', `git archive ${c} | tar -x -C "${dir}"`], { cwd: ROOT });
    execFileSync('bash', ['build.sh'], { cwd: dir, stdio: 'ignore' });
    const f = path.join(dir, 'dist', 'index.html'); let html = fs.readFileSync(f, 'utf8'); const i = html.lastIndexOf('init();');
    fs.writeFileSync(f, html.slice(0, i) + HOOK + html.slice(i));
    const date = execFileSync('git', ['show', '-s', '--format=%cs', c], { cwd: ROOT, encoding: 'utf8' }).trim();
    await page.goto('file://' + f); await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
      const O = window.__old, res = {}, svgOf = () => '<?xml version="1.0" encoding="UTF-8"?>\n' + O.buildExport().svg;
      for (const k of ['eau', 'chauf', 'ep']) { O.loadExample(k); res[k] = { svg: svgOf(), doc: JSON.parse(JSON.stringify(O.doc)) }; }
      /* Catalogue : chaque préréglage une fois, repère affiché, orientations et libellés variés, avec la légende */
      const cat = real => {
        const d = O.newDoc(); O.doc = d; if (real) d.opts.real = true;
        Object.keys(O.PRE).forEach((k, i) => {
          const el = O.makeEl(k, 60 + (i % 12) * 150, 60 + Math.floor(i / 12) * 160);
          el.rot = [0, 90, 180, 270][i % 4]; el.fh = i % 3 === 0; el.st = !!el.tag; if (i % 5 === 0) el.sn = true; if (i % 7 === 0) { el.note = 'DN' + (15 + i); el.sv = true; }
          d.items.push(el);
        });
        d.items.push({ id: 'lg', kind: 'legend', x: 60, y: 60 + Math.ceil(Object.keys(O.PRE).length / 12) * 160 + 40, title: 'LÉGENDE', rows: 30, nets: true, syms: true });
        return { svg: svgOf(), doc: JSON.parse(JSON.stringify(d)) };
      };
      res.catalogue = cat(false);
      if (Object.values(O.S).some(s => String(s.draw).includes('REAL'))) res['catalogue-reel'] = cat(true);
      return res;
    });
    for (const [k, v] of Object.entries(out)) {
      const base = path.join(OUT, `${date}-${c}-${k}`);
      fs.writeFileSync(base + '.svg.gz', zlib.gzipSync(v.svg, { level: 9 }));
      fs.writeFileSync(base + '.json.gz', zlib.gzipSync(JSON.stringify(v.doc), { level: 9 }));
      console.log(path.basename(base), (v.svg.length / 1024).toFixed(0) + ' ko');
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
