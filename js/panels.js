'use strict';
/* METROPOLIS – information panels: inspector, budget, population, policies, traffic, utilities, advisor, milestones, statistics */
(function () {
  const P = M.Panels = { polTab: 0 }, U = M.UI, esc = U.esc, icon = U.icon, B = M.Build;
  const row = function (l, v, cls) { return '<div class="row' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + v + '</b></div>'; };
  const sec = function (t) { return '<div class="sec">' + t + '</div>'; };
  const bar = function (v, col) { v = M.clamp(v, 0, 1); return '<div class="bar"><i style="width:' + (v * 100).toFixed(0) + '%;background:' + (col || (v < 0.4 ? '#c9252c' : v < 0.65 ? '#e0a100' : '#1c8a4b')) + '"></i></div>'; };
  const brow = function (l, v, col, txt) { return '<div class="brow"><span>' + l + '</span>' + bar(v, col) + '<em>' + (txt != null ? txt : Math.round(M.clamp(v, 0, 1) * 100) + '%') + '</em></div>'; };
  const pct = function (v) { return (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%'; };

  function chart(cv, series, o) {
    o = o || {}; const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 320, h = cv.clientHeight || 120; if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    let mn = Infinity, mx = -Infinity, len = 0; for (const s of series) { for (const v of s.data) { if (v < mn) mn = v; if (v > mx) mx = v; } len = Math.max(len, s.data.length); }
    if (!isFinite(mn)) { g.fillStyle = '#556273'; g.font = '13px "Metro Sign", sans-serif'; g.fillText('No data yet – history is recorded monthly.', 8, h / 2); return; }
    if (o.zero) mn = Math.min(0, mn); if (mx === mn) mx = mn + 1; const pad = 4, x0 = 44, y0 = 8, W = w - x0 - pad, H = h - y0 - 18;
    g.strokeStyle = 'rgba(17,28,46,0.12)'; g.fillStyle = '#556273'; g.font = '11px "Metro Sign", sans-serif'; g.textAlign = 'right'; g.lineWidth = 1;
    for (let k = 0; k <= 3; k++) { const y = y0 + H * k / 3, v = mx - (mx - mn) * k / 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + W, y); g.stroke(); g.fillText(M.short(v), x0 - 4, y + 3); }
    if (mn < 0 && mx > 0) { const y = y0 + H * (mx / (mx - mn)); g.strokeStyle = 'rgba(17,28,46,0.55)'; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + W, y); g.stroke(); }
    g.textAlign = 'left'; let lx = x0;
    for (const s of series) {
      g.strokeStyle = s.color; g.lineWidth = 1.8; g.beginPath(); const n = s.data.length;
      for (let i = 0; i < n; i++) { const x = x0 + (len > 1 ? (i + len - n) / (len - 1) : 0) * W, y = y0 + H * (1 - (s.data[i] - mn) / (mx - mn)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.fillStyle = s.color; g.fillRect(lx, h - 9, 8, 3); g.fillStyle = '#111c2e'; g.fillText(s.label, lx + 11, h - 4); lx += g.measureText(s.label).width + 26;
    }
    g.fillStyle = '#556273'; g.textAlign = 'right'; g.fillText(len + ' mo', w - pad, h - 4);
  }
  function charts(body, defs) { body.querySelectorAll('canvas[data-chart]').forEach(function (cv) { const d = defs[cv.dataset.chart]; if (d) chart(cv, d.series, d); }); }
  const last = function (a, n) { return a.slice(Math.max(0, a.length - n)); };

  P.status = function (b) {
    if (b.fire) return ['On fire!', 'bad']; if (b.t === 'rubble') return ['Rubble', 'warn'];
    if (b.built < 1) return [(b.reno ? 'Upgrading ' : 'Under construction ') + Math.round(b.built * 100) + '%', 'warn'];
    if (b.dmg) return ['Damaged – under repair (' + Math.round(b.hp) + '%)', 'bad']; if (b.ab) return ['Abandoned', 'bad'];
    const d = b.z ? null : M.DEFS[b.t];
    if ((b.z || M.needsRoad(d)) && b.rv && b.rd < 0) return ['No road access', 'bad'];
    if (b.pw === false) return ['No electricity', 'bad'];
    if (d && d.water && b.noNet) return ['Not connected – place within 2 tiles of a road', 'bad'];
    if (b.wt === false) return ['No water', 'warn'];
    if (d && d.store && b.store >= d.store) return ['Full – no longer collecting', 'bad'];
    if (b.stormOff > 0) return ['Shut down after the storm', 'warn'];
    if (b.t === 'busstop' && b.busOK === false) return ['No depot on this road network', 'warn'];
    return ['Operating', 'good'];
  };

  // ---------------- renderers ----------------
  const R = {};
  R.inspect = function (b) {
    if (!b || b.dead) return null; const W = M.world, c = M.city, i = b.y * W.n + b.x, st = P.status(b), Sv = M.Services; let h = '<div class="status ' + st[1] + '">' + st[0] + '</div>';
    if (b.z) {
      const zb = M.ZB[b.z];
      h += row('Type', M.ZNAME[b.z] + ', level ' + b.lvl + ' of 5');
      if (b.z === 1) {
        h += row('Residents', b.pop + ' / ' + b.cap) + row('Wealth', ['', 'Low', 'Medium', 'High'][b.wealth]) + brow('Happiness', b.happy) + row('Commute', b.commute < 0 ? 'No route to work' : b.commute ? Math.round(b.commute) + ' min' : '–');
        h += sec('Neighbourhood') + brow('Land value', W.lv[i] / 100, '#12489b', Math.round(W.lv[i])) + brow('Air pollution', W.air[i] / 50, '#b5651d', Math.round(W.air[i])) + brow('Noise', W.noise[i] / 50, '#b5651d', Math.round(W.noise[i])) + brow('Crime', W.crime[i] / 45, '#c9252c', Math.round(W.crime[i]));
        h += sec('Services') + brow('Fire', Sv.cov(W, 'fire', i)) + brow('Police', Sv.cov(W, 'police', i)) + brow('Healthcare', Sv.cov(W, 'health', i)) + brow('Schools', W.edu[i]) + brow('Parks', Sv.cov(W, 'park', i)) + brow('Garbage service', 1 - b.garb);
      } else {
        h += row('Jobs filled', b.filled + ' / ' + b.cap) + brow('Land value', W.lv[i] / 100, '#12489b', Math.round(W.lv[i]));
        if (b.z === 3) h += row('Air pollution emitted', zb.air[b.lvl]) + row('Noise', zb.noise[b.lvl]);
        if (b.z === 2) h += row('Customers', pct(Math.min(1, c.stats.cust)));
      }
      h += sec('Utilities') + row('Electricity', b.pw ? (b.pu || 0).toFixed(2) + ' MW' : 'None', b.pw ? '' : 'bad') + row('Water', b.wt ? (b.wu || 0).toFixed(1) + ' units' : 'None', b.wt ? '' : 'warn') + row('Tax rate', M.Zoning.taxRate(c, W, b.z, i) + '%');
      h += '<p class="note">Zoned buildings grow and upgrade on their own when demand, land value, density and services allow.</p>';
    } else {
      const d = M.DEFS[b.t], up = M.upMul(b);
      h += '<p class="note">' + esc(d.desc) + '</p>';
      if (d.up) h += row('Level', '★'.repeat(b.up) + '☆'.repeat(3 - b.up));
      if (d.power && !d.line) h += row('Output', (b.out || 0).toFixed(1) + ' / ' + (d.power * up).toFixed(0) + ' MW');
      if (d.water) h += row('Supply', (b.out || 0).toFixed(0) + ' / ' + (d.water * up).toFixed(0) + ' units');
      if (d.sewage) h += row('Treatment capacity', M.fmt(d.sewage * up));
      if (d.garbage) h += row('Collection', (d.garbage * up).toFixed(0) + ' t/month');
      if (d.store) h += brow('Landfill used', b.store / d.store, '#8a6a2f');
      if (d.cover) h += row('Coverage radius', Math.round(d.cover.r * (1 + (b.up - 1) * 0.15)) + ' tiles');
      if (d.seats) h += row('Seats', Math.round(d.seats * up)); if (d.seats2) h += row('Seats', Math.round(d.seats2 * up)); if (d.seats3) h += row('Students', Math.round(d.seats3 * up));
      if (d.cap) h += row('Patients served', M.fmt(d.cap * up)); if (d.graves) h += row('Graves', M.fmt(d.graves));
      if (d.trucks) h += row('Fire engines', (b.busy || 0) + ' out of ' + d.trucks * b.up + ' deployed'); if (d.buses) h += row('Buses', Math.round(d.buses * up));
      if (d.jobs) h += row('Jobs', d.jobs); if (d.usePower) h += row('Uses', d.usePower + ' MW');
      if (d.upkeep) h += row('Upkeep', M.money(M.Economy.upkeepOf(b)) + ' / month');
      if (d.dept) h += row('Department', M.DEPTS.find(function (x) { return x.id === d.dept; }).name + ' (' + c.budget[d.dept] + '% funding)');
      if (b.hp < 100) h += brow('Condition', b.hp / 100);
    }
    h += '<div class="btns">';
    if (B.canUpgrade(b)) h += '<button class="btn primary" data-act="upgrade" data-tip="+50% capacity, +15% range, +40% upkeep">Upgrade ' + M.money(B.upgradeCost(b)) + '</button>';
    h += '<button class="btn" data-act="center">Centre</button><button class="btn danger" data-act="demolish">Demolish ' + M.money(B.demolishCost(b) * M.DIFF[c.diff].cost) + '</button></div>';
    return { title: M.nameOf(b), html: h };
  };
  R.tile = function (a) {
    const W = M.world, c = M.city; if (!a || !W.inb(a.x, a.y)) return null; const i = W.idx(a.x, a.y), e = W.elev[i], rt = W.road[i]; let h = '';
    if (rt) { const r = M.ROADS[rt]; h += row('Road', r.name + (e === 0 ? ' (bridge)' : '')); if (r.cap) h += brow('Traffic', W.traffic[i] / r.cap, null, Math.round(W.traffic[i]) + ' / ' + r.cap) + row('Signals', M.Roads.signal(W, i) ? 'Traffic lights' : 'None'); }
    else if (e === 0) h += row('Terrain', 'Water') + brow('Water pollution', c.util.waterPol, '#8a6a2f');
    else h += row('Terrain', ['', 'Grassland', 'Beach', 'Rocky hill'][W.terr[i]] + (e > 1 ? ', elevation ' + e : '') + (W.deco[i] === 1 || W.deco[i] === 2 || W.deco[i] === 6 ? ', trees' : ''));
    if (e) {
      h += row('Zone', W.zone[i] ? M.ZNAME[W.zone[i]] + ' – ' + M.DENS_NAME[W.zdens[i]] : 'None') + row('District', W.district[i] ? esc(c.districts[W.district[i]].name) : 'None') + row('Inside city limits', W.inLimit(a.x, a.y) ? 'Yes' : 'No');
      h += row('Electricity', ['Not reached', 'Available', 'Network has no supply'][W.power[i]]) + row('Water', ['Not reached', 'Available', 'Network has no supply'][W.water[i]]);
      h += sec('Environment') + brow('Land value', W.lv[i] / 100, '#12489b', Math.round(W.lv[i])) + brow('Air pollution', W.air[i] / 50, '#b5651d', Math.round(W.air[i])) + brow('Ground pollution', W.gnd[i] / 40, '#8a6a2f', Math.round(W.gnd[i])) + brow('Noise', W.noise[i] / 50, '#b5651d', Math.round(W.noise[i])) + brow('Crime', W.crime[i] / 45, '#c9252c', Math.round(W.crime[i]));
      if (W.zone[i] && !W.bld[i]) { const z = W.zone[i], why = W.findRoad(a.x, a.y, 1, 2) < 0 ? 'needs a road within 2 tiles' : W.power[i] !== 1 ? 'needs electricity' : c.demand[M.Zoning.KEY[z]] < 0.08 ? 'there is no demand right now' : M.Zoning.des(W, c, z, i) < M.ZB[z].des[1] ? 'the area is not desirable enough' : 'waiting for a developer'; h += '<p class="note">Nothing has been built here yet: ' + why + '.</p>'; }
    }
    return { title: 'Tile ' + a.x + ', ' + a.y, html: h };
  };
  R.budget = function () {
    const c = M.city, f = c.fin, N = { R: 'Residential tax', C: 'Commercial tax', I: 'Industrial tax', fares: 'Bus fares' }; let h = sec('Tax rates');
    for (const k of ['R', 'C', 'I']) h += '<div class="slider"><span>' + N[k].replace(' tax', '') + '</span><input type="range" min="0" max="20" step="1" value="' + c.tax[k] + '" data-in="tax:' + k + '"><b id="tx-' + k + '">' + c.tax[k] + '%</b></div>';
    h += '<p class="note">9% is neutral. Higher rates slow growth and anger residents; lower rates attract development.</p>' + sec('Income last month');
    for (const k in f.inc) h += row(N[k], M.money(f.inc[k]));
    h += row('Total income', M.money(f.incTotal), 'total') + sec('Department funding and cost');
    for (const d of M.DEPTS) h += '<div class="slider dept"><span>' + d.name + '</span><input type="range" min="50" max="120" step="5" value="' + c.budget[d.id] + '" data-in="budget:' + d.id + '"><b id="bg-' + d.id + '">' + c.budget[d.id] + '%</b><em>' + M.money(f.exp[d.id] || 0) + '</em></div>';
    h += row('Loan repayments', M.money(f.exp.loans || 0)) + row('Policies', M.money(f.exp.policies || 0)) + row('Disaster repairs', M.money(f.exp.repairs || 0)) + row('Total expenses', M.money(f.expTotal), 'total');
    const net = f.incTotal - f.expTotal; h += row('Balance', (net >= 0 ? '+' : '') + M.money(net), net >= 0 ? 'good total' : 'bad total');
    h += '<p class="note">Funding below 100% saves money but shrinks capacity and coverage; up to 120% gives a modest boost.</p>' + sec('Loans');
    if (!c.loans.length) h += '<p class="note">No outstanding loans.</p>';
    c.loans.forEach(function (l, i) { h += '<div class="row"><span>' + M.money(l.left) + ' left, ' + (l.rate * 100).toFixed(1) + '%, ' + M.money(l.pay + l.left * l.rate / 12) + '/mo</span><button class="btn sm" data-act="repay:' + i + '"' + (c.money < l.left ? ' disabled' : '') + '>Repay</button></div>'; });
    h += '<div class="btns">' + M.LOANS.map(function (l, i) { return '<button class="btn sm" data-act="loan:' + i + '"' + (c.loans.length >= 3 ? ' disabled' : '') + ' data-tip="' + (l.rate * 100).toFixed(1) + '% interest over ' + l.months / 12 + ' years">Borrow ' + M.money(l.amount) + '</button>'; }).join('') + '</div>';
    h += sec('History') + '<canvas class="chart" data-chart="fin"></canvas><canvas class="chart" data-chart="money"></canvas>';
    return { title: 'City budget', html: h, after: function (b) { charts(b, { fin: { zero: true, series: [{ data: last(c.hist.inc, 60), color: '#1c8a4b', label: 'Income' }, { data: last(c.hist.exp, 60), color: '#c9252c', label: 'Expenses' }] }, money: { series: [{ data: last(c.hist.money, 120), color: '#e0a100', label: 'Treasury' }] } }); } };
  };
  R.pop = function () {
    const c = M.city, s = c.stats, co = c.coh, t = Math.max(1, co.c + co.a + co.s), E = ['No schooling', 'Elementary', 'High school', 'University'];
    let h = row('Residents', M.fmt(c.pop)) + row('Households', M.fmt(s.households)) + row('Housing capacity', M.fmt(s.housing) + ' (' + pct(Math.max(0, s.vacancy)) + ' vacant)');
    h += sec('Age groups') + brow('Children (0–17)', co.c / t, '#2f6fc4', M.fmt(co.c)) + brow('Adults (18–64)', co.a / t, '#1c8a4b', M.fmt(co.a)) + brow('Seniors (65+)', co.s / t, '#b5851d', M.fmt(co.s));
    h += sec('Change per month') + row('Births', s.births.toFixed(1)) + row('Deaths', s.deaths.toFixed(1)) + row('Migration', (s.migration >= 0 ? '+' : '') + s.migration.toFixed(0), s.migration < 0 ? 'bad' : '');
    h += sec('Education of adults'); for (let k = 0; k < 4; k++) h += brow(E[k], c.edu[k], ['#556273', '#2f6fc4', '#1c8a4b', '#7a4fa8'][k]);
    h += row('Education index', pct(s.eduIdx));
    const tot = M.Services.totals || {}, su = s.seatUse || [0, 0, 0];
    h += row('Elementary seats', M.fmt(tot.seats || 0) + ' for ' + M.fmt(su[0]) + ' children') + row('High-school seats', M.fmt(tot.seats2 || 0) + ' for ' + M.fmt(su[1]) + ' teens') + row('University places', M.fmt(tot.seats3 || 0) + ' for ' + M.fmt(su[2]) + ' applicants');
    h += sec('Work and income') + row('Workforce', M.fmt(s.workforce)) + row('Jobs', M.fmt(s.jobs) + ' (' + M.fmt(s.jobsC) + ' commercial, ' + M.fmt(s.jobsI) + ' industrial)') + row('Unemployment', pct(s.unemp), s.unemp > 0.1 ? 'bad' : '') + row('Average income index', s.income.toFixed(1)) + row('Poverty', pct(s.poverty)) + brow('Health', s.health) + brow('Happiness', s.happy);
    h += sec('Population history') + '<canvas class="chart" data-chart="pop"></canvas>';
    return { title: 'Population', html: h, after: function (b) { charts(b, { pop: { zero: true, series: [{ data: c.hist.pop, color: '#2f6fc4', label: 'Residents' }] } }); } };
  };
  R.policy = function () {
    const c = M.city, tab = P.polTab, W = M.world; let h = '<div class="tabs"><button class="tab' + (tab === 0 ? ' on' : '') + '" data-act="ptab:0">City-wide</button>';
    for (let d = 1; d <= 8; d++) h += '<button class="tab' + (tab === d ? ' on' : '') + '" data-act="ptab:' + d + '" data-tip="' + esc(c.districts[d].name) + '"><i style="background:' + M.Render.DCOL[d] + '"></i>' + d + '</button>';
    h += '</div>';
    if (!M.tierOK(2)) h += '<p class="note">Districts and policies unlock when you become an ' + M.TIERS[2].name + ' (2,000 residents).</p>';
    else {
      const pol = tab ? c.districts[tab].pol : c.pol;
      if (tab) {
        let tiles = 0, pop = 0; for (let i = 0; i < W.district.length; i++) if (W.district[i] === tab) tiles++; W.each(function (b) { if (b.z === 1 && W.district[b.y * W.n + b.x] === tab) pop += b.pop; });
        h += '<div class="slider"><span>Name</span><input type="text" maxlength="24" value="' + esc(c.districts[tab].name) + '" data-in="dname:' + tab + '"></div>' + row('Area', tiles + ' tiles, ' + M.fmt(pop) + ' residents');
        h += '<div class="slider"><span>Local tax</span><input type="range" min="-4" max="4" step="1" value="' + c.districts[tab].tax + '" data-in="dtax:' + tab + '"><b id="dt-' + tab + '">' + (c.districts[tab].tax >= 0 ? '+' : '') + c.districts[tab].tax + '%</b></div>';
        if (!tiles) h += '<p class="note">This district has no land yet. Pick it under Districts in the toolbar and paint it onto the map.</p>';
        h += '<div class="btns"><button class="btn sm" data-act="paint:' + tab + '">Paint this district</button></div>';
      } else h += '<p class="note">City-wide policies apply everywhere. District policies apply only inside that district.</p>';
      h += sec('Policies');
      for (const p of M.POLICIES) { const on = !!pol[p.id], inh = tab && c.pol[p.id]; h += '<div class="pol' + (on || inh ? ' on' : '') + '"><div><b>' + p.name + '</b><small>' + p.desc + '</small><span class="pro">+ ' + p.pro + '</span><span class="con">− ' + p.con + '</span></div><button class="tog' + (on || inh ? ' on' : '') + '" data-act="pol:' + tab + ':' + p.id + '"' + (inh ? ' disabled data-tip="Already enacted city-wide"' : '') + '><i></i></button></div>'; }
    }
    return { title: 'Districts & policies', html: h };
  };
  R.traffic = function () {
    const c = M.city, s = c.stats, W = M.world, T = M.Traffic, N = W.n * W.n; const top = [];
    for (let i = 0; i < N; i++) { const t = W.road[i]; if (!t || !M.ROADS[t].cap) continue; const r = W.traffic[i] / M.ROADS[t].cap; if (r > 0.8 && (top.length < 6 || r > top[top.length - 1].r)) { let near = false; for (const q of top) if (Math.abs(q.i % W.n - i % W.n) + Math.abs(((q.i / W.n) | 0) - ((i / W.n) | 0)) < 6) { near = true; if (r > q.r) { q.r = r; q.i = i; } } if (!near) top.push({ i: i, r: r }); top.sort(function (a, b) { return b.r - a.r; }); if (top.length > 6) top.length = 6; } }
    let h = brow('Average congestion', s.congestion / 1.5, s.congestion > 1 ? '#c9252c' : s.congestion > 0.6 ? '#e0a100' : '#1c8a4b', pct(s.congestion)) + row('Average commute', s.commute ? Math.round(s.commute) + ' min' : '–') + row('Vehicle trips per day', M.fmt(T.trips)) + row('Road tiles', M.fmt(W.roadTiles)) + row('Road condition', pct(M.roadCond));
    h += '<div class="btns"><button class="btn sm" data-act="overlay:traffic">Show traffic view</button><button class="btn sm" data-act="overlay:noise">Show noise view</button></div>';
    h += sec('Busiest roads'); if (!top.length) h += '<p class="note">No road is over 80% of its capacity. Traffic is recalculated continuously as citizens choose routes.</p>';
    for (const q of top) h += '<div class="row"><span>' + M.ROADS[W.road[q.i]].name + ' at ' + (q.i % W.n) + ', ' + ((q.i / W.n) | 0) + ', <b class="' + (q.r > 1.2 ? 'bad' : 'warn') + '">' + pct(q.r) + '</b></span><button class="btn sm" data-act="goto:' + (q.i % W.n) + ':' + ((q.i / W.n) | 0) + '">Go to</button></div>';
    h += '<p class="note">Upgrade jammed streets to avenues or boulevards, add alternative routes, and move commuters onto buses.</p>';
    const tr = c.transit; h += sec('Public transport');
    if (!M.tierOK(2)) h += '<p class="note">Buses unlock at ' + M.TIERS[2].name + '.</p>';
    else h += row('Connected bus stops', tr.stops) + row('Daily capacity', M.fmt(tr.cap)) + row('Riders last month', M.fmt(tr.riders)) + row('Share of trips by bus', pct(tr.share)) + row('Fare income', M.money(tr.fares) + '/mo') + '<div class="btns"><button class="btn sm" data-act="overlay:bus">Show bus coverage</button></div><p class="note">Trams, metro and tunnels are planned for a later version.</p>';
    return { title: 'Traffic & transit', html: h };
  };
  R.utility = function () {
    const c = M.city, u = c.util; let h = sec('Electricity') + brow('Demand vs capacity', u.pCap ? u.pUse / u.pCap : (u.pUse ? 1 : 0), u.pUse > u.pCap ? '#c9252c' : null, u.pUse.toFixed(0) + ' / ' + u.pCap.toFixed(0) + ' MW');
    h += row('Buildings without power', pct(u.pShort), u.pShort > 0.01 ? 'bad' : '') + row('From wind and solar', pct(u.cleanShare || 0)) + row('Wind strength', pct(c.weather.wind));
    h += '<div class="btns"><button class="btn sm" data-act="overlay:power">Show power grid</button></div>';
    h += sec('Water') + brow('Demand vs capacity', u.wCap ? u.wUse / u.wCap : (u.wUse ? 1 : 0), u.wUse > u.wCap ? '#c9252c' : null, u.wUse.toFixed(0) + ' / ' + u.wCap.toFixed(0)) + row('Buildings without water', pct(u.wShort), u.wShort > 0.01 ? 'bad' : '') + brow('Water pollution', u.waterPol, '#8a6a2f') + row('Treatment plant', u.clean ? 'Yes – pollution neutralised' : 'None');
    h += '<div class="btns"><button class="btn sm" data-act="overlay:water">Show water network</button></div>';
    h += sec('Sewage') + (M.need('sewage') ? brow('Treated', u.sUse ? Math.min(1, u.sCap / u.sUse) : 1, null, u.sUse.toFixed(0) + ' produced, ' + u.sCap.toFixed(0) + ' capacity') : '<p class="note">A village this small uses septic tanks. Sewage treatment matters from ' + M.TIERS[2].name + '.</p>');
    h += sec('Garbage') + (M.need('garbage') ? brow('Collected', u.gFrac == null ? 1 : u.gFrac, null, u.gProd.toFixed(0) + ' t/mo produced, ' + u.gCap.toFixed(0) + ' collected') + (u.landfillFree >= 0 ? brow('Landfill space left', u.landfillFree) : row('Landfills', 'None')) : '<p class="note">Garbage collection matters from ' + M.TIERS[1].name + '.</p>');
    h += sec('Cemeteries') + (M.need('graves') ? brow('Graves in use', u.graves ? u.gravesUsed / u.graves : (u.gravesUsed ? 1 : 0), u.gravesUsed > u.graves ? '#c9252c' : '#556273', Math.round(u.gravesUsed) + ' / ' + u.graves) : '<p class="note">Needed from ' + M.TIERS[2].name + '.</p>');
    return { title: 'Utilities', html: h };
  };
  R.advisor = function () {
    const c = M.city, s = c.stats, F = M.Population.FACTORS; let h = sec('What citizens say');
    if (!c.complaints.length) h += '<p class="note">' + (c.pop > 30 ? 'No major complaints. Residents are content.' : 'Nobody lives here yet. Build a road, zone some land and connect electricity.') + '</p>';
    for (const q of c.complaints) h += '<div class="complaint"><b>' + (q.k === 'housing' ? 'Housing' : F[q.k][0]) + '</b><span>' + esc(q.t) + '</span></div>';
    h += sec('Happiness factors'); for (const k in F) h += brow(F[k][0], s.factors[k] == null ? 1 : s.factors[k]);
    h += sec('Objectives'); for (const o of M.Progression.objectives()) h += '<div class="goal' + (o[1] ? ' done' : '') + '"><i>' + (o[1] ? '✓' : '') + '</i>' + esc(o[0]) + '</div>' + (!o[1] && o[2] ? '<p class="note">' + esc(o[2]) + '</p>' : '');
    const sc = M.Progression.scenarioStatus(); if (sc) h += sec('Scenario: ' + esc(sc.name)) + '<p class="note">' + esc(sc.text) + '</p>' + brow('Population goal', sc.pct) + row('Status', sc.won ? 'Completed' : sc.lost ? 'Failed' : sc.left.toFixed(1) + ' years left');
    if (c.mode === 'sandbox') h += sec('Disasters (sandbox)') + '<div class="btns">' + [['storm', 'Storm'], ['flood', 'Flood'], ['quake', 'Earthquake'], ['firestorm', 'Fire']].map(function (d) { return '<button class="btn sm danger" data-act="disaster:' + d[0] + '">' + d[1] + '</button>'; }).join('') + '</div>';
    h += sec('City news'); for (const nw of c.news.slice(0, 14)) h += '<div class="news ' + nw.k + '"' + (nw.x != null ? ' data-act="goto:' + nw.x + ':' + nw.y + '"' : '') + '><small>' + M.dateStr(nw.d) + '</small>' + esc(nw.t) + '</div>';
    return { title: 'Advisor', html: h };
  };
  R.milestone = function () {
    const c = M.city; let h = sec('City rank');
    M.TIERS.forEach(function (t, i) {
      const un = []; for (let k = 1; k < M.ROADS.length; k++) if (M.ROADS[k].tier === i) un.push(M.ROADS[k].name); for (let d = 1; d <= 3; d++) if (M.DENS_TIER[d] === i && i) un.push(M.DENS_NAME[d] + ' zones'); for (const id in M.DEFS) { const d = M.DEFS[id]; if (d.tier === i && !d.internal) un.push(d.name); } if (i === 2) un.push('Districts & policies');
      h += '<div class="tier' + (c.tier >= i ? ' done' : '') + (c.tier === i ? ' cur' : '') + '"><b>' + (i + 1) + '. ' + t.name + '</b><small>' + (t.pop ? M.fmt(t.pop) + ' residents' + (t.reward ? ', ' + M.money(t.reward) + ' grant' : '') : 'Starting rank') + '</small><p>' + un.join(', ') + '</p></div>';
    });
    if (c.tier < 6) h += brow('Progress to ' + M.TIERS[c.tier + 1].name, c.pop / M.TIERS[c.tier + 1].pop, '#2f6fc4', M.fmt(c.pop) + ' / ' + M.fmt(M.TIERS[c.tier + 1].pop));
    h += sec('Achievements (' + Object.keys(c.ach).length + ' / ' + M.ACHIEVEMENTS.length + ')') + P.achHtml(c.ach);
    return { title: 'Milestones', html: h };
  };
  P.achHtml = function (got) { return '<div class="achs">' + M.ACHIEVEMENTS.map(function (a) { return '<div class="ach' + (got[a.id] ? ' got' : '') + '">' + icon('milestone') + '<div><b>' + a.name + '</b><small>' + a.desc + '</small></div></div>'; }).join('') + '</div>'; };
  R.stats = function () {
    const c = M.city, s = c.stats, W = M.world; const cnt = { R: 0, C: 0, I: 0, S: 0, ab: 0 }; let zoned = 0;
    W.each(function (b) { if (b.t === 'rubble') return; if (b.ab) cnt.ab++; else if (b.z) cnt['RCI'[b.z - 1]]++; else cnt.S++; }); for (let i = 0; i < W.zone.length; i++) if (W.zone[i]) zoned++;
    let h = row('City', esc(c.name)) + row('Founded', '1 Jan 2025') + row('Age', (c.day / 360).toFixed(1) + ' years') + row('Mode', (c.mode === 'sandbox' ? 'Sandbox' : 'Normal') + ', ' + M.DIFF[c.diff].name) + row('Map', W.n + ' × ' + W.n + ' tiles, seed ' + c.seed);
    h += sec('Buildings') + row('Homes', cnt.R) + row('Businesses', cnt.C) + row('Industry', cnt.I) + row('Civic and utility', cnt.S) + row('Abandoned', cnt.ab, cnt.ab ? 'warn' : '') + row('Top-level buildings', s.top) + row('Zoned tiles', M.fmt(zoned)) + row('Road tiles', M.fmt(W.roadTiles));
    h += sec('Quality of life') + brow('Happiness', s.happy) + brow('Health', s.health) + brow('Education', s.eduIdx) + brow('Average land value', s.lvAvg / 100, '#12489b', Math.round(s.lvAvg)) + brow('Air pollution at homes', s.airAvg / 40, '#b5651d', s.airAvg.toFixed(1)) + brow('Crime at homes', s.crimeAvg / 40, '#c9252c', s.crimeAvg.toFixed(1)) + row('Fires extinguished', c.counters.fires) + row('Economy', c.econ.recession > 0 ? 'Recession' : c.econ.cycle > 1.03 ? 'Boom' : 'Stable', c.econ.recession > 0 ? 'bad' : '');
    h += sec('Charts') + '<canvas class="chart" data-chart="pop"></canvas><canvas class="chart" data-chart="money"></canvas><canvas class="chart" data-chart="happy"></canvas>';
    h += '<p class="note">Simulation ' + M.Engine.simMs.toFixed(2) + ' ms per frame, ' + Math.round(M.Engine.fps) + ' FPS, ' + M.Render.stats.items + ' sprites, ' + M.Traffic.cars.length + ' vehicles</p>';
    return { title: 'Statistics', html: h, after: function (b) { charts(b, { pop: { zero: true, series: [{ data: c.hist.pop, color: '#2f6fc4', label: 'Residents' }] }, money: { series: [{ data: c.hist.money, color: '#e0a100', label: 'Treasury' }] }, happy: { series: [{ data: c.hist.happy, color: '#1c8a4b', label: 'Happiness %' }] } }); } };
  };
  P.render = function (id, arg) { return R[id] ? R[id](arg) : null; };

  // ---------------- actions & inputs ----------------
  P.act = function (a, p, el) {
    const c = M.city, b = U.panelArg;
    switch (a) {
      case 'upgrade': if (!B.upgrade(b)) { M.Audio.play('error'); U.toast('Not enough money to upgrade.', 'bad'); } break;
      case 'demolish': if (b && !b.dead) { if (B.demolish(b)) U.closePanel(); else U.toast('Not enough money.', 'bad'); } break;
      case 'center': if (b) M.Camera.centerOn(b.x + b.s / 2, b.y + b.s / 2); break;
      case 'goto': M.Camera.centerOn(+p[1], +p[2]); if (M.Camera.tz < 0.8) M.Camera.tz = 0.9; break;
      case 'loan': if (M.Economy.takeLoan(+p[1])) M.Audio.play('cash'); break;
      case 'repay': if (M.Economy.repayLoan(+p[1])) M.Audio.play('cash'); break;
      case 'expand': if (B.expand()) { M.Audio.play('cash'); U.buildTray(); } else { M.Audio.play('error'); U.toast('Not enough money to extend the city limits.', 'bad'); } break;
      case 'ptab': P.polTab = +p[1]; M.Audio.play('click'); break;
      case 'paint': U.cat = 'district'; U.setOverlay('district'); B.setTool({ type: 'district', id: +p[1] }); break;
      case 'pol': { const t = +p[1], pol = t ? c.districts[t].pol : c.pol; pol[p[2]] = !pol[p[2]]; M.Audio.play('select'); M.Services.dirty = true; break; }
      case 'disaster': M.Env.trigger(M.world, c, p[1]); break;
      default: return M.Menu.act(a, p, el);
    }
    U.timer = 0; U.refreshPanel(true);
  };
  P.input = function (key, el, final) {
    const c = M.city, p = key.split(':'), v = el.type === 'checkbox' ? el.checked : el.value;
    switch (p[0]) {
      case 'tax': c.tax[p[1]] = +v; { const e = U.$('#tx-' + p[1]); if (e) e.textContent = v + '%'; } break;
      case 'budget': c.budget[p[1]] = +v; { const e = U.$('#bg-' + p[1]); if (e) e.textContent = v + '%'; } M.Services.dirty = true; if (p[1] === 'roads') M.roadCond = Math.min(1, 0.6 + 0.4 * v / 100); break;
      case 'dtax': c.districts[+p[1]].tax = +v; { const e = U.$('#dt-' + p[1]); if (e) e.textContent = (v >= 0 ? '+' : '') + v + '%'; } break;
      case 'dname': c.districts[+p[1]].name = String(v).slice(0, 24) || 'District ' + p[1]; if (final) U.buildTray(); break;
      default: M.Menu.input(p, v, el, final);
    }
  };
})();
