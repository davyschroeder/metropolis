'use strict';
/* METROPOLIS – extra building forms for zoned lots. Every zone level gets five forms; each form reads its
   colours and proportions from the style seed, so one level shows 80 different buildings (S.NV). */
(function () {
  const S = M.Sprites, K = S.kit, pk = K.pk, sh = M.shade, F = S.zforms, TW = M.TW, TH = M.TH;
  const WALL = K.WALL, ROOF = K.ROOF, BRICK = K.BRICK, APT = K.APT, GLASS = K.GLASS, AWN = K.AWN, CARCOL = S.CARCOL, roofKit = K.roofKit, parking = K.parking;
  const STONE = ['#d9cdb4', '#cfc6b8', '#c8b79a', '#bfb7a8', '#d6d0c4'], DARK = ['#2f3a45', '#46525e', '#3d4852', '#566170', '#6f7780'], METAL = ['#9aa3ad', '#b9b4a8', '#a9b0b6', '#8d9a86', '#c2b59c', '#b0a48e'];
  const BOLD = ['#c8463c', '#2f6fb0', '#3c8f5a', '#d98b2b', '#7a4fa8', '#1f8f96'], CONT = ['#b0483f', '#2f6fb0', '#3c8f5a', '#d98b2b', '#e8e6e0', '#5b6670', '#1f8f96'];
  function ri(r, a, b) { return a + ((r() * (b - a + 1)) | 0); }
  function rf(r, a, b) { return a + r() * (b - a); }
  function lawn(w) { return w === 1 ? '#86a65a' : w === 2 ? '#74b356' : '#66b552'; }
  // a block with a window grid on both visible faces and a parapet
  function block(a, u0, v0, u1, v1, z0, H, wall, o) {
    o = o || {}; const fh = o.fh || 8.5, fl = Math.max(1, Math.floor((H - z0 - 1) / fh)), ca = o.ca || Math.max(1, Math.round((u1 - u0) / 0.19)), cb = o.cb || Math.max(1, Math.round((v1 - v0) / 0.19));
    a.box(u0, v0, u1, v1, z0, H, wall); const wo = { glass: o.glass, mx: o.mx, mz: o.mz };
    a.win('A', u0 + 0.02, u1 - 0.02, v1, z0 + 1, H - 1, ca, fl, wo); a.win('B', v0 + 0.02, v1 - 0.02, u1, z0 + 1, H - 1, cb, fl, wo);
    if (o.band) { const dz = (H - z0 - 2) / fl; for (let f = 0; f < fl; f += o.step || 1) { a.face('A', u0 + 0.02, u1 - 0.02, v1, z0 + 1 + f * dz, z0 + 2.3 + f * dz, o.band); if (o.bandB) a.face('B', v0 + 0.02, v1 - 0.02, u1, z0 + 1 + f * dz, z0 + 2.3 + f * dz, o.band); } }
    if (o.piers) { const n = o.piers; for (let k = 0; k <= n; k++) { const t = u0 + (u1 - u0) * k / n, t2 = v0 + (v1 - v0) * k / n; a.face('A', Math.max(u0, t - 0.018), Math.min(u1, t + 0.018), v1, z0, H, o.pierCol || sh(wall, 1.12)); a.face('B', Math.max(v0, t2 - 0.018), Math.min(v1, t2 + 0.018), u1, z0, H, o.pierCol || sh(wall, 1.12)); } }
    if (o.cap !== false) a.box(u0, v0, u1, v1, H, H + 2, sh(wall, 0.85), o.capTop || '#8f9399');
  }
  function base(a, u0, v0, u1, v1, h, wall) { a.face('A', u0, u1, v1, 0, h, sh(wall, 0.74)); a.face('B', v0, v1, u1, 0, h, sh(wall, 0.74)); }
  function door(a, u, v, w, h, col) { a.face('A', u - w / 2, u + w / 2, v, 0, h || 7.5, col || '#4a3528'); }
  function chimney(a, u, v, z, h) { a.box(u, v, u + 0.07, v + 0.07, z, z + h, '#8a5a4a'); }
  function umbrella(a, u, v, col) { a.seg([u, v, 0], [u, v, 7], '#8a8a8a', 1); a.pyr(u - 0.1, v - 0.1, u + 0.1, v + 0.1, 6, 3, col); }
  function stepGable(a, u0, u1, v, z, h, col, n) { n = n || 4; const d = (u1 - u0) / 2 / (n + 0.6), hs = h / n; for (let k = 0; k < n; k++) a.face('A', u0 + k * d, u1 - k * d, v, z + k * hs, z + (k + 1) * hs + 0.2, col, 'rgba(0,0,0,0.18)'); }
  function shed(a, u0, v0, u1, v1, z, h, col, wall) { // mono-pitch roof rising towards the back
    a.poly([[u1, v0, z], [u1, v1, z], [u1, v0, z + h]], sh(wall, a.lB())); a.poly([[u0, v0, z + h], [u1, v0, z + h], [u1, v1, z], [u0, v1, z]], sh(col, 1.0));
  }
  function truck(a, u, v, col, axisU) { // cab at the low end
    if (axisU) { a.box(u, v - 0.06, u + 0.36, v + 0.06, 1, 9, '#e8e6e0'); a.box(u + 0.36, v - 0.055, u + 0.47, v + 0.055, 1, 7, col); }
    else { a.box(u - 0.06, v, u + 0.06, v + 0.36, 1, 9, '#e8e6e0'); a.box(u - 0.055, v + 0.36, u + 0.055, v + 0.47, 1, 7, col); }
  }
  function containers(a, r, u0, v0, nu, nv, maxH) { for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const h = ri(r, 0, maxH); for (let k = 0; k < h; k++) a.box(u0 + i * 0.3, v0 + j * 0.14, u0 + i * 0.3 + 0.27, v0 + j * 0.14 + 0.11, k * 5.5, k * 5.5 + 5.2, pk(r, CONT)); } }
  function solar(a, u0, v0, nu, nv, z) { for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) a.poly([[u0 + i * 0.3, v0 + j * 0.3, z], [u0 + 0.24 + i * 0.3, v0 + j * 0.3, z], [u0 + 0.24 + i * 0.3, v0 + 0.24 + j * 0.3, z + 3], [u0 + i * 0.3, v0 + 0.24 + j * 0.3, z + 3]], '#2d4f86', 'rgba(255,255,255,0.4)'); }
  function tank(a, u, v, rad, h, col, band) { a.cyl(u, v, rad, 0, h, col); if (band) a.cyl(u, v, rad * 1.03, h * 0.7, h * 0.78, band); }
  function silo(a, u, v, rad, h, col) { a.cyl(u, v, rad, 0, h, col); a.dome(u, v, rad, h, sh(col, 1.05), 0.55); }
  function sphere(a, u, v, rad, z, col) { for (let k = 0; k < 4; k++) { const du = (k & 1 ? 1 : -1) * rad * 0.6, dv = (k & 2 ? 1 : -1) * rad * 0.6; a.seg([u + du, v + dv, 0], [u + du, v + dv, z + 2], '#6b7077', 1.2); } const P = a.p(u, v, z + rad * TW), g = a.g, R = rad * TW * 1.3; const gr = g.createRadialGradient(P[0] - R * 0.35, P[1] - R * 0.4, 1, P[0], P[1], R * 1.1); gr.addColorStop(0, sh(col, 1.3)); gr.addColorStop(1, sh(col, 0.6)); g.fillStyle = gr; g.beginPath(); g.arc(P[0], P[1], R, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.7; g.stroke(); a.coverEll(P[0], P[1], R, R); a.p(u, v, z + rad * TW * 2.2); }
  function stack(a, u, v, rad, h, col, band, k, z0) { a.cyl(u, v, rad, z0 || 0, h, col); if (band) { a.cyl(u, v, rad * 1.05, h * 0.8, h * 0.86, band); a.cyl(u, v, rad * 1.05, h * 0.92, h * 0.96, band); } a.smokeAt(u, v, h + 2, k == null ? 1 : k); }
  // round tower with lit windows on the visible half
  function cylTower(a, u, v, rad, z0, H, wall, glass, fh) {
    a.cyl(u, v, rad, z0, H, wall); fh = fh || 8.5; a.p(u, v, H);
    const g = a.g, c = a.p(u, v, 0), rx = rad * TW * 1.414, ry = rad * TH * 1.414, fl = Math.floor((H - z0) / fh), n = Math.max(5, Math.round(rx / 3));
    for (let f = 0; f < fl; f++) {
      const zb = z0 + f * fh + fh * 0.22, zt = z0 + f * fh + fh * 0.82;
      for (let k = 0; k < n; k++) {
        const a0 = Math.PI * (k + 0.14) / n, a1 = Math.PI * (k + 0.86) / n, x0 = c[0] - Math.cos(a0) * rx, y0 = c[1] + Math.sin(a0) * ry, x1 = c[0] - Math.cos(a1) * rx, y1 = c[1] + Math.sin(a1) * ry;
        const p = [[x0, y0 - zb], [x1, y1 - zb], [x1, y1 - zt], [x0, y0 - zt]];
        g.fillStyle = sh(glass, 1.08 - 0.5 * k / n); g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.lineTo(p[3][0], p[3][1]); g.closePath(); g.fill(); a.pane(p);
      }
    }
  }
  function hyper(a, u, v, rad, h, col) { // cooling tower
    const g = a.g, c0 = a.p(u, v, 0), rx = rad * TW * 1.414, ry = rx / 2, top = c0[1] - h, wr = rx * 0.6, tr = rx * 0.72; a.p(u, v, h);
    const gr = g.createLinearGradient(c0[0] - rx, 0, c0[0] + rx, 0); gr.addColorStop(0, sh(col, 1.08)); gr.addColorStop(0.45, sh(col, 0.95)); gr.addColorStop(1, sh(col, 0.6));
    g.fillStyle = gr; g.beginPath(); g.moveTo(c0[0] - rx, c0[1]); g.quadraticCurveTo(c0[0] - wr * 0.85, c0[1] - h * 0.6, c0[0] - tr, top); g.lineTo(c0[0] + tr, top); g.quadraticCurveTo(c0[0] + wr * 0.85, c0[1] - h * 0.6, c0[0] + rx, c0[1]); g.ellipse(c0[0], c0[1], rx, ry, 0, 0, Math.PI, false); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.7; g.stroke(); g.fillStyle = sh(col, 0.5); g.beginPath(); g.ellipse(c0[0], top, tr, tr / 2, 0, 0, 7); g.fill(); a.cover([[c0[0] - rx, c0[1]], [c0[0] - wr, c0[1] - h * 0.6], [c0[0] - tr, top - tr / 2], [c0[0] + tr, top - tr / 2], [c0[0] + wr, c0[1] - h * 0.6], [c0[0] + rx, c0[1]], [c0[0], c0[1] + ry]]); a.smokeAt(u, v, h + 2, 2);
  }
  S.kit3 = { block: block, cylTower: cylTower, ri: ri, rf: rf };

  // =================== residential ===================
  function R1b(a, r, w) { // L-shaped house
    a.lot(lawn(w)); const wall = pk(r, WALL), roof = pk(r, ROOF), h = w === 1 ? 10 : w === 3 ? 16 : 13, rh = w === 3 ? 10 : 8;
    a.tree(0.1, 0.1, ri(r, 1, 2), 0.75); if (r() < 0.5) a.tree(0.12, 0.86, 6, 0.7);
    a.box(0.16, 0.16, 0.86, 0.5, 0, h, wall); a.win('A', 0.18, 0.5, 0.5, 3, h - 2, 2, 1, { mx: 0.22 });
    a.gable(0.13, 0.13, 0.89, 0.53, h, rh, roof, wall, 'u'); chimney(a, 0.24, 0.22, h + 2, 10);
    a.gq(0.6, 0.82, 0.74, 1, '#cfc8b4');
    a.box(0.5, 0.46, 0.86, 0.82, 0, h, wall); a.win('A', 0.52, 0.84, 0.82, 3, h - 2, w === 3 ? 3 : 2, 1, { mx: 0.2 }); a.win('B', 0.2, 0.8, 0.86, 3, h - 2, 3, 1, { mx: 0.22 });
    if (w === 3) { a.win('A', 0.2, 0.48, 0.5, 9, h - 1, 2, 1); }
    door(a, 0.67, 0.82, 0.08, 7.5, '#6b4a34'); a.light(0.74, 0.84, 8, 'lamp', 0.45);
    a.gable(0.47, 0.43, 0.89, 0.85, h, rh, roof, wall, 'v');
    a.bush(0.3, 0.62, '#4a8f3c'); if (w > 1) { a.bush(0.2, 0.74, '#d9668a', 0.6); a.bush(0.4, 0.9, '#e0c04a', 0.6); } else a.gq(0.1, 0.6, 0.4, 0.92, '#9c8f66');
  }
  function R1c(a, r, w) { // bungalow with a hipped roof and a porch
    a.lot(lawn(w)); const wall = pk(r, WALL), roof = pk(r, ROOF), h = w === 1 ? 8.5 : 10.5, u0 = w === 1 ? 0.22 : 0.14, u1 = w === 1 ? 0.78 : 0.86;
    a.tree(0.88, 0.1, 2, 0.75); a.tree(0.1, 0.12, ri(r, 1, 2), 0.7);
    if (w === 3) { a.gq(0.08, 0.76, 0.42, 0.95, '#e8e4d8'); a.gq(0.11, 0.79, 0.39, 0.92, '#5fc3e8'); }
    a.box(u0, 0.2, u1, 0.66, 0, h, wall); a.win('A', u0 + 0.02, u1 - 0.02, 0.66, 2.5, h - 1.5, w === 1 ? 2 : 3, 1, { mx: 0.2, glass: w === 3 ? '#6aa6c8' : undefined }); a.win('B', 0.24, 0.62, u1, 2.5, h - 1.5, 2, 1, { mx: 0.22 });
    door(a, 0.5, 0.66, 0.08, 7, '#5b3d2c');
    a.pyr(u0 - 0.06, 0.14, u1 + 0.06, 0.72, h, w === 1 ? 7 : 9, roof);
    const pc = sh(wall, 1.1); a.seg([0.36, 0.78, 0], [0.36, 0.78, 7], pc, 1.4); a.seg([0.64, 0.78, 0], [0.64, 0.78, 7], pc, 1.4); a.box(0.32, 0.66, 0.68, 0.8, 7, 8.2, sh(roof, 0.9)); a.gq(0.44, 0.8, 0.56, 1, '#cfc8b4'); a.light(0.5, 0.74, 6.5, 'lamp', 0.45);
    if (w === 1) { a.box(0.8, 0.5, 0.94, 0.8, 0, 1, '#77705f'); a.car(0.87, 0.65, pk(r, CARCOL), false); } else { a.bush(0.74, 0.8, '#d9668a', 0.6); a.bush(0.84, 0.86); }
    a.bush(0.16, 0.74, w === 1 ? '#6f8f3c' : '#4a8f3c');
  }
  function R1d(a, r, w) { // modern cube villa, or a prefab home for low wealth
    a.lot(lawn(w));
    if (w === 1) {
      const wall = pk(r, ['#d9d2c0', '#c9d4d9', '#d6c2b0', '#c3ccb9']); a.gq(0.1, 0.7, 0.9, 0.95, '#9c8f66'); a.tree(0.12, 0.14, 2, 0.7);
      a.box(0.14, 0.3, 0.86, 0.6, 2, 11, wall); a.win('A', 0.2, 0.84, 0.6, 5, 9.5, 3, 1, { mx: 0.2 }); a.win('B', 0.34, 0.56, 0.86, 5, 9.5, 1, 1); door(a, 0.28, 0.6, 0.07, 9, '#5b6670');
      shed(a, 0.12, 0.28, 0.88, 0.62, 11, 3, pk(r, ['#8f969d', '#7c838a', '#a05a48']), wall); a.box(0.22, 0.6, 0.34, 0.68, 0, 2, '#8a8f95');
      a.box(0.62, 0.72, 0.76, 0.84, 0, 6, '#7a5a48'); a.seg([0.1, 0.9, 0], [0.1, 0.9, 9], '#8a8f95', 1); a.seg([0.5, 0.92, 0], [0.5, 0.92, 9], '#8a8f95', 1); a.seg([0.1, 0.9, 8], [0.5, 0.92, 8], '#d8d8d8', 0.7); return;
    }
    const wall = pk(r, ['#f0eee8', '#e4e7ea', '#ece4d4', '#dfe4e2']), acc = pk(r, ['#8a5a3a', '#5b4a3c', '#3d4852', '#a8744a']), gl = pk(r, GLASS), H = w === 3 ? 19 : 16;
    a.tree(0.1, 0.1, 2, 0.8); a.gq(0.3, 0.74, 0.5, 1, '#d8d4c8');
    a.box(0.16, 0.18, 0.62, 0.7, 0, H, wall); a.face('A', 0.16, 0.34, 0.7, 0, H, acc);
    a.win('A', 0.36, 0.6, 0.7, 1.5, 8, 1, 1, { glass: gl, mx: 0.06, mz: 0.08 }); a.win('A', 0.36, 0.6, 0.7, 9.5, H - 1, 2, 1, { glass: gl, mx: 0.08, mz: 0.1 }); a.win('B', 0.22, 0.66, 0.62, 9.5, H - 1, 2, 1, { glass: gl, mx: 0.1 });
    door(a, 0.25, 0.7, 0.07, 7.5, '#2f3640'); a.box(0.16, 0.18, 0.62, 0.7, H, H + 1.2, '#e9e9e6', '#b9bdc1');
    a.box(0.58, 0.3, 0.9, 0.7, 0, 9, sh(wall, 0.97)); a.win('A', 0.6, 0.88, 0.7, 1.5, 8, 2, 1, { glass: gl, mx: 0.06, mz: 0.08 }); a.win('B', 0.34, 0.66, 0.9, 1.5, 8, 2, 1, { glass: gl, mx: 0.08, mz: 0.08 });
    a.box(0.58, 0.3, 0.9, 0.7, 9, 10, '#c9b89a', '#b89f7a'); a.seg([0.9, 0.3, 10], [0.9, 0.7, 13], 'rgba(200,230,240,0.9)', 0.8); a.seg([0.58, 0.7, 13], [0.9, 0.7, 13], 'rgba(200,230,240,0.9)', 0.8);
    a.light(0.5, 0.74, 7, 'lamp', 0.5);
    if (w === 3) { a.gq(0.56, 0.78, 0.94, 0.96, '#e8e4d8'); a.gq(0.59, 0.81, 0.91, 0.93, '#5fc3e8'); } else { a.bush(0.7, 0.84, '#4a8f3c'); a.bush(0.84, 0.9, '#d9668a', 0.6); }
    a.bush(0.12, 0.84);
  }
  function R1e(a, r, w) { // tall narrow house with a steep roof and a lean-to garage
    a.lot(lawn(w)); const wall = w === 1 ? pk(r, BRICK) : pk(r, WALL.concat(BRICK)), roof = pk(r, ROOF), h = w === 1 ? 13 : 18, rh = w === 1 ? 10 : 13;
    a.tree(0.9, 0.12, ri(r, 1, 2), 0.75);
    a.box(0.1, 0.34, 0.3, 0.7, 0, 8, sh(wall, 0.94)); shed(a, 0.08, 0.32, 0.31, 0.72, 8, 2.5, sh(roof, 0.9), wall); a.face('A', 0.13, 0.27, 0.7, 0, 6.5, '#8d949b'); a.gq(0.13, 0.7, 0.27, 1, '#b9b4a6');
    a.box(0.3, 0.22, 0.76, 0.7, 0, h, wall);
    a.win('A', 0.32, 0.74, 0.7, 2.5, 8.5, 2, 1, { mx: 0.22 }); if (h > 14) a.win('A', 0.32, 0.74, 0.7, 10, h - 1, 2, 1, { mx: 0.22 }); a.win('B', 0.26, 0.66, 0.76, 3, h - 1.5, 2, h > 14 ? 2 : 1, { mx: 0.24 });
    door(a, 0.53, 0.7, 0.07, 7.5, pk(r, ['#6b4a34', '#2f5b46', '#7a2f2a', '#2f4a6b'])); a.light(0.6, 0.72, 8, 'lamp', 0.45);
    a.gable(0.27, 0.19, 0.79, 0.73, h, rh, roof, wall, 'v'); a.win('A', 0.46, 0.6, 0.73, h + 1.5, h + 6, 1, 1, { mx: 0.1, mz: 0.1 });
    chimney(a, 0.62, 0.3, h + 4, 9);
    if (w > 1) { for (let k = 0; k <= 6; k++) a.seg([0.34 + k * 0.1, 0.94, 0], [0.34 + k * 0.1, 0.94, 3], '#f1efe6', 0.8); a.seg([0.34, 0.94, 3], [0.94, 0.94, 3], '#f1efe6', 0.8); a.bush(0.86, 0.82, '#d9668a', 0.6); }
    a.bush(0.42, 0.84, w === 1 ? '#6f8f3c' : '#4a8f3c');
  }
  function R2b(a, r, w) { // semi-detached pair under one roof
    a.lot('#8dab62'); const wall = w === 1 ? pk(r, BRICK) : pk(r, WALL), roof = pk(r, ROOF), h = ri(r, 15, 19), d2 = pk(r, ['#5b3d2c', '#2f5b46', '#7a2f2a', '#2f4a6b']);
    a.tree(0.08, 0.08, 2, 0.7); a.tree(0.92, 0.08, ri(r, 1, 2), 0.7); a.gq(0.24, 0.76, 0.34, 1, '#cfc8b4'); a.gq(0.66, 0.76, 0.76, 1, '#cfc8b4');
    a.box(0.1, 0.24, 0.9, 0.76, 0, h, wall); a.win('A', 0.12, 0.88, 0.76, 2.5, 8.5, 4, 1, { mx: 0.24 }); a.win('A', 0.12, 0.88, 0.76, 10, h - 1, 4, 1, { mx: 0.22 }); a.win('B', 0.28, 0.72, 0.9, 3, h - 1.5, 2, 2, { mx: 0.24 });
    door(a, 0.29, 0.76, 0.07, 7.5, d2); door(a, 0.71, 0.76, 0.07, 7.5, d2); a.face('A', 0.495, 0.505, 0.76, 0, h, sh(wall, 0.8)); a.light(0.5, 0.8, 8, 'lamp', 0.5);
    a.gable(0.07, 0.21, 0.93, 0.79, h, 10, roof, wall, 'u'); chimney(a, 0.3, 0.44, h + 6, 8); chimney(a, 0.64, 0.44, h + 6, 8);
    if (r() < 0.6) { a.box(0.2, 0.62, 0.36, 0.72, h + 2.5, h + 7, wall, roof); a.box(0.64, 0.62, 0.8, 0.72, h + 2.5, h + 7, wall, roof); }
    a.bush(0.5, 0.9, '#4a8f3c'); a.bush(0.1, 0.9, '#d9668a', 0.6); a.bush(0.9, 0.92, '#e0c04a', 0.6);
  }
  function R2c(a, r, w) { // small flats with balconies and a stair tower
    a.lot('#bdb9ad'); a.gq(0, 0, 1, 0.14, '#6db552'); a.tree(0.1, 0.07, 2, 0.6);
    const wall = w === 1 ? pk(r, ['#b9a892', '#a99c8c', '#b3aa9a']) : pk(r, APT), H = ri(r, 3, 4) * 9 + 3, fl = Math.floor((H - 2) / 9), bc = pk(r, ['#f1f1ee', '#d9dde0', '#c9b89a', '#8fb3c4']);
    a.box(0.12, 0.18, 0.74, 0.76, 0, H, wall); a.win('A', 0.14, 0.72, 0.76, 2, H - 1, 3, fl); a.win('B', 0.22, 0.72, 0.74, 2, H - 1, 3, fl);
    for (let f = 1; f < fl; f++) a.box(0.16, 0.76, 0.7, 0.82, f * 9 + 1, f * 9 + 3.6, bc);
    a.box(0.12, 0.18, 0.74, 0.76, H, H + 1.6, sh(wall, 0.86), '#8f9399'); roofKit(a, r, 0.16, 0.22, 0.7, 0.66, H + 1.6, 2);
    a.box(0.74, 0.4, 0.9, 0.76, 0, H + 6, sh(wall, 0.92)); a.win('A', 0.78, 0.86, 0.76, 9, H + 4, 1, 1, { glass: '#7ec0dc', mx: 0.05, mz: 0.03 }); door(a, 0.82, 0.76, 0.08, 7.5, '#35414d'); a.light(0.82, 0.8, 9, 'lamp', 0.6);
    a.bush(0.3, 0.92); a.bush(0.56, 0.94, '#d9668a', 0.6);
  }
  function R2d(a, r, w) { // two small blocks around a garden
    a.lot('#8dab62'); a.gq(0.44, 0.5, 0.56, 1, '#cfc8b4');
    const w1 = w === 1 ? pk(r, BRICK) : pk(r, APT), w2 = w === 1 ? pk(r, BRICK) : pk(r, WALL), roof = pk(r, ROOF), H1 = ri(r, 20, 28), H2 = ri(r, 22, 32), flat = r() < 0.5;
    const one = function (u0, v0, u1, v1, H, wl) {
      const fl = Math.max(2, Math.round(H / 9)); a.box(u0, v0, u1, v1, 0, H, wl); a.win('A', u0 + 0.02, u1 - 0.02, v1, 2, H - 1, 2, fl); a.win('B', v0 + 0.02, v1 - 0.02, u1, 2, H - 1, 2, fl); door(a, (u0 + u1) / 2, v1, 0.07, 7, '#4a3528');
      if (flat) { a.box(u0, v0, u1, v1, H, H + 1.5, sh(wl, 0.86), '#8f9399'); roofKit(a, r, u0 + 0.04, v0 + 0.04, u1, v1, H + 1.5, 1); } else a.pyr(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, H, 9, roof);
    };
    one(0.08, 0.1, 0.5, 0.48, H1, w1); a.tree(0.2, 0.7, ri(r, 1, 2), 0.8); a.tree(0.8, 0.2, 6, 0.7); a.bush(0.34, 0.62, '#d9668a', 0.6);
    one(0.54, 0.5, 0.94, 0.9, H2, w2); a.bush(0.14, 0.92);
  }
  function R2e(a, r, w) { // corner block with a hipped roof over a shop floor
    a.lot('#c2bfb5'); const wall = pk(r, BRICK.concat(w > 1 ? WALL : [])), roof = pk(r, ROOF), H = ri(r, 24, 30), fl = Math.round((H - 9) / 8);
    a.box(0.12, 0.14, 0.88, 0.78, 0, H, wall); base(a, 0.12, 0.14, 0.88, 0.78, 8.5, wall);
    a.win('A', 0.14, 0.86, 0.78, 1.5, 7.5, 3, 1, { glass: '#86c4de', mx: 0.08, mz: 0.06 }); a.win('B', 0.18, 0.74, 0.88, 1.5, 7.5, 2, 1, { glass: '#86c4de', mx: 0.1, mz: 0.06 });
    a.win('A', 0.14, 0.86, 0.78, 9.5, H - 1, 4, fl); a.win('B', 0.16, 0.76, 0.88, 9.5, H - 1, 3, fl); a.face('A', 0.12, 0.88, 0.78, H - 1.2, H, '#f1efe6'); a.face('B', 0.14, 0.78, 0.88, H - 1.2, H, '#f1efe6');
    a.pyr(0.09, 0.11, 0.91, 0.81, H, ri(r, 9, 13), roof); chimney(a, 0.3, 0.3, H + 3, 8);
    if (w > 1) a.poly([[0.14, 0.78, 9], [0.86, 0.78, 9], [0.86, 0.87, 6.4], [0.14, 0.87, 6.4]], pk(r, AWN), 'rgba(0,0,0,0.25)'); a.light(0.5, 0.86, 8, 'lamp', 0.8);
    a.tree(0.08, 0.92, 2, 0.55); a.tree(0.94, 0.94, 2, 0.55);
  }
  function R3b(a, r, w) { // stepped block with a roof terrace
    a.lot('#bbb8ad'); a.gq(0, 0, 1, 0.1, '#6db552'); a.tree(0.06, 0.05, 2, 0.6);
    const wall = w === 1 ? pk(r, ['#b9a892', '#a99c8c', '#b3aa9a']) : pk(r, APT), H = ri(r, 62, 84), H2 = ri(r, 30, 48), band = w > 1 ? '#f4f3ef' : null;
    block(a, 0.1, 0.12, 0.6, 0.86, 0, H, wall, { fh: 9, ca: 3, cb: 4, band: band }); base(a, 0.1, 0.12, 0.6, 0.86, 8, wall); door(a, 0.35, 0.86, 0.1, 7, '#35414d');
    a.box(0.22, 0.3, 0.42, 0.5, H + 2, H + 8, '#9aa0a6');
    block(a, 0.6, 0.24, 0.9, 0.86, 0, H2, sh(wall, 0.96), { fh: 9, ca: 2, cb: 3, band: band, capTop: '#7fb060' }); base(a, 0.6, 0.24, 0.9, 0.86, 8, wall);
    a.box(0.64, 0.3, 0.7, 0.36, H2 + 2, H2 + 5, '#c98a3a'); a.box(0.78, 0.5, 0.86, 0.58, H2 + 2, H2 + 4.5, '#3f8c3f'); a.light(0.75, 0.6, H2 + 6, 'lamp', 0.6);
    a.bush(0.3, 0.95); a.bush(0.8, 0.95, '#d9668a', 0.6);
  }
  function R3c(a, r, w) { // slim balcony tower with a penthouse
    a.lot('#bbb8ad'); a.gq(0, 0, 0.16, 1, '#6db552'); a.tree(0.08, 0.2, 2, 0.6); a.tree(0.08, 0.7, 6, 0.6);
    const wall = w === 1 ? pk(r, ['#b9a892', '#a99c8c']) : pk(r, APT.concat(['#e8e2d4', '#d2dade'])), H = ri(r, 7, 9) * 8.5 + 4, bc = pk(r, ['#f4f3ef', '#d9dde0', '#8fb3c4', '#c9b89a', '#9fc48f']);
    block(a, 0.22, 0.18, 0.86, 0.82, 0, H, wall, { fh: 8.5, ca: 3, cb: 3, band: bc, bandB: true }); base(a, 0.22, 0.18, 0.86, 0.82, 8, wall); door(a, 0.54, 0.82, 0.1, 7, '#35414d'); a.box(0.46, 0.82, 0.62, 0.9, 7, 8.2, '#d6d6d2'); a.light(0.54, 0.88, 6, 'lamp', 0.6);
    if (w > 1) { a.box(0.32, 0.28, 0.72, 0.68, H + 2, H + 9, sh(wall, 1.04)); a.win('A', 0.34, 0.7, 0.68, H + 3, H + 8, 2, 1, { glass: '#7ec0dc', mx: 0.08, mz: 0.1 }); a.win('B', 0.3, 0.66, 0.72, H + 3, H + 8, 2, 1, { glass: '#7ec0dc', mx: 0.08, mz: 0.1 }); a.box(0.3, 0.26, 0.74, 0.7, H + 9, H + 10, '#e9e9e6'); }
    else roofKit(a, r, 0.3, 0.25, 0.8, 0.75, H + 2, 3);
    a.bush(0.3, 0.94); a.bush(0.8, 0.94);
  }
  function R3d(a, r, w) { // L-shaped block around a small court
    a.lot('#bbb8ad'); const wall = w === 1 ? pk(r, BRICK) : pk(r, APT), H = ri(r, 52, 76), H2 = H - ri(r, 0, 2) * 9, band = w === 3 ? '#f4f3ef' : null;
    block(a, 0.08, 0.1, 0.92, 0.46, 0, H, wall, { fh: 9, ca: 4, cb: 2, band: band }); base(a, 0.08, 0.1, 0.92, 0.46, 8, wall);
    a.gq(0.08, 0.5, 0.54, 0.92, '#7fb060'); a.tree(0.2, 0.62, ri(r, 1, 2), 0.7); a.tree(0.4, 0.8, 6, 0.65); a.bush(0.16, 0.86, '#d9668a', 0.6); a.post(0.44, 0.58, 11);
    block(a, 0.56, 0.46, 0.92, 0.9, 0, H2, wall, { fh: 9, ca: 2, cb: 3, band: band }); base(a, 0.56, 0.46, 0.92, 0.9, 8, wall); door(a, 0.74, 0.9, 0.1, 7, '#35414d');
    roofKit(a, r, 0.12, 0.14, 0.86, 0.4, H + 2, 2); a.box(0.64, 0.54, 0.8, 0.7, H2 + 2, H2 + 8, '#9aa0a6');
  }
  function R3e(a, r, w) { // brick walk-up with a pitched roof
    a.lot('#bbb8ad'); a.gq(0, 0.9, 1, 1, '#c6c2b6'); a.tree(0.06, 0.06, 2, 0.6); a.tree(0.94, 0.06, 2, 0.6);
    const wall = pk(r, BRICK), roof = pk(r, ROOF), H = ri(r, 4, 6) * 9 + 2, fl = Math.floor((H - 9) / 9);
    a.box(0.12, 0.16, 0.88, 0.84, 0, H, wall); base(a, 0.12, 0.16, 0.88, 0.84, 9, pk(r, STONE));
    a.win('A', 0.14, 0.86, 0.84, 10, H - 1, 4, fl); a.win('B', 0.18, 0.82, 0.88, 10, H - 1, 4, fl); a.win('A', 0.14, 0.86, 0.84, 2, 8, 4, 1, { mx: 0.25 }); a.win('B', 0.18, 0.82, 0.88, 2, 8, 4, 1, { mx: 0.25 });
    for (let f = 0; f <= fl; f++) a.face('A', 0.12, 0.88, 0.84, 9 + f * (H - 10) / fl, 9.9 + f * (H - 10) / fl, '#e9e2d0');
    door(a, 0.5, 0.84, 0.1, 8, '#3d3028'); a.face('A', 0.42, 0.58, 0.84, 8, 9.6, '#f1efe6'); a.light(0.5, 0.88, 8.5, 'lamp', 0.6);
    a.gable(0.09, 0.13, 0.91, 0.87, H, ri(r, 12, 16), roof, wall, r() < 0.5 ? 'u' : 'v'); chimney(a, 0.24, 0.3, H + 4, 9); chimney(a, 0.7, 0.3, H + 4, 9);
  }
  function R4b(a, r, w) { // three point towers in a park
    a.lot('#7fb060'); a.gq(0.9, 0, 1.06, 2, '#cfc8b4'); a.gq(0, 0.98, 2, 1.1, '#cfc8b4');
    const cols = [pk(r, APT), pk(r, APT), pk(r, APT)], band = w > 1 ? '#f2f1ec' : null, hs = [ri(r, 96, 150), ri(r, 84, 140), ri(r, 100, 160)];
    const tw = function (u0, v0, u1, v1, H, wl) { block(a, u0, v0, u1, v1, 0, H, wl, { fh: 9, ca: 3, cb: 3, band: band, bandB: r() < 0.5 }); base(a, u0, v0, u1, v1, 8, wl); door(a, (u0 + u1) / 2, v1, 0.1, 7, '#35414d'); a.box(u0 + 0.15, v0 + 0.15, u0 + 0.38, v0 + 0.38, H + 2, H + 9, '#9aa0a6'); };
    a.tree(0.1, 0.1, 2, 0.8); tw(0.2, 0.16, 0.84, 0.8, hs[0], cols[0]); a.tree(1.9, 0.14, 6, 0.8);
    tw(1.16, 0.3, 1.8, 0.94, hs[1], cols[1]); a.tree(0.16, 1.3, 1, 0.9); a.tree(0.34, 1.7, 2, 0.9);
    tw(0.56, 1.12, 1.2, 1.76, hs[2], cols[2]); a.tree(1.5, 1.3, 2, 0.9); a.tree(1.8, 1.7, 6, 0.9); a.bush(1.4, 1.84, '#d9668a', 0.7); a.post(1.0, 1.9, 12); a.post(1.3, 1.04, 12);
  }
  function R4c(a, r, w) { // terraced block stepping down to the street
    a.lot('#bdbab0'); const wall = pk(r, ['#e4e1d8', '#d5dadd', '#e6dccb', '#cfd6d2', '#d8d2c4']), gl = pk(r, GLASS), n = ri(r, 4, 5), fh = ri(r, 24, 30), d = 1.3 / n;
    a.tree(0.08, 0.08, 2, 0.7); a.tree(1.92, 0.08, 2, 0.7);
    for (let k = 0; k < n; k++) {
      const v1 = 1.78 - k * d, z0 = k * fh, z1 = z0 + fh; a.box(0.16, 0.16, 1.84, v1, z0, z1, wall);
      a.win('A', 0.18, 1.82, v1, z0 + 1, z1 - 1, 9, 3, { glass: gl, mx: 0.12, mz: 0.2 }); a.win('B', 0.18, v1 - 0.02, 1.84, z0 + 1, z1 - 1, Math.max(1, Math.round((v1 - 0.16) / 0.2)), 3, { glass: gl, mx: 0.14, mz: 0.2 });
      if (k < n - 1) { a.gq(0.16, v1 - d, 1.84, v1, '#d8d2c0', z1); a.gq(0.2, v1 - 0.09, 1.8, v1 - 0.02, '#6db552', z1 + 0.3); for (let q = 0; q < 5; q++) a.box(0.3 + q * 0.34, v1 - 0.09, 0.36 + q * 0.34, v1 - 0.03, z1, z1 + 3, q % 2 ? '#3f8c3f' : '#d9668a'); }
      else { a.box(0.16, 0.16, 1.84, v1, z1, z1 + 2, sh(wall, 0.85), '#8f9399'); roofKit(a, r, 0.3, 0.2, 1.7, v1 - 0.1, z1 + 2, 3); }
    }
    door(a, 1.0, 1.78, 0.14, 8, '#35414d'); a.light(1.0, 1.84, 9, 'lamp', 0.8); a.bush(0.2, 1.9); a.bush(1.8, 1.9, '#d9668a', 0.7);
  }
  function R4d(a, r, w) { // perimeter block with an inner courtyard
    a.lot('#bdbab0'); const wall = w === 1 ? pk(r, BRICK) : pk(r, APT.concat(WALL)), roof = pk(r, ROOF), H = ri(r, 5, 7) * 9, tiled = r() < 0.55, band = w === 3 ? '#f2f1ec' : null;
    const wing = function (u0, v0, u1, v1, axis) { block(a, u0, v0, u1, v1, 0, H, wall, { fh: 9, band: band, cap: !tiled }); base(a, u0, v0, u1, v1, 8, wall); if (tiled) a.gable(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, 11, roof, wall, axis); };
    wing(0.14, 0.14, 1.86, 0.56, 'u'); wing(0.14, 0.56, 0.56, 1.86, 'v');
    a.gq(0.56, 0.56, 1.44, 1.44, '#7fb060'); a.tree(0.86, 0.8, 2, 0.9); a.tree(1.2, 1.1, 6, 0.9); a.tree(0.8, 1.24, 1, 0.8); a.post(1.0, 1.0, 12);
    wing(1.44, 0.56, 1.86, 1.86, 'v'); wing(0.56, 1.5, 0.92, 1.86, 'u'); wing(1.1, 1.5, 1.44, 1.86, 'u');
    a.gq(0.92, 1.5, 1.1, 2, '#cfc8b4'); a.light(1.0, 1.84, 9, 'lamp', 0.8);
  }
  function R4e(a, r, w) { // slab on a podium with a pool deck
    a.lot('#bdbab0'); const wall = pk(r, APT), gl = pk(r, GLASS), H = ri(r, 12, 16) * 9 + 16, pod = sh(wall, 0.9);
    a.tree(0.08, 0.08, 2, 0.7);
    a.box(0.14, 0.14, 1.86, 1.86, 0, 15, pod); a.win('A', 0.16, 1.84, 1.86, 2, 13, 8, 1, { glass: '#7ec0dc', mx: 0.1, mz: 0.1 }); a.win('B', 0.16, 1.84, 1.86, 2, 13, 8, 1, { glass: '#7ec0dc', mx: 0.1, mz: 0.1 }); a.gq(0.14, 0.14, 1.86, 1.86, '#d8d2c0', 15.1);
    block(a, 0.24, 0.22, 1.76, 0.92, 15, H, wall, { fh: 9, ca: 8, cb: 3, band: '#f2f1ec', glass: gl }); a.box(0.4, 0.34, 0.66, 0.6, H + 2, H + 10, '#9aa0a6'); roofKit(a, r, 0.8, 0.3, 1.7, 0.84, H + 2, 3);
    a.gq(0.5, 1.12, 1.5, 1.62, '#e8e4d8', 15.2); a.gq(0.56, 1.18, 1.44, 1.56, '#5fc3e8', 15.3, 'rgba(255,255,255,0.6)');
    for (let k = 0; k < 4; k++) a.box(0.28 + (k % 2) * 1.3, 1.16 + ((k / 2) | 0) * 0.3, 0.36 + (k % 2) * 1.3, 1.24 + ((k / 2) | 0) * 0.3, 15, 17.5, k % 2 ? '#d9668a' : '#3f8c3f');
    a.light(1.0, 1.4, 18, 'cyan', 0.8); a.light(1.0, 1.9, 9, 'lamp', 0.8);
  }
  function R5b(a, r, w) { // setback tower with a crown
    a.lot('#c4c1b8'); a.gq(0.06, 0.06, 1.94, 0.26, '#6db552'); a.tree(0.2, 0.14, 2, 0.8); a.tree(1.8, 0.14, 6, 0.8);
    const wall = pk(r, ['#e4e1d8', '#d5dadd', '#e6dccb', '#cfd6d2', '#d9cdb4']), gl = pk(r, GLASS), H = ri(r, 200, 236), o = { fh: 8.5, glass: gl, mx: 0.14, band: '#f6f5f0', step: 2 };
    a.box(0.22, 0.3, 1.8, 1.8, 0, 16, sh(wall, 0.86)); a.win('A', 0.25, 1.77, 1.8, 2, 14, 7, 1, { glass: '#7ec0dc', mx: 0.1 }); a.win('B', 0.34, 1.76, 1.8, 2, 14, 7, 1, { glass: '#7ec0dc', mx: 0.1 });
    block(a, 0.4, 0.46, 1.62, 1.64, 16, H * 0.52, wall, Object.assign({ ca: 6, cb: 6 }, o)); block(a, 0.54, 0.6, 1.48, 1.5, H * 0.52 + 2, H * 0.8, wall, Object.assign({ ca: 5, cb: 5 }, o)); block(a, 0.68, 0.74, 1.34, 1.36, H * 0.8 + 2, H, wall, Object.assign({ ca: 3, cb: 3 }, o));
    const cr = pk(r, ['#59636f', '#3f6b5a', '#8c5a43', '#3f4b57', '#b89b5e']); if (r() < 0.6) { a.pyr(0.7, 0.76, 1.32, 1.34, H + 2, 24, cr); a.seg([1.01, 1.05, H + 26], [1.01, 1.05, H + 44], '#d0d4d8', 1.2); } else { a.box(0.82, 0.88, 1.2, 1.22, H + 2, H + 14, cr); a.dome(1.01, 1.05, 0.2, H + 14, cr, 0.9); a.seg([1.01, 1.05, H + 26], [1.01, 1.05, H + 40], '#d0d4d8', 1.2); }
    a.bush(0.15, 1.85); a.bush(0.14, 1.5, '#d9668a', 0.7);
  }
  function R5c(a, r, w) { // twin towers joined by a sky bridge
    a.lot('#c4c1b8'); a.gq(0.06, 1.3, 0.9, 1.94, '#6db552'); a.tree(0.2, 1.5, 2, 0.9); a.tree(0.5, 1.8, 6, 0.9); a.tree(0.14, 0.14, 2, 0.8);
    const wall = pk(r, APT.concat(['#e4e1d8', '#d5dadd'])), gl = pk(r, GLASS), H1 = ri(r, 210, 268), H2 = ri(r, 180, 240), o = { fh: 8.5, glass: gl, mx: 0.14, ca: 4, cb: 4, band: r() < 0.5 ? '#f6f5f0' : null, step: 2 }, bz = ri(r, 90, 150);
    a.box(0.2, 0.2, 1.8, 1.24, 0, 14, sh(wall, 0.86)); a.win('A', 0.22, 1.78, 1.24, 2, 12, 8, 1, { glass: '#7ec0dc', mx: 0.1 }); a.win('B', 0.22, 1.22, 1.8, 2, 12, 5, 1, { glass: '#7ec0dc', mx: 0.1 });
    block(a, 0.28, 0.3, 0.98, 1.0, 14, H1, wall, o); a.box(0.5, 0.52, 0.76, 0.78, H1 + 2, H1 + 10, '#9aa0a6'); a.seg([0.63, 0.65, H1 + 10], [0.63, 0.65, H1 + 22], '#d0d4d8', 1.2);
    a.box(0.98, 0.56, 1.1, 0.84, bz, bz + 9, sh(wall, 0.9)); a.win('A', 0.98, 1.1, 0.84, bz + 1.5, bz + 7.5, 1, 1, { glass: gl, mx: 0.06, mz: 0.05 });
    block(a, 1.08, 0.44, 1.78, 1.14, 14, H2, wall, o); roofKit(a, r, 1.14, 0.5, 1.7, 1.06, H2 + 2, 3);
    a.gq(1.0, 1.4, 1.9, 1.9, '#e8e4d8'); a.gq(1.06, 1.46, 1.84, 1.84, '#5fc3e8'); a.light(1.45, 1.65, 4, 'cyan', 0.8);
  }
  function R5d(a, r, w) { // round tower
    a.lot('#c4c1b8'); a.gq(0.06, 0.06, 1.94, 0.3, '#6db552'); a.tree(0.2, 0.15, 2, 0.8); a.tree(1.8, 0.16, 6, 0.8); a.tree(0.16, 1.8, 2, 0.8);
    const wall = pk(r, ['#e4e1d8', '#d5dadd', '#e6dccb', '#cfd6d2', '#f0eee8']), gl = pk(r, GLASS), H = ri(r, 190, 250), rad = rf(r, 0.5, 0.6);
    a.cyl(1.0, 1.0, 0.8, 0, 14, sh(wall, 0.88)); cylTower(a, 1.0, 1.0, 0.78, 1, 13, sh(wall, 0.88), '#7ec0dc', 12);
    cylTower(a, 1.0, 1.0, rad, 14, H, wall, gl, 8.5);
    if (r() < 0.5) { a.cyl(1.0, 1.0, rad * 1.08, H, H + 3, sh(wall, 0.9)); cylTower(a, 1.0, 1.0, rad * 0.62, H + 3, H + 22, wall, gl, 9); a.cyl(1.0, 1.0, rad * 0.68, H + 22, H + 24, sh(wall, 0.9)); a.seg([1, 1, H + 24], [1, 1, H + 40], '#d0d4d8', 1.2); }
    else { a.cyl(1.0, 1.0, rad * 1.06, H, H + 2.5, sh(wall, 0.9), '#6f7780'); a.cyl(1.0, 1.0, rad * 0.5, H + 2.5, H + 3.5, '#8f959c', '#59616a'); a.seg([0.86, 1, H + 3.6], [1.14, 1, H + 3.6], '#f2efe6', 1.6); a.seg([1, 0.86, H + 3.6], [1, 1.14, H + 3.6], '#f2efe6', 1.6); a.p(1, 1, H + 6); }
    a.bush(1.8, 1.8); a.bush(1.6, 1.9, '#d9668a', 0.7);
  }
  function R5e(a, r, w) { // thin slab with a sky garden and a lower wing
    a.lot('#c4c1b8'); a.gq(0.06, 0.06, 1.94, 0.34, '#6db552'); a.tree(0.2, 0.18, 2, 0.8); a.tree(1.0, 0.16, 6, 0.8); a.tree(1.8, 0.18, 2, 0.8);
    const wall = pk(r, ['#e4e1d8', '#d5dadd', '#e6dccb', '#cfd6d2']), gl = pk(r, GLASS), H = ri(r, 216, 268), gz = Math.round(H * rf(r, 0.45, 0.62)), o = { fh: 8.5, glass: gl, mx: 0.12, ca: 8, cb: 3, band: '#f6f5f0', step: ri(r, 1, 3) };
    a.box(0.2, 0.4, 1.8, 1.7, 0, 15, sh(wall, 0.86)); a.win('A', 0.22, 1.78, 1.7, 2, 13, 8, 1, { glass: '#7ec0dc', mx: 0.1 }); a.win('B', 0.42, 1.68, 1.8, 2, 13, 6, 1, { glass: '#7ec0dc', mx: 0.1 });
    block(a, 0.28, 0.46, 1.72, 1.02, 15, gz, wall, Object.assign({ cap: false }, o));
    a.gq(0.28, 0.46, 1.72, 1.02, '#7fb060', gz + 0.2); for (let k = 0; k < 5; k++) { a.seg([0.34 + k * 0.33, 1.0, gz], [0.34 + k * 0.33, 1.0, gz + 12], sh(wall, 0.8), 2); a.box(0.44 + k * 0.33, 0.9, 0.52 + k * 0.33, 0.98, gz, gz + 5, k % 2 ? '#3f8c3f' : '#6aa63f'); } a.light(1.0, 1.0, gz + 6, 'lamp', 1.2);
    block(a, 0.28, 0.46, 1.72, 1.02, gz + 12, H, wall, o); a.box(0.5, 0.56, 0.8, 0.86, H + 2, H + 11, '#9aa0a6'); roofKit(a, r, 0.9, 0.5, 1.66, 0.96, H + 2, 3);
    const H2 = ri(r, 60, 100); block(a, 1.16, 1.02, 1.72, 1.62, 15, H2, sh(wall, 0.97), { fh: 8.5, glass: gl, mx: 0.14, ca: 3, cb: 3, capTop: '#7fb060' });
    a.bush(0.15, 1.85); a.bush(0.5, 1.9, '#d9668a', 0.7);
  }
  F[1][1].push(R1b, R1c, R1d, R1e); F[1][2].push(R2b, R2c, R2d, R2e); F[1][3].push(R3b, R3c, R3d, R3e); F[1][4].push(R4b, R4c, R4d, R4e); F[1][5].push(R5b, R5c, R5d, R5e);
  S.zextra = { STONE: STONE, DARK: DARK, METAL: METAL, BOLD: BOLD, CONT: CONT, lawn: lawn, base: base, door: door, chimney: chimney, umbrella: umbrella, stepGable: stepGable, shed: shed, truck: truck, containers: containers, solar: solar, tank: tank, silo: silo, sphere: sphere, stack: stack, hyper: hyper };
})();
(function () {
  const S = M.Sprites, K = S.kit, pk = K.pk, sh = M.shade, F = S.zforms, X = S.zextra, K3 = S.kit3, block = K3.block, cylTower = K3.cylTower, ri = K3.ri, rf = K3.rf;
  const WALL = K.WALL, ROOF = K.ROOF, BRICK = K.BRICK, APT = K.APT, GLASS = K.GLASS, AWN = K.AWN, CARCOL = S.CARCOL, roofKit = K.roofKit, parking = K.parking;
  const STONE = X.STONE, DARK = X.DARK, METAL = X.METAL, BOLD = X.BOLD, base = X.base, door = X.door, chimney = X.chimney, umbrella = X.umbrella, stepGable = X.stepGable, shed = X.shed, truck = X.truck, containers = X.containers, solar = X.solar, tank = X.tank, silo = X.silo, sphere = X.sphere, stack = X.stack, hyper = X.hyper;
  function awn(a, a0, a1, v, z, col) { a.poly([[a0, v, z], [a1, v, z], [a1, v + 0.1, z - 3.2], [a0, v + 0.1, z - 3.2]], col, 'rgba(0,0,0,0.25)'); const n = Math.max(2, Math.round((a1 - a0) / 0.1)); for (let k = 0; k < n; k += 2) { const b0 = a0 + (a1 - a0) * k / n, b1 = a0 + (a1 - a0) * (k + 1) / n; a.poly([[b0, v, z], [b1, v, z], [b1, v + 0.1, z - 3.2], [b0, v + 0.1, z - 3.2]], 'rgba(255,255,255,0.8)', false); } }
  function sign(a, u0, u1, v, z0, z1, col) { a.box(u0, v - 0.04, u1, v, z0, z1, col); a.face('A', u0 + 0.04, u1 - 0.04, v, z0 + (z1 - z0) * 0.25, z1 - (z1 - z0) * 0.25, '#fff6dc'); }
  const SHOPGL = { glass: '#86c4de', mx: 0.08, mz: 0.06 };

  // =================== commercial ===================
  function C1b(a, r) { // café with a terrace
    a.lot('#c9c4b6'); const wall = pk(r, WALL), ac = pk(r, AWN), ac2 = pk(r, AWN);
    a.tree(0.9, 0.1, 2, 0.7);
    a.box(0.12, 0.14, 0.72, 0.58, 0, 13, wall); a.win('A', 0.14, 0.7, 0.58, 2, 10, 3, 1, SHOPGL); a.win('B', 0.18, 0.54, 0.72, 3, 10, 2, 1, SHOPGL); door(a, 0.42, 0.58, 0.08, 8.5, '#3d3028');
    a.box(0.12, 0.14, 0.72, 0.58, 13, 14.5, sh(wall, 0.85), '#93979c'); sign(a, 0.2, 0.64, 0.56, 14.5, 20, ac); roofKit(a, r, 0.2, 0.2, 0.66, 0.44, 14.5, 1);
    awn(a, 0.12, 0.72, 0.58, 12, ac); a.light(0.42, 0.66, 9, 'lamp', 0.9);
    a.gq(0.1, 0.66, 0.92, 0.96, '#b89f7a'); for (let k = 0; k < 3; k++) { const u = 0.24 + k * 0.26, v = 0.8 + (k % 2) * 0.06; umbrella(a, u, v, k % 2 ? ac2 : '#f2efe6'); a.dot(u - 0.07, v + 0.03, 1, 1.2, '#6b4a34'); a.dot(u + 0.07, v + 0.03, 1, 1.2, '#6b4a34'); }
    a.box(0.8, 0.5, 0.9, 0.6, 0, 4, '#3c9a5a'); a.bush(0.85, 0.55, '#d9668a', 0.6);
  }
  function C1c(a, r) { // drive-in diner with a canopy
    a.lot('#6a6d72'); const wall = pk(r, ['#f0eee8', '#e4e7ea', '#f2e6c8']), ac = pk(r, BOLD);
    a.box(0.16, 0.14, 0.84, 0.54, 0, 11, wall); a.face('A', 0.16, 0.84, 0.54, 8.5, 11, ac); a.face('B', 0.14, 0.54, 0.84, 8.5, 11, ac);
    a.win('A', 0.18, 0.82, 0.54, 2, 8, 4, 1, SHOPGL); a.win('B', 0.18, 0.5, 0.84, 2, 8, 2, 1, SHOPGL); a.box(0.16, 0.14, 0.84, 0.54, 11, 12.2, '#e9e9e6', '#b9bdc1');
    a.box(0.4, 0.26, 0.6, 0.34, 12.2, 24, ac); a.face('A', 0.42, 0.58, 0.34, 15, 22, '#fff6dc'); a.light(0.5, 0.36, 19, 'lamp', 1.1);
    a.seg([0.2, 0.86, 0], [0.2, 0.86, 10], '#d8d8d8', 1.6); a.seg([0.8, 0.86, 0], [0.8, 0.86, 10], '#d8d8d8', 1.6); a.box(0.12, 0.54, 0.88, 0.92, 10, 11.6, '#f4f3ef', ac); a.light(0.35, 0.74, 9, 'flood', 0.35); a.light(0.65, 0.74, 9, 'flood', 0.35);
    a.car(0.36, 0.74, pk(r, CARCOL), true); if (r() < 0.6) a.car(0.68, 0.74, pk(r, CARCOL), true);
    a.box(0.02, 0.9, 0.08, 0.96, 0, 18, '#8a8f96'); a.box(0.0, 0.86, 0.1, 0.98, 18, 25, ac);
  }
  function C1d(a, r) { // two small shops side by side
    a.lot('#bfbcb2'); const w1 = pk(r, WALL), w2 = pk(r, BRICK.concat(WALL)), a1 = pk(r, AWN), a2 = pk(r, AWN), roof = pk(r, ROOF), h1 = ri(r, 11, 14), h2 = ri(r, 14, 19);
    a.box(0.1, 0.18, 0.5, 0.76, 0, h1, w1); a.win('A', 0.12, 0.48, 0.76, 2, 9, 2, 1, SHOPGL); a.gable(0.08, 0.16, 0.51, 0.78, h1, 8, roof, w1, 'v'); a.win('A', 0.25, 0.35, 0.78, h1 + 1, h1 + 4.5, 1, 1, { mx: 0.1, mz: 0.1 }); awn(a, 0.1, 0.5, 0.76, 10, a1);
    a.box(0.5, 0.18, 0.9, 0.76, 0, h2, w2); a.win('A', 0.52, 0.88, 0.76, 2, 9, 2, 1, SHOPGL); if (h2 > 15) a.win('A', 0.52, 0.88, 0.76, 11.5, h2 - 1, 2, 1); a.win('B', 0.22, 0.72, 0.9, 3, h2 - 2, 2, h2 > 15 ? 2 : 1);
    a.box(0.5, 0.18, 0.9, 0.76, h2, h2 + 1.5, sh(w2, 0.85), '#93979c'); sign(a, 0.54, 0.86, 0.74, h2 + 1.5, h2 + 6, a2); awn(a, 0.5, 0.9, 0.76, 10.5, a2);
    a.light(0.3, 0.84, 8, 'lamp', 0.7); a.light(0.7, 0.84, 8, 'lamp', 0.7); a.box(0.06, 0.84, 0.14, 0.92, 0, 4.5, '#3c9a5a');
  }
  function C1e(a, r) { // market hall with stalls
    a.lot('#c9c4b6'); const wall = pk(r, WALL), roof = pk(r, ['#a84a3b', '#3f6b5a', '#59636f', '#2f6fb0', '#9d6c40']);
    a.box(0.1, 0.14, 0.9, 0.62, 0, 10, wall); for (let k = 0; k < 4; k++) a.face('A', 0.14 + k * 0.19, 0.29 + k * 0.19, 0.62, 0, 8, '#3d3830'); a.win('B', 0.18, 0.58, 0.9, 3, 8.5, 2, 1);
    a.gable(0.07, 0.11, 0.93, 0.65, 10, 11, roof, wall, 'u'); a.box(0.4, 0.34, 0.6, 0.42, 20, 24, sh(roof, 0.9)); a.light(0.5, 0.64, 8, 'lamp', 1.1);
    for (let k = 0; k < 3; k++) { const u = 0.14 + k * 0.27, c = pk(r, AWN); a.box(u, 0.76, u + 0.2, 0.88, 0, 3.5, '#b08a4f'); for (let q = 0; q < 3; q++) a.dot(u + 0.04 + q * 0.06, 0.82, 4.2, 1.2, pk(r, ['#d94f4f', '#e8d06a', '#5fae5f', '#e88a3a'])); a.seg([u, 0.9, 0], [u, 0.9, 9], '#8a8a8a', 0.9); a.seg([u + 0.2, 0.9, 0], [u + 0.2, 0.9, 9], '#8a8a8a', 0.9); awn(a, u - 0.02, u + 0.22, 0.74, 10.5, c); }
  }
  function C2b(a, r) { // row of canal houses with stepped gables
    a.lot('#c2bfb5'); const n = 3, du = 0.8 / n;
    for (let k = 0; k < n; k++) {
      const wall = pk(r, BRICK.concat(['#7f4a3a', '#c9b89a', '#5b4a44'])), h = ri(r, 28, 40), a0 = 0.1 + k * du, a1 = a0 + du - 0.01, fl = Math.round((h - 10) / 8), roof = pk(r, ROOF), gh = ri(r, 9, 12);
      a.box(a0, 0.16, a1, 0.76, 0, h, wall); a.win('A', a0 + 0.02, a1 - 0.02, 0.76, 1.5, 8, 1, 1, SHOPGL); a.win('A', a0 + 0.02, a1 - 0.02, 0.76, 10.5, h - 0.5, 2, fl, { mx: 0.18 });
      for (let f = 0; f <= fl; f++) a.face('A', a0, a1, 0.76, 9.4 + f * (h - 10) / fl, 10.1 + f * (h - 10) / fl, '#efe8d8');
      if (k === n - 1) a.win('B', 0.2, 0.72, a1, 10.5, h - 0.5, 3, fl);
      a.gable(a0, 0.16, a1, 0.76, h, gh, roof, wall, 'v');
      const kind = ri(r, 0, 2); if (kind === 0) stepGable(a, a0, a1, 0.762, h, gh + 3, wall, 4); else if (kind === 1) { a.face('A', a0 + du * 0.2, a1 - du * 0.2, 0.762, h, h + gh + 2, wall, 'rgba(0,0,0,0.18)'); a.face('A', a0 + du * 0.14, a1 - du * 0.14, 0.764, h + gh + 2, h + gh + 3.4, '#efe8d8'); } else a.win('A', a0 + du * 0.36, a1 - du * 0.36, 0.762, h + 1.5, h + 5.5, 1, 1, { mx: 0.05, mz: 0.05 });
      if (r() < 0.6) awn(a, a0, a1, 0.76, 9.4, pk(r, AWN));
    }
    a.light(0.3, 0.84, 8, 'lamp', 0.8); a.light(0.7, 0.84, 8, 'lamp', 0.8); a.tree(0.06, 0.94, 2, 0.5); a.tree(0.94, 0.94, 2, 0.5);
  }
  function C2c(a, r) { // glass-fronted store with a roof sign
    a.lot('#c2bfb5'); const wall = pk(r, ['#f0eee8', '#e4e7ea', '#3d4852', '#d9d2c4', '#566170']), ac = pk(r, BOLD), gl = pk(r, GLASS), H = ri(r, 26, 34);
    a.box(0.1, 0.14, 0.9, 0.76, 0, H, wall); a.win('A', 0.13, 0.87, 0.76, 1.5, H - 5, 4, 2, { glass: gl, mx: 0.05, mz: 0.06 }); a.win('B', 0.18, 0.72, 0.9, 1.5, H - 5, 3, 2, { glass: gl, mx: 0.06, mz: 0.06 });
    a.face('A', 0.1, 0.9, 0.76, H - 4, H - 0.5, ac); a.face('B', 0.14, 0.76, 0.9, H - 4, H - 0.5, ac); a.box(0.1, 0.14, 0.9, 0.76, H, H + 1.5, sh(wall, 0.85), '#93979c');
    sign(a, 0.22, 0.78, 0.72, H + 1.5, H + 10, ac); a.light(0.5, 0.74, H + 6, 'lamp', 1.2); roofKit(a, r, 0.16, 0.2, 0.8, 0.5, H + 1.5, 2);
    a.box(0.36, 0.76, 0.64, 0.88, 9, 10.2, '#f4f3ef'); a.seg([0.38, 0.87, 0], [0.38, 0.87, 9], '#d8d8d8', 1.2); a.seg([0.62, 0.87, 0], [0.62, 0.87, 9], '#d8d8d8', 1.2); a.light(0.5, 0.84, 8, 'flood', 0.3);
    a.box(0.08, 0.86, 0.16, 0.94, 0, 4.5, '#3c9a5a'); a.box(0.84, 0.86, 0.92, 0.94, 0, 4.5, '#3c9a5a');
  }
  function C2d(a, r) { // corner building with a turret
    a.lot('#c2bfb5'); const wall = pk(r, WALL.concat(STONE)), roof = pk(r, ['#3f4b57', '#59636f', '#3f6b5a', '#6d3b34', '#7f4a3a']), H = ri(r, 28, 36), fl = Math.round((H - 10) / 8);
    a.box(0.12, 0.14, 0.86, 0.76, 0, H, wall); base(a, 0.12, 0.14, 0.86, 0.76, 9.5, wall); a.win('A', 0.14, 0.7, 0.76, 1.5, 8.5, 3, 1, SHOPGL); a.win('B', 0.18, 0.62, 0.86, 1.5, 8.5, 2, 1, SHOPGL);
    a.win('A', 0.14, 0.72, 0.76, 11, H - 1, 3, fl); a.win('B', 0.16, 0.62, 0.86, 11, H - 1, 3, fl); a.face('A', 0.12, 0.86, 0.76, H - 1.2, H, '#f1efe6'); a.face('B', 0.14, 0.76, 0.86, H - 1.2, H, '#f1efe6');
    a.box(0.14, 0.16, 0.84, 0.74, H, H + 6, roof); a.box(0.2, 0.22, 0.78, 0.68, H + 6, H + 7, sh(roof, 0.8), '#8f9399'); for (let k = 0; k < 3; k++) a.win('A', 0.2 + k * 0.17, 0.3 + k * 0.17, 0.74, H + 1, H + 5, 1, 1, { mx: 0.1, mz: 0.1 });
    a.cyl(0.8, 0.7, 0.115, 0, H + 8, sh(wall, 1.03)); cylTower(a, 0.8, 0.7, 0.117, 10, H + 6, sh(wall, 1.03), '#35526e', 8.5);
    if (r() < 0.5) a.pyr(0.67, 0.57, 0.93, 0.83, H + 8, 14, roof); else a.dome(0.8, 0.7, 0.125, H + 8, pk(r, ['#3f8f7a', '#b89b5e', '#59636f']), 1.0);
    a.p(0.8, 0.7, H + 22); a.light(0.5, 0.84, 8, 'lamp', 0.8);
  }
  function C2e(a, r) { // cinema with a marquee
    a.lot('#c2bfb5'); const wall = pk(r, ['#7a2f3a', '#2f4a6b', '#e6dccb', '#3d4852', '#6b3f6f']), ac = pk(r, ['#d98b2b', '#c8463c', '#1f8f96', '#d1b03a']), H = ri(r, 26, 32);
    a.box(0.1, 0.12, 0.9, 0.74, 0, H, wall); a.face('A', 0.1, 0.9, 0.74, H - 3, H - 1, ac); a.face('B', 0.12, 0.74, 0.9, H - 3, H - 1, ac);
    for (let k = 0; k < 3; k++) a.face('A', 0.16 + k * 0.25, 0.32 + k * 0.25, 0.74, 13, H - 6, pk(r, ['#f2e6c8', '#e8c8a0', '#c8dfe8']), 'rgba(0,0,0,0.3)');
    a.win('A', 0.2, 0.8, 0.74, 1.5, 8.5, 4, 1, SHOPGL); a.win('B', 0.2, 0.68, 0.9, 14, H - 6, 2, 1, { dark: true });
    a.box(0.1, 0.12, 0.9, 0.74, H, H + 1.5, sh(wall, 0.85), '#93979c'); roofKit(a, r, 0.2, 0.2, 0.8, 0.5, H + 1.5, 2);
    a.box(0.16, 0.74, 0.84, 0.9, 9.5, 12.5, '#fff6dc', '#f4f3ef'); a.face('A', 0.16, 0.84, 0.9, 9.5, 10.3, ac); for (let k = 0; k < 4; k++) a.light(0.22 + k * 0.19, 0.9, 10, 'lamp', 0.55);
    a.box(0.46, 0.74, 0.54, 0.8, 12.5, H + 14, ac); a.face('A', 0.475, 0.525, 0.8, 16, H + 11, '#fff6dc'); a.light(0.5, 0.82, H + 4, 'lamp', 1.2);
  }
  function C3b(a, r, w, v) { // office with a set-back upper part
    a.lot('#c4c2ba'); const gl = pk(r, GLASS), fr = pk(r, DARK.concat(['#d9dde0', '#8a8f96'])), H = ri(r, 88, 114), H1 = Math.round(H * rf(r, 0.4, 0.62)), o = { fh: 8, glass: gl, mx: 0.08, mz: 0.12 };
    block(a, 0.1, 0.1, 0.9, 0.86, 0, H1, fr, Object.assign({ ca: 5, cb: 5, capTop: '#a9aeb3' }, o)); base(a, 0.1, 0.1, 0.9, 0.86, 9, fr); a.win('A', 0.3, 0.7, 0.86, 1, 8, 2, 1, { glass: '#8fd0e8', mx: 0.05, mz: 0.02 });
    a.gq(0.12, 0.7, 0.88, 0.84, '#7fb060', H1 + 2.1); a.box(0.16, 0.74, 0.24, 0.82, H1 + 2, H1 + 5, '#3f8c3f'); a.box(0.7, 0.74, 0.78, 0.82, H1 + 2, H1 + 5, '#3f8c3f');
    block(a, 0.2, 0.18, 0.8, 0.68, H1 + 2, H, fr, Object.assign({ ca: 4, cb: 3 }, o)); a.box(0.34, 0.3, 0.58, 0.5, H + 2, H + 9, '#a3a8ae'); a.seg([0.68, 0.56, H + 2], [0.68, 0.56, H + 20], '#cfd3d7', 1);
  }
  function C3c(a, r, w, v) { // hotel
    a.lot('#c4c2ba'); const wall = pk(r, APT.concat(WALL)), ac = pk(r, BOLD), H = ri(r, 8, 12) * 8.5 + 12, bc = pk(r, ['#f4f3ef', '#d9dde0', '#c9b89a']);
    block(a, 0.1, 0.12, 0.9, 0.84, 0, H, wall, { fh: 8.5, ca: 5, cb: 4, band: bc }); a.face('A', 0.1, 0.9, 0.84, 0, 11, sh(wall, 0.74)); a.face('B', 0.12, 0.84, 0.9, 0, 11, sh(wall, 0.74)); a.win('A', 0.14, 0.86, 0.84, 1.5, 9.5, 4, 1, SHOPGL);
    a.box(0.3, 0.84, 0.7, 0.96, 10, 11.5, ac); a.seg([0.32, 0.95, 0], [0.32, 0.95, 10], '#d8d8d8', 1.2); a.seg([0.68, 0.95, 0], [0.68, 0.95, 10], '#d8d8d8', 1.2); a.light(0.5, 0.92, 9, 'flood', 0.3);
    sign(a, 0.24, 0.76, 0.8, H + 2, H + 11, ac); a.light(0.5, 0.82, H + 7, 'lamp', 1.3); a.box(0.2, 0.24, 0.4, 0.44, H + 2, H + 8, '#a3a8ae');
    a.box(0.9, 0.5, 0.95, 0.62, 20, Math.min(H - 6, 70), ac); a.flag(0.14, 0.9, 11, 9, ac);
  }
  function C3d(a, r, w, v) { // slim glass tower beside a low annex
    a.lot('#c4c2ba'); const gl = pk(r, GLASS), fr = pk(r, DARK.concat(['#dfe2e4'])), H = ri(r, 92, 116);
    a.tree(0.1, 0.1, 2, 0.6);
    block(a, 0.36, 0.1, 0.9, 0.62, 0, H, fr, { fh: 8, ca: 4, cb: 4, glass: gl, mx: 0.04, mz: 0.08 }); a.box(0.5, 0.2, 0.74, 0.44, H + 2, H + 8, '#a3a8ae'); a.seg([0.8, 0.52, H + 2], [0.8, 0.52, H + 2 + ri(r, 8, 18)], '#cfd3d7', 1);
    const h2 = ri(r, 18, 30); block(a, 0.1, 0.5, 0.9, 0.88, 0, h2, sh(fr, 1.1), { fh: 9, ca: 5, cb: 2, glass: gl, mx: 0.06, mz: 0.1, capTop: '#7fb060' });
    a.win('A', 0.4, 0.6, 0.88, 1, 8, 1, 1, { glass: '#8fd0e8', mx: 0.05, mz: 0.02 }); a.box(0.16, 0.56, 0.24, 0.64, h2 + 2, h2 + 5, '#3f8c3f'); a.box(0.3, 0.7, 0.38, 0.78, h2 + 2, h2 + 4.5, '#d9668a'); a.light(0.3, 0.7, h2 + 6, 'lamp', 0.7);
  }
  function C3e(a, r, w, v) { // art-deco office with piers and a stepped crown
    a.lot('#c4c2ba'); const st = pk(r, STONE), H = ri(r, 86, 106), cr = pk(r, ['#3f8f7a', '#b89b5e', '#59636f', '#8c5a43']), o = { fh: 8.5, mx: 0.26, mz: 0.16, piers: 4, cap: false };
    block(a, 0.12, 0.12, 0.88, 0.86, 0, H * 0.72, st, Object.assign({ ca: 4, cb: 4 }, o)); base(a, 0.12, 0.12, 0.88, 0.86, 12, st); a.win('A', 0.4, 0.6, 0.86, 1, 10, 1, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.03 }); a.box(0.12, 0.12, 0.88, 0.86, H * 0.72, H * 0.72 + 2, sh(st, 0.9));
    block(a, 0.22, 0.22, 0.78, 0.76, H * 0.72 + 2, H * 0.9, st, Object.assign({}, o, { ca: 2, cb: 2, piers: 2 })); a.box(0.22, 0.22, 0.78, 0.76, H * 0.9, H * 0.9 + 2, sh(st, 0.9));
    block(a, 0.32, 0.32, 0.68, 0.66, H * 0.9 + 2, H + 4, st, Object.assign({}, o, { ca: 1, cb: 1, piers: 1 }));
    a.pyr(0.32, 0.32, 0.68, 0.66, H + 4, 12, cr); a.seg([0.5, 0.49, H + 16], [0.5, 0.49, H + 28], '#d5d9dd', 1.2);
  }
  function C4b(a, r, w, v) { // big-box store
    a.lot('#6a6d72'); const wall = pk(r, ['#ded8ca', '#d2d6d8', '#e4dccb', '#f0eee8']), ac = pk(r, BOLD), H = ri(r, 20, 26);
    a.box(0.1, 0.1, 1.9, 1.08, 0, H, wall); a.face('A', 0.1, 1.9, 1.08, H - 6, H, ac); a.face('B', 0.1, 1.08, 1.9, H - 6, H, ac);
    for (let k = 0; k < 8; k++) a.face('A', 0.14 + k * 0.22, 0.15 + k * 0.22, 1.08, 0, H - 6, sh(wall, 0.86));
    a.box(0.1, 0.1, 1.9, 1.08, H, H + 1.5, sh(wall, 0.86), '#9a9ea3'); roofKit(a, r, 0.2, 0.15, 1.8, 0.9, H + 1.5, 5); for (let k = 0; k < 4; k++) a.gq(0.3 + k * 0.4, 0.3, 0.5 + k * 0.4, 0.8, '#9fd3ea', H + 1.6, 'rgba(0,0,0,0.25)');
    a.box(0.7, 1.08, 1.3, 1.22, 0, H + 6, ac); a.win('A', 0.76, 1.24, 1.22, 1.5, 12, 3, 1, { glass: '#9fd8ee', mx: 0.06, mz: 0.03 }); a.face('A', 0.76, 1.24, 1.22, 15, H + 3, '#fff6dc'); a.light(1.0, 1.26, H, 'lamp', 1.4);
    parking(a, 0.1, 1.4, 1.9, 1.64, r, true); parking(a, 0.1, 1.72, 1.9, 1.96, r, true);
    for (let k = 0; k < 3; k++) a.box(0.2 + k * 0.08, 1.26, 0.26 + k * 0.08, 1.32, 0, 3, '#c9cdd1'); a.tree(1.92, 1.3, 2, 0.6); a.box(0.02, 1.9, 0.08, 1.96, 0, 28, '#8a8f96'); a.box(0.0, 1.86, 0.1, 1.98, 28, 38, ac);
  }
  function C4c(a, r, w, v) { // shopping street with a paved square
    a.lot('#cfc9ba'); const n = 4, du = 1.8 / n;
    for (let k = 0; k < n; k++) {
      const wall = pk(r, WALL.concat(BRICK)), h = ri(r, 20, 36), a0 = 0.1 + k * du, a1 = a0 + du - 0.012, fl = Math.max(1, Math.round((h - 10) / 8)), c = pk(r, AWN), flat = r() < 0.5;
      a.box(a0, 0.14, a1, 0.9, 0, h, wall); a.win('A', a0 + 0.03, a1 - 0.03, 0.9, 1.5, 8.5, 2, 1, SHOPGL); a.win('A', a0 + 0.03, a1 - 0.03, 0.9, 11, h - 1, 3, fl); a.face('A', a0, a1, 0.9, 9.4, 10.3, sh(wall, 0.72));
      if (k === n - 1) a.win('B', 0.18, 0.86, a1, 11, h - 1, 4, fl);
      if (flat) { a.box(a0, 0.14, a1, 0.9, h, h + 1.5, sh(wall, 0.85), '#93979c'); sign(a, a0 + 0.06, a1 - 0.06, 0.88, h + 1.5, h + 6, c); } else { a.gable(a0, 0.14, a1, 0.9, h, 10, pk(r, ROOF), wall, 'v'); stepGable(a, a0, a1, 0.902, h, 12, wall, 3); }
      awn(a, a0, a1, 0.9, 9.4, c); a.light((a0 + a1) / 2, 0.98, 8, 'lamp', 0.7);
    }
    for (let i = 0; i < 9; i++) a.seg([0.1 + i * 0.225, 1.0, 0], [0.1 + i * 0.225, 1.96, 0], 'rgba(0,0,0,0.07)', 0.7);
    a.cyl(1.0, 1.46, 0.2, 0, 2, '#d8d2c0'); a.cyl(1.0, 1.46, 0.16, 2, 2.6, '#5fc3e8'); a.cyl(1.0, 1.46, 0.03, 2, 8, '#c9cdd1'); a.light(1.0, 1.46, 6, 'cyan', 0.8);
    a.tree(0.3, 1.3, 2, 0.8); a.tree(1.7, 1.3, 2, 0.8); a.tree(0.3, 1.8, 6, 0.8); a.tree(1.7, 1.8, 6, 0.8); a.post(0.62, 1.6, 12); a.post(1.38, 1.6, 12);
    for (let k = 0; k < 2; k++) { umbrella(a, 0.62 + k * 0.76, 1.2, pk(r, AWN)); a.box(0.54 + k * 0.78, 1.84, 0.7 + k * 0.78, 1.88, 0, 2, '#8a5a3a'); }
  }
  function C4d(a, r, w, v) { // U-shaped resort hotel around a pool
    a.lot('#7fb060'); a.gq(0.86, 1.5, 1.14, 2, '#cfc8b4'); const wall = pk(r, ['#f0e6c8', '#f0eee8', '#e8d1c1', '#e6dccb']), roof = pk(r, ['#a84a3b', '#c0623e', '#3f6b5a', '#59636f']), H = ri(r, 44, 60), H2 = ri(r, 30, 40), bc = '#f4f3ef';
    const wing = function (u0, v0, u1, v1, h) { block(a, u0, v0, u1, v1, 0, h, wall, { fh: 8.5, band: bc, bandB: true, cap: false }); a.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, h, h + 3, roof); };
    wing(0.14, 0.14, 1.86, 0.58, H); sign(a, 0.7, 1.3, 0.56, H + 3, H + 11, roof); a.light(1.0, 0.6, H + 8, 'lamp', 1.2);
    wing(0.14, 0.58, 0.56, 1.5, H2);
    a.gq(0.62, 0.66, 1.38, 1.42, '#e8e4d8'); a.gq(0.72, 0.78, 1.28, 1.3, '#5fc3e8', 0, 'rgba(255,255,255,0.7)'); a.light(1.0, 1.04, 3, 'cyan', 1.2); umbrella(a, 0.68, 1.36, '#f2efe6'); umbrella(a, 1.32, 1.36, roof); a.tree(0.7, 0.72, 6, 0.6); a.tree(1.3, 0.72, 6, 0.6);
    wing(1.44, 0.58, 1.86, 1.5, H2);
    a.tree(0.3, 1.74, 6, 0.9); a.tree(1.7, 1.74, 6, 0.9); a.bush(0.6, 1.8, '#d9668a', 0.7); a.bush(1.4, 1.8, '#e0c04a', 0.7); a.flag(0.8, 1.9, 0, 16, roof);
  }
  function C4e(a, r, w, v) { // office park with a plaza
    a.lot('#c8c6be'); const gl = pk(r, GLASS), fr = pk(r, DARK.concat(['#dfe2e4', '#d9dde0'])), H1 = ri(r, 50, 72), H2 = ri(r, 40, 62), o = { fh: 8, glass: gl, mx: 0.06, mz: 0.12 };
    a.tree(0.1, 0.1, 2, 0.7); block(a, 0.16, 0.14, 0.94, 0.9, 0, H1, fr, o); base(a, 0.16, 0.14, 0.94, 0.9, 9, fr); a.box(0.3, 0.3, 0.6, 0.56, H1 + 2, H1 + 9, '#a3a8ae'); roofKit(a, r, 0.4, 0.5, 0.86, 0.84, H1 + 2, 2);
    a.tree(1.9, 0.12, 6, 0.7); a.gq(0.16, 1.0, 1.0, 1.9, '#d8d4c8'); a.cyl(0.56, 1.42, 0.2, 0, 2, '#d8d2c0'); a.cyl(0.56, 1.42, 0.16, 2, 2.6, '#5fc3e8'); a.light(0.56, 1.42, 5, 'cyan', 0.8); a.tree(0.24, 1.14, 2, 0.8); a.tree(0.24, 1.76, 2, 0.8); a.post(0.9, 1.1, 12);
    block(a, 1.08, 0.62, 1.86, 1.4, 0, H2, sh(fr, 1.06), o); base(a, 1.08, 0.62, 1.86, 1.4, 9, fr); if (r() < 0.5) solar(a, 1.16, 0.7, 2, 2, H2 + 2.2); else roofKit(a, r, 1.14, 0.68, 1.8, 1.3, H2 + 2, 3);
    parking(a, 1.06, 1.56, 1.9, 1.94, r, true);
  }
  function C5b(a, r, w, v) { // classic tapered skyscraper with a spire
    a.lot('#c8c6be'); a.tree(0.14, 0.14, 2, 0.7); a.tree(1.86, 0.14, 2, 0.7);
    const st = pk(r, STONE.concat(['#8f8a80', '#b0a48e'])), H = ri(r, 196, 230), o = { fh: 8.5, mx: 0.24, mz: 0.14, cap: false }, cr = pk(r, ['#3f8f7a', '#b89b5e', '#8f959c', '#59636f']);
    a.box(0.18, 0.18, 1.82, 1.82, 0, 18, sh(st, 0.88)); a.win('A', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.12, mz: 0.04 }); a.win('B', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.12, mz: 0.04 });
    const tiers = [[0.34, 0.46], [0.46, 0.72], [0.58, 0.88], [0.7, 1.0]]; let z = 18;
    for (let k = 0; k < tiers.length; k++) { const m = tiers[k][0], z1 = Math.round(H * tiers[k][1]), cs = Math.max(2, Math.round((2 - 2 * m) / 0.2)); block(a, m, m, 2 - m, 2 - m, z, z1, st, Object.assign({ ca: cs, cb: cs, piers: Math.max(1, cs >> 1) }, o)); a.box(m, m, 2 - m, 2 - m, z1, z1 + 2, sh(st, 0.9)); z = z1 + 2; }
    a.box(0.82, 0.82, 1.18, 1.18, z, z + 10, st); a.pyr(0.82, 0.82, 1.18, 1.18, z + 10, 16, cr); a.seg([1, 1, z + 26], [1, 1, Math.min(292, z + 60)], '#d5d9dd', 1.4); a.p(1, 1, Math.min(292, z + 60));
    a.bush(0.12, 1.86); a.bush(0.12, 1.6);
  }
  function C5c(a, r, w, v) { // twin towers on a shared podium
    a.lot('#c8c6be'); a.tree(0.14, 0.14, 2, 0.7);
    const gl = pk(r, GLASS), fr = pk(r, DARK.concat(['#dfe2e4', '#b89b5e'])), H1 = ri(r, 220, 262), H2 = ri(r, 190, 250), o = { fh: 8, glass: gl, mx: 0.07, mz: 0.1, ca: 4, cb: 4 };
    a.box(0.18, 0.18, 1.82, 1.82, 0, 18, sh(fr, 0.9)); a.win('A', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.04 }); a.win('B', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.04 });
    block(a, 0.28, 0.32, 0.98, 1.02, 18, H1, fr, o); if (r() < 0.5) { a.pyr(0.3, 0.34, 0.96, 1.0, H1 + 2, 22, sh(gl, 0.9)); a.p(0.63, 0.67, H1 + 24); } else { a.box(0.46, 0.5, 0.8, 0.84, H1 + 2, H1 + 12, gl); a.seg([0.63, 0.67, H1 + 12], [0.63, 0.67, H1 + 30], '#d5d9dd', 1.2); }
    block(a, 1.04, 0.98, 1.74, 1.68, 18, H2, fr, o); a.box(1.2, 1.14, 1.5, 1.44, H2 + 2, H2 + 10, '#9aa0a6'); roofKit(a, r, 1.1, 1.05, 1.66, 1.6, H2 + 2, 2);
    a.gq(0.3, 1.2, 0.9, 1.7, '#7fb060', 18.2); a.box(0.4, 1.3, 0.5, 1.4, 18, 21.5, '#3f8c3f'); a.box(0.7, 1.5, 0.8, 1.6, 18, 21.5, '#6aa63f'); a.light(0.6, 1.45, 22, 'lamp', 0.9);
  }
  function C5d(a, r, w, v) { // round glass tower
    a.lot('#c8c6be'); a.tree(0.14, 0.14, 2, 0.7); a.tree(1.86, 0.14, 2, 0.7); a.tree(0.14, 1.86, 2, 0.7);
    const gl = pk(r, GLASS), fr = pk(r, DARK.concat(['#dfe2e4', '#d9dde0'])), H = ri(r, 196, 240), rad = rf(r, 0.52, 0.64);
    a.cyl(1, 1, 0.82, 0, 18, sh(fr, 0.9)); cylTower(a, 1, 1, 0.8, 2, 16, sh(fr, 0.9), '#8fd0e8', 14);
    cylTower(a, 1, 1, rad, 18, H, fr, gl, 8); a.cyl(1, 1, rad * 1.05, H, H + 3, sh(fr, 0.9), '#7f858c');
    if (r() < 0.5) { cylTower(a, 1, 1, rad * 0.7, H + 3, H + 20, fr, gl, 8.5); a.dome(1, 1, rad * 0.7, H + 20, sh(gl, 1.1), 0.8); a.seg([1, 1, H + 32], [1, 1, H + 46], '#d5d9dd', 1.3); a.p(1, 1, H + 46); }
    else { a.cyl(1, 1, rad * 0.4, H + 3, H + 11, '#9aa0a6'); a.seg([1, 1, H + 11], [1, 1, H + 40], '#d5d9dd', 1.4); a.dot(1, 1, H + 40, 1.6, '#ff5a4a'); a.p(1, 1, H + 40); }
    a.bush(1.8, 1.8);
  }
  function C5e(a, r, w, v) { // slab with a slanted glass crown
    a.lot('#c8c6be'); a.tree(0.14, 0.14, 2, 0.7); a.tree(1.86, 0.14, 2, 0.7);
    const gl = pk(r, GLASS), fr = pk(r, DARK.concat(['#dfe2e4'])), H = ri(r, 196, 236), sl = ri(r, 26, 46), u0 = 0.32, u1 = 1.68, v0 = 0.5, v1 = 1.24;
    a.box(0.18, 0.18, 1.82, 1.82, 0, 18, sh(fr, 0.9)); a.win('A', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.04 }); a.win('B', 0.2, 1.8, 1.82, 2, 16, 8, 1, { glass: '#8fd0e8', mx: 0.08, mz: 0.04 });
    block(a, u0, v0, u1, v1, 18, H, fr, { fh: 8, glass: gl, mx: 0.06, mz: 0.1, ca: 8, cb: 4, cap: false });
    a.poly([[u0, v1, H], [u1, v1, H], [u1, v1, H + sl]], sh(gl, a.lA())); a.poly([[u1, v0, H], [u1, v1, H], [u1, v1, H + sl], [u1, v0, H + sl]], sh(gl, a.lB())); a.poly([[u0, v0, H], [u1, v0, H + sl], [u1, v1, H + sl], [u0, v1, H]], sh(gl, 1.25), 'rgba(255,255,255,0.35)');
    for (let k = 1; k < 6; k++) { const t = k / 6; a.seg([u0 + (u1 - u0) * t, v0, H + sl * t], [u0 + (u1 - u0) * t, v1, H + sl * t], 'rgba(255,255,255,0.3)', 0.6); } a.seg([u1, v1, H + sl], [u1, v1, H + sl + 18], '#d5d9dd', 1.3);
    const h2 = ri(r, 40, 80); block(a, 1.0, 1.24, 1.68, 1.74, 18, h2, sh(fr, 1.08), { fh: 8, glass: gl, mx: 0.06, mz: 0.1 }); a.bush(0.12, 1.86); a.bush(0.4, 1.9);
  }

  // =================== industrial ===================
  function crates(a, r, u, v, n) { for (let k = 0; k < n; k++) { const x = u + r() * 0.16, y = v + r() * 0.12; a.box(x, y, x + 0.07, y + 0.07, 0, 3 + r() * 3, pk(r, ['#b08a4f', '#9c7a45', '#7f8a94', '#3f7fb0'])); } }
  function ribs(a, f, a0, a1, fix, z0, z1, col) { const n = Math.round((a1 - a0) / 0.05); for (let k = 1; k < n; k++) { const t = a0 + (a1 - a0) * k / n; a.seg(f === 'A' ? [t, fix, z0] : [fix, t, z0], f === 'A' ? [t, fix, z1] : [fix, t, z1], col || 'rgba(0,0,0,0.1)', 0.6); } }
  function docks(a, u0, u1, v, n, z) { const d = (u1 - u0) / n; for (let k = 0; k < n; k++) { a.face('A', u0 + k * d + d * 0.18, u0 + (k + 1) * d - d * 0.18, v, 0, z, '#474d55'); a.face('A', u0 + k * d + d * 0.18, u0 + (k + 1) * d - d * 0.18, v, z, z + 0.8, '#d8b23a'); } }
  function I1b(a, r) { // small flat-roofed warehouse
    a.lot('#8f8c82'); const wall = pk(r, METAL), ac = pk(r, BOLD);
    a.box(0.1, 0.14, 0.9, 0.7, 0, 13, wall); ribs(a, 'A', 0.1, 0.9, 0.7, 0, 13); ribs(a, 'B', 0.14, 0.7, 0.9, 0, 13); a.face('A', 0.1, 0.9, 0.7, 10.5, 12.2, ac); docks(a, 0.16, 0.7, 0.7, 2, 8.5); door(a, 0.8, 0.7, 0.07, 7, '#3d444c'); a.win('B', 0.22, 0.62, 0.9, 6, 10, 2, 1);
    a.box(0.1, 0.14, 0.9, 0.7, 13, 14.2, sh(wall, 0.86), '#8a8f95'); roofKit(a, r, 0.2, 0.2, 0.8, 0.6, 14.2, 2);
    crates(a, r, 0.1, 0.8, 4); a.box(0.6, 0.8, 0.7, 0.9, 0, 4, '#d8b23a'); a.box(0.6, 0.8, 0.66, 0.9, 4, 7, '#3d444c'); a.light(0.5, 0.74, 11, 'lamp', 0.9);
  }
  function I1c(a, r) { // farm: barn, silo and a field
    a.lot(pk(r, ['#8aa65a', '#93a85e', '#7fa456'])); const barn = pk(r, ['#a8433a', '#8f3b34', '#6b7a4a', '#b0703f']), fld = pk(r, ['#b89a5a', '#c9b05e', '#8f7a4a', '#7fae4a']);
    a.gq(0.06, 0.62, 0.94, 0.96, fld); for (let k = 0; k < 7; k++) a.seg([0.08, 0.65 + k * 0.045, 0], [0.92, 0.65 + k * 0.045, 0], 'rgba(0,0,0,0.13)', 0.8);
    a.tree(0.1, 0.1, 2, 0.7);
    a.box(0.14, 0.16, 0.6, 0.54, 0, 12, barn); a.face('A', 0.3, 0.44, 0.54, 0, 9, '#f1efe6'); a.face('A', 0.315, 0.425, 0.54, 0, 8.3, sh(barn, 0.8)); a.seg([0.315, 0.54, 0], [0.425, 0.54, 8.3], '#f1efe6', 0.8); a.seg([0.425, 0.54, 0], [0.315, 0.54, 8.3], '#f1efe6', 0.8); a.win('B', 0.22, 0.48, 0.6, 5, 9, 2, 1);
    a.gable(0.11, 0.13, 0.63, 0.57, 12, 10, pk(r, ['#59636f', '#6d3b34', '#7c838a']), barn, 'v'); a.win('A', 0.33, 0.41, 0.57, 14, 18, 1, 1, { mx: 0.1, mz: 0.1 });
    silo(a, 0.78, 0.3, 0.09, ri(r, 22, 30), '#c9cdd1'); if (r() < 0.5) silo(a, 0.78, 0.5, 0.07, 16, '#b9bdc1');
    for (let k = 0; k < 3; k++) a.cyl(0.2 + k * 0.1, 0.9, 0.035, 0, 4, '#d9b84a'); if (r() < 0.6) { a.box(0.66, 0.74, 0.8, 0.82, 1, 6, pk(r, ['#3c8f5a', '#c8463c', '#2f6fb0'])); a.box(0.76, 0.75, 0.82, 0.81, 6, 9, '#3d444c'); }
  }
  function I1d(a, r) { // builder's yard
    a.lot('#8a8578'); const wall = pk(r, METAL), roof = pk(r, ['#6f7780', '#7a5a48', '#59636f', '#3c8f5a']);
    for (let k = 0; k <= 9; k++) { a.seg([k / 9 * 0.96 + 0.02, 0.98, 0], [k / 9 * 0.96 + 0.02, 0.98, 4], '#6b7077', 0.8); } a.seg([0.02, 0.98, 4], [0.98, 0.98, 4], '#6b7077', 0.8);
    a.box(0.1, 0.12, 0.66, 0.44, 0, 9, wall); for (let k = 0; k < 3; k++) a.seg([0.14 + k * 0.24, 0.44, 0], [0.14 + k * 0.24, 0.44, 9], '#4d545c', 1.6); a.face('A', 0.12, 0.64, 0.44, 0, 7, '#3a3f45'); shed(a, 0.08, 0.1, 0.68, 0.46, 9, 4, roof, wall);
    a.box(0.72, 0.14, 0.92, 0.36, 0, 9, pk(r, WALL)); a.win('A', 0.74, 0.9, 0.36, 3, 7.5, 1, 1); a.box(0.72, 0.14, 0.92, 0.36, 9, 10, '#7c838a');
    const kinds = ri(r, 0, 2);
    for (let k = 0; k < 3; k++) { const u = 0.12 + k * 0.28, c = kinds === 0 ? '#b08a4f' : kinds === 1 ? '#a85c47' : '#9aa0a6'; for (let q = 0; q < ri(r, 1, 3); q++) a.box(u, 0.6, u + 0.2, 0.74, q * 3, q * 3 + 2.8, sh(c, 0.92 + q * 0.06)); }
    a.pyr(0.56, 0.74, 0.92, 0.96, 0, 7, pk(r, ['#c9b88a', '#8a8578', '#6b5a48'])); a.box(0.14, 0.82, 0.3, 0.92, 1, 6, '#d8b23a'); a.box(0.26, 0.83, 0.32, 0.91, 6, 9, '#3d444c'); a.light(0.4, 0.5, 10, 'lamp', 0.9);
  }
  function I1e(a, r) { // tank yard with a pump house
    a.lot('#8f8c82'); const tc = pk(r, ['#c9cdd1', '#e8e6e0', '#a98f6a', '#9fb3c2']), bd = pk(r, BOLD);
    tank(a, 0.32, 0.3, 0.2, ri(r, 14, 22), tc, bd); a.seg([0.32, 0.3, 22], [0.32, 0.3, 22], tc, 1);
    a.box(0.62, 0.16, 0.9, 0.44, 0, 10, pk(r, BRICK)); a.win('A', 0.66, 0.86, 0.44, 3.5, 8, 2, 1); a.gable(0.6, 0.14, 0.92, 0.46, 10, 6, pk(r, ROOF), '#a85c47', 'u');
    tank(a, 0.74, 0.7, 0.14, ri(r, 10, 16), sh(tc, 0.95), bd); a.seg([0.5, 0.36, 3], [0.62, 0.36, 3], '#8a8f95', 2); a.seg([0.44, 0.48, 3], [0.66, 0.64, 3], '#8a8f95', 2);
    a.cyl(0.26, 0.76, 0.06, 0, 8, pk(r, BOLD)); a.cyl(0.4, 0.82, 0.06, 0, 8, pk(r, BOLD)); a.cyl(0.14, 0.86, 0.045, 0, 6, '#c9cdd1'); a.light(0.5, 0.6, 10, 'lamp', 0.8);
  }
  function saw(a, u0, v0, u1, v1, z, n, roof) { const d = (u1 - u0) / n; for (let k = 0; k < n; k++) { const s = u0 + k * d; a.poly([[s, v0, z], [s, v1, z], [s + d * 0.35, v1, z + 8], [s + d * 0.35, v0, z + 8]], sh('#9fd0e6', 0.9)); a.poly([[s + d * 0.35, v0, z + 8], [s + d * 0.35, v1, z + 8], [s + d, v1, z], [s + d, v0, z]], sh(roof, a.lB() + 0.1)); a.poly([[s, v1, z], [s + d, v1, z], [s + d * 0.35, v1, z + 8]], sh(roof, a.lA())); } }
  function I2b(a, r, w, v) { // small saw-tooth factory
    a.lot('#8a8880'); const wall = pk(r, BRICK.concat(METAL)), roof = '#6c737a';
    a.box(0.08, 0.12, 0.92, 0.78, 0, 15, wall); a.win('A', 0.12, 0.88, 0.78, 6, 12, 5, 1, { glass: '#7fa9c2' }); a.win('B', 0.18, 0.74, 0.92, 6, 12, 3, 1, { glass: '#7fa9c2' }); a.face('A', 0.4, 0.6, 0.78, 0, 5.5, '#474d55');
    saw(a, 0.08, 0.12, 0.92, 0.78, 15, 3, roof); a.box(0.14, 0.2, 0.26, 0.32, 15, 24, sh(wall, 0.9)); stack(a, 0.2, 0.26, 0.04, ri(r, 38, 48), pk(r, ['#a05a48', '#8b8f94']), '#e8e4dc', 0, 24);
    crates(a, r, 0.1, 0.84, 3); a.cyl(0.8, 0.88, 0.05, 0, 7, pk(r, BOLD)); a.light(0.5, 0.82, 9, 'lamp', 0.8);
  }
  function I2c(a, r, w, v) { // grain silos with a conveyor
    a.lot('#8a8880'); const sc = pk(r, ['#c9cdd1', '#d8d2c0', '#b9bdc1', '#e8e6e0']), n = ri(r, 3, 4), h = ri(r, 30, 40);
    for (let k = 0; k < n; k++) silo(a, 0.16 + k * (0.7 / (n - 1 || 1)) * 0.9, 0.26, 0.105, h, sc);
    a.seg([0.14, 0.26, h + 5], [0.86, 0.26, h + 5], '#6b7077', 1.6); a.seg([0.86, 0.26, h + 5], [0.7, 0.66, 14], '#7a7f85', 2.4);
    a.box(0.5, 0.56, 0.9, 0.82, 0, 14, pk(r, METAL)); a.face('A', 0.56, 0.72, 0.82, 0, 9, '#474d55'); a.win('B', 0.6, 0.8, 0.9, 6, 11, 1, 1); a.gable(0.48, 0.54, 0.92, 0.84, 14, 5, '#7c838a', '#a9b0b6', 'u');
    truck(a, 0.12, 0.74, pk(r, BOLD), true); a.light(0.4, 0.6, 12, 'lamp', 0.9);
  }
  function I2d(a, r, w, v) { // logistics depot with trucks at the docks
    a.lot('#77756e'); const wall = pk(r, ['#e8e6e0', '#d2d6d8', '#c2b59c']), ac = pk(r, BOLD), n = ri(r, 3, 4);
    a.box(0.08, 0.08, 0.92, 0.54, 0, 16, wall); a.face('A', 0.08, 0.92, 0.54, 12, 15, ac); a.face('B', 0.08, 0.54, 0.92, 12, 15, ac); docks(a, 0.1, 0.9, 0.54, n, 8); a.win('B', 0.14, 0.48, 0.92, 4, 10, 2, 1);
    a.box(0.08, 0.08, 0.92, 0.54, 16, 17.2, sh(wall, 0.86), '#9a9ea3'); roofKit(a, r, 0.14, 0.12, 0.86, 0.46, 17.2, 2); a.gq(0.3, 0.16, 0.7, 0.3, '#9fd3ea', 17.3, 'rgba(0,0,0,0.25)');
    const d = 0.8 / n; for (let k = 0; k < n; k++) if (r() < 0.7) truck(a, 0.1 + k * d + d / 2, 0.56, pk(r, BOLD), false);
    a.light(0.3, 0.6, 14, 'flood', 0.35); a.light(0.7, 0.6, 14, 'flood', 0.35);
  }
  function I2e(a, r, w, v) { // twin-bay workshop or greenhouse
    const green = r() < 0.45; a.lot(green ? '#86a65a' : '#8a8880'); const wall = green ? '#e8f0ec' : pk(r, METAL), roof = green ? '#a8d8cc' : pk(r, ['#7c838a', '#6f7780', '#7a5a48', '#3c8f5a']);
    for (let k = 0; k < 2; k++) {
      const u0 = 0.1 + k * 0.4, u1 = u0 + 0.4; a.box(u0, 0.14, u1, 0.76, 0, 11, wall);
      if (green) { a.win('A', u0 + 0.02, u1 - 0.02, 0.76, 1, 10, 3, 1, { glass: '#9fd8c8', mx: 0.06, mz: 0.06 }); if (k) a.win('B', 0.16, 0.74, u1, 1, 10, 4, 1, { glass: '#9fd8c8', mx: 0.06, mz: 0.06 }); }
      else { a.face('A', u0 + 0.08, u1 - 0.08, 0.76, 0, 8, '#474d55'); if (k) a.win('B', 0.2, 0.7, u1, 5, 9.5, 3, 1); }
      a.gable(u0, 0.14, u1, 0.76, 11, 7, roof, wall, 'v'); if (green) for (let q = 1; q < 5; q++) a.seg([u0 + 0.2, 0.14 + q * 0.124, 18], [u1, 0.14 + q * 0.124, 11], 'rgba(255,255,255,0.5)', 0.6);
    }
    if (green) { for (let k = 0; k < 4; k++) a.gq(0.12 + k * 0.2, 0.82, 0.28 + k * 0.2, 0.94, k % 2 ? '#5fae5f' : '#7a5a3a'); a.light(0.5, 0.5, 8, 'lamp', 1.3); } else { crates(a, r, 0.12, 0.84, 4); a.cyl(0.84, 0.88, 0.05, 0, 7, pk(r, BOLD)); stack(a, 0.2, 0.26, 0.03, 28, '#6b6f75', null, 0, 14); a.light(0.5, 0.82, 9, 'lamp', 0.8); }
  }
  function I3b(a, r, w, v) { // container terminal
    a.lot('#77756e'); const wall = pk(r, METAL), ac = pk(r, BOLD);
    a.box(0.1, 0.1, 1.9, 0.72, 0, 22, wall); ribs(a, 'A', 0.1, 1.9, 0.72, 0, 22); a.face('A', 0.1, 1.9, 0.72, 17, 20, ac); docks(a, 0.2, 1.8, 0.72, 5, 11); a.win('B', 0.16, 0.66, 1.9, 8, 15, 3, 1); a.gable(0.07, 0.07, 1.93, 0.75, 22, 9, '#7c838a', wall, 'u');
    containers(a, r, 0.14, 0.92, 3, 4, 3); containers(a, r, 1.14, 1.5, 2, 3, 2);
    const gz = ri(r, 34, 44); a.box(1.1, 0.9, 1.16, 0.96, 0, gz, '#d8b23a'); a.box(1.1, 1.36, 1.16, 1.42, 0, gz, '#d8b23a'); a.box(1.84, 0.9, 1.9, 0.96, 0, gz, '#d8b23a'); a.box(1.84, 1.36, 1.9, 1.42, 0, gz, '#d8b23a'); a.box(1.08, 0.88, 1.92, 1.44, gz, gz + 4, '#d8b23a'); a.box(1.4, 1.08, 1.56, 1.24, gz - 7, gz, '#3d444c'); a.seg([1.48, 1.16, gz - 7], [1.48, 1.16, 12], '#3d444c', 0.9); a.box(1.36, 1.1, 1.62, 1.22, 6.5, 12, pk(r, X.CONT));
    truck(a, 0.2, 1.8, pk(r, BOLD), true); a.light(0.6, 1.2, 20, 'flood', 0.45); a.light(1.5, 1.2, gz, 'flood', 0.45);
  }
  function I3c(a, r, w, v) { // chemical works
    a.lot('#7f7d76'); const tc = pk(r, ['#c9cdd1', '#e8e6e0', '#d8d2c0']), bd = pk(r, BOLD), ch = ri(r, 76, 98);
    tank(a, 0.36, 0.34, 0.22, ri(r, 18, 26), tc, bd); tank(a, 0.86, 0.3, 0.18, ri(r, 22, 30), sh(tc, 0.95), bd);
    a.cyl(1.36, 0.36, 0.07, 0, ch, '#b9bdc1'); for (let k = 1; k < 5; k++) a.cyl(1.36, 0.36, 0.085, ch * k / 5, ch * k / 5 + 1.5, '#7a7f85'); a.smokeAt(1.36, 0.36, ch + 2, 0);
    a.cyl(1.62, 0.5, 0.055, 0, ch * 0.7, '#a98f6a'); for (let k = 1; k < 4; k++) a.cyl(1.62, 0.5, 0.07, ch * 0.7 * k / 4, ch * 0.7 * k / 4 + 1.5, '#7a7f85');
    for (let k = 0; k < 2; k++) { a.seg([0.2, 0.74 + k * 0.05, 8], [1.8, 0.74 + k * 0.05, 8], k ? '#c8463c' : '#8a8f95', 2); } for (let k = 0; k < 6; k++) a.seg([0.24 + k * 0.3, 0.76, 0], [0.24 + k * 0.3, 0.76, 8], '#6b7077', 1.2);
    a.box(0.14, 0.96, 0.9, 1.5, 0, 18, pk(r, METAL)); a.win('A', 0.18, 0.86, 1.5, 6, 14, 4, 1, { glass: '#7fa9c2' }); a.win('B', 1.0, 1.46, 0.9, 6, 14, 2, 1, { glass: '#7fa9c2' }); a.face('A', 0.4, 0.6, 1.5, 0, 5.5, '#474d55'); a.box(0.14, 0.96, 0.9, 1.5, 18, 19.5, '#7c838a'); roofKit(a, r, 0.2, 1.0, 0.8, 1.4, 19.5, 2);
    sphere(a, 1.3, 1.2, 0.2, 6, pk(r, ['#e8e6e0', '#d8d2c0', '#c9cdd1'])); sphere(a, 1.68, 1.44, 0.17, 6, '#e8e6e0');
    a.cyl(0.3, 1.76, 0.1, 0, 12, bd); a.cyl(0.56, 1.76, 0.1, 0, 12, sh(bd, 1.1)); truck(a, 0.9, 1.8, '#c9cdd1', true); a.light(1.0, 1.0, 12, 'lamp', 1.2); a.light(1.36, 0.36, ch * 0.5, 'lamp', 0.7);
  }
  function I3d(a, r, w, v) { // distribution centre
    a.lot('#77756e'); const wall = pk(r, ['#f0eee8', '#e4e7ea', '#d2d6d8']), ac = pk(r, BOLD), H = ri(r, 22, 28);
    a.box(0.1, 0.1, 1.9, 1.16, 0, H, wall); ribs(a, 'A', 0.1, 1.9, 1.16, 0, H, 'rgba(0,0,0,0.06)'); a.face('A', 0.1, 1.9, 1.16, H - 7, H - 3, ac); a.face('B', 0.1, 1.16, 1.9, H - 7, H - 3, ac); docks(a, 0.14, 1.6, 1.16, 7, 9); a.win('B', 0.2, 1.1, 1.9, 5, 12, 5, 1); a.win('A', 1.64, 1.86, 1.16, 2, 12, 1, 2, { glass: '#7ec0dc' });
    a.box(0.1, 0.1, 1.9, 1.16, H, H + 1.5, sh(wall, 0.86), '#9a9ea3'); for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) a.gq(0.24 + i * 0.32, 0.26 + j * 0.4, 0.44 + i * 0.32, 0.5 + j * 0.4, '#9fd3ea', H + 1.6, 'rgba(0,0,0,0.25)'); roofKit(a, r, 0.2, 0.9, 1.8, 1.1, H + 1.5, 4);
    for (let k = 0; k < 7; k++) if (r() < 0.6) truck(a, 0.14 + (k + 0.5) * (1.46 / 7), 1.18, pk(r, BOLD), false);
    a.box(1.7, 1.74, 1.88, 1.9, 0, 7, '#e8e6e0'); a.win('A', 1.72, 1.86, 1.9, 2.5, 6, 1, 1); a.seg([1.3, 1.82, 3], [1.7, 1.82, 3], '#c8463c', 1.2);
    a.light(0.5, 1.3, 18, 'flood', 0.4); a.light(1.2, 1.3, 18, 'flood', 0.4); a.tree(0.1, 1.9, 2, 0.6);
  }
  function I3e(a, r, w, v) { // food factory with silos
    a.lot('#7f7d76'); const wall = pk(r, BRICK.concat(['#e6dccb', '#d9d2c4'])), sc = pk(r, ['#c9cdd1', '#e8e6e0', '#d8d2c0']), sh2 = ri(r, 48, 62);
    for (let k = 0; k < 4; k++) silo(a, 0.26 + (k % 2) * 0.3, 0.26 + ((k / 2) | 0) * 0.3, 0.14, sh2 - (k > 1 ? 6 : 0), sc); a.seg([0.26, 0.26, sh2 + 6], [0.56, 0.26, sh2 + 6], '#6b7077', 1.6);
        a.box(0.7, 0.3, 1.86, 1.3, 0, 24, wall); a.win('A', 0.74, 1.82, 1.3, 12, 20, 6, 1, { glass: '#7fa9c2' }); a.win('B', 0.36, 1.24, 1.86, 12, 20, 5, 1, { glass: '#7fa9c2' }); a.face('A', 0.9, 1.2, 1.3, 0, 10, '#474d55'); a.face('A', 1.4, 1.7, 1.3, 0, 10, '#474d55');
    a.box(0.7, 0.3, 1.86, 1.3, 24, 25.5, '#7c838a'); roofKit(a, r, 0.8, 0.6, 1.5, 1.2, 25.5, 3); a.box(1.6, 0.36, 1.82, 0.58, 25.5, 30, sh(wall, 0.9)); stack(a, 1.71, 0.47, 0.07, ri(r, 74, 92), pk(r, ['#a05a48', '#8b8f94']), '#e8e4dc', 0, 30); a.seg([0.56, 0.56, 30], [0.8, 0.7, 25], '#7a7f85', 2.4);
    a.box(0.14, 0.9, 0.62, 1.4, 0, 14, sh(wall, 0.94)); a.win('A', 0.18, 0.58, 1.4, 4, 11, 3, 1); a.box(0.14, 0.9, 0.62, 1.4, 14, 15.2, '#7c838a');
    truck(a, 0.3, 1.74, '#c9cdd1', true); truck(a, 1.1, 1.8, pk(r, BOLD), true); crates(a, r, 1.6, 1.5, 4); a.light(1.0, 1.4, 12, 'lamp', 1.1);
  }
  function I4b(a, r, w, v) { // refinery
    a.lot('#716f69'); const bd = pk(r, BOLD), n = ri(r, 3, 4);
    tank(a, 0.36, 0.34, 0.24, 20, '#e8e6e0', bd); tank(a, 0.36, 0.92, 0.24, 20, '#d8d2c0', bd);
    for (let k = 0; k < n; k++) { const u = 0.86 + k * 0.26, h = ri(r, 70, 112); a.cyl(u, 0.36, 0.06, 0, h, k % 2 ? '#b9bdc1' : '#a98f6a'); for (let q = 1; q < 6; q++) a.cyl(u, 0.36, 0.078, h * q / 6, h * q / 6 + 1.5, '#6b7077'); if (k === 0) a.smokeAt(u, 0.36, h + 2, 1); a.light(u, 0.36, h * 0.6, 'lamp', 0.6); }
    for (let k = 0; k < 3; k++) a.seg([0.6, 0.6 + k * 0.045, 9 + k], [1.86, 0.6 + k * 0.045, 9 + k], k === 1 ? '#c9a23a' : '#8a8f95', 2); for (let k = 0; k < 5; k++) a.seg([0.66 + k * 0.28, 0.66, 0], [0.66 + k * 0.28, 0.66, 10], '#5d646c', 1.3);
    a.box(0.8, 0.84, 1.5, 1.3, 0, 26, '#5d646c'); a.win('A', 0.84, 1.46, 1.3, 6, 22, 4, 2, { glass: '#6f93a8' }); a.win('B', 0.88, 1.26, 1.5, 6, 22, 2, 2, { glass: '#6f93a8' }); a.box(0.8, 0.84, 1.5, 1.3, 26, 27.5, '#4a5057'); roofKit(a, r, 0.86, 0.9, 1.4, 1.2, 27.5, 3);
    sphere(a, 1.72, 1.1, 0.2, 7, '#e8e6e0'); sphere(a, 1.7, 1.56, 0.2, 7, '#d8d2c0');
    const fh = ri(r, 96, 118); a.seg([0.3, 1.6, 0], [0.3, 1.6, fh], '#6b7077', 2); a.seg([0.22, 1.6, 0], [0.3, 1.6, fh * 0.5], '#6b7077', 1); a.seg([0.38, 1.6, 0], [0.3, 1.6, fh * 0.5], '#6b7077', 1); a.dot(0.3, 1.6, fh + 3, 3, '#ffb03a'); a.dot(0.3, 1.6, fh + 5, 1.8, '#ffe89a'); a.light(0.3, 1.6, fh + 3, 'lamp', 1.6); a.p(0.3, 1.6, fh + 8);
    a.cyl(0.8, 1.7, 0.12, 0, 14, bd); a.cyl(1.1, 1.7, 0.12, 0, 14, '#c9cdd1');
  }
  function I4c(a, r, w, v) { // steel mill
    a.lot('#6b6862'); const wall = pk(r, ['#5d646c', '#6b5a50', '#4f5a62', '#70685e']), roof = '#4a5057';
    for (let k = 0; k < 3; k++) stack(a, 0.3 + k * 0.3, 0.26, 0.065, ri(r, 88, 120), k % 2 ? '#8b8f94' : '#9a6a55', k % 2 ? '#c8463c' : '#e8e4dc', 1);
    a.box(0.14, 0.46, 1.5, 1.2, 0, 32, wall); a.win('A', 0.2, 1.44, 1.2, 8, 24, 8, 2, { glass: '#d98b2b', mx: 0.2 }); a.win('B', 0.52, 1.14, 1.5, 8, 24, 4, 2, { glass: '#6f93a8' }); a.face('A', 0.5, 0.9, 1.2, 0, 14, '#2f3338'); a.light(0.7, 1.24, 8, 'lamp', 1.6);
    a.gable(0.12, 0.44, 1.52, 1.22, 32, 8, roof, wall, 'u'); a.box(0.5, 0.7, 1.2, 0.96, 38, 46, wall); a.gable(0.48, 0.68, 1.22, 0.98, 46, 5, roof, wall, 'u');
    const fz = ri(r, 54, 68); a.cyl(1.7, 0.6, 0.17, 0, fz, '#6b5a50'); a.cyl(1.7, 0.6, 0.19, fz * 0.3, fz * 0.3 + 3, '#3d3a36'); a.cyl(1.7, 0.6, 0.19, fz * 0.7, fz * 0.7 + 3, '#3d3a36'); a.pyr(1.52, 0.42, 1.88, 0.78, fz, 16, '#5d5048'); a.smokeAt(1.7, 0.6, fz + 18, 1); a.poly([[1.2, 1.3, 4], [1.28, 1.36, 4], [1.74, 0.72, fz + 6], [1.66, 0.66, fz + 6]], '#7a7f85');
    a.pyr(0.14, 1.36, 0.8, 1.92, 0, 16, '#2e2c2a'); a.pyr(0.9, 1.5, 1.4, 1.94, 0, 12, '#7a4a38'); a.box(1.5, 1.5, 1.86, 1.86, 0, 14, '#5d646c'); a.win('A', 1.54, 1.82, 1.86, 5, 11, 2, 1); a.box(1.5, 1.5, 1.86, 1.86, 14, 15.2, roof);
  }
  function I4d(a, r, w, v) { // cement works
    a.lot('#8a877f'); const sc = pk(r, ['#c9c6bc', '#d8d4c8', '#b9b6ac']), sh2 = ri(r, 62, 76), th = ri(r, 100, 124);
    for (let k = 0; k < 4; k++) a.cyl(0.3 + (k % 2) * 0.34, 0.3 + ((k / 2) | 0) * 0.34, 0.16, 0, sh2, sc, '#a9a69c'); a.box(0.2, 0.2, 0.74, 0.74, sh2, sh2 + 5, '#8a8f95');
    a.box(1.1, 0.26, 1.5, 0.66, 0, th, '#9aa0a6'); for (let k = 1; k < 6; k++) { a.face('A', 1.1, 1.5, 0.66, th * k / 6, th * k / 6 + 1.6, '#6b7077'); a.face('B', 0.26, 0.66, 1.5, th * k / 6, th * k / 6 + 1.6, '#6b7077'); } a.cyl(1.3, 0.46, 0.05, th, th + 4, '#8a8f95'); a.smokeAt(1.3, 0.46, th + 6, 2); a.light(1.3, 0.66, th * 0.5, 'lamp', 0.8);
    a.seg([0.74, 0.5, sh2 + 4], [1.1, 0.5, th * 0.6], '#7a7f85', 2.6);
    a.poly([[0.4, 1.12, 10], [0.4, 1.3, 10], [1.6, 1.3, 20], [1.6, 1.12, 20]], '#a9a69c'); a.poly([[0.4, 1.3, 2], [1.6, 1.3, 12], [1.6, 1.3, 20], [0.4, 1.3, 10]], sh('#8f8c84', a.lA())); for (let k = 0; k < 4; k++) a.box(0.5 + k * 0.32, 1.14, 0.58 + k * 0.32, 1.28, 0, 4 + k * 2.6, '#6b7077');
    a.box(1.56, 0.9, 1.9, 1.4, 0, 30, '#8f8c84'); a.win('B', 0.96, 1.36, 1.9, 8, 24, 2, 2, { glass: '#6f93a8' }); a.box(1.56, 0.9, 1.9, 1.4, 30, 31.5, '#6b7077');
    a.pyr(0.12, 1.44, 0.8, 1.94, 0, 15, '#c9c6bc'); a.pyr(0.7, 1.56, 1.2, 1.94, 0, 10, '#b0a48e'); truck(a, 1.36, 1.8, '#c9cdd1', true); a.box(1.3, 1.5, 1.44, 1.6, 1, 7, '#d8b23a');
  }
  function I4e(a, r, w, v) { // heavy plant with cooling towers
    a.lot('#716f69'); const wall = pk(r, ['#5d646c', '#6b6f75', '#70685e']), n = ri(r, 1, 2), ch = ri(r, 76, 100);
    hyper(a, 0.5, 0.48, 0.3, ch, '#c9c6bc'); if (n > 1) hyper(a, 1.14, 0.42, 0.26, ch * 0.86, '#d0cdc4');
    stack(a, 1.72, 0.3, 0.06, ri(r, 100, 124), '#8b8f94', '#c8463c', 1);
    a.box(0.9, 0.9, 1.86, 1.44, 0, 34, wall); a.face('A', 0.9, 1.86, 1.44, 26, 30, pk(r, ['#c9a23a', '#c8463c', '#2f6fb0'])); a.win('A', 0.95, 1.8, 1.44, 6, 22, 6, 2, { glass: '#6f93a8' }); a.win('B', 0.95, 1.4, 1.86, 6, 22, 3, 2, { glass: '#6f93a8' }); a.gable(0.88, 0.88, 1.88, 1.46, 34, 8, '#4a5057', wall, 'u');
    a.seg([0.6, 0.8, 8], [0.9, 1.0, 8], '#8a8f95', 2.4); for (let k = 0; k < 3; k++) { a.box(0.2 + k * 0.22, 1.2, 0.34 + k * 0.22, 1.34, 0, 9, '#8a8f95'); a.seg([0.27 + k * 0.22, 1.27, 9], [0.27 + k * 0.22, 1.27, 16], '#6b7077', 1); } a.seg([0.27, 1.27, 16], [0.71, 1.27, 16], '#6b7077', 0.8);
    a.pyr(0.14, 1.5, 0.74, 1.92, 0, 13, '#3a3836'); a.cyl(1.2, 1.72, 0.13, 0, 15, '#c9cdd1'); a.cyl(1.54, 1.72, 0.13, 0, 15, pk(r, BOLD)); a.light(1.0, 1.5, 12, 'lamp', 1.2);
  }
  function I5b(a, r, w, v) { // data centre
    a.lot('#8f9a8a'); a.gq(0, 1.62, 2, 1.76, '#d6d0be'); const wall = pk(r, ['#e4e7ea', '#d2d6d8', '#f0eee8', '#3d4852']), ac = pk(r, ['#1f8f96', '#2f6fb0', '#3c8f5a', '#7a4fa8']), H = ri(r, 22, 30);
    const hall = function (u0, v0, u1, v1) { a.box(u0, v0, u1, v1, 0, H, wall); a.face('A', u0, u1, v1, H * 0.45, H * 0.55, ac); a.face('B', v0, v1, u1, H * 0.45, H * 0.55, ac); for (let k = 0; k < 5; k++) a.face('A', u0 + 0.06 + k * (u1 - u0 - 0.1) / 5, u0 + 0.1 + k * (u1 - u0 - 0.1) / 5, v1, 2, H * 0.4, sh(wall, 0.8)); a.box(u0, v0, u1, v1, H, H + 1.5, sh(wall, 0.86), '#9a9ea3'); const nn = Math.round((u1 - u0) / 0.22); for (let k = 0; k < nn; k++) { a.box(u0 + 0.06 + k * 0.22, v0 + 0.08, u0 + 0.2 + k * 0.22, v0 + 0.22, H + 1.5, H + 6, '#b9bdc1'); a.cyl(u0 + 0.13 + k * 0.22, v0 + 0.15, 0.04, H + 6, H + 6.6, '#5d646c'); } a.light((u0 + u1) / 2, v1, H * 0.5, 'cyan', 1.1); };
    a.tree(0.1, 0.1, 2, 0.7); hall(0.16, 0.14, 1.84, 0.62); hall(0.16, 0.8, 1.3, 1.3);
    a.box(1.4, 0.86, 1.84, 1.3, 0, 16, '#f1f1ee'); a.win('A', 1.42, 1.82, 1.3, 2, 14, 3, 2, { glass: '#74b4dc', mx: 0.06, mz: 0.12 }); a.win('B', 0.88, 1.28, 1.84, 2, 14, 3, 2, { glass: '#74b4dc', mx: 0.06, mz: 0.12 }); a.box(1.4, 0.86, 1.84, 1.3, 16, 17.2, '#e2e2de');
    for (let k = 0; k < 4; k++) a.box(0.2 + k * 0.24, 1.42, 0.38 + k * 0.24, 1.54, 0, 7, '#6b7a70'); parking(a, 1.2, 1.78, 1.9, 1.96, r, true); a.tree(0.2, 1.86, 6, 0.7); a.tree(0.6, 1.88, 2, 0.7);
  }
  function I5c(a, r, w, v) { // research lab with a dome
    a.lot('#6fb556'); a.gq(0.9, 1.3, 1.06, 2, '#d6d0be'); a.gq(0, 1.56, 2, 1.7, '#d6d0be'); const gl = pk(r, ['#6fc0c8', '#74b4dc', '#7fd0c0']), H = ri(r, 24, 34);
    a.tree(0.12, 0.12, 2, 0.8); a.tree(1.88, 0.12, 6, 0.8);
    a.box(0.2, 0.18, 1.8, 0.8, 0, H, '#f1f1ee'); a.win('A', 0.22, 1.78, 0.8, 3, H - 2, 10, Math.round(H / 10), { glass: gl, mx: 0.05, mz: 0.14 }); a.win('B', 0.2, 0.78, 1.8, 3, H - 2, 4, Math.round(H / 10), { glass: gl, mx: 0.05, mz: 0.14 }); a.box(0.2, 0.18, 1.8, 0.8, H, H + 1.5, '#e2e2de', '#d2d4d6');
    if (r() < 0.5) solar(a, 0.3, 0.26, 4, 1, H + 1.8); else roofKit(a, r, 0.3, 0.24, 1.7, 0.7, H + 1.5, 4); a.cyl(1.56, 0.4, 0.1, H + 1.5, H + 3, '#e2e2de'); a.dome(1.56, 0.4, 0.1, H + 3, '#f4f4f0', 0.9);
    const dr = rf(r, 0.3, 0.38); a.cyl(0.6, 1.16, dr, 0, 5, '#e2e2de'); a.dome(0.6, 1.16, dr, 5, sh(gl, 1.15), 0.8); a.p(0.6, 1.16, 5 + dr * 36); a.light(0.6, 1.16, 12, 'cyan', 1.6);
    a.box(1.2, 0.9, 1.78, 1.4, 0, 18, sh(gl, 0.8)); a.win('A', 1.22, 1.76, 1.4, 2, 17, 3, 2, { glass: gl, mx: 0.05, mz: 0.06 }); a.win('B', 0.92, 1.38, 1.78, 2, 17, 3, 2, { glass: gl, mx: 0.05, mz: 0.06 }); a.box(1.2, 0.9, 1.78, 1.4, 18, 19.2, '#e2e2de');
    parking(a, 1.14, 1.76, 1.9, 1.96, r, true); a.tree(0.2, 1.84, 2, 0.8); a.tree(0.6, 1.86, 6, 0.7); a.bush(1.0, 1.5);
  }
  function I5d(a, r, w, v) { // clean factory with a solar roof
    a.lot('#6fb556'); a.gq(0, 1.5, 2, 1.66, '#d6d0be'); const wall = pk(r, ['#f1f1ee', '#e4e7ea', '#dfe6e2']), ac = pk(r, ['#3c8f5a', '#1f8f96', '#2f6fb0', '#d98b2b']), H = ri(r, 20, 26);
    a.tree(0.1, 0.1, 2, 0.8);
    a.box(0.16, 0.14, 1.84, 1.16, 0, H, wall); a.face('A', 0.16, 1.84, 1.16, H - 4, H - 1.5, ac); a.face('B', 0.14, 1.16, 1.84, H - 4, H - 1.5, ac); a.win('A', 0.2, 1.3, 1.16, 4, H - 6, 6, 1, { glass: '#74b4dc', mx: 0.08 }); a.win('B', 0.2, 1.1, 1.84, 4, H - 6, 5, 1, { glass: '#74b4dc', mx: 0.08 }); docks(a, 1.36, 1.8, 1.16, 2, 9);
    for (let k = 0; k < 3; k++) a.face('A', 0.3 + k * 0.34, 0.42 + k * 0.34, 1.164, 0, H - 6, '#5fae5f');
    a.box(0.16, 0.14, 1.84, 1.16, H, H + 1.5, '#e2e2de', '#d2d4d6'); solar(a, 0.24, 0.22, 5, 3, H + 1.8);
    const th = ri(r, 40, 52); a.seg([0.3, 1.36, 0], [0.3, 1.36, th], '#e8e8e8', 1.8); a.anim = null; for (let k = 0; k < 3; k++) { const an = k * 2.094 + 0.4, P = [0.3, 1.36, th]; a.seg(P, [0.3 + Math.cos(an) * 0.2, 1.36, th + Math.sin(an) * 12], '#f4f6f7', 1.6); } a.dot(0.3, 1.36, th, 1.6, '#d0d4d8');
    parking(a, 0.6, 1.72, 1.9, 1.96, r, true); for (let k = 0; k < 3; k++) a.box(0.66 + k * 0.16, 1.68, 0.7 + k * 0.16, 1.72, 0, 5, '#3c9a5a'); truck(a, 1.5, 1.2, ac, false); a.tree(0.2, 1.84, 6, 0.8); a.bush(1.94, 1.4);
  }
  function I5e(a, r, w, v) { // pavilions around a green court with a pond
    a.lot('#6fb556'); const gl = pk(r, ['#6fc0c8', '#74b4dc', '#7fd0c0', '#8ea8bf']), fr = pk(r, ['#f1f1ee', '#e4e7ea', '#3d4852', '#d9d2c4']);
    const pav = function (u0, v0, u1, v1, H) { a.box(u0, v0, u1, v1, 0, H, fr); const fl = Math.max(1, Math.round(H / 10)); a.win('A', u0 + 0.02, u1 - 0.02, v1, 1.5, H - 1, Math.round((u1 - u0) / 0.15), fl, { glass: gl, mx: 0.05, mz: 0.08 }); a.win('B', v0 + 0.02, v1 - 0.02, u1, 1.5, H - 1, Math.round((v1 - v0) / 0.15), fl, { glass: gl, mx: 0.05, mz: 0.08 }); a.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, H + 1.5, '#e9e9e6', '#d2d4d6'); };
    a.tree(0.1, 0.1, 2, 0.8); pav(0.2, 0.16, 1.2, 0.6, ri(r, 20, 34)); a.tree(1.9, 0.1, 6, 0.8);
    pav(1.36, 0.3, 1.84, 1.0, ri(r, 18, 30)); pav(0.16, 0.76, 0.6, 1.5, ri(r, 16, 28));
    a.gq(0.7, 0.74, 1.3, 1.34, '#7fc66a'); const g = a.g, P = a.p(1.0, 1.04, 0); g.fillStyle = '#5fc3e8'; g.beginPath(); g.ellipse(P[0], P[1], 13, 6, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.8; g.stroke(); a.light(1.0, 1.04, 2, 'cyan', 1.0);
    a.tree(0.76, 0.84, 2, 0.7); a.tree(1.24, 1.26, 6, 0.7); a.post(0.72, 1.3, 11); a.post(1.28, 0.8, 11);
    const hf = ri(r, 22, 36); pav(0.8, 1.44, 1.84, 1.84, hf); if (r() < 0.5) solar(a, 0.9, 1.5, 3, 1, hf + 1.8); a.bush(0.3, 1.8, '#d9668a', 0.7); a.bush(0.5, 1.9);
  }
  F[2][1].push(C1b, C1c, C1d, C1e); F[2][2].push(C2b, C2c, C2d, C2e); F[2][3].push(C3b, C3c, C3d, C3e); F[2][4].push(C4b, C4c, C4d, C4e); F[2][5].push(C5b, C5c, C5d, C5e);
  F[3][1].push(I1b, I1c, I1d, I1e); F[3][2].push(I2b, I2c, I2d, I2e); F[3][3].push(I3b, I3c, I3d, I3e); F[3][4].push(I4b, I4c, I4d, I4e); F[3][5].push(I5b, I5c, I5d, I5e);
})();
