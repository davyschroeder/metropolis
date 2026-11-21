'use strict';
/* METROPOLIS – interactive tutorial: guided steps that watch the real game state, highlight UI and map targets */
(function () {
  const T = M.Tutorial = { active: false, step: 0, plan: null, enterT: 0, ref: null };
  const U = M.UI;
  const $ = function (s) { return document.querySelector(s); };

  // ---------- suggested layout near the start, adapted to the terrain ----------
  T.makePlan = function () {
    const W = M.world, n = W.n, s = W.start; let best = null, bs = -1;
    const land = function (x, y, e) { return W.inb(x, y) && W.inLimit(x, y) && W.elev[W.idx(x, y)] === e && !W.road[W.idx(x, y)] && !W.bld[W.idx(x, y)]; };
    for (let y = s.y - 6; y <= s.y + 6; y++) for (let x0 = s.x - 10; x0 <= s.x; x0++) {
      const e = W.inb(x0, y) ? W.elev[W.idx(x0, y)] : 0; if (!e) continue; let ok = true;
      for (let x = x0; x < x0 + 12; x++) if (!land(x, y, e)) { ok = false; break; } if (!ok) continue;
      let sc = 0; for (let yy = y - 3; yy <= y + 2; yy++) for (let x = x0; x < x0 + 12; x++) if (yy !== y && land(x, yy, e)) sc++;
      sc -= (Math.abs(y - s.y) + Math.abs(x0 + 6 - s.x)) * 0.5;
      if (sc > bs) { bs = sc; best = { x0: x0, y: y, e: e }; }
    }
    if (!best) best = { x0: Math.max(1, s.x - 6), y: s.y, e: 1 };
    const x0 = best.x0, y = best.y, x1 = x0 + 11;
    const spot = function (xs, step) { for (let k = 0; k < 6; k++) { const x = xs + k * step; if (land(x, y + 1, best.e)) return { x: x, y: y + 1 }; } return { x: xs, y: y + 1 }; };
    const pw = spot(x1, -1), wt = spot(x0, 1);
    T.plan = {
      road: { x0: x0, y0: y, x1: x1, y1: y }, res: { x0: x0, y0: y - 3, x1: x1, y1: y - 1 },
      power: { x0: pw.x, y0: pw.y, x1: pw.x, y1: pw.y }, water: { x0: wt.x, y0: wt.y, x1: wt.x, y1: wt.y },
      com: { x0: wt.x + 1, y0: y + 1, x1: wt.x + 5, y1: y + 2 }, ind: { x0: wt.x + 6, y0: y + 1, x1: pw.x - 1, y1: y + 2 },
      cx: x0 + 6, cy: y
    };
    return T.plan;
  };

  // ---------- helpers for step checks ----------
  function zonedNearRoad(z) { const W = M.world; let c = 0; for (let i = 0; i < W.zone.length; i++) if (W.zone[i] === z && W.findRoad(i % W.n, (i / W.n) | 0, 1, 2) >= 0) c++; return c; }
  function connected(kind) {
    const W = M.world; let ok = false;
    W.each(function (b) { if (ok || b.z) return; const d = M.DEFS[b.t]; if (!d[kind] || d.line) return; if (W.findNear(b.x, b.y, b.s, 2, function (i) { return W.road[i] !== 0 || (kind === 'power' && W.pline[i] !== 0); }) >= 0) ok = true; });
    return ok;
  }
  function placed(kind) { let ok = false; M.world.each(function (b) { if (!b.z && M.DEFS[b.t][kind] && !M.DEFS[b.t].line) ok = true; }); return ok; }
  // frame a tile rectangle inside the part of the screen not covered by the tutorial card and the toolbar
  function look(r) {
    if (!r) return; const C = M.Camera, pts = [[r.x0, r.y0], [r.x1 + 1, r.y0], [r.x1 + 1, r.y1 + 1], [r.x0, r.y1 + 1]].map(function (q) { return C.tileToWorld(q[0], q[1], 1); });
    let wx0 = 1e9, wx1 = -1e9, wy0 = 1e9, wy1 = -1e9; for (const p of pts) { wx0 = Math.min(wx0, p[0]); wx1 = Math.max(wx1, p[0]); wy0 = Math.min(wy0, p[1]); wy1 = Math.max(wy1, p[1]); }
    wy0 -= 40; // room for buildings that will grow there
    const narrow = C.w < 820, card = document.getElementById('tut'), cr = card && !card.classList.contains('hidden') ? card.getBoundingClientRect() : null;
    let fx0 = 64, fx1 = C.w - 10, fy0 = 60, fy1 = C.h - (narrow ? 250 : 240);
    if (cr && cr.width) { if (narrow) fy0 = Math.max(fy0, cr.bottom + 8); else fx1 = Math.min(fx1, cr.left - 10); }
    if (fy1 - fy0 < 120) fy1 = fy0 + 120;
    const z = M.clamp(Math.min(C.tz, (fx1 - fx0) / (wx1 - wx0 + 60), (fy1 - fy0) / (wy1 - wy0 + 60)), C.minZoom, C.maxZoom);
    C.tz = z; C.zw = null;
    C.gx = (wx0 + wx1) / 2 - ((fx0 + fx1) / 2 - C.w / 2) / z; C.gy = (wy0 + wy1) / 2 - ((fy0 + fy1) / 2 - C.h / 2) / z;
  }
  const P = function () { return T.plan; };
  const kbd = function (k) { return '<kbd>' + k + '</kbd>'; };

  // ---------- steps ----------
  T.STEPS = [
    { title: 'Welcome, Mayor', info: true, next: 'Start the tutorial',
      text: 'This short tour builds a small working town with you – about five minutes. You can stop it at any time and pick it up again later from the pause menu.<br><br>Every step tells you <b>what to do</b>, highlights <b>where to click</b>, and moves on by itself once you have done it.' },
    { title: 'Look around', target: '#game', enter: function () { T.ref = [M.Camera.x, M.Camera.y, M.Camera.tz]; },
      text: 'First, move the camera. <b>Drag</b> the map with the left mouse button (or use ' + kbd('W') + kbd('A') + kbd('S') + kbd('D') + '), and <b>scroll</b> to zoom in and out. On a touch screen, drag with one finger and pinch to zoom.',
      done: function () { const r = T.ref, C = M.Camera; return Math.hypot(C.x - r[0], C.y - r[1]) > 120 || Math.abs(C.tz - r[2]) > 0.12; } },
    { title: 'Open the road menu', target: '#cat-road', map: function () { return P().road; }, enter: function () { look(P().road); },
      text: 'Cities start with roads: every building needs one within 2 tiles. Click <b>Roads</b> in the toolbar at the bottom (or press ' + kbd('1') + ').',
      done: function () { return M.Build.tool.type === 'road'; } },
    { title: 'Build a street', target: '[data-act="item:road:2"]', map: function () { return P().road; }, enter: function () { look(P().road); },
      text: 'The <b>Two-Lane Street</b> is selected. Press and hold on one end of the glowing strip and <b>drag</b> to the other end, then let go. The price shows next to the cursor before you build.',
      done: function () { return M.world.roadTiles >= 6; } },
    { title: 'Zone homes', target: '#cat-res', map: function () { return P().res; }, enter: function () { look(P().res); },
      text: 'People need homes. Open <b>Residential</b> (' + kbd('2') + ') and drag a rectangle over the glowing area <b>beside your road</b>. Orange tiles in the preview are too far from a road and will stay empty.<br><br>You only paint the zone – residents build the houses themselves.',
      done: function () { return zonedNearRoad(1) >= 8; } },
    { title: 'Generate electricity', target: '#cat-power', map: function () { return P().power; }, enter: function () { look(P().power); },
      text: 'Nothing grows without power. Open <b>Electricity</b> (' + kbd('5') + '), choose the <b>Wind Turbine</b> and click the marked tile <b>right next to the road</b>.<br><br>Roads carry electricity to everything within 3 tiles, so the turbine only has to touch the road.',
      done: function () { return connected('power'); },
      hint: function () { return placed('power') ? 'Your power plant is not touching a road yet. Demolish it (' + kbd('B') + ') and place it within 2 tiles of the road.' : ''; } },
    { title: 'Supply water', target: '#cat-water', map: function () { return P().water; }, enter: function () { look(P().water); },
      text: 'Open <b>Water</b> (' + kbd('6') + '), pick the <b>Water Tower</b> and place it beside the road at the other end. Water travels along the roads, just like power.<br><br>(A Water Pump is cheaper per litre but must stand close to a river or lake.)',
      done: function () { return connected('water'); },
      hint: function () { return placed('water') ? 'Your water building is not touching a road yet. Move it within 2 tiles of the road.' : ''; } },
    { title: 'Speed up time', target: '.speed', enter: function () { look(P().res); },
      text: 'Construction has started! Use the <b>speed buttons</b> at the top right (or ' + kbd('Space') + ' to pause) to make time go faster, and watch the first families move in.',
      progress: function () { return [M.city.pop, 25]; }, done: function () { return M.city.pop >= 25; } },
    { title: 'Jobs and shops', target: ['#cat-com', '#cat-ind'], map: function () { return { x0: P().com.x0, y0: P().com.y0, x1: P().ind.x1, y1: P().ind.y1 }; }, enter: function () { look({ x0: P().com.x0, y0: P().com.y0, x1: P().ind.x1, y1: P().ind.y1 }); },
      text: 'Residents need work. Zone a little <b>Commercial</b> (' + kbd('3') + ', shops) and <b>Industrial</b> (' + kbd('4') + ', factories) land along the other side of the road.<br><br>Tip: in a real city keep industry away from homes – it is noisy and dirty.',
      done: function () { return zonedNearRoad(2) >= 3 && zonedNearRoad(3) >= 3; } },
    { title: 'Read the demand bars', target: '.rci', info: true,
      text: 'These three bars show what your citizens want: <b style="color:#146c3a">R</b>esidential, <b style="color:#12489b">C</b>ommercial and <b style="color:#7a4a00">I</b>ndustrial. A bar above the middle line means “build more of this”; below it means there is too much.<br><br>Zoning what the bars ask for is the heart of growing your city.' },
    { title: 'Inspect a building', target: '#sb-tool-pointer', enter: function () { T.missed = false; look(P().res); if (M.Build.tool.type !== 'pointer') U.cancelTool(); },
      text: 'Click any <b>house</b> on the map with the Inspect tool (' + kbd('Q') + ') to see who lives there, how happy they are and what they lack.<br><br>Small icons above buildings warn you about problems: ⚡ no power, 💧 no water, a road sign means no road access.',
      hint: function () { return T.missed ? 'That was an empty piece of land. Pick one of the houses.' : ''; },
      done: function () { if (U.panel === 'tile') { T.missed = true; U.closePanel(); } return U.panel === 'inspect'; } }, // (the tile sheet would cover the houses on a small screen)
    { title: 'Check your budget', target: '#sb-panel-budget',
      text: 'Click the <b>$ button</b> on the left to open the budget. Here you set <b>tax rates</b> and department funding, and see what everything costs each month. The HUD at the top shows your money and last month’s balance.',
      done: function () { return U.panel === 'budget'; } },
    { title: 'See the city’s data', target: '#sb-overlays',
      text: 'The <b>layers button</b> (or ' + kbd('Tab') + ') shows data views: traffic, pollution, land value, power and water coverage and more. Pick any view to try it.',
      done: function () { return !!M.Render.overlay; } },
    { title: 'You are ready', info: true, next: 'Finish', target: '#goals',
      text: 'That is the core of METROPOLIS. From here:<ul><li>The <b>goals list</b> on the right always shows your next objectives and a hint.</li><li>The <b>Advisor</b> panel tells you what citizens complain about.</li><li>As the population grows you unlock fire and police stations, schools, hospitals, buses, districts and policies.</li></ul>Good luck, Mayor!' }
  ];

  // ---------- control ----------
  T.start = function (fromStep) {
    if (!M.city) return; T.makePlan();  T.active = true; M.city.tutOff = false; T.go(fromStep || 0); T.ensureDom();
  };
  T.stop = function (finished) {
    T.active = false; if (M.city) { M.city.tutOff = true; if (finished) M.city.tut = T.STEPS.length; }
    const card = $('#tut'); if (card) card.classList.add('hidden'); const ring = $('#tut-ring'); if (ring) ring.classList.add('hidden');
    M.settings.tutDone = true; M.Save.saveSettings(); U.updateGoals();
    if (finished) { M.Audio.play('fanfare'); U.toast('Tutorial complete. Follow the goals list to keep growing.', 'good'); }
    else U.toast('Tutorial closed. You can resume it from the pause menu (Esc).', 'info');
  };
  T.go = function (i) {
    T.step = i; if (M.city) M.city.tut = i; const st = T.STEPS[i]; if (!st) { T.stop(true); return; }
    T.enterT = 0; const om = $('#overlays'); if (om && i > 0) om.classList.add('hidden');
    if (st.info && i === T.STEPS.length - 1) U.closePanel();
    if (st.enter) st.enter(); T.render(true); if (i > 0) M.Audio.play('good');
  };
  T.resumeIfNeeded = function () {
    const c = M.city; T.active = false; const card = $('#tut'); if (card) card.classList.add('hidden'); const ring = $('#tut-ring'); if (ring) ring.classList.add('hidden');
    if (c && c.tut != null && !c.tutOff && c.tutOn && c.tut < T.STEPS.length) T.start(c.tut);
  };
  T.ensureDom = function () {
    if (!$('#tut')) {
      const d = document.createElement('div'); d.id = 'tut'; d.className = 'glass'; $('#right').prepend(d);
      const r = document.createElement('div'); r.id = 'tut-ring'; r.className = 'hidden'; document.body.appendChild(r);
    }
    $('#tut').classList.remove('hidden');
  };
  T.render = function (force) {
    if (!T.active) return; T.ensureDom(); const st = T.STEPS[T.step], card = $('#tut');
    let prog = '';
    if (st.progress) { const p = st.progress(); prog = '<div class="tprog"><i style="width:' + Math.min(100, p[0] / p[1] * 100).toFixed(0) + '%"></i></div><small class="tpn">' + Math.min(p[0], p[1]) + ' / ' + p[1] + ' residents</small>'; }
    const hint = st.hint && T.enterT > 2 ? st.hint() : '';
    const h = '<div class="thead"><small>Step ' + (T.step + 1) + ' of ' + T.STEPS.length + '</small><button class="ib" data-act="tut-skip" data-tip="Close the tutorial">' + U.icon('close') + '</button></div>' +
      '<b class="ttl">' + st.title + '</b><div class="ttxt">' + st.text + '</div>' + prog + (hint ? '<div class="thint">' + hint + '</div>' : '') +
      '<div class="tbtns">' + (T.step > 0 ? '<button class="btn sm" data-act="tut-back">Back</button>' : '') + (st.info ? '<button class="btn primary" data-act="tut-next">' + (st.next || 'Next') + '</button>' : '<span class="twait">Waiting for you…</span>') + '</div>';
    if (force || card._h !== h) { card._h = h; card.innerHTML = h; }
  };
  function placeRing() {
    const st = T.STEPS[T.step], ring = $('#tut-ring'); if (!ring) return;
    let sels = st.target; if (!sels || sels === '#game' || U.modalOpen) { ring.classList.add('hidden'); return; } if (!Array.isArray(sels)) sels = [sels];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of sels) { const e = $(s); if (!e || !e.offsetParent) continue; const r = e.getBoundingClientRect(); if (!r.width) continue; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
    if (x1 < 0) { ring.classList.add('hidden'); return; }
    ring.classList.remove('hidden'); ring.style.left = (x0 - 5) + 'px'; ring.style.top = (y0 - 5) + 'px'; ring.style.width = (x1 - x0 + 10) + 'px'; ring.style.height = (y1 - y0 + 10) + 'px';
  }
  T.mapRect = function () { if (!T.active || M.mode !== 'game') return null; const st = T.STEPS[T.step]; return st && st.map ? st.map() : null; };
  T.frame = function (dt) {
    if (!T.active || M.mode !== 'game' || !M.city) return;
    T.enterT += dt; const st = T.STEPS[T.step];
    if (!st.info && st.done && T.enterT > 0.4 && st.done()) { T.go(T.step + 1); return; }
    T._acc = (T._acc || 0) + dt; if (T._acc > 0.3) { T._acc = 0; T.render(false); }
    placeRing();
  };
  T.act = function (a) {
    if (a === 'tut-next') { M.Audio.play('select'); T.go(T.step + 1); }
    else if (a === 'tut-back') { M.Audio.play('click'); T.go(Math.max(0, T.step - 1)); }
    else if (a === 'tut-skip') { U.confirm('Close the tutorial?', 'You can resume it later from the pause menu.', 'Close tutorial', function () { T.stop(false); }); }
    else if (a === 'tut-resume') { U.closeModal(); if (M.Menu.resume) M.Menu.resume(); if (T.active) return true; M.city.tutOn = true; T.start(M.city.tutOff && M.city.tut >= T.STEPS.length ? 0 : (M.city.tut || 0)); }
    else return false;
    return true;
  };
  M.on('loaded', function () { setTimeout(T.resumeIfNeeded, 0); });
  M.on('newgame', function () { T.resumeIfNeeded(); });
})();
