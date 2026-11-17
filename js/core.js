'use strict';
/* METROPOLIS – core: namespace, math, RNG, noise, colours, event bus */
var M = {};
(function () {
  M.VERSION = '0.10.1';
  M.TW = 32; M.TH = 16; M.EL = 10; M.CH = 16;
  // directions: 0=N(y-1) 1=E(x+1) 2=S(y+1) 3=W(x-1)
  M.DX = [0, 1, 0, -1]; M.DY = [-1, 0, 1, 0];
  M.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.smooth = function (a, b, x) { x = M.clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  M.hash = function (x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  M.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  M.rand = Math.random;
  M.pick = function (arr) { return arr[(M.rand() * arr.length) | 0]; };
  M.strSeed = function (s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // value noise + fbm
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = M.hash(xi, yi, s), b = M.hash(xi + 1, yi, s), c = M.hash(xi, yi + 1, s), d = M.hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  M.noise = vnoise;
  M.fbm = function (x, y, s, oct) {
    let amp = 0.5, f = 1, sum = 0, n = 0;
    for (let i = 0; i < (oct || 4); i++) { sum += vnoise(x * f, y * f, s + i * 101) * amp; n += amp; amp *= 0.5; f *= 2; }
    return sum / n;
  };

  // colours
  const shadeCache = new Map();
  function parse(hex) {
    if (hex.charCodeAt(0) !== 35) { const m = hex.match(/\d+/g); return [+m[0], +m[1], +m[2]]; }
    const n = parseInt(hex.slice(1), 16);
    return hex.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  M.rgb = parse;
  M.shade = function (hex, f) {
    const k = hex + '|' + f; let r = shadeCache.get(k); if (r) return r;
    const c = parse(hex);
    if (f <= 1) r = 'rgb(' + ((c[0] * f) | 0) + ',' + ((c[1] * f) | 0) + ',' + ((c[2] * f) | 0) + ')';
    else { const t = f - 1; r = 'rgb(' + ((c[0] + (255 - c[0]) * t) | 0) + ',' + ((c[1] + (255 - c[1]) * t) | 0) + ',' + ((c[2] + (255 - c[2]) * t) | 0) + ')'; }
    if (shadeCache.size < 20000) shadeCache.set(k, r);
    return r;
  };
  M.mix = function (a, b, t) {
    const x = parse(a), y = parse(b);
    return 'rgb(' + ((x[0] + (y[0] - x[0]) * t) | 0) + ',' + ((x[1] + (y[1] - x[1]) * t) | 0) + ',' + ((x[2] + (y[2] - x[2]) * t) | 0) + ')';
  };

  // event bus
  const handlers = {};
  M.on = function (ev, fn) { (handlers[ev] || (handlers[ev] = [])).push(fn); };
  M.emit = function (ev, a, b, c) { const h = handlers[ev]; if (h) for (let i = 0; i < h.length; i++) h[i](a, b, c); };

  // formatting
  M.fmt = function (n) { n = Math.round(n); return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  M.money = function (n) { n = Math.round(n); return (n < 0 ? '-$' : '$') + M.fmt(Math.abs(n)); };
  M.short = function (n) {
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return M.fmt(n);
  };
  M.pct = function (v) { return Math.round(v * 100) + '%'; };
  M.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  M.dateStr = function (day) {
    const y = Math.floor(day / 360), m = Math.floor((day % 360) / 30), d = (day % 30) + 1;
    return d + ' ' + M.MONTHS[m] + ' ' + (2025 + y);
  };

  // binary heap keyed by float score (for A*)
  M.Heap = function (cap) { this.ids = new Int32Array(cap); this.keys = new Float32Array(cap); this.n = 0; };
  M.Heap.prototype.clear = function () { this.n = 0; };
  M.Heap.prototype.push = function (id, key) {
    if (this.n >= this.ids.length) { const a = new Int32Array(this.n * 2); a.set(this.ids); this.ids = a; const b = new Float32Array(this.n * 2); b.set(this.keys); this.keys = b; }
    let i = this.n++; const ids = this.ids, keys = this.keys;
    while (i > 0) { const p = (i - 1) >> 1; if (keys[p] <= key) break; ids[i] = ids[p]; keys[i] = keys[p]; i = p; }
    ids[i] = id; keys[i] = key;
  };
  M.Heap.prototype.pop = function () {
    const ids = this.ids, keys = this.keys, top = ids[0]; const n = --this.n;
    if (n > 0) {
      const id = ids[n], key = keys[n]; let i = 0;
      for (;;) { let c = i * 2 + 1; if (c >= n) break; if (c + 1 < n && keys[c + 1] < keys[c]) c++; if (keys[c] >= key) break; ids[i] = ids[c]; keys[i] = keys[c]; i = c; }
      ids[i] = id; keys[i] = key;
    }
    return top;
  };
})();
