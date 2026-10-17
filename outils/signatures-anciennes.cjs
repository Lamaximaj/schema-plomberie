/* Empreintes des dessins des versions précédentes, pour rouvrir les SVG qu'elles ont exportés.
   Pour chaque version du fichier src/10-symboles-et-rendu.js dans l'historique git, on calcule l'empreinte de chaque variante
   de dessin (même code que l'import : bloc <empreintes> de src/26-import-svg.js). On garde celles qui n'existent plus dans
   la version actuelle et on les écrit dans src/24-signatures-anciennes.js.

   Usage : npm install, puis node outils/signatures-anciennes.cjs (dépôt complet : git fetch --unshallow si besoin).
   À relancer après toute modification du dessin d'un symbole, avant de publier. */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const imp = fs.readFileSync(path.join(ROOT, 'src/26-import-svg.js'), 'utf8');
const block = imp.slice(imp.indexOf('/* <empreintes>'), imp.indexOf('/* </empreintes> */'));
if (!block) throw new Error('bloc <empreintes> introuvable dans src/26-import-svg.js');
const HOOK = '\nwindow.__sig = () => sigEnumerate({ S, PRE, NOCTX, setReal: v => { doc.opts.real = v; } }).map(e => ({ sig: e.sig, pre: e.pre, type: e.type, p: e.p, real: e.real }));\n})();\n';

async function sigsOf(page, src) {
  const f = path.join(os.tmpdir(), 'sig-' + process.pid + '.html');
  fs.writeFileSync(f, '<!doctype html><meta charset="utf-8"><body><script>\n' + src + '\n' + block + HOOK + '</script>');
  const errs = []; const onErr = e => errs.push(e.message); page.on('pageerror', onErr);
  await page.goto('file://' + f); page.off('pageerror', onErr);
  if (errs.length) throw new Error(errs[0]);
  return page.evaluate(() => window.__sig());
}

(async () => {
  const commits = git('log', '--format=%H %cs', '--reverse', '--', 'src/10-symboles-et-rendu.js').trim().split('\n').filter(Boolean).map(l => l.split(' '));
  const b = await chromium.launch(), page = await b.newPage();
  const old = new Map();
  for (const [c, date] of commits) {
    let src; try { src = git('show', c + ':src/10-symboles-et-rendu.js'); } catch (e) { continue; }
    try {
      const list = await sigsOf(page, src);
      for (const e of list) { const v = JSON.stringify([e.pre, e.type, e.p, e.real]); if (!old.has(e.sig)) old.set(e.sig, new Set()); old.get(e.sig).add(v); }
      console.log(date, c.slice(0, 7), list.length, 'variantes');
    } catch (e) { console.log(date, c.slice(0, 7), 'ignorée :', e.message); }
  }
  const cur = new Set((await sigsOf(page, fs.readFileSync(path.join(ROOT, 'src/10-symboles-et-rendu.js'), 'utf8'))).map(e => e.sig));
  await b.close();
  const table = {};
  for (const [sig, set] of [...old.entries()].sort((a, b) => a[0].localeCompare(b[0]))) if (!cur.has(sig)) table[sig] = [...set].map(v => JSON.parse(v));
  const body = Object.entries(table).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n');
  fs.writeFileSync(path.join(ROOT, 'src/24-signatures-anciennes.js'),
    '/* ===== Dessins des versions précédentes (généré par outils/signatures-anciennes.cjs, ne pas modifier à la main) =====\n' +
    '   Empreinte d\'un dessin qui n\'existe plus → [préréglage, type, réglages, vue réaliste]. Sert à rouvrir les anciens SVG. */\n' +
    'const SIG_ANCIENNES = {\n' + body + '\n};\n');
  console.log(Object.keys(table).length, 'dessins anciens retenus,', cur.size, 'dessins actuels');
})().catch(e => { console.error(e); process.exit(1); });
