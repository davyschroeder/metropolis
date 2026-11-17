'use strict';
/* METROPOLIS – municipal finances: taxes, upkeep, budgets, loans, business cycle, bankruptcy */
(function () {
  const E = M.Economy = {};
  const PROD_I = [0, 12, 13, 15, 17, 26], PROD_C = [0, 13, 14, 16, 16, 21];
  M.roadCond = 1;
  E.upkeepOf = function (b) {
    if (b.z) return 0; const d = M.DEFS[b.t]; if (!d.upkeep || b.built < 1) return 0;
    return d.upkeep * (1 + (b.up - 1) * 0.4) * (d.dept ? M.city.budget[d.dept] / 100 : 1) * M.DIFF[M.city.diff].cost;
  };
  E.spend = function (amount) { const c = M.city; if (c.mode === 'sandbox') return true; if (c.money < amount) return false; c.money -= amount; return true; };
  E.canAfford = function (amount) { return M.city.mode === 'sandbox' || M.city.money >= amount; };
  E.takeLoan = function (k) {
    const c = M.city, L = M.LOANS[k]; if (!L || c.loans.length >= 3) return false;
    const total = L.amount * (1 + L.rate * L.months / 12 / 2);
    c.loans.push({ amount: L.amount, left: L.amount, months: L.months, rate: L.rate, pay: Math.round(L.amount / L.months) });
    c.money += L.amount; c.counters.hadLoan = true; void total;
    M.news('Loan of ' + M.money(L.amount) + ' approved.', 'info');
    return true;
  };
  E.repayLoan = function (idx) {
    const c = M.city, l = c.loans[idx]; if (!l || c.money < l.left) return false;
    c.money -= l.left; c.loans.splice(idx, 1); M.news('Loan repaid in full.', 'good');
    return true;
  };
  E.debt = function () { let d = 0; for (const l of M.city.loans) d += l.left; return d; };

  E.month = function (W, city) {
    const diff = M.DIFF[city.diff], G = M.Zoning, n = W.n, N = n * n, s = city.stats, cyc = city.econ.cycle, tot = M.Services.totals || {};
    const inc = { R: 0, C: 0, I: 0, fares: 0 }, exp = { loans: 0, policies: 0, repairs: Math.round(city.fin.repairs || 0) };
    for (const d of M.DEPTS) exp[d.id] = 0;
    const dpop = new Float32Array(9); const cust = Math.min(1, s.cust), cargo = tot.cargo ? 1.1 : 1;
    W.each(function (b) {
      const i = b.y * n + b.x;
      if (b.z === 1) { if (!b.ab) { inc.R += b.pop * M.INCOME[b.wealth] * G.taxRate(city, W, 1, i) / 100; dpop[W.district[i]] += b.pop; } }
      else if (b.z === 2) { if (b.on) inc.C += b.filled * PROD_C[b.lvl] * cust * cyc * G.taxRate(city, W, 2, i) / 100 * (M.pol('smallbiz', i) ? 0.9 : 1) * (M.pol('trucks', i) ? 0.92 : 1); }
      else if (b.z === 3) { if (b.on) inc.I += b.filled * PROD_I[b.lvl] * cyc * cargo * G.taxRate(city, W, 3, i) / 100 * (M.pol('filters', i) ? 0.88 : 1); }
      else { const d = M.DEFS[b.t]; if (d.dept) exp[d.dept] += E.upkeepOf(b); }
    });
    let roadCost = 0, lineCost = 0;
    for (let i = 0; i < N; i++) {
      const t = W.road[i]; if (t) roadCost += M.ROADS[t].upkeep * (W.elev[i] === 0 ? M.BRIDGE_UPKEEP : 1);
      if (W.pline[i]) lineCost += M.DEFS.pline.upkeep;
    }
    exp.roads += roadCost * city.budget.roads / 100 * diff.cost; exp.power += lineCost;
    M.roadCond = Math.min(1, 0.6 + 0.4 * city.budget.roads / 100);
    // policies
    for (const p of M.POLICIES) {
      if (!p.cost) continue;
      if (city.pol[p.id]) exp.policies += p.cost * city.pop / 100;
      else for (let d = 1; d <= 8; d++) if (city.districts[d].pol[p.id]) exp.policies += p.cost * dpop[d] / 100;
    }
    // transit fares
    inc.fares = city.pol.transit ? 0 : city.transit.riders * 0.12; /* a bus network roughly pays for itself; it is no money machine */ city.transit.fares = inc.fares;
    // loans
    for (let k = city.loans.length - 1; k >= 0; k--) {
      const l = city.loans[k], interest = l.left * l.rate / 12, pay = Math.min(l.left, l.pay);
      exp.loans += interest + pay; l.left -= pay;
      if (l.left <= 0.5) { city.loans.splice(k, 1); M.news('A loan has been fully repaid.', 'good'); }
    }
    for (const k of ['R', 'C', 'I']) inc[k] *= diff.tax;
    let it = 0, et = 0; for (const k in inc) { inc[k] = Math.round(inc[k]); it += inc[k]; } for (const k in exp) { exp[k] = Math.round(exp[k]); et += exp[k]; }
    city.fin = { inc: inc, exp: exp, incTotal: it, expTotal: et, repairs: 0 };
    if (city.mode !== 'sandbox') city.money += it - (et - exp.repairs); // repairs were already paid day by day
    else city.money = Math.max(city.money, 1e6);
    // business cycle
    const ec = city.econ; ec.t++;
    if (ec.recession > 0) { ec.recession--; if (ec.recession === 0) M.news('The recession is over. The economy is growing again.', 'good'); }
    else if (city.pop > 1200 && M.rand() < 0.006 * diff.disaster) { ec.recession = 10 + ((M.rand() * 9) | 0); M.news('Recession! Businesses earn less and demand is falling.', 'bad'); }
    const target = 1 + 0.07 * Math.sin(ec.t * Math.PI * 2 / 96) - (ec.recession > 0 ? 0.16 : 0);
    ec.cycle += (target - ec.cycle) * 0.3;
    // history
    const h = city.hist; h.pop.push(city.pop); h.money.push(Math.round(city.money)); h.inc.push(it); h.exp.push(et); h.happy.push(Math.round(s.happy * 100));
    for (const k in h) if (h[k].length > 240) h[k].shift();
    // solvency
    const cn = city.counters;
    cn.surplus = it > et ? cn.surplus + 1 : 0;
    if (city.mode !== 'sandbox') {
      if (city.money < 0) {
        cn.neg++;
        if (cn.neg === 1) M.news('The treasury is empty! Raise taxes, cut budgets or take a loan.', 'bad');
        else if (cn.neg === 6) M.news('The city has been in the red for six months. Bankruptcy looms.', 'bad');
        if (cn.neg >= 12) {
          if (!city.bailout) { city.bailout = true; cn.neg = 0; const amt = Math.round(-city.money + 20000); city.loans.push({ amount: amt, left: amt, months: 120, rate: 0.12, pay: Math.round(amt / 120) }); city.money += amt; cn.hadLoan = true; M.news('Emergency bailout: the state covers your debts with a 12% loan of ' + M.money(amt) + '. There will not be another.', 'bad'); M.emit('bailout'); }
          else { city.gameOver = true; M.emit('gameover'); }
        }
      } else cn.neg = 0;
    }
  };
})();
