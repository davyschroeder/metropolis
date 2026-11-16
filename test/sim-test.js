// Headless simulation test: builds a scripted town and runs it for years.
const fs = require('fs'), vm = require('vm'), path = require('path');
const files = ['core', 'buildings', 'terrain', 'world', 'roads', 'utilities', 'services', 'environment', 'zoning', 'population', 'economy', 'traffic', 'progression', 'construction', 'engine'];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
M.settings = { daynight: true }; M.rand = M.rng(12345);
let fails = 0; function ok(c, msg) { if (!c) { fails++; console.log('  FAIL: ' + msg); } else console.log('  ok: ' + msg); }
const years = +(process.argv[2] || 6);
M.Engine.newGame({ name: 'Testville', seed: 4242, size: 96, mode: 'normal', diff: 'normal', scenario: 'free', disasters: true });
const W = M.world, c = M.city, B = M.Build;
let water = 0; for (let i = 0; i < W.elev.length; i++) if (!W.elev[i]) water++;
console.log('map: water ' + (100 * water / W.elev.length).toFixed(1) + '%  start', W.start, 'limit', W.limit);
function road(type, x0, y0, x1, y1) { const chk = B.checkRoad(type, B.linePath(x0, y0, x1, y1)); if (!chk.ok) { console.log('   road blocked', x0, y0, x1, y1, chk.why); return false; } return B.applyRoad(type, chk) || chk.none; }
function zone(z, d, x0, y0, x1, y1) { const chk = B.checkZone(z, d, B.rect(x0, y0, x1, y1)); return B.applyZone(z, d, chk); }
function build(id, x, y) { { const sz = M.DEFS[id].size, r = B.rect(x, y, x + sz - 1, y + sz - 1); let road = false; for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) if (W.road[W.idx(xx, yy)]) road = true; if (!road) { const c0 = B.checkBulldoze(r); if (c0.n) B.applyBulldoze(r, c0); } } for (let r = 0; r < 12; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) { const chk = B.checkBuild(id, x + ox, y + oy); if (chk.ok && W.findRoad(x + ox, y + oy, M.DEFS[id].size, 1) >= 0) return B.applyBuild(id, chk, 0); } console.log('   could not place', id, B.checkBuild(id, x, y).why); return null; }
const sx = W.start.x, sy = W.start.y;
// grid of streets
for (let k = -2; k <= 2; k++) { road(2, sx - 14, sy + k * 5, sx + 14, sy + k * 5); road(2, sx + k * 7, sy - 10, sx + k * 7, sy + 10); }
ok(W.roadTiles > 100, 'roads placed: ' + W.roadTiles);
zone(1, 1, sx - 13, sy - 9, sx + 2, sy + 9); zone(2, 1, sx + 3, sy - 9, sx + 8, sy + 9); zone(3, 1, sx + 9, sy - 9, sx + 14, sy + 9);
build('wind', sx - 15, sy - 11); build('wind', sx - 16, sy - 11); build('wind', sx - 17, sy - 11);
build('wtower', sx - 15, sy + 11); build('wtower', sx - 16, sy + 12);
const startMoney = c.money; console.log('money after setup', Math.round(c.money));
function run(days) { for (let d = 0; d < days; d++) { M.Engine.tickDay(); M.Traffic.update(0.5, W, c, null); } }
let did = {};
for (let m = 0; m < years * 12; m++) {
  run(30);
  const s = c.stats, u = c.util;
  // a simple "mayor" reacting to needs
  if (u.pUse > u.pCap * 0.85 && c.money > 12000) build(c.tier >= 1 ? 'gas' : 'coal', sx + 16, sy - 12);
  if (u.wUse > u.wCap * 0.85 && c.money > 3000) build('wtower', sx - 15 - (m % 5), sy + 11 + (m % 3));
  if (c.tier >= 1 && !did.t1 && c.money > 15000) { did.t1 = 1; build('landfill', sx + 17, sy + 8); build('fire', sx - 4, sy + 1); build('police', sx + 1, sy - 4); build('clinic', sx - 8, sy - 4); build('elem', sx - 9, sy + 1); build('park', sx - 3, sy - 3); build('park', sx - 10, sy + 6); zone(1, 2, sx - 13, sy - 9, sx + 2, sy + 9); zone(2, 2, sx + 3, sy - 9, sx + 8, sy + 9); zone(3, 2, sx + 9, sy - 9, sx + 14, sy + 9); }
  if (c.tier >= 2 && !did.t2 && c.money > 30000) { did.t2 = 1; build('sewage', sx + 17, sy - 3); build('high', sx - 5, sy + 6); build('busdepot', sx + 4, sy + 11); build('busstop', sx - 8, sy - 1); build('busstop', sx + 10, sy - 1); build('busstop', sx - 2, sy + 4); build('cemetery', sx - 12, sy - 11); build('bigpark', sx - 6, sy - 8); c.pol.recycle = true; }
  if (c.tier >= 2 && !did.exp && c.money > 30000) { did.exp = 1; for (let k = -2; k <= 2; k++) road(2, sx - 26, sy + k * 5, sx - 14, sy + k * 5); road(2, sx - 26, sy - 10, sx - 26, sy + 10); road(2, sx - 20, sy - 10, sx - 20, sy + 10); zone(1, 2, sx - 25, sy - 9, sx - 15, sy + 9); }
  if (c.tier >= 3 && !did.t3 && c.money > 60000) { did.t3 = 1; build('hospital', sx - 22, sy - 14); build('uni', sx - 4, sy + 13); zone(1, 3, sx - 13, sy - 9, sx + 2, sy + 9); zone(2, 3, sx + 3, sy - 9, sx + 8, sy + 9); zone(3, 3, sx + 9, sy - 9, sx + 14, sy + 9); }
  if (m % 6 === 5) console.log('y' + ((m + 1) / 12).toFixed(1) + ' pop ' + c.pop + ' tier ' + c.tier + ' $' + Math.round(c.money) + ' inc ' + c.fin.incTotal + ' exp ' + c.fin.expTotal + ' happy ' + (s.happy * 100 | 0) + ' unemp ' + (s.unemp * 100).toFixed(1) + '% jobs ' + s.jobs + ' dem R' + c.demand.R.toFixed(2) + ' C' + c.demand.C.toFixed(2) + ' I' + c.demand.I.toFixed(2) + ' edu ' + s.eduIdx.toFixed(2) + ' hlth ' + s.health.toFixed(2) + ' cong ' + s.congestion.toFixed(2) + ' P ' + u.pUse.toFixed(0) + '/' + u.pCap.toFixed(0) + ' W ' + u.wUse.toFixed(0) + '/' + u.wCap.toFixed(0) + ' blds ' + W.count + ' cars ' + M.Traffic.cars.length + ' lv ' + s.lvAvg.toFixed(0));
}
const s = c.stats;
console.log('complaints:', c.complaints.map(x => x.k + ':' + x.v.toFixed(2)).join(', '));
console.log('factors:', Object.keys(s.factors).map(k => k + ':' + s.factors[k].toFixed(2)).join(' '));
console.log('fin', JSON.stringify(c.fin)); console.log('levels', (function () { const l = {}; W.each(b => { if (b.z) { const k = 'RCI'[b.z - 1] + b.lvl + (b.ab ? 'x' : ''); l[k] = (l[k] || 0) + 1; } }); return JSON.stringify(l); })());
console.log('news:', c.news.slice(0, 8).map(n => n.t).join(' | '));
ok(c.pop > 300, 'population grew: ' + c.pop);
ok(s.jobs > 50, 'jobs exist: ' + s.jobs);
ok(c.fin.incTotal > 0 && c.fin.expTotal > 0, 'budget computed');
ok(!c.gameOver, 'city solvent');
ok(isFinite(c.money) && isFinite(s.happy) && isFinite(s.eduIdx) && isFinite(s.health), 'no NaN in stats');
let nan = 0; for (const k of ['air', 'gnd', 'noise', 'lv', 'crime', 'traffic']) for (let i = 0; i < W[k].length; i++) if (!isFinite(W[k][i])) nan++; ok(nan === 0, 'no NaN in maps');
let sum = 0; W.each(b => { if (b.z === 1 && !b.ab) sum += b.pop; }); ok(Math.abs(sum - c.pop) <= 1 && Math.abs(c.coh.c + c.coh.a + c.coh.s - c.pop) < 2, 'cohorts match buildings: ' + sum + ' vs ' + c.pop);
// save / load round trip
const snap = JSON.parse(JSON.stringify({ w: (function () { const o = W.serialize(); for (const k in o) if (ArrayBuffer.isView(o[k])) o[k] = Array.from(o[k]); return o; })(), c: c }));
const W2 = M.World.deserialize(snap.w); ok(W2.count === W.count && W2.roadTiles === W.roadTiles, 'serialize round trip keeps ' + W2.count + ' buildings, ' + W2.roadTiles + ' road tiles');
let same = true; for (const k of ['elev', 'road', 'zone', 'zdens', 'district', 'deco']) for (let i = 0; i < W[k].length; i++) if (W[k][i] !== W2[k][i]) same = false; ok(same, 'tile layers identical after load');
M.world = W2; M.city = snap.c; M.Engine.afterLoad(false); const popBefore = M.city.pop; for (let d = 0; d < 60; d++) M.Engine.tickDay(); ok(Math.abs(M.city.pop - popBefore) < popBefore * 0.15 + 20, 'loaded city keeps running: ' + popBefore + ' -> ' + M.city.pop);
// undo + disasters
const m0 = M.city.money; const chk = B.checkRoad(2, B.linePath(W2.limit.x0 + 1, W2.limit.y0 + 1, W2.limit.x0 + 6, W2.limit.y0 + 1)); if (chk.ok) { const rt = W2.roadTiles; B.applyRoad(2, chk); B.undoLast(); ok(M.city.money === m0 && W2.roadTiles === rt, 'undo refunds and removes'); }
for (const t of ['storm', 'flood', 'quake', 'firestorm']) M.Env.trigger(W2, M.city, t); for (let d = 0; d < 90; d++) { M.Engine.tickDay(); M.Traffic.update(0.5, W2, M.city, null); } ok(isFinite(M.city.money), 'survived disasters; fires put out: ' + M.city.counters.fires + ', pop ' + M.city.pop);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
