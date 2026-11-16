'use strict';
/* METROPOLIS – traffic: aggregate trip assignment (A*), congestion, buses, and visible vehicle/pedestrian agents */
(function () {
  const T = M.Traffic = {};
  T.maxCars = 160; T.maxPeds = 110;
  T.reset = function () { T.cars = []; T.peds = []; T.pool = []; T.origins = null; T.cursor = 0; T.routes = []; T.routeVer = ''; T.crowd = 1; T.trips = 0; T.free = []; T.svcTimer = 0; T.routeTimer = 0; T.time = 0; T.started = false; };
  T.reset();
  let jobDest, jobCum, shops, cargoDest, ridersAcc, tripsAcc, comOf;

  function startCycle(W, city) {
    const R = M.Roads; R.components(W);
    const o = [], jd = [], cum = [], sh = [], cg = []; let acc = 0;
    W.each(function (b) {
      if (b.z === 1) { if (b.pop > 0 && !b.ab) o.push(b); return; }
      if (!b.on) return;
      const rd = R.access(W, b); if (rd < 0) return;
      let jobs = 0;
      if (b.z === 2) { jobs = b.cap; sh.push(b); } else if (b.z === 3) { jobs = b.cap; if (b.filled > 0) o.push(b); }
      else { const d = M.DEFS[b.t]; jobs = d.jobs || 0; if (d.cargo) cg.push(b); }
      if (jobs > 0) { acc += jobs; jd.push(b); cum.push(acc); }
    });
    T.origins = o; T.cursor = 0; jobDest = jd; jobCum = cum; shops = sh; cargoDest = cg; ridersAcc = 0; tripsAcc = 0;
    W.tacc.fill(0); comOf = W.rcomp;
  }
  function finalize(W, city) {
    const N = W.n * W.n, tr = W.traffic, ta = W.tacc; let ws = 0, wt = 0;
    for (let i = 0; i < N; i++) {
      const t = W.road[i]; if (!t) { tr[i] = 0; continue; }
      tr[i] = tr[i] * 0.35 + ta[i] * 0.65;
      const cap = M.ROADS[t].cap; if (cap && tr[i] > 1) { const r = Math.min(2.5, tr[i] / cap); ws += r * tr[i]; wt += tr[i]; }
    }
    city.stats.congestion = wt ? ws / wt : 0; T.trips = tripsAcc;
    const cap = city.transit.cap;
    T.crowd = cap > 0 && ridersAcc > cap ? cap / ridersAcc : 1;
    city.transit.riders = Math.round(Math.min(ridersAcc, cap) * 30); city.transit.share = tripsAcc + ridersAcc > 0 ? Math.min(ridersAcc, cap) / (tripsAcc + ridersAcc) : 0;
    M.emit('traffic');
  }
  function pickJob(W, rd) {
    if (!jobDest.length) return null; const n = W.n, x = rd % n, y = (rd / n) | 0, total = jobCum[jobCum.length - 1]; let best = null, bd = 1e9;
    for (let k = 0; k < 5; k++) {
      const r = M.rand() * total; let lo = 0, hi = jobCum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (jobCum[m] < r) lo = m + 1; else hi = m; }
      const b = jobDest[lo]; if (b.dead) continue; const brd = M.Roads.access(W, b); if (brd < 0 || comOf[brd] !== comOf[rd]) continue;
      const d = Math.abs(brd % n - x) + Math.abs(((brd / n) | 0) - y); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  function pickNear(W, list, rd, tries) {
    if (!list.length) return null; const n = W.n, x = rd % n, y = (rd / n) | 0; let best = null, bd = 1e9;
    for (let k = 0; k < tries; k++) {
      const b = list[(M.rand() * list.length) | 0]; if (b.dead) continue; const brd = M.Roads.access(W, b); if (brd < 0 || comOf[brd] !== comOf[rd]) continue;
      const d = Math.abs(brd % n - x) + Math.abs(((brd / n) | 0) - y); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  function add(W, path, vol) { const ta = W.tacc; for (let k = 0; k < path.length; k++) ta[path[k]] += vol; tripsAcc += vol; }
  function remember(path, type) {
    if (path.length < 4) return;
    if (T.pool.length < 90) T.pool.push({ p: path, type: type }); else T.pool[(M.rand() * 90) | 0] = { p: path, type: type };
  }
  function transitShare(W, city, a, b) {
    if (!city.transit.cap) return 0; const c1 = W.bus[a], c2 = W.bus[b]; if (c1 < 0.3 || c2 < 0.3) return 0;
    return Math.min(0.6, 0.35 * Math.min(c1, c2) * M.bf('transit') * (city.pol.transit ? 1.5 : 1) * T.crowd);
  }
  function assign(W, city, b) {
    if (b.dead) return; const R = M.Roads, rd = R.access(W, b), n = W.n;
    if (rd < 0) { b.commute = -1; return; }
    if (b.z === 1) {
      const workers = b.pop * (city.pop > 0 ? city.stats.employed / city.pop : 0), dest = pickJob(W, rd);
      if (!dest) { b.commute = jobDest.length ? -1 : 0; }
      else {
        const drd = R.access(W, dest), path = R.path(W, rd, drd, 0);
        if (!path) b.commute = -1;
        else {
          const sh = transitShare(W, city, b.y * n + b.x, dest.y * n + dest.x);
          ridersAcc += workers * 2 * sh; add(W, path, workers * 2 * (1 - sh) * 0.55);
          b.commute = R.lastCost * 1.3 + 2; remember(path, 'car');
        }
      }
      const shop = pickNear(W, shops, rd, 3);
      if (shop) { const path = R.path(W, rd, R.access(W, shop), 0); if (path) { add(W, path, b.pop * 0.3); if (M.rand() < 0.5) remember(path, 'car'); } }
    } else if (b.z === 3) {
      const dest = cargoDest.length ? pickNear(W, cargoDest, rd, 3) : pickNear(W, shops, rd, 2);
      if (dest) { const path = R.path(W, rd, R.access(W, dest), 1); if (path) { add(W, path, b.filled * 0.12 * 2.5); remember(path, 'truck'); } }
    }
  }
  T.day = function (W, city) {
    if (!T.origins || T.cursor >= T.origins.length) { if (T.origins && T.started) finalize(W, city); startCycle(W, city); T.started = true; }
    const K = M.clamp(Math.ceil(T.origins.length / 30), 4, 70);
    for (let k = 0; k < K && T.cursor < T.origins.length; k++) assign(W, city, T.origins[T.cursor++]);
  };

  // ---------------- visible agents ----------------
  // Cars drive on the right-hand lane, follow smooth curves through turns, keep their distance, accelerate and brake,
  // stop at red lights and give way at junctions (one entry direction at a time holds a junction).
  const CAR_COLS = 7, BASE = 0.95, LEN = { car: 0.27, police: 0.27, truck: 0.36, garbage: 0.36, bus: 0.42, fire: 0.4 };
  let laneMap = new Map(), occ = new Map(), n = 0, Wd = null;
  function newCar(path, type) {
    const c = T.free.pop() || {};
    c.p = path; c.k = 0; c.t = 0; c.v = 0; c.type = type; c.col = (M.rand() * CAR_COLS) | 0; c.x = 0; c.y = 0; c.e = 1; c.d = 0; c.ax = 1;
    c.cb = null; c.cb2 = null; c.wait = 0; c.loop = false; c.ret = false; c.dead = false; c.g = null; c.gk = -1; c.a = 0; c.out = false;
    c.blocked = 0; c.ghost = 0; c.stops = null; c.emerg = type === 'fire'; c.len = LEN[type] || 0.27;
    return c;
  }
  T.dispatch = function (path, kind, onArrive, onDone) {
    n = M.world.n; Wd = M.world; const c = newCar(path, kind); c.cb = onArrive; c.cb2 = onDone; c.ret = true; c.a = 1; T.cars.push(c); geom(M.world, c); place(c); return c;
  };
  function dirOf(a, b) { const d = b - a; return d === 1 ? 1 : d === -1 ? 3 : d > 0 ? 2 : 0; }
  function laneW(W, i) { const t = W.road[i]; if (!t) return 0.13; const rt = M.ROADS[t]; return rt.id === 5 ? 0 : rt.id === 1 ? 0.09 : rt.w * 0.24; }
  // geometry of the car's current tile: quadratic Bezier from entry edge to exit edge, on the right-hand lane
  function geom(W, c) {
    const p = c.p, k = c.k, L = p.length, i = p[k], x = i % n + 0.5, y = ((i / n) | 0) + 0.5;
    const dIn = k > 0 ? dirOf(p[k - 1], i) : -1, dOut = k < L - 1 ? dirOf(i, p[k + 1]) : -1, Lc = laneW(W, i);
    const Lin = k > 0 ? (laneW(W, p[k - 1]) + Lc) / 2 : Lc, Lout = k < L - 1 ? (laneW(W, p[k + 1]) + Lc) / 2 : Lc;
    const dx = M.DX, dy = M.DY, g = c.g || (c.g = {});
    const ein = dIn >= 0 ? dIn : dOut, eout = dOut >= 0 ? dOut : dIn;
    if (dIn >= 0) { g.x0 = x - dx[dIn] * 0.5 - dy[dIn] * Lin; g.y0 = y - dy[dIn] * 0.5 + dx[dIn] * Lin; } else { g.x0 = x - dy[eout] * Lc; g.y0 = y + dx[eout] * Lc; }
    if (dOut >= 0) { g.x2 = x + dx[dOut] * 0.5 - dy[dOut] * Lout; g.y2 = y + dy[dOut] * 0.5 + dx[dOut] * Lout; } else { g.x2 = x - dy[ein] * Lc; g.y2 = y + dx[ein] * Lc; }
    g.turn = dIn >= 0 && dOut >= 0 && dIn !== dOut;
    if (g.turn) { g.x1 = x - dy[dIn] * Lc - dy[dOut] * Lc; g.y1 = y + dx[dIn] * Lc + dx[dOut] * Lc; } else { g.x1 = (g.x0 + g.x2) / 2; g.y1 = (g.y0 + g.y2) / 2; }
    g.len = Math.max(0.15, (Math.hypot(g.x1 - g.x0, g.y1 - g.y0) + Math.hypot(g.x2 - g.x1, g.y2 - g.y1)) * (g.turn ? 0.92 : 1));
    const ec = W.eh(i); g.e0 = k > 0 ? (W.eh(p[k - 1]) + ec) / 2 : ec; g.e1 = ec; g.e2 = k < L - 1 ? (W.eh(p[k + 1]) + ec) / 2 : ec;
    g.key = i * 4 + ein; g.nkey = dOut >= 0 ? p[k + 1] * 4 + dOut : -1; g.dOut = dOut; g.dIn = ein;
    g.sig = dOut >= 0 && M.Roads.signal(W, p[k + 1]); g.junc = dOut >= 0 && M.Roads.driveCount(W, p[k + 1]) >= 3;
    const rt = M.ROADS[W.road[i]] || M.ROADS[2], r = rt.cap ? W.traffic[i] / rt.cap : 0;
    g.vmax = rt.speed * BASE * M.roadCond / (1 + Math.min(1.5, r * r * 0.5)) * (g.turn ? 0.55 : 1) * (c.type === 'car' || c.type === 'police' ? 1 : 0.82);
    if (c.emerg) g.vmax = Math.max(g.vmax * 1.6, 1.8);
    c.gk = k;
  }
  function place(c) {
    const g = c.g, t = c.t, u = 1 - t, a = u * u, b = 2 * u * t, d = t * t;
    c.x = a * g.x0 + b * g.x1 + d * g.x2; c.y = a * g.y0 + b * g.y1 + d * g.y2; c.e = a * g.e0 + b * g.e1 + d * g.e2;
    const tx = u * (g.x1 - g.x0) + t * (g.x2 - g.x1), ty = u * (g.y1 - g.y0) + t * (g.y2 - g.y1);
    c.ax = Math.abs(tx) >= Math.abs(ty) ? 1 : 0; c.d = c.ax ? (tx > 0 ? 1 : 3) : (ty > 0 ? 2 : 0);
  }
  function indexCars(cars) {
    laneMap.clear(); occ.clear();
    for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (!c.g || c.out) continue; const k = c.g.key; let l = laneMap.get(k); if (!l) laneMap.set(k, l = []); l.push(c); const tile = k >> 2; if (Wd && M.Roads.driveCount(Wd, tile) >= 3) addOcc(tile, c.g.dIn); }
  }
  function addOcc(tile, dir) { let o = occ.get(tile); if (!o) occ.set(tile, o = [0, 0, 0, 0]); o[dir]++; }
  function remOcc(tile, dir) { const o = occ.get(tile); if (o && o[dir] > 0) o[dir]--; }
  function laneRemove(c) { const l = laneMap.get(c.g.key); if (l) { const j = l.indexOf(c); if (j >= 0) l.splice(j, 1); } }
  // distance (in tiles along the road) to the nearest obstacle ahead: another car, a red light or a busy junction
  function clearance(W, c) {
    const g = c.g, here = (1 - c.t) * g.len; let gap = 9;
    const l = laneMap.get(g.key); if (l) for (let i = 0; i < l.length; i++) { const o = l[i]; if (o !== c && o.t > c.t) { const d = (o.t - c.t) * g.len - (o.len + c.len) / 2; if (d < gap) gap = d; } }
    if (g.nkey >= 0) {
      const l2 = laneMap.get(g.nkey); if (l2) for (let i = 0; i < l2.length; i++) { const o = l2[i]; if (o === c) continue; const d = here + o.t * o.g.len - (o.len + c.len) / 2; if (d < gap) gap = d; }
      if (!c.emerg) {
        const stop = here - 0.12;
        if (g.sig) { const ns = g.dOut === 0 || g.dOut === 2; if (M.Roads.greenNS(c.p[c.k + 1], T.time) !== ns && stop > -0.02 && stop < gap) gap = Math.max(0, stop); }
        if (g.junc && stop > -0.02) { const o = occ.get(c.p[c.k + 1]); if (o) for (let d = 0; d < 4; d++) if (o[d] && d !== g.dOut && !(g.sig && (d & 1) === (g.dOut & 1))) { if (stop < gap) gap = Math.max(0, stop); break; } }
      }
    }
    return gap;
  }
  function stepCar(W, c, dt) {
    if (c.out) { c.a -= dt * 2.2; return c.a > 0; }
    if (c.a < 1) c.a = Math.min(1, c.a + dt * 2.2);
    const p = c.p; if (c.k >= p.length - 1 && !c.g) return endCar(W, c);
    for (let k = c.k; k <= Math.min(p.length - 1, c.k + 1); k++) if (!W.road[p[k]]) { if (c.cb2) c.cb2(); return false; }
    if (c.gk !== c.k) geom(W, c);
    if (c.wait > 0) { c.wait -= dt; c.v = 0; return true; }
    const g = c.g;
    // bus stops
    if (c.stops && c.stops.has(c.k) && c.t >= 0.5 && c.t - c.v * dt / g.len < 0.5 && !c.dwelt) { c.dwelt = true; c.wait = 1.6; c.t = 0.5; place(c); return true; }
    let gap = c.ghost > 0 ? 9 : clearance(W, c); if (c.ghost > 0) c.ghost -= dt;
    const vt = Math.min(g.vmax, Math.max(0, (gap - 0.06) * 2.6));
    c.v = vt < c.v ? Math.max(vt, c.v - 5 * dt) : Math.min(vt, c.v + 1.1 * dt);
    if (c.v < 0.02 && vt < 0.05) { c.blocked += dt; if (c.blocked > 7) { c.ghost = 1.6; c.blocked = 0; c.stuck = (c.stuck || 0) + 1; if (c.stuck > 3 && !c.loop && !c.ret && !c.cb2) { c.out = true; laneRemove(c); return true; } } } else c.blocked = 0;
    c.t += c.v * dt / g.len;
    while (c.t >= 1) {
      if (c.k >= p.length - 1) { c.t = 1; place(c); return endCar(W, c); }
      const was = c.g.key, wasDir = c.g.dIn, wasTile = p[c.k]; c.t = (c.t - 1) * g.len; c.k++; c.dwelt = false;
      if (M.Roads.driveCount(W, wasTile) >= 3) remOcc(wasTile, wasDir);
      const l0 = laneMap.get(was); if (l0) { const j = l0.indexOf(c); if (j >= 0) l0.splice(j, 1); }
      geom(W, c); c.t /= c.g.len; let l = laneMap.get(c.g.key); if (!l) laneMap.set(c.g.key, l = []); l.push(c);
      if (M.Roads.driveCount(W, p[c.k]) >= 3) addOcc(p[c.k], c.g.dIn);
      if (c.k >= p.length - 1 && c.t >= 1) break;
    }
    place(c); return true;
  }
  function endCar(W, c) {
    if (c.cb) { const f = c.cb; c.cb = null; f(); }
    if (c.ret) { c.ret = false; c.p = c.p.slice().reverse(); c.k = 0; c.t = 0; c.v = 0; c.gk = -1; c.wait = 2.5; return true; }
    if (c.loop) { c.k = 0; c.t = 0; c.gk = -1; return true; }
    if (c.cb2) { const f = c.cb2; c.cb2 = null; f(); }
    c.out = true; laneRemove(c); return true;
  }
  // spawn a car at the start of a path, or part-way along it, only where the lane is free
  function trySpawn(W, path, type, mid) {
    if (!path || path.length < 4) return false; const c = newCar(path, type);
    if (mid) { c.k = 1 + ((M.rand() * (path.length - 3)) | 0); c.t = M.rand(); }
    geom(W, c); c.v = mid ? c.g.vmax * 0.7 : 0;
    const l = laneMap.get(c.g.key); if (l) for (const o of l) if (Math.abs((o.t - c.t) * c.g.len) < 0.7) { T.free.push(c); return false; }
    place(c); T.cars.push(c); let l2 = laneMap.get(c.g.key); if (!l2) laneMap.set(c.g.key, l2 = []); l2.push(c); return true;
  }
  function buildRoutes(W, city) {
    const R = M.Roads, tot = M.Services.totals; T.routes = [];
    T.cars = T.cars.filter(function (c) { if (c.type === 'bus') { T.free.push(c); return false; } return true; });
    if (!tot || !tot.depots.length) return;
    R.components(W); const stops = []; W.each(function (b) { if (b.t === 'busstop' && b.busOK) stops.push(b); });
    for (const dep of tot.depots) {
      const start = R.access(W, dep); if (start < 0) continue;
      let mine = stops.filter(function (s) { const rd = W.findRoad(s.x, s.y, 1, 1); return rd >= 0 && W.rcomp[rd] === W.rcomp[start] && !s.routed; }).slice(0, 10);
      if (!mine.length) continue;
      let cur = start, full = [start];
      while (mine.length) {
        let bi = 0, bd = 1e9; for (let k = 0; k < mine.length; k++) { const d = Math.abs(mine[k].x - cur % n) + Math.abs(mine[k].y - ((cur / n) | 0)); if (d < bd) { bd = d; bi = k; } }
        const s = mine.splice(bi, 1)[0], rd = W.findRoad(s.x, s.y, 1, 1), seg = R.path(W, cur, rd, 2);
        if (seg && seg.length > 1) { for (let k = 1; k < seg.length; k++) full.push(seg[k]); cur = rd; }
      }
      const back = R.path(W, cur, start, 2); if (back) for (let k = 1; k < back.length; k++) full.push(back[k]);
      if (full.length < 4) continue;
      T.routes.push(full);
      const nb = Math.min(3, 1 + Math.floor(full.length / 40));
      const stopIdx = new Set(); for (let k = 0; k < full.length; k++) for (const st of stops) { if (Math.abs(full[k] % n - st.x) + Math.abs(((full[k] / n) | 0) - st.y) === 1) stopIdx.add(k); }
      for (let k = 0; k < nb; k++) { const c = newCar(full, 'bus'); c.loop = true; c.stops = stopIdx; c.k = Math.floor(k * full.length / nb) % (full.length - 1); c.a = 0; T.cars.push(c); }
    }
  }
  function spawnService(W, city) {
    const tot = M.Services.totals; if (!tot || !T.origins || !T.origins.length) return;
    const R = M.Roads, kinds = [];
    if (tot.policeSt.length) kinds.push(['police', tot.policeSt]); if (tot.waste.length) kinds.push(['garbage', tot.waste]);
    if (!kinds.length) return;
    const k = M.pick(kinds), st = M.pick(k[1]), dst = M.pick(T.origins); if (st.dead || dst.dead) return;
    let cnt = 0; for (const c of T.cars) if (c.type === k[0]) cnt++; if (cnt >= 3) return;
    const p = R.path(W, R.access(W, st), R.access(W, dst), 2); if (!p || p.length < 3) return;
    const c = newCar(p, k[0]); c.ret = true; geom(W, c); place(c); T.cars.push(c);
  }
  // dt: seconds of animation time already scaled by simulation speed (0 when paused)
  T.update = function (dt, W, city, view) {
    T.time += dt; if (dt <= 0) return; n = W.n; Wd = W;
    const cars = T.cars;
    T.routeTimer -= dt;
    if (T.routeTimer <= 0) { T.routeTimer = 4; const v = W.roadVer + ':' + W.bldVer + ':' + (M.Services.totals ? M.Services.totals.stops + '/' + M.Services.totals.depots.length : ''); if (v !== T.routeVer) { T.routeVer = v; buildRoutes(W, city); } }
    T.svcTimer -= dt; if (T.svcTimer <= 0) { T.svcTimer = 5; if (T.maxCars) spawnService(W, city); }
    // civilian cars: fewer than before, spawned near the camera, at a calm pace
    n = W.n; Wd = W; indexCars(cars);
    const target = Math.min(T.maxCars, Math.floor(T.trips / 45));
    let civ = 0; for (let i = 0; i < cars.length; i++) if ((cars[i].type === 'car' || cars[i].type === 'truck') && !cars[i].out) civ++;
    T.spawnAcc = (T.spawnAcc || 0) + dt * (2 + target / 20);
    while (T.spawnAcc >= 1 && civ < target && T.pool.length) {
      T.spawnAcc -= 1; let best = null, bd = 1e9;
      for (let k = 0; k < 4; k++) { const e = T.pool[(M.rand() * T.pool.length) | 0], mid = e.p[e.p.length >> 1]; const d = view ? Math.abs(mid % n - view.cx) + Math.abs(((mid / n) | 0) - view.cy) : 0; if (d < bd) { bd = d; best = e; } }
      if (trySpawn(W, best.p, best.type, civ < target * 0.6 && M.rand() < 0.5)) civ++;
    }
    if (T.spawnAcc > 2) T.spawnAcc = 2;
    let w = 0;
    for (let i = 0; i < cars.length; i++) { const c = cars[i]; if (stepCar(W, c, dt)) cars[w++] = c; else T.free.push(c); }
    cars.length = w;
    // pedestrians
    const peds = T.peds;
    if (view && T.maxPeds) {
      const want = Math.min(T.maxPeds, Math.floor(city.pop / 60)) * (view.night > 0.6 ? 0.3 : 1);
      for (let k = 0; k < 6 && peds.length < want; k++) {
        const x = Math.round(view.cx + (M.rand() - 0.5) * 2 * view.r), y = Math.round(view.cy + (M.rand() - 0.5) * 2 * view.r); if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue;
        const i = y * n + x, t = W.road[i]; if (!t || t === 6 || t === 1) continue;
        let near = false; for (let d = 0; d < 4; d++) if (W.bld[i + M.DX[d] + M.DY[d] * n]) near = true; if (!near && t !== 7) continue;
        peds.push({ i: i, j: i, t: 1, side: M.rand() < 0.5 ? 1 : -1, col: (M.rand() * 6) | 0, life: 20 + M.rand() * 40, x: x + 0.5, y: y + 0.5, e: W.eh(i), ph: M.rand() * 6 });
      }
    }
    w = 0;
    for (let k = 0; k < peds.length; k++) {
      const p = peds[k]; p.life -= dt; p.t += dt * 0.32;
      if (p.t >= 1) {
        p.t = 0; const prev = p.i; p.i = p.j; const x = p.i % n, y = (p.i / n) | 0; let opts = 0, pick = -1;
        for (let d = 0; d < 4; d++) { const xx = x + M.DX[d], yy = y + M.DY[d]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const j = yy * n + xx, t = W.road[j]; if (!t || t === 6 || j === prev) continue; opts++; if (M.rand() < 1 / opts) pick = j; }
        p.j = pick >= 0 ? pick : prev;
      }
      if (p.life <= 0 || !W.road[p.i] || (view && (Math.abs(p.x - view.cx) > view.r + 6 || Math.abs(p.y - view.cy) > view.r + 6))) continue;
      const ax = p.i % n + 0.5, ay = ((p.i / n) | 0) + 0.5, bx = p.j % n + 0.5, by = ((p.j / n) | 0) + 0.5, dx = bx - ax, dy = by - ay;
      const off = W.road[p.i] === 7 ? 0.06 : 0.4;
      p.x = ax + dx * p.t - dy * off * p.side; p.y = ay + dy * p.t + dx * off * p.side; p.e = M.lerp(W.eh(p.i), W.eh(p.j), p.t);
      peds[w++] = p;
    }
    peds.length = w;
  };
})();
