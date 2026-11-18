'use strict';
/* METROPOLIS – UI core: HUD, construction toolbar, menus, modals, toasts, tooltips */
(function () {
  const U = M.UI = { cat: null, panel: null, timer: 0, hudTimer: 0, thumbs: {}, toasts: [] };
  const B = M.Build;
  const $ = function (s) { return document.querySelector(s); };
  U.$ = $;
  const ICON = {
    menu: 'M4 6h16M4 12h16M4 18h16', road: 'M9 21L11 3M15 21L13 3M12 6v3M12 12v3M12 18v2', res: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5', com: 'M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 016 0v2',
    ind: 'M3 20V10l6 4v-4l6 4V6h4v14H3z', power: 'M13 2L5 13h5l-1 9 8-11h-5l1-9z', water: 'M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z', service: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM12 8v8M8 12h8',
    transit: 'M5 5h14a1 1 0 011 1v10H4V6a1 1 0 011-1zM4 11h16M7 16v2M17 16v2M7.5 13.5h.01M16.5 13.5h.01', park: 'M12 21v-6M12 15c-4 0-6-2.5-6-5.5S8.5 3 12 3s6 3.5 6 6.5-2 5.5-6 5.5z',
    deco: 'M12 3l2.5 5.5 6 .7-4.5 4 1.3 6-5.3-3-5.3 3 1.3-6-4.5-4 6-.7L12 3z', district: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14', bulldoze: 'M3 17h11v-5H8L6 8H3v9zM14 13h5l2 6h-7M6 20h.01M11 20h.01',
    pointer: 'M5 3l14 8-6 2-2 6L5 3z', budget: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15 9.5c-.5-1.2-1.6-2-3-2-1.7 0-3 1-3 2.3S10.3 12 12 12s3 .9 3 2.3-1.3 2.2-3 2.2c-1.4 0-2.5-.8-3-2M12 5.5v2M12 16.5v2',
    pop: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.5 2.5-6 6-6s6 2.5 6 6M17 11a2.5 2.5 0 000-5M21 20c0-3-1.5-5-4-5.5', policy: 'M6 3h10l3 3v15H6V3zM9 9h7M9 13h7M9 17h4',
    traffic: 'M4 16v-3l2-5h12l2 5v3H4zM6 16v2M18 16v2M7.5 13.5h.01M16.5 13.5h.01', advisor: 'M4 5h16v11H9l-5 4V5zM8 9h8M8 12h5', milestone: 'M7 4h10v5a5 5 0 01-10 0V4zM7 6H4c0 3 1.5 4.5 3.5 4.5M17 6h3c0 3-1.5 4.5-3.5 4.5M12 14v4M8 20h8',
    stats: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8', layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5', undo: 'M9 7l-5 5 5 5M4 12h10a5 5 0 010 10h-2', pause: 'M8 5v14M16 5v14', play: 'M7 4l12 8-12 8V4z',
    save: 'M5 3h12l4 4v14H3V3h2zM7 3v6h8V3M7 21v-7h10v7', close: 'M6 6l12 12M18 6L6 18', rotate: 'M4 12a8 8 0 113 6M4 20v-5h5', utility: 'M9 3v6M15 3v6M6 9h12v3a6 6 0 01-12 0V9zM12 18v3',
    happy: 'M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 14c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2M9 9.5h.01M15 9.5h.01', map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z', lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5V11z', dezone: 'M4 4h16v16H4zM8 8l8 8M16 8l-8 8',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', line: 'M12 3v18M6 7h12M8 11h8M9 21l3-10 3 10'
  };
  U.icon = function (k, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICON[k] || ICON.deco) + '"/></svg>'; };
  U.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  const esc = U.esc, icon = U.icon;

  // ---------------- skeleton ----------------
  U.init = function () {
    const ui = $('#ui');
    ui.innerHTML =
      '<div id="topbar" class="glass">' +
      '<button class="ib" data-act="menu" data-tip="Menu <kbd>Esc</kbd>">' + icon('menu') + '</button>' +
      '<div class="cityname" data-act="panel:milestone" data-tip="City rank and milestones"><b id="h-name"></b><small id="h-tier"></small></div>' +
      '<div class="stat" data-act="panel:pop" data-tip="Population">' + icon('pop') + '<b id="h-pop">0</b></div>' +
      '<div class="stat" data-act="panel:budget" data-tip="Treasury and last month’s balance">' + icon('budget') + '<b id="h-money"></b><small id="h-net"></small></div>' +
      '<div class="stat" data-act="panel:advisor" data-tip="Citizen happiness">' + icon('happy') + '<b id="h-happy"></b></div>' +
      '<div class="rci" data-tip="Demand for <b style=\'color:#6fd27a\'>R</b>esidential, <b style=\'color:#6aa9ff\'>C</b>ommercial and <b style=\'color:#f0c04a\'>I</b>ndustrial zones. Up means more is wanted."><div class="rbar"><div><i id="h-dr" style="background:#4caf50"></i></div><em style="color:#6fd27a">R</em></div><div class="rbar"><div><i id="h-dc" style="background:#3d8bfd"></i></div><em style="color:#6aa9ff">C</em></div><div class="rbar"><div><i id="h-di" style="background:#e0a526"></i></div><em style="color:#f0c04a">I</em></div></div>' +
      '<div class="spacer"></div>' +
      '<div class="stat date" data-tip="Date and weather"><span id="h-weather"></span><b id="h-date"></b></div>' +
      '<div class="speed">' + [0, 1, 2, 4].map(function (s) { return '<button class="ib sp" data-act="speed:' + s + '" data-tip="' + (s ? s + '× speed' : 'Pause <kbd>Space</kbd>') + '">' + (s === 0 ? icon('pause') : '<span class="pl">' + '▸'.repeat(s === 4 ? 3 : s) + '</span>') + '</button>'; }).join('') + '</div>' +
      '</div>' +
      '<div id="side" class="glass">' +
      [['pointer', 'tool-pointer', 'Inspect <kbd>Q</kbd>'], ['layers', 'overlays', 'Data views <kbd>Tab</kbd>'], ['budget', 'panel:budget', 'Budget'], ['pop', 'panel:pop', 'Population'], ['policy', 'panel:policy', 'Districts & policies'], ['traffic', 'panel:traffic', 'Traffic & transit'], ['utility', 'panel:utility', 'Utilities'], ['advisor', 'panel:advisor', 'Advisor'], ['milestone', 'panel:milestone', 'Milestones'], ['stats', 'panel:stats', 'Statistics'], ['undo', 'undo', 'Undo <kbd>Ctrl+Z</kbd>'], ['map', 'minimap', 'Minimap <kbd>M</kbd>']]
        .map(function (b) { return '<button class="ib" data-act="' + b[1] + '" data-tip="' + b[2] + '" id="sb-' + b[1].replace(':', '-') + '">' + icon(b[0]) + '</button>'; }).join('') +
      '</div>' +
      '<div id="overlays" class="glass hidden"></div>' +
      '<div id="right"><div id="goals" class="glass"></div><div id="toasts"></div></div>' +
      '<div id="panel" class="glass hidden"><div class="phead"><span id="p-title"></span><button class="ib" data-act="close-panel">' + icon('close') + '</button></div><div id="p-body"></div></div>' +
      '<div id="minimap" class="glass"><canvas id="mm"></canvas></div>' +
      '<div id="legend" class="glass hidden"></div>' +
      '<div id="bottom"><div id="tray" class="glass hidden"></div><div id="cats" class="glass">' +
      M.CATS.map(function (c) { return '<button class="cat" data-act="cat:' + c.id + '" id="cat-' + c.id + '" data-tip="' + c.name + (c.key ? ' <kbd>' + c.key + '</kbd>' : '') + '">' + icon(c.id) + '<span>' + (c.short || c.name) + '</span></button>'; }).join('') + '</div></div>' +
      '<div id="cursorinfo" class="hidden"></div><div id="banner" class="hidden"></div>';
    document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('#panel, #modal')) { U.pressing = true; U.lastPress = performance.now(); } }, true);
    document.addEventListener('pointerup', function () { if (U.pressing) { U.lastPress = performance.now(); setTimeout(function () { U.pressing = false; }, 0); } }, true);
    // touch screens: no hover, no right-click, no keyboard. U.touch follows the kind of pointer that was used last.
    U.setTouch = function (on) { if (U.touch === on) return; U.touch = on; document.body.classList.toggle('touch', on); setTimeout(function () { if (M.city && U.cat) U.buildTray(); }, 600); }; /* rebuilt a moment later, never in the middle of a tap */
    U.setTouch(!!(window.matchMedia && window.matchMedia('(hover: none)').matches));
    document.addEventListener('click', onClick); document.addEventListener('pointerdown', function (e) { U.setTouch(e.pointerType !== 'mouse'); if (e.pointerType !== 'mouse' && !(e.target.closest && e.target.closest('[data-tip]'))) $('#tooltip').classList.remove('show'); }, true);
    document.addEventListener('input', onInput); document.addEventListener('change', onChange);
    document.addEventListener('mouseover', onOver); document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('[data-tip]')) $('#tooltip').classList.remove('show'); });
    $('#mm').addEventListener('pointerdown', function (e) { const r = e.target.getBoundingClientRect(), n = M.world.n; M.Camera.centerOn((e.clientX - r.left) / r.width * n, (e.clientY - r.top) / r.height * n); });
    M.on('news', function (t, k, loc) { U.toast(t, k, loc); });
    M.on('tier', function (t) { U.banner(M.TIERS[t].name, 'Your city has grown. New buildings are available.'); U.buildTray(); });
    M.on('achievement', function (a) { U.banner('Achievement: ' + a.name, a.desc); });
    M.on('scenario', function (won, sc) { U.modal(won ? 'Scenario complete' : 'Scenario failed', '<p>' + esc(sc.desc) + '</p><p>' + (won ? 'Congratulations, Mayor. You may keep building.' : 'The deadline has passed. You may keep playing in free play.') + '</p>', [['OK', null]]); });
    M.on('gameover', function () { U.modal('Bankrupt', '<p>The city has been insolvent for a year after its bailout. The council has removed you from office.</p>', [['Load a save', function () { U.showLoad(); }], ['Continue in sandbox', function () { M.city.mode = 'sandbox'; M.city.gameOver = false; M.city.money = 1e6; U.toast('Sandbox mode: money is unlimited.', 'info'); }], ['Main menu', function () { U.showMenu(); }]], true); });
    M.on('speed', U.updateSpeed); M.on('tool', U.updateToolState); M.on('undo', function () { const b = $('#sb-undo'); if (b) b.classList.toggle('dim', !B.undo.length); });
    M.on('month', function () { if (U.panel) U.refreshPanel(true); });
    M.on('autosaved', function () { const e = $('#h-date'); if (e) { e.classList.remove('saved'); void e.offsetWidth; e.classList.add('saved'); } });
    M.on('newgame', U.onCityChanged); M.on('loaded', U.onCityChanged);
    M.on('placed', function (kind, cost) { if (cost > 0) U.flashMoney(-cost); U.hudTimer = 0; if (U.panel === 'inspect') U.timer = 0; });
    M.on('destroyed', function () { if (U.panel === 'inspect') U.timer = 0; });
  };
  U.onCityChanged = function () {
    M.Render.reset(); M.Camera.centerOn(M.world.start.x, M.world.start.y, true); M.Camera.zoom = M.Camera.tz = Math.min(1.1, Math.max(0.6, M.Camera.w / 1500));
    U.cat = null; U.closePanel(); B.setTool(null); U.buildTray(); U.setOverlay(null); U.updateSpeed(); U.hudTimer = 0; $('#toasts').innerHTML = '';
  };

  // ---------------- events ----------------
  function onClick(e) {
    const t = e.target.closest ? e.target.closest('[data-act]') : null; if (!t) return;
    if (t.classList.contains('locked') || t.disabled) { M.Audio.play('error'); return; }
    M.Audio.init(); U.act(t.dataset.act, t, e);
  }
  function onInput(e) { const t = e.target; if (t.dataset && t.dataset.in) M.Panels.input(t.dataset.in, t, false); }
  function onChange(e) { const t = e.target; if (t.dataset && t.dataset.in) { M.Panels.input(t.dataset.in, t, true); if (t.type === 'range') t.blur(); } }
  function onOver(e) {
    const t = e.target.closest ? e.target.closest('[data-tip]') : null, tip = $('#tooltip'); if (!t) return;
    tip.innerHTML = U.touch ? t.dataset.tip.replace(/\s*<kbd>[^<]*<\/kbd>/g, '') : t.dataset.tip; tip.classList.add('show');
    clearTimeout(U.tipTimer); if (U.touch) U.tipTimer = setTimeout(function () { tip.classList.remove('show'); }, 1800); // a tapped tip would otherwise stay on screen
    const r = t.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight; let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 8;
    if (y < 4) y = r.bottom + 8; if (r.left < 70 && r.height < 60 && r.top > 60 && r.bottom < innerHeight - 120) { x = r.right + 8; y = r.top + r.height / 2 - th / 2; }
    tip.style.left = M.clamp(x, 4, innerWidth - tw - 4) + 'px'; tip.style.top = M.clamp(y, 4, innerHeight - th - 4) + 'px';
    clearTimeout(U._tt); if (window.matchMedia && window.matchMedia('(hover: none)').matches) U._tt = setTimeout(function () { tip.classList.remove('show'); }, 2600);
  }
  U.act = function (act, el, ev) {
    const p = act.split(':'), a = p[0], v = p[1];
    switch (a) {
      case 'menu': U.showPause(); break;
      case 'speed': M.Engine.setSpeed(+v); M.Audio.play('click'); break;
      case 'cat': U.selectCat(v); break;
      case 'tool-pointer': U.cancelTool(); M.Audio.play('click'); break;
      case 'overlays': $('#overlays').classList.toggle('hidden'); U.buildOverlays(); M.Audio.play('click'); break;
      case 'overlay': U.setOverlay(v === 'none' ? null : v); M.Audio.play('click'); if (innerWidth < 820) $('#overlays').classList.add('hidden'); break;
      case 'panel': U.openPanel(v); M.Audio.play('select'); break;
      case 'close-panel': U.closePanel(); M.Audio.play('click'); break;
      case 'undo': if (!B.undoLast()) U.toast('Nothing to undo', 'info'); break;
      case 'rotate': B.flip ^= 1; M.Input.updatePreview(); M.Audio.play('click'); U.toast('Rotated: the next building faces the other way', 'info'); break;
      case 'minimap': U.toggleMinimap(); break;
      case 'item': U.pickItem(v, p[2], p[3]); break;
      case 'modal': U.modalAct(+v); break;
      case 'goals-toggle': $('#goals').classList.toggle('min'); break;
      case 'toast': { const d = el.dataset; if (d.x) M.Camera.centerOn(+d.x, +d.y); el.remove(); break; }
      default: if (M.Panels.act(a, p, el, ev) !== false) break;
    }
  };

  // ---------------- HUD ----------------
  let lastMoney = null;
  U.updateHUD = function () {
    const c = M.city; if (!c) return; const s = c.stats;
    $('#h-name').textContent = c.name; $('#h-tier').textContent = M.TIERS[c.tier].name + (c.mode === 'sandbox' ? ' · Sandbox' : '');
    $('#h-pop').textContent = M.fmt(c.pop);
    $('#h-money').textContent = c.mode === 'sandbox' ? '∞' : M.money(c.money); $('#h-money').classList.toggle('neg', c.money < 0);
    const net = c.fin.incTotal - c.fin.expTotal; $('#h-net').textContent = (net >= 0 ? '+' : '−') + M.short(Math.abs(net)) + '/mo'; $('#h-net').className = net >= 0 ? 'pos' : 'neg';
    $('#h-happy').textContent = c.pop ? Math.round(s.happy * 100) + '%' : '–';
    for (const k of [['R', 'h-dr'], ['C', 'h-dc'], ['I', 'h-di']]) { const v = c.demand[k[0]], e = $('#' + k[1]); e.style.height = Math.abs(v) * 50 + '%'; if (v >= 0) { e.style.bottom = '50%'; e.style.top = 'auto'; e.style.opacity = 1; } else { e.style.top = '50%'; e.style.bottom = 'auto'; e.style.opacity = 0.45; } }
    $('#h-date').textContent = M.dateStr(c.day);
    const w = c.weather.type, night = M.Render.night > 0.6; $('#h-weather').textContent = w === 'rain' ? '🌧' : w === 'storm' ? '⛈' : w === 'fog' ? '🌫' : w === 'cloudy' ? '☁' : night ? '🌙' : '☀';
    lastMoney = c.money;
    U.updateGoals();
  };
  U.flashMoney = function (d) { const e = $('#h-money'); if (!e) return; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); void d; };
  U.updateSpeed = function () { const E = M.Engine; document.querySelectorAll('.sp').forEach(function (b) { const v = +b.dataset.act.split(':')[1]; b.classList.toggle('on', E.paused ? v === 0 : v === E.speed); }); };
  U.updateGoals = function () {
    const c = M.city, g = $('#goals'); if (!c || !M.settings.hints || (M.Tutorial.active && M.Tutorial.step < M.Tutorial.STEPS.length - 1)) { g.classList.add('hidden'); return; } g.classList.remove('hidden');
    const obj = M.Progression.objectives(), sc = M.Progression.scenarioStatus(); let hint = '';
    let h = '<div class="ghead" data-act="goals-toggle"><b>' + M.TIERS[c.tier].name + '</b><small>' + obj.filter(function (o) { return o[1]; }).length + '/' + obj.length + '</small></div><div class="gbody">';
    for (const o of obj) { h += '<div class="goal' + (o[1] ? ' done' : '') + '"><i>' + (o[1] ? '✓' : '') + '</i>' + esc(o[0]) + '</div>'; if (!o[1] && !hint) hint = o[2]; }
    if (hint) h += '<div class="hint">' + esc(U.touch ? hint.replace(/ \(key [^)]*\)/g, '') : hint) + '</div>';
    if (sc && !sc.won && !sc.lost) h += '<div class="hint sc"><b>' + esc(sc.name) + '</b> · ' + sc.left.toFixed(1) + ' years left</div>';
    h += '</div>';
    if (g._h !== h) { g._h = h; g.innerHTML = h; }
  };

  // ---------------- construction toolbar ----------------
  function thumbOf(key, make) { let c = U.thumbs[key]; if (!c) c = U.thumbs[key] = make(); const copy = document.createElement('canvas'); copy.width = c.width; copy.height = c.height; copy.getContext('2d').drawImage(c, 0, 0); return copy; }
  function card(act, name, sub, thumb, tip, locked, sel) {
    const d = document.createElement('button'); d.className = 'card' + (locked ? ' locked' : '') + (sel ? ' on' : ''); d.dataset.act = act; d.dataset.tip = tip;
    if (thumb) d.appendChild(thumb); else d.insertAdjacentHTML('beforeend', '<div class="swatch"></div>');
    d.insertAdjacentHTML('beforeend', '<b>' + esc(name) + '</b><small>' + (locked ? icon('lock') + esc(locked) : sub) + '</small>');
    return d;
  }
  function defTip(d) {
    let t = '<b>' + esc(d.name) + '</b><br>' + esc(d.desc) + '<br><span class="tt">Cost ' + M.money(d.cost * M.DIFF[M.city.diff].cost) + (d.upkeep ? ' · Upkeep ' + M.money(d.upkeep) + '/mo' : '');
    if (d.size > 1) t += ' · ' + d.size + '×' + d.size + ' tiles'; if (d.jobs) t += ' · ' + d.jobs + ' jobs'; if (d.usePower) t += ' · uses ' + d.usePower + ' MW';
    return t + '</span>';
  }
  U.buildTray = function () {
    const tray = $('#tray'), cat = U.cat, c = M.city; if (!c) return;
    document.querySelectorAll('.cat').forEach(function (b) { b.classList.toggle('on', b.id === 'cat-' + cat); });
    tray.innerHTML = ''; if (!cat) { tray.classList.add('hidden'); return; } tray.classList.remove('hidden');
    const S = M.Sprites, tool = B.tool, row = document.createElement('div'); row.className = 'cards';
    const lockName = function (tier) { return M.tierOK(tier) ? null : M.TIERS[tier].name; };
    if (cat === 'road') {
      for (let k = 1; k < M.ROADS.length; k++) { const r = M.ROADS[k]; row.appendChild(card('item:road:' + k, r.name, M.money(r.cost * M.DIFF[c.diff].cost) + '/tile', thumbOf('road' + k, function () { return S.roadIcon(k, 64, 44); }), '<b>' + r.name + '</b><br>' + r.desc + '<br><span class="tt">' + (r.cap ? 'Capacity ' + r.cap + ' vehicles · ' : '') + 'Upkeep ' + M.money(r.upkeep * 100) + ' per 100 tiles/mo · Bridges cost ' + M.BRIDGE_COST + '×</span>', lockName(r.tier), tool.type === 'road' && tool.road === k)); }
    } else if (cat === 'res' || cat === 'com' || cat === 'ind') {
      const z = cat === 'res' ? 1 : cat === 'com' ? 2 : 3, lv = [0, 1, 3, 5];
      for (let d = 1; d <= 3; d++) row.appendChild(card('item:zone:' + z + ':' + d, M.DENS_NAME[d], M.money(M.ZCOST[d] * M.DIFF[c.diff].cost) + '/tile', thumbOf('z' + z + d, function () { return S.thumb(S.zoned(z, lv[d], 2, 1, 0, 0), 64, 44); }), '<b>' + M.ZNAME[z] + ' – ' + M.DENS_NAME[d] + '</b><br>Drag to paint a zone. Buildings grow by themselves when there is demand, a road within 2 tiles, electricity and (beyond the first level) water.<br><span class="tt">Allows up to: ' + M.ZB[z].names[d === 1 ? 2 : d === 2 ? 3 : 5] + '</span>', lockName(M.DENS_TIER[d]), tool.type === 'zone' && tool.z === z && tool.d === d));
      row.appendChild(card('item:dezone', 'De-zone', 'free', null, '<b>De-zone</b><br>Remove zoning from empty tiles.', null, tool.type === 'dezone'));
    } else if (cat === 'district') {
      for (let d = 1; d <= 8; d++) { const b = card('item:district:' + d, c.districts[d].name, 'paint', null, '<b>' + esc(c.districts[d].name) + '</b><br>Drag to paint this district. Set its taxes and policies in the Districts &amp; policies panel.', lockName(2), tool.type === 'district' && tool.id === d); b.querySelector('.swatch').style.background = M.Render.DCOL[d]; row.appendChild(b); }
      row.appendChild(card('item:district:0', 'Erase', 'paint', null, '<b>Erase district</b><br>Remove tiles from any district.', lockName(2), tool.type === 'district' && tool.id === 0));
      const ex = card('expand', 'Extend limits', B.canExpand() ? M.money(B.expandCost()) : 'at maximum', null, '<b>Extend the city limits</b><br>Buy 8 more tiles of land in every direction.', B.canExpand() ? null : 'Map edge reached', false); ex.querySelector('.swatch').innerHTML = icon('expand'); row.appendChild(ex);
      const pb = card('panel:policy', 'Policies…', 'open panel', null, '<b>Districts &amp; policies</b><br>Name districts, set local taxes and enact policies.', null, false); pb.querySelector('.swatch').innerHTML = icon('policy'); row.appendChild(pb);
    } else if (cat === 'bulldoze') {
      const b1 = card('item:bulldoze', 'Bulldozer', 'drag an area', null, '<b>Demolish</b> <kbd>B</kbd><br>Removes buildings, roads, power lines and trees. Zoning stays, so zoned lots regrow.', null, tool.type === 'bulldoze'); b1.querySelector('.swatch').innerHTML = icon('bulldoze'); row.appendChild(b1);
      const b2 = card('item:dezone', 'De-zone', 'free', null, '<b>De-zone</b><br>Remove zoning from empty tiles.', null, tool.type === 'dezone'); b2.querySelector('.swatch').innerHTML = icon('dezone'); row.appendChild(b2);
    } else {
      for (const id in M.DEFS) {
        const d = M.DEFS[id]; if (d.cat !== cat || d.internal) continue;
        const th = d.line ? thumbOf('pylon', function () { return S.thumb(S.pylon(), 64, 44); }) : d.deco === 'tree' ? thumbOf('tree', function () { return S.thumb(S.deco(2, 1), 64, 44); }) : thumbOf('d' + id, function () { return S.thumb(S.def(id, 0, 0), 64, 44); });
        row.appendChild(card('item:build:' + id, d.name, M.money(d.cost * M.DIFF[c.diff].cost) + (d.line || d.deco ? '/tile' : ''), th, defTip(d), lockName(d.tier), (tool.type === 'build' && tool.def === id) || (d.line && tool.type === 'line') || (d.deco === 'tree' && tool.type === 'trees')));
      }
    }
    tray.appendChild(row);
    const hint = document.createElement('div'); hint.className = 'trayhint';
    const simple = cat === 'road' || cat === 'res' || cat === 'com' || cat === 'ind' || cat === 'bulldoze' || cat === 'district';
    hint.innerHTML = cat === 'road' ? 'Drag to build. Drag over a road to upgrade it.' + (U.touch ? '' : ' Right-click cancels.') : (cat === 'res' || cat === 'com' || cat === 'ind') ? 'Drag a rectangle to zone. Lots need a road within 2 tiles.' : cat === 'bulldoze' ? 'Drag a rectangle to demolish.' : cat === 'district' ? 'Paint districts, then give each its own taxes and policies.' : U.touch ? 'Tap to place, or slide and let go to aim. Two fingers move the map.' : '<kbd>R</kbd> rotates · Right-click or <kbd>Esc</kbd> cancels · Roads carry power and water to everything within 3 tiles.';
    if (U.touch) { // what the keyboard and the right mouse button do on a desktop
      const bar = document.createElement('div'); bar.className = 'traybtns';
      bar.innerHTML = (simple ? '' : '<button class="btn" data-act="rotate">' + icon('undo') + 'Rotate</button>') + '<button class="btn" data-act="undo">' + icon('undo') + 'Undo</button><button class="btn" data-act="tool-pointer">' + icon('close') + 'Done</button>';
      tray.appendChild(bar);
    }
    tray.appendChild(hint);
  };
  U.selectCat = function (id) {
    if (M.mode !== 'game') return; M.Audio.play('select');
    if (U.cat === id) { U.cat = null; B.setTool(null); U.buildTray(); return; }
    U.cat = id;
    if (id === 'bulldoze') B.setTool({ type: 'bulldoze' });
    else if (id === 'road') B.setTool({ type: 'road', road: B.lastRoad || 2 });
    else if (id === 'res' || id === 'com' || id === 'ind') { const z = id === 'res' ? 1 : id === 'com' ? 2 : 3, d = Math.min(B.lastDens || 1, M.tierOK(3) ? 3 : M.tierOK(1) ? 2 : 1); B.setTool({ type: 'zone', z: z, d: d }); }
    else if (B.tool.type !== 'pointer') B.setTool(null);
    if (id === 'district' && M.tierOK(2)) U.setOverlay('district'); else if (M.Render.overlay === 'district') U.setOverlay(null);
    U.buildTray();
  };
  U.pickItem = function (kind, a, b) {
    M.Audio.play('select');
    if (kind === 'road') { B.lastRoad = +a; B.setTool({ type: 'road', road: +a }); }
    else if (kind === 'zone') { B.lastDens = +b; B.setTool({ type: 'zone', z: +a, d: +b }); }
    else if (kind === 'dezone') B.setTool({ type: 'dezone' });
    else if (kind === 'bulldoze') B.setTool({ type: 'bulldoze' });
    else if (kind === 'district') B.setTool({ type: 'district', id: +a });
    else if (kind === 'build') { const d = M.DEFS[a]; if (d.line) B.setTool({ type: 'line' }); else if (d.deco === 'tree') B.setTool({ type: 'trees' }); else B.setTool({ type: 'build', def: a }); }
  };
  U.updateToolState = function () { U.buildTray(); const p = $('#sb-tool-pointer'); if (p) p.classList.toggle('on', B.tool.type === 'pointer'); $('#game').style.cursor = B.tool.type === 'pointer' ? 'grab' : 'crosshair'; };
  U.cancelTool = function () { U.cat = null; B.setTool(null); if (M.Render.overlay === 'district') U.setOverlay(null); U.buildTray(); };
  U.cursorInfo = function (text, ok, x, y) { const e = $('#cursorinfo'); if (!text) { e.classList.add('hidden'); return; } e.textContent = text; e.classList.remove('hidden'); e.classList.toggle('bad', ok === false); if (x != null) U.cursorMove(x, y); };
  U.cursorMove = function (x, y) { const e = $('#cursorinfo'); if (e.classList.contains('hidden')) return;
    if (U.touch) { e.style.left = M.clamp(x - e.offsetWidth / 2, 6, innerWidth - e.offsetWidth - 6) + 'px'; e.style.top = Math.max(54, y - 84) + 'px'; return; } // above the finger, not under it
    e.style.left = Math.min(innerWidth - e.offsetWidth - 6, x + 18) + 'px'; e.style.top = Math.max(54, y - 34) + 'px'; };

  // ---------------- overlays / data views ----------------
  const OVS = [['none', 'None'], ['zones', 'Zones'], ['traffic', 'Traffic'], ['air', 'Air pollution'], ['gnd', 'Ground pollution'], ['noise', 'Noise'], ['lv', 'Land value'], ['crime', 'Crime'], ['happy', 'Happiness'], ['power', 'Electricity'], ['water', 'Water'], ['fire', 'Fire cover'], ['police', 'Police cover'], ['health', 'Healthcare'], ['edu', 'Schools'], ['edu2', 'High schools'], ['park', 'Parks'], ['bus', 'Bus stops'], ['district', 'Districts']];
  const LEG = { traffic: ['Free', 'Jammed'], air: ['Clean', 'Toxic'], gnd: ['Clean', 'Contaminated'], noise: ['Quiet', 'Loud'], lv: ['Low', 'High'], crime: ['Safe', 'Dangerous'], happy: ['Unhappy', 'Happy'], power: ['Shortage', 'Powered'], water: ['Shortage', 'Supplied'] };
  U.buildOverlays = function () { $('#overlays').innerHTML = '<h4>Data views</h4>' + OVS.map(function (o) { return '<button class="ov' + ((M.Render.overlay || 'none') === o[0] ? ' on' : '') + '" data-act="overlay:' + o[0] + '">' + o[1] + '</button>'; }).join(''); };
  U.setOverlay = function (id) {
    M.Render.overlay = id; const lg = $('#legend'); $('#sb-overlays').classList.toggle('on', !!id);
    if (!$('#overlays').classList.contains('hidden')) U.buildOverlays();
    if (!id || id === 'zones' || id === 'district') { lg.classList.add('hidden'); return; }
    const name = OVS.find(function (o) { return o[0] === id; })[1], ramp = M.Render.overlayRamp(id), l = LEG[id] || ['Weak', 'Strong'];
    lg.innerHTML = '<b>' + name + '</b><div class="ramp">' + ramp.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</div><div class="rl"><span>' + l[0] + '</span><span>' + l[1] + '</span></div>'; lg.classList.remove('hidden');
  };
  U.cycleOverlay = function () { const cur = M.Render.overlay || 'none', i = OVS.findIndex(function (o) { return o[0] === cur; }), nx = OVS[(i + 1) % OVS.length][0]; U.setOverlay(nx === 'none' ? null : nx); U.toast('Data view: ' + OVS[(i + 1) % OVS.length][1], 'info'); };
  U.toggleMinimap = function () { M.settings.minimap = !M.settings.minimap; $('#minimap').classList.toggle('hidden', !M.settings.minimap); M.Save.saveSettings(); };

  // ---------------- panels ----------------
  U.openPanel = function (id, arg) {
    if (U.panel === id && id !== 'inspect' && id !== 'tile') { U.closePanel(); return; }
    U.panel = id; U.panelArg = arg; $('#panel').classList.remove('hidden'); $('#panel').dataset.kind = id; $('#p-body').scrollTop = 0; U.refreshPanel(true);
    document.querySelectorAll('#side .ib').forEach(function (b) { if (b.dataset.act.indexOf('panel:') === 0) b.classList.toggle('on', b.dataset.act === 'panel:' + id); });
  };
  U.closePanel = function () { U.panel = null; M.Render.sel = null; const p = $('#panel'); if (p) p.classList.add('hidden'); document.querySelectorAll('#side .ib').forEach(function (b) { if (b.dataset.act.indexOf('panel:') === 0) b.classList.remove('on'); }); };
  U.refreshPanel = function (force) {
    if (!U.panel) return; const body = $('#p-body'), ae = document.activeElement;
    if (!force && (U.pressing || performance.now() - (U.lastPress || 0) < 600)) return; // never swap the DOM mid-click
    if (!force && ae && body.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
    const r = M.Panels.render(U.panel, U.panelArg); if (!r) { U.closePanel(); return; }
    $('#p-title').textContent = r.title;
    if (body._h !== r.html) { body._h = r.html; body.innerHTML = r.html; }
    if (r.after) r.after(body);
  };
  U.inspect = function (b) { M.Render.sel = b; U.openPanel('inspect', b); };
  U.inspectTile = function (x, y) { M.Render.sel = null; if (U.panel === 'inspect' || U.panel === 'tile' || !U.panel) U.openPanel('tile', { x: x, y: y }); };

  // ---------------- toasts, banner, modal ----------------
  U.toast = function (text, kind, loc) {
    const box = $('#toasts'); if (!box) return; const d = document.createElement('div'); d.className = 'toast ' + (kind || 'info'); d.dataset.act = 'toast';
    if (loc && loc.x != null) { d.dataset.x = loc.x; d.dataset.y = loc.y; d.classList.add('loc'); }
    d.textContent = text; box.prepend(d); while (box.children.length > 4) box.lastChild.remove();
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, kind === 'bad' ? 9000 : 6000);
  };
  U.banner = function (title, sub) { const b = $('#banner'); b.innerHTML = '<b>' + esc(title) + '</b><span>' + esc(sub || '') + '</span>'; b.classList.remove('hidden'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); clearTimeout(U._bt); U._bt = setTimeout(function () { b.classList.add('hidden'); }, 5200); };
  let modalBtns = [];
  U.modal = function (title, html, buttons, sticky, wide) {
    const m = $('#modal'); modalBtns = buttons || [['OK', null]]; U.modalSticky = !!sticky; U.modalOpen = true;
    m.innerHTML = '<div class="mbox glass' + (wide ? ' wide' : '') + '"><div class="phead"><span>' + esc(title) + '</span>' + (sticky ? '' : '<button class="ib" data-act="modal:-1">' + icon('close') + '</button>') + '</div><div class="mbody">' + html + '</div><div class="mbtns">' + modalBtns.map(function (b, i) { return '<button class="btn' + (i === 0 ? ' primary' : '') + (b[2] ? ' ' + b[2] : '') + '" data-act="modal:' + i + '">' + esc(b[0]) + '</button>'; }).join('') + '</div></div>';
    m.classList.remove('hidden');
  };
  U.modalAct = function (i) { const b = modalBtns[i]; if (b && b[3]) { if (b[1]) b[1](); return; } U.closeModal(); if (b && b[1]) b[1](); };
  U.closeModal = function () { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; U.modalOpen = false; };
  U.confirm = function (title, text, yes, fn) { U.modal(title, '<p>' + esc(text) + '</p>', [[yes || 'Yes', fn], ['Cancel', null]]); };
  U.escape = function () {
    if (U.modalOpen) { if (!U.modalSticky) U.closeModal(); return; }
    if (M.mode !== 'game') return;
    if (!$('#overlays').classList.contains('hidden')) { $('#overlays').classList.add('hidden'); return; }
    if (B.tool.type !== 'pointer' || U.cat) { U.cancelTool(); return; }
    if (U.panel) { U.closePanel(); return; }
    U.showPause();
  };
  U.quickSave = function () { M.Save.save('quick', 'Quick save – ' + M.city.name).then(function (ok) { U.toast(ok ? 'Game saved.' : 'Saved for this session only – this browser blocks permanent storage here.', ok ? 'good' : 'info'); }); };

  // ---------------- per-frame ----------------
  let mmTimer = 0;
  U.frame = function (dt) {
    M.Audio.update(dt);
    if (M.mode !== 'game') { M.Menu.frame(dt); return; }
    M.Tutorial.frame(dt);
    U.hudTimer -= dt; if (U.hudTimer <= 0) { U.hudTimer = 0.25; U.updateHUD(); }
    U.timer -= dt; if (U.timer <= 0) { U.timer = 1; if (U.panel) U.refreshPanel(false); }
    mmTimer -= dt; if (mmTimer <= 0 && M.settings.minimap) { mmTimer = 1.2; M.Render.drawMinimap($('#mm')); }
  };
})();
