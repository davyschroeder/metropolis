'use strict';
/* METROPOLIS – progression: city tiers, unlocks, objectives, achievements, scenarios, advisor hints */
(function () {
  const Pr = M.Progression = {};
  let cntVer = -1, cnt = {};
  Pr.count = function (t) {
    const W = M.world;
    if (cntVer !== W.bldVer) { cntVer = W.bldVer; cnt = {}; W.each(function (b) { if (!b.z && b.built >= 1) cnt[b.t] = (cnt[b.t] || 0) + 1; }); }
    return cnt[t] || 0;
  };
  function zoned(z) { const W = M.world; for (let i = 0; i < W.zone.length; i++) if (W.zone[i] === z) return true; return false; }
  // objectives for the current tier: [text, done, hint]
  Pr.objectives = function () {
    const c = M.city, W = M.world, u = c.util, s = c.stats, C = Pr.count, T = M.TIERS, t = c.tier;
    const goal = function () { return t < 6 ? ['Reach ' + M.fmt(T[t + 1].pop) + ' residents (' + M.fmt(c.pop) + ')', false, 'Keep demand high: zone what the R, C and I bars ask for and keep people happy.'] : null; };
    let o;
    if (t === 0) o = [
      ['Build a road', W.roadTiles > 3, 'Open Roads (key 1), pick the Two-Lane Street and drag across the land.'],
      ['Zone residential land', zoned(1), 'Open Residential (key 2) and drag a rectangle next to your road. Homes must be within 2 tiles of a road.'],
      ['Generate electricity', u.pCap > 0, 'Open Electricity (key 5) and place a wind turbine or coal plant beside a road. Roads carry power to everything within 3 tiles.'],
      ['Supply water', u.wCap > 0, 'Open Water (key 6). A pump must be within 2 tiles of water; a water tower works anywhere. Both must be near a road.'],
      ['Zone commercial and industrial land', zoned(2) && zoned(3), 'Residents need jobs. Zone industry downwind and shops close to homes.']];
    else if (t === 1) o = [
      ['Set up garbage collection', C('landfill') + C('recycle') > 0, 'Place a landfill (Water & Waste) away from homes – it lowers land value.'],
      ['Build a fire station', C('fire') > 0, 'Public Services (key 7). Fire trucks need a road route to reach a fire.'],
      ['Build a police station', C('police') > 0, 'Crime grows with density and unemployment. Police stations suppress it nearby.'],
      ['Open a clinic', C('clinic') + C('hospital') > 0, 'Healthcare keeps residents healthy and happy.'],
      ['Open an elementary school', C('elem') > 0, 'Education slowly raises skills, which unlocks offices and better industry.']];
    else if (t === 2) o = [
      ['Treat your sewage', u.sCap > 0, 'Without a sewage plant, waste water pollutes rivers and makes people ill.'],
      ['Open a high school', C('high') > 0, 'High-school graduates can fill skilled jobs.'],
      ['Start a bus service', c.transit.stops >= 2, 'Build a bus depot and at least two bus stops next to roads on the same network.'],
      ['Build a cemetery', C('cemetery') > 0, 'Every city needs somewhere to bury its dead.'],
      ['Create a district and set a policy', c.districts.some(function (d) { return d && Object.keys(d.pol).some(function (k) { return d.pol[k]; }); }) || Object.keys(c.pol).some(function (k) { return c.pol[k]; }), 'Open Districts in the toolbar to paint a district, then open the Policies panel.']];
    else if (t === 3) o = [
      ['Build a hospital', C('hospital') > 0, 'Clinics cannot serve a city this size alone.'],
      ['Found a university', C('uni') > 0, 'A university unlocks high-tech industry and office towers.'],
      ['Zone high-density land', (function () { for (let i = 0; i < W.zdens.length; i++) if (W.zdens[i] === 3) return true; return false; })(), 'High density allows apartment complexes, malls and towers on 2×2 lots.'],
      ['Keep unemployment under 8%', s.unemp < 0.08, 'Balance jobs and workers: watch the demand bars.']];
    else if (t === 4) o = [
      ['Education index of 50%', s.eduIdx >= 0.5, 'Enough seats in every school level, and patience.'],
      ['Keep average congestion under 80%', s.congestion < 0.8, 'Upgrade busy streets to avenues, add buses and build highways.'],
      ['Grow 5 top-level buildings', s.top >= 5, 'High density, high land value, water and strong demand.']];
    else if (t === 5) o = [
      ['Build the Metropolis Spire', C('landmark') > 0, 'Find it under Decorations.'],
      ['Happiness of 75%', s.happy >= 0.75, 'Check the Advisor panel for what citizens complain about.']];
    else o = [['Happiness of 80%', s.happy >= 0.8, ''], ['Hold $1,000,000', c.money >= 1e6, '']];
    const g = goal(); if (g) o.push(g);
    return o;
  };
  Pr.grant = function (id) {
    const c = M.city; if (c.ach[id]) return; c.ach[id] = c.day || 1;
    const a = M.ACHIEVEMENTS.find(function (x) { return x.id === id; });
    M.news('Achievement unlocked: ' + a.name, 'good'); M.emit('achievement', a);
  };
  Pr.month = function (W, city) {
    const s = city.stats, T = M.TIERS;
    while (city.tier < 6 && city.pop >= T[city.tier + 1].pop) {
      city.tier++; const t = T[city.tier];
      if (city.mode !== 'sandbox') city.money += t.reward;
      M.news('Your settlement is now a ' + t.name + '! New buildings unlocked' + (t.reward && city.mode !== 'sandbox' ? ' and a ' + M.money(t.reward) + ' grant received.' : '.'), 'good');
      M.emit('tier', city.tier);
    }
    const g = Pr.grant, p = city.pop;
    if (p >= 100) g('settlers'); if (p >= 500) g('town'); if (p >= 6000) g('city'); if (p >= 40000) g('metro'); if (p >= 100000) g('mega');
    if (city.counters.surplus >= 12) g('black');
    if (city.mode !== 'sandbox' && city.money >= 500000) g('rich');
    if (city.counters.hadLoan && !city.loans.length && city.scenario !== 'debt') g('debtfree');
    if (p >= 5000 && s.airAvg < 4) g('clean');
    if (p >= 2000 && city.util.cleanShare >= 0.999 && city.util.pShort < 0.02) g('green');
    if (p >= 3000 && s.eduIdx >= 0.7) g('scholar');
    if (p >= 2000 && s.happy >= 0.85) g('happy');
    if (p >= 8000 && s.congestion < 0.4 && s.congestion > 0) g('flow');
    if (s.top >= 10) g('skyline');
    if (city.counters.fires >= 10) g('firefighter');
    if (city.transit.riders >= 2000) g('riders');
    if (p >= 2000 && s.unemp < 0.03) g('jobs');
    if (p >= 5000 && s.crimeAvg < 5) g('safe');
    // scenario
    const sc = M.SCENARIOS.find(function (x) { return x.id === city.scenario; });
    if (sc && sc.goalPop && !city.won && !city.lost) {
      let ok = p >= sc.goalPop;
      if (sc.maxAir != null && s.airAvg > sc.maxAir) ok = false;
      if (sc.noCoal && Pr.count('coal') > 0) ok = false;
      if (sc.debt && city.loans.length) ok = false;
      if (ok) { city.won = true; g('scenario'); M.news('Scenario complete: ' + sc.name + '!', 'good'); M.emit('scenario', true, sc); }
      else if (city.day >= sc.years * 360) { city.lost = true; M.news('Time is up: the "' + sc.name + '" scenario was not completed. You may keep playing.', 'bad'); M.emit('scenario', false, sc); }
    }
  };
  Pr.scenarioStatus = function () {
    const c = M.city, sc = M.SCENARIOS.find(function (x) { return x.id === c.scenario; }); if (!sc || !sc.goalPop) return null;
    const left = Math.max(0, sc.years - c.day / 360);
    return { name: sc.name, text: sc.desc, left: left, won: c.won, lost: c.lost, pct: Math.min(1, c.pop / sc.goalPop) };
  };
})();
