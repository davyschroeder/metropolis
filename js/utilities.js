'use strict';
/* METROPOLIS – utilities: electricity, water, sewage, garbage. Capacity, distribution, shortages. */
(function () {
  const U = M.Utilities = {};
  let cc, pc, wc, mark, sized = 0;
  const REACH = 3;
  M.bf = function (dept) { const v = M.city.budget[dept]; return v <= 100 ? v / 100 : 1 + (v - 100) / 200; };
  M.needsRoad = function (def) { return !!(def.jobs || def.bus || def.garbage || def.cover && def.cat === 'service'); };

  function reach(W, src, out, isSrc) {
    const n = W.n; out.fill(0);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, c = src[i]; if (!c || !isSrc(i)) continue;
      for (let oy = -REACH; oy <= REACH; oy++) {
        const yy = y + oy; if (yy < 0 || yy >= n) continue; const r = REACH - Math.abs(oy);
        for (let ox = -r; ox <= r; ox++) { const xx = x + ox; if (xx < 0 || xx >= n) continue; const j = yy * n + xx; if (!out[j]) out[j] = c; }
      }
    }
  }
  function compOf(W, b, map) {
    for (let yy = b.y; yy < b.y + b.s; yy++) for (let xx = b.x; xx < b.x + b.s; xx++) { const c = map[yy * W.n + xx]; if (c) return c; }
    return 0;
  }
  U.powerUse = function (b) {
    if (b.z) { const units = b.z === 1 ? b.pop : b.filled; return units * M.USE.power[b.z] * (b.z === 3 && b.lvl === 5 ? 0.75 : 1) * (M.pol('power', b.y * M.world.n + b.x) ? 0.85 : 1) + 0.01; }
    return M.DEFS[b.t].usePower || 0;
  };
  U.waterUse = function (b) {
    if (b.z) { const units = b.z === 1 ? b.pop : b.filled; return units * M.USE.water[b.z] * (M.pol('water', b.y * M.world.n + b.x) ? 0.8 : 1) + 0.05; }
    return M.DEFS[b.t].useWater || 0;
  };
  function allocate(list, cap, use, flag) {
    list.sort(function (a, b) { return b.pri - a.pri || a.h - b.h; });
    let shortUse = 0, total = 0;
    for (const c of list) {
      total += c.use;
      if (use[c.comp] + c.use <= cap[c.comp] + 1e-6) { use[c.comp] += c.use; c.b[flag] = true; }
      else { c.b[flag] = false; shortUse += c.use; }
    }
    return { total: total, short: shortUse };
  }

  U.update = function (W, city) {
    const n = W.n, N = n * n, R = M.Roads, ut = city.util;
    if (sized !== N) { cc = new Int32Array(N); pc = new Int32Array(N); wc = new Int32Array(N); mark = new Uint8Array(N); sized = N; }
    R.components(W);
    // ---------- electricity ----------
    mark.fill(0);
    const plants = [];
    W.each(function (b) { if (b.z) return; const d = M.DEFS[b.t]; if (d.power && !d.line) { plants.push(b); for (let yy = b.y; yy < b.y + b.s; yy++) for (let xx = b.x; xx < b.x + b.s; xx++) mark[yy * n + xx] = 1; } });
    cc.fill(0); let nc = 0; const stack = [];
    for (let s = 0; s < N; s++) {
      if (cc[s] || !(W.road[s] || W.pline[s] || mark[s])) continue;
      nc++; cc[s] = nc; stack.push(s);
      while (stack.length) {
        const i = stack.pop(), x = i % n, y = (i / n) | 0;
        for (let d = 0; d < 4; d++) { const xx = x + M.DX[d], yy = y + M.DY[d]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const j = yy * n + xx; if (!cc[j] && (W.road[j] || W.pline[j] || mark[j])) { cc[j] = nc; stack.push(j); } }
      }
    }
    const capP = new Float32Array(nc + 1), useP = new Float32Array(nc + 1);
    const sun = city.weather.type === 'clear' ? 1 : city.weather.type === 'cloudy' ? 0.6 : 0.35;
    let pCap = 0, clean = 0;
    for (const b of plants) {
      const d = M.DEFS[b.t]; b.pw = true; b.out = 0;
      if (b.built < 1 || b.dmg || b.fire) continue;
      let out = d.power * M.upMul(b) * Math.min(1.1, M.bf('power'));
      if (d.wind) out *= b.stormOff > 0 ? 0 : city.weather.wind;
      if (d.solar) out *= sun;
      if (d.useWater && b.wt === false && b.age > 1) out *= 0.5;
      const near = W.findNear(b.x, b.y, b.s, 2, function (i) { return W.road[i] !== 0 || W.pline[i] !== 0; });
      b.out = out; capP[cc[near >= 0 ? near : b.y * n + b.x]] += out; pCap += out; if (d.wind || d.solar) clean += out;
    }
    reach(W, cc, pc, function (i) { return true; });
    let list = [];
    W.each(function (b) {
      const d = b.z ? null : M.DEFS[b.t]; if (d && d.power && !d.line) return;
      const use = U.powerUse(b); b.pu = use;
      if (use <= 0) { b.pw = true; return; }
      const comp = compOf(W, b, pc);
      if (!comp || capP[comp] <= 0) { b.pw = false; return; }
      if (b.built < 1 && !b.reno) { b.pw = true; return; }
      list.push({ b: b, comp: comp, use: use, pri: b.z ? 0 : 1, h: M.hash(b.id, 7, 3) });
    });
    let res = allocate(list, capP, useP, 'pw');
    ut.pCap = pCap; ut.pUse = res.total; ut.pShort = res.total > 0 ? res.short / res.total : 0; ut.cleanShare = pCap > 0 ? clean / pCap : 0;
    for (let i = 0; i < N; i++) W.power[i] = pc[i] ? (capP[pc[i]] > 0 ? 1 : 2) : 0;

    // ---------- water ----------
    const nr = (R.ncomp || 0) + 1, capW = new Float32Array(nr), useW = new Float32Array(nr), treat = new Uint8Array(nr);
    const srcs = [];
    W.each(function (b) { if (b.z) return; const d = M.DEFS[b.t]; if (!d.water) return; srcs.push(b); b.wt = true; if (d.treat && b.built >= 1 && !b.dmg && b.pw) { const rd = W.findNear(b.x, b.y, b.s, 2, function (i) { return W.rcomp[i] !== 0; }); if (rd >= 0) treat[W.rcomp[rd]] = 1; } });
    let wCap = 0, anyTreat = 0;
    for (const b of srcs) {
      const d = M.DEFS[b.t]; b.out = 0;
      if (b.built < 1 || b.dmg || b.fire || (d.usePower && !b.pw)) continue;
      const rd = W.findNear(b.x, b.y, b.s, 2, function (i) { return W.rcomp[i] !== 0; }); b.noNet = rd < 0; if (rd < 0) continue;
      const comp = W.rcomp[rd]; let out = d.water * M.upMul(b) * Math.min(1.1, M.bf('water'));
      if (d.nearWater && !treat[comp]) out *= 1 - 0.6 * ut.waterPol;
      if (!d.nearWater && !d.treat) out *= 1 - Math.min(0.5, W.gnd[b.y * n + b.x] / 60);
      b.out = out; capW[comp] += out; wCap += out;
    }
    for (let i = 1; i < nr; i++) if (treat[i]) anyTreat = 1;
    reach(W, W.rcomp, wc, function (i) { return true; });
    list = [];
    W.each(function (b) {
      const d = b.z ? null : M.DEFS[b.t]; if (d && d.water) return;
      const use = U.waterUse(b); b.wu = use;
      if (use <= 0) { b.wt = true; return; }
      const comp = compOf(W, b, wc);
      if (!comp || capW[comp] <= 0) { b.wt = false; return; }
      if (b.built < 1 && !b.reno) { b.wt = true; return; }
      list.push({ b: b, comp: comp, use: use, pri: b.z ? 0 : 1, h: M.hash(b.id, 11, 5) });
    });
    res = allocate(list, capW, useW, 'wt');
    ut.wCap = wCap; ut.wUse = res.total; ut.wShort = res.total > 0 ? res.short / res.total : 0; ut.clean = anyTreat;
    for (let i = 0; i < N; i++) W.water[i] = wc[i] ? (capW[wc[i]] > 0 ? 1 : 2) : 0;

    // ---------- operating status ----------
    W.each(function (b) {
      const ready = (b.built >= 1 || b.reno) && !b.dmg && !b.ab && !b.fire;
      if (b.z) { b.on = ready && R.access(W, b) >= 0 && b.pw; return; }
      const d = M.DEFS[b.t];
      b.on = ready && (d.usePower ? b.pw : true) && (M.needsRoad(d) ? R.access(W, b) >= 0 : true);
    });

    // ---------- sewage ----------
    let sCap = 0, indW = 0;
    W.each(function (b) {
      if (b.z === 3 && b.lvl >= 3 && b.lvl < 5 && b.on && W.nearWater(b.x, b.y, b.s, 3)) indW += 0.03;
      if (b.z || !b.on) return; const d = M.DEFS[b.t]; if (d.sewage) sCap += d.sewage * M.upMul(b) * M.bf('water');
    });
    const sUse = (res.total - res.short) * 0.8;
    let ratio = sUse > 0 ? Math.max(0, sUse - sCap) / sUse : 0; if (!M.need('sewage')) ratio *= 0.25;
    const target = M.clamp(ratio * 0.7 + Math.min(0.3, indW), 0, 1);
    ut.waterPol += (target - ut.waterPol) * 0.25; ut.sCap = sCap; ut.sUse = sUse;

    // ---------- garbage ----------
    let gProd = 0, gCap = 0, lfCap = 0, lfStore = 0, lfUsed = 0; const fills = [];
    W.each(function (b) {
      if (b.z) { if (b.on) { const units = b.z === 1 ? b.pop : b.filled; gProd += units * M.USE.garbage[b.z] * (M.pol('recycle', b.y * n + b.x) ? 0.75 : 1); } return; }
      const d = M.DEFS[b.t]; if (!d.garbage) return;
      if (d.store) { lfStore += d.store; lfUsed += b.store; }
      if (!b.on) return;
      const c = d.garbage * M.upMul(b) * M.bf('waste');
      if (d.store) { if (b.store < d.store) { gCap += c; lfCap += c; fills.push(b); } } else gCap += c;
    });
    const needG = M.need('garbage'), frac = !needG ? 1 : gProd > 0 ? Math.min(1, gCap / gProd) : 1;
    if (needG && fills.length && gCap > 0) { const toLf = Math.min(gCap, gProd) / 4 * (lfCap / gCap) / fills.length; for (const b of fills) b.store = Math.min(M.DEFS[b.t].store, b.store + toLf); }
    const gTarget = Math.min(1, (1 - frac) * 2.2);
    W.each(function (b) { if (!b.z) return; b.garb += (gTarget - b.garb) * (gTarget > b.garb ? 0.2 : 0.35); if (b.garb < 0.01) b.garb = 0; });
    ut.gProd = gProd; ut.gCap = gCap; ut.gFrac = frac; ut.landfillFree = lfStore > 0 ? 1 - lfUsed / lfStore : -1;
  };
})();
