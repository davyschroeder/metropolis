'use strict';
/* METROPOLIS – world grid state, building registry, city state, (de)serialisation */
(function () {
  const SAVE_U8 = ['elev', 'terr', 'wdepth', 'deco', 'road', 'rdir', 'pline', 'zone', 'zdens', 'district'];
  const SAVE_F32 = ['gnd', 'traffic', 'lv', 'air', 'noise', 'crime'];
  const F32 = ['air', 'gnd', 'noise', 'lv', 'crime', 'fire', 'police', 'health', 'edu', 'edu2', 'park', 'bus', 'traffic', 'tacc', 'tmp', 'tmp2'];

  function World(n) {
    this.n = n; const N = n * n;
    for (const k of SAVE_U8) this[k] = new Uint8Array(N);
    this.bld = new Int32Array(N);
    this.power = new Uint8Array(N); this.water = new Uint8Array(N); this.occl = new Uint8Array(N);
    for (const k of F32) this[k] = new Float32Array(N);
    this.rcomp = new Int32Array(N);
    this.blds = []; this.free = []; this.count = 0;
    this.limit = { x0: 0, y0: 0, x1: n - 1, y1: n - 1 }; this.start = { x: n >> 1, y: n >> 1 };
    this.roadVer = 1; this.bldVer = 1; this.roadTiles = 0;
    this.lv.fill(30);
  }
  M.World = World;
  const P = World.prototype;
  P.idx = function (x, y) { return y * this.n + x; };
  P.inb = function (x, y) { return x >= 0 && y >= 0 && x < this.n && y < this.n; };
  P.inLimit = function (x, y) { const l = this.limit; return x >= l.x0 && y >= l.y0 && x <= l.x1 && y <= l.y1; };
  // effective elevation (bridges sit one level above the water)
  P.eh = function (i) { const e = this.elev[i]; return e === 0 && this.road[i] ? 1 : e; };
  P.at = function (x, y) { if (!this.inb(x, y)) return null; const id = this.bld[y * this.n + x]; return id ? this.blds[id - 1] : null; };
  P.dirty = function (x, y) { M.emit('dirty', x, y); };
  // tiles whose raised top can hide objects standing on the tile behind them
  P.computeOccl = function () {
    const n = this.n, o = this.occl;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, v = this.eh(i); let f = 0;
      if (v >= 1) {
        let e;
        if (x > 0 && (e = this.eh(i - 1)) > 0 && e < v) f = 1;
        else if (y > 0 && (e = this.eh(i - n)) > 0 && e < v) f = 1;
        else if (x > 0 && y > 0 && (e = this.eh(i - n - 1)) > 0 && e < v) f = 1;
      }
      o[i] = f;
    }
  };

  P.addBuilding = function (o) {
    const b = Object.assign({ s: 1, z: 0, lvl: 1, v: 0, f: 0, built: 0, hp: 100, pop: 0, cap: 0, jobs: 0, filled: 0, wealth: 1, happy: 0.6, commute: 0, garb: 0, age: 0, ab: 0, bad: 0, on: false, pw: false, wt: false, rd: -1, up: 1, fire: 0, dmg: false, store: 0, rv: 0 }, o);
    const id = this.free.length ? this.free.pop() : this.blds.length;
    b.id = id; this.blds[id] = b; this.count++;
    for (let yy = b.y; yy < b.y + b.s; yy++) for (let xx = b.x; xx < b.x + b.s; xx++) { const i = yy * this.n + xx; this.bld[i] = id + 1; this.deco[i] = 0; this.dirty(xx, yy); }
    this.bldVer++; M.emit('bld', b, true);
    return b;
  };
  P.removeBuilding = function (b) {
    if (!b || this.blds[b.id] !== b) return;
    for (let yy = b.y; yy < b.y + b.s; yy++) for (let xx = b.x; xx < b.x + b.s; xx++) { this.bld[yy * this.n + xx] = 0; this.dirty(xx, yy); }
    this.blds[b.id] = null; this.free.push(b.id); this.count--; this.bldVer++; b.dead = true;
    M.emit('bld', b, false);
  };
  P.each = function (fn) { const a = this.blds; for (let i = 0; i < a.length; i++) { const b = a[i]; if (b) fn(b); } };
  // nearest drivable, accessible road tile within r tiles of a footprint; -1 if none
  P.findRoad = function (x, y, s, r) {
    const n = this.n; let best = -1, bd = 99;
    for (let yy = y - r; yy < y + s + r; yy++) for (let xx = x - r; xx < x + s + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
      if (xx >= x && xx < x + s && yy >= y && yy < y + s) continue;
      const i = yy * n + xx, t = this.road[i]; if (!t) continue; const rt = M.ROADS[t]; if (rt.ped || rt.noAccess) continue;
      const dx = xx < x ? x - xx : xx >= x + s ? xx - (x + s - 1) : 0, dy = yy < y ? y - yy : yy >= y + s ? yy - (y + s - 1) : 0;
      if (dx && dy) continue; // straight-line access only
      const d = dx + dy; if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  // nearest tile within r (diagonals allowed) of a footprint for which test(i) holds; -1 if none
  P.findNear = function (x, y, s, r, test) {
    const n = this.n; let best = -1, bd = 99;
    for (let yy = y - r; yy < y + s + r; yy++) for (let xx = x - r; xx < x + s + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const i = yy * n + xx; if (!test(i)) continue;
      const dx = xx < x ? x - xx : xx >= x + s ? xx - (x + s - 1) : 0, dy = yy < y ? y - yy : yy >= y + s ? yy - (y + s - 1) : 0, d = Math.max(dx, dy);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  P.nearWater = function (x, y, s, r) {
    for (let yy = y - r; yy < y + s + r; yy++) for (let xx = x - r; xx < x + s + r; xx++) if (this.inb(xx, yy) && this.elev[yy * this.n + xx] === 0) return true;
    return false;
  };

  P.serialize = function () {
    const o = { n: this.n, limit: this.limit, start: this.start, blds: this.blds.filter(Boolean).map(function (b) { const c = Object.assign({}, b); delete c.dead; return c; }) };
    for (const k of SAVE_U8) o[k] = this[k].slice();
    for (const k of SAVE_F32) o[k] = this[k].slice();
    return o;
  };
  World.deserialize = function (o) {
    const W = new World(o.n);
    for (const k of SAVE_U8) if (o[k]) W[k].set(o[k]);
    for (const k of SAVE_F32) if (o[k]) W[k].set(o[k]);
    W.limit = o.limit; W.start = o.start;
    for (const src of o.blds) {
      const b = Object.assign({}, src); b.id = W.blds.length; W.blds.push(b); W.count++;
      for (let yy = b.y; yy < b.y + b.s; yy++) for (let xx = b.x; xx < b.x + b.s; xx++) W.bld[yy * W.n + xx] = b.id + 1;
    }
    let rt = 0; for (let i = 0; i < W.road.length; i++) if (W.road[i]) rt++; W.roadTiles = rt;
    W.computeOccl();
    return W;
  };

  M.newCity = function (o) {
    const diff = M.DIFF[o.diff || 'normal'], sc = M.SCENARIOS.find(function (s) { return s.id === (o.scenario || 'free'); }) || M.SCENARIOS[0];
    const budget = {}; for (const d of M.DEPTS) budget[d.id] = 100;
    const districts = [null]; for (let i = 1; i <= 8; i++) districts.push({ name: 'District ' + i, tax: 0, pol: {} });
    const c = {
      v: 1, name: o.name || 'New Haven', seed: o.seed >>> 0, size: o.size, mode: o.mode || 'normal', diff: o.diff || 'normal', scenario: sc.id,
      disasters: o.disasters !== false, money: sc.money != null ? sc.money : diff.money, day: 0,
      tax: { R: 9, C: 9, I: 9 }, budget: budget, loans: [], demand: { R: 0.7, C: 0.1, I: 0.3 },
      pop: 0, coh: { c: 0, a: 0, s: 0 }, edu: [1, 0, 0, 0],
      stats: { jobs: 0, jobsC: 0, jobsI: 0, workforce: 0, employed: 0, unemp: 0, happy: 0.6, health: 0.7, eduIdx: 0, income: 0, poverty: 0, housing: 0, commute: 0, congestion: 0, airAvg: 0, crimeAvg: 0, lvAvg: 30, fillC: 1, fillI: 1, cust: 1, top: 0, births: 0, deaths: 0, migration: 0, households: 0, factors: {} },
      fin: { inc: { R: 0, C: 0, I: 0, fares: 0 }, exp: {}, incTotal: 0, expTotal: 0 },
      hist: { pop: [], money: [], inc: [], exp: [], happy: [] },
      tier: 0, ach: {}, counters: { fires: 0, surplus: 0, hadLoan: false, neg: 0, expand: 0 },
      districts: districts, pol: {}, econ: { t: M.rand() * 100, cycle: 1, recession: 0 },
      weather: { type: 'clear', days: 6, wind: 0.6 },
      util: { pCap: 0, pUse: 0, wCap: 0, wUse: 0, sCap: 0, sUse: 0, gCap: 0, gProd: 0, waterPol: 0, landfillFree: 0, graves: 0, gravesUsed: 0, pShort: 0, wShort: 0, clean: 0 },
      transit: { riders: 0, cap: 0, fares: 0, share: 0, stops: 0 },
      news: [], complaints: [], tut: 0, tutOff: false, tod: 0.3, gameOver: false, won: false, bailout: false
    };
    if (sc.debt) { c.loans.push({ amount: sc.debt, left: sc.debt, months: 120, rate: 0.07, pay: Math.round(sc.debt / 120) }); c.counters.hadLoan = true; }
    return c;
  };
  M.pol = function (id, tile) {
    const c = M.city; if (c.pol[id]) return true;
    if (tile >= 0) { const d = M.world.district[tile]; if (d && c.districts[d].pol[id]) return true; }
    return false;
  };
  M.tierOK = function (t) { return M.city.mode === 'sandbox' || M.city.tier >= (t || 0); };
  M.need = function (k) { return M.city.tier >= M.NEED_TIER[k]; };
  M.news = function (text, kind, x, y) {
    const c = M.city; if (!c) return;
    c.news.unshift({ t: text, k: kind || 'info', d: c.day, x: x, y: y }); if (c.news.length > 40) c.news.length = 40;
    M.emit('news', text, kind || 'info', { x: x, y: y });
  };
  M.defOf = function (b) { return b.z ? null : M.DEFS[b.t]; };
  M.nameOf = function (b) {
    if (b.z) { if (b.ab) return 'Abandoned ' + M.ZB[b.z].names[b.lvl]; return M.ZB[b.z].names[b.lvl]; }
    return M.DEFS[b.t].name;
  };
  // capacity multiplier for upgraded service buildings
  M.upMul = function (b) { return 1 + (b.up - 1) * 0.5; };
})();
