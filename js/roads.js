'use strict';
/* METROPOLIS – road network: placement, connectivity, components, A* pathfinding */
(function () {
  const R = M.Roads = {};
  let g, from, openStamp, closedStamp, stamp = 0, heap, sized = 0;
  function ensure(W) {
    const N = W.n * W.n; if (sized === N) return;
    g = new Float32Array(N); from = new Int32Array(N); openStamp = new Uint32Array(N); closedStamp = new Uint32Array(N); heap = new M.Heap(1024); sized = N; stamp = 0;
  }
  R.drivable = function (W, i) { const t = W.road[i]; return t !== 0 && !M.ROADS[t].ped; };
  R.set = function (W, x, y, type, dir) {
    const i = W.idx(x, y); if (!W.road[i]) W.roadTiles++;
    W.road[i] = type; W.rdir[i] = dir || 0; W.deco[i] = 0; W.zone[i] = 0; W.zdens[i] = 0; W.pline[i] = 0;
    W.roadVer++; R.dirtyAround(W, x, y);
  };
  R.clear = function (W, x, y) {
    const i = W.idx(x, y); if (!W.road[i]) return;
    W.road[i] = 0; W.rdir[i] = 0; W.traffic[i] = 0; W.roadTiles--; W.roadVer++; R.dirtyAround(W, x, y);
  };
  R.dirtyAround = function (W, x, y) { W.dirty(x, y); for (let d = 0; d < 4; d++) { const xx = x + M.DX[d], yy = y + M.DY[d]; if (W.inb(xx, yy)) W.dirty(xx, yy); } };
  // bitmask of neighbours that have any road (bit d set for direction d)
  R.mask = function (W, x, y) {
    let m = 0; const n = W.n;
    if (y > 0 && W.road[(y - 1) * n + x]) m |= 1;
    if (x < n - 1 && W.road[y * n + x + 1]) m |= 2;
    if (y < n - 1 && W.road[(y + 1) * n + x]) m |= 4;
    if (x > 0 && W.road[y * n + x - 1]) m |= 8;
    return m;
  };
  R.driveCount = function (W, i) {
    const n = W.n, x = i % n, y = (i / n) | 0; let c = 0;
    if (y > 0 && R.drivable(W, i - n)) c++; if (x < n - 1 && R.drivable(W, i + 1)) c++;
    if (y < n - 1 && R.drivable(W, i + n)) c++; if (x > 0 && R.drivable(W, i - 1)) c++;
    return c;
  };
  R.signal = function (W, i) { const t = W.road[i]; return t !== 0 && M.ROADS[t].lights && R.driveCount(W, i) >= 3; };
  // green for the N-S axis when true (cycles with wall-clock time)
  R.greenNS = function (i, time) { return ((time * 0.14 + (i % 7) * 0.31) % 1) < 0.5; };

  let compVer = 0;
  R.components = function (W) {
    if (compVer === W.roadVer && R._w === W) return;
    compVer = W.roadVer; R._w = W;
    const n = W.n, N = n * n, c = W.rcomp; c.fill(0); let id = 0; const stack = [];
    for (let s = 0; s < N; s++) {
      if (c[s] || !R.drivable(W, s)) continue;
      id++; c[s] = id; stack.push(s);
      while (stack.length) {
        const i = stack.pop(), x = i % n, y = (i / n) | 0;
        for (let d = 0; d < 4; d++) { const xx = x + M.DX[d], yy = y + M.DY[d]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const j = yy * n + xx; if (!c[j] && R.drivable(W, j)) { c[j] = id; stack.push(j); } }
      }
    }
    R.ncomp = id;
  };
  R.congestion = function (W, i) { const t = W.road[i]; if (!t) return 0; const cap = M.ROADS[t].cap; return cap ? W.traffic[i] / cap : 0; };
  R.tileCost = function (W, i, mode) {
    const rt = M.ROADS[W.road[i]]; let c = 1 / rt.speed;
    if (mode !== 2) { const r = W.traffic[i] / rt.cap; c *= 1 + Math.min(6, r * r * 1.5); }
    if (rt.lights && R.driveCount(W, i) >= 3) c += mode === 2 ? 0.1 : 0.8;
    if (mode === 1 && M.pol('trucks', i)) c *= 6;
    return c;
  };
  // A* over road tiles. mode: 0 car, 1 truck, 2 emergency. Returns array of tile indices (a..b) or null. R.lastCost holds path cost.
  R.path = function (W, a, b, mode) {
    ensure(W); R.lastCost = 0;
    if (a < 0 || b < 0 || !R.drivable(W, a) || !R.drivable(W, b)) return null;
    R.components(W); if (W.rcomp[a] !== W.rcomp[b]) return null;
    if (a === b) return [a];
    const n = W.n, bx = b % n, by = (b / n) | 0, road = W.road, rdir = W.rdir;
    stamp++; heap.clear(); g[a] = 0; from[a] = -1; openStamp[a] = stamp; heap.push(a, 0);
    let guard = 0;
    while (heap.n) {
      const i = heap.pop(); if (closedStamp[i] === stamp) continue; closedStamp[i] = stamp;
      if (i === b) break;
      if (++guard > 60000) return null;
      const x = i % n, y = (i / n) | 0, ti = road[i], one = ti === 5;
      for (let d = 0; d < 4; d++) {
        if (one && rdir[i] !== d) continue;
        const xx = x + M.DX[d], yy = y + M.DY[d]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const j = yy * n + xx, tj = road[j]; if (!tj || tj === 7) continue;
        if (tj === 5 && rdir[j] === ((d + 2) & 3)) continue;
        if (closedStamp[j] === stamp) continue;
        const ng = g[i] + R.tileCost(W, j, mode);
        if (openStamp[j] !== stamp || ng < g[j]) {
          g[j] = ng; from[j] = i; openStamp[j] = stamp;
          heap.push(j, ng + (Math.abs(xx - bx) + Math.abs(yy - by)) * 0.4);
        }
      }
    }
    if (closedStamp[b] !== stamp) return null;
    const out = []; let k = b; while (k !== -1) { out.push(k); k = from[k]; }
    out.reverse(); R.lastCost = g[b];
    return out;
  };
  // cached access road tile for a building
  R.access = function (W, b) {
    if (b.rv === W.roadVer) return b.rd;
    b.rv = W.roadVer; b.rd = W.findRoad(b.x, b.y, b.s, b.z ? 2 : 1);
    return b.rd;
  };
})();
