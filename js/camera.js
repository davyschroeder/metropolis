'use strict';
/* METROPOLIS – camera: pan, smooth zoom, tile picking, coordinate transforms */
(function () {
  const C = M.Camera = { x: 0, y: 0, zoom: 1, tz: 1, vx: 0, vy: 0, w: 1280, h: 720, keys: {}, shake: 0, minZoom: 0.3, maxZoom: 2.6, edge: { x: 0, y: 0 } };
  const TW = M.TW, TH = M.TH, EL = M.EL;
  C.tileToWorld = function (x, y, e) { return [(x - y) * TW, (x + y) * TH - (e || 0) * EL]; };
  C.toScreen = function (wx, wy) { return [(wx - C.x) * C.zoom + C.w / 2, (wy - C.y) * C.zoom + C.h / 2]; };
  C.toWorld = function (sx, sy) { return [(sx - C.w / 2) / C.zoom + C.x, (sy - C.h / 2) / C.zoom + C.y]; };
  C.centerOn = function (tx, ty, snap) { const p = C.tileToWorld(tx + 0.5, ty + 0.5, 1); if (snap) { C.x = p[0]; C.y = p[1]; C.gx = null; } else { C.gx = p[0]; C.gy = p[1]; } };
  // screen position -> tile (accounts for elevation); returns {x, y, fx, fy}
  C.pick = function (sx, sy) {
    const W = M.world, w = C.toWorld(sx, sy);
    for (let k = 4; k >= 0; k--) {
      const wy = w[1] + k * EL, fx = (w[0] / TW + wy / TH) / 2, fy = (wy / TH - w[0] / TW) / 2, x = Math.floor(fx), y = Math.floor(fy);
      if (!W.inb(x, y)) continue;
      if (W.eh(y * W.n + x) === k || (k === 0)) return { x: x, y: y, fx: fx, fy: fy };
    }
    const fx = (w[0] / TW + w[1] / TH) / 2, fy = (w[1] / TH - w[0] / TW) / 2;
    return { x: Math.floor(fx), y: Math.floor(fy), fx: fx, fy: fy };
  };
  C.zoomAt = function (factor, sx, sy) {
    const before = C.toWorld(sx, sy), nz = M.clamp(C.tz * factor, C.minZoom, C.maxZoom); C.tz = nz; C.zx = sx; C.zy = sy; C.zw = before;
  };
  C.update = function (dt) {
    const k = C.keys, sp = 620 / C.zoom; let ax = 0, ay = 0;
    if (k.left) ax -= 1; if (k.right) ax += 1; if (k.up) ay -= 1; if (k.down) ay += 1;
    ax += C.edge.x; ay += C.edge.y;
    if (ax || ay) { C.gx = null; C.x += ax * sp * dt; C.y += ay * sp * dt; }
    if (C.gx != null) { const t = Math.min(1, dt * 6); C.x += (C.gx - C.x) * t; C.y += (C.gy - C.y) * t; if (Math.abs(C.gx - C.x) + Math.abs(C.gy - C.y) < 1) C.gx = null; }
    if (Math.abs(C.tz - C.zoom) > 0.0005) {
      C.zoom += (C.tz - C.zoom) * Math.min(1, dt * 14);
      if (C.zw) { const now = C.toWorld(C.zx, C.zy); C.x += C.zw[0] - now[0]; C.y += C.zw[1] - now[1]; }
    } else { C.zoom = C.tz; C.zw = null; }
    const W = M.world; if (W) { const n = W.n; C.x = M.clamp(C.x, -n * TW, n * TW); C.y = M.clamp(C.y, -TH * 4, n * 2 * TH + TH * 4); }
    if (C.shake > 0) C.shake = Math.max(0, C.shake - dt);
  };
})();
