// Focused checks of individual game mechanics (headless). Run: node test/mechanics-test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['core', 'buildings', 'terrain', 'world', 'roads', 'utilities', 'services', 'environment', 'zoning', 'population', 'economy', 'traffic', 'progression', 'construction', 'engine'])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
M.settings = { daynight: true }; M.rand = M.rng(99);
let fails = 0, n = 0; function ok(c, msg) { n++; if (!c) { fails++; console.log('  FAIL: ' + msg); } else console.log('  ok: ' + msg); }
const B = M.Build, R = M.Roads;
function fresh(o) { M.rand = M.rng(99); M.Engine.newGame(Object.assign({ name: 'T', seed: 4242, size: 96, mode: 'normal', diff: 'normal', disasters: false }, o || {})); return M.world; }
function road(t, a, b, c, d) { const k = B.checkRoad(t, B.linePath(a, b, c, d)); return k.ok ? B.applyRoad(t, k) : false; }
function zone(z, d, a, b, c, e) { return B.applyZone(z, d, B.checkZone(z, d, B.rect(a, b, c, e))); }
function build(id, x, y) { const k = B.checkBuild(id, x, y); return k.ok ? B.applyBuild(id, k, 0) : null; }
function run(days) { for (let d = 0; d < days; d++) { M.Engine.tickDay(); M.Traffic.update(0.5, M.world, M.city, null); } }
function town(extra) { // a compact working town
  const W = fresh(extra), sx = W.start.x, sy = W.start.y;
  for (let k = -1; k <= 1; k++) { road(2, sx - 10, sy + k * 5, sx + 10, sy + k * 5); road(2, sx + k * 10, sy - 5, sx + k * 10, sy + 5); }
  zone(1, 1, sx - 9, sy - 4, sx - 1, sy + 4); zone(2, 1, sx + 1, sy - 4, sx + 5, sy + 4); zone(3, 1, sx + 6, sy - 4, sx + 9, sy + 4);
  build('coal', sx - 3, sy - 9); build('wtower', sx + 4, sy - 7); build('wtower', sx + 6, sy - 7); build('wtower', sx + 8, sy - 7);
  return W;
}
console.log('1. roads'); {
  const W = fresh(), sx = W.start.x, sy = W.start.y;
  road(5, sx, sy, sx + 8, sy); const a = W.idx(sx, sy), b = W.idx(sx + 8, sy);
  ok(R.path(W, a, b, 0) && R.path(W, a, b, 0).length === 9, 'one-way street can be driven in its direction');
  ok(R.path(W, b, a, 0) === null, 'one-way street cannot be driven against its direction');
  road(2, sx, sy, sx, sy + 3); road(2, sx, sy + 3, sx + 8, sy + 3); road(2, sx + 8, sy + 3, sx + 8, sy);
  const back = R.path(W, b, a, 0); ok(back && back.length === 15, 'return trip detours around the one-way street (' + (back && back.length) + ' tiles)');
  const before = M.city.money; road(2, sx + 2, sy + 6, sx + 5, sy + 6); const cost = before - M.city.money; ok(cost === 80, 'street costs $20 per tile (' + cost + ')');
  const u = M.city.money; road(3, sx + 2, sy + 6, sx + 5, sy + 6); ok(W.road[W.idx(sx + 3, sy + 6)] === 3 && u - M.city.money === 180, 'dragging an avenue over a street upgrades it');
  // bridge
  let wx = -1, wy = -1; for (let y = W.limit.y0 + 2; y < W.limit.y1 - 2 && wx < 0; y++) for (let x = W.limit.x0 + 2; x < W.limit.x1 - 6; x++) if (W.elev[W.idx(x, y)] === 1 && W.elev[W.idx(x + 1, y)] === 0) { let k = 1; while (W.elev[W.idx(x + k, y)] === 0 && k < 12) k++; if (k < 12 && W.elev[W.idx(x + k, y)] === 1) { wx = x; wy = y; W._bl = k; break; } }
  if (wx >= 0) { const m0 = M.city.money, len = W._bl; ok(!B.checkRoad(1, B.linePath(wx, wy, wx + len, wy)).ok, 'dirt road cannot cross water'); ok(road(2, wx, wy, wx + len, wy), 'street bridges ' + (len - 1) + ' water tiles'); ok(m0 - M.city.money === 20 * 2 + 100 * (len - 1), 'bridge tiles cost 5x'); ok(W.eh(W.idx(wx + 1, wy)) === 1, 'bridge deck sits above the water'); }
  else console.log('  (no narrow water crossing inside the limits on this seed)');
  const m1 = M.city.money, rt = W.roadTiles; road(2, sx - 6, sy - 6, sx - 2, sy - 6); B.undoLast(); ok(M.city.money === m1 && W.roadTiles === rt, 'undo removes the road and refunds it');
}
console.log('2. electricity and water'); {
  const W = fresh(), c = M.city, sx = W.start.x, sy = W.start.y;
  road(2, sx - 6, sy, sx + 6, sy); zone(1, 1, sx - 6, sy + 1, sx + 6, sy + 2);
  run(60); ok(W.count === 0, 'nothing grows without electricity');
  const wind = build('wind', sx - 6, sy - 6); run(40); ok(c.util.pCap > 0 && W.count === 1, 'a disconnected turbine powers nothing');
  B.applyLine(B.checkLine(B.linePath(sx - 6, sy - 5, sx - 6, sy - 1))); run(120); ok(W.count > 5, 'a power line to the road network lets homes grow (' + (W.count - 1) + ')');
  let unp = 0; W.each(b => { if (b.z && b.built >= 1 && !b.pw) unp++; }); ok(unp === 0, 'all homes powered while supply covers demand');
  const full = M.DEFS.wind.power; M.DEFS.wind.power = 0.9; run(14);
  unp = 0; let tot = 0; W.each(b => { if (b.z && b.built >= 1) { tot++; if (!b.pw) unp++; } }); ok(c.util.pUse > c.util.pCap && unp > 0 && unp < tot, 'demand above capacity causes partial brownouts (' + unp + ' of ' + tot + ' buildings dark, ' + c.util.pUse.toFixed(1) + '/' + c.util.pCap.toFixed(1) + ' MW)');
  M.DEFS.wind.power = full; run(14); unp = 0; W.each(b => { if (b.z && b.built >= 1 && !b.pw) unp++; }); ok(unp === 0, 'power returns when capacity is restored');
  ok(!B.checkBuild('pump', sx, sy - 4).ok || W.nearWater(sx, sy - 4, 1, 2), 'water pump placement requires nearby water');
  let dry = 0; W.each(b => { if (b.z && b.built >= 1 && !b.wt) dry++; }); ok(dry > 0, 'no water source: buildings report no water (' + dry + ')');
  build('wtower', sx + 7, sy - 1); run(40); dry = 0; W.each(b => { if (b.z && b.built >= 1 && b.pw && !b.wt) dry++; }); ok(c.util.wCap > 0 && dry === 0, 'a water tower beside the road supplies the network (' + c.util.wCap.toFixed(0) + ' units, ' + dry + ' dry buildings)');
  void wind;
}
console.log('3. zoning and growth'); {
  const W = fresh(), sx = W.start.x, sy = W.start.y;
  build('coal', sx - 3, sy - 9); road(2, sx - 10, sy - 5, sx + 10, sy - 5); zone(1, 1, sx - 9, sy + 6, sx, sy + 9);
  run(200); let far = 0; W.each(b => { if (b.z && b.y > sy) far++; }); ok(far === 0, 'zones more than 2 tiles from a road stay empty');
  zone(1, 1, sx - 9, sy - 4, sx, sy - 3); run(200); let near = 0; W.each(b => { if (b.z) near++; }); ok(near > 4, 'zones beside a powered road develop (' + near + ' buildings)');
  ok(!B.checkBuild('hospital', sx + 3, sy + 2).ok && /Unlocks/.test(B.checkBuild('hospital', sx + 3, sy + 2).why), 'locked buildings cannot be placed before their tier');
  const l = Object.assign({}, W.limit); ok(!B.checkBuild('park', l.x0 - 1, l.y0 + 3).ok, 'cannot build outside the city limits'); M.city.money = 1e5; ok(B.expand() && W.limit.x0 === Math.max(0, l.x0 - 8), 'city limits can be extended');
}
console.log('4. economy'); {
  let W = town(), c = M.city; run(720);
  const pop9 = c.pop, inc9 = c.fin.inc.R, happy9 = c.stats.happy; ok(pop9 > 300 && c.fin.incTotal > 0, 'baseline town after 2 years: ' + pop9 + ' residents, income ' + c.fin.incTotal + ', expenses ' + c.fin.expTotal);
  c.tax.R = 19; run(360); ok(c.stats.factors.tax < 0.1 && c.stats.happy < happy9 - 0.03, 'high residential tax lowers happiness (' + happy9.toFixed(2) + ' -> ' + c.stats.happy.toFixed(2) + ')'); ok(c.demand.R < 0.2, 'and suppresses residential demand (' + c.demand.R.toFixed(2) + ')');
  ok(c.fin.inc.R / Math.max(1, c.pop) > inc9 / pop9 * 1.6, 'but raises revenue per resident');
  const m = c.money; M.Economy.takeLoan(0); ok(c.money === m + 10000 && c.loans.length === 1, 'loan pays out'); run(30); ok(c.fin.exp.loans > 300, 'loan instalments and interest are charged monthly (' + c.fin.exp.loans + ')');
  c.money = 50000; ok(M.Economy.repayLoan(0) && !c.loans.length, 'loan can be repaid early');
  const e0 = c.fin.exp.power; c.budget.power = 50; run(30); ok(c.fin.exp.power < e0 * 0.6, 'cutting a department budget cuts its cost'); ok(c.util.pCap < 70, 'and its output (' + c.util.pCap.toFixed(0) + ' MW from a 120 MW plant)'); c.budget.power = 100;
  // bankruptcy
  c.tax.R = 0; c.tax.C = 0; c.tax.I = 0; c.money = -1000; let bail = false, over = false; M.on('bailout', () => bail = true); M.on('gameover', () => over = true);
  run(360); ok(bail && !over, 'a year in the red triggers a one-time bailout loan'); c.money = -500000; run(400); ok(over && c.gameOver, 'a second insolvent year ends the game');
  W = town({ mode: 'sandbox' }); c = M.city; const s0 = c.money; build('nuclear', W.start.x - 8, W.start.y + 8); ok(c.money === s0 && M.tierOK(6), 'sandbox: everything unlocked and nothing costs money');
}
console.log('5. services, policies, districts'); {
  const W = town(), c = M.city, sx = W.start.x, sy = W.start.y; c.money = 5e5; run(540); c.tier = Math.max(c.tier, 2);
  const g0 = (M.Utilities.update(W, c), c.util.gProd); c.pol.recycle = true; M.Utilities.update(W, c); ok(c.util.gProd < g0 * 0.8, 'recycling policy cuts garbage (' + g0.toFixed(0) + ' -> ' + c.util.gProd.toFixed(0) + ' t)');
  M.Env.pollution(W, c); M.Env.pollution(W, c); M.Env.pollution(W, c); let i0 = -1; W.each(b => { if (b.z === 3 && b.on && i0 < 0) i0 = b.y * W.n + b.x; }); const a0 = W.air[i0]; c.pol.filters = true; for (let k = 0; k < 6; k++) M.Env.pollution(W, c); ok(W.air[i0] < a0 * 0.9, 'emission filters lower industrial air pollution (' + a0.toFixed(1) + ' -> ' + W.air[i0].toFixed(1) + ')');
  B.applyDistrict(1, B.rect(sx - 9, sy - 4, sx - 1, sy + 4)); c.districts[1].tax = 3; ok(M.Zoning.taxRate(c, W, 1, W.idx(sx - 5, sy - 2)) === 12 && M.Zoning.taxRate(c, W, 1, W.idx(sx + 3, sy)) === 9, 'district tax applies only inside the district');
  c.districts[1].pol.smoke = true; ok(M.pol('smoke', W.idx(sx - 5, sy - 2)) && !M.pol('smoke', W.idx(sx + 3, sy)), 'district policy applies only inside the district');
  const pi = W.idx(sx - 5, sy - 2), before = W.police[pi]; const k = B.checkBulldoze(B.rect(sx - 6, sy - 4, sx - 5, sy - 3)); B.applyBulldoze(B.rect(sx - 6, sy - 4, sx - 5, sy - 3), k); const ps = build('police', sx - 6, sy - 4); run(40);
  ok(ps && W.police[pi] > before + 0.5, 'police station creates coverage (' + before.toFixed(2) + ' -> ' + W.police[pi].toFixed(2) + ')');
  const cv0 = W.police[W.idx(sx + 8, sy + 4)]; B.upgrade(ps); run(30); ok(ps.up === 2 && W.police[W.idx(sx + 8, sy + 4)] > cv0, 'upgrading a station widens its coverage');
  c.budget.police = 50; M.Services.update(W, c); ok(W.police[pi] < 0.6, 'half funding halves service strength (' + W.police[pi].toFixed(2) + ')'); c.budget.police = 100;
  const lv0 = W.lv[W.idx(sx - 3, sy + 2)]; const k2 = B.checkBulldoze(B.rect(sx - 4, sy + 1, sx - 3, sy + 2)); B.applyBulldoze(B.rect(sx - 4, sy + 1, sx - 3, sy + 2), k2); build('bigpark', sx - 4, sy + 1); run(60); ok(W.lv[W.idx(sx - 2, sy + 2)] > lv0 + 5, 'a park raises nearby land value (' + lv0.toFixed(0) + ' -> ' + W.lv[W.idx(sx - 2, sy + 2)].toFixed(0) + ')');
  const e0 = c.stats.eduIdx; const k3 = B.checkBulldoze(B.rect(sx - 8, sy + 1, sx - 7, sy + 2)); B.applyBulldoze(B.rect(sx - 8, sy + 1, sx - 7, sy + 2), k3); build('elem', sx - 8, sy + 1); run(1080); ok(c.stats.eduIdx > e0 + 0.03, 'a school gradually raises education (' + e0.toFixed(2) + ' -> ' + c.stats.eduIdx.toFixed(2) + ')');
}
console.log('6. fire and disasters'); {
  let W = town(), c = M.city; run(400); let victim = null; W.each(b => { if (b.z === 1 && b.built >= 1 && !victim) victim = b; });
  M.Env.ignite(W, c, victim); run(80); ok(victim.dead, 'with no fire station a burning building is lost');
  W = town(); c = M.city; c.money = 1e5; c.tier = 1; const sx = W.start.x, sy = W.start.y; build('fire', sx - 1, sy + 6); run(400); victim = null; W.each(b => { if (b.z === 1 && b.built >= 1 && !victim) victim = b; });
  M.Env.ignite(W, c, victim); run(60); ok(!victim.dead && !victim.fire && c.counters.fires >= 1, 'a fire engine drives to the fire and puts it out (building at ' + Math.round(victim.hp) + '% condition)');
  const cnt = W.count; M.Env.trigger(W, c, 'quake'); let dmg = 0, rub = 0; W.each(b => { if (b.dmg) dmg++; if (b.t === 'rubble') rub++; }); ok(dmg + rub > 0, 'earthquake damages buildings (' + dmg + ' damaged, ' + rub + ' rubble of ' + cnt + ')');
  run(200); let still = 0; W.each(b => { if (b.dmg) still++; }); ok(still < dmg || dmg === 0, 'damaged buildings are repaired over time (' + dmg + ' -> ' + still + ')');
}
console.log('7. traffic and buses'); {
  const W = town(), c = M.city, sx = W.start.x, sy = W.start.y; c.money = 1e6; c.tier = 2; run(900);
  ok(c.stats.congestion > 0 && M.Traffic.trips > 50, 'commuters generate traffic (' + Math.round(M.Traffic.trips) + ' trips/day, congestion ' + (c.stats.congestion * 100).toFixed(0) + '%)');
  let com = 0, nn = 0; W.each(b => { if (b.z === 1 && b.commute > 0) { com += b.commute; nn++; } }); ok(nn > 10 && com / nn > 3, 'homes have measured commutes (avg ' + (com / nn).toFixed(0) + ' min)');
  const t0 = M.Traffic.trips;
  const spot = (id, x, y) => { const s = M.DEFS[id].size, r = B.rect(x, y, x + s - 1, y + s - 1), k = B.checkBulldoze(r); if (k.n) B.applyBulldoze(r, k); return build(id, x, y); };
  spot('busdepot', sx - 1, sy + 6); spot('busstop', sx - 5, sy - 4); spot('busstop', sx + 3, sy - 4); spot('busstop', sx + 7, sy + 1); spot('busstop', sx - 5, sy + 1);
  run(200); ok(c.transit.stops >= 3 && c.transit.riders > 0, 'bus network carries riders (' + c.transit.riders + ' per month from ' + c.transit.stops + ' stops)');
  ok(M.Traffic.routes.length === 1 && M.Traffic.cars.some(v => v.type === 'bus'), 'buses drive a route between the stops'); ok(c.fin.inc.fares > 0, 'bus fares appear in the budget (' + c.fin.inc.fares + ')'); void t0;
}
console.log('8. progression'); {
  const W = town(), c = M.city; run(1100);
  ok(c.tier >= 1 && c.ach.settlers && c.ach.town, 'tier and achievements unlock with population (tier ' + c.tier + ', pop ' + c.pop + ')');
  ok(M.Progression.objectives().length >= 3, 'objectives are generated for the current tier');
  M.Engine.newGame({ name: 'D', seed: 5, size: 64, scenario: 'debt' }); ok(M.city.loans.length === 1 && M.city.money === 18000, 'debt scenario starts with a loan and little cash');
  void W;
}
console.log(fails ? fails + ' of ' + n + ' FAILED' : 'ALL ' + n + ' PASSED'); process.exit(fails ? 1 : 0);
