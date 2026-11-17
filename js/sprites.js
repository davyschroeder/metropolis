'use strict';
/* METROPOLIS – procedural isometric art toolkit, zoned building designs, vehicles, trees, road tiles */
(function () {
  const TW = M.TW, TH = M.TH, sh = M.shade;
  const S = M.Sprites = { cache: new Map(), designs: {} };
  const LT = 0.96, DK = 0.72;
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  S.mk = mk;
  // sprites are drawn at RES× their logical size so they stay sharp when zoomed in and on high-DPI screens
  S.RES = 2;
  S.setQuality = function (q) { const r = q === 'low' ? 1 : q === 'medium' ? 1.5 : 2; if (r !== S.RES) { S.RES = r; S.cache.clear(); if (M.UI) M.UI.thumbs = {}; } };
  // draw a sprite (or its night variant) at logical size
  S.blit = function (g, sp, img, x, y) { g.drawImage(img || sp.c, x, y, sp.w, sp.h); };

  // ---------- Art: draws into a sprite using tile-space coordinates (u, v in tiles, z in px) ----------
  function Art(size, h) {
    const R = this.r = S.RES; this.s = size; this.h = h; this.W = size * 2 * TW + 4; this.H = size * 2 * TH + h + 4;
    this.c = mk(this.W * R, this.H * R); this.g = this.c.getContext('2d'); this.g.setTransform(R, 0, 0, R, 0, 0);
    this.ox = size * TW + 2; this.oy = h + 2; this.flip = 0; this.wins = []; this.smoke = []; this.lights = []; this.anim = null; this.top = 0; this.topX = 0; this.topY = 0; this.g.lineJoin = 'round';
  }
  S.Art = Art;
  const A = Art.prototype;
  A.p = function (u, v, z) {
    if (this.flip) { const t = u; u = v; v = t; } const P = [this.ox + (u - v) * TW, this.oy + (u + v) * TH - (z || 0)];
    if (z > this.top) { this.top = z; this.topX = P[0]; this.topY = P[1]; } return P;
  };
  // a light source drawn at night: 'lamp' warm, 'flood' bright white, 'cyan', 'red' blinking aviation light
  A.light = function (u, v, z, k, r) { const P = this.p(u, v, z); this.lights.push({ x: P[0], y: P[1], k: k || 'lamp', r: r || 1 }); };
  // a small park/street lamp post with its light
  A.post = function (u, v, h) { h = h || 13; this.seg([u, v, 0], [u, v, h], '#3d4249', 1.2); this.box(u - 0.025, v - 0.025, u + 0.025, v + 0.025, h, h + 2.2, '#f1e7c8'); this.light(u, v, h + 1, 'lamp', 0.8); };
  A.poly = function (pts, fill, line) {
    const g = this.g; g.beginPath();
    for (let i = 0; i < pts.length; i++) { const P = this.p(pts[i][0], pts[i][1], pts[i][2]); if (i) g.lineTo(P[0], P[1]); else g.moveTo(P[0], P[1]); }
    g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); }
    if (line !== false) { g.strokeStyle = line || 'rgba(0,0,0,0.2)'; g.lineWidth = 0.7; g.stroke(); }
  };
  A.lA = function () { return this.flip ? DK : LT; }; A.lB = function () { return this.flip ? LT : DK; };
  A.vg = function (col, f, z0, z1, u, v) {
    if (z1 - z0 < 4) return sh(col, f);
    const a = this.p(u, v, z0), b = this.p(u, v, z1), gr = this.g.createLinearGradient(0, a[1], 0, b[1]);
    gr.addColorStop(0, sh(col, f * (z0 < 1 ? 0.78 : 0.93))); gr.addColorStop(Math.min(0.4, 7 / (z1 - z0)), sh(col, f)); gr.addColorStop(1, sh(col, Math.min(1.25, f * 1.07)));
    return gr;
  };
  A.box = function (u0, v0, u1, v1, z0, z1, col, top) {
    this.poly([[u0, v1, z0], [u1, v1, z0], [u1, v1, z1], [u0, v1, z1]], this.vg(col, this.lA(), z0, z1, u0, v1));
    this.poly([[u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1]], this.vg(col, this.lB(), z0, z1, u1, v0));
    this.poly([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]], sh(top || col, 1.12));
  };
  function fpt(f, a, fix, z) { return f === 'A' ? [a, fix, z] : [fix, a, z]; }
  A.face = function (f, a0, a1, fix, z0, z1, col, line) {
    const q = fpt(f, a0, fix, 0);
    this.poly([fpt(f, a0, fix, z0), fpt(f, a1, fix, z0), fpt(f, a1, fix, z1), fpt(f, a0, fix, z1)], this.vg(col, f === 'A' ? this.lA() : this.lB(), z0, z1, q[0], q[1]), line === undefined ? false : line);
  };
  A.win = function (f, a0, a1, fix, z0, z1, cols, rows, o) {
    o = o || {}; const mx = o.mx == null ? 0.2 : o.mx, mz = o.mz == null ? 0.22 : o.mz, glass = sh(o.glass || '#35526e', f === 'A' ? this.lA() : this.lB() + 0.08);
    const da = (a1 - a0) / cols, dz = (z1 - z0) / rows, g = this.g, gq = fpt(f, a0, fix, 0), gp0 = this.p(gq[0], gq[1], z0), gp1 = this.p(gq[0], gq[1], z1);
    const base = o.glass || '#35526e', fl = f === 'A' ? this.lA() : this.lB() + 0.08, gl = g.createLinearGradient(0, gp0[1], 0, gp1[1]);
    gl.addColorStop(0, sh(base, fl * 0.82)); gl.addColorStop(0.55, sh(base, fl)); gl.addColorStop(1, sh(base, Math.min(1.4, fl * 1.3)));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const A0 = a0 + da * (c + mx), A1 = a0 + da * (c + 1 - mx), Z0 = z0 + dz * (r + mz), Z1 = z0 + dz * (r + 1 - mz);
      const p = [fpt(f, A0, fix, Z0), fpt(f, A1, fix, Z0), fpt(f, A1, fix, Z1), fpt(f, A0, fix, Z1)].map((q) => this.p(q[0], q[1], q[2]));
      g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.lineTo(p[3][0], p[3][1]); g.closePath(); g.fillStyle = gl; g.fill();
      if (!o.dark) this.wins.push(p);
    }
  };
  A.gable = function (u0, v0, u1, v1, z, h, roof, wall, axis) {
    const sv = this.lA(), su = this.lB();
    if (axis === 'u') {
      const m = (v0 + v1) / 2;
      this.poly([[u0, v0, z], [u1, v0, z], [u1, m, z + h], [u0, m, z + h]], sh(roof, 0.6));
      this.poly([[u1, v0, z], [u1, v1, z], [u1, m, z + h]], sh(wall, su));
      this.poly([[u0, v1, z], [u1, v1, z], [u1, m, z + h], [u0, m, z + h]], sh(roof, sv + 0.06));
    } else {
      const m = (u0 + u1) / 2;
      this.poly([[u0, v0, z], [u0, v1, z], [m, v1, z + h], [m, v0, z + h]], sh(roof, 0.6));
      this.poly([[u0, v1, z], [u1, v1, z], [m, v1, z + h]], sh(wall, sv));
      this.poly([[u1, v0, z], [u1, v1, z], [m, v1, z + h], [m, v0, z + h]], sh(roof, su + 0.06));
    }
  };
  A.pyr = function (u0, v0, u1, v1, z, h, col) {
    const a = [(u0 + u1) / 2, (v0 + v1) / 2, z + h];
    this.poly([[u0, v0, z], [u1, v0, z], a], sh(col, 0.6)); this.poly([[u0, v0, z], [u0, v1, z], a], sh(col, 0.65));
    this.poly([[u0, v1, z], [u1, v1, z], a], sh(col, this.lA())); this.poly([[u1, v0, z], [u1, v1, z], a], sh(col, this.lB()));
  };
  A.cyl = function (u, v, r, z0, z1, col, top) {
    const g = this.g, c0 = this.p(u, v, z0), c1 = this.p(u, v, z1), rx = r * TW * 1.414, ry = r * TH * 1.414;
    const gr = g.createLinearGradient(c0[0] - rx, 0, c0[0] + rx, 0); gr.addColorStop(0, sh(col, 1.06)); gr.addColorStop(0.4, sh(col, 0.96)); gr.addColorStop(1, sh(col, 0.6));
    g.fillStyle = gr; g.beginPath(); g.moveTo(c1[0] - rx, c1[1]); g.lineTo(c0[0] - rx, c0[1]); g.ellipse(c0[0], c0[1], rx, ry, 0, Math.PI, 0, true); g.lineTo(c1[0] + rx, c1[1]); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.7; g.stroke();
    g.fillStyle = sh(top || col, 1.14); g.beginPath(); g.ellipse(c1[0], c1[1], rx, ry, 0, 0, 7); g.fill(); g.stroke();
  };
  A.dome = function (u, v, r, z, col, hk) {
    const g = this.g, c = this.p(u, v, z), rx = r * TW * 1.414, ry = r * TH * 1.414, hh = rx * (hk || 0.8);
    const gr = g.createRadialGradient(c[0] - rx * 0.35, c[1] - hh * 0.6, 1, c[0], c[1], rx * 1.2); gr.addColorStop(0, sh(col, 1.3)); gr.addColorStop(1, sh(col, 0.62));
    g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], rx, hh, 0, Math.PI, Math.PI * 2, false); g.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI, false); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.7; g.stroke();
  };
  A.gq = function (u0, v0, u1, v1, col, z, line) { this.poly([[u0, v0, z || 0], [u1, v0, z || 0], [u1, v1, z || 0], [u0, v1, z || 0]], col, line === undefined ? false : line); };
  A.lot = function (col, edge) { const s = this.s; this.gq(0, 0, s, s, col, 0, edge || 'rgba(0,0,0,0.16)'); };
  A.dot = function (u, v, z, r, col) { const g = this.g, P = this.p(u, v, z); g.fillStyle = col; g.beginPath(); g.arc(P[0], P[1], r, 0, 7); g.fill(); };
  A.seg = function (a, b, col, w) { const g = this.g, P = this.p(a[0], a[1], a[2]), Q = this.p(b[0], b[1], b[2]); g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(Q[0], Q[1]); g.stroke(); };
  A.smokeAt = function (u, v, z, k) { const P = this.p(u, v, z); this.smoke.push({ x: P[0], y: P[1], k: k || 0 }); };
  A.tree = function (u, v, kind, sc) {
    const g = this.g, P = this.p(u, v, 0), x = P[0], y = P[1]; sc = sc || 1;
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.ellipse(x + 2 * sc, y + 1, 7 * sc, 3 * sc, 0, 0, 7); g.fill();
    if (kind === 1) {
      g.fillStyle = '#5a4028'; g.fillRect(x - 1, y - 4 * sc, 2, 4 * sc);
      for (let k = 0; k < 3; k++) {
        const w = (8.5 - k * 2.2) * sc, by = y - (3 + k * 5.5) * sc, ty = by - 9 * sc;
        g.fillStyle = k === 0 ? '#22573a' : k === 1 ? '#2a6641' : '#33774a'; g.beginPath(); g.moveTo(x - w, by); g.lineTo(x + w, by); g.lineTo(x, ty); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x - w, by); g.lineTo(x, by); g.lineTo(x, ty); g.closePath(); g.fill();
      }
    } else {
      const c = kind === 6 ? '#6aa63f' : kind === 7 ? '#c98a3a' : '#3f8c3f';
      g.fillStyle = '#5a4028'; g.fillRect(x - 1, y - 6 * sc, 2, 6 * sc);
      g.fillStyle = sh(c, 0.78); g.beginPath(); g.arc(x + 1 * sc, y - 11 * sc, 7.5 * sc, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(x - 1.5 * sc, y - 13 * sc, 6.5 * sc, 0, 7); g.fill();
      g.fillStyle = sh(c, 1.2); g.beginPath(); g.arc(x - 3 * sc, y - 15.5 * sc, 3.4 * sc, 0, 7); g.fill();
    }
  };
  A.bush = function (u, v, col, sc) {
    const g = this.g, P = this.p(u, v, 0); sc = sc || 1; col = col || '#4a8f3c';
    g.fillStyle = sh(col, 0.8); g.beginPath(); g.arc(P[0] + 1, P[1] - 2 * sc, 4 * sc, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(P[0] - 1, P[1] - 3 * sc, 3.2 * sc, 0, 7); g.fill();
  };
  A.car = function (u, v, col, axisU) {
    const l = 0.11, w = 0.055;
    if (axisU) { this.box(u - l, v - w, u + l, v + w, 0, 3, col); this.box(u - l * 0.5, v - w * 0.85, u + l * 0.45, v + w * 0.85, 3, 5.5, '#2c3a4a'); }
    else { this.box(u - w, v - l, u + w, v + l, 0, 3, col); this.box(u - w * 0.85, v - l * 0.5, u + w * 0.85, v + l * 0.45, 3, 5.5, '#2c3a4a'); }
  };
  A.flag = function (u, v, z, h, col) { this.seg([u, v, z], [u, v, z + h], '#d8d8d8', 1); const P = this.p(u, v, z + h), g = this.g; g.fillStyle = col; g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(P[0] + 8, P[1] + 2.5); g.lineTo(P[0], P[1] + 5); g.closePath(); g.fill(); };
  A.done = function () {
    if (this.top > 125) this.lights.push({ x: this.topX, y: this.topY - 2, k: 'red', r: 0.7 }); // aviation light on tall towers and chimneys
    return { c: this.c, ox: this.ox, oy: this.oy, w: this.W, h: this.H, r: this.r, top: this.top, wins: this.wins, smoke: this.smoke, lights: this.lights, anim: this.anim, size: this.s };
  };

  // ---------- palettes ----------
  const WALL = ['#e9decb', '#dccaa9', '#cdb99b', '#e6e2d8', '#d3dae0', '#e8d1c1', '#d9b9a0', '#c3ccb9', '#f0e6c8', '#c9d4d9'];
  const ROOF = ['#a84a3b', '#7f4a3a', '#59636f', '#8c5a43', '#3f4b57', '#9d6c40', '#6d3b34'];
  const BRICK = ['#a85c47', '#b66a50', '#8f5040', '#9c6a55'];
  const APT = ['#d8d2c4', '#c9c5bb', '#e2d6c2', '#bfc7cc', '#d6c2b0', '#cbd0c4'];
  const GLASS = ['#6aa6c8', '#5b99a9', '#7db0d5', '#8ea8bf', '#4f8eb2', '#69b3b0'];
  const AWN = ['#c8463c', '#2f7fb8', '#3c9a5a', '#d98b2b', '#8a4fa8', '#d1b03a'];
  const CARCOL = ['#c8413a', '#e8e6e0', '#2f6fb0', '#2b2f36', '#d6b23a', '#7b8794', '#3f8f5a'];
  S.CARCOL = CARCOL;
  function pk(r, a) { return a[(r() * a.length) | 0]; }
  function roofKit(a, r, u0, v0, u1, v1, H, n) {
    for (let k = 0; k < n; k++) { const u = u0 + r() * (u1 - u0 - 0.2), v = v0 + r() * (v1 - v0 - 0.2); if (r() < 0.5) a.box(u, v, u + 0.14, v + 0.12, H, H + 3 + r() * 3, '#c4c8cc'); else a.box(u, v, u + 0.2, v + 0.18, H, H + 6, '#9aa0a6'); }
  }
  function parking(a, u0, v0, u1, v1, r, axisU) {
    a.gq(u0, v0, u1, v1, '#55585e'); a.light((u0 + u1) / 2, (v0 + v1) / 2, 14, 'lamp', 1.2);
    const n = Math.floor(((axisU ? u1 - u0 : v1 - v0)) / 0.16);
    for (let k = 0; k <= n; k++) { const t = (axisU ? u0 : v0) + k * 0.16; if (axisU) a.seg([t, v0, 0], [t, v0 + (v1 - v0) * 0.45, 0], 'rgba(255,255,255,0.6)', 0.7); else a.seg([u0, t, 0], [u0 + (u1 - u0) * 0.45, t, 0], 'rgba(255,255,255,0.6)', 0.7); }
    for (let k = 0; k < n; k++) if (r() < 0.6) { const t = (axisU ? u0 : v0) + k * 0.16 + 0.08; if (axisU) a.car(t, v0 + (v1 - v0) * 0.25, pk(r, CARCOL), false); else a.car(u0 + (u1 - u0) * 0.25, t, pk(r, CARCOL), true); }
  }
  S.kit = { pk: pk, roofKit: roofKit, parking: parking, WALL: WALL, ROOF: ROOF, BRICK: BRICK, APT: APT, GLASS: GLASS, AWN: AWN };

  // ---------- residential ----------
  const ZH = [null, [0, 50, 60, 96, 172, 292], [0, 48, 66, 142, 84, 300], [0, 48, 54, 112, 134, 78]];
  function R1(a, r, w) {
    a.lot(w === 1 ? '#86a65a' : w === 2 ? '#74b356' : '#66b552');
    if (w === 1) a.gq(0.08, 0.62, 0.36, 0.92, '#9c8f66');
    const wall = pk(r, WALL), roof = pk(r, ROOF), big = w === 3;
    const u0 = big ? 0.15 : 0.24, u1 = big ? 0.85 : 0.76, v0 = big ? 0.18 : 0.26, v1 = big ? 0.7 : 0.7, h = w === 1 ? 10 : big ? 19 : 13, um = (u0 + u1) / 2;
    a.tree(0.13, 0.12, r() < 0.5 ? 1 : 2, 0.8); if (r() < 0.6) a.tree(0.88, 0.13, 6, 0.7);
    a.gq(um - 0.05, v1, um + 0.05, 1, '#cfc8b4');
    if (w === 2 && r() < 0.5) { a.box(u1 - 0.02, v0 + 0.08, u1 + 0.14, v1 - 0.04, 0, 8, sh(wall, 0.92)); a.face('B', v0 + 0.12, v1 - 0.08, u1 + 0.14, 0, 6.5, '#8d949b'); }
    a.box(u0, v0, u1, v1, 0, h, wall);
    if (big) { a.win('A', u0, u1, v1, 2, 9, 3, 1); a.win('B', v0, v1, u1, 2, 9, 2, 1); a.win('A', u0, u1, v1, 10, h - 1, 3, 1); a.win('B', v0, v1, u1, 10, h - 1, 2, 1); }
    else { a.win('A', u0, u1, v1, 3, h - 2, 2, 1, { mx: 0.24 }); a.win('B', v0, v1, u1, 3, h - 2, 2, 1, { mx: 0.24 }); }
    a.face('A', um - 0.045, um + 0.045, v1, 0, 7.5, '#6b4a34'); a.light(um + 0.08, v1 + 0.02, 8, 'lamp', 0.45);
    a.gable(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, h, big ? 12 : 9, roof, wall, r() < 0.5 ? 'u' : 'v');
    a.box(u0 + 0.08, v0 + 0.1, u0 + 0.15, v0 + 0.17, h + 3, h + 13, '#8a5a4a');
    if (big) { a.gq(0.62, 0.78, 0.92, 0.95, '#e8e4d8'); a.gq(0.65, 0.8, 0.89, 0.93, '#5fc3e8'); }
    a.bush(0.14, 0.9, w === 1 ? '#6f8f3c' : '#4a8f3c'); if (w > 1) a.bush(0.3, 0.94, '#d9668a', 0.6);
  }
  function R2(a, r, w) {
    a.lot('#8dab62'); a.gq(0, 0.84, 1, 1, '#c6c2b6');
    a.tree(0.12, 0.1, 2, 0.75); a.tree(0.9, 0.1, 1, 0.75);
    if (r() < 0.5) {
      const roof = pk(r, ROOF), du = 0.26, u0 = 0.11;
      for (let k = 0; k < 3; k++) {
        const wall = w === 1 ? pk(r, BRICK) : pk(r, WALL), a0 = u0 + k * du, a1 = a0 + du - 0.012;
        a.box(a0, 0.2, a1, 0.76, 0, 20, wall);
        a.win('A', a0, a1, 0.76, 11, 19, 1, 1, { mx: 0.25 }); a.win('A', a0 + 0.1, a1, 0.76, 3, 9, 1, 1, { mx: 0.2 });
        a.face('A', a0 + 0.03, a0 + 0.09, 0.76, 0, 7.5, '#5b3d2c');
        if (k === 2) a.win('B', 0.2, 0.76, a1, 3, 19, 2, 2);
        a.gable(a0 - 0.01, 0.17, a1 + 0.01, 0.79, 20, 8, roof, wall, 'v');
        a.bush(a0 + 0.17, 0.82, '#4a8f3c', 0.6);
      }
    } else {
      const wall = w === 1 ? pk(r, BRICK) : pk(r, APT);
      a.box(0.1, 0.2, 0.9, 0.78, 0, 25, wall);
      a.win('A', 0.1, 0.9, 0.78, 2, 24, 4, 3); a.win('B', 0.2, 0.78, 0.9, 2, 24, 3, 3);
      for (let k = 1; k < 3; k++) { a.face('A', 0.1, 0.9, 0.78, k * 7.6 + 1, k * 7.6 + 2.2, '#f1f1ee'); }
      a.face('A', 0.46, 0.54, 0.78, 0, 7, '#4a3528');
      a.box(0.1, 0.2, 0.9, 0.78, 25, 26.5, sh(wall, 0.86), '#8f9399'); roofKit(a, r, 0.15, 0.25, 0.85, 0.7, 26.5, 2);
    }
  }
  function R3(a, r, w, v) {
    a.lot('#bbb8ad'); a.gq(0, 0, 1, 0.1, '#6db552'); a.tree(0.08, 0.05, 2, 0.6); a.tree(0.92, 0.05, 6, 0.6);
    const H = 44 + (v % 3) * 12, wall = w === 1 ? pk(r, ['#b9a892', '#a99c8c', '#b3aa9a']) : pk(r, APT), fl = Math.floor((H - 8) / 9), fh = (H - 10) / fl;
    a.box(0.1, 0.12, 0.9, 0.86, 0, H, wall);
    a.face('A', 0.1, 0.9, 0.86, 0, 8, sh(wall, 0.74)); a.face('B', 0.12, 0.86, 0.9, 0, 8, sh(wall, 0.74));
    a.win('A', 0.12, 0.88, 0.86, 9, H - 1, 4, fl); a.win('B', 0.14, 0.84, 0.9, 9, H - 1, 4, fl);
    if (w > 1) for (let f = 0; f < fl; f++) a.face('A', 0.12, 0.88, 0.86, 9 + f * fh, 10.4 + f * fh, '#f4f3ef');
    a.face('A', 0.44, 0.56, 0.86, 0, 7, '#35414d'); a.box(0.4, 0.86, 0.6, 0.93, 7, 8.2, '#d6d6d2');
    a.box(0.1, 0.12, 0.9, 0.86, H, H + 2, sh(wall, 0.84), '#8f9399'); a.box(0.3, 0.3, 0.5, 0.5, H + 2, H + 9, '#9aa0a6'); roofKit(a, r, 0.5, 0.2, 0.86, 0.8, H + 2, 2);
  }
  function R4(a, r, w, v) {
    a.lot('#bdbab0'); a.gq(0.1, 1.0, 1.05, 1.9, '#6db552');
    const wall = pk(r, APT), wall2 = pk(r, APT), H1 = 92 + (v % 2) * 18, H2 = 124 + (v % 3) * 12;
    a.tree(0.12, 0.1, 2, 0.8);
    const slab = function (u0, v0, u1, v1, H, wl, ca, cb) {
      const fl = Math.floor((H - 9) / 9), fh = (H - 10) / fl;
      a.box(u0, v0, u1, v1, 0, H, wl); a.face('A', u0, u1, v1, 0, 8, sh(wl, 0.72)); a.face('B', v0, v1, u1, 0, 8, sh(wl, 0.72));
      a.win('A', u0 + 0.03, u1 - 0.03, v1, 9, H - 1, ca, fl); a.win('B', v0 + 0.03, v1 - 0.03, u1, 9, H - 1, cb, fl);
      for (let f = 0; f < fl; f += 1) a.face('A', u0 + 0.03, u1 - 0.03, v1, 9 + f * fh, 10.3 + f * fh, '#f2f1ec');
      a.box(u0, v0, u1, v1, H, H + 2, sh(wl, 0.84), '#8f9399'); a.box(u0 + 0.15, v0 + 0.15, u0 + 0.4, v0 + 0.4, H + 2, H + 10, '#9aa0a6'); roofKit(a, r, u0 + 0.3, v0 + 0.1, u1, v1, H + 2, 2);
    };
    slab(0.2, 0.18, 1.82, 0.9, H1, wall, 8, 3);
    a.tree(0.35, 1.25, 6, 0.9); a.tree(0.7, 1.6, 2, 0.9); a.gq(0.5, 1.3, 0.8, 1.42, '#d8d2c0');
    slab(1.12, 0.9, 1.82, 1.8, H2, wall2, 3, 4);
    a.bush(0.25, 1.8); a.bush(0.9, 1.85, '#d9668a', 0.7);
  }
  function R5(a, r, w, v) {
    a.lot('#c4c1b8'); a.gq(0.06, 0.06, 1.94, 0.3, '#6db552'); a.tree(0.2, 0.15, 2, 0.8); a.tree(1.8, 0.16, 6, 0.8);
    const wall = pk(r, ['#e4e1d8', '#d5dadd', '#e6dccb', '#cfd6d2']), glass = pk(r, GLASS);
    a.box(0.22, 0.3, 1.8, 1.8, 0, 16, sh(wall, 0.86)); a.win('A', 0.25, 1.77, 1.8, 2, 14, 7, 1, { glass: '#7ec0dc', mx: 0.1 }); a.win('B', 0.34, 1.76, 1.8, 2, 14, 7, 1, { glass: '#7ec0dc', mx: 0.1 });
    const tower = function (u0, v0, u1, v1, z0, H, ca) {
      const fl = Math.floor((H - z0) / 8.5), fh = (H - z0) / fl;
      a.box(u0, v0, u1, v1, z0, H, wall);
      a.win('A', u0 + 0.03, u1 - 0.03, v1, z0 + 1, H - 1, ca, fl, { glass: glass, mx: 0.14 }); a.win('B', v0 + 0.03, v1 - 0.03, u1, z0 + 1, H - 1, ca, fl, { glass: glass, mx: 0.14 });
      for (let f = 0; f < fl; f += 2) a.face('A', u0 + 0.03, u1 - 0.03, v1, z0 + 1 + f * fh, z0 + 2.2 + f * fh, '#f6f5f0');
    };
    if (v % 2 === 0) {
      const H = 196 + (v % 3) * 16;
      tower(0.45, 0.5, 1.6, 1.6, 16, H, 6); a.box(0.45, 0.5, 1.6, 1.6, H, H + 2, sh(wall, 0.84), '#90959b');
      tower(0.65, 0.7, 1.4, 1.4, H + 2, H + 26, 4); a.box(0.65, 0.7, 1.4, 1.4, H + 26, H + 28, sh(wall, 0.84), '#90959b');
      a.box(0.9, 0.95, 1.15, 1.2, H + 28, H + 36, '#9aa0a6'); a.seg([1.02, 1.07, H + 36], [1.02, 1.07, H + 52], '#d0d4d8', 1.2);
    } else {
      const H = 150 + (v % 3) * 14;
      tower(0.35, 0.45, 1.05, 1.15, 16, H + 46, 4); a.box(0.35, 0.45, 1.05, 1.15, H + 46, H + 48, sh(wall, 0.84), '#90959b'); a.box(0.55, 0.65, 0.8, 0.9, H + 48, H + 56, '#9aa0a6');
      tower(0.95, 1.0, 1.7, 1.7, 16, H, 4); a.box(0.95, 1.0, 1.7, 1.7, H, H + 2, sh(wall, 0.84), '#90959b'); roofKit(a, r, 1.0, 1.05, 1.6, 1.6, H + 2, 3);
    }
    a.bush(0.15, 1.85); a.bush(0.14, 1.5, '#d9668a', 0.7);
  }
  // ---------- commercial ----------
  function awning(a, a0, a1, v, z, col) {
    a.poly([[a0, v, z], [a1, v, z], [a1, v + 0.1, z - 3.2], [a0, v + 0.1, z - 3.2]], sh(col, 1.0), 'rgba(0,0,0,0.25)');
    const n = Math.max(2, Math.round((a1 - a0) / 0.1));
    for (let k = 0; k < n; k += 2) { const b0 = a0 + (a1 - a0) * k / n, b1 = a0 + (a1 - a0) * (k + 1) / n; a.poly([[b0, v, z], [b1, v, z], [b1, v + 0.1, z - 3.2], [b0, v + 0.1, z - 3.2]], 'rgba(255,255,255,0.8)', false); }
  }
  function C1(a, r) {
    a.lot('#bfbcb2');
    const wall = pk(r, WALL), awn = pk(r, AWN);
    a.box(0.14, 0.18, 0.86, 0.78, 0, 14, wall);
    a.win('A', 0.16, 0.84, 0.78, 2, 10, 2, 1, { glass: '#86c4de', mx: 0.08, mz: 0.05 }); a.win('B', 0.22, 0.74, 0.86, 4, 11, 2, 1);
    a.face('A', 0.46, 0.54, 0.78, 0, 8.5, '#3d3028');
    a.box(0.14, 0.18, 0.86, 0.78, 14, 15.5, sh(wall, 0.85), '#93979c');
    a.box(0.2, 0.7, 0.8, 0.74, 15.5, 22, awn); a.face('A', 0.24, 0.76, 0.74, 17, 20.5, '#fff6dc');
    awning(a, 0.14, 0.86, 0.78, 12, awn); a.light(0.5, 0.86, 9, 'lamp', 0.9);
    roofKit(a, r, 0.2, 0.22, 0.8, 0.6, 15.5, 1);
    if (r() < 0.5) a.box(0.08, 0.84, 0.16, 0.92, 0, 5, '#3c9a5a');
  }
  function C2(a, r) {
    a.lot('#c2bfb5');
    const wall = pk(r, BRICK.concat(WALL)), awn = pk(r, AWN), H = 27 + ((r() * 2) | 0) * 8, fl = Math.round((H - 11) / 8);
    a.box(0.12, 0.14, 0.88, 0.74, 0, H, wall);
    a.win('A', 0.14, 0.86, 0.74, 2, 10, 3, 1, { glass: '#86c4de', mx: 0.07, mz: 0.05 });
    a.win('A', 0.14, 0.86, 0.74, 12, H - 1, 3, fl); a.win('B', 0.16, 0.72, 0.88, 12, H - 1, 3, fl); a.win('B', 0.2, 0.7, 0.88, 3, 10, 2, 1);
    a.face('A', 0.14, 0.86, 0.74, 10.4, 11.6, sh(wall, 0.7));
    a.box(0.12, 0.14, 0.88, 0.74, H, H + 1.6, sh(wall, 0.85), '#93979c'); roofKit(a, r, 0.2, 0.2, 0.8, 0.6, H + 1.6, 2);
    awning(a, 0.12, 0.88, 0.74, 11.5, awn); a.light(0.3, 0.82, 9, 'lamp', 0.8); a.light(0.7, 0.82, 9, 'lamp', 0.8);
    for (let k = 0; k < 2; k++) { const u = 0.3 + k * 0.4; a.seg([u, 0.9, 0], [u, 0.9, 7], '#8a8a8a', 1); a.pyr(u - 0.1, 0.8, u + 0.1, 1.0, 6, 3, k ? awn : '#f2efe6'); a.dot(u - 0.08, 0.93, 1, 1.3, '#6b4a34'); a.dot(u + 0.08, 0.93, 1, 1.3, '#6b4a34'); }
  }
  function C3(a, r, w, v) {
    a.lot('#c4c2ba');
    const glass = pk(r, GLASS), frame = pk(r, ['#3d4852', '#566170', '#d9dde0', '#8a8f96']), H = 72 + (v % 4) * 13, fl = Math.floor((H - 10) / 8);
    a.box(0.1, 0.1, 0.9, 0.86, 0, H, frame);
    a.face('A', 0.1, 0.9, 0.86, 0, 9, sh(frame, 0.7)); a.face('B', 0.1, 0.86, 0.9, 0, 9, sh(frame, 0.7));
    a.win('A', 0.12, 0.88, 0.86, 10, H - 1, 5, fl, { glass: glass, mx: 0.08, mz: 0.12 }); a.win('B', 0.12, 0.84, 0.9, 10, H - 1, 5, fl, { glass: glass, mx: 0.08, mz: 0.12 });
    a.win('A', 0.3, 0.7, 0.86, 1, 8, 2, 1, { glass: '#8fd0e8', mx: 0.05, mz: 0.02 });
    a.box(0.1, 0.1, 0.9, 0.86, H, H + 2, sh(frame, 0.9), '#878c93'); a.box(0.3, 0.28, 0.62, 0.6, H + 2, H + 10, '#a3a8ae'); a.seg([0.72, 0.7, H + 2], [0.72, 0.7, H + 22], '#cfd3d7', 1);
    if (v % 2) a.box(0.14, 0.8, 0.86, 0.84, H + 2, H + 8, pk(r, AWN));
  }
  function C4(a, r, w, v) {
    a.lot('#6a6d72');
    const wall = pk(r, ['#ded8ca', '#d2d6d8', '#e4dccb']), acc = pk(r, AWN);
    a.box(0.12, 0.12, 1.88, 1.2, 0, 24, wall);
    a.face('A', 0.12, 1.88, 1.2, 18, 22, acc); a.face('B', 0.12, 1.2, 1.88, 18, 22, acc);
    a.win('A', 0.2, 1.8, 1.2, 2, 14, 8, 1, { glass: '#7ec0dc', mx: 0.12, mz: 0.08 }); a.win('B', 0.2, 1.12, 1.88, 4, 14, 5, 1);
    a.box(0.12, 0.12, 1.88, 1.2, 24, 25.5, sh(wall, 0.86), '#9a9ea3');
    for (let k = 0; k < 3; k++) a.gq(0.4 + k * 0.5, 0.4, 0.7 + k * 0.5, 0.9, '#9fd3ea', 25.6, 'rgba(0,0,0,0.25)');
    roofKit(a, r, 0.2, 0.15, 1.8, 0.4, 25.5, 3);
    a.box(0.78, 1.2, 1.22, 1.32, 0, 30, sh(wall, 0.95)); a.win('A', 0.8, 1.2, 1.32, 2, 20, 2, 1, { glass: '#9fd8ee', mx: 0.06, mz: 0.03 }); a.face('A', 0.8, 1.2, 1.32, 22, 28, acc); a.face('A', 0.86, 1.14, 1.32, 23.5, 26.5, '#fff6dc');
    parking(a, 0.1, 1.42, 1.9, 1.66, r, true); parking(a, 0.1, 1.72, 1.9, 1.96, r, true);
    a.tree(0.1, 1.36, 2, 0.6); a.tree(1.9, 1.36, 2, 0.6);
    a.box(0.02, 1.9, 0.08, 1.96, 0, 26, '#8a8f96'); a.box(0.0, 1.86, 0.1, 1.98, 26, 36, acc);
  }
  function C5(a, r, w, v) {
    a.lot('#c8c6be'); a.tree(0.14, 0.14, 2, 0.7); a.tree(1.86, 0.14, 2, 0.7);
    const glass = pk(r, GLASS), frame = pk(r, ['#2f3a45', '#46525e', '#dfe2e4', '#6f7780', '#b89b5e']);
    const tw = function (u0, v0, u1, v1, z0, H, c) {
      const fl = Math.max(1, Math.floor((H - z0) / 8));
      a.box(u0, v0, u1, v1, z0, H, frame);
      a.win('A', u0 + 0.02, u1 - 0.02, v1, z0 + 1, H - 1, c, fl, { glass: glass, mx: 0.07, mz: 0.1 }); a.win('B', v0 + 0.02, v1 - 0.02, u1, z0 + 1, H - 1, c, fl, { glass: glass, mx: 0.07, mz: 0.1 });
    };
    a.box(0.18, 0.18, 1.82, 1.82, 0, 18, sh(frame, 0.9)); a.win('A', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.04 }); a.win('B', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.04 });
    const m = v % 3;
    if (m === 0) { const H = 200 + (v % 2) * 30; tw(0.4, 0.4, 1.6, 1.6, 18, H * 0.62, 7); tw(0.55, 0.55, 1.45, 1.45, H * 0.62, H * 0.86, 5); tw(0.7, 0.7, 1.3, 1.3, H * 0.86, H, 3); a.box(0.9, 0.9, 1.1, 1.1, H, H + 10, '#9aa0a6'); a.seg([1, 1, H + 10], [1, 1, H + 44], '#d5d9dd', 1.4); a.dot(1, 1, H + 44, 1.6, '#ff5a4a'); }
    else if (m === 1) { const H = 232; tw(0.42, 0.42, 1.58, 1.58, 18, H, 7); a.box(0.42, 0.42, 1.58, 1.58, H, H + 3, sh(frame, 0.9), '#7f858c'); a.box(0.6, 0.6, 1.4, 1.4, H + 3, H + 12, glass); a.seg([0.7, 0.7, H + 12], [0.7, 0.7, H + 36], '#d5d9dd', 1.2); roofKit(a, r, 0.9, 0.9, 1.4, 1.4, H + 12, 2); }
    else { const H = 176; tw(0.3, 0.4, 0.98, 1.08, 18, H + 54, 4); a.box(0.3, 0.4, 0.98, 1.08, H + 54, H + 57, sh(frame, 0.9), '#7f858c'); a.seg([0.64, 0.74, H + 57], [0.64, 0.74, H + 80], '#d5d9dd', 1.2); tw(1.0, 0.95, 1.7, 1.65, 18, H, 4); a.box(1.0, 0.95, 1.7, 1.65, H, H + 3, sh(frame, 0.9), '#7f858c'); roofKit(a, r, 1.05, 1.0, 1.6, 1.55, H + 3, 3); }
    a.bush(0.12, 1.86); a.bush(0.12, 1.6);
  }
  // ---------- industrial ----------
  function crates(a, r, u, v, n) { for (let k = 0; k < n; k++) { const x = u + r() * 0.16, y = v + r() * 0.12; a.box(x, y, x + 0.07, y + 0.07, 0, 3 + r() * 3, pk(r, ['#b08a4f', '#9c7a45', '#7f8a94', '#3f7fb0'])); } }
  function I1(a, r) {
    a.lot('#8f8c82');
    const wall = pk(r, ['#9aa3ad', '#a6866a', '#8d9a86', '#b0a48e']), roof = pk(r, ['#6f7780', '#7a5a48', '#59636f']);
    a.box(0.14, 0.18, 0.84, 0.74, 0, 12, wall);
    a.face('A', 0.2, 0.52, 0.74, 0, 9, '#4d545c'); for (let k = 1; k < 4; k++) a.face('A', 0.2, 0.52, 0.74, k * 2.2, k * 2.2 + 0.5, '#6a727b');
    a.win('A', 0.56, 0.82, 0.74, 4, 10, 2, 1); a.win('B', 0.22, 0.7, 0.84, 5, 10, 2, 1);
    a.gable(0.12, 0.16, 0.86, 0.76, 12, 6, roof, wall, 'u');
    a.cyl(0.3, 0.3, 0.035, 14, 24, '#6b6f75'); a.smokeAt(0.3, 0.3, 25, 0);
    crates(a, r, 0.08, 0.82, 3); a.cyl(0.9, 0.86, 0.045, 0, 7, pk(r, ['#3f7fb0', '#b0483f', '#3c9a5a']));
  }
  function I2(a, r, w, v) {
    a.lot('#8a8880');
    const wall = pk(r, ['#b9b4a8', '#a9b0b6', '#c2b59c']), acc = pk(r, ['#2f6fb0', '#b0483f', '#3c8f5a', '#d98b2b']);
    a.box(0.08, 0.1, 0.92, 0.8, 0, 17, wall);
    a.face('A', 0.08, 0.92, 0.8, 13, 15.5, acc); a.face('B', 0.1, 0.8, 0.92, 13, 15.5, acc);
    for (let k = 0; k < 3; k++) { a.face('A', 0.14 + k * 0.26, 0.32 + k * 0.26, 0.8, 0, 9, '#474d55'); a.face('A', 0.14 + k * 0.26, 0.32 + k * 0.26, 0.8, 9, 9.8, '#d8b23a'); }
    a.win('B', 0.2, 0.7, 0.92, 5, 11, 3, 1);
    a.gable(0.06, 0.08, 0.94, 0.82, 17, 6, '#7c838a', wall, 'u');
    if (v % 2) { a.box(0.4, 0.84, 0.72, 0.96, 0, 7, '#e8e6e0'); a.box(0.72, 0.85, 0.82, 0.95, 0, 6, acc); } else crates(a, r, 0.1, 0.84, 4);
  }
  function I3(a, r, w, v) {
    a.lot('#7f7d76');
    const wall = pk(r, BRICK), roof = '#6c737a';
    a.box(0.14, 0.14, 1.5, 1.3, 0, 26, wall);
    a.win('A', 0.18, 1.46, 1.3, 12, 22, 7, 1, { glass: '#7fa9c2' }); a.win('B', 0.2, 1.24, 1.5, 12, 22, 5, 1, { glass: '#7fa9c2' });
    a.face('A', 0.3, 0.62, 1.3, 0, 11, '#474d55'); a.face('A', 0.9, 1.22, 1.3, 0, 11, '#474d55');
    for (let k = 0; k < 4; k++) { const u0 = 0.14 + k * 0.34; a.poly([[u0, 0.14, 26], [u0, 1.3, 26], [u0 + 0.12, 1.3, 35], [u0 + 0.12, 0.14, 35]], sh('#9fd0e6', 0.9)); a.poly([[u0 + 0.12, 0.14, 35], [u0 + 0.12, 1.3, 35], [u0 + 0.34, 1.3, 26], [u0 + 0.34, 0.14, 26]], sh(roof, a.lB() + 0.1)); a.poly([[u0, 1.3, 26], [u0 + 0.34, 1.3, 26], [u0 + 0.12, 1.3, 35]], sh(wall, a.lA())); }
    a.cyl(1.72, 0.4, 0.085, 0, 86, '#a05a48'); a.cyl(1.72, 0.4, 0.09, 70, 76, '#e8e4dc'); a.smokeAt(1.72, 0.4, 88, 1);
    a.box(1.5, 0.75, 1.9, 1.5, 0, 16, sh(wall, 0.9)); a.win('B', 0.8, 1.45, 1.9, 5, 12, 3, 1); a.box(1.5, 0.75, 1.9, 1.5, 16, 17.5, '#7c838a');
    a.cyl(0.35, 1.62, 0.13, 0, 14, '#c9cdd1'); a.cyl(0.68, 1.62, 0.13, 0, 14, '#c9cdd1');
    crates(a, r, 1.0, 1.5, 5); a.box(1.4, 1.7, 1.72, 1.82, 0, 7, '#e8e6e0'); a.box(1.72, 1.71, 1.82, 1.81, 0, 6, '#b0483f');
  }
  function I4(a, r, w, v) {
    a.lot('#716f69'); a.gq(0.1, 1.4, 0.8, 1.9, '#5d5b55');
    a.cyl(0.42, 0.42, 0.26, 0, 24, '#b9bdc1'); a.cyl(1.02, 0.36, 0.2, 0, 30, '#a98f6a');
    a.box(0.9, 0.7, 1.86, 1.4, 0, 34, '#5d646c'); a.face('A', 0.9, 1.86, 1.4, 26, 30, '#c9a23a'); a.win('A', 0.95, 1.8, 1.4, 6, 22, 6, 2, { glass: '#6f93a8' }); a.win('B', 0.75, 1.35, 1.86, 6, 22, 4, 2, { glass: '#6f93a8' });
    a.gable(0.88, 0.68, 1.88, 1.42, 34, 9, '#4a5057', '#5d646c', 'u');
    a.cyl(1.2, 0.95, 0.075, 34, 104, '#8b8f94'); a.cyl(1.2, 0.95, 0.08, 90, 96, '#c8463c'); a.smokeAt(1.2, 0.95, 106, 1);
    a.cyl(1.55, 1.05, 0.085, 34, 122, '#9a6a55'); a.cyl(1.55, 1.05, 0.09, 106, 113, '#e8e4dc'); a.smokeAt(1.55, 1.05, 124, 1);
    a.seg([0.42, 0.42, 24], [0.95, 0.75, 30], '#8a8f95', 2.2); a.seg([1.02, 0.36, 30], [1.1, 0.72, 32], '#8a8f95', 2.2);
    a.pyr(0.14, 1.42, 0.7, 1.9, 0, 14, '#3a3836'); a.poly([[0.5, 1.6, 12], [0.56, 1.66, 12], [1.0, 1.42, 26], [0.94, 1.38, 26]], '#7a7f85');
    a.cyl(1.2, 1.68, 0.13, 0, 16, '#c9cdd1'); a.cyl(1.55, 1.68, 0.13, 0, 16, '#b0483f');
  }
  function I5(a, r, w, v) {
    a.lot('#6fb556'); a.gq(0.0, 1.55, 2, 1.72, '#d6d0be'); a.gq(0.9, 1.1, 1.06, 1.6, '#d6d0be');
    a.tree(0.14, 0.12, 2, 0.8); a.tree(1.86, 0.14, 6, 0.8);
    const glass = pk(r, ['#6fc0c8', '#74b4dc', '#7fd0c0']);
    a.box(0.2, 0.2, 1.55, 1.0, 0, 24, '#f1f1ee');
    a.win('A', 0.22, 1.53, 1.0, 3, 21, 9, 2, { glass: glass, mx: 0.05, mz: 0.16 }); a.win('B', 0.22, 0.98, 1.55, 3, 21, 5, 2, { glass: glass, mx: 0.05, mz: 0.16 });
    a.box(0.2, 0.2, 1.55, 1.0, 24, 25.5, '#e2e2de', '#d2d4d6');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) a.poly([[0.3 + i * 0.3, 0.28 + j * 0.34, 26], [0.54 + i * 0.3, 0.28 + j * 0.34, 26], [0.54 + i * 0.3, 0.54 + j * 0.34, 29], [0.3 + i * 0.3, 0.54 + j * 0.34, 29]], '#2d4f86', 'rgba(255,255,255,0.4)');
    a.box(1.12, 1.02, 1.8, 1.5, 0, 36, sh(glass, 0.8)); a.win('A', 1.14, 1.78, 1.5, 2, 35, 4, 4, { glass: glass, mx: 0.05, mz: 0.06 }); a.win('B', 1.04, 1.48, 1.8, 2, 35, 3, 4, { glass: glass, mx: 0.05, mz: 0.06 });
    a.box(1.12, 1.02, 1.8, 1.5, 36, 37.5, '#e2e2de'); a.dome(1.46, 1.26, 0.09, 37.5, '#f4f4f0', 0.9);
    parking(a, 0.12, 1.76, 1.3, 1.96, r, true); a.tree(0.3, 1.3, 2, 0.8); a.tree(0.62, 1.34, 6, 0.7); a.bush(1.9, 1.86);
  }
  const ZD = [null, [null, R1, R2, R3, R4, R5], [null, C1, C2, C3, C4, C5], [null, I1, I2, I3, I4, I5]];

  // ---------- night / abandoned variants ----------
  // night tint (multiplied over the day sprite and the ground) and the colours of lit windows
  S.NIGHT = [98, 114, 184];
  const WINCOL = ['#ffe39a', '#ffd27a', '#ffc65a', '#ffa94a', '#fff1cf', '#bfe0ff', '#8fc2ff', '#ffb98a'];
  S.WINCOL = WINCOL;
  // which windows are lit differs per building design: some are almost dark, some fully lit, in mixed colours and
  // brightness. sp.lw[i] = 0 (dark) or colour index + 1; sp.tw = dark windows that may switch on and off at runtime.
  function litOf(sp) {
    if (sp.lw) return sp.lw; const n = sp.wins.length, sd = sp.sd || (n * 131 + sp.w * 7 + (sp.top | 0)), lw = sp.lw = new Uint8Array(n), tw = sp.tw = [];
    const frac = 0.2 + M.hash(sd, 3, 51) * 0.5, cool = M.hash(sd, 5, 52) < 0.18, mono = M.hash(sd, 7, 53) < 0.3 ? 1 + ((M.hash(sd, 9, 54) * 4) | 0) : 0;
    for (let i = 0; i < n; i++) {
      const h = M.hash(i, sd, 77);
      if (h > frac) { if (tw.length < 24 && M.hash(i, sd, 78) < Math.max(0.12, 14 / n)) tw.push(i); continue; }
      const c = M.hash(i, sd, 79); lw[i] = mono && c < 0.7 ? mono : cool ? (c < 0.6 ? 6 : c < 0.8 ? 5 : 7) : (c < 0.3 ? 1 : c < 0.52 ? 2 : c < 0.7 ? 3 : c < 0.8 ? 4 : c < 0.88 ? 5 : c < 0.93 ? 6 : c < 0.97 ? 7 : 8);
    }
    return lw;
  }
  S.twinkle = function (sp) { if (!sp.lw) litOf(sp); return sp.tw; };
  function winPath(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.lineTo(p[3][0], p[3][1]); g.closePath(); }
  function nightOf(sp, lit) {
    const c = mk(sp.c.width, sp.c.height), g = c.getContext('2d'), N = S.NIGHT; g.drawImage(sp.c, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(' + N[0] + ',' + N[1] + ',' + N[2] + ')'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(sp.c, 0, 0); g.globalCompositeOperation = 'source-over';
    g.setTransform(sp.r, 0, 0, sp.r, 0, 0);
    if (lit && sp.wins && sp.wins.length) {
      const lw = litOf(sp), sd = sp.sd || 0;
      for (let i = 0; i < sp.wins.length; i++) { if (!lw[i]) continue; g.globalAlpha = 0.55 + 0.45 * M.hash(i, sd, 80); g.fillStyle = WINCOL[lw[i] - 1]; winPath(g, sp.wins[i]); g.fill(); }
      g.globalAlpha = 1;
      if (M.settings.quality !== 'low') { // bake a soft glow around lit windows into the night sprite
        const bl = S.bloom(sp); if (bl) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(bl, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; sp.bl = undefined; }
      }
    }
    return c;
  }
  // soft halo around lit windows, drawn additively over the night sprite (bloom)
  S.bloom = function (sp) {
    if (sp.bl !== undefined) return sp.bl; if (!sp.wins || !sp.wins.length) return (sp.bl = null);
    const c = mk(sp.c.width, sp.c.height), g = c.getContext('2d'), lw = litOf(sp); g.setTransform(sp.r, 0, 0, sp.r, 0, 0);
    g.shadowBlur = 7 * sp.r;
    for (let i = 0; i < sp.wins.length; i++) {
      if (!lw[i]) continue; const cold = lw[i] === 6 || lw[i] === 7;
      g.shadowColor = cold ? 'rgba(120,170,255,0.95)' : 'rgba(255,170,70,0.95)'; g.fillStyle = cold ? 'rgba(170,205,255,0.55)' : 'rgba(255,200,120,0.5)';
      winPath(g, sp.wins[i]); g.fill();
    }
    return (sp.bl = c);
  };
  // dusk/dawn: one pre-blended day→night sprite per quantized step instead of drawing both versions every frame.
  // Only the current step is kept; a small per-frame budget spreads the work so a step change never hitches.
  S.blendStep = -1; S.blendBudget = 0;
  S.blend = function (sp, lit, step) {
    const k = lit ? 'bL' : 'bD', ks = k + 's';
    if (sp[ks] === step) return sp[k];
    if (S.blendBudget <= 0) return null; S.blendBudget--;
    const nc = S.night(sp, lit), c = (sp[ks] !== undefined && sp[k]) || mk(sp.c.width, sp.c.height), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, c.width, c.height); g.drawImage(sp.c, 0, 0);
    g.globalAlpha = step / 16; g.drawImage(nc, 0, 0); g.globalAlpha = 1; sp[k] = c; sp[ks] = step; S.blendStep = step; return c;
  };
  S.dropBlends = function () { if (S.blendStep < 0) return; S.blendStep = -1; S.cache.forEach(function (sp) { sp.bL = sp.bD = sp.bLs = sp.bDs = undefined; }); };
  S.night = function (sp, lit) { if (lit) return sp.n || (sp.n = nightOf(sp, true)); return sp.nd || (sp.nd = nightOf(sp, false)); };
  function abandon(sp) {
    const g = sp.c.getContext('2d');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,58,44,0.5)'; g.fillRect(0, 0, sp.w, sp.h); g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < sp.wins.length; i++) { const p = sp.wins[i]; g.fillStyle = M.hash(i, 3, 9) < 0.4 ? '#6b5540' : '#1d1a18'; g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.lineTo(p[3][0], p[3][1]); g.closePath(); g.fill(); }
    sp.wins = []; sp.smoke = [];
  }
  // ---------- sprite lookups ----------
  // Each zone level has several building forms (S.zforms, extended in sprites3.js); a variant picks a form and
  // a style seed, so a level has NV distinct looks instead of 4.
  S.NV = 80; S.tick = 0; S.genMs = 0; S.GEN_BUDGET = 6; const fallback = new Map();
  S.zforms = [null]; for (let z = 1; z <= 3; z++) { S.zforms[z] = [null]; for (let l = 1; l <= 5; l++) S.zforms[z][l] = [ZD[z][l]]; }
  S.ZH = ZH;
  S.zoned = function (z, lvl, wealth, v, f, ab) {
    const key = 'z' + z + lvl + wealth + '.' + v + '.' + f + (ab ? 'x' : ''); let sp = S.cache.get(key); if (sp) { sp.u = S.tick; return sp; }
    // drawing a sprite costs a few ms: when many new ones scroll into view at once, spread the work over frames
    // and show a ready-made neighbour of the same kind in the meantime
    const fk = z * 100 + lvl * 10 + f; if (S.genMs > S.GEN_BUDGET) { const fb = fallback.get(fk); if (fb && S.cache.get(fb.key) === fb) { fb.u = S.tick; return fb; } }
    const t0 = performance.now(), size = M.ZB[z].size[lvl], a = new Art(size, ZH[z][lvl]); a.flip = f;
    const forms = S.zforms[z][lvl], fi = v % forms.length;
    forms[fi](a, M.rng(z * 1000 + lvl * 100 + wealth * 10 + v * 131 + 7), wealth, (v / forms.length) | 0);
    sp = a.done(); if (ab) abandon(sp); sp.u = S.tick; sp.key = key; sp.sd = z * 100000 + lvl * 10000 + wealth * 1000 + v * 2 + f; S.cache.set(key, sp); if (!ab) fallback.set(fk, sp); S.genMs += performance.now() - t0; return sp;
  };
  S.variant = function (b) { return ((b.v | 0) + ((M.hash(b.x, b.y, 31) * S.NV) | 0)) % S.NV; };
  S.of = function (b) {
    if (b.z) return S.zoned(b.z, b.lvl, b.z === 1 ? b.wealth : 1, S.variant(b), b.f, b.ab ? 1 : 0);
    const sp = S.def(b.t, b.f, b.v); if (sp) sp.u = S.tick; return sp;
  };
  // keep sprite memory bounded: drop sprites that have not been on screen for a while once the budget is exceeded
  S.bytes = function (sp) { let n = sp.c.width * sp.c.height * 4; return n * (1 + (sp.n ? 1 : 0) + (sp.nd ? 1 : 0) + (sp.bL ? 1 : 0) + (sp.bD ? 1 : 0)); };
  S.trim = function () {
    const budget = (M.settings && M.settings.quality === 'low' ? 60 : M.settings && M.settings.quality === 'medium' ? 110 : 170) * 1048576;
    let tot = 0; const old = []; S.cache.forEach(function (sp, k) { tot += S.bytes(sp); if (sp.u !== undefined && S.tick - sp.u > 240) old.push([sp.u, k, sp]); });
    S.memMB = Math.round(tot / 1048576); if (tot <= budget) return;
    old.sort(function (p, q) { return p[0] - q[0]; });
    for (let i = 0; i < old.length && tot > budget * 0.7; i++) { tot -= S.bytes(old[i][2]); S.cache.delete(old[i][1]); }
  };
  S.def = function (id, f, v) {
    const d = S.designs[id]; if (!d) return null; const vv = d.variants ? (v || 0) % d.variants : 0, key = 'd' + id + (f ? 1 : 0) + vv; let sp = S.cache.get(key); if (sp) return sp;
    const a = new Art(M.DEFS[id].size, d.h); a.flip = f ? 1 : 0; d.draw(a, M.rng(M.strSeed(id) + vv), vv); sp = a.done(); S.cache.set(key, sp); return sp;
  };
  S.misc = function (key, size, h, draw) { let sp = S.cache.get(key); if (sp) return sp; const a = new Art(size, h); draw(a, M.rng(M.strSeed(key))); sp = a.done(); S.cache.set(key, sp); return sp; };
  S.deco = function (kind, v) {
    return S.misc('deco' + kind + v, 1, 40, function (a, r) {
      if (kind === 1 || kind === 2 || kind === 6) { a.tree(0.5 + (r() - 0.5) * 0.2, 0.5 + (r() - 0.5) * 0.2, kind, 0.85 + v * 0.12); if (v === 2) a.tree(0.26, 0.66, kind, 0.6); }
      else if (kind === 3) { a.bush(0.45, 0.5, '#4f9440', 1.1); if (v) a.bush(0.62, 0.6, '#5fa348', 0.8); }
      else if (kind === 4) { const g = a.g, P = a.p(0.5, 0.5, 0); g.fillStyle = '#8d8f8c'; g.beginPath(); g.moveTo(P[0] - 6, P[1]); g.lineTo(P[0] - 3, P[1] - 6); g.lineTo(P[0] + 3, P[1] - 7); g.lineTo(P[0] + 7, P[1] - 1); g.lineTo(P[0] + 2, P[1] + 2); g.closePath(); g.fill(); g.fillStyle = '#b3b5b1'; g.beginPath(); g.moveTo(P[0] - 3, P[1] - 6); g.lineTo(P[0] + 3, P[1] - 7); g.lineTo(P[0], P[1] - 2); g.closePath(); g.fill(); }
      else if (kind === 5) { const cols = ['#f2d24a', '#e86a8a', '#f4f1ea', '#c78ae0']; for (let k = 0; k < 7; k++) a.dot(0.25 + r() * 0.5, 0.25 + r() * 0.5, 1.5, 1.2, cols[(k + v) % 4]); }
    });
  };
  S.site = function (size) {
    return S.misc('site' + size, size, 30, function (a, r) {
      a.lot('#a39372'); a.gq(0.1, 0.1, size - 0.1, size - 0.1, '#8f7f60');
      for (let k = 0; k < size * 3; k++) { const u = 0.15 + r() * (size - 0.4), v = 0.15 + r() * (size - 0.4); a.box(u, v, u + 0.1, v + 0.1, 0, 2 + r() * 3, r() < 0.5 ? '#b9b4a8' : '#b08a4f'); }
      for (let k = 0; k <= size * 4; k++) { const t = k / 4; a.seg([t, size, 0], [t, size, 5], '#e0b030', 1); a.seg([size, t, 0], [size, t, 5], '#e0b030', 1); }
      a.seg([0, size, 5], [size, size, 5], '#e0b030', 1); a.seg([size, 0, 5], [size, size, 5], '#e0b030', 1);
    });
  };
  S.crane = function () {
    return S.misc('crane', 1, 96, function (a) {
      a.box(0.42, 0.42, 0.58, 0.58, 0, 4, '#6a6f75');
      for (let z = 4; z < 78; z += 8) { a.seg([0.46, 0.5, z], [0.54, 0.5, z + 8], '#e0b030', 1); a.seg([0.54, 0.5, z], [0.46, 0.5, z + 8], '#e0b030', 1); }
      a.seg([0.46, 0.5, 4], [0.46, 0.5, 80], '#e0b030', 1.2); a.seg([0.54, 0.5, 4], [0.54, 0.5, 80], '#e0b030', 1.2);
      a.seg([0.1, 0.5, 80], [1.4, 0.5, 80], '#e0b030', 2); a.seg([0.5, 0.5, 92], [1.4, 0.5, 80], '#8a8f95', 0.8); a.seg([0.5, 0.5, 92], [0.1, 0.5, 80], '#8a8f95', 0.8); a.seg([0.5, 0.5, 80], [0.5, 0.5, 92], '#e0b030', 1.2);
      a.box(0.1, 0.44, 0.24, 0.56, 74, 80, '#7a7f85'); a.seg([1.1, 0.5, 80], [1.1, 0.5, 52], '#555', 0.7); a.box(1.05, 0.45, 1.15, 0.55, 48, 52, '#b08a4f');
    });
  };
  S.pylon = function () {
    return S.misc('pylon', 1, 60, function (a) {
      const c = '#8d949b';
      a.seg([0.38, 0.5, 0], [0.47, 0.5, 44], c, 1.3); a.seg([0.62, 0.5, 0], [0.53, 0.5, 44], c, 1.3); a.seg([0.5, 0.38, 0], [0.5, 0.47, 44], c, 1); a.seg([0.5, 0.62, 0], [0.5, 0.53, 44], c, 1);
      for (let z = 6; z < 40; z += 9) { const k = 0.12 * (1 - z / 50); a.seg([0.5 - k, 0.5, z], [0.5 + k, 0.5, z + 9], c, 0.7); a.seg([0.5 + k, 0.5, z], [0.5 - k, 0.5, z + 9], c, 0.7); }
      a.seg([0.5, 0.5, 44], [0.5, 0.5, 54], c, 1.3); a.seg([0.24, 0.5, 46], [0.76, 0.5, 46], c, 1.4); a.seg([0.32, 0.5, 52], [0.68, 0.5, 52], c, 1.2);
    });
  };
  // vehicles: type, axis (1 = along u/x, 0 = along v/y), colour index
  // d: driving direction 0 N, 1 E, 2 S, 3 W — the front (cab, bonnet, windscreen) always points that way
  // vehicles are drawn for 16 headings (0 = +u, 4 = +v, 8 = -u, 12 = -v) so they can turn through a bend
  S.vehicleH = function (type, h, col) {
    const sp = S.misc('veh' + type + '.' + h + '.' + col, 1, 18, function (a) {
      const th = h * Math.PI / 8, cx = Math.cos(th), cy = Math.sin(th);
      const bx = function (l, w, z0, z1, c, o) {
        o = o || 0; const mx = 0.5 + cx * o, my = 0.5 + cy * o;
        const P = [[mx + cx * l - cy * w, my + cy * l + cx * w], [mx + cx * l + cy * w, my + cy * l - cx * w], [mx - cx * l + cy * w, my - cy * l - cx * w], [mx - cx * l - cy * w, my - cy * l + cx * w]];
        const N = [[cx, cy], [cy, -cx], [-cx, -cy], [-cy, cx]];
        for (let i = 0; i < 4; i++) { const n = N[i]; if (n[0] + n[1] <= 0.001) continue; const p = P[i], q = P[(i + 1) & 3]; a.poly([[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], sh(c, 0.84 + 0.12 * (n[1] - n[0]) / (Math.abs(n[0]) + Math.abs(n[1])))); }
        a.poly([[P[0][0], P[0][1], z1], [P[1][0], P[1][1], z1], [P[2][0], P[2][1], z1], [P[3][0], P[3][1], z1]], sh(c, 1.12));
      };
      if (type === 'car') { bx(0.13, 0.06, 0.5, 3.6, CARCOL[col]); bx(0.065, 0.052, 3.6, 6, '#26323f', -0.02); bx(0.012, 0.05, 3.6, 5.6, '#7fa8c8', 0.05); }
      else if (type === 'truck') { const first = cx + cy > 0; if (first) bx(0.16, 0.07, 0.5, 8, ['#e8e6e0', '#c9cdd1', '#d9c28a'][col % 3]); bx(0.045, 0.065, 0.5, 6.5, CARCOL[col], 0.21); if (!first) bx(0.16, 0.07, 0.5, 8, ['#e8e6e0', '#c9cdd1', '#d9c28a'][col % 3]); }
      else if (type === 'bus') { bx(0.2, 0.07, 0.5, 7.5, '#e8a92a'); bx(0.19, 0.072, 3.5, 6, '#26323f'); bx(0.012, 0.073, 1.5, 6.4, '#9fc4e0', 0.195); }
      else if (type === 'fire') { bx(0.19, 0.07, 0.5, 7, '#c8322a'); bx(0.12, 0.03, 7, 8.4, '#e6e6e6', -0.03); bx(0.04, 0.066, 3.5, 6.2, '#26323f', 0.13); }
      else if (type === 'police') { bx(0.13, 0.06, 0.5, 3.6, '#f1f1f1'); bx(0.065, 0.052, 3.6, 6, '#22355a', -0.02); bx(0.012, 0.05, 3.6, 5.6, '#7fa8c8', 0.05); bx(0.02, 0.04, 6, 7.2, '#3a7bff'); }
      else if (type === 'garbage') { const first = cx + cy > 0; if (first) bx(0.17, 0.07, 0.5, 8, '#3f8f5a'); bx(0.045, 0.066, 0.5, 6.5, '#e8e6e0', 0.2); if (!first) bx(0.17, 0.07, 0.5, 8, '#3f8f5a'); }
    });
    sp.u = S.tick; return sp;
  };
  S.vehicle = function (type, d, col) { return S.vehicleH(type, ((d + 3) & 3) * 4, col); }; // d: 1 = +u, 2 = +v, 3 = -u, 0 = -v
  // UI thumbnail of any sprite
  S.thumb = function (sp, w, h) {
    const c = mk(w, h), g = c.getContext('2d'); if (!sp) return c;
    const W2 = sp.c.width, H2 = sp.c.height;
    if (!sp.bb) { // opaque bounds in device pixels, measured once
      let x0 = W2, y0 = H2, x1 = 0, y1 = 0;
      try { const d = sp.c.getContext('2d').getImageData(0, 0, W2, H2).data; for (let y = 0; y < H2; y += 2) for (let x = 0; x < W2; x += 2) if (d[(y * W2 + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } catch (e) { x0 = 0; y0 = 0; x1 = W2; y1 = H2; }
      if (x1 <= x0) { x0 = 0; y0 = 0; x1 = W2; y1 = H2; } sp.bb = [x0, y0, Math.min(W2 - x0, x1 - x0 + 3), Math.min(H2 - y0, y1 - y0 + 3)];
    }
    const bb = sp.bb, lw = bb[2] / sp.r, lh = bb[3] / sp.r, k = Math.min(w / lw, h / lh, 1.4); g.imageSmoothingQuality = 'high';
    g.drawImage(sp.c, bb[0], bb[1], bb[2], bb[3], (w - lw * k) / 2, h - lh * k, lw * k, lh * k);
    return c;
  };

  // ---------- road tiles ----------
  const ASPH = '#4b4e54', WALK = '#b6b4ad';
  function tp(sx, sy, u, v) { return [sx + (u - v) * TW, sy + (u + v) * TH]; }
  function quad(g, sx, sy, u0, v0, u1, v1) { let p = tp(sx, sy, u0, v0); g.moveTo(p[0], p[1]); p = tp(sx, sy, u1, v0); g.lineTo(p[0], p[1]); p = tp(sx, sy, u1, v1); g.lineTo(p[0], p[1]); p = tp(sx, sy, u0, v1); g.lineTo(p[0], p[1]); g.closePath(); }
  function line(g, sx, sy, u0, v0, u1, v1) { let p = tp(sx, sy, u0, v0); g.moveTo(p[0], p[1]); p = tp(sx, sy, u1, v1); g.lineTo(p[0], p[1]); }
  // arm rectangles (u0,v0,u1,v1) for N,E,S,W given half width
  function arm(d, hw) { return d === 0 ? [0.5 - hw, 0, 0.5 + hw, 0.5 - hw] : d === 1 ? [0.5 + hw, 0.5 - hw, 1, 0.5 + hw] : d === 2 ? [0.5 - hw, 0.5 + hw, 0.5 + hw, 1] : [0, 0.5 - hw, 0.5 - hw, 0.5 + hw]; }
  S.drawRoad = function (g, sx, sy, type, mask, o) {
    o = o || {}; const rt = M.ROADS[type], hw = rt.w / 2; let m = mask; if (!m) m = 15;
    const cnt = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1), paved = type !== 1 && type !== 7;
    if (paved && !o.bridge) { g.beginPath(); quad(g, sx, sy, 0, 0, 1, 1); g.fillStyle = type === 6 ? '#74777b' : WALK; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.6; g.stroke(); }
    else if (o.bridge) { g.beginPath(); quad(g, sx, sy, 0, 0, 1, 1); g.fillStyle = '#8f9296'; g.fill(); }
    g.beginPath(); quad(g, sx, sy, 0.5 - hw, 0.5 - hw, 0.5 + hw, 0.5 + hw);
    for (let d = 0; d < 4; d++) if (m & (1 << d)) { const a = arm(d, hw); quad(g, sx, sy, a[0], a[1], a[2], a[3]); }
    g.fillStyle = type === 1 ? '#a08a5f' : type === 7 ? '#d6cdb2' : type === 6 ? '#3e4147' : ASPH; g.fill();
    if (type === 7) { g.strokeStyle = 'rgba(120,105,70,0.5)'; g.lineWidth = 0.6; g.stroke(); return; }
    // markings
    const ends = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], inner = cnt >= 3 ? hw : 0;
    const armLine = function (d, off, col, dash, w) {
      const e = ends[d], nx = d % 2 === 0 ? 1 : 0, ny = d % 2 === 0 ? 0 : 1, cx = 0.5 + (e[0] - 0.5) * (inner * 2), cy = 0.5 + (e[1] - 0.5) * (inner * 2);
      g.beginPath(); line(g, sx, sy, cx + nx * off, cy + ny * off, e[0] + nx * off, e[1] + ny * off); g.strokeStyle = col; g.lineWidth = w || 0.9; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]);
    };
    for (let d = 0; d < 4; d++) {
      if (!(m & (1 << d))) continue;
      if (type === 1) { armLine(d, -0.07, 'rgba(90,72,40,0.45)', null, 1.2); armLine(d, 0.07, 'rgba(90,72,40,0.45)', null, 1.2); }
      else if (type === 2) armLine(d, 0, '#e9d36a', [3, 3], 0.9);
      else if (type === 3) { armLine(d, -0.012, '#e9d36a'); armLine(d, 0.012, '#e9d36a'); armLine(d, -hw * 0.5, 'rgba(255,255,255,0.75)', [3, 3], 0.7); armLine(d, hw * 0.5, 'rgba(255,255,255,0.75)', [3, 3], 0.7); }
      else if (type === 4) { armLine(d, 0, '#5fa348', null, 4.2); armLine(d, -hw * 0.55, 'rgba(255,255,255,0.75)', [3, 3], 0.7); armLine(d, hw * 0.55, 'rgba(255,255,255,0.75)', [3, 3], 0.7); }
      else if (type === 5) armLine(d, 0, 'rgba(255,255,255,0.7)', [2, 4], 0.8);
      else if (type === 6) { armLine(d, 0, '#b9bcc0', null, 1.8); armLine(d, -hw * 0.5, 'rgba(255,255,255,0.8)', [4, 3], 0.7); armLine(d, hw * 0.5, 'rgba(255,255,255,0.8)', [4, 3], 0.7); armLine(d, -hw + 0.03, '#fff', null, 0.7); armLine(d, hw - 0.03, '#fff', null, 0.7); }
      if (cnt >= 3 && paved && type !== 6) { // crosswalk
        const a = arm(d, hw), e = ends[d], t0 = 0.5 + (e[0] - 0.5) * (hw * 2 + 0.06), t1 = 0.5 + (e[1] - 0.5) * (hw * 2 + 0.06);
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6; g.setLineDash([1.6, 1.8]); g.beginPath();
        if (d % 2 === 0) line(g, sx, sy, a[0] + 0.02, t1, a[2] - 0.02, t1); else line(g, sx, sy, t0, a[1] + 0.02, t0, a[3] - 0.02);
        g.stroke(); g.setLineDash([]);
      }
    }
    if (type === 4 && cnt < 3) { // median trees
      g.fillStyle = '#3f8c3f'; g.beginPath(); const p = tp(sx, sy, 0.5, 0.5); g.arc(p[0], p[1] - 3, 3.2, 0, 7); g.fill(); g.fillStyle = '#5aa84a'; g.beginPath(); g.arc(p[0] - 1, p[1] - 4, 2, 0, 7); g.fill();
    }
    if (type === 5 && o.dir != null) { // direction arrow
      const d = o.dir, e = ends[d], bx = 0.5 + (e[0] - 0.5) * 0.5, by = 0.5 + (e[1] - 0.5) * 0.5, px = d % 2 === 0 ? 0.09 : 0, py = d % 2 === 0 ? 0 : 0.09;
      const p1 = tp(sx, sy, bx, by), p2 = tp(sx, sy, 0.5 + px, 0.5 + py), p3 = tp(sx, sy, 0.5 - px, 0.5 - py);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath(); g.fill();
    }
  };
  S.roadIcon = function (type, w, h) {
    const c = mk(w, h), g = c.getContext('2d'); g.translate(w / 2 - 16, h / 2 - 24); g.scale(0.72, 0.72);
    for (let k = -1; k <= 1; k++) { const sx = 22 + k * TW, sy = 18 + k * TH; g.beginPath(); quad(g, sx, sy, 0, 0, 1, 1); g.fillStyle = '#6fae4f'; g.fill(); S.drawRoad(g, sx, sy, type, 10, { dir: 1 }); }
    return c;
  };
})();
