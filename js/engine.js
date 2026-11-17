'use strict';
/* METROPOLIS – engine: fixed-tick simulation clock, main loop, game lifecycle */
(function () {
  const E = M.Engine = { speed: 1, paused: false, acc: 0, DAY: 0.5, running: false, last: 0, fps: 60, simMs: 0 };
  M.world = null; M.city = null;
  M.on('built', function (b) { M.Services.dirty = true; M.Utilities.dirty = true; });
  M.on('bld', function (b, added) { if (!b.z) M.Services.dirty = true; });

  E.newGame = function (o) {
    const size = o.size || 96, W = new M.World(size);
    const sc = M.SCENARIOS.find(function (s) { return s.id === o.scenario; }) || M.SCENARIOS[0], gen = Object.assign({ seed: o.seed, water: o.water, hills: o.hills, forest: o.forest }, sc.gen || {});
    M.Terrain.generate(W, gen); W.computeOccl();
    M.world = W; M.city = M.newCity(o);
    if (M.city.mode === 'sandbox') { M.city.money = 1e6; M.city.tier = 0; }
    E.afterLoad(true);
    M.news('Welcome, Mayor. ' + M.city.name + ' is yours to build.', 'info');
    M.emit('newgame');
  };
  E.afterLoad = function (fresh) {
    const W = M.world, c = M.city;
    W.each(function (b) { b.rv = 0; b.resp = null; b.busy = 0; b.dead = false; });
    M.Zoning.ver = -1; M.Traffic.reset(); W.zoneVer = (W.zoneVer || 0) + 1;
    M.Roads.components(W);
    M.Utilities.update(W, c); M.Services.update(W, c); M.Utilities.update(W, c);
    if (fresh) M.Env.landValue(W, c);
    E.acc = 0; E.paused = false; M.roadCond = Math.min(1, 0.6 + 0.4 * c.budget.roads / 100);
  };
  E.tickDay = function () {
    const W = M.world, c = M.city;
    c.day++;
    M.Zoning.day(W, c); M.Traffic.day(W, c); M.Env.weatherDay(W, c); M.Env.day(W, c);
    const d = c.day % 30, w = c.day % 7;
    if (w === 1 || M.Utilities.dirty) { M.Utilities.dirty = false; M.Utilities.update(W, c); }
    if (w === 2 || M.Services.dirty) { M.Services.dirty = false; M.Services.update(W, c); }
    if (w === 3) M.Env.pollution(W, c);
    if (w === 4) M.Env.landValue(W, c);
    if (d === 0) { M.Population.month(W, c); M.Economy.month(W, c); M.Progression.month(W, c); M.emit('month'); }
    M.emit('day');
  };
  E.setSpeed = function (s) { if (s === 0) E.paused = true; else { E.paused = false; E.speed = s; } M.emit('speed'); };
  E.togglePause = function () { E.paused = !E.paused; M.emit('speed'); };
  E.frame = function (now) {
    if (!E.running) return;
    requestAnimationFrame(E.frame);
    let dt = (now - E.last) / 1000; E.last = now; if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    E.fps += ((dt > 0 ? 1 / dt : 60) - E.fps) * 0.05;
    const c = M.city, active = c && !E.paused && !c.gameOver && M.mode === 'game';
    if (active) {
      E.acc += dt * E.speed; let steps = 0; const t0 = performance.now();
      while (E.acc >= E.DAY && steps < 6) { E.tickDay(); E.acc -= E.DAY; steps++; }
      if (E.acc > E.DAY * 2) E.acc = 0;
      E.simMs += (performance.now() - t0 - E.simMs) * 0.1;
      if (M.settings.daynight) c.tod = (c.tod + dt * Math.min(E.speed, 1.5) / 420) % 1;
      M.Env.weatherTick(c, dt * Math.min(E.speed, 1.5));
    }
    if (M.world) {
      const adt = active ? dt * E.speed : (M.mode === 'menu' ? dt : 0), vdt = active ? dt * Math.min(E.speed, 2) : (M.mode === 'menu' ? dt : 0);
      M.Traffic.update(vdt, M.world, c, M.Render.view);
      M.Camera.update(dt); M.Render.draw(dt, adt); M.Render.adapt(dt, E.fps);
    }
    M.UI.frame(dt);
  };
  E.start = function () { if (E.running) return; E.running = true; E.last = performance.now(); requestAnimationFrame(E.frame); };
})();
