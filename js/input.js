'use strict';
/* METROPOLIS – input: mouse, touch and keyboard; tool dragging and placement previews */
(function () {
  const I = M.Input = { ptrs: new Map(), mode: null, start: null, tile: null, moved: 0, chk: null };
  const B = M.Build, Cam = M.Camera, Rn = M.Render;
  let cv, pinch = null, lastX = 0, lastY = 0, lastKey = '';
  function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function rectOf(a, b) { const r = B.rect(a.x, a.y, b.x, b.y); if (r.x1 - r.x0 > 47) { if (b.x >= a.x) r.x1 = r.x0 + 47; else r.x0 = r.x1 - 47; } if (r.y1 - r.y0 > 47) { if (b.y >= a.y) r.y1 = r.y0 + 47; else r.y0 = r.y1 - 47; } return r; }
  function rectTiles(r) { const t = [], W = M.world; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (W.inb(x, y)) t.push({ x: x, y: y, ok: true, skip: !W.inLimit(x, y) || W.elev[W.idx(x, y)] === 0 }); return t; }

  I.updatePreview = function () {
    const tool = B.tool, t = I.tile, W = M.world;
    if (!t || tool.type === 'pointer' || !W) { Rn.preview = null; M.UI.cursorInfo(null); I.chk = null; return; }
    const s = I.mode === 'tool' && I.start ? I.start : t; let chk = null, info = '', ok = true;
    switch (tool.type) {
      case 'road': chk = B.checkRoad(tool.road, B.linePath(s.x, s.y, t.x, t.y)); Rn.preview = { tiles: chk.tiles }; ok = chk.ok; info = chk.ok ? (chk.none ? 'Already built' : M.money(chk.cost) + ' · ' + chk.n + ' tiles') : chk.why; break;
      case 'line': chk = B.checkLine(B.linePath(s.x, s.y, t.x, t.y)); Rn.preview = { tiles: chk.tiles }; ok = chk.ok; info = chk.ok ? M.money(chk.cost) : chk.why; break;
      case 'zone': { const r = rectOf(s, t); chk = B.checkZone(tool.z, tool.d, r); chk.rect = r; Rn.preview = { tiles: chk.tiles, color: M.ZCOL[tool.z] + '88' }; ok = chk.ok; info = chk.ok && !chk.n ? 'Already zoned – drag over new land' : chk.ok ? M.money(chk.cost) + ' · ' + chk.n + ' tiles' + (chk.far ? ' · ' + chk.far + ' too far from a road' : '') : chk.why; ok = chk.ok && !(chk.far && chk.far === chk.n); break; }
      case 'dezone': { const r = rectOf(s, t); chk = B.checkZone(0, 0, r); chk.rect = r; Rn.preview = { tiles: chk.tiles, color: 'rgba(200,200,200,0.45)' }; info = chk.n + ' tiles'; break; }
      case 'bulldoze': { const r = rectOf(s, t); chk = B.checkBulldoze(r); chk.rect = r; Rn.preview = { tiles: chk.tiles, color: 'rgba(255,130,50,0.5)' }; ok = chk.ok; info = chk.ok ? (chk.n ? M.money(chk.cost) : 'Nothing to demolish') : chk.why; break; }
      case 'district': { const r = rectOf(s, t); chk = { rect: r, ok: true }; Rn.preview = { tiles: rectTiles(r), color: tool.id ? Rn.DCOL[tool.id] + '99' : 'rgba(200,200,200,0.45)' }; info = tool.id ? M.city.districts[tool.id].name : 'Erase district'; break; }
      case 'trees': { const r = rectOf(s, t); chk = { rect: r, ok: true }; const tiles = rectTiles(r); Rn.preview = { tiles: tiles, color: 'rgba(60,170,80,0.5)' }; info = 'Plant trees · up to ' + M.money(tiles.length * M.DEFS.tree.cost); break; }
      case 'build': { const def = M.DEFS[tool.def], a = B.anchor(def, t.x, t.y); chk = B.checkBuild(tool.def, a.x, a.y); Rn.preview = { tiles: chk.tiles, sprite: M.Sprites.def(tool.def, B.flip, 0), sx: a.x, sy: a.y, size: def.size, ok: chk.ok, ring: def.cover ? def.cover.r : def.bus ? 5.5 : 0 }; ok = chk.ok; info = chk.ok ? def.name + ' · ' + M.money(chk.cost) : chk.why; break; }
    }
    I.chk = chk; M.UI.cursorInfo(info, ok, lastX, lastY);
  };
  function commit() {
    const tool = B.tool, chk = I.chk; let done = false, why = chk && chk.why;
    if (!chk) return;
    switch (tool.type) {
      case 'road': done = B.applyRoad(tool.road, chk) || chk.none; break;
      case 'line': done = B.applyLine(chk) || (chk.ok && !chk.n); break;
      case 'zone': done = B.applyZone(tool.z, tool.d, chk) || (chk.ok && !chk.n); break;
      case 'dezone': done = B.applyZone(0, 0, chk) || !chk.n; break;
      case 'bulldoze': done = B.applyBulldoze(chk.rect, chk) || (chk.ok && !chk.n); break;
      case 'district': B.applyDistrict(tool.id, chk.rect); done = true; break;
      case 'trees': done = B.plantTrees(chk.rect); if (!done) why = 'Nothing to plant here, or not enough money'; break;
      case 'build': done = !!B.applyBuild(tool.def, chk, B.flip); break;
    }
    if (!done) { M.Audio.play('error'); if (why) M.UI.toast(why, 'bad'); }
    I.start = null; I.updatePreview();
  }
  function onDown(e) {
    if (M.mode !== 'game') return; M.Audio.init(); e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const p = pos(e); I.ptrs.set(e.pointerId, p); lastX = p[0]; lastY = p[1]; I.moved = 0;
    if (I.ptrs.size === 2) { const a = Array.from(I.ptrs.values()); pinch = { d: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), z: Cam.tz, cx: (a[0][0] + a[1][0]) / 2, cy: (a[0][1] + a[1][1]) / 2 }; I.mode = 'pinch'; I.start = null; Rn.preview = null; return; }
    I.tile = Cam.pick(p[0], p[1]);
    if (e.button === 2 || e.button === 1) I.mode = e.button === 2 ? 'rpan' : 'pan';
    else if (B.tool.type === 'pointer') I.mode = 'panclick';
    else { I.mode = 'tool'; I.start = I.tile; I.updatePreview(); }
  }
  function onMove(e) {
    if (M.mode !== 'game') return; const p = pos(e), dx = p[0] - lastX, dy = p[1] - lastY;
    if (I.ptrs.has(e.pointerId)) I.ptrs.set(e.pointerId, p);
    if (I.mode === 'pinch' && pinch && I.ptrs.size >= 2) {
      const a = Array.from(I.ptrs.values()), d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), cx = (a[0][0] + a[1][0]) / 2, cy = (a[0][1] + a[1][1]) / 2;
      Cam.x -= (cx - pinch.cx) / Cam.zoom; Cam.y -= (cy - pinch.cy) / Cam.zoom; pinch.cx = cx; pinch.cy = cy; Cam.gx = null;
      Cam.tz = M.clamp(pinch.z * d / Math.max(20, pinch.d), Cam.minZoom, Cam.maxZoom); Cam.zx = cx; Cam.zy = cy; Cam.zw = Cam.toWorld(cx, cy);
      return;
    }
    lastX = p[0]; lastY = p[1];
    if (I.mode === 'pan' || I.mode === 'rpan' || I.mode === 'panclick') { I.moved += Math.abs(dx) + Math.abs(dy); if (I.moved > 4) { Cam.x -= dx / Cam.zoom; Cam.y -= dy / Cam.zoom; Cam.gx = null; } }
    if (M.settings.edge && e.pointerType === 'mouse') { const m = 14; Cam.edge.x = p[0] < m ? -1 : p[0] > Cam.w - m ? 1 : 0; Cam.edge.y = p[1] < m ? -1 : p[1] > Cam.h - m ? 1 : 0; }
    const t = Cam.pick(p[0], p[1]);
    if (!I.tile || t.x !== I.tile.x || t.y !== I.tile.y) { I.tile = t; Rn.hover = t; I.updatePreview(); } else M.UI.cursorMove(p[0], p[1]);
  }
  function onUp(e) {
    const had = I.ptrs.has(e.pointerId); I.ptrs.delete(e.pointerId);
    if (M.mode !== 'game' || !had) return;
    if (I.mode === 'pinch') { if (I.ptrs.size < 2) { I.mode = null; pinch = null; } return; }
    const W = M.world;
    if (I.mode === 'rpan' && I.moved < 6) { if (B.tool.type !== 'pointer') M.UI.cancelTool(); else M.UI.closePanel(); }
    else if (I.mode === 'panclick' && I.moved < 7 && I.tile && W.inb(I.tile.x, I.tile.y)) { const b = W.at(I.tile.x, I.tile.y); M.Audio.play('click'); if (b) M.UI.inspect(b); else M.UI.inspectTile(I.tile.x, I.tile.y); }
    else if (I.mode === 'tool') commit();
    I.mode = null;
    if (e.pointerType !== 'mouse') { Rn.hover = null; if (B.tool.type !== 'pointer') { Rn.preview = null; M.UI.cursorInfo(null); } }
  }
  function onWheel(e) { if (M.mode !== 'game') return; e.preventDefault(); const p = pos(e); Cam.zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, p[0], p[1]); }
  function onKey(e, down) {
    const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') { if (down && e.key === 'Escape') e.target.blur(); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, K = Cam.keys;
    if (k === 'ArrowLeft' || (k === 'a' && !e.ctrlKey)) K.left = down; else if (k === 'ArrowRight' || k === 'd') K.right = down; else if (k === 'ArrowUp' || k === 'w') K.up = down; else if (k === 'ArrowDown' || (k === 's' && !e.ctrlKey && !e.metaKey)) K.down = down;
    if (!down) return;
    if (k === 'Escape') { M.UI.escape(); return; }
    if (M.mode !== 'game') return;
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (!B.undoLast()) M.UI.toast('Nothing to undo', 'info'); return; }
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); M.UI.quickSave(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === ' ') { e.preventDefault(); M.Engine.togglePause(); }
    else if (k === '+' || k === '=') Cam.zoomAt(1.3, Cam.w / 2, Cam.h / 2); else if (k === '-' || k === '_') Cam.zoomAt(1 / 1.3, Cam.w / 2, Cam.h / 2);
    else if (k === '[') M.Engine.setSpeed(M.Engine.speed === 4 ? 2 : 1); else if (k === ']') M.Engine.setSpeed(M.Engine.speed === 1 ? 2 : 4);
    else if (k === 'r') { B.flip ^= 1; I.updatePreview(); M.Audio.play('click'); }
    else if (k === 'b') M.UI.selectCat('bulldoze'); else if (k === 'q') M.UI.cancelTool();
    else if (k === 'm') M.UI.toggleMinimap(); else if (k === 'Tab') { e.preventDefault(); M.UI.cycleOverlay(); }
    else if (k >= '0' && k <= '9') { const c = M.CATS.find(function (q) { return q.key === k; }); if (c) M.UI.selectCat(c.id); }
    lastKey = k; void lastKey;
  }
  I.init = function (canvas) {
    cv = canvas;
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('pointerleave', function () { Cam.edge.x = Cam.edge.y = 0; if (!I.mode) { Rn.hover = null; if (I.mode !== 'tool') { Rn.preview = null; M.UI.cursorInfo(null); I.tile = null; } } });
    cv.addEventListener('wheel', onWheel, { passive: false }); cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', function (e) { onKey(e, true); }); window.addEventListener('keyup', function (e) { onKey(e, false); });
    window.addEventListener('blur', function () { const K = Cam.keys; K.left = K.right = K.up = K.down = false; });
    M.on('tool', function () { I.start = null; I.updatePreview(); });
  };
})();
