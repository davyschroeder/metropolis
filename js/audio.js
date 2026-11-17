'use strict';
/* METROPOLIS – audio: recorded music (music/*.mp3, streamed) with synthesised ambience and effects (WebAudio).
   If the music files are missing, a generated tune plays instead, so the game still works without them. */
(function () {
  const A = M.Audio = { ctx: null, ready: false };
  let master, gMusic, gSfx, gAmb, noiseBuf, hum, humGain, rain, rainGain, musicTimer = 0, birdTimer = 3, step = 0, sirenUntil = 0;
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume().catch(function () { }); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const c = A.ctx = new AC();
      master = c.createGain(); master.connect(c.destination); gMusic = c.createGain(); gSfx = c.createGain(); gAmb = c.createGain(); gMusic.connect(master); gSfx.connect(master); gAmb.connect(master);
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noiseBuf.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.2; }
      const mkLoop = function (freq, type) { const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(gAmb); s.start(); return g; };
      humGain = mkLoop(220, 'lowpass'); rainGain = mkLoop(1300, 'lowpass'); void hum; void rain;
      A.ready = true; A.applyVolumes();
    } catch (e) { A.ready = false; }
  };
  // ---------- recorded music: one track for the main menu, a shuffled playlist in the city ----------
  // Played through a plain <audio> element (streams while it downloads, and works from file://).
  const MENU_TRACK = 'main-menu', TRACKS = ['cozy-city-1', 'cozy-city-2', 'cozy-city-3', 'cozy-city-4', 'cozy-city-5', 'cozy-city-6'];
  const Mu = A.music = { el: null, mode: '', cur: '', last: '', fade: 0, gap: 0, skip: false, unlocked: false, failed: false, ok: false, bag: [] };
  A.trackName = function () { if (Mu.failed || !Mu.cur) return ''; return Mu.cur === MENU_TRACK ? 'Main menu theme' : 'Building a Cozy City ' + ['I', 'II', 'III', 'IV', 'V', 'VI'][TRACKS.indexOf(Mu.cur)]; };
  A.nextTrack = function () { if (Mu.mode === 'game' && !Mu.failed) Mu.skip = true; };
  function nextInBag() { // every track once, in random order, never the same one twice in a row
    if (!Mu.bag.length) { Mu.bag = TRACKS.slice(); for (let i = Mu.bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0, t = Mu.bag[i]; Mu.bag[i] = Mu.bag[j]; Mu.bag[j] = t; } if (Mu.bag[Mu.bag.length - 1] === Mu.last && Mu.bag.length > 1) Mu.bag.unshift(Mu.bag.pop()); }
    return Mu.bag.pop();
  }
  function musicEl() {
    if (Mu.el) return Mu.el; const el = Mu.el = new Audio(); el.preload = 'auto';
    el.addEventListener('playing', function () { Mu.ok = true; });
    el.addEventListener('ended', function () { if (Mu.mode === 'game') { Mu.cur = ''; Mu.gap = 2.5; } });
    el.addEventListener('error', function () { if (!Mu.cur) return; if (!Mu.ok) { Mu.failed = true; Mu.cur = ''; } else { Mu.cur = ''; Mu.gap = 1; } }); // no files at all: fall back to the generated tune
    return el;
  }
  function tryPlay() { const el = Mu.el, p = el.play(); if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') Mu.unlocked = false; }); }
  function startTrack(name) { const el = musicEl(); Mu.cur = name; Mu.last = name; Mu.gap = 0; Mu.fade = 0; el.loop = name === MENU_TRACK; el.volume = 0; el.src = 'music/' + name + '.mp3'; tryPlay(); }
  A.musicTick = function (dt) {
    if (!Mu.unlocked || Mu.failed || !M.settings) return;
    const s = M.settings, target = Math.min(1, s.master * s.music * 1.1), want = M.mode === 'game' ? 'game' : 'menu', el = musicEl();
    if (target < 0.004) { if (!el.paused) el.pause(); Mu.fade = 0; return; } // muted: nothing plays or downloads
    if (want !== Mu.mode || Mu.skip) { // fade out, then switch
      Mu.fade = Math.max(0, Mu.fade - dt * 1.4);
      if (Mu.fade <= 0 || !Mu.cur || el.paused) { Mu.mode = want; Mu.skip = false; startTrack(want === 'menu' ? MENU_TRACK : nextInBag()); }
    } else if (!Mu.cur) { Mu.gap -= dt; if (Mu.gap <= 0) startTrack(want === 'menu' ? MENU_TRACK : nextInBag()); }
    else { if (el.paused && !el.ended && !document.hidden) tryPlay(); Mu.fade = Math.min(1, Mu.fade + dt * 0.6); }
    el.volume = Math.max(0, Math.min(1, Mu.fade * target));
  };
  const unlock = function () { Mu.unlocked = true; }; // browsers only allow sound after the first click or key press
  window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', function () { const el = Mu.el; if (!el || !Mu.cur) return; if (document.hidden) el.pause(); else if (Mu.unlocked && !Mu.failed) tryPlay(); });
  A.applyVolumes = function () { if (!A.ready) return; const s = M.settings; master.gain.value = s.master; gMusic.gain.value = s.music * 0.5; gSfx.gain.value = s.sfx * 0.6; gAmb.gain.value = s.amb * 0.8; };
  function tone(freq, t0, dur, type, vol, dest, slideTo) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || gSfx); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function burst(t0, dur, freq, vol) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(gSfx); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  A.play = function (name) {
    if (!A.ready || A.ctx.state !== 'running') return; const t = A.ctx.currentTime;
    switch (name) {
      case 'click': tone(880, t, 0.05, 'triangle', 0.12); break;
      case 'select': tone(620, t, 0.06, 'triangle', 0.12); tone(930, t + 0.04, 0.07, 'triangle', 0.1); break;
      case 'place': burst(t, 0.18, 500, 0.5); tone(130, t, 0.16, 'sine', 0.35, null, 70); break;
      case 'road': burst(t, 0.12, 900, 0.3); break;
      case 'zone': tone(520, t, 0.08, 'sine', 0.14); tone(780, t + 0.05, 0.1, 'sine', 0.1); break;
      case 'bulldoze': burst(t, 0.4, 320, 0.7); tone(90, t, 0.3, 'sawtooth', 0.12, null, 40); break;
      case 'error': tone(200, t, 0.12, 'square', 0.08); tone(150, t + 0.1, 0.16, 'square', 0.08); break;
      case 'cash': tone(1320, t, 0.06, 'triangle', 0.1); tone(1760, t + 0.06, 0.12, 'triangle', 0.1); break;
      case 'good': [523, 659, 784].forEach(function (f, i) { tone(f, t + i * 0.09, 0.22, 'triangle', 0.12); }); break;
      case 'bad': tone(330, t, 0.25, 'sawtooth', 0.07, null, 220); tone(247, t + 0.2, 0.35, 'sawtooth', 0.07, null, 165); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.13, 0.3, 'triangle', 0.14); tone(f / 2, t + i * 0.13, 0.3, 'sine', 0.1); }); break;
      case 'siren': if (t < sirenUntil) return; sirenUntil = t + 3; for (let i = 0; i < 4; i++) { tone(660, t + i * 0.7, 0.34, 'square', 0.035, null, 880); tone(880, t + i * 0.7 + 0.35, 0.34, 'square', 0.035, null, 660); } break;
      case 'thunder': burst(t + 0.4 + Math.random() * 1.2, 2.4, 110, 0.22); break;
    }
  };
  const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9], [146.8, 174.6, 220], [196, 246.9, 329.6]], PENTA = [440, 523.3, 587.3, 659.3, 784, 880, 1046.5];
  // called every frame: ambience follows the city, music is generated on the fly
  A.update = function (dt) {
    A.musicTick(dt);
    if (!A.ready || A.ctx.state !== 'running') return; const c = A.ctx, t = c.currentTime, city = M.city; if (!city) return;
    const zoomK = M.clamp((M.Camera.zoom - 0.3) / 1.2, 0.2, 1), game = M.mode === 'game';
    const humT = game ? Math.min(0.28, 0.04 + city.pop / 50000) * zoomK : 0.02, rainT = (city.weather.rainI || 0) * 0.075 * (M.settings.weather ? 1 : 0);
    humGain.gain.setTargetAtTime(humT, t, 0.8); rainGain.gain.setTargetAtTime(rainT, t, 1.2);
    birdTimer -= dt;
    if (birdTimer <= 0) { birdTimer = 2 + Math.random() * 6; if (M.Render.night < 0.5 && rainT < 0.01 && city.pop < 20000) { const f = 2400 + Math.random() * 1600, n = 2 + ((Math.random() * 3) | 0); for (let i = 0; i < n; i++) tone(f * (1 + i * 0.06), t + i * 0.11, 0.09, 'sine', 0.03, gAmb, f * 1.25); } }
    musicTimer -= dt;
    if (musicTimer <= 0 && Mu.failed) { // generated tune, only when the music files are not there
      musicTimer = 6; const ch = CHORDS[step % CHORDS.length]; step++;
      for (const f of ch) { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), flt = c.createBiquadFilter(); o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.006; flt.type = 'lowpass'; flt.frequency.value = 700; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 2.2); g.gain.linearRampToValueAtTime(0.0001, t + 7.5); o.connect(flt); o2.connect(flt); flt.connect(g); g.connect(gMusic); o.start(t); o2.start(t); o.stop(t + 7.6); o2.stop(t + 7.6); }
      tone(ch[0] / 2, t, 5.5, 'sine', 0.09, gMusic);
      for (let i = 0; i < 6; i++) if (Math.random() < 0.55) tone(PENTA[(Math.random() * PENTA.length) | 0], t + i + Math.random() * 0.2, 1.4, 'triangle', 0.035, gMusic);
    }
  };
  M.on('placed', function (kind) { A.play(kind === 'road' || kind === 'line' ? 'road' : kind === 'zone' || kind === 'district' ? 'zone' : kind === 'bulldoze' ? 'bulldoze' : kind === 'undo' ? 'select' : 'place'); });
  M.on('siren', function () { A.play('siren'); });
  M.on('lightning', function () { if (M.settings.weather) A.play('thunder'); });
  M.on('news', function (t, k) { if (k === 'bad') A.play('bad'); else if (k === 'good') A.play('good'); });
  M.on('tier', function () { A.play('fanfare'); }); M.on('achievement', function () { A.play('fanfare'); });
})();
