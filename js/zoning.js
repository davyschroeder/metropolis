'use strict';
/* METROPOLIS – zoning and automatic development (spawn, upgrade, merge to larger lots) */
(function () {
  const G = M.Zoning = {};
  G.list = []; G.ver = -1;
  const KEY = ['', 'R', 'C', 'I'];
  G.KEY = KEY;
  G.paint = function (W, x, y, z, d) {
    const i = W.idx(x, y); W.zone[i] = z; W.zdens[i] = z ? d : 0; W.zoneVer = (W.zoneVer || 0) + 1; W.dirty(x, y);
  };
  G.taxRate = function (city, W, z, i) { const d = W.district[i]; return city.tax[KEY[z]] + (d ? city.districts[d].tax : 0); };
  G.taxPen = function (city, W, z, i) { return (G.taxRate(city, W, z, i) - 9) * 0.035; };
  G.des = function (W, city, z, i) {
    const lv = W.lv[i] / 100, tp = G.taxPen(city, W, z, i);
    if (z === 1) return lv * 0.9 + 0.12 - tp - Math.max(0, W.air[i] - 18) / 90 - Math.max(0, W.noise[i] - 25) / 120;
    if (z === 2) return 0.24 + Math.min(0.36, M.Population.popNear(W, i) / 260) + lv * 0.3 - tp - W.crime[i] / 160;
    return 0.5 - tp - (W.lv[i] > 72 ? (W.lv[i] - 72) / 100 : 0) + (M.Services.totals && M.Services.totals.cargo ? 0.05 : 0);
  };
  function facing(W, x, y, s) {
    const rd = W.findRoad(x, y, s, 2); if (rd < 0) return 0;
    const rx = rd % W.n; return (rx >= x + s || rx < x) ? 1 : 0;
  }
  G.capOf = function (z, lvl) { return M.ZB[z].cap[lvl]; };

  G.trySpawn = function (W, city, i, z) {
    const n = W.n, x = i % n, y = (i / n) | 0;
    if (W.road[i] || W.pline[i] || W.elev[i] === 0 || !W.inLimit(x, y)) return false;
    const dem = city.demand[KEY[z]]; if (dem < 0.08 || M.rand() > 0.2 + dem * 0.5) return false;
    if (W.findRoad(x, y, 1, 2) < 0 || W.power[i] !== 1) return false;
    if (G.des(W, city, z, i) < M.ZB[z].des[1]) return false;
    W.addBuilding({ t: KEY[z], z: z, x: x, y: y, s: 1, lvl: 1, cap: G.capOf(z, 1), v: (M.rand() * 80) | 0, f: facing(W, x, y, 1), built: 0.02, rate: 1 / 20, wealth: W.lv[i] < 38 ? 1 : W.lv[i] < 62 ? 2 : 3 });
    return true;
  };

  function blockOK(W, b, ax, ay, need) {
    const n = W.n; let e = -1;
    for (let yy = ay; yy < ay + 2; yy++) for (let xx = ax; xx < ax + 2; xx++) {
      if (!W.inb(xx, yy) || !W.inLimit(xx, yy)) return false;
      const i = yy * n + xx;
      if (W.zone[i] !== b.z || W.zdens[i] < need || W.road[i] || W.pline[i] || W.elev[i] === 0) return false;
      if (e < 0) e = W.elev[i]; else if (W.elev[i] !== e) return false;
      const o = W.at(xx, yy);
      if (o && o !== b && (o.z !== b.z || o.s !== 1 || o.lvl > b.lvl || o.fire || o.built < 1)) return false;
    }
    return W.findRoad(ax, ay, 2, 2) >= 0;
  }

  G.tryUpgrade = function (W, city, b) {
    if (b.built < 1 || b.ab || b.fire || b.dmg || !b.on || b.lvl >= 5 || b.age < 3) return false;
    const z = b.z, zb = M.ZB[z], dem = city.demand[KEY[z]], i = b.y * W.n + b.x, s = city.stats;
    if (dem < 0.2 || M.rand() > 0.5) return false;
    if (z === 1 ? b.pop < b.cap * 0.8 : b.filled < b.cap * 0.7) return false;
    let nl = b.lvl + 1;
    if (z === 3 && nl === 4 && (M.pol('noheavy', i) || s.eduIdx >= 0.55)) nl = 5;
    if (z === 3 && nl === 5 && s.eduIdx < 0.45) return false;
    if (z === 2 && ((nl >= 3 && s.eduIdx < 0.2) || (nl === 5 && s.eduIdx < 0.4))) return false;
    if (W.zdens[i] < zb.dens[nl]) return false;
    if (!b.wt) return false;
    if (G.des(W, city, z, i) < zb.des[nl]) return false;
    const wealth = W.lv[i] < 38 ? 1 : W.lv[i] < 62 ? 2 : 3;
    if (zb.size[nl] > b.s) {
      const cands = [[b.x, b.y], [b.x - 1, b.y], [b.x, b.y - 1], [b.x - 1, b.y - 1]];
      for (let k = 3; k > 0; k--) { const j = (M.rand() * (k + 1)) | 0, t = cands[k]; cands[k] = cands[j]; cands[j] = t; }
      for (const c of cands) {
        if (!blockOK(W, b, c[0], c[1], zb.dens[nl])) continue;
        let pop = 0, filled = 0;
        for (let yy = c[1]; yy < c[1] + 2; yy++) for (let xx = c[0]; xx < c[0] + 2; xx++) { const o = W.at(xx, yy); if (o) { pop += o.pop; filled += o.filled; W.removeBuilding(o); } }
        const cap = G.capOf(z, nl);
        W.addBuilding({ t: KEY[z], z: z, x: c[0], y: c[1], s: 2, lvl: nl, cap: cap, pop: Math.min(cap, pop), filled: Math.min(cap, filled), v: (M.rand() * 80) | 0, f: facing(W, c[0], c[1], 2), built: 0.02, rate: 1 / (20 + nl * 6), reno: true, on: true, pw: true, wt: true, wealth: wealth, happy: b.happy, commute: b.commute });
        return true;
      }
      return false;
    }
    b.lvl = nl; b.cap = G.capOf(z, nl); b.v = (M.rand() * 80) | 0; b.built = 0.02; b.rate = 1 / (18 + nl * 6); b.reno = true; b.age = 0; b.wealth = wealth;
    W.bldVer++; M.emit('bld', b, true);
    return true;
  };

  G.day = function (W, city) {
    W.each(function (b) { if (b.built < 1) { b.built += b.rate || 0.05; if (b.built >= 1) { b.built = 1; b.reno = false; W.bldVer++; M.emit('built', b); } } });
    if (G.ver !== W.zoneVer || G.w !== W) {
      G.ver = W.zoneVer; G.w = W; const L = G.list = []; const N = W.n * W.n;
      for (let i = 0; i < N; i++) if (W.zone[i]) L.push(i);
    }
    const L = G.list; if (!L.length) return;
    const K = M.clamp(Math.ceil(L.length / 60), 3, 90);
    for (let k = 0; k < K; k++) {
      const i = L[(M.rand() * L.length) | 0], z = W.zone[i]; if (!z) continue;
      const id = W.bld[i];
      if (!id) G.trySpawn(W, city, i, z);
      else { const b = W.blds[id - 1]; if (b && b.z === z && b.y * W.n + b.x === i) G.tryUpgrade(W, city, b); }
    }
  };
})();
