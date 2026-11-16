'use strict';
/* METROPOLIS – environment: pollution, noise, crime, land value, weather, fires and disasters */
(function () {
  const E = M.Env = {};
  let sa, sb, sc, sized = 0;
  function ensure(N) { if (sized !== N) { sa = new Float32Array(N); sb = new Float32Array(N); sc = new Float32Array(N); sized = N; } }
  function maxDecay(a, n, k) {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; let v = a[i]; if (x > 0) { const t = a[i - 1] * k; if (t > v) v = t; } if (y > 0) { const t = a[i - n] * k; if (t > v) v = t; } a[i] = v; }
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) { const i = y * n + x; let v = a[i]; if (x < n - 1) { const t = a[i + 1] * k; if (t > v) v = t; } if (y < n - 1) { const t = a[i + n] * k; if (t > v) v = t; } a[i] = v; }
  }
  function blur(a, tmp, n, r) {
    const w = 2 * r + 1;
    for (let y = 0; y < n; y++) { let s = 0; const o = y * n; for (let x = -r; x <= r; x++) s += a[o + M.clamp(x, 0, n - 1)]; for (let x = 0; x < n; x++) { tmp[o + x] = s / w; s += a[o + M.clamp(x + r + 1, 0, n - 1)] - a[o + M.clamp(x - r, 0, n - 1)]; } }
    for (let x = 0; x < n; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[M.clamp(y, 0, n - 1) * n + x]; for (let y = 0; y < n; y++) { a[y * n + x] = s / w; s += tmp[M.clamp(y + r + 1, 0, n - 1) * n + x] - tmp[M.clamp(y - r, 0, n - 1) * n + x]; } }
  }
  function fill(W, b, map, v) { for (let yy = b.y; yy < b.y + b.s; yy++) for (let xx = b.x; xx < b.x + b.s; xx++) { const i = yy * W.n + xx; if (v > map[i]) map[i] = v; } }

  E.pollution = function (W, city) {
    const n = W.n, N = n * n; ensure(N);
    const air = sa, noise = sb, gnd = sc; air.fill(0); noise.fill(0); gnd.fill(0);
    W.each(function (b) {
      if (b.z) {
        if (!b.on) { if (b.garb > 0.2) fill(W, b, gnd, b.garb * 15); return; }
        const zb = M.ZB[b.z], act = 0.4 + 0.6 * (b.cap ? b.filled / b.cap : 0);
        if (b.z === 3) { fill(W, b, air, zb.air[b.lvl] * act * (M.pol('filters', b.y * n + b.x) ? 0.65 : 1)); fill(W, b, gnd, zb.gnd[b.lvl] * act); fill(W, b, noise, zb.noise[b.lvl]); }
        else if (b.z === 2) fill(W, b, noise, zb.noise[b.lvl]);
        if (b.garb > 0.2) fill(W, b, gnd, b.garb * 15);
        return;
      }
      const d = M.DEFS[b.t]; if (!b.on) return;
      const k = d.store ? 0.3 + 0.7 * b.store / d.store : 1;
      if (d.air) fill(W, b, air, d.air * k); if (d.gnd) fill(W, b, gnd, d.gnd * k); if (d.noise) fill(W, b, noise, d.noise);
    });
    for (let i = 0; i < N; i++) {
      const t = W.road[i]; if (!t) continue; const rt = M.ROADS[t]; if (!rt.cap) continue;
      const r = W.traffic[i] / rt.cap;
      const a = Math.min(14, r * 9); if (a > air[i]) air[i] = a;
      let nz = (t === 6 ? 22 : 4) + Math.min(34, r * 26); if (M.pol('trucks', i)) nz *= 0.7; if (nz > noise[i]) noise[i] = nz;
    }
    const cum = W.tmp; cum.set(air); blur(cum, W.tmp2, n, 4);
    maxDecay(air, n, 0.8); maxDecay(noise, n, 0.68); maxDecay(gnd, n, 0.55);
    for (let i = 0; i < N; i++) {
      let a = air[i] + cum[i] * 0.6; const dc = W.deco[i];
      if (dc === 1 || dc === 2 || dc === 6) a *= 0.8;
      a *= 1 - 0.3 * W.park[i];
      W.air[i] += (a - W.air[i]) * 0.6; W.noise[i] = noise[i];
      const g = gnd[i]; W.gnd[i] += (g - W.gnd[i]) * (g > W.gnd[i] ? 0.2 : 0.04);
    }
  };

  E.landValue = function (W, city) {
    const n = W.n, N = n * n, s = city.stats; ensure(N);
    const wat = sa, nat = sb, cr = sc; wat.fill(0); nat.fill(0); cr.fill(0);
    for (let i = 0; i < N; i++) {
      if (W.elev[i] === 0) wat[i] = 13;
      const dc = W.deco[i], rt = W.road[i];
      if (dc === 1 || dc === 2 || dc === 6) nat[i] = 6; else if (dc === 5) nat[i] = 3;
      if (rt === 4) nat[i] = 5; else if (rt === 7) nat[i] = 4;
    }
    const crimeBase = 0.2 + s.unemp * 2.5 + (1 - s.eduIdx) * 0.35 + s.poverty * 0.5;
    const bonus = W.tmp; bonus.fill(0);
    W.each(function (b) {
      if (b.z) {
        if (b.ab) { fill(W, b, cr, 12); return; }
        if (b.z === 1) fill(W, b, cr, b.pop / (b.s * b.s) / 3 * crimeBase);
        else if (b.z === 2) fill(W, b, cr, b.filled / (b.s * b.s) / 4 * 0.4 + 1);
        return;
      }
      const d = M.DEFS[b.t]; if (b.t === 'rubble') { fill(W, b, cr, 6); return; }
      if (d.green) fill(W, b, nat, d.green);
      if (!d.lv || (!b.on && d.lv > 0)) return;
      const cx = b.x + b.s / 2, cy = b.y + b.s / 2, r = d.lvr, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(n - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(n - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dd = Math.sqrt((x + 0.5 - cx) * (x + 0.5 - cx) + (y + 0.5 - cy) * (y + 0.5 - cy)); if (dd < r) bonus[y * n + x] += d.lv * (1 - dd / r); }
    });
    maxDecay(wat, n, 0.78); maxDecay(nat, n, 0.62); maxDecay(cr, n, 0.72);
    const needP = M.need('police'); let lvSum = 0, lvN = 0;
    for (let i = 0; i < N; i++) {
      if (W.elev[i] === 0) { W.lv[i] = 0; W.crime[i] = 0; continue; }
      const pol = M.Services.cov(W, 'police', i);
      const c = cr[i] * (1 - 0.85 * pol) * (needP ? 1 : 0.35); W.crime[i] = c;
      let v = 26 + wat[i] + nat[i] + M.Services.cov(W, 'park', i) * 18 + W.edu[i] * 7 + W.edu2[i] * 4 + W.health[i] * 6 + pol * 5 + W.fire[i] * 4 + bonus[i]
        - W.air[i] * 0.6 - W.gnd[i] * 0.5 - W.noise[i] * 0.3 - c * 0.45 + (W.elev[i] >= 2 ? 4 : 0);
      v = v < 0 ? 0 : v > 100 ? 100 : v;
      W.lv[i] += (v - W.lv[i]) * 0.5;
      if (W.bld[i]) { lvSum += W.lv[i]; lvN++; }
    }
    s.lvAvg = lvN ? lvSum / lvN : 30;
  };

  // ---------- weather ----------
  // Weather runs on (roughly) real time so a shower lasts about a minute however fast the city runs,
  // and it fades in and out instead of switching on and off.
  const WDUR = { clear: [100, 240], cloudy: [60, 150], rain: [55, 120], fog: [40, 90], storm: [40, 75] };
  E.setWeather = function (city, type, secs) {
    const w = city.weather, d = WDUR[type]; w.type = type; w.t = secs || d[0] + M.rand() * (d[1] - d[0]); M.emit('weather', type);
  };
  E.weatherTick = function (city, dt) {
    const w = city.weather; if (w.t == null) { w.t = 60; w.rainI = 0; w.fogI = 0; w.cloudI = 0.2; }
    w.t -= dt;
    if (w.t <= 0) {
      const month = Math.floor((city.day % 360) / 30), wet = month >= 9 || month <= 2 ? 1.4 : 0.85, r = M.rand(), cur = w.type;
      let next;
      if (cur === 'rain' || cur === 'storm') next = r < 0.6 ? 'cloudy' : 'clear';
      else if (cur === 'cloudy') next = r < 0.32 * wet ? 'rain' : r < 0.36 * wet ? 'storm' : r < 0.6 ? 'cloudy' : 'clear';
      else if (cur === 'fog') next = 'clear';
      else next = r < 0.38 ? 'cloudy' : r < 0.38 + 0.08 * wet ? 'fog' : 'clear';
      E.setWeather(city, next);
    }
    const ty = w.type, tr = ty === 'storm' ? 1 : ty === 'rain' ? 0.6 : 0, tf = ty === 'fog' ? 1 : 0, tc = ty === 'clear' ? 0.12 : ty === 'cloudy' ? 0.6 : ty === 'fog' ? 0.35 : 1;
    const k = Math.min(1, dt * 0.13); w.rainI += (tr - w.rainI) * k; w.fogI += (tf - w.fogI) * k; w.cloudI += (tc - w.cloudI) * k;
  };
  E.weatherDay = function (W, city) {
    const w = city.weather, ty = w.type;
    const target = ty === 'clear' ? 0.55 : ty === 'cloudy' ? 0.75 : ty === 'rain' ? 0.85 : ty === 'storm' ? 1 : 0.35;
    w.wind += (target + (M.rand() - 0.5) * 0.2 - w.wind) * 0.3; w.wind = M.clamp(w.wind, 0.3, 1);
  };

  // ---------- fires & damage ----------
  E.ignite = function (W, city, b) {
    if (!b || b.fire || b.t === 'rubble' || b.built < 1 && !b.reno) return false;
    const d = b.z ? null : M.DEFS[b.t]; if (d && (d.deco || d.cat === 'park' || d.cat === 'deco' || d.line)) return false;
    b.fire = 1; b.resp = null; b.fireT = 0; b.on = false;
    M.news('Fire at ' + M.nameOf(b) + '!', 'bad', b.x, b.y); M.emit('fire', b);
    return true;
  };
  E.destroy = function (W, city, b, why) {
    const x = b.x, y = b.y, s = b.s, wasZone = b.z;
    M.news(M.nameOf(b) + ' destroyed' + (why ? ' by ' + why : '') + '.', 'bad', x, y);
    W.removeBuilding(b);
    for (let yy = y; yy < y + s; yy++) for (let xx = x; xx < x + s; xx++) W.addBuilding({ t: 'rubble', x: xx, y: yy, s: 1, built: 1, v: (M.rand() * 3) | 0, rub: wasZone ? 60 : 200 });
    M.emit('destroyed', x, y);
  };
  E.damage = function (W, city, b, amount, why) {
    if (b.t === 'rubble') return;
    b.hp -= amount;
    if (b.hp <= 0) E.destroy(W, city, b, why); else if (b.hp < 50) { b.dmg = true; b.on = false; }
  };
  function tryDispatch(W, city, b) {
    const T = M.Traffic, sts = M.Services.totals ? M.Services.totals.fireSt : []; if (!T || !sts.length) return;
    const target = M.Roads.access(W, b); let best = null, bc = 1e9, bst = null;
    if (target < 0) return;
    for (const st of sts) {
      if (st.dead || !st.on) continue; const d = M.DEFS.fire; if ((st.busy || 0) >= d.trucks * st.up) continue;
      const p = M.Roads.path(W, M.Roads.access(W, st), target, 2); if (p && M.Roads.lastCost < bc) { bc = M.Roads.lastCost; best = p; bst = st; }
    }
    if (!best) return;
    bst.busy = (bst.busy || 0) + 1; b.resp = 'sent';
    T.dispatch(best, 'fire', function () { if (!b.dead && b.fire) { b.resp = 'arrived'; b.fireT = 3; } }, function () { bst.busy = Math.max(0, (bst.busy || 1) - 1); });
    M.emit('siren');
  }
  E.fireRisk = function (W, city, b) {
    const i = b.y * W.n + b.x; let r = b.z === 3 ? 2.2 : b.z === 2 ? 1.2 : b.z === 1 ? 1 : 0.5;
    r *= 1 - 0.85 * M.Services.cov(W, 'fire', i);
    if (M.pol('smoke', i)) r *= 0.6; if (city.weather.type === 'rain' || city.weather.type === 'storm') r *= 0.5;
    if (b.wt === false) r *= 1.4; if (b.ab) r *= 1.6;
    return r;
  };
  E.day = function (W, city) {
    const diff = M.DIFF[city.diff]; let burning = null;
    W.each(function (b) {
      if (b.rub != null && b.t === 'rubble') { if (--b.rub <= 0) { W.removeBuilding(b); return; } }
      if (b.stormOff > 0) b.stormOff--;
      if (b.fire) { (burning || (burning = [])).push(b); return; }
      if (b.dmg || b.hp < 100) {
        if (b.z) b.hp = Math.min(100, b.hp + 2);
        else { const d = M.DEFS[b.t], c = d.cost * 0.004; if (city.mode === 'sandbox' || city.money > c) { if (city.mode !== 'sandbox') { city.money -= c; city.fin.repairs = (city.fin.repairs || 0) + c; } b.hp = Math.min(100, b.hp + 2.5); } }
        if (b.dmg && b.hp >= 75) { b.dmg = false; }
      }
    });
    if (burning) for (const b of burning) {
      if (b.dead) continue;
      const rain = city.weather.type === 'rain' || city.weather.type === 'storm';
      b.hp -= rain ? 1.1 : 2; b.fire++;
      if (b.resp === 'arrived') { if (--b.fireT <= 0) { b.fire = 0; b.resp = null; b.dmg = b.hp < 50; city.counters.fires++; M.news('Fire at ' + M.nameOf(b) + ' is out.', 'good', b.x, b.y); continue; } }
      else if (!b.resp) tryDispatch(W, city, b);
      if (b.hp <= 0) { E.destroy(W, city, b, 'fire'); continue; }
      if (M.rand() < 0.014) {
        const d = (M.rand() * 4) | 0, o = W.at(b.x + (M.DX[d] > 0 ? b.s : M.DX[d]), b.y + (M.DY[d] > 0 ? b.s : M.DY[d]));
        if (o && !o.fire && M.rand() > M.Services.cov(W, 'fire', o.y * W.n + o.x) * 0.7) E.ignite(W, city, o);
      }
    }
    if (!city.disasters || !W.count || (M.Tutorial && M.Tutorial.active)) return;
    // random building fires
    const K = Math.min(W.count, 40), scale = W.count / K / 30 * 0.0012 * diff.disaster * (M.need('fire') ? 1 : 0.15);
    for (let k = 0; k < K; k++) {
      const b = W.blds[(M.rand() * W.blds.length) | 0]; if (!b || b.fire || b.t === 'rubble') continue;
      if (M.rand() < scale * E.fireRisk(W, city, b)) E.ignite(W, city, b);
    }
    if (city.day % 30 === 15 && city.pop > 1500 && M.rand() < 0.012 * diff.disaster) {
      const r = M.rand(); E.trigger(W, city, r < 0.4 ? 'storm' : r < 0.65 ? 'flood' : r < 0.85 ? 'quake' : 'firestorm');
    }
  };
  E.trigger = function (W, city, type) {
    const list = W.blds.filter(function (b) { return b && b.t !== 'rubble' && (b.built >= 1 || b.reno); }); if (!list.length) return;
    if (type === 'storm') {
      E.setWeather(city, 'storm', 60); let n = 0;
      for (const b of list) { if (!b.z && M.DEFS[b.t].wind) b.stormOff = 30; if (!b.dead && M.rand() < 0.06) { E.damage(W, city, b, 20 + M.rand() * 28, 'the storm'); n++; } }
      M.news('A violent storm batters the city: ' + n + ' buildings damaged, wind turbines shut down.', 'bad');
    } else if (type === 'flood') {
      let n = 0; E.setWeather(city, 'rain', 80);
      for (const b of list) if (!b.dead && W.elev[b.y * W.n + b.x] === 1 && W.nearWater(b.x, b.y, b.s, 2)) { E.damage(W, city, b, 30 + M.rand() * 35, 'flooding'); n++; }
      M.news(n ? 'The water rises! ' + n + ' waterfront buildings are flooded.' : 'Heavy rain swells the rivers, but nothing was built close enough to flood.', n ? 'bad' : 'info');
    } else if (type === 'quake') {
      const c = M.pick(list), r = 14; let n = 0;
      for (const b of list) { if (b.dead) continue; const d = Math.hypot(b.x - c.x, b.y - c.y); if (d > r) continue; const str = 1 - d / r; n++; const o = b; E.damage(W, city, b, str * (35 + M.rand() * 55), 'the earthquake'); if (!o.dead && M.rand() < 0.04) E.ignite(W, city, o); }
      M.news('Earthquake! ' + n + ' buildings shaken near the epicentre.', 'bad', c.x, c.y); M.emit('quake', c.x, c.y);
    } else if (type === 'firestorm') {
      const c = M.pick(list); let n = 0;
      for (const b of list) if (!b.dead && Math.hypot(b.x - c.x, b.y - c.y) < 4 && M.rand() < 0.5 && E.ignite(W, city, b)) n++;
      if (!n) E.ignite(W, city, c);
    }
    M.emit('disaster', type);
  };
})();
