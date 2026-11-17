'use strict';
/* METROPOLIS – public services: coverage maps and city-wide service capacity */
(function () {
  const S = M.Services = {};
  const MAPS = ['fire', 'police', 'health', 'edu', 'edu2', 'park', 'bus'];
  function stamp(W, map, cx, cy, r, s) {
    const n = W.n, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(n - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(n - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.sqrt((x + 0.5 - cx) * (x + 0.5 - cx) + (y + 0.5 - cy) * (y + 0.5 - cy)); if (d > r) continue;
      const v = s * Math.min(1, 1.25 * (1 - d / r) + 0.1), i = y * n + x;
      map[i] = 1 - (1 - map[i]) * (1 - v);
    }
  }
  S.stamp = stamp;
  // coverage including area policies
  S.cov = function (W, k, i) {
    let v = W[k][i];
    if (k === 'park') { if (M.pol('parks', i)) v *= 1.25; }
    else if ((k === 'fire' || k === 'police' || k === 'health') && M.pol('priority', i)) v *= 1.2;
    return v > 1 ? 1 : v;
  };
  S.update = function (W, city) {
    const R = M.Roads, n = W.n; R.components(W);
    for (const k of MAPS) W[k].fill(0);
    const t = S.totals = { seats: 0, seats2: 0, seats3: 0, health: 0, graves: 0, libs: 0, buses: 0, regional: 0, cargo: 0, airport: 0, commerce: 0, healthBonus: 0, trucks: 0, stops: 0, svcJobs: 0, fireSt: [], policeSt: [], hospSt: [], depots: [], waste: [] };
    const depotComps = {};
    W.each(function (b) { if (b.z || !b.on || b.t !== 'busdepot') return; const rd = R.access(W, b); if (rd >= 0) { depotComps[W.rcomp[rd]] = (depotComps[W.rcomp[rd]] || 0) + M.DEFS.busdepot.buses * M.upMul(b) * M.bf('transit'); t.depots.push(b); } });
    for (const k in depotComps) t.buses += depotComps[k];
    W.each(function (b) {
      if (b.z || !b.on) return;
      const d = M.DEFS[b.t], f = d.dept ? M.bf(d.dept) : 1, up = M.upMul(b), cx = b.x + b.s / 2, cy = b.y + b.s / 2;
      if (d.jobs) t.svcJobs += d.jobs;
      if (d.cover) stamp(W, W[d.cover.k], cx, cy, d.cover.r * (0.75 + 0.25 * Math.min(1.2, f)) * (1 + (b.up - 1) * 0.15), d.cover.s * Math.min(1, f));
      if (d.seats) t.seats += d.seats * up * f; if (d.seats2) t.seats2 += d.seats2 * up * f; if (d.seats3) t.seats3 += d.seats3 * up * f;
      if (d.cap) t.health += d.cap * up * f; if (d.graves) t.graves += d.graves; if (d.lib) t.libs++;
      if (d.regional) t.regional += d.regional; if (d.cargo) t.cargo++; if (d.air_port) t.airport++;
      if (d.commerce) t.commerce += d.commerce; if (d.health) t.healthBonus += d.health;
      if (b.t === 'fire') t.fireSt.push(b); if (b.t === 'police') t.policeSt.push(b); if (b.t === 'hospital' || b.t === 'clinic') t.hospSt.push(b); if (d.garbage) t.waste.push(b);
      if (d.bus) { const rd = W.findRoad(b.x, b.y, 1, 1); if (rd >= 0 && depotComps[W.rcomp[rd]]) { stamp(W, W.bus, cx, cy, 5.5, 1); t.stops++; b.busOK = true; } else b.busOK = false; }
    });
    void n;
    city.transit.cap = t.buses * 380; city.transit.stops = t.stops;
  };
})();
