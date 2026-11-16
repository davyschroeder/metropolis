'use strict';
/* METROPOLIS – save management: IndexedDB slots with in-memory fallback, autosave, settings in localStorage */
(function () {
  const Sv = M.Save = { db: null, mem: new Map(), persistent: false, lastAuto: 0 };
  const DEFAULTS = { master: 0.7, music: 0.5, sfx: 0.8, amb: 0.6, daynight: true, weather: true, quality: 'high', edge: false, autosave: 6, hints: true, minimap: true };
  M.settings = Object.assign({}, DEFAULTS);
  Sv.loadSettings = function () { try { const s = JSON.parse(localStorage.getItem('metropolis.settings') || '{}'); Object.assign(M.settings, s); } catch (e) { /* storage unavailable */ } };
  Sv.saveSettings = function () { try { localStorage.setItem('metropolis.settings', JSON.stringify(M.settings)); } catch (e) { /* ignore */ } };
  Sv.init = function () {
    return new Promise(function (resolve) {
      let done = false; const finish = function () { if (!done) { done = true; resolve(Sv.persistent); } };
      try {
        const req = indexedDB.open('metropolis-db', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('saves', { keyPath: 'id' }); };
        req.onsuccess = function () { Sv.db = req.result; Sv.persistent = true; finish(); };
        req.onerror = function () { finish(); }; req.onblocked = function () { finish(); };
        setTimeout(finish, 1500);
      } catch (e) { finish(); }
    });
  };
  function tx(mode, fn) {
    return new Promise(function (resolve, reject) {
      if (!Sv.db) return reject(new Error('no db'));
      try { const t = Sv.db.transaction('saves', mode), st = t.objectStore('saves'), r = fn(st); t.oncomplete = function () { resolve(r && r.result); }; t.onerror = function () { reject(t.error); }; t.onabort = function () { reject(t.error); }; } catch (e) { reject(e); }
    });
  }
  Sv.list = function () {
    const sortMeta = function (arr) { return arr.map(function (r) { return { id: r.id, name: r.name, time: r.time, meta: r.meta }; }).sort(function (a, b) { return b.time - a.time; }); };
    if (!Sv.db) return Promise.resolve(sortMeta(Array.from(Sv.mem.values())));
    return tx('readonly', function (st) { return st.getAll(); }).then(sortMeta).catch(function () { return sortMeta(Array.from(Sv.mem.values())); });
  };
  Sv.build = function (id, name) {
    const c = M.city;
    return { id: id, name: name || c.name, time: Date.now(), version: M.VERSION, meta: { city: c.name, pop: c.pop, money: Math.round(c.money), day: c.day, tier: c.tier, mode: c.mode, size: M.world.n }, data: { world: M.world.serialize(), city: JSON.parse(JSON.stringify(c)) } };
  };
  Sv.save = function (id, name) {
    const rec = Sv.build(id, name); Sv.mem.set(id, rec);
    if (!Sv.db) return Promise.resolve(false);
    return tx('readwrite', function (st) { return st.put(rec); }).then(function () { return true; }).catch(function () { return false; });
  };
  Sv.read = function (id) {
    if (!Sv.db) return Promise.resolve(Sv.mem.get(id) || null);
    return tx('readonly', function (st) { return st.get(id); }).then(function (r) { return r || Sv.mem.get(id) || null; }).catch(function () { return Sv.mem.get(id) || null; });
  };
  Sv.apply = function (rec) {
    M.world = M.World.deserialize(rec.data.world); M.city = JSON.parse(JSON.stringify(rec.data.city));
    const c = M.city, fresh = M.newCity({ name: c.name, seed: c.seed, size: c.size });
    for (const k in fresh) if (c[k] === undefined) c[k] = fresh[k]; // forward-compatible defaults
    for (const k in fresh.stats) if (c.stats[k] === undefined) c.stats[k] = fresh.stats[k];
    M.Engine.afterLoad(false); M.Build.undo.length = 0; M.emit('loaded');
  };
  Sv.load = function (id) { return Sv.read(id).then(function (rec) { if (!rec) return false; Sv.apply(rec); return true; }); };
  Sv.remove = function (id) { Sv.mem.delete(id); if (!Sv.db) return Promise.resolve(); return tx('readwrite', function (st) { return st.delete(id); }).catch(function () { }); };
  M.on('month', function () {
    const iv = M.settings.autosave; if (!iv || M.mode !== 'game' || M.city.gameOver) return;
    if (Math.floor(M.city.day / 30) % iv === 0) Sv.save('auto', 'Autosave – ' + M.city.name).then(function () { M.emit('autosaved'); });
  });
})();
