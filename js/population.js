'use strict';
/* METROPOLIS – population cohorts, employment, education, health, happiness and RCI demand */
(function () {
  const P = M.Population = {};
  M.INCOME = [0, 8, 14, 26];
  const CELL = 8; let grid = null, gw = 0;
  P.popNear = function (W, i) {
    if (!grid) return 0; const n = W.n, cx = ((i % n) / CELL) | 0, cy = (((i / n) | 0) / CELL) | 0; let s = 0;
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (x >= 0 && y >= 0 && x < gw && y < gw) s += grid[y * gw + x];
    return s;
  };
  P.FACTORS = {
    power: ['Electricity', 'Homes without electricity', 0.12], water: ['Water', 'Homes without running water', 0.10], garbage: ['Garbage', 'Garbage is piling up in the streets', 0.05],
    health: ['Healthcare', 'Not enough clinics and hospitals nearby', 0.08], edu: ['Education', 'Children have no school nearby', 0.07], safety: ['Safety', 'Crime is too high', 0.10],
    fire: ['Fire protection', 'No fire station covers these homes', 0.05], parks: ['Parks', 'Nowhere green to relax', 0.07], env: ['Environment', 'Pollution and noise make life miserable', 0.14],
    commute: ['Commute', 'The drive to work takes too long', 0.08], tax: ['Taxes', 'Taxes are too high', 0.07], jobs: ['Jobs', 'Too many people are out of work', 0.07]
  };
  function sround(v) { const f = Math.floor(v); return f + (M.rand() < v - f ? 1 : 0); }

  P.month = function (W, city) {
    const s = city.stats, coh = city.coh, n = W.n, Sv = M.Services, tot = Sv.totals || {}, R = M.Roads, G = M.Zoning;
    if (!grid || gw !== Math.ceil(n / CELL)) { gw = Math.ceil(n / CELL); grid = new Float32Array(gw * gw); }
    // ---- jobs & employment ----
    let jobsC = 0, jobsI = 0, jobsS = 0, skilled = 0, capR = 0, top = 0;
    W.each(function (b) {
      b.age++;
      if (b.z && b.lvl === 5 && !b.ab) top++;
      if (b.z === 2) { if (b.on) { jobsC += b.cap; if (b.lvl >= 3) skilled += b.cap; } }
      else if (b.z === 3) { if (b.on) { jobsI += b.cap; if (b.lvl === 5) skilled += b.cap; } }
      else if (b.z === 1) { if (!b.ab && (b.built >= 1 || b.reno)) capR += b.cap; }
      else if (b.on) { const d = M.DEFS[b.t]; if (d.jobs) { jobsS += d.jobs; skilled += d.jobs * 0.5; } }
    });
    const jobs = jobsC + jobsI + jobsS, workforce = coh.a * 0.74, educated = workforce * (city.edu[2] + city.edu[3]);
    const unskilled = jobs - skilled, skF = Math.min(skilled, educated), unF = Math.min(unskilled, Math.max(0, workforce - skF));
    const employed = skF + unF, unemp = workforce > 1 ? M.clamp(1 - employed / workforce, 0, 1) : 0;
    const fillSk = skilled > 0 ? skF / skilled : 1, fillUn = unskilled > 0 ? unF / unskilled : 1;
    s.jobs = jobs; s.jobsC = jobsC; s.jobsI = jobsI; s.workforce = workforce; s.employed = employed; s.unemp = unemp; s.top = top;
    s.fillSk = fillSk; s.fillUn = fillUn; s.housing = capR;

    // ---- per-building update ----
    const F = P.FACTORS, fs = {}; for (const k in F) fs[k] = 0;
    let pop = 0, hSum = 0, wSum = 0, airSum = 0, comSum = 0, comPop = 0, e1 = 0, e2 = 0, hc = 0, garbSum = 0, crimeSum = 0, lowW = 0;
    grid.fill(0);
    const needG = M.need('garbage'), needH = M.need('health'), needE = M.need('edu'), needF = M.need('fire'), needK = M.need('park');
    const healthSvc = needH ? Math.min(1, (tot.health || 0) / Math.max(1, city.pop)) : 1;
    const fJ = 1 - Math.min(1, unemp * 5), cust = s.cust, toRemove = [];
    W.each(function (b) {
      if (!b.z) return;
      const key = G.KEY[b.z], i = b.y * n + b.x, rd = R.access(W, b);
      if (b.ab) {
        b.ab++;
        if (b.pw && rd >= 0 && city.demand[key] > 0.15 && M.rand() < 0.25) { b.ab = 0; b.bad = 0; W.bldVer++; M.emit('bld', b, true); }
        else if (b.ab > 24) toRemove.push(b);
        return;
      }
      if (b.built < 1 && !b.reno) return;
      if (b.z !== 1) {
        const f = b.on ? ((b.z === 2 && b.lvl >= 3) || (b.z === 3 && b.lvl === 5) ? fillSk : fillUn) : 0;
        b.filled = Math.max(0, Math.min(b.cap, sround(b.filled + (b.cap * f - b.filled) * 0.5)));
        const trouble = !b.pw || rd < 0 || (b.on && f < 0.3) || (b.z === 2 && cust < 0.45) || city.demand[key] < -0.6;
        if (trouble) { if (M.rand() < 0.6) b.bad++; } else if (b.bad > 0) b.bad--;
        if (b.bad >= 6) { b.ab = 1; b.filled = 0; b.on = false; W.bldVer++; M.emit('bld', b, true); }
        return;
      }
      const rate = G.taxRate(city, W, 1, i);
      const f = {
        power: b.pw ? 1 : 0, water: b.wt ? 1 : (b.lvl < 2 ? 0.6 : 0), garbage: needG ? 1 - b.garb : 1,
        health: needH ? Sv.cov(W, 'health', i) * healthSvc : 0.8,
        edu: needE ? (city.tier >= 2 ? W.edu[i] * 0.6 + W.edu2[i] * 0.4 : W.edu[i]) : 0.8,
        safety: 1 - Math.min(1, W.crime[i] / 45), fire: needF ? Sv.cov(W, 'fire', i) : 0.8,
        parks: needK ? 0.25 + 0.75 * Sv.cov(W, 'park', i) : 0.7,
        env: 1 - Math.min(1, (W.air[i] * 1.2 + W.noise[i] * 0.6 + W.gnd[i] * 0.8) / 60),
        commute: b.commute < 0 ? 0.45 : b.commute === 0 ? 0.8 : 1 - M.clamp((b.commute - 14) / 45, 0, 1),
        tax: M.clamp(1 - (rate - 7) / 12, 0, 1.1), jobs: fJ
      };
      let h = 0; for (const k in F) h += f[k] * F[k][2];
      if (M.pol('power', i)) h -= 0.015; if (M.pol('water', i)) h -= 0.015;
      b.happy += (h - b.happy) * 0.5;
      const lv = W.lv[i]; let wl = lv < 38 ? 1 : lv < 62 ? 2 : 3; if (wl === 3 && s.eduIdx < 0.2) wl = 2; b.wealth = wl;
      let target = rd < 0 ? 0 : b.cap * M.clamp(0.78 + city.demand.R * 0.4 + (b.happy - 0.6) * 1.1, 0.05, 1);
      if (!b.pw) target *= 0.25;
      b.pop = Math.max(0, Math.min(b.cap, sround(b.pop + (target - b.pop) * 0.2)));
      if (!b.pw || rd < 0 || b.happy < 0.28) b.bad++; else if (b.bad > 0) b.bad--;
      if (b.bad >= 5) { b.ab = 1; b.pop = 0; b.on = false; W.bldVer++; M.emit('bld', b, true); return; }
      const p = b.pop; pop += p; hSum += b.happy * p; wSum += wl * p; airSum += W.air[i] * p; garbSum += b.garb * p; crimeSum += W.crime[i] * p; if (wl === 1) lowW += p;
      for (const k in F) fs[k] += f[k] * p;
      if (b.commute > 0) { comSum += b.commute * p; comPop += p; }
      e1 += W.edu[i] * p; e2 += W.edu2[i] * p; hc += Sv.cov(W, 'health', i) * p;
      grid[(((b.y / CELL) | 0) * gw) + ((b.x / CELL) | 0)] += p;
    });
    for (const b of toRemove) W.removeBuilding(b);
    const pd = Math.max(1, pop);
    s.happy = pop ? hSum / pd : 0.6; s.airAvg = airSum / pd; s.crimeAvg = crimeSum / pd; s.commute = comPop ? comSum / comPop : 0;
    for (const k in F) s.factors[k] = pop ? fs[k] / pd : 1;
    const wealthAvg = pop ? wSum / pd : 1;

    // ---- cohorts: births, deaths, ageing, migration ----
    const health = s.health;
    const births = coh.a * 0.0011 * (0.6 + 0.6 * health), deaths = coh.s * 0.0045 * (1.6 - health) + coh.a * 0.00012 * (1.5 - health) + coh.c * 0.00004;
    const up1 = coh.c / 216, up2 = coh.a / 564;
    coh.c += births - up1 - coh.c * 0.00004; coh.a += up1 - up2 - coh.a * 0.00012 * (1.5 - health); coh.s += up2 - coh.s * 0.0045 * (1.6 - health);
    let total = coh.c + coh.a + coh.s; const mig = pop - total;
    if (mig > 0) {
      coh.c += mig * 0.22; coh.a += mig * 0.7; coh.s += mig * 0.08;
      const q = M.clamp((s.lvAvg - 25) / 50, 0, 1), inc = [0.4 - 0.25 * q, 0.35, 0.18 + 0.15 * q, 0.07 + 0.1 * q], w = coh.a > 0 ? Math.min(1, mig * 0.7 / coh.a) : 1;
      for (let k = 0; k < 4; k++) city.edu[k] = city.edu[k] * (1 - w) + inc[k] * w;
    } else if (total > 0) { const k = pop / total; coh.c *= k; coh.a *= k; coh.s *= k; }
    s.births = births; s.deaths = deaths; s.migration = mig; city.pop = pop;
    s.households = Math.round(pop / (1.7 + 2.4 * (pop ? coh.c / pd : 0.2)));
    const ut = city.util; ut.graves = tot.graves || 0;
    ut.gravesUsed = Math.max(0, ut.gravesUsed + (M.need('graves') ? deaths : 0) - ut.graves * 0.004);
    const graveOver = M.need('graves') && ut.gravesUsed > ut.graves ? Math.min(1, (ut.gravesUsed - ut.graves) / 200) : 0;
    if (!M.need('graves')) ut.gravesUsed = 0; else if (ut.gravesUsed > ut.graves + 400) ut.gravesUsed = ut.graves + 400;

    // ---- education ----
    const cE1 = e1 / pd, cE2 = e2 / pd;
    let p1 = Math.min(1, (tot.seats || 0) / Math.max(1, coh.c * 0.36)) * cE1, p2 = p1 * Math.min(1, (tot.seats2 || 0) / Math.max(1, coh.c * 0.33)) * cE2;
    if (city.pol.edu) { p1 = Math.min(1, p1 * 1.15); p2 = Math.min(1, p2 * 1.15); }
    const p3 = p2 * Math.min(1, (tot.seats3 || 0) / Math.max(1, coh.a * 0.07)) * 0.6;
    const dist = [1 - p1, p1 - p2, p2 - p3, p3], r = 0.02;
    for (let k = 0; k < 4; k++) city.edu[k] = city.edu[k] * (1 - r) + dist[k] * r;
    if (tot.libs) { const mv = Math.min(city.edu[0], 0.004 * Math.min(4, tot.libs)); city.edu[0] -= mv; city.edu[1] += mv; }
    let es = 0; for (let k = 0; k < 4; k++) es += city.edu[k]; for (let k = 0; k < 4; k++) city.edu[k] /= es || 1;
    s.eduIdx = city.edu[1] * 0.33 + city.edu[2] * 0.67 + city.edu[3];
    s.seatUse = [coh.c * 0.36, coh.c * 0.33, coh.a * 0.07];

    // ---- health, income, poverty ----
    const hs = needH ? healthSvc * (hc / pd) : 0.75;
    s.health = M.clamp(0.55 + 0.38 * hs - s.airAvg / 70 - ut.waterPol * (ut.clean ? 0.05 : 0.3) - (garbSum / pd) * 0.15 - graveOver * 0.12 + Math.min(0.06, tot.healthBonus || 0), 0.1, 1);
    s.healthSvc = hs;
    s.income = M.INCOME[1] * (pop ? 1 : 0) + (wealthAvg - 1) * 9; s.income *= 1 - unemp * 0.5;
    s.poverty = M.clamp(unemp * 1.5 + (lowW / pd) * (0.35 - s.eduIdx * 0.3), 0, 1);
    s.wealthAvg = wealthAvg;

    // ---- demand ----
    const cyc = city.econ.cycle, wf = 0.8 + (wealthAvg - 1) * 0.25, vac = capR > 0 ? (capR - pop) / capR : 0, happyF = (s.happy - 0.5) * 2;
    const purchasing = pop * 0.25 * wf * cyc * (1 + (tot.commerce || 0) + (tot.airport || 0) * 0.12);
    s.cust = jobsC > 0 ? M.clamp(purchasing / jobsC, 0.2, 1.2) : 1;
    let rD = M.clamp((jobs - workforce) / Math.max(60, workforce), -0.25, 0.5) * 1.3 + 0.45 * happyF + 0.15 - Math.max(0, vac - 0.08) * 2.2 - (city.tax.R - 9) * 0.05 + (pop < 400 ? 0.4 : 0) + (tot.regional || 0);
    let cD = (purchasing - jobsC) / Math.max(40, jobsC) * 1.1 + (unemp - 0.04) * 2 - (city.tax.C - 9) * 0.05 + (city.pol.smallbiz ? 0.1 : 0);
    let iD = ((pop * 0.23 + Math.min(50, pop * 0.25) + (tot.cargo || 0) * 250) * cyc - jobsI) / Math.max(40, jobsI) * 1.1 + (unemp - 0.04) * 2.2 - (city.tax.I - 9) * 0.05 - (city.pol.filters ? 0.08 : 0) - (city.pol.noheavy ? 0.08 : 0);
    const dm = city.demand;
    dm.R += (M.clamp(rD, -1, 1) - dm.R) * 0.5; dm.C += (M.clamp(cD, -1, 1) - dm.C) * 0.5; dm.I += (M.clamp(iD, -1, 1) - dm.I) * 0.5;
    s.vacancy = vac;

    // ---- complaints ----
    const list = []; if (pop > 30) for (const k in F) if (s.factors[k] < 0.62) list.push({ k: k, v: s.factors[k], t: F[k][1] });
    list.sort(function (a, b) { return a.v * (1.2 - F[a.k][2]) - b.v * (1.2 - F[b.k][2]); });
    if (pop > 30 && vac < 0.03 && dm.R > 0.3) list.unshift({ k: 'housing', v: 0.3, t: 'There is a housing shortage – zone more residential land' });
    city.complaints = list.slice(0, 4);
  };
})();
