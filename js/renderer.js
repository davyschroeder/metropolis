'use strict';
/* METROPOLIS – isometric Canvas 2D renderer: cached terrain chunks, depth-sorted objects, lighting, weather, overlays */
(function () {
  const TW = M.TW, TH = M.TH, EL = M.EL, CH = M.CH, S = M.Sprites, Cam = M.Camera;
  const Rn = M.Render = { overlay: null, view: { cx: 0, cy: 0, r: 20, night: 0 }, frame: 0, hover: null, preview: null, sel: null, time: 0, night: 0, stats: { items: 0, chunks: 0, tGround: 0, tScan: 0, tObj: 0, tPost: 0 } };
  let cv, g, dpr = 1, cw = 0, chunkVer = null, seed = 0; const chunks = new Map();
  const GRASS = ['#5f9c49', '#67a54d', '#6fad51', '#78b456', '#82ba5c'], SAND = ['#d9c98f', '#dfd098', '#d3c286'], ROCK = ['#8d987c', '#97a184', '#859073'];
  const WATER = ['#46a2d6', '#3b92c9', '#3183bb', '#2874ac', '#21669c'];
  const RAMP_BAD = ['#3fae5a', '#7cc04f', '#b9cf45', '#e6d23c', '#eeb034', '#ee8a30', '#e85f2e', '#dc3a2c'];
  const RAMP_GOOD = ['#dc3a2c', '#e8742e', '#eeb034', '#d9d43f', '#a6cf48', '#6fc052', '#42ae62', '#2f9a74'];
  const RAMP_BLUE = ['#e8eef4', '#c5d8ea', '#9fc0e0', '#78a6d6', '#548ccb', '#3a72ba', '#2a59a0', '#1e4280'];
  const ZBRIGHT = ['', '#5fe06c', '#4f9dff', '#ffc23a'];
  const DCOL = ['', '#e6554d', '#4d8fe6', '#58c26a', '#e6b84d', '#b56be0', '#4dd0d0', '#e68a4d', '#d95fa8'];
  Rn.DCOL = DCOL;
  const pool = [], list = []; let nItems = 0;
  const parts = []; const icons = []; const lamps = []; let glow = null, cloudSp = null; const clouds = [];
  let gcv = null, gctx = null, gcv2 = null, gctx2 = null, gsx = 0, gsy = 0, gKey = '', gValid = false, groundVer = 1;
  // ---- light textures (additive) ----
  const glows = {}, LIGHT = { lamp: '255,186,105', flood: '232,240,255', cyan: '120,220,255', red: '255,52,40', head: '255,246,220', tail: '255,40,28', pool: '255,176,92' };
  function glowOf(k) {
    let c = glows[k]; if (c) return c; c = glows[k] = S.mk(64, 64); const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32), col = LIGHT[k];
    gr.addColorStop(0, 'rgba(' + col + ',0.95)'); gr.addColorStop(0.18, 'rgba(' + col + ',0.55)'); gr.addColorStop(0.5, 'rgba(' + col + ',0.16)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
  }
  let beam = null;
  function beamOf() { // headlight cone pointing along +x
    if (beam) return beam; beam = S.mk(64, 32); const x = beam.getContext('2d'), gr = x.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,246,220,0.75)'); gr.addColorStop(1, 'rgba(255,246,220,0)'); x.fillStyle = gr;
    x.beginPath(); x.moveTo(0, 13); x.lineTo(64, 0); x.lineTo(64, 32); x.lineTo(0, 19); x.closePath(); x.filter = 'blur(2px)'; x.fill(); return beam;
  }
  const posts = []; const shadowB = [], foam = []; let vign = null, vignKey = '';
  // convex hull (monotone chain) of 8 points, used for building shadows
  function hull(P) { P.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); const cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, lo = [], up = []; for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } lo.pop(); up.pop(); return lo.concat(up); }

  Rn.init = function (canvas) {
    cv = canvas; g = cv.getContext('2d', { alpha: false }); Rn.resize();
    window.addEventListener('resize', Rn.resize);
    M.on('dirty', function (x, y) { groundVer++; if (chunkVer) chunkVer[((y / CH) | 0) * cw + ((x / CH) | 0)]++; });
    M.on('quake', function () { Cam.shake = 1.6; });
    glow = S.mk(64, 64); const gg = glow.getContext('2d'), gr = gg.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,150,0.55)'); gr.addColorStop(0.4, 'rgba(255,200,120,0.18)'); gr.addColorStop(1, 'rgba(255,190,100,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
    cloudSp = S.mk(256, 128); const cg = cloudSp.getContext('2d');
    for (let k = 0; k < 7; k++) { const x = 60 + M.hash(k, 1, 5) * 136, y = 40 + M.hash(k, 2, 5) * 48, r = 34 + M.hash(k, 3, 5) * 26, gr2 = cg.createRadialGradient(x, y, 2, x, y, r); gr2.addColorStop(0, 'rgba(10,20,40,0.5)'); gr2.addColorStop(1, 'rgba(10,20,40,0)'); cg.fillStyle = gr2; cg.fillRect(0, 0, 256, 128); }
  };
  // dynamic resolution: when frames take too long, render fewer pixels (and scale the canvas up with CSS);
  // climb back when there is headroom. Measured on draw time, which is independent of the display refresh rate.
  Rn.scale = 1; Rn.ms = 8; let slowT = 0, fastT = 0;
  Rn.adapt = function (dt, fps) {
    if (!cv || M.mode !== 'game' || !M.settings || M.settings.autoRes === false) { slowT = fastT = 0; return; }
    if (fps < 42 && Rn.ms > 16) { slowT += dt; fastT = 0; } else if (Rn.ms < 9 && fps > 50) { fastT += dt; slowT = 0; } else { slowT = Math.max(0, slowT - dt); fastT = Math.max(0, fastT - dt); }
    if (slowT > 1.5 && Rn.scale > 0.6) { Rn.scale = Math.max(0.6, Rn.scale - 0.1); slowT = 0; Rn.resize(); }
    else if (fastT > 5 && Rn.scale < 1 && Rn.ms * Math.pow((Rn.scale + 0.1) / Rn.scale, 2) < 12) { Rn.scale = Math.min(1, Rn.scale + 0.1); fastT = 0; Rn.resize(); }
  };
  Rn.resize = function () {
    if (!cv) return; const q = M.settings && M.settings.quality, base = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'medium' ? 1.5 : 2);
    dpr = Math.max(Math.min(1, base), Math.round(base * Rn.scale * 20) / 20);
    const w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); Cam.w = w; Cam.h = h;
  };
  Rn.reset = function () {
    const W = M.world; cw = Math.ceil(W.n / CH); chunkVer = new Uint32Array(cw * cw).fill(1); chunks.clear(); groundVer++; parts.length = 0; seed = M.city.seed;
    clouds.length = 0; for (let k = 0; k < 12; k++) clouds.push({ x: (M.hash(k, 7, seed) - 0.5) * W.n * TW * 2.6, y: M.hash(k, 8, seed) * W.n * TH * 2.4, s: 1.6 + M.hash(k, 9, seed) * 2.2 });
    Rn.sel = null; Rn.preview = null;
  };
  Rn.invalidate = function () { groundVer++; if (chunkVer) for (let i = 0; i < chunkVer.length; i++) chunkVer[i]++; };

  // ---------------- ground tiles ----------------
  function dia(c, sx, sy) { c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + TW, sy + TH); c.lineTo(sx, sy + 2 * TH); c.lineTo(sx - TW, sy + TH); c.closePath(); }
  function tileColor(W, x, y) {
    const n = W.n, i = y * n + x, t = W.terr[i], h = M.hash(x, y, seed + 3); let col;
    if (t === 1) {
      const f = M.clamp((M.fbm(x * 0.06, y * 0.06, seed + 31, 3) - 0.28) * 2.3, 0, 1), dry = M.clamp((M.fbm(x * 0.045 + 7, y * 0.045, seed + 77, 2) - 0.58) * 3, 0, 0.5);
      col = M.mix(M.mix('#5c9a47', '#86bf5b', f), '#a9b660', dry); col = M.shade(col, 0.975 + h * 0.05);
    } else if (t === 2) col = M.mix('#dccb92', '#cfbd84', h); else col = M.mix('#8d987c', '#9aa386', M.fbm(x * 0.2, y * 0.2, seed + 3, 2));
    const ee = W.elev[i]; if (ee > 1) col = M.shade(col, 1 + (ee - 1) * 0.075);
    return col;
  }
  function drawTop(c, W, x, y, sx, sy) {
    const n = W.n, i = y * n + x, t = W.terr[i], h = M.hash(x, y, seed + 3), col = tileColor(W, x, y);
    dia(c, sx, sy); c.fillStyle = col; c.fill(); c.strokeStyle = col; c.lineWidth = 0.8; c.stroke();
    for (let k = 0; k < 4; k++) {
      const px = sx + (M.hash(x, y, k + 10) - 0.5) * 34, py = sy + TH + (M.hash(x, y, k + 20) - 0.5) * 13;
      c.fillStyle = k % 2 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'; c.fillRect(px, py, t === 1 ? 2 : 3, 1);
      if (t === 3 && k < 2) { c.fillStyle = 'rgba(70,74,66,0.35)'; c.fillRect(px - 2, py, 4, 2); c.fillStyle = 'rgba(230,232,224,0.25)'; c.fillRect(px - 2, py - 1, 3, 1); }
      if (t === 1 && k === 0 && h < 0.3) { c.fillStyle = 'rgba(40,90,30,0.35)'; c.fillRect(px + 4, py - 2, 1, 3); c.fillRect(px + 6, py - 1, 1, 2); }
    }
    const rt = W.road[i];
    if (W.zone[i] && !W.bld[i] && !rt) {
      // zoned but empty: pale wash in the zone colour + crisp inset outline + density pips, readable on grass
      const zc = ZBRIGHT[W.zone[i]];
      dia(c, sx, sy); c.globalAlpha = 0.42; c.fillStyle = W.zone[i] === 1 ? '#d8f5c8' : zc; c.fill(); c.globalAlpha = 1;
      c.beginPath(); c.moveTo(sx, sy + 3); c.lineTo(sx + TW - 6, sy + TH); c.lineTo(sx, sy + 2 * TH - 3); c.lineTo(sx - TW + 6, sy + TH); c.closePath();
      c.strokeStyle = 'rgba(20,30,20,0.35)'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = zc; c.lineWidth = 1.4; c.stroke();
      const d = W.zdens[i]; for (let k = 0; k < d; k++) { const px = sx - (d - 1) * 4 + k * 8; c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(px - 2.5, sy + TH - 2.5, 5, 5); c.fillStyle = zc; c.fillRect(px - 2, sy + TH - 2, 4, 4); }
    }
    if (rt) S.drawRoad(c, sx, sy, rt, M.Roads.mask(W, x, y), { dir: W.rdir[i] });
  }
  // Slopes instead of cliffs: a tile one level below a neighbour behind it draws a sloping bank from the
  // neighbour's edge down onto itself (grass, rock, a sandy beach into water, or a ramp where two roads meet).
  // Ends are tapered or joined to the next bank, and outer corners get a rounded wedge, so terraces flow.
  function drawBanks(c, W, x, y, sx, sy, e) {
    const n = W.n, i = y * n + x, E = function (xx, yy) { return xx < 0 || yy < 0 || xx >= n || yy >= n ? -9 : W.elev[yy * n + xx]; }, up = e + 1;
    const N = E(x, y - 1) === up, Wt = E(x - 1, y) === up, NW = E(x - 1, y - 1) === up;
    if (!N && !Wt && !NW) return;
    const rd = W.road[i] !== 0, s = rd ? 0.2 : e === 0 ? 0.5 : 0.44;
    const P = function (u, v, h) { return [sx + (u - v) * TW, sy + (u + v) * TH - h * EL]; };
    const colOf = function (xx, yy, f) {
      const j = yy * n + xx; let top = W.road[j] && rd ? '#5a5d63' : tileColor(W, xx, yy);
      const bot = e === 0 ? '#bfa66e' : rd && W.road[j] ? '#4b4e54' : M.shade(top, 0.82);
      if (e === 0 && W.terr[j] !== 2) top = M.mix(top, '#d9c78e', 0.35);
      return [M.shade(top, f), M.shade(bot, f * 0.98)];
    };
    const fill = function (pts, cols, t0, t1) {
      c.beginPath(); for (let k = 0; k < pts.length; k++) { const p = P(pts[k][0], pts[k][1], pts[k][2]); if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } c.closePath();
      const a = P(t0[0], t0[1], t0[2]), b = P(t1[0], t1[1], t1[2]), gr = c.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); c.fillStyle = gr; c.fill(); c.strokeStyle = cols[1]; c.lineWidth = 0.5; c.stroke();
    };
    // a road climbing onto the higher tile gets a proper ramp: pavement at the sides, asphalt and markings in the middle
    const ramp = function (j, alongU) {
      if (!rd || !W.road[j] || M.ROADS[W.road[i]].ped) return false;
      const hw = M.ROADS[W.road[i]].w / 2, L = 0.5, pt = function (a, b, h) { return alongU ? [a, b, h] : [b, a, h]; };
      fill([pt(0, 0, 1), pt(1, 0, 1), pt(1, L, 0), pt(0, L, 0)], ['#b8b6af', '#a9a7a0'], pt(0.5, 0, 1), pt(0.5, L, 0));
      fill([pt(0.5 - hw, 0, 1), pt(0.5 + hw, 0, 1), pt(0.5 + hw, L, 0), pt(0.5 - hw, L, 0)], ['#55585e', '#4b4e54'], pt(0.5, 0, 1), pt(0.5, L, 0));
      const a = P.apply(null, pt(0.5, 0, 1)), b = P.apply(null, pt(0.5, L, 0)); c.strokeStyle = '#e9d36a'; c.lineWidth = 0.9; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
      return true;
    };
    if (N && !ramp(i - n, true)) {
      const lf = Wt || (E(x - 1, y) === e && NW), rf = E(x + 1, y) === e;
      fill([[0, 0, 1], [1, 0, 1], rf ? [1, s, 0] : [1, 0, 0], lf ? [0, s, 0] : [0, 0, 0]], colOf(x, y - 1, 0.97), [0.5, 0, 1], [0.5, s, 0]);
    }
    if (Wt && !ramp(i - 1, false)) {
      const tf = N || (E(x, y - 1) === e && NW), bf = E(x, y + 1) === e;
      fill([[0, 0, 1], [0, 1, 1], bf ? [s, 1, 0] : [0, 1, 0], tf ? [s, 0, 0] : [0, 0, 0]], colOf(x - 1, y, 0.8), [0, 0.5, 1], [s, 0.5, 0]);
    }
    if (!N && !Wt && NW && !rd) fill([[0, 0, 1], [s, 0, 0], [s * 0.72, s * 0.72, 0], [0, s, 0]], colOf(x - 1, y - 1, 0.88), [0, 0, 1], [s * 0.5, s * 0.5, 0]);
    if (e === 0) { // wet line where the beach meets the water
      c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1; c.beginPath();
      if (N) { const a = P(0, s, 0), b = P(1, s, 0); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      if (Wt) { const a = P(s, 0, 0), b = P(s, 1, 0); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      c.stroke();
    }
  }
  function sideCol(t, lit) { const b = t === 2 ? '#bfa772' : t === 3 ? '#7d7c70' : '#8a6d49'; return M.shade(b, lit ? 0.95 : 0.7); }
  function drawSides(c, W, x, y, sx, sy, e, t) {
    const n = W.n, i = y * n + x;
    let dl = e - (y < n - 1 ? W.elev[i + n] : -1.4), dr = e - (x < n - 1 ? W.elev[i + 1] : -1.4);
    if (dl === 1) dl = 0; if (dr === 1) dr = 0; // one-level steps become slopes (see drawBanks)
    if (dl > 0) { c.beginPath(); c.moveTo(sx - TW, sy + TH); c.lineTo(sx, sy + 2 * TH); c.lineTo(sx, sy + 2 * TH + dl * EL); c.lineTo(sx - TW, sy + TH + dl * EL); c.closePath(); c.fillStyle = e === 0 ? '#1d4f7a' : sideCol(t, true); c.fill(); c.strokeStyle = c.fillStyle; c.lineWidth = 0.6; c.stroke(); }
    if (dr > 0) { c.beginPath(); c.moveTo(sx + TW, sy + TH); c.lineTo(sx, sy + 2 * TH); c.lineTo(sx, sy + 2 * TH + dr * EL); c.lineTo(sx + TW, sy + TH + dr * EL); c.closePath(); c.fillStyle = e === 0 ? '#173f63' : sideCol(t, false); c.fill(); c.strokeStyle = c.fillStyle; c.lineWidth = 0.6; c.stroke(); }
  }
  // smoothed water depth (5×5 average, land counts as 0) so deep water fades gradually instead of in blocks
  function avgDepth(W, x, y) { const n = W.n; let s = 0, k = 0; for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) { s += 4; k++; continue; } const j = yy * n + xx; s += W.elev[j] ? 0 : Math.min(5, W.wdepth[j]); k++; } return s / k; }
  function drawWater(c, W, x, y, sx, sy) {
    const n = W.n, i = y * n + x, d = W.wdepth[i], ad = avgDepth(W, x, y), dv = M.clamp((ad - 0.6) / 3.2 + (M.fbm(x * 0.15, y * 0.15, seed + 8, 2) - 0.5) * 0.35, 0, 1), col = M.mix('#55b7e2', '#1c5b91', dv);
    dia(c, sx, sy); c.fillStyle = col; c.fill(); c.strokeStyle = col; c.lineWidth = 0.8; c.stroke();
    if (d <= 1) { dia(c, sx, sy); c.fillStyle = 'rgba(120,220,210,0.18)'; c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1.2; c.beginPath();
    if (y < n - 1 && W.elev[i + n]) { c.moveTo(sx - TW + 3, sy + TH + 1); c.lineTo(sx, sy + 2 * TH - 1); }
    if (x < n - 1 && W.elev[i + 1]) { c.moveTo(sx + TW - 3, sy + TH + 1); c.lineTo(sx, sy + 2 * TH - 1); }
    c.stroke();
    const rt = W.road[i];
    if (rt) { // bridge deck
      const by = sy - EL;
      c.fillStyle = '#7d8186'; c.fillRect(sx - TW + 4, by + TH, 3, EL + 2); c.fillRect(sx + TW - 7, by + TH, 3, EL + 2); c.fillRect(sx - 1.5, by + 2 * TH - 1, 3, EL + 2);
      c.beginPath(); c.moveTo(sx - TW, by + TH); c.lineTo(sx, by + 2 * TH); c.lineTo(sx, by + 2 * TH + 4); c.lineTo(sx - TW, by + TH + 4); c.closePath(); c.fillStyle = '#a4a7ab'; c.fill();
      c.beginPath(); c.moveTo(sx + TW, by + TH); c.lineTo(sx, by + 2 * TH); c.lineTo(sx, by + 2 * TH + 4); c.lineTo(sx + TW, by + TH + 4); c.closePath(); c.fillStyle = '#84878b'; c.fill();
      S.drawRoad(c, sx, by, rt, M.Roads.mask(W, x, y), { dir: W.rdir[i], bridge: true });
    }
  }
  function renderChunk(ent, cx, cy, lod) {
    const W = M.world, s = [0.5, 1, 2][lod], w = 2 * CH * TW, h = 2 * CH * TH + 62;
    if (!ent.c) ent.c = S.mk(w * s, h * s);
    const c = ent.c.getContext('2d'); c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, w, h);
    const ox = CH * TW, oy = 44, n = W.n;
    for (let ly = 0; ly < CH; ly++) for (let lx = 0; lx < CH; lx++) {
      const x = cx * CH + lx, y = cy * CH + ly; if (x >= n || y >= n) continue;
      const i = y * n + x, e = W.elev[i], sx = ox + (lx - ly) * TW, sy = oy + (lx + ly) * TH - e * EL;
      drawSides(c, W, x, y, sx, sy, e, W.terr[i]);
      if (e === 0) drawWater(c, W, x, y, sx, sy); else drawTop(c, W, x, y, sx, sy);
      drawBanks(c, W, x, y, sx, sy, e);
    }
    ent.ver = chunkVer[cy * cw + cx];
  }

  // ---------------- overlays ----------------
  function overlayBucket(W, city, ov, i) {
    switch (ov) {
      case 'traffic': { const t = W.road[i]; if (!t || !M.ROADS[t].cap) return -1; return Math.min(7, (W.traffic[i] / M.ROADS[t].cap * 5.5) | 0); }
      case 'air': return W.elev[i] ? Math.min(7, (W.air[i] / 6) | 0) : -1;
      case 'noise': return W.elev[i] ? Math.min(7, (W.noise[i] / 6) | 0) : -1;
      case 'gnd': return W.elev[i] ? Math.min(7, (W.gnd[i] / 5) | 0) : -1;
      case 'lv': return W.elev[i] ? Math.min(7, (W.lv[i] / 12.5) | 0) : -1;
      case 'crime': return W.elev[i] ? Math.min(7, (W.crime[i] / 5) | 0) : -1;
      case 'power': return W.elev[i] ? (W.power[i] === 1 ? 6 : W.power[i] === 2 ? 2 : -1) : -1;
      case 'water': return W.elev[i] ? (W.water[i] === 1 ? 6 : W.water[i] === 2 ? 2 : -1) : -1;
      case 'fire': case 'police': case 'health': case 'edu': case 'edu2': case 'park': case 'bus': { if (!W.elev[i]) return -1; const v = W[ov][i]; return v < 0.03 ? -1 : Math.min(7, (v * 8) | 0); }
      case 'happy': { const id = W.bld[i]; if (!id) return -1; const b = W.blds[id - 1]; if (!b || b.z !== 1 || b.ab) return -1; return Math.min(7, (b.happy * 8) | 0); }
      case 'district': return W.district[i] ? W.district[i] - 1 : -1;
      case 'zones': return W.zone[i] ? W.zone[i] - 1 : -1;
    }
    return -1;
  }
  function overlayRamp(ov) { return ov === 'lv' ? RAMP_BLUE : ov === 'traffic' || ov === 'air' || ov === 'noise' || ov === 'gnd' || ov === 'crime' ? RAMP_BAD : ov === 'district' ? DCOL.slice(1) : ov === 'zones' ? M.ZCOL.slice(1) : RAMP_GOOD; }
  Rn.overlayRamp = overlayRamp;

  // ---------------- items ----------------
  function item(k, t) { const it = pool[nItems] || (pool[nItems] = {}); nItems++; it.k = k; it.t = t; it.b = null; return it; }
  function nightFactor(tod) { return tod < 0.5 ? 1 - M.smooth(0.2, 0.3, tod) : M.smooth(0.7, 0.8, tod); }
  function spawnSmoke(x, y, k) {
    if (parts.length > 500) return;
    parts.push({ x: x, y: y, vx: 4 + M.rand() * 5, vy: -(10 + M.rand() * 8), life: 0, max: k === 2 ? 4.5 : 3 + M.rand(), r: k === 2 ? 5 : 2.5, k: k });
  }
  function drawSprite(sp, dx, dy, x0, w, yc, nf, lit) {
    const h = sp.h - yc, r = sp.r, sx = x0 * r, sy = yc * r, sw = Math.min(w * r, sp.c.width - sx), sh = Math.min(h * r, sp.c.height - sy); if (sw <= 0 || sh <= 0) return;
    const ga = g.globalAlpha;
    if (nf < 0.02) g.drawImage(sp.c, sx, sy, sw, sh, dx + x0, dy + yc, sw / r, sh / r);
    else if (nf > 0.98) g.drawImage(S.night(sp, lit), sx, sy, sw, sh, dx + x0, dy + yc, sw / r, sh / r);
    else { const bc = S.blend(sp, lit, Math.round(nf * 16)); if (bc) g.drawImage(bc, sx, sy, sw, sh, dx + x0, dy + yc, sw / r, sh / r);
      else { g.drawImage(sp.c, sx, sy, sw, sh, dx + x0, dy + yc, sw / r, sh / r); g.globalAlpha = ga * nf; g.drawImage(S.night(sp, lit), sx, sy, sw, sh, dx + x0, dy + yc, sw / r, sh / r); g.globalAlpha = ga; } }
  }
  function drawBuildingPart(it, nf, adt) {
    const b = it.b, sp = it.sp, lit = b.pw !== false && (b.z ? !b.ab : b.on !== false), first = it.first;
    if (b.built < 1) {
      const site = S.site(b.s);
      if (!b.reno) drawSprite(site, it.sx + site.ox - site.ox, it.sy - site.oy, it.x0, it.w, 0, nf > 0.5 ? 1 : 0, false);
      const base = b.s * 2 * TH, yc = Math.max(0, Math.floor((sp.h - base * 0.5) * (1 - b.built)));
      if (b.reno) { g.globalAlpha = 0.55; drawSprite(sp, it.sx, it.sy - sp.oy, it.x0, it.w, 0, nf, lit); g.globalAlpha = 1; }
      drawSprite(sp, it.sx, it.sy - sp.oy, it.x0, it.w, yc, nf, lit);
      if (first && Cam.zoom > 0.5) { const cr = S.crane(); S.blit(g, cr, nf > 0.5 ? S.night(cr, false) : cr.c, it.ax - cr.ox, it.ay - cr.oy + (b.s - 1) * TH); }
      return;
    }
    drawSprite(sp, it.sx, it.sy - sp.oy, it.x0, it.w, 0, nf, lit);
    if (!first) return;
    const bx = it.sx, by = it.sy - sp.oy;
    if (nf > 0.2 && sp.lights && sp.lights.length && (lit || b.t === 'park' || b.t === 'bigpark' || b.t === 'plaza')) {
      const la = Math.min(1, (nf - 0.2) * 1.6); g.globalCompositeOperation = 'lighter';
      for (const l of sp.lights) {
        let s = l.k === 'flood' ? 70 : l.k === 'red' ? 12 : l.k === 'cyan' ? 30 : 26; s *= l.r; let a = la;
        if (l.k === 'red') { a *= ((Rn.time + b.id * 0.37) % 1.6) < 0.8 ? 1 : 0.15; }
        g.globalAlpha = a * (l.k === 'flood' ? 0.6 : 0.9); g.drawImage(glowOf(l.k), bx + l.x - s / 2, by + l.y - s / 2, s, s);
        if (l.k === 'flood' || (l.k === 'lamp' && l.r >= 1)) { g.globalAlpha = a * 0.35; g.drawImage(glowOf(l.k === 'flood' ? 'flood' : 'pool'), bx + l.x - s * 1.4, by + l.y - s * 0.2, s * 2.8, s * 1.4); }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    // now and then a window goes on or off: each of a few windows per building reconsiders every 3–10 minutes
    if (nf > 0.25 && lit && sp.wins.length && Cam.zoom > 0.5) {
      const tw = S.twinkle(sp), nt = tw.length;
      if (nt) {
        const la = Math.min(1, (nf - 0.25) * 1.6), n = Math.min(nt, 2 + b.s * 2), ga = g.globalAlpha, T0 = Rn.time, WC = S.WINCOL;
        for (let q = 0; q < n; q++) {
          const per = 180 + ((b.id * 13 + q * 37) % 420), tt = (T0 + b.id * 23.7 + q * 61.3) / per, fl = Math.floor(tt), cur = M.hash(b.id, q, fl) < 0.5 ? 1 : 0, prev = M.hash(b.id, q, fl - 1) < 0.5 ? 1 : 0;
          const al = prev + (cur - prev) * Math.min(1, (tt - fl) * per / 0.8); if (al < 0.02) continue;
          const p = sp.wins[tw[(b.id * 5 + q * 3) % nt]]; g.globalAlpha = ga * la * al * 0.92; g.fillStyle = WC[(b.id + q * 3) % 6];
          g.beginPath(); g.moveTo(bx + p[0][0], by + p[0][1]); g.lineTo(bx + p[1][0], by + p[1][1]); g.lineTo(bx + p[2][0], by + p[2][1]); g.lineTo(bx + p[3][0], by + p[3][1]); g.closePath(); g.fill();
        }
        g.globalAlpha = ga;
      }
    }
    if (sp.anim) {
      const an = sp.anim, x = bx + an.x, y = by + an.y;
      if (an.t === 'rotor') {
        const spin = (b.on === false || b.stormOff > 0) ? 0.3 : Rn.time * (1.2 + M.city.weather.wind * 3) + b.id;
        g.strokeStyle = nf > 0.5 ? '#8f98a8' : '#f4f6f7'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath();
        for (let k = 0; k < 3; k++) { const a = spin + k * 2.094; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * an.r * 0.55, y + Math.sin(a) * an.r); }
        g.stroke(); g.lineCap = 'butt'; g.fillStyle = '#d0d4d8'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
      } else if (an.t === 'fountain' && Cam.zoom > 0.5) {
        g.fillStyle = 'rgba(200,235,255,0.85)';
        for (let k = 0; k < (an.big ? 14 : 8); k++) { const ph = (Rn.time * 0.9 + k * 0.137) % 1, a = k * 2.4, r = ph * (an.big ? 9 : 6); g.fillRect(x + Math.cos(a) * r, y - Math.sin(ph * Math.PI) * (an.big ? 11 : 7) + Math.sin(a) * r * 0.5, 1.3, 1.3); }
      } else if (an.t === 'beacon') { if ((Rn.time % 1.6) < 0.8) { g.globalCompositeOperation = 'lighter'; g.drawImage(glow, x - 14, y - 14, 28, 28); g.globalCompositeOperation = 'source-over'; } }
    }
    if (sp.smoke.length && adt > 0 && Cam.zoom > 0.4 && b.on !== false && !b.ab) for (const s of sp.smoke) { if (M.rand() < (s.k === 2 ? 5 : 3) * adt) spawnSmoke(bx + s.x, by + s.y, s.k); }
    const cxp = it.ax, cyp = it.ay + b.s * TH;
    if (b.fire) {
      if (adt > 0 && M.rand() < 6 * adt) spawnSmoke(cxp + (M.rand() - 0.5) * 20 * b.s, cyp - 14, 1);
      for (let k = 0; k < 4 * b.s; k++) {
        const fx = cxp + (M.hash(b.id, k, 1) - 0.5) * 34 * b.s, fy = cyp - 4 - M.hash(b.id, k, 2) * 16 * b.s, fl = 7 + Math.sin(Rn.time * 11 + k * 1.7) * 3 + M.hash(b.id, k, 3) * 6;
        g.fillStyle = k % 2 ? '#ffb02e' : '#ff5a1f'; g.beginPath(); g.moveTo(fx - 4, fy); g.quadraticCurveTo(fx - 1, fy - fl * 0.6, fx + Math.sin(Rn.time * 7 + k) * 2, fy - fl); g.quadraticCurveTo(fx + 2, fy - fl * 0.5, fx + 4, fy); g.closePath(); g.fill();
      }
      if (nf > 0.2) { g.globalCompositeOperation = 'lighter'; g.drawImage(glow, cxp - 40, cyp - 50, 80, 80); g.globalCompositeOperation = 'source-over'; }
    }
    if (Cam.zoom > 0.55 && !Rn.hideIcons) {
      let ic = 0;
      if (b.fire) ic = 0; else if (b.dmg) ic = 5; else if (b.z && b.ab) ic = 0; else if (b.rd === -1 && b.rv && (b.z || M.needsRoad(M.DEFS[b.t]))) ic = 3; else if (b.pw === false) ic = 1; else if (b.wt === false && (b.z ? b.lvl >= 1 : true)) ic = 2; else if (!b.z && b.noNet && M.DEFS[b.t].water) ic = 3; else if (b.t === 'busstop' && b.busOK === false) ic = 4;
      if (ic) icons.push(cxp, cyp - 30 - Math.min(40, sp.h * 0.25), ic);
    }
    if (!b.z && b.up > 1 && Cam.zoom > 0.7) { g.fillStyle = '#ffd54a'; for (let k = 1; k < b.up; k++) { g.beginPath(); g.arc(cxp - 4 + k * 6 - 6, cyp + TH * b.s - 6, 2.2, 0, 7); g.fill(); } }
  }
  function addBuilding(W, b, e) {
    const sp = S.of(b); if (!sp) return;
    if (sp.top > 14 && b.t !== 'rubble') { shadowB.push(b, e, sp.top * (b.built < 1 ? b.built : 1)); }
    const s = b.s, wx = (b.x - b.y) * TW, wy = (b.x + b.y) * TH - e * EL, dx = wx - sp.ox;
    if (s === 1) { const it = item(b.x + b.y + 1, 3); it.b = b; it.sp = sp; it.sx = dx; it.sy = wy; it.x0 = 0; it.w = sp.w; it.first = true; it.ax = wx; it.ay = wy; return; }
    for (let i = 0; i < s; i++) {
      const corner = i === s - 1, x0 = Math.max(0, sp.ox + (i - s) * TW - (i === 0 ? 2 : 1)), x1 = Math.min(sp.w, sp.ox + (i - s + (corner ? 2 : 1)) * TW + (corner && s === 1 ? 2 : 1));
      const it = item(b.x + i + b.y + s - 1 + 1, 3); it.b = b; it.sp = sp; it.sx = dx; it.sy = wy; it.x0 = x0; it.w = x1 - x0; it.first = corner; it.ax = wx; it.ay = wy;
    }
    for (let j = 0; j < s - 1; j++) {
      const x0 = sp.ox + (s - 1 - j) * TW - 1, x1 = Math.min(sp.w, sp.ox + (s - j) * TW + (j === 0 ? 2 : 1));
      const it = item(b.x + s - 1 + b.y + j + 1, 3); it.b = b; it.sp = sp; it.sx = dx; it.sy = wy; it.x0 = x0; it.w = x1 - x0; it.first = false; it.ax = wx; it.ay = wy;
    }
  }
  function roadLamp(W, x, y, i, e, nf, z) {
    const rt = W.road[i]; if (rt === 1 || rt === 7 || ((x + y) & 1)) return;
    const m = M.Roads.mask(W, x, y), h = (m & 10) && !(m & 5), v = (m & 5) && !(m & 10); if (!h && !v) return;
    const half = rt === 6 || rt === 4 ? 0.0 : 0.06, px = h ? x + 0.5 : x + half, py = h ? y + half : y + 0.5, ax = h ? 0 : 1, ay = h ? 1 : 0, on = W.power[i] === 1;
    if (z > 0.55) { const it = item(px + py + 0.05, 7); it.px = px; it.py = py; it.ax = ax; it.ay = ay; it.e = e; it.on = on; }
    if (on && nf > 0.2) { const p = Cam.tileToWorld(px + ax * 0.3, py + ay * 0.3, e); lamps.push(p[0], p[1]); }
  }
  function diaPath(x, y, e) { const sx = (x - y) * TW, sy = (x + y) * TH - e * EL; g.moveTo(sx, sy); g.lineTo(sx + TW, sy + TH); g.lineTo(sx, sy + 2 * TH); g.lineTo(sx - TW, sy + TH); g.closePath(); }
  function rectPath(x0, y0, x1, y1, e) { const a = Cam.tileToWorld(x0, y0, e), b = Cam.tileToWorld(x1, y0, e), c = Cam.tileToWorld(x1, y1, e), d = Cam.tileToWorld(x0, y1, e); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }

  // ---------------- frame ----------------
  Rn.draw = function (dt, adt) {
    const W = M.world, city = M.city; if (!W || !cv) return;
    Rn.frame++; Rn.time += dt; const tA = performance.now(); S.blendBudget = 14; S.genMs = 0; S.tick = Rn.frame; if (Rn.frame % 150 === 0) S.trim();
    const n = W.n, z = Cam.zoom, cw2 = Cam.w, ch2 = Cam.h, T = M.Traffic;
    const nf = M.settings.daynight ? nightFactor(city.tod) : 0, dark = nf * 0.6, NT = S.NIGHT, nightMul = 'rgb(' + Math.round(255 - nf * (255 - NT[0])) + ',' + Math.round(255 - nf * (255 - NT[1])) + ',' + Math.round(255 - nf * (255 - NT[2])) + ')'; Rn.night = nf; if ((nf < 0.02 || nf > 0.98) && Rn.frame % 60 === 0) S.dropBlends();
    let shx = 0, shy = 0; if (Cam.shake > 0) { shx = (M.rand() - 0.5) * 10 * Cam.shake; shy = (M.rand() - 0.5) * 8 * Cam.shake; }
    // snap the camera to whole device pixels so the cached ground can be scrolled without blurring
    const zd = z * dpr, camX = Math.round(Cam.x * zd) / zd, camY = Math.round(Cam.y * zd) / zd;
    const vx0 = camX - cw2 / 2 / z, vx1 = camX + cw2 / 2 / z, vy0 = camY - ch2 / 2 / z, vy1 = camY + ch2 / 2 / z;
    const world = function (c) { c.setTransform(zd, 0, 0, zd, dpr * (cw2 / 2 + shx) - camX * zd, dpr * (ch2 / 2 + shy) - camY * zd); };
    // ---- ground: terrain chunks + night tint, kept in a screen-sized layer. When the camera pans, the layer is
    // shifted and only the newly exposed strips are painted, instead of recompositing every chunk each frame.
    const L = W.limit, nStep = Math.round(nf * 24), gk = z.toFixed(4) + ',' + cv.width + ',' + cv.height + ',' + groundVer + ',' + nStep + ',' + L.x0 + ',' + L.y0 + ',' + L.x1 + ',' + L.y1 + ',' + M.mode;
    if (!gcv || gcv.width !== cv.width || gcv.height !== cv.height) { gcv = S.mk(cv.width, cv.height); gctx = gcv.getContext('2d', { alpha: false }); gcv2 = S.mk(cv.width, cv.height); gctx2 = gcv2.getContext('2d', { alpha: false }); gValid = false; }
    const paintGround = function (c, rects) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      if (rects) { c.beginPath(); for (const r of rects) c.rect(r[0], r[1], r[2], r[3]); c.clip(); }
      const sky = c.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, nf > 0.5 ? '#0b1220' : '#1c2c3c'); sky.addColorStop(1, nf > 0.5 ? '#111a2a' : '#2a3d4e'); c.fillStyle = sky; c.fillRect(0, 0, cv.width, cv.height);
      world(c); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
      const lod = z < 0.55 ? 0 : (z * dpr >= 1.45 && M.settings.quality === 'high' ? 2 : 1), cwid = 2 * CH * TW, chei = 2 * CH * TH + 62; let built = 0, drawn = 0, complete = true;
      for (let s = 0; s <= 2 * (cw - 1); s++) for (let cx = Math.max(0, s - cw + 1); cx <= Math.min(cw - 1, s); cx++) {
        const cy = s - cx, wx0 = (cx - cy) * CH * TW - CH * TW, wy0 = (cx + cy) * CH * TH - 44;
        if (wx0 > vx1 || wx0 + cwid < vx0 || wy0 > vy1 || wy0 + chei < vy0) continue;
        const key = (cy * cw + cx) * 3 + lod; let ent = chunks.get(key);
        if (!ent) { if (built >= 5) { complete = false; continue; } ent = { c: null, ver: 0, used: 0 }; chunks.set(key, ent); }
        if (ent.ver !== chunkVer[cy * cw + cx]) { if (built < 5) { renderChunk(ent, cx, cy, lod); built++; } else complete = false; }
        if (!ent.c) { complete = false; continue; }
        ent.used = Rn.frame; c.drawImage(ent.c, wx0, wy0, cwid, chei); drawn++;
      }
      Rn.stats.chunks = drawn;
      if (chunks.size > [120, 56, 24][lod] && Rn.frame % 30 === 0) { for (const [k, e] of chunks) if (Rn.frame - e.used > 90) { chunks.delete(k); } }
      if (M.mode === 'game' && (L.x0 > 0 || L.y0 > 0 || L.x1 < n - 1 || L.y1 < n - 1)) {
        const rp = function (x0, y0, x1, y1) { const p0 = Cam.tileToWorld(x0, y0, 1), p1 = Cam.tileToWorld(x1, y0, 1), p2 = Cam.tileToWorld(x1, y1, 1), p3 = Cam.tileToWorld(x0, y1, 1); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.closePath(); };
        c.fillStyle = 'rgba(8,14,24,0.34)'; c.beginPath(); rp(0, 0, n, L.y0); rp(0, L.y1 + 1, n, n); rp(0, L.y0, L.x0, L.y1 + 1); rp(L.x1 + 1, L.y0, n, L.y1 + 1); c.fill();
        c.beginPath(); rp(L.x0, L.y0, L.x1 + 1, L.y1 + 1); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5 / z; c.setLineDash([8 / z, 6 / z]); c.stroke(); c.setLineDash([]);
      }
      if (nStep > 0) { const q = nStep / 24; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgb(' + Math.round(255 - q * (255 - NT[0])) + ',' + Math.round(255 - q * (255 - NT[1])) + ',' + Math.round(255 - q * (255 - NT[2])) + ')'; c.fillRect(0, 0, cv.width, cv.height); c.globalCompositeOperation = 'source-over'; }
      c.restore(); return complete;
    };
    const shaking = Cam.shake > 0, same = gValid && gk === gKey && !shaking;
    const dxp = same ? Math.round((gsx - camX) * zd) : 0, dyp = same ? Math.round((gsy - camY) * zd) : 0;
    if (same && !dxp && !dyp) { /* unchanged */ }
    else if (same && Math.abs(dxp) < cv.width * 0.7 && Math.abs(dyp) < cv.height * 0.7) {
      gctx2.setTransform(1, 0, 0, 1, 0, 0); gctx2.drawImage(gcv, dxp, dyp);
      let t = gcv; gcv = gcv2; gcv2 = t; t = gctx; gctx = gctx2; gctx2 = t;
      const R = [], Wd = cv.width, Hd = cv.height;
      if (dxp > 0) R.push([0, 0, dxp, Hd]); else if (dxp < 0) R.push([Wd + dxp, 0, -dxp, Hd]);
      if (dyp > 0) R.push([0, 0, Wd, dyp]); else if (dyp < 0) R.push([0, Hd + dyp, Wd, -dyp]);
      gValid = paintGround(gctx, R); gsx = camX; gsy = camY;
    } else { gValid = paintGround(gctx, null) && !shaking; gKey = gk; gsx = camX; gsy = camY; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(gcv, 0, 0);
    world(g); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';

    const tB = performance.now();
    // ---- visible tile scan ----
    nItems = 0; icons.length = 0; lamps.length = 0; shadowB.length = 0; foam.length = 0;
    const a0 = Math.floor(vx0 / TW) - 2, a1 = Math.ceil(vx1 / TW) + 2, b0 = Math.floor(vy0 / TH) - 3, b1 = Math.ceil((vy1 + 380) / TH) + 2;
    const ov = M.mode === 'game' ? Rn.overlay : null, buckets = ov ? [[], [], [], [], [], [], [], []] : null;
    const smallDeco = z > 0.42, fr = Rn.frame, time = Rn.time, glint = M.settings.quality !== 'low';
    g.beginPath(); let glints = 0;
    for (let b = Math.max(0, b0); b <= b1; b++) for (let a = a0 + ((a0 + b) & 1); a <= a1; a += 2) {
      const x = (a + b) >> 1, y = (b - a) >> 1; if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const i = y * n + x, e = W.elev[i];
      if (e === 0) {
        if (z > 0.45 && !W.road[i] && W.wdepth[i] <= 1) foam.push(x, y);
        if (glint && !W.road[i]) { const ph = Math.sin(time * 1.3 + x * 0.9 + y * 1.7 + M.hash(x, y, 4) * 6); if (ph > 0.55) { const sx = (x - y) * TW + (M.hash(x, y, 5) - 0.5) * 24, sy = (x + y) * TH + TH + (M.hash(x, y, 6) - 0.5) * 10, l = (ph - 0.55) * 14; g.moveTo(sx - l, sy); g.lineTo(sx + l, sy); glints++; } }
        else if (W.road[i]) roadLamp(W, x, y, i, 1, nf, z);
        if (ov) { const bk = overlayBucket(W, city, ov, i); if (bk >= 0) buckets[bk].push(i); }
        continue;
      }
      if (ov) { const bk = overlayBucket(W, city, ov, i); if (bk >= 0) buckets[bk].push(i); }
      if (W.occl[i]) { const it = item(x + y + 0.5, 2); it.x = x; it.y = y; it.e = e; }
      const dc = W.deco[i];
      if (dc && (smallDeco || dc === 1 || dc === 2 || dc === 6)) { const sp = S.deco(dc, (M.hash(x, y, 9) * 3) | 0), it = item(x + y + 1, 0); it.c = sp.c; it.w = sp.w; it.h = sp.h; it.n = nf > 0.02 ? S.night(sp, false) : null; it.x = (x - y) * TW - sp.ox + (M.hash(x, y, 12) - 0.5) * 8; it.y = (x + y) * TH - e * EL - sp.oy; }
      if (W.pline[i]) { const sp = S.pylon(), it = item(x + y + 1, 0); it.c = sp.c; it.w = sp.w; it.h = sp.h; it.n = nf > 0.02 ? S.night(sp, false) : null; it.x = (x - y) * TW - sp.ox; it.y = (x + y) * TH - e * EL - sp.oy; }
      const id = W.bld[i];
      if (id) { const bd = W.blds[id - 1]; if (bd && bd.fr !== fr) { bd.fr = fr; addBuilding(W, bd, e); } }
      const rt = W.road[i];
      if (rt) {
        roadLamp(W, x, y, i, e, nf, z);
        if (z > 0.6 && M.ROADS[rt].lights && M.Roads.driveCount(W, i) >= 3) { const it = item(x + y + 1.3, 5); it.x = (x - y) * TW; it.y = (x + y) * TH - e * EL; it.i = i; }
      }
    }
    if (glints) { g.strokeStyle = nf > 0.5 ? 'rgba(160,190,230,0.22)' : 'rgba(255,255,255,0.38)'; g.lineWidth = 1; g.stroke(); }
    // animated surf along the shore
    if (foam.length) {
      g.beginPath();
      for (let q = 0; q < foam.length; q += 2) {
        const x = foam[q], y = foam[q + 1], i = y * n + x, sx = (x - y) * TW, sy = (x + y) * TH, ph = 0.1 + 0.08 * Math.sin(time * 1.6 + x * 0.7 + y * 0.9), pb = 0.46 + ph * 0.6;
        const tp = function (u, v) { return [sx + (u - v) * TW, sy + (u + v) * TH]; };
        if (y > 0 && W.elev[i - n]) { const a = tp(0.06, pb), b = tp(0.94, pb); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        if (x > 0 && W.elev[i - 1]) { const a = tp(pb, 0.06), b = tp(pb, 0.94); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        if (y < n - 1 && W.elev[i + n]) { g.moveTo(sx - TW + TW * ph, sy + TH - TH * ph); g.lineTo(sx - TW * ph * 2, sy + 2 * TH - TH * ph * 2); }
        if (x < n - 1 && W.elev[i + 1]) { g.moveTo(sx + TW - TW * ph, sy + TH - TH * ph); g.lineTo(sx + TW * ph * 2, sy + 2 * TH - TH * ph * 2); }
      }
      g.strokeStyle = 'rgba(255,255,255,' + (0.22 * (1 - nf * 0.6)).toFixed(3) + ')'; g.lineWidth = 1.6; g.lineCap = 'round'; g.stroke(); g.lineCap = 'butt';
    }
    // building shadows: sun from the south-west, longer in the morning and evening
    if (shadowB.length && M.settings.quality !== 'low' && nf < 0.95) {
      const tod = city.tod, sun = Math.max(0.12, Math.sin(Math.PI * M.clamp((tod - 0.2) / 0.6, 0, 1))), len = 0.028 / (0.35 + sun * 0.65), ux = 0.62, uy = -0.78;
      g.beginPath();
      for (let q = 0; q < shadowB.length; q += 3) {
        const b = shadowB[q], e = shadowB[q + 1], L = shadowB[q + 2] * len, s = b.s, in0 = 0.1 * s, x0 = b.x + in0, y0 = b.y + in0, x1 = b.x + s - in0, y1 = b.y + s - in0;
        const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], pts = [];
        for (const p of P) { pts.push(Cam.tileToWorld(p[0], p[1], e)); pts.push(Cam.tileToWorld(p[0] + ux * L, p[1] + uy * L, e)); }
        const h = hull(pts); g.moveTo(h[0][0], h[0][1]); for (let k = 1; k < h.length; k++) g.lineTo(h[k][0], h[k][1]); g.closePath();
      }
      g.fillStyle = 'rgba(16,28,40,' + (0.36 * (1 - nf) * (1 - (city.weather.cloudI || 0) * 0.6)).toFixed(3) + ')'; g.fill();
    }
    // ---- overlays (under objects) ----
    if (ov) {
      const ramp = overlayRamp(ov); g.globalAlpha = ov === 'district' || ov === 'zones' ? 0.5 : 0.62;
      for (let k = 0; k < 8; k++) { const arr = buckets[k]; if (!arr.length || !ramp[k]) continue; g.beginPath(); for (let q = 0; q < arr.length; q++) { const i = arr[q]; diaPath(i % n, (i / n) | 0, W.eh(i)); } g.fillStyle = ramp[k]; g.fill(); }
      g.globalAlpha = 1;
    }
    // ---- street lights ----
    if (lamps.length) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, (nf - 0.2) * 1.5) * 0.8; const pl = glowOf('pool'), pw = TW * 2.4, ph = TH * 2.4; for (let q = 0; q < lamps.length; q += 2) g.drawImage(pl, lamps[q] - pw / 2, lamps[q + 1] - ph / 2, pw, ph); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    // ---- agents ----
    Rn.view.cx = (Cam.x / TW + Cam.y / TH) / 2; Rn.view.cy = (Cam.y / TH - Cam.x / TW) / 2; Rn.view.r = Math.min(46, Math.max(10, cw2 / z / TW / 2 + 4)); Rn.view.night = nf;
    if (z > 0.38) {
      const cars = T.cars;
      for (let q = 0; q < cars.length; q++) {
        const c = cars[q], wx = (c.x - c.y) * TW, wy = (c.x + c.y) * TH - c.e * EL; if (wx < vx0 - 40 || wx > vx1 + 40 || wy < vy0 - 40 || wy > vy1 + 40) continue;
        const sp = S.vehicleH(c.type, c.h, c.type === 'car' ? c.col : c.col % 3), it = item(c.x + c.y + 0.02, 6); it.w = sp.w; it.h = sp.h; it.a = c.a;
        it.c = nf > 0.6 ? S.night(sp, false) : sp.c; it.x = wx - sp.ox; it.y = wy - sp.oy - TH; it.wx = wx; it.wy = wy; it.d = c.d; it.car = c;
      }
      if (z > 0.6) { const peds = T.peds; for (let q = 0; q < peds.length; q++) { const p = peds[q], wx = (p.x - p.y) * TW, wy = (p.x + p.y) * TH - p.e * EL; if (wx < vx0 || wx > vx1 || wy < vy0 || wy > vy1) continue; const it = item(p.x + p.y + 0.01, 4); it.x = wx; it.y = wy; it.col = p.col; it.ph = p.ph; } }
    }
    const tC = performance.now();
    // ---- sort & draw ----
    list.length = nItems; for (let q = 0; q < nItems; q++) list[q] = pool[q];
    list.sort(function (p, q) { return p.k - q.k; });
    Rn.stats.items = nItems;
    if (ov) g.globalAlpha = 0.38;
    const PED = ['#d94f4f', '#4f7fd9', '#e8d06a', '#5fae5f', '#e8e6e0', '#9a6ad0'], nightTile = dark > 0.01 ? nightMul : null;
    for (let q = 0; q < nItems; q++) {
      const it = list[q];
      switch (it.t) {
        case 0: if (!it.n) g.drawImage(it.c, it.x, it.y, it.w, it.h); else if (nf > 0.98) g.drawImage(it.n, it.x, it.y, it.w, it.h); else { const ga = g.globalAlpha; g.drawImage(it.c, it.x, it.y, it.w, it.h); g.globalAlpha = ga * nf; g.drawImage(it.n, it.x, it.y, it.w, it.h); g.globalAlpha = ga; } break;
        case 2: { const sx = (it.x - it.y) * TW, sy = (it.x + it.y) * TH - it.e * EL; const ga = g.globalAlpha; g.globalAlpha = 1; drawTop(g, W, it.x, it.y, sx, sy); if (nightTile) { dia(g, sx, sy); g.globalCompositeOperation = 'multiply'; g.fillStyle = nightTile; g.fill(); g.globalCompositeOperation = 'source-over'; } g.globalAlpha = ga; break; }
        case 3: drawBuildingPart(it, nf, adt); break;
        case 4: { const bob = Math.sin(time * 9 + it.ph) > 0 ? 1 : 0; g.fillStyle = nf > 0.5 ? '#3a4458' : PED[it.col]; g.fillRect(it.x - 1, it.y - 5 - bob, 2, 4); g.fillStyle = nf > 0.5 ? '#59627a' : '#f0c8a0'; g.fillRect(it.x - 1, it.y - 7 - bob, 2, 2); break; }
        case 5: { const ns = M.Roads.greenNS(it.i, T.time); g.fillStyle = '#3a3d42'; g.fillRect(it.x - 0.5, it.y + 2, 1.2, 9); g.fillRect(it.x + TW - 9.5, it.y + TH - 7, 1.2, 9); g.fillStyle = ns ? '#3ddc5a' : '#ff4a3a'; g.fillRect(it.x - 1.5, it.y, 3, 3); g.fillStyle = ns ? '#ff4a3a' : '#3ddc5a'; g.fillRect(it.x + TW - 10.5, it.y + TH - 9, 3, 3); break; }
        case 7: { // street lamp post
          const P0 = Cam.tileToWorld(it.px, it.py, it.e), P1 = Cam.tileToWorld(it.px + it.ax * 0.22, it.py + it.ay * 0.22, it.e), H = 17;
          g.strokeStyle = nf > 0.5 ? '#2a3140' : '#4a5058'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(P0[0], P0[1]); g.lineTo(P0[0], P0[1] - H); g.lineTo(P1[0], P1[1] - H); g.stroke();
          const lit = it.on && nf > 0.2; g.fillStyle = lit ? '#fff1c8' : '#9aa1a8'; g.fillRect(P1[0] - 1.6, P1[1] - H - 0.5, 3.2, 1.8);
          if (lit) { const ga = g.globalAlpha; g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * Math.min(1, (nf - 0.2) * 1.6); g.drawImage(glowOf('lamp'), P1[0] - 11, P1[1] - H - 11, 22, 22); g.globalAlpha = ga; g.globalCompositeOperation = 'source-over'; }
          break;
        }
        case 6: {
          const ga = g.globalAlpha; if (it.a < 1) g.globalAlpha = ga * Math.max(0, it.a); g.drawImage(it.c, it.x, it.y, it.w, it.h); g.globalAlpha = ga;
          if (it.a < 0.6) break;
          if (nf > 0.3) { // headlight beams in front, red tail lights behind
            const cc = it.car, qx = (cc.hx - cc.hy) * 2, qy = cc.hx + cc.hy, qm = Math.hypot(qx, qy) || 1, dx = qx / qm, dy = qy / qm, la = Math.min(1, (nf - 0.3) * 1.8) * Math.min(1, it.a), fx = it.wx + dx * 6, fy = it.wy + dy * 6 - 3;
            g.globalCompositeOperation = 'lighter'; g.save(); g.translate(fx, fy); g.rotate(Math.atan2(dy, dx)); g.globalAlpha = la * 0.7; g.drawImage(beamOf(), 0, -8, 30, 16); g.restore();
            g.globalAlpha = la; g.drawImage(glowOf('head'), fx - 4, fy - 4, 8, 8); g.drawImage(glowOf('tail'), it.wx - dx * 7 - 3, it.wy - dy * 7 - 6, 6, 6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          }
          const c = it.car; if ((c.type === 'fire' || c.type === 'police') && (time * 4 % 1) < 0.5) { g.fillStyle = c.type === 'fire' ? '#ff3a2a' : '#3a7bff'; g.fillRect(it.wx - 1.5, it.wy - 11, 3, 2.5); }
          break;
        }
      }
    }
    g.globalAlpha = 1;
    const tD = performance.now();
    // ---- particles ----
    if (parts.length) {
      let w = 0;
      for (let q = 0; q < parts.length; q++) {
        const p = parts[q]; p.life += adt; if (p.life >= p.max) continue;
        p.x += p.vx * adt * (0.5 + city.weather.wind); p.y += p.vy * adt; const t = p.life / p.max, al = (1 - t) * (p.k === 1 ? 0.5 : 0.4), r = p.r + t * (p.k === 2 ? 16 : 9);
        g.fillStyle = p.k === 1 ? 'rgba(60,56,52,' + al.toFixed(2) + ')' : p.k === 2 ? 'rgba(244,246,250,' + al.toFixed(2) + ')' : 'rgba(205,205,205,' + al.toFixed(2) + ')';
        g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); parts[w++] = p;
      }
      parts.length = w;
    }
    // ---- status icons ----
    if (icons.length && M.mode === 'game') {
      const bob = Math.sin(time * 3) * 2;
      const thin = icons.length > 120 ? 9 : icons.length > 60 ? 6 : 3; // when a whole district is affected, show a sample
      for (let q = 0; q < icons.length; q += thin) {
        const x = icons[q], y = icons[q + 1] + bob, k = icons[q + 2];
        g.fillStyle = 'rgba(20,26,36,0.85)'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.lineWidth = 1.4; g.strokeStyle = k === 1 ? '#ffd23a' : k === 2 ? '#4db8ff' : k === 5 ? '#ff8a3a' : '#ff5a4a'; g.stroke();
        g.fillStyle = g.strokeStyle;
        if (k === 1) { g.beginPath(); g.moveTo(x + 1.5, y - 5.5); g.lineTo(x - 3.5, y + 1); g.lineTo(x - 0.5, y + 1); g.lineTo(x - 1.5, y + 5.5); g.lineTo(x + 3.5, y - 1); g.lineTo(x + 0.5, y - 1); g.closePath(); g.fill(); }
        else if (k === 2) { g.beginPath(); g.moveTo(x, y - 5.5); g.quadraticCurveTo(x + 5, y + 1, x, y + 5); g.quadraticCurveTo(x - 5, y + 1, x, y - 5.5); g.fill(); }
        else if (k === 3) { g.fillRect(x - 4.5, y - 1.5, 9, 3); g.fillStyle = '#141a24'; g.fillRect(x - 3, y - 0.4, 2, 0.8); g.fillRect(x + 1, y - 0.4, 2, 0.8); }
        else if (k === 4) { g.fillRect(x - 4, y - 3.5, 8, 6); g.fillStyle = '#141a24'; g.fillRect(x - 3, y - 2.5, 6, 2.2); }
        else { g.fillRect(x - 1, y - 5, 2, 6.5); g.fillRect(x - 1, y + 3, 2, 2); }
      }
    }
    // ---- cloud shadows ----
    const w = city.weather, fx = M.settings.weather !== false, rainI = fx ? (w.rainI || 0) : 0, fogI = fx ? (w.fogI || 0) : 0, cloudI = fx ? (w.cloudI || 0) : 0;
    if (fx && cloudSp) {
      const cnt = Math.round(3 + cloudI * 9), span = n * TW * 2.8;
      g.globalAlpha = (0.45 + cloudI * 0.45) * (1 - nf * 0.6);
      for (let k = 0; k < cnt; k++) { const c = clouds[k]; c.x += dt * (5 + w.wind * 12); if (c.x > span / 2) c.x -= span; const cw = 256 * c.s * 2, ch = 128 * c.s * 2; if (c.x + cw < vx0 || c.x > vx1 || c.y + ch < vy0 || c.y > vy1) continue; g.drawImage(cloudSp, c.x, c.y, cw, ch); }
      g.globalAlpha = 1;
    }
    // ---- selection, hover, tool preview ----
    if (M.mode === 'game') drawToolLayer(W, z);
    // ---- screen-space weather ----
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // golden hour, then a cool blue night grade
    if (M.settings.daynight) {
      const tod = city.tod, warm = Math.max(0, 1 - Math.abs(tod - 0.715) / 0.075, 0.8 * (1 - Math.abs(tod - 0.27) / 0.06)), blue = Math.max(0, 1 - Math.abs(tod - 0.8) / 0.06, 0.6 * (1 - Math.abs(tod - 0.21) / 0.05));
      if (warm > 0.01) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,136,52,' + (warm * 0.55).toFixed(3) + ')'; g.fillRect(0, 0, cw2, ch2); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,150,80,' + (warm * 0.06).toFixed(3) + ')'; g.fillRect(0, 0, cw2, ch2); }
      if (nf > 0.3) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(34,52,140,' + ((nf - 0.3) * 0.36).toFixed(3) + ')'; g.fillRect(0, 0, cw2, ch2); g.globalCompositeOperation = 'source-over'; }
      if (blue > 0.01) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(96,88,220,' + (blue * 0.5).toFixed(3) + ')'; g.fillRect(0, 0, cw2, ch2); g.globalCompositeOperation = 'source-over'; }
    }
    if (fx) {
      if (cloudI > 0.05) { g.fillStyle = 'rgba(70,82,100,' + (cloudI * 0.1 + rainI * 0.12).toFixed(3) + ')'; g.fillRect(0, 0, cw2, ch2); }
      if (rainI > 0.02) {
        // rain: thin translucent streaks at a wind angle, plus splashes on the ground
        const cnt = Math.round(70 + rainI * 330), sl = 0.18 + w.wind * 0.25, a = (0.14 + rainI * 0.26).toFixed(3);
        g.strokeStyle = 'rgba(205,220,240,' + a + ')'; g.lineWidth = 1; g.beginPath();
        for (let k = 0; k < cnt; k++) {
          const sp = 820 + M.hash(k, 3, 2) * 420, len = 9 + M.hash(k, 4, 2) * 9, x = (M.hash(k, 1, 2) * (cw2 + 300) + time * sp * sl) % (cw2 + 300) - 150, y = (M.hash(k, 2, 2) * (ch2 + 40) + time * sp) % (ch2 + 40) - 20;
          g.moveTo(x, y); g.lineTo(x + len * sl, y + len);
        }
        g.stroke();
        if (z > 0.5) { g.strokeStyle = 'rgba(220,232,248,' + (rainI * 0.35).toFixed(3) + ')'; g.beginPath(); const slot = (time * 8) | 0; for (let k = 0; k < rainI * 45; k++) { const x = M.hash(k, slot, 7) * cw2, y = M.hash(k, slot, 8) * ch2, r = 1.5 + ((time * 8) % 1) * 3; g.moveTo(x + r, y); g.ellipse(x, y, r, r * 0.4, 0, 0, 7); } g.stroke(); }
        if (w.type === 'storm' && rainI > 0.6) { const f = M.hash((time * 2.5) | 0, 5, 1); if (f > 0.985) { g.fillStyle = 'rgba(235,240,255,' + (0.12 + (f - 0.985) * 8).toFixed(3) + ')'; g.fillRect(0, 0, cw2, ch2); if (Rn._bolt !== ((time * 2.5) | 0)) { Rn._bolt = (time * 2.5) | 0; M.emit('lightning'); } } }
      }
      if (fogI > 0.02) { const gr = g.createLinearGradient(0, 0, 0, ch2); gr.addColorStop(0, 'rgba(214,222,230,' + (fogI * 0.5).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(214,222,230,' + (fogI * 0.22).toFixed(3) + ')'); g.fillStyle = gr; g.fillRect(0, 0, cw2, ch2); }
    }
    // soft vignette
    if (M.settings.quality !== 'low') {
      const vk = cw2 + 'x' + ch2; if (vk !== vignKey) { vignKey = vk; vign = S.mk(cw2 / 4, ch2 / 4); const vg = vign.getContext('2d'), gr = vg.createRadialGradient(cw2 / 8, ch2 / 8, Math.min(cw2, ch2) / 10, cw2 / 8, ch2 / 8, Math.hypot(cw2, ch2) / 8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(6,12,24,0.42)'); vg.fillStyle = gr; vg.fillRect(0, 0, cw2, ch2); }
      g.drawImage(vign, 0, 0, cw2, ch2);
    }
    const tE = performance.now(), st = Rn.stats; Rn.ms += (tE - tA - Rn.ms) * 0.1; st.tGround += (tB - tA - st.tGround) * 0.1; st.tScan += (tC - tB - st.tScan) * 0.1; st.tObj += (tD - tC - st.tObj) * 0.1; st.tPost += (tE - tD - st.tPost) * 0.1;
  };

  function drawToolLayer(W, z) {
    const n = W.n, sel = Rn.sel, pv = Rn.preview, hv = Rn.hover;
    const ringAt = function (cx, cy, r, e, col) { const p = Cam.tileToWorld(cx, cy, e); g.beginPath(); g.ellipse(p[0], p[1], r * TW * 1.414, r * TH * 1.414, 0, 0, 7); g.strokeStyle = col; g.lineWidth = 1.5 / z; g.setLineDash([6 / z, 5 / z]); g.stroke(); g.setLineDash([]); g.fillStyle = col.replace('0.9', '0.08'); g.fill(); };
    if (sel && !sel.dead) {
      const e = W.eh(sel.y * n + sel.x); g.beginPath(); rectPath(sel.x, sel.y, sel.x + sel.s, sel.y + sel.s, e); g.strokeStyle = '#ffffff'; g.lineWidth = 2 / z; g.setLineDash([6 / z, 4 / z]); g.lineDashOffset = -Rn.time * 14 / z; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      if (!sel.z) { const d = M.DEFS[sel.t]; if (d.cover) ringAt(sel.x + sel.s / 2, sel.y + sel.s / 2, d.cover.r, e, 'rgba(120,220,255,0.9)'); }
    } else if (sel) Rn.sel = null;
    const tr = M.Tutorial.mapRect();
    if (tr) {
      const pulse = 0.5 + 0.5 * Math.sin(Rn.time * 4), e = W.eh(W.idx(M.clamp(tr.x0, 0, n - 1), M.clamp(tr.y0, 0, n - 1)));
      g.beginPath(); rectPath(tr.x0, tr.y0, tr.x1 + 1, tr.y1 + 1, e); g.fillStyle = 'rgba(255,214,90,' + (0.12 + pulse * 0.16).toFixed(3) + ')'; g.fill();
      g.strokeStyle = 'rgba(255,214,90,' + (0.6 + pulse * 0.4).toFixed(3) + ')'; g.lineWidth = 2.5 / z; g.setLineDash([7 / z, 5 / z]); g.lineDashOffset = -Rn.time * 16 / z; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
    }
    if (pv) {
      if (pv.tiles) {
        g.beginPath(); let any = false; for (const t of pv.tiles) if (t.far && !t.skip && W.inb(t.x, t.y)) { diaPath(t.x, t.y, W.eh(t.y * n + t.x)); any = true; } if (any) { g.fillStyle = 'rgba(240,170,60,0.5)'; g.fill(); }
        g.beginPath(); any = false; for (const t of pv.tiles) if (t.ok && !t.skip && !t.far && W.inb(t.x, t.y)) { diaPath(t.x, t.y, W.eh(t.y * n + t.x)); any = true; } if (any) { g.fillStyle = pv.color || 'rgba(90,225,130,0.42)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8 / z; g.stroke(); }
        g.beginPath(); any = false; for (const t of pv.tiles) if (!t.ok && W.inb(t.x, t.y)) { diaPath(t.x, t.y, W.eh(t.y * n + t.x)); any = true; } if (any) { g.fillStyle = 'rgba(240,70,60,0.5)'; g.fill(); }
        g.beginPath(); any = false; for (const t of pv.tiles) if (t.ok && t.skip && W.inb(t.x, t.y)) { diaPath(t.x, t.y, W.eh(t.y * n + t.x)); any = true; } if (any) { g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 0.8 / z; g.stroke(); }
      }
      if (pv.sprite && W.inb(pv.sx, pv.sy)) { const sp = pv.sprite, e = W.eh(pv.sy * n + pv.sx), p = Cam.tileToWorld(pv.sx, pv.sy, e); g.globalAlpha = pv.ok ? 0.72 : 0.4; S.blit(g, sp, sp.c, p[0] - sp.ox, p[1] - sp.oy); g.globalAlpha = 1; if (pv.ring) ringAt(pv.sx + pv.size / 2, pv.sy + pv.size / 2, pv.ring, e, 'rgba(120,220,255,0.9)'); }
    } else if (hv && W.inb(hv.x, hv.y)) {
      const b = W.at(hv.x, hv.y), e = W.eh(hv.y * n + hv.x); g.beginPath();
      if (b) rectPath(b.x, b.y, b.x + b.s, b.y + b.s, e); else diaPath(hv.x, hv.y, e);
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4 / z; g.stroke();
    }
  }

  // ---------------- minimap ----------------
  Rn.drawMinimap = function (canvas) {
    const W = M.world; if (!W) return; const n = W.n; if (canvas.width !== n) { canvas.width = n; canvas.height = n; }
    const c = canvas.getContext('2d'), img = c.createImageData(n, n), d = img.data, L = W.limit;
    for (let i = 0; i < n * n; i++) {
      let r, gg, b; const e = W.elev[i], id = W.bld[i];
      if (W.road[i]) { r = 70; gg = 74; b = 82; }
      else if (id) { const bd = W.blds[id - 1]; if (bd && bd.z === 1) { r = 80; gg = 190; b = 90; } else if (bd && bd.z === 2) { r = 70; gg = 140; b = 240; } else if (bd && bd.z === 3) { r = 225; gg = 170; b = 50; } else { r = 215; gg = 215; b = 225; } }
      else if (e === 0) { r = 46; gg = 120; b = 180; }
      else if (W.zone[i]) { const z = W.zone[i]; r = z === 1 ? 60 : z === 2 ? 50 : 150; gg = z === 1 ? 130 : z === 2 ? 95 : 120; b = z === 1 ? 65 : z === 2 ? 160 : 50; }
      else { const t = W.terr[i], k = e * 8, dc = W.deco[i]; if (t === 2) { r = 205; gg = 190; b = 140; } else if (t === 3) { r = 140; gg = 140; b = 132; } else if (dc === 1 || dc === 2 || dc === 6) { r = 50; gg = 110; b = 55; } else { r = 88 + k; gg = 150 + k; b = 72; } }
      const x = i % n, y = (i / n) | 0; if (x < L.x0 || y < L.y0 || x > L.x1 || y > L.y1) { r = r * 0.55; gg = gg * 0.55; b = b * 0.6; }
      const o = i * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    // viewport quad
    const z = Cam.zoom, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) { const wx = Cam.x + q[0] * Cam.w / 2 / z, wy = Cam.y + q[1] * Cam.h / 2 / z; return [(wx / TW + wy / TH) / 2, (wy / TH - wx / TW) / 2]; });
    c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, n / 110); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); c.stroke();
  };
  // fills a fresh canvas with a still of the current view (used for save thumbnails)
  Rn.snapshot = function (w, h) { const c = S.mk(w, h), x = c.getContext('2d'); try { x.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, w, h); return c.toDataURL('image/jpeg', 0.6); } catch (e) { return ''; } };
})();
