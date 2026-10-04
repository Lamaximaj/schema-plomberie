
/* ===== Couche interface (sélection, poignées, aperçus) ===== */
const svg = $('#cv'), VP = $('#vp'), LC = $('#lc'), LU = $('#lu'), app = $('#app');
function render() { LC.innerHTML = contentSVG({}); renderUI(); $('#empty').hidden = doc.items.length > 0 || state.tool !== 'select'; }
function renderUI() {
  const k = view.k, items = selItems(), one = items.length === 1 ? items[0] : null; let s = '', ctx = null;
  for (const it of items) { if (it.kind === 'pipe') continue; ctx = ctx || buildCtx(); const b = bboxOf(it, ctx), pd = 3 / k; s += `<rect class="selbox" x="${r2(b.x0 - pd)}" y="${r2(b.y0 - pd)}" width="${r2(b.x1 - b.x0 + 2 * pd)}" height="${r2(b.y1 - b.y0 + 2 * pd)}" stroke-width="${r2(1.3 / k)}" stroke-dasharray="${r2(4 / k)} ${r2(3 / k)}"/>`; }
  if (one && one.kind === 'pipe') {
    const hs = 7 / k, r = 4.2 / k, sw = r2(1.3 / k);
    for (let i = 0; i < one.pts.length - 1; i++) { const a = one.pts[i], b = one.pts[i + 1], d = segDir(a, b); if ((d !== 'h' && d !== 'v') || Math.hypot(b.x - a.x, b.y - a.y) * k < 26) continue; s += `<circle class="hdl ${d === 'h' ? 'ns' : 'ew'}" data-hit="sh" data-id="${one.id}" data-i="${i}" cx="${r2((a.x + b.x) / 2)}" cy="${r2((a.y + b.y) / 2)}" r="${r2(r)}" stroke-width="${sw}"/>`; }
    one.pts.forEach((q, i) => { s += `<rect class="hdl vh" data-hit="vh" data-id="${one.id}" data-i="${i}" x="${r2(q.x - hs / 2)}" y="${r2(q.y - hs / 2)}" width="${r2(hs)}" height="${r2(hs)}" stroke-width="${sw}"/>`; });
  }
  if (one && one.kind === 'zone') { const s0 = 8 / k; for (const [c, x, y] of [['nw', one.x, one.y], ['ne', one.x + one.w, one.y], ['sw', one.x, one.y + one.h], ['se', one.x + one.w, one.y + one.h]]) s += `<rect class="hdl ${c === 'nw' || c === 'se' ? 'nwse' : 'nesw'}" data-hit="zh" data-id="${one.id}" data-c="${c}" x="${r2(x - s0 / 2)}" y="${r2(y - s0 / 2)}" width="${r2(s0)}" height="${r2(s0)}" stroke-width="${r2(1.3 / k)}"/>`; }
  if (one && one.kind === 'el' && state.itab === 'racc') s += portBadges(one, k);
  const showPorts = state.tool === 'pipe' || (drag && drag.kind === 'vertex');
  if (showPorts) { const r = r2(3.2 / k), sw = r2(1.2 / k); for (const el of els()) for (const q of portsW(el)) s += `<circle class="portmark" cx="${q.x}" cy="${q.y}" r="${r}" stroke-width="${sw}"/>`; }
  if (state.tool === 'place' && state.ghost && state.mouseIn) { const g = state.ghost; s += g.kind === 'el' ? elSVG(g, buildCtx(), { exp: true, ghost: true }) : `<g opacity="0.55">${g.kind === 'legend' ? legendSVG(g, buildCtx()) : g.kind === 'nomen' ? nomenSVG(g, buildCtx()) : cartSVG(g)}</g>`; }
  if (state.draft) {
    const d = state.draft, n = netOf(d.net), pts = d.pts.concat(d.preview || []), dash = DASHES[n.dash];
    if (pts.length > 1) s += `<path d="${polyD(pts)}" fill="none" stroke="${n.color}" stroke-width="${n.w}" stroke-linejoin="round" stroke-linecap="${n.dash === 'dot' ? 'round' : 'butt'}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    for (const q of d.pts) s += `<circle cx="${q.x}" cy="${q.y}" r="${r2(2.6 / k)}" fill="${n.color}"/>`;
  }
  if (showPorts && state.snap && state.snap.kind !== 'grid') s += `<circle cx="${state.snap.x}" cy="${state.snap.y}" r="${r2(7 / k)}" fill="none" style="stroke:${state.snap.kind === 'port' ? 'var(--sel)' : '#0b7285'}" stroke-width="${r2(2 / k)}"/>`;
  if (drag && drag.kind === 'rubber') { const d = drag, cross = d.cur.x < d.start.x; s += `<rect class="rubber${cross ? ' cross' : ''}" x="${r2(Math.min(d.start.x, d.cur.x))}" y="${r2(Math.min(d.start.y, d.cur.y))}" width="${r2(Math.abs(d.cur.x - d.start.x))}" height="${r2(Math.abs(d.cur.y - d.start.y))}" stroke-width="${r2(1 / k)}"${cross ? ` stroke-dasharray="${r2(4 / k)} ${r2(3 / k)}"` : ''}/>`; }
  LU.innerHTML = s;
}
/* Pastilles numérotées des raccordements (onglet « Raccordement ») ; k : échelle d'affichage */
function portBadges(el, k, ctx, hi) {
  ctx = ctx || buildCtx(); if (hi == null) hi = state.hiPort && state.hiPort.id === el.id ? state.hiPort.i : -1;
  const d = S[el.type], side = d.inline || d.pin; let s = '';
  portsW(el).forEach((q, i) => {
    let [vx, vy] = portVec(el, i);
    if (side) [vx, vy] = Math.abs(vx) >= Math.abs(vy) ? [0, -1] : [-1, 0];
    const n = netAt(ctx, q), r = r2(7 / k), cx = r2(q.x + vx * 15 / k), cy = r2(q.y + vy * 15 / k);
    s += `<line x1="${q.x}" y1="${q.y}" x2="${cx}" y2="${cy}" class="badge-lead" stroke-width="${r2(1 / k)}"/>`;
    if (i === hi) s += `<circle cx="${q.x}" cy="${q.y}" r="${r2(8 / k)}" fill="none" style="stroke:var(--sel)" stroke-width="${r2(2.4 / k)}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${i === hi ? r2(8.5 / k) : r}" class="badge${n ? ' ok' : ''}"${n ? ` style="fill:${n.color}"` : ''} stroke-width="${r2(1.4 / k)}"/>`;
    s += `<text x="${cx}" y="${cy}" class="badge-t${n ? ' ok' : ''}" font-size="${r2(8.5 / k)}" font-weight="700" font-family="Arial, Helvetica, sans-serif" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`;
  });
  return s;
}
function updateGrid() {
  const g = $('#gridrect'), r = svg.getBoundingClientRect(), k = view.k;
  if (!state.grid) { g.setAttribute('display', 'none'); return; } g.removeAttribute('display');
  g.setAttribute('x', r2(-view.tx / k - 50)); g.setAttribute('y', r2(-view.ty / k - 50)); g.setAttribute('width', r2(r.width / k + 100)); g.setAttribute('height', r2(r.height / k + 100));
  let s = `<path d="M0,0H50M0,0V50" fill="none" style="stroke:var(--grid-line)" stroke-width="${r2(1 / k)}"/>`;
  if (k >= 0.55) { const rr = r2(0.9 / k); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (i || j) s += `<circle cx="${i * 10}" cy="${j * 10}" r="${rr}" style="fill:var(--grid-dot)"/>`; }
  $('#gp').innerHTML = s;
}
function applyView() { VP.setAttribute('transform', `translate(${r2(view.tx)} ${r2(view.ty)}) scale(${r2(view.k * 1000) / 1000})`); updateGrid(); renderUI(); $('#zoomv').textContent = Math.round(view.k * 100) + ' %'; }
function toWorld(cx, cy) { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - view.tx) / view.k, y: (cy - r.top - view.ty) / view.k }; }
function zoomAt(cx, cy, f) { const r = svg.getBoundingClientRect(), px = cx - r.left, py = cy - r.top, k = clamp(view.k * f, 0.15, 6), wx = (px - view.tx) / view.k, wy = (py - view.ty) / view.k; view.k = k; view.tx = px - wx * k; view.ty = py - wy * k; applyView(); }
function zoomCenter(f) { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }
function fitView() {
  const r = svg.getBoundingClientRect(), b = contentBBox(buildCtx());
  if (!b || r.width < 10) { view.k = 1.5; view.tx = 60; view.ty = 60; applyView(); return; }
  const pad = 36, k = clamp(Math.min((r.width - pad * 2) / Math.max(b.x1 - b.x0, 1), (r.height - pad * 2) / Math.max(b.y1 - b.y0, 1)), 0.2, 2.5);
  view.k = k; view.tx = r.width / 2 - (b.x0 + b.x1) / 2 * k; view.ty = r.height / 2 - (b.y0 + b.y1) / 2 * k; applyView();
}

/* ===== Historique ===== */
const hist = { u: [], r: [] };
const snapshot = () => JSON.stringify(doc);
function commit(before) { if (before != null && before !== snapshot()) { hist.u.push(before); if (hist.u.length > 200) hist.u.shift(); hist.r.length = 0; } scheduleSave(); render(); updateUndo(); if (IB.querySelector('.racc')) buildInspector(); }
function restoreSnap(s) { doc = JSON.parse(s); for (const id of [...state.sel]) if (!byId(id)) state.sel.delete(id); scheduleSave(); render(); buildInspector(); updateUndo(); syncDocName(); }
function undo() { if (state.draft) { cancelDraft(); return; } if (!hist.u.length) return; hist.r.push(snapshot()); restoreSnap(hist.u.pop()); }
function redo() { if (!hist.r.length) return; hist.u.push(snapshot()); restoreSnap(hist.r.pop()); }
function updateUndo() { $('#b-undo').disabled = !hist.u.length; $('#b-redo').disabled = !hist.r.length; }

/* ===== Outils et sélection ===== */
function setSel(ids) { state.sel = new Set(ids.filter(id => byId(id))); buildInspector(); render(); }
function toggleSel(id) { if (state.sel.has(id)) state.sel.delete(id); else state.sel.add(id); buildInspector(); render(); }
function setTool(t) { if (state.draft && t !== 'pipe') finishDraft(); state.tool = t; if (t !== 'place') { state.pre = null; state.ghost = null; } state.snap = null; updateToolUI(); renderUI(); updateHint(); }
function updateToolUI() {
  svg.setAttribute('class', 't-' + state.tool + (state.space ? ' pan-ready' : ''));
  $('#empty').hidden = doc.items.length > 0 || state.tool !== 'select';
  for (const b of $$('[data-tool]')) b.classList.toggle('on', b.dataset.tool === state.tool);
  for (const b of $$('.tile')) b.classList.toggle('on', state.tool === 'place' ? b.dataset.k === state.pre : (state.tool === 'text' && b.dataset.k === '@text') || (state.tool === 'zone' && b.dataset.k === '@zone'));
}
function startPlace(k) {
  if (state.draft) finishDraft();
  state.tool = 'place'; state.pre = k; state.gRot = 0; state.gFh = false;
  state.ghost = k === '@legend' ? makeLegend(0, 0) : k === '@nomen' ? makeNomen(0, 0) : k === '@cart' ? makeCart(0, 0) : makeEl(k, 0, 0, true);
  if (state.mouse) moveGhost(state.mouse);
  if (state.sel.size) setSel([]);
  updateToolUI(); renderUI(); updateHint();
}
function moveGhost(w) { const g = state.ghost; if (!g) return; g.x = snap(w.x); g.y = snap(w.y); if (g.kind === 'el') { g.rot = state.gRot; g.fh = state.gFh; magnetize(g, { rot: state.gRot, fh: state.gFh }, true); } }
function placeDown(e, w) {
  moveGhost(w); const g = state.ghost; if (!g) return;
  const before = snapshot(); let it;
  if (g.kind === 'el') { it = makeEl(state.pre, g.x, g.y); it.rot = g.rot; it.fh = g.fh; } else it = Object.assign(clone(g), { id: uid() });
  doc.items.push(it); commit(before);
  if (g.kind !== 'el' || e.pointerType === 'touch') setTool('select');
  setSel([it.id]);
}

/* Aimantation : un symbole en ligne se pose sur le tuyau et prend le sens d'écoulement */
function magnetize(el, og, force) {
  const def = S[el.type]; if (!def.inline && !def.pin) return false;
  const R = 10 / view.k + 1; let best = null;
  for (const p of pipes()) for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], b = p.pts[i + 1], r = distPtSeg(el, a, b); if (r.d <= R && (!best || r.d < best.d)) best = { d: r.d, x: r.x, y: r.y, a, b }; }
  if (!best) return false;
  const dir = segDir(best.a, best.b);
  if (dir === 'h') { el.y = best.a.y; el.x = clamp(el.x, Math.min(best.a.x, best.b.x), Math.max(best.a.x, best.b.x)); }
  else if (dir === 'v') { el.x = best.a.x; el.y = clamp(el.y, Math.min(best.a.y, best.b.y), Math.max(best.a.y, best.b.y)); }
  else { el.x = r2(best.x); el.y = r2(best.y); }
  const ang = Math.atan2(best.b.y - best.a.y, best.b.x - best.a.x), ux = Math.cos(ang), uy = Math.sin(ang), ax = def.inline ? [1, 0] : def.pin;
  const v = rotv(og.fh ? -ax[0] : ax[0], ax[1], og.rot || 0), parallel = Math.abs(v[0] * uy - v[1] * ux) < 0.05;
  if (def.inline && (force || !parallel)) { let r0, f0; if (dir === 'h') { r0 = 0; f0 = ux < 0; } else if (dir === 'v') { r0 = 90; f0 = uy < 0; } else { r0 = norm360(ang * 180 / Math.PI); f0 = false; } if (force) { el.rot = norm360(r0 + (f0 ? -(og.rot || 0) : (og.rot || 0))); el.fh = f0 !== !!og.fh; } else { el.rot = r0; el.fh = f0; } }
  else if (def.pin && parallel) { el.rot = dir === 'h' ? 0 : dir === 'v' ? 90 : norm360(ang * 180 / Math.PI); el.fh = og.fh; }
  return true;
}

/* ===== Raccordements : extrémités de tuyaux qui suivent les éléments ===== */
function findAtt(items, selIds) {
  const ports = [], mp = items.filter(i => i.kind === 'pipe'), res = [];
  for (const it of items) if (it.kind === 'el') for (const p of portsW(it)) ports.push(p);
  for (const p of pipes()) {
    if (selIds.has(p.id)) continue;
    const ends = [];
    for (const ei of [0, p.pts.length - 1]) { const q = p.pts[ei]; if (ports.some(pp => near(pp, q)) || mp.some(m => onPoly(q, m.pts))) ends.push(ei); }
    if (ends.length) res.push({ pipe: p, ends, orig: clone(p.pts) });
  }
  return res;
}
function applyAtt(a, dx, dy) {
  const o = a.orig, n = o.length, pts = clone(o);
  if (a.ends.length === 2) { a.pipe.pts = pts.map(q => ({ x: r2(q.x + dx), y: r2(q.y + dy) })); return; }
  const i = a.ends[0], j = i === 0 ? 1 : n - 2, dir = segDir(o[i], o[j]);
  pts[i] = { x: r2(o[i].x + dx), y: r2(o[i].y + dy) };
  if (n === 2) {
    const A = pts[i], B = pts[j];
    if (Math.abs(A.x - B.x) > 0.01 && Math.abs(A.y - B.y) > 0.01 && (dir === 'h' || dir === 'v')) {
      let m1, m2;
      if (dir === 'h') { const mx = snap((A.x + B.x) / 2); m1 = { x: mx, y: A.y }; m2 = { x: mx, y: B.y }; } else { const my = snap((A.y + B.y) / 2); m1 = { x: A.x, y: my }; m2 = { x: B.x, y: my }; }
      a.pipe.pts = i === 0 ? [A, m1, m2, B] : [B, m2, m1, A]; return;
    }
    a.pipe.pts = pts; return;
  }
  if (dir === 'h') pts[j] = { x: pts[j].x, y: pts[i].y }; else if (dir === 'v') pts[j] = { x: pts[i].x, y: pts[j].y };
  a.pipe.pts = pts;
}
function ridersOf(mp, selIds) { if (!mp.length) return []; return els().filter(el => !selIds.has(el.id) && (S[el.type].inline || S[el.type].pin) && mp.some(p => onPoly(el, p.pts))).map(el => ({ el, ox: el.x, oy: el.y })); }
function moveEnd(pipe, ei, dx, dy) { const idx = ei === 0 ? 0 : pipe.pts.length - 1; applyAtt({ pipe, ends: [idx], orig: clone(pipe.pts) }, dx, dy); pipe.pts = simplify(pipe.pts); }
const geomOf = it => it.kind === 'pipe' ? { pts: clone(it.pts) } : { x: it.x, y: it.y, rot: it.rot, fh: it.fh };
function setGeom(it, g, dx, dy) { if (g.pts) it.pts = g.pts.map(q => ({ x: r2(q.x + dx), y: r2(q.y + dy) })); else { it.x = r2(g.x + dx); it.y = r2(g.y + dy); if (it.kind === 'el') { it.rot = g.rot; it.fh = g.fh; } } }

/* ===== Pointeur ===== */
const touches = new Map(); let pinch = null, lastDown = { t: 0, x: 0, y: 0 };
svg.addEventListener('contextmenu', e => e.preventDefault());
svg.addEventListener('pointerdown', onDown);
svg.addEventListener('pointermove', onMove);
svg.addEventListener('pointerup', onUp);
svg.addEventListener('pointercancel', onUp);
svg.addEventListener('pointerleave', () => { if (!drag) { state.mouseIn = false; state.snap = null; renderUI(); } });
svg.addEventListener('wheel', e => {
  e.preventDefault(); let dx = e.deltaX, dy = e.deltaY; if (e.deltaMode === 1) { dx *= 16; dy *= 16; } else if (e.deltaMode === 2) { dx *= 400; dy *= 400; }
  if (e.shiftKey && !e.ctrlKey) { view.tx -= dx || dy; if (dx) view.ty -= dy; applyView(); return; }
  zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0017)));
}, { passive: false });
function onDown(e) {
  closeMenu(); app.classList.remove('show-pal', 'show-insp');
  if (e.pointerType === 'touch') { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { abortDrag(); if (state.draft && state.draft.pts.length <= 1) cancelDraft(); startPinch(); return; } if (touches.size > 2) return; }
  if (e.button === 2) { if (state.draft) finishDraft(); else if (state.tool !== 'select') setTool('select'); return; }
  if (e.button !== 0 && e.button !== 1) return;
  try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  const w = toWorld(e.clientX, e.clientY); state.mouse = w; state.mouseIn = true;
  const now = performance.now(), dbl = now - lastDown.t < 380 && Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 8;
  lastDown = { t: dbl ? 0 : now, x: e.clientX, y: e.clientY };
  if (e.button === 1 || state.space || state.tool === 'hand') { startPan(e); return; }
  if (state.tool === 'pipe') return pipeDown(e, w, dbl);
  if (state.tool === 'place') return placeDown(e, w);
  if (state.tool === 'text') return textDown(w);
  if (state.tool === 'zone') { drag = { kind: 'zoneNew', before: snapshot(), s: { x: snap(w.x), y: snap(w.y) }, z: null }; return; }
  selectDown(e, w, dbl);
}
function onMove(e) {
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch) { doPinch(); return; } }
  const w = toWorld(e.clientX, e.clientY); state.mouse = w; state.mouseIn = true;
  if (drag) { dragMove(e, w); showCoords(w); return; }
  if (state.tool === 'pipe') { state.snap = e.altKey ? gridSnap(w) : pipeSnap(w); if (state.draft) state.draft.preview = route(state.snap, e); renderUI(); }
  else if (state.tool === 'place' && state.ghost) { moveGhost(w); renderUI(); }
  showCoords(w);
}
function onUp(e) {
  if (e.pointerType === 'touch') { touches.delete(e.pointerId); if (pinch) { if (touches.size < 2) pinch = null; return; } }
  try { svg.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  if (!drag) return;
  const d = drag; drag = null; svg.classList.remove('panning'); dragEnd(d);
}
function abortDrag() { if (drag && drag.before && (drag.moved || drag.kind === 'zoneNew')) { doc = JSON.parse(drag.before); render(); } drag = null; }
function startPan(e) { drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty }; svg.classList.add('panning'); }
function startPinch() { const [a, b] = [...touches.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: view.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx0: view.tx, ty0: view.ty }; }
function doPinch() {
  const [a, b] = [...touches.values()], r = svg.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const k = clamp(pinch.k0 * d / pinch.d0, 0.15, 6), wx = (pinch.cx - r.left - pinch.tx0) / pinch.k0, wy = (pinch.cy - r.top - pinch.ty0) / pinch.k0;
  view.k = k; view.tx = cx - r.left - wx * k; view.ty = cy - r.top - wy * k; applyView();
}
function selectDown(e, w, dbl) {
  const t = e.target.closest ? e.target.closest('[data-hit]') : null, hit = t ? t.dataset.hit : null, id = t ? t.dataset.id : null;
  if (hit === 'vh' && dbl) { deleteVertex(byId(id), +t.dataset.i); return; }
  if (hit === 'vh' || hit === 'sh' || hit === 'zh') { startHandle(e, w, t); return; }
  if (dbl && id && byId(id)) { onDouble(byId(id), w); return; }
  if (hit === 'label') { const el = byId(id); if (!el) return; if (!state.sel.has(id)) setSel([id]); drag = { kind: 'label', before: snapshot(), el, start: w, ox: el.lx || 0, oy: el.ly || 0, moved: false }; return; }
  if (id && byId(id)) {
    if (e.shiftKey) { toggleSel(id); return; }
    let clickSel = null; if (!state.sel.has(id)) setSel([id]); else if (state.sel.size > 1) clickSel = id;
    startMove(e, w, e.altKey, clickSel); return;
  }
  if (!e.shiftKey && state.sel.size) setSel([]);
  if (e.pointerType === 'touch') startPan(e); else drag = { kind: 'rubber', start: w, cur: w, add: e.shiftKey, base: new Set(state.sel) };
}
function startMove(e, w, dup, clickSel) {
  const before = snapshot();
  if (dup) { const ids = insertCopies(clone(selItems()), 0, 0); state.sel = new Set(ids); buildInspector(); }
  const items = selItems(); if (!items.length) return;
  const selIds = new Set(items.map(i => i.id)), single = items.length === 1 ? items[0] : null;
  drag = { kind: 'move', before, start: w, sx: e.clientX, sy: e.clientY, items, orig: new Map(items.map(it => [it.id, geomOf(it)])), att: findAtt(items, selIds), riders: ridersOf(items.filter(i => i.kind === 'pipe'), selIds),
    single: single && single.kind === 'el' ? single : null, anchor: single ? (single.kind === 'pipe' ? { x: single.pts[0].x, y: single.pts[0].y } : { x: single.x, y: single.y }) : null, moved: false, dup, clickSel };
}
function dragMove(e, w) {
  const d = drag;
  if (d.kind === 'pan') { view.tx = d.tx + e.clientX - d.sx; view.ty = d.ty + e.clientY - d.sy; applyView(); return; }
  if (d.kind === 'rubber') { d.cur = w; renderUI(); return; }
  if (d.kind === 'label') { if (!d.moved && Math.hypot(w.x - d.start.x, w.y - d.start.y) * view.k < 3) return; d.moved = true; d.el.lx = r2(d.ox + w.x - d.start.x); d.el.ly = r2(d.oy + w.y - d.start.y); render(); return; }
  if (d.kind === 'move') {
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return; d.moved = true;
    let dx = w.x - d.start.x, dy = w.y - d.start.y;
    if (e.shiftKey) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
    if (d.anchor) { dx = snap(d.anchor.x + dx) - d.anchor.x; dy = snap(d.anchor.y + dy) - d.anchor.y; } else { dx = snap(dx); dy = snap(dy); }
    for (const it of d.items) setGeom(it, d.orig.get(it.id), dx, dy);
    if (d.single && !d.att.length && magnetize(d.single, d.orig.get(d.single.id))) { dx = d.single.x - d.anchor.x; dy = d.single.y - d.anchor.y; }
    for (const r of d.riders) { r.el.x = r2(r.ox + dx); r.el.y = r2(r.oy + dy); }
    for (const a of d.att) applyAtt(a, dx, dy);
    render(); return;
  }
  if (d.kind === 'vertex') {
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return; d.moved = true;
    const n = d.p.pts.length, end = d.i === 0 || d.i === n - 1, t = end && !e.altKey ? pipeSnap(w, d.p) : gridSnap(w);
    d.p.pts[d.i] = { x: t.x, y: t.y }; state.snap = end ? t : null; render(); return;
  }
  if (d.kind === 'segment') {
    const delta = d.horiz ? snap(w.y - d.start.y) : snap(w.x - d.start.x); if (!d.moved && delta === 0) return; d.moved = true;
    const pts = clone(d.base); if (d.horiz) { pts[d.si].y += delta; pts[d.si + 1].y += delta; } else { pts[d.si].x += delta; pts[d.si + 1].x += delta; }
    d.p.pts = pts; const dx = d.horiz ? 0 : delta, dy = d.horiz ? delta : 0;
    for (const r of d.riders) { r.el.x = r2(r.ox + dx); r.el.y = r2(r.oy + dy); }
    for (const a of d.att) applyAtt(a, dx, dy);
    render(); return;
  }
  if (d.kind === 'zone') {
    const o = d.o, sx = snap(w.x), sy = snap(w.y); let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
    if (d.c.includes('w')) x0 = Math.min(sx, x1 - 40); if (d.c.includes('e')) x1 = Math.max(sx, x0 + 40); if (d.c.includes('n')) y0 = Math.min(sy, y1 - 40); if (d.c.includes('s')) y1 = Math.max(sy, y0 + 40);
    Object.assign(d.z, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); d.moved = true; render(); return;
  }
  if (d.kind === 'zoneNew') {
    const x = snap(w.x), y = snap(w.y);
    if (!d.z) { if (Math.abs(x - d.s.x) < 10 && Math.abs(y - d.s.y) < 10) return; d.z = makeZone(d.s.x, d.s.y, 10, 10); doc.items.unshift(d.z); }
    Object.assign(d.z, { x: Math.min(x, d.s.x), y: Math.min(y, d.s.y), w: Math.max(10, Math.abs(x - d.s.x)), h: Math.max(10, Math.abs(y - d.s.y)) }); render();
  }
}
function dragEnd(d) {
  if (d.kind === 'rubber') { rubberEnd(d); return; }
  if (d.kind === 'move') { if (d.moved || d.dup) { for (const a of d.att) a.pipe.pts = simplify(a.pipe.pts); for (const it of d.items) if (it.kind === 'pipe') it.pts = simplify(it.pts); commit(d.before); } else if (d.clickSel) setSel([d.clickSel]); return; }
  if (d.kind === 'label' || d.kind === 'zone') { if (d.moved) commit(d.before); return; }
  if (d.kind === 'vertex') { state.snap = null; if (d.moved) { d.p.pts = simplify(d.p.pts); if (d.p.pts.length < 2) { doc.items = doc.items.filter(i => i !== d.p); state.sel.delete(d.p.id); } commit(d.before); } else renderUI(); return; }
  if (d.kind === 'segment') { if (d.moved) { d.p.pts = simplify(d.p.pts); for (const a of d.att) a.pipe.pts = simplify(a.pipe.pts); commit(d.before); } return; }
  if (d.kind === 'zoneNew') { let z = d.z; if (!z) { z = makeZone(d.s.x, d.s.y); doc.items.unshift(z); } z.w = Math.max(40, z.w); z.h = Math.max(40, z.h); commit(d.before); setTool('select'); setSel([z.id]); focusField('title', true); }
}
function startHandle(e, w, t) {
  const it = byId(t.dataset.id); if (!it) return; const i = +t.dataset.i, before = snapshot();
  if (t.dataset.hit === 'vh') { drag = { kind: 'vertex', before, p: it, i, sx: e.clientX, sy: e.clientY, moved: false }; renderUI(); return; }
  if (t.dataset.hit === 'zh') { drag = { kind: 'zone', before, z: it, c: t.dataset.c, o: { x: it.x, y: it.y, w: it.w, h: it.h }, moved: false }; return; }
  const a0 = it.pts[i], b0 = it.pts[i + 1]; if (!a0 || !b0) return;
  const pts = clone(it.pts); let si = i;
  if (si === 0) { pts.unshift({ x: pts[0].x, y: pts[0].y }); si = 1; }
  if (si + 1 === pts.length - 1) pts.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
  const att = [];
  for (const o of pipes()) { if (o === it) continue; const ends = []; for (const ei of [0, o.pts.length - 1]) if (distPtSeg(o.pts[ei], a0, b0).d < 0.6) ends.push(ei); if (ends.length) att.push({ pipe: o, ends, orig: clone(o.pts) }); }
  const riders = els().filter(el => (S[el.type].inline || S[el.type].pin) && distPtSeg(el, a0, b0).d < 0.6).map(el => ({ el, ox: el.x, oy: el.y }));
  drag = { kind: 'segment', before, p: it, si, base: pts, horiz: segDir(a0, b0) === 'h', start: w, att, riders, moved: false };
}
function segRect(a, b, x0, y0, x1, y1) {
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y, Pp = [-dx, dx, -dy, dy], Q = [a.x - x0, x1 - a.x, a.y - y0, y1 - a.y];
  for (let i = 0; i < 4; i++) { if (Pp[i] === 0) { if (Q[i] < 0) return false; } else { const r = Q[i] / Pp[i]; if (Pp[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } } }
  return true;
}
function rubberEnd(d) {
  const x0 = Math.min(d.start.x, d.cur.x), x1 = Math.max(d.start.x, d.cur.x), y0 = Math.min(d.start.y, d.cur.y), y1 = Math.max(d.start.y, d.cur.y);
  if ((x1 - x0) * view.k < 3 && (y1 - y0) * view.k < 3) { renderUI(); return; }
  const cross = d.cur.x < d.start.x, ctx = buildCtx(), ids = new Set(d.add ? d.base : []);
  for (const it of doc.items) {
    let hit;
    if (it.kind === 'pipe') hit = cross ? it.pts.some((q, i) => i < it.pts.length - 1 && segRect(q, it.pts[i + 1], x0, y0, x1, y1)) : it.pts.every(q => q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1);
    else { const b = bboxOf(it, ctx), inter = !(b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1), inside = b.x0 >= x0 && b.x1 <= x1 && b.y0 >= y0 && b.y1 <= y1; hit = cross ? inter && !(it.kind === 'zone' && x0 > b.x0 && x1 < b.x1 && y0 > b.y0 && y1 < b.y1) : inside; }
    if (hit) ids.add(it.id);
  }
  setSel([...ids]);
}
function onDouble(it, w) {
  setSel([it.id]);
  if (it.kind === 'pipe') { insertVertex(it, w); return; }
  if (it.kind === 'el') { const d = S[it.type]; focusField(d.params && d.params.txt ? 'p-txt' : 'tag', true); return; }
  focusField(it.kind === 'text' ? 'txt' : it.kind === 'cart' ? 'f-titre' : 'title', true);
}
function insertVertex(p, w) {
  let bi = -1, bd = Infinity, bp = null;
  for (let i = 0; i < p.pts.length - 1; i++) { const r = distPtSeg(w, p.pts[i], p.pts[i + 1]); if (r.d < bd) { bd = r.d; bi = i; bp = r; } }
  if (bi < 0) return; const a = p.pts[bi], b = p.pts[bi + 1], sd = segDir(a, b);
  const q = sd === 'h' ? { x: snap(bp.x), y: a.y } : sd === 'v' ? { x: a.x, y: snap(bp.y) } : { x: r2(bp.x), y: r2(bp.y) };
  if (near(q, a) || near(q, b)) return;
  const before = snapshot(); p.pts.splice(bi + 1, 0, q); commit(before); toast('Point ajouté : faites-le glisser pour créer un coude.');
}
function deleteVertex(p, i) { if (!p || p.pts.length <= 2) return; const before = snapshot(); p.pts.splice(i, 1); p.pts = simplify(p.pts); commit(before); }
function textDown(w) { const before = snapshot(), t = makeText(snap(w.x), snap(w.y)); doc.items.push(t); commit(before); setTool('select'); setSel([t.id]); focusField('txt', true); }

/* ===== Tracé des tuyauteries ===== */
const gridSnap = w => ({ x: snap(w.x), y: snap(w.y), kind: 'grid' });
function pipeSnap(w, exclude) {
  const R = 12 / view.k; let best = null;
  for (const el of els()) { const ps = portsOf(el); for (let i = 0; i < ps.length; i++) { const q = xf(el, ps[i][0], ps[i][1]), dd = Math.hypot(q.x - w.x, q.y - w.y); if (dd <= R && (!best || dd < best.d)) best = { d: dd, x: q.x, y: q.y, kind: 'port', el, i }; } }
  if (best) return best;
  for (const p of pipes()) { if (p === exclude) continue; for (const q of p.pts) { const dd = Math.hypot(q.x - w.x, q.y - w.y); if (dd <= R * 0.8 && (!best || dd < best.d)) best = { d: dd, x: q.x, y: q.y, kind: 'vertex', pipe: p }; } }
  if (best) return best;
  for (const p of pipes()) {
    if (p === exclude) continue;
    for (let i = 0; i < p.pts.length - 1; i++) {
      const a = p.pts[i], b = p.pts[i + 1], r = distPtSeg(w, a, b);
      if (r.d <= R * 0.7 && (!best || r.d < best.d)) { const sd = segDir(a, b); let x = r.x, y = r.y; if (sd === 'h') { x = clamp(snap(x), Math.min(a.x, b.x), Math.max(a.x, b.x)); y = a.y; } else if (sd === 'v') { y = clamp(snap(y), Math.min(a.y, b.y), Math.max(a.y, b.y)); x = a.x; } best = { d: r.d, x: r2(x), y: r2(y), kind: 'pipe', pipe: p, seg: [a, b] }; }
    }
  }
  return best || gridSnap(w);
}
function route(t, e) {
  const d = state.draft, last = d.pts[d.pts.length - 1];
  if (e && e.shiftKey) {
    const dx = t.x - last.x, dy = t.y - last.y, a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), ux = Math.round(Math.cos(a)), uy = Math.round(Math.sin(a));
    const L = ux && uy ? snap((Math.abs(dx) + Math.abs(dy)) / 2) : snap(ux ? Math.abs(dx) : Math.abs(dy));
    return [{ x: last.x + ux * L, y: last.y + uy * L }];
  }
  if (Math.abs(t.x - last.x) < 0.01 || Math.abs(t.y - last.y) < 0.01) return [{ x: t.x, y: t.y }];
  let sA = null, eA = null;
  if (d.pts.length === 1) { if (d.start && d.start.kind === 'port') sA = portDir(d.start.el, d.start.i); else if (d.start && d.start.kind === 'pipe') sA = segDir(d.start.seg[0], d.start.seg[1]) === 'h' ? 'v' : 'h'; }
  else { const sd = segDir(d.pts[d.pts.length - 2], last); sA = sd === 'h' ? 'v' : sd === 'v' ? 'h' : null; }
  if (t.kind === 'port') eA = portDir(t.el, t.i); else if (t.kind === 'pipe' && t.seg) eA = segDir(t.seg[0], t.seg[1]) === 'h' ? 'v' : 'h';
  if (sA && eA && sA === eA && !d.flip) {
    if (sA === 'h') { const mx = snap((last.x + t.x) / 2); return [{ x: mx, y: last.y }, { x: mx, y: t.y }, { x: t.x, y: t.y }]; }
    const my = snap((last.y + t.y) / 2); return [{ x: last.x, y: my }, { x: t.x, y: my }, { x: t.x, y: t.y }];
  }
  let hF = sA ? sA === 'h' : eA ? eA === 'v' : Math.abs(t.x - last.x) >= Math.abs(t.y - last.y);
  if (d.flip) hF = !hF;
  return [hF ? { x: t.x, y: last.y } : { x: last.x, y: t.y }, { x: t.x, y: t.y }];
}
function pipeDown(e, w, dbl) {
  const t = e.altKey ? gridSnap(w) : pipeSnap(w), d = state.draft;
  if (!d) { if (dbl) return; state.draft = { pts: [{ x: t.x, y: t.y }], net: state.activeNet, flip: false, start: t, preview: null }; state.snap = t; showDraftBar(); renderUI(); updateHint(); return; }
  for (const q of route(t, e)) d.pts.push({ x: q.x, y: q.y });
  d.pts = simplify(d.pts); d.preview = null;
  if (dbl || (t.kind !== 'grid' && d.pts.length >= 2)) { finishDraft(); return; }
  renderUI();
}
function finishDraft() {
  const d = state.draft; if (!d) return; state.draft = null; state.snap = null; showDraftBar(); updateHint();
  const pts = simplify(d.pts);
  if (pts.length >= 2) { const before = snapshot(); doc.items.push({ id: uid(), kind: 'pipe', net: d.net, pts, dn: '', lab: false, lp: 0.5, arr: false, txt: '' }); commit(before); } else renderUI();
}
function cancelDraft() { state.draft = null; state.snap = null; showDraftBar(); renderUI(); updateHint(); }
function popDraft() { const d = state.draft; if (!d) return; if (d.pts.length <= 1) { cancelDraft(); return; } d.pts.pop(); d.preview = state.mouse ? route(state.snap || gridSnap(state.mouse)) : null; renderUI(); }
function showDraftBar() { $('#draftbar').hidden = !state.draft; }

/* ===== Orientation ===== */
function rotateCmd(deg) {
  if (state.tool === 'place' && state.ghost) { if (state.ghost.kind === 'el') { state.gRot = norm360(state.gRot + deg); if (state.mouse) moveGhost(state.mouse); renderUI(); } return; }
  const items = selItems(); if (!items.length) { toast('Sélectionnez d’abord un élément à orienter.'); return; }
  const before = snapshot();
  if (items.length === 1 && items[0].kind === 'el') transformEl(items[0], el => { el.rot = norm360((el.rot || 0) + deg); }); else transformGroup(items, 'rot', deg);
  commit(before); buildInspector();
}
function flipCmd(axis) {
  if (state.tool === 'place' && state.ghost) { if (state.ghost.kind === 'el') { state.gFh = !state.gFh; if (axis === 'v') state.gRot = norm360(state.gRot + 180); if (state.mouse) moveGhost(state.mouse); renderUI(); } return; }
  const items = selItems(); if (!items.length) { toast('Sélectionnez d’abord un élément.'); return; }
  const before = snapshot();
  if (items.length === 1 && items[0].kind === 'el') transformEl(items[0], el => { el.fh = !el.fh; if (axis === 'v') el.rot = norm360((el.rot || 0) + 180); }); else transformGroup(items, axis === 'h' ? 'mh' : 'mv');
  commit(before); buildInspector();
}
function transformEl(el, fn) {
  const ends = []; for (const a of findAtt([el], new Set([el.id]))) for (const ei of a.ends) ends.push({ a, ei, q: a.orig[ei] });
  fn(el); el.lx = 0; el.ly = 0;
  const np = portsW(el), used = new Set();
  for (const en of ends) { const j = np.findIndex((pp, k) => !used.has(k) && near(pp, en.q)); if (j >= 0) { used.add(j); en.done = true; } }
  for (const en of ends) {
    if (en.done) continue; let bj = -1, bd = Infinity;
    np.forEach((pp, k) => { if (used.has(k)) return; const dd = Math.hypot(pp.x - en.q.x, pp.y - en.q.y); if (dd < bd) { bd = dd; bj = k; } });
    if (bj >= 0) { used.add(bj); moveEnd(en.a.pipe, en.ei, np[bj].x - en.q.x, np[bj].y - en.q.y); }
  }
}
function transformGroup(items0, kind, deg) {
  const selIds = new Set(items0.map(i => i.id)), riders = ridersOf(items0.filter(i => i.kind === 'pipe'), selIds).map(r => r.el), items = items0.concat(riders);
  for (const r of riders) selIds.add(r.id);
  const ctx = buildCtx(); let b = null;
  for (const it of items) { const q = bboxOf(it, ctx); b = b ? { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) } : Object.assign({}, q); }
  const cx = snap((b.x0 + b.x1) / 2), cy = snap((b.y0 + b.y1) / 2);
  const map = (x, y) => { let dx = x - cx, dy = y - cy; if (kind === 'rot') [dx, dy] = rotv(dx, dy, deg); else if (kind === 'mh') dx = -dx; else dy = -dy; return { x: r2(cx + dx), y: r2(cy + dy) }; };
  const recs = [];
  for (const a of findAtt(items, selIds)) for (const ei of a.ends) { const q = a.orig[ei]; let ref = null; for (const it of items) if (it.kind === 'el') { const k = portsW(it).findIndex(pp => near(pp, q)); if (k >= 0) { ref = { el: it, k }; break; } } recs.push({ pipe: a.pipe, ei, q, ref }); }
  for (const it of items) {
    if (it.kind === 'el') { const p = map(it.x, it.y); it.x = p.x; it.y = p.y; if (kind === 'rot') it.rot = norm360((it.rot || 0) + deg); else { it.fh = !it.fh; it.rot = norm360(kind === 'mh' ? -(it.rot || 0) : 180 - (it.rot || 0)); } it.lx = 0; it.ly = 0; }
    else if (it.kind === 'pipe') it.pts = it.pts.map(q => map(q.x, q.y));
    else if (it.kind === 'zone') { const c1 = map(it.x, it.y), c2 = map(it.x + it.w, it.y + it.h); it.x = Math.min(c1.x, c2.x); it.y = Math.min(c1.y, c2.y); it.w = Math.abs(c2.x - c1.x); it.h = Math.abs(c2.y - c1.y); }
    else { const q = bboxOf(it, ctx), mx = (q.x0 + q.x1) / 2, my = (q.y0 + q.y1) / 2, mc = map(mx, my); it.x = snap(it.x + mc.x - mx); it.y = snap(it.y + mc.y - my); }
  }
  for (const r of recs) { const np = r.ref ? portsW(r.ref.el)[r.ref.k] : map(r.q.x, r.q.y); if (np) moveEnd(r.pipe, r.ei, np.x - r.q.x, np.y - r.q.y); }
}

/* ===== Édition ===== */
let clip = null, pasteN = 0;
function deleteSel() { if (!state.sel.size) return; const before = snapshot(), ids = state.sel; doc.items = doc.items.filter(i => !ids.has(i.id)); state.sel = new Set(); commit(before); buildInspector(); }
function copySel() { const it = selItems(); if (!it.length) return; clip = clone(it); pasteN = 0; toast(it.length > 1 ? it.length + ' éléments copiés' : 'Élément copié'); }
function paste() { if (!clip) return; pasteN++; const before = snapshot(), ids = insertCopies(clone(clip), 20 * pasteN, 20 * pasteN); commit(before); setSel(ids); }
function duplicateSel() { const it = selItems(); if (!it.length) return; const before = snapshot(), ids = insertCopies(clone(it), 20, 20); commit(before); setSel(ids); }
function insertCopies(list, dx, dy) {
  const ids = [];
  for (const it of list) {
    it.id = uid();
    if (it.pts) it.pts = it.pts.map(q => ({ x: q.x + dx, y: q.y + dy })); else { it.x += dx; it.y += dy; }
    if (it.kind === 'el') { const pf = prefixOf(it); if (pf && (!it.tag || new RegExp('^' + reEsc(pf) + '\\d+$').test(it.tag))) it.tag = nextTag(pf); }
    if (it.kind === 'zone') doc.items.unshift(it); else doc.items.push(it);
    ids.push(it.id);
  }
  return ids;
}
function zorder(front) { if (!state.sel.size) return; const before = snapshot(), ids = state.sel, a = doc.items.filter(i => ids.has(i.id)), b = doc.items.filter(i => !ids.has(i.id)); doc.items = front ? b.concat(a) : a.concat(b); commit(before); }
function renumber() {
  const before = snapshot(), cnt = new Map();
  for (const e of els().slice().sort((a, b) => (Math.round(a.y / 100) - Math.round(b.y / 100)) || (a.x - b.x))) { const pf = prefixOf(e); if (!pf || (e.tag && !new RegExp('^' + reEsc(pf) + '\\d+$').test(e.tag))) continue; const n = (cnt.get(pf) || 0) + 1; cnt.set(pf, n); e.tag = pf + n; }
  commit(before); buildInspector(); toast('Repères renumérotés de gauche à droite.');
}
function alignEls(axis) { const es = selItems().filter(i => i.kind === 'el'); if (es.length < 2) return; const before = snapshot(), v = es[0][axis]; for (const e of es) e[axis] = v; commit(before); }
function nudge(dx, dy) {
  const items = selItems(); if (!items.length) return; const before = snapshot(), selIds = new Set(items.map(i => i.id)), att = findAtt(items, selIds), riders = ridersOf(items.filter(i => i.kind === 'pipe'), selIds);
  for (const it of items) setGeom(it, geomOf(it), dx, dy);
  for (const r of riders) { r.el.x = r2(r.ox + dx); r.el.y = r2(r.oy + dy); }
  for (const a of att) { applyAtt(a, dx, dy); a.pipe.pts = simplify(a.pipe.pts); }
  commit(before);
}
function onEscape() { if (state.draft) { finishDraft(); return; } if (drag) { abortDrag(); return; } if (state.tool !== 'select') { setTool('select'); return; } if (state.sel.size) setSel([]); }
