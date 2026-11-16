'use strict';
/* METROPOLIS – construction: tools, placement rules, costs, demolition, upgrades, undo */
(function () {
  const C = M.Build = { tool: { type: 'pointer' }, undo: [], flip: 0 };
  function mul() { return M.DIFF[M.city.diff].cost; }
  function snap(W, i) { return { i: i, road: W.road[i], rdir: W.rdir[i], zone: W.zone[i], zdens: W.zdens[i], deco: W.deco[i], pline: W.pline[i] }; }
  function pushUndo(rec) { C.undo.push(rec); if (C.undo.length > 30) C.undo.shift(); M.emit('undo'); }
  C.setTool = function (t) { C.tool = t || { type: 'pointer' }; M.emit('tool', C.tool); };
  C.rect = function (x0, y0, x1, y1) { return { x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) }; };
  // L-shaped tile path from a to b (long axis first)
  C.linePath = function (x0, y0, x1, y1) {
    const out = []; let x = x0, y = y0; const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0), xFirst = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
    const dirX = sx > 0 ? 1 : 3, dirY = sy > 0 ? 2 : 0;
    out.push({ x: x, y: y, dir: xFirst ? (sx ? dirX : dirY) : (sy ? dirY : dirX) });
    const walkX = function () { while (x !== x1) { x += sx; out.push({ x: x, y: y, dir: dirX }); } }, walkY = function () { while (y !== y1) { y += sy; out.push({ x: x, y: y, dir: dirY }); } };
    if (xFirst) { walkX(); walkY(); } else { walkY(); walkX(); }
    return out;
  };

  // ---------- roads ----------
  C.checkRoad = function (type, path) {
    const W = M.world, rt = M.ROADS[type], res = { tiles: [], cost: 0, ok: true, n: 0 }; let prevE = -1;
    for (const p of path) {
      const t = { x: p.x, y: p.y, dir: p.dir, ok: true, skip: false };
      if (!W.inb(p.x, p.y) || !W.inLimit(p.x, p.y)) { t.ok = false; t.why = 'Outside the city limits'; }
      else {
        const i = W.idx(p.x, p.y), water = W.elev[i] === 0, e = water ? 1 : W.elev[i];
        if (W.bld[i]) { t.ok = false; t.why = 'A building is in the way'; }
        else if (water && type === 1) { t.ok = false; t.why = 'Dirt roads cannot cross water'; }
        else if (prevE >= 0 && Math.abs(e - prevE) > 1) { t.ok = false; t.why = 'Too steep'; }
        else if (W.road[i] === type && (type !== 5 || W.rdir[i] === p.dir)) t.skip = true;
        else { res.cost += rt.cost * (water ? M.BRIDGE_COST : 1) * mul(); res.n++; t.bridge = water; }
        prevE = e;
      }
      if (!t.ok) { res.ok = false; res.why = t.why; }
      res.tiles.push(t);
    }
    res.cost = Math.round(res.cost);
    if (res.ok && !M.Economy.canAfford(res.cost)) { res.ok = false; res.why = 'Not enough money'; }
    if (res.ok && !res.n && type !== 5) res.none = true;
    return res;
  };
  C.applyRoad = function (type, chk) {
    if (!chk.ok || chk.none) return false; const W = M.world;
    if (!M.Economy.spend(chk.cost)) return false;
    const rec = { cost: chk.cost, tiles: [], blds: [], label: 'road' };
    for (const t of chk.tiles) { if (t.skip) continue; const i = W.idx(t.x, t.y); rec.tiles.push(snap(W, i)); M.Roads.set(W, t.x, t.y, type, t.dir); }
    W.zoneVer = (W.zoneVer || 0) + 1; W.computeOccl(); pushUndo(rec); M.emit('placed', 'road', chk.cost);
    return true;
  };
  // ---------- power lines ----------
  C.checkLine = function (path) {
    const W = M.world, res = { tiles: [], cost: 0, ok: true, n: 0 };
    for (const p of path) {
      const t = { x: p.x, y: p.y, ok: true, skip: false };
      if (!W.inb(p.x, p.y) || !W.inLimit(p.x, p.y)) { t.ok = false; t.why = 'Outside the city limits'; }
      else { const i = W.idx(p.x, p.y); if (W.road[i] || W.pline[i]) t.skip = true; else if (W.bld[i]) { t.skip = true; } else if (W.elev[i] === 0) { t.ok = false; t.why = 'Pylons cannot stand in water'; } else { res.cost += M.DEFS.pline.cost * mul(); res.n++; } }
      if (!t.ok) { res.ok = false; res.why = t.why; } res.tiles.push(t);
    }
    res.cost = Math.round(res.cost);
    if (res.ok && !M.Economy.canAfford(res.cost)) { res.ok = false; res.why = 'Not enough money'; }
    return res;
  };
  C.applyLine = function (chk) {
    if (!chk.ok || !chk.n) return false; const W = M.world; if (!M.Economy.spend(chk.cost)) return false;
    const rec = { cost: chk.cost, tiles: [], blds: [], label: 'line' };
    for (const t of chk.tiles) { if (t.skip) continue; const i = W.idx(t.x, t.y); rec.tiles.push(snap(W, i)); W.pline[i] = 1; W.deco[i] = 0; W.zone[i] = 0; W.zdens[i] = 0; W.dirty(t.x, t.y); }
    W.roadVer++; W.zoneVer = (W.zoneVer || 0) + 1; pushUndo(rec); M.emit('placed', 'line', chk.cost);
    return true;
  };
  // ---------- zoning ----------
  C.checkZone = function (z, d, r) {
    const W = M.world, res = { tiles: [], cost: 0, ok: true, n: 0 };
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      if (!W.inb(x, y)) continue; const i = W.idx(x, y), t = { x: x, y: y, ok: true, skip: false };
      if (!W.inLimit(x, y) || W.elev[i] === 0 || W.road[i] || W.pline[i]) t.skip = true;
      else {
        const b = W.at(x, y);
        if (b && (!b.z || (z && b.z !== z))) t.skip = true;
        else if (z === 0) { if (!W.zone[i] || b) t.skip = true; else res.n++; }
        else if (W.zone[i] === z && W.zdens[i] === d) t.skip = true;
        else { res.cost += M.ZCOST[d] * mul(); res.n++; if (z && W.findRoad(x, y, 1, 2) < 0) { t.far = true; res.far = (res.far || 0) + 1; } }
      }
      res.tiles.push(t);
    }
    res.cost = Math.round(res.cost);
    if (!M.Economy.canAfford(res.cost)) { res.ok = false; res.why = 'Not enough money'; }
    return res;
  };
  C.applyZone = function (z, d, chk) {
    if (!chk.ok || !chk.n) return false; const W = M.world; if (!M.Economy.spend(chk.cost)) return false;
    const rec = { cost: chk.cost, tiles: [], blds: [], label: 'zone' };
    for (const t of chk.tiles) { if (t.skip) continue; rec.tiles.push(snap(W, W.idx(t.x, t.y))); M.Zoning.paint(W, t.x, t.y, z, d); }
    pushUndo(rec); M.emit('placed', 'zone', chk.cost);
    return true;
  };
  // ---------- buildings ----------
  C.anchor = function (def, cx, cy) { const o = Math.floor((def.size - 1) / 2); return { x: cx - o, y: cy - o }; };
  C.checkBuild = function (id, x, y) {
    const W = M.world, c = M.city, def = M.DEFS[id], s = def.size, res = { ok: true, cost: Math.round(def.cost * mul()), x: x, y: y, s: s, tiles: [] };
    let e = -1;
    for (let yy = y; yy < y + s; yy++) for (let xx = x; xx < x + s; xx++) {
      const t = { x: xx, y: yy, ok: true };
      if (!W.inb(xx, yy) || !W.inLimit(xx, yy)) { t.ok = false; res.why = 'Outside the city limits'; }
      else {
        const i = W.idx(xx, yy);
        if (W.elev[i] === 0) { t.ok = false; res.why = 'Cannot build on water'; }
        else if (W.road[i]) { t.ok = false; res.why = 'Overlaps a road – move it beside the road'; }
        else if (W.bld[i]) { t.ok = false; res.why = 'Another building is in the way'; }
        else if (W.pline[i]) { t.ok = false; res.why = 'A power line is in the way'; }
        else if (e >= 0 && W.elev[i] !== e) { t.ok = false; res.why = 'The ground is not level'; }
        else e = W.elev[i];
      }
      if (!t.ok) res.ok = false; res.tiles.push(t);
    }
    if (res.ok && def.nearWater && !W.nearWater(x, y, s, 2)) { res.ok = false; res.why = 'Must be within 2 tiles of water'; }
    if (res.ok && def.nearRoad && W.findRoad(x, y, s, 1) < 0) { res.ok = false; res.why = 'Must be next to a road'; }
    if (res.ok && !M.tierOK(def.tier)) { res.ok = false; res.why = 'Unlocks at ' + M.TIERS[def.tier].name; }
    if (res.ok && id === 'coal') { const sc = M.SCENARIOS.find(function (q) { return q.id === c.scenario; }); if (sc && sc.noCoal && !c.won && !c.lost) { res.ok = false; res.why = 'Coal is banned in this scenario'; } }
    if (res.ok && !M.Economy.canAfford(res.cost)) { res.ok = false; res.why = 'Not enough money'; }
    return res;
  };
  C.applyBuild = function (id, chk, flip) {
    if (!chk.ok) return null; const W = M.world, def = M.DEFS[id]; if (!M.Economy.spend(chk.cost)) return null;
    const rec = { cost: chk.cost, tiles: [], blds: [], label: def.name };
    for (const t of chk.tiles) { const i = W.idx(t.x, t.y); rec.tiles.push(snap(W, i)); if (W.zone[i]) M.Zoning.paint(W, t.x, t.y, 0, 0); }
    const b = W.addBuilding({ t: id, x: chk.x, y: chk.y, s: def.size, f: flip ? 1 : 0, built: 0.03, rate: M.city.mode === 'sandbox' ? 0.25 : 1 / (5 + def.size * 5), v: (M.rand() * 4) | 0 });
    rec.blds.push(b); pushUndo(rec); M.emit('placed', 'build', chk.cost, b);
    if (M.needsRoad(def) && W.findRoad(b.x, b.y, b.s, 1) < 0) M.news(def.name + ' has no road access yet. Build a road right next to it.', 'info', b.x, b.y);
    else if ((def.power || def.water) && !def.line && W.findNear(b.x, b.y, b.s, 2, function (i) { return W.road[i] !== 0 || (def.power && W.pline[i] !== 0); }) < 0) M.news(def.name + ' is not connected. Put a road' + (def.power ? ' or power line' : '') + ' within 2 tiles of it.', 'info', b.x, b.y);
    return b;
  };
  C.plantTrees = function (r) {
    const W = M.world; let n = 0; const tiles = [];
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { if (!W.inb(x, y) || !W.inLimit(x, y)) continue; const i = W.idx(x, y); if (W.elev[i] === 0 || W.road[i] || W.bld[i] || W.pline[i] || W.deco[i] === 1 || W.deco[i] === 2 || W.deco[i] === 6) continue; tiles.push(i); n++; }
    const cost = Math.round(n * M.DEFS.tree.cost * mul()); if (!n || !M.Economy.spend(cost)) return false;
    const rec = { cost: cost, tiles: [], blds: [], label: 'trees' };
    for (const i of tiles) { rec.tiles.push(snap(W, i)); W.deco[i] = M.rand() < 0.25 ? 1 : M.rand() < 0.5 ? 2 : 6; W.dirty(i % W.n, (i / W.n) | 0); }
    pushUndo(rec); M.emit('placed', 'trees', cost);
    return true;
  };
  // ---------- demolition ----------
  C.demolishCost = function (b) { if (b.t === 'rubble') return 5; if (b.z) return 4 * b.lvl * b.s; return Math.max(10, Math.round(M.DEFS[b.t].cost * 0.04)); };
  C.checkBulldoze = function (r) {
    const W = M.world, res = { tiles: [], cost: 0, ok: true, n: 0 }, seen = {};
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      if (!W.inb(x, y)) continue; const i = W.idx(x, y), b = W.at(x, y), t = { x: x, y: y, ok: true, skip: false };
      if (b) { if (!seen[b.id]) { seen[b.id] = 1; res.cost += C.demolishCost(b) * mul(); res.n++; } }
      else if (W.road[i]) { res.cost += 3 * mul(); res.n++; }
      else if (W.pline[i]) res.n++;
      else if (W.deco[i]) { res.cost += 1 * mul(); res.n++; }
      else t.skip = true;
      res.tiles.push(t);
    }
    res.cost = Math.round(res.cost);
    if (!M.Economy.canAfford(res.cost)) { res.ok = false; res.why = 'Not enough money'; }
    return res;
  };
  C.applyBulldoze = function (r, chk) {
    if (!chk.ok || !chk.n) return false; const W = M.world; if (!M.Economy.spend(chk.cost)) return false;
    let roads = false;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      if (!W.inb(x, y)) continue; const i = W.idx(x, y), b = W.at(x, y);
      if (b) W.removeBuilding(b);
      else if (W.road[i]) { M.Roads.clear(W, x, y); roads = true; }
      else if (W.pline[i]) { W.pline[i] = 0; W.roadVer++; W.dirty(x, y); }
      else if (W.deco[i]) { W.deco[i] = 0; W.dirty(x, y); }
    }
    if (roads) W.computeOccl();
    C.undo.length = 0; M.emit('undo'); M.emit('placed', 'bulldoze', chk.cost);
    return true;
  };
  C.demolish = function (b) {
    const cost = Math.round(C.demolishCost(b) * mul()); if (!M.Economy.spend(cost)) return false;
    M.world.removeBuilding(b); C.undo.length = 0; M.emit('undo'); M.emit('placed', 'bulldoze', cost); return true;
  };
  // ---------- districts ----------
  C.applyDistrict = function (id, r) {
    const W = M.world; let n = 0;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { if (!W.inb(x, y) || !W.inLimit(x, y)) continue; const i = W.idx(x, y); if (W.elev[i] === 0) continue; if (W.district[i] !== id) { W.district[i] = id; n++; } }
    if (n) { W.distVer = (W.distVer || 0) + 1; M.emit('placed', 'district', 0); }
    return n > 0;
  };
  // ---------- upgrades ----------
  C.upgradeCost = function (b) { const d = M.DEFS[b.t]; return Math.round(d.cost * 0.6 * b.up * mul()); };
  C.canUpgrade = function (b) { if (b.z) return false; const d = M.DEFS[b.t]; return !!d.up && b.up < 3 && b.built >= 1 && !b.fire && !b.dmg; };
  C.upgrade = function (b) {
    if (!C.canUpgrade(b)) return false; if (!M.Economy.spend(C.upgradeCost(b))) return false;
    b.up++; b.built = 0.3; b.reno = true; b.rate = 0.05; M.world.bldVer++; M.Services.dirty = true; M.emit('bld', b, true); M.emit('placed', 'build', 0, b);
    return true;
  };
  // ---------- city limits ----------
  C.expandCost = function () { return Math.round(4000 * (M.city.counters.expand + 1) * mul()); };
  C.canExpand = function () { const l = M.world.limit, n = M.world.n; return l.x0 > 0 || l.y0 > 0 || l.x1 < n - 1 || l.y1 < n - 1; };
  C.expand = function () {
    const W = M.world, l = W.limit, n = W.n; if (!C.canExpand() || !M.Economy.spend(C.expandCost())) return false;
    l.x0 = Math.max(0, l.x0 - 8); l.y0 = Math.max(0, l.y0 - 8); l.x1 = Math.min(n - 1, l.x1 + 8); l.y1 = Math.min(n - 1, l.y1 + 8);
    M.city.counters.expand++; M.news('The city limits have been extended.', 'good'); M.emit('limits');
    return true;
  };
  // ---------- undo ----------
  C.undoLast = function () {
    const rec = C.undo.pop(); if (!rec) return false; const W = M.world, c = M.city; let roads = false;
    for (const b of rec.blds) if (!b.dead) W.removeBuilding(b);
    for (const t of rec.tiles) {
      const i = t.i, x = i % W.n, y = (i / W.n) | 0; if (W.bld[i]) continue;
      if (W.road[i] !== t.road) { roads = true; if (W.road[i] && !t.road) W.roadTiles--; else if (!W.road[i] && t.road) W.roadTiles++; }
      W.road[i] = t.road; W.rdir[i] = t.rdir; W.zone[i] = t.zone; W.zdens[i] = t.zdens; W.deco[i] = t.deco; W.pline[i] = t.pline;
      M.Roads.dirtyAround(W, x, y);
    }
    W.roadVer++; W.zoneVer = (W.zoneVer || 0) + 1; if (roads) W.computeOccl();
    if (c.mode !== 'sandbox') c.money += rec.cost;
    M.emit('undo'); M.emit('placed', 'undo', -rec.cost);
    return true;
  };
})();
