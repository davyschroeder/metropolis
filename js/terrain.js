'use strict';
/* METROPOLIS – procedural terrain generation (seeded) */
(function () {
  const T = M.Terrain = {};
  // terr: 0 water 1 grass 2 sand 3 rock ; deco: 1 conifer 2 broadleaf 3 bush 4 rock 5 flowers 6 broadleaf-b
  T.generate = function (W, o) {
    const n = W.n, N = n * n, seed = o.seed >>> 0;
    const water = o.water == null ? 0.5 : o.water, hills = o.hills == null ? 0.5 : o.hills, forest = o.forest == null ? 0.5 : o.forest;
    const h = new Float32Array(N);
    const island = water > 0.58;
    const side = seed % 4; // which edge is the sea
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let v = M.fbm(x * 3.1 / n, y * 3.1 / n, seed, 5) * 0.72 + M.fbm(x * 9 / n, y * 9 / n, seed + 77, 3) * 0.28;
      if (island) {
        const dx = x / n - 0.5, dy = y / n - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
        v -= M.smooth(0.55, 1.05, d) * 0.4;
      } else {
        const d = side === 0 ? y / n : side === 1 ? 1 - x / n : side === 2 ? 1 - y / n : x / n;
        v -= (1 - M.smooth(0, 0.3, d)) * 0.3;
      }
      h[y * n + x] = v;
    }
    // river from the far edge to the sea
    if (!island && o.river !== false) {
      const rnd = M.rng(seed + 5);
      let px, py, ang;
      const t = 0.25 + rnd() * 0.5;
      if (side === 0) { px = t * n; py = n - 1; ang = -Math.PI / 2; }
      else if (side === 1) { px = 0; py = t * n; ang = 0; }
      else if (side === 2) { px = t * n; py = 0; ang = Math.PI / 2; }
      else { px = n - 1; py = t * n; ang = Math.PI; }
      const base = ang;
      for (let s = 0; s < n * 3; s++) {
        ang = base + (M.noise(s * 0.07, 3.3, seed + 9) - 0.5) * 2.6;
        px += Math.cos(ang); py += Math.sin(ang);
        if (px < 0 || py < 0 || px >= n || py >= n) break;
        const wdt = 1 + (M.noise(s * 0.05, 9.1, seed + 3) > 0.55 ? 1 : 0);
        for (let oy = -wdt; oy <= wdt; oy++) for (let ox = -wdt; ox <= wdt; ox++) {
          const xx = Math.round(px + ox), yy = Math.round(py + oy);
          if (xx < 0 || yy < 0 || xx >= n || yy >= n || ox * ox + oy * oy > wdt * wdt + 0.5) continue;
          h[yy * n + xx] = -1;
        }
      }
    }
    // percentile thresholds
    const sorted = Float32Array.from(h).sort();
    const q = function (p) { return sorted[Math.min(N - 1, Math.max(0, Math.floor(p * N)))]; };
    const wl = q(0.08 + water * 0.3), l2 = q(1 - hills * 0.3), l3 = q(1 - hills * 0.13), l4 = q(1 - hills * 0.045);
    for (let i = 0; i < N; i++) { const v = h[i]; W.elev[i] = v < wl ? 0 : v < l2 ? 1 : v < l3 ? 2 : v < l4 ? 3 : 4; }
    // remove isolated one-tile lakes / islets and limit slopes to 1 level
    for (let pass = 0; pass < 4; pass++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; let mn = 9, wat = 0, cnt = 0;
      for (let d = 0; d < 4; d++) { const xx = x + M.DX[d], yy = y + M.DY[d]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const e = W.elev[yy * n + xx]; cnt++; if (e < mn) mn = e; if (e === 0) wat++; }
      if (W.elev[i] === 0 && wat === 0 && pass === 0) W.elev[i] = 1;
      else if (W.elev[i] > 0 && wat === cnt && pass === 0) W.elev[i] = 0;
      else if (W.elev[i] > mn + 1) W.elev[i] = mn + 1;
    }
    T.finish(W, seed, forest);
    // starting spot: flat land nearest to centre
    let best = -1, bd = 1e9;
    for (let y = 4; y < n - 4; y++) for (let x = 4; x < n - 4; x++) {
      if (W.elev[y * n + x] !== 1) continue;
      let flat = 0; for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) if (W.elev[(y + oy) * n + x + ox] === 1) flat++;
      if (flat < 40) continue;
      const d = (x - n / 2) * (x - n / 2) + (y - n / 2) * (y - n / 2); if (d < bd) { bd = d; best = y * n + x; }
    }
    if (best < 0) best = ((n / 2) | 0) * n + ((n / 2) | 0);
    W.start = { x: best % n, y: (best / n) | 0 };
    const half = Math.round(n * 0.3);
    W.limit = { x0: Math.max(0, W.start.x - half), y0: Math.max(0, W.start.y - half), x1: Math.min(n - 1, W.start.x + half), y1: Math.min(n - 1, W.start.y + half) };
  };

  // derive terrain type, water depth and natural decoration from elevation
  T.finish = function (W, seed, forest) {
    const n = W.n, N = n * n;
    const dist = new Int16Array(N).fill(-1); const queue = new Int32Array(N); let qh = 0, qt = 0;
    for (let i = 0; i < N; i++) if (W.elev[i] > 0) { dist[i] = 0; queue[qt++] = i; }
    while (qh < qt) { const i = queue[qh++], x = i % n, y = (i / n) | 0; for (let d = 0; d < 4; d++) { const xx = x + M.DX[d], yy = y + M.DY[d]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const j = yy * n + xx; if (dist[j] < 0) { dist[j] = dist[i] + 1; queue[qt++] = j; } } }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; W.deco[i] = 0;
      if (W.elev[i] === 0) { W.terr[i] = 0; W.wdepth[i] = Math.min(4, dist[i] < 0 ? 4 : dist[i]); continue; }
      W.wdepth[i] = 0;
      let nearW = false;
      for (let oy = -1; oy <= 1 && !nearW; oy++) for (let ox = -1; ox <= 1; ox++) { const xx = x + ox, yy = y + oy; if (xx >= 0 && yy >= 0 && xx < n && yy < n && W.elev[yy * n + xx] === 0) { nearW = true; break; } }
      const r = M.hash(x, y, seed + 11);
      if (nearW && r < 0.8) { W.terr[i] = 2; continue; }
      if (W.elev[i] >= 3 && M.fbm(x * 0.2, y * 0.2, seed + 40, 2) > 0.5) { W.terr[i] = 3; if (r < 0.1) W.deco[i] = 4; continue; }
      W.terr[i] = 1;
      const f = M.fbm(x * 7 / n, y * 7 / n, seed + 999, 3);
      if (f > 1 - forest * 0.62 + 0.08) {
        if (r < 0.78) W.deco[i] = (W.elev[i] >= 2 || M.noise(x * 0.11, y * 0.11, seed + 5) > 0.6) ? 1 : (r < 0.4 ? 2 : 6);
        else if (r < 0.86) W.deco[i] = 3;
      } else if (r < 0.018) W.deco[i] = 3;
      else if (r < 0.026) W.deco[i] = 4;
      else if (r < 0.044) W.deco[i] = 5;
      else if (r < 0.058) W.deco[i] = r < 0.05 ? 2 : 1;
    }
  };
})();
