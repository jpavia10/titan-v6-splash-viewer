/* Titan Reliquary · SCAPE presets, batch 1 (Grok, soundscape worker). One preset per fx scene id (fx/demo.html ids).
   Each build(k) gets the kit: k.L(id,label,gain,{wet}) makes a mixer layer; grains/noiseBed/poisson/oneShot/Voice/mover/S.
   Positions are metres, listener at origin facing -z (x right, y up). Events in: preset.on({type,x,y,dist,power}). */
(function () {
  var TS = window.TitanScape; if (!TS) return;
  var SEG = { thunder: [[0, 15], [15.5, 15], [31, 15]], whale: [[0, 26]], bowl: [[0, 26]], clank: [[0, 2.6], [3.1, 2.6], [6.2, 2.6], [9.3, 2.6]], owl: [[0, 3.4], [3.9, 3.2]] };
  function drive(L, k, f, ms) { (function t() { if (L.dead) return; L.mod = f(); L.level(.12); L.timers.push(setTimeout(t, ms || 80)); })(); }
  function sx(x) { return (x - .5) * 8; } // screen x -> metres in front of you
  /* lightning + thunder with physical delay: flash now, sound after dist/343 s (dist in km) */
  function strike(k, L, dist, x) {
    var c = k.ctx, t = c.currentTime, px = x == null ? k.rr(-1, 1) : (x - .5) * 2, d = Math.max(.15, dist), delay = d * 1000 / 343;
    k.emit("flash", { dist: d, x: (px + 1) / 2, power: Math.max(.2, 1 - d / 8) });
    var V = k.Voice(L.g, [px * 300 * d, 200, -400 * d], { ref: 400, roll: .25 });
    k.S.thunder(V.in, t + delay, d, { gain: 1.1 });
    if (d > 1.2) k.oneShot(V.in, "thunder", { t: t + delay + .2, segs: SEG.thunder, gain: .55, rate: k.rr(.85, 1.05) });
  }
  function storm(k, gain, every) {
    var L = k.L("thunder", "Thunder", gain || 1, { wet: .6 });
    k.poisson(L, function () { return (every || 1 / 18) * (.4 + k.P.intensity); }, function () { strike(k, L, k.rr(.3, 1) * Math.max(.5, k.P.storm) * 1.6); });
    return L;
  }
  function car(k, L, wet) { // a car hissing past on the road with Doppler
    var dir = Math.random() < .5 ? 1 : -1, z = -k.rr(6, 22), sp = k.rr(11, 19), len = 120, dur = len / sp;
    k.mover(L, dur, function (u) { return [dir * (u - .5) * len, 0, z]; }, function (dest) {
      var c = k.ctx, n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), o = c.createOscillator(), og = c.createGain(), olp = c.createBiquadFilter();
      n.buffer = k.noiseBuf; n.loop = true; bp.type = "bandpass"; bp.frequency.value = wet ? 2600 : 900; bp.Q.value = .6; g.gain.value = wet ? .9 : .5;
      o.type = "sawtooth"; o.frequency.value = k.rr(38, 60); olp.type = "lowpass"; olp.frequency.value = 220; og.gain.value = .25;
      n.connect(bp); bp.connect(g); g.connect(dest); o.connect(olp); olp.connect(og); og.connect(dest); var t = c.currentTime; n.start(t, Math.random() * 4); o.start(t);
      var f0 = o.frequency.value; return { rate: function (r) { n.playbackRate.setTargetAtTime(r, c.currentTime, .04); o.frequency.setTargetAtTime(f0 * r, c.currentTime, .04); },
        stop: function () { try { n.stop(); o.stop(); } catch (e) {} } };
    }, { ref: 4 });
  }
  function nb(k) { if (!k.noiseBuf) { var c = k.ctx, b = c.createBuffer(1, c.sampleRate * 6, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; k.noiseBuf = b; } }

  /* 1. NEON STREET: rain on a city street at night, buzzing tubes, gutter, tyres on wet asphalt, distant storm */
  TS.define("neon", { name: "Neon street at night", space: "street", params: { rain: .8, storm: 4, tod: 23 },
    build: function (k) { nb(k);
      var rain = k.L("rain", "Rain", .8);
      k.grains(rain, "rainHeavy", { grain: 2.2, density: 3, spread: .9 }); k.grains(rain, "rainUmbrella", { grain: 1.4, density: 2, spread: .7, rate: .97 });
      k.noiseBed(rain, "pink", { f: 5200, q: .4, gain: .18, walk: [3500, 7500] });
      drive(rain, "rain", function () { return .35 + k.P.rain * .8; }, 300);
      var drops = k.L("drops", "Drips and splashes", .7);
      k.poisson(drops, function () { return 6 + k.P.rain * 30; }, function (t) { var V = k.Voice(drops.g, [k.rr(-5, 5), k.rr(-1.5, 2), k.rr(-6, 1.5)], { ref: 1 }); k.S.drop(V.in, t, { gain: .18 }); setTimeout(function () { V.pan.disconnect(); }, 600); });
      var gut = k.L("gutter", "Gutter", .45); var gv = k.Voice(gut.g, [-3, -1, -2], { ref: 1.5 }); k.grains(gut, "river", { grain: 1.5, density: 3, dest: gv.in, rate: 1.3, spread: 0 }); gv.lp.frequency.value = 3500;
      var hum = k.L("neon", "Neon tubes", .32, { wet: .3 }); var hv = k.Voice(hum.g, [2.5, 3, -3], { ref: 1.5 });
      var c = k.ctx, hg = c.createGain(); hg.gain.value = .5; hg.connect(hv.in);
      [120, 240, 360, 600, 960, 2880].forEach(function (f, i) { var o = c.createOscillator(); o.type = i ? "sine" : "triangle"; o.frequency.value = f * (1 + (Math.random() - .5) * .002); var g = c.createGain(); g.gain.value = [.35, .2, .14, .06, .03, .02][i]; o.connect(g); g.connect(hg); o.start(); hum.nodes.push(o); });
      k.poisson(hum, function () { return .25; }, function (t) { var n = k.rr(2, 7); for (var i = 0; i < n; i++) { var tt = t + i * k.rr(.03, .09); hg.gain.setValueAtTime(.05, tt); hg.gain.setValueAtTime(.5, tt + k.rr(.02, .06)); k.S.crackle(hv.in, tt, { f: 4500, gain: .3 }); } });
      var city = k.L("city", "Distant city", .5, { wet: .8 }); var cv = k.Voice(city.g, [0, 10, -60], { ref: 30, roll: .2 }); k.grains(city, "city", { grain: 3, density: 2, dest: cv.in, spread: 0 }); cv.lp.frequency.value = 900;
      var cars = k.L("cars", "Passing cars", .7); k.poisson(cars, function () { return 1 / 9; }, function () { car(k, cars, true); });
      storm(k, .75, 1 / 30);
    },
    on: function (d, t) { if (d.type === "lightning") return; }
  });

  /* 2. SAND: open desert, a million grains moving; drag to hear sand pour under the rake */
  TS.define("sand", { name: "Desert wind and moving sand", space: "open", params: { wind: .6, tod: 17 },
    build: function (k) {
      var wind = k.L("wind", "Wind", .8, { wet: .4 });
      k.grains(wind, "windHowl", { grain: 3.2, density: 2.2, spread: .9, rate: .9 });
      k.noiseBed(wind, "pink", { f: 500, q: 1.2, gain: .6, walk: [220, 1400], walkMs: 1400, gainWalk: [.3, 1.1] });
      var whistle = k.noiseBed(wind, "white", { f: 1800, q: 22, gain: .05, walk: [900, 3200], walkMs: 2200, gainWalk: [0, 1] });
      drive(wind, "wind", function () { return .35 + k.P.wind; }, 300);
      var hiss = k.L("sand", "Blowing sand", .45);
      k.noiseBed(hiss, "white", { type: "highpass", f: 4500, q: .5, gain: .25, walk: [3800, 8000], gainWalk: [.3, 1], walkMs: 700 });
      k.poisson(hiss, function () { return 40 * (.3 + k.P.wind); }, function (t) { k.S.crackle(hiss.g, t, { f: k.rr(6000, 11000), gain: .05, burst: 1 }); });
      var rake = k.L("rake", "Rake (drag)", .9); k.noiseBed(rake, "white", { f: 3000, q: .6, gain: .5, walk: [1800, 5200], walkMs: 300 });
      k.poisson(rake, function () { return k.P.drag * 260; }, function (t) { var V = k.Voice(rake.g, [(k.P.px - .5) * 6, -1, -1.5], { ref: 1 }); k.S.crackle(V.in, t, { f: k.rr(3000, 9000), gain: .12, burst: 2 }); setTimeout(function () { V.pan.disconnect(); }, 400); });
      drive(rake, "drag", function () { return Math.min(1, k.P.drag * 2.4); }, 50);
      var far = k.L("chime", "Far bell", .2, { wet: .9 }); var fv = k.Voice(far.g, [-40, 5, -80], { ref: 20, roll: .3 });
      k.poisson(far, function () { return 1 / 40; }, function (t) { k.oneShot(fv.in, "bowl", { t: t, rate: k.rr(.97, 1.03), gain: .4 }); });
    } });

  /* 3. SMOKE AND LIGHT: a vast dark nave, breathing air, slow light; drag to move the light and the air brightens */
  TS.define("smoke", { name: "Smoke in a cathedral", space: "cathedral", params: {},
    build: function (k) { var c = k.ctx;
      var air = k.L("air", "Breathing air", .55, { wet: 1.2 });
      [[196, 9], [294, 12], [440, 14], [587, 18]].forEach(function (fq, i) { k.noiseBed(air, "pink", { f: fq[0], q: fq[1], gain: .9, walk: [fq[0] * .97, fq[0] * 1.03], walkMs: 3000, gainWalk: [.2, 1], walkT: 3 }); });
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
      drive(air, "light", function () { return .7 + (1 - k.P.py) * .5; }, 200);
      var sub = k.L("sub", "Low drone", .4, { wet: .6 });
      [55, 55.31, 82.4].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = [.5, .5, .18][i]; o.connect(g); g.connect(sub.g); o.start(); sub.nodes.push(o); });
      var ember = k.L("smoulder", "Smoulder", .3); var ev = k.Voice(ember.g, [1.5, -1, -3]); k.grains(ember, "fire", { grain: 1.8, density: 2.5, dest: ev.in, rate: .8, spread: 0 }); ev.lp.frequency.value = 1600;
      var room = k.L("room", "Stone room tone", .35, { wet: .5 }); k.grains(room, "hall", { grain: 3, density: 2, spread: .8 });
      var bell = k.L("bell", "Distant bowl", .35, { wet: 1.5 }); var bv = k.Voice(bell.g, [-12, 6, -30], { ref: 10, roll: .4 });
      k.poisson(bell, function () { return 1 / 26; }, function (t) { bv.at(k.rr(-25, 25), 6, -k.rr(20, 45)); k.oneShot(bv.in, "bowl", { t: t, rate: k.rr(.8, .84), gain: .55 }); });
    } });

  /* 4. LIQUID METAL: a foundry; furnace roar, molten glops, distant metal; touch to make the metal hiss */
  TS.define("metal", { name: "Molten metal foundry", space: "cave", params: {},
    build: function (k) { var c = k.ctx;
      var roar = k.L("furnace", "Furnace roar", .7, { wet: .5 });
      k.noiseBed(roar, "brown", { type: "lowpass", f: 260, q: 2, gain: 1.1, walk: [160, 420], walkMs: 350, gainWalk: [.7, 1.2], walkT: .25 });
      var fv = k.Voice(roar.g, [-2, 0, -4]); k.grains(roar, "fire", { grain: 1.2, density: 3, rate: .55, dest: fv.in, spread: 0, jitter: .08 }); fv.lp.frequency.value = 2500;
      var glop = k.L("glops", "Molten glops", .6, { wet: .7 });
      var glp = c.createBiquadFilter(); glp.type = "lowpass"; glp.frequency.value = 900; glp.connect(glop.g);
      k.poisson(glop, function () { return 2.2; }, function (t) { k.S.bubble(glp, t, { size: k.rr(4, 9), gain: .5 }); if (Math.random() < .3) k.S.boom(glp, t, { f: k.rr(60, 110), len: .25, gain: .25, bright: 400 }); });
      var sub = k.L("sub", "Deep hum", .3); [41.2, 61.7].forEach(function (f) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = .45; o.connect(g); g.connect(sub.g); o.start(); sub.nodes.push(o); });
      var far = k.L("works", "Distant works", .45, { wet: 1.3 }); var wv = k.Voice(far.g, [15, 2, -40], { ref: 10, roll: .4 });
      k.poisson(far, function () { return 1 / 7; }, function (t) { wv.at(k.rr(-30, 30), 2, -k.rr(25, 60)); k.oneShot(wv.in, "clank", { t: t, segs: SEG.clank, gain: .5, rate: k.rr(.6, .9) }); });
      this._hiss = k.L("hiss", "Touch hiss", .8);
    },
    on: function (d, t) { if (d.type !== "touch" && d.type !== "splash") return; var k = this._k, L = this._hiss; if (!L || L.dead) return; var c = TS.ctx, V = TS._voice;
      var n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(), b = c.createBuffer(1, c.sampleRate, c.sampleRate), dd = b.getChannelData(0); for (var i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      n.buffer = b; hp.type = "highpass"; hp.frequency.value = 3500; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.6, t + .02); g.gain.exponentialRampToValueAtTime(1e-4, t + .9);
      var p = c.createStereoPanner(); p.pan.value = ((d.x || .5) - .5) * 1.6; n.connect(hp); hp.connect(g); g.connect(p); p.connect(L.g); n.start(t); n.stop(t + 1);
      for (var j = 0; j < 14; j++) TS._S.crackle(p, t + Math.random() * .6, { f: 5000, gain: .25 }); } });

  /* 5. LIVING CORAL: on a reef; snapping shrimp, bubbles, current, far whales; touch to release bubbles */
  TS.define("coral", { name: "Coral reef underwater", space: "water", params: {},
    build: function (k) { var c = k.ctx;
      var sea = k.L("sea", "Underwater", .75); k.grains(sea, "underwater", { grain: 2.6, density: 2.4, spread: .8 });
      k.noiseBed(sea, "brown", { type: "lowpass", f: 180, q: 1, gain: .7, walk: [90, 320], walkMs: 2500, gainWalk: [.5, 1.1], walkT: 2 });
      var reef = k.L("reef", "Snapping shrimp", .35);
      k.poisson(reef, function () { return 55; }, function (t) { var V = k.Voice(reef.g, [k.rr(-10, 10), -k.rr(1, 4), -k.rr(1, 14)], { ref: 1 }); k.S.crackle(V.in, t, { f: k.rr(2500, 7000), gain: .16, burst: 1 }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      var bub = k.L("bubbles", "Bubbles", .5);
      k.poisson(bub, function () { return 1.4; }, function (t) { var n = Math.random() < .3 ? 6 : 1, x = k.rr(-4, 4); for (var i = 0; i < n; i++) { var V = k.Voice(bub.g, [x, k.rr(-1, 1), -k.rr(1, 5)], { ref: 1 }); k.S.bubble(V.in, t + i * k.rr(.02, .12), { size: k.rr(.4, 1.6), gain: .12 }); } });
      var wh = k.L("whale", "Far whales", .4, { wet: 1.4 }); var wv = k.Voice(wh.g, [-80, -20, -300], { ref: 50, roll: .2 }); wv.lp.frequency.value = 1400;
      k.poisson(wh, function () { return 1 / 45; }, function (t) { wv.at(k.rr(-300, 300), -20, -k.rr(200, 500)); k.oneShot(wv.in, "whale", { t: t, gain: .6, rate: k.rr(.85, 1.05) }); });
      this._bub = bub; this._k = k;
    },
    on: function (d, t) { if (d.type !== "touch") return; var k = this._k, L = this._bub; if (!L || L.dead) return; for (var i = 0; i < 18; i++) { var V = k.Voice(L.g, [(d.x - .5) * 6, k.rr(-1, 1), -1.5], { ref: 1 }); k.S.bubble(V.in, t + i * k.rr(.015, .06), { size: k.rr(.3, 1.4), gain: .2 }); } } });

  /* 6. INK FLUID: dark water in a glass room; drag to stir and the swirl follows your speed */
  TS.define("fluid", { name: "Ink in deep water", space: "hall", params: {},
    build: function (k) { var c = k.ctx;
      var pad = k.L("glass", "Glass resonance", .35, { wet: 1.4 }); // inharmonic filtered-noise resonance: texture, not a chord
      [173, 311, 547, 829].forEach(function (f) { k.noiseBed(pad, "pink", { f: f, q: 28, gain: .8, walk: [f * .96, f * 1.04], walkMs: 4000, gainWalk: [.1, 1], walkT: 4 }); });
      var water = k.L("water", "Still water", .45, { wet: .7 }); k.grains(water, "drips", { grain: 2, density: 2.5, spread: .8, rate: .8 });
      k.noiseBed(water, "brown", { type: "lowpass", f: 300, gain: .5, walk: [200, 500], walkMs: 2000 });
      var stir = k.L("stir", "Stir (drag)", 1); var sb = k.noiseBed(stir, "pink", { f: 600, q: 2.5, gain: .9 });
      drive(stir, "drag", function () { var dr = k.P.drag; sb.f.frequency.setTargetAtTime(350 + dr * 1600, c.currentTime, .08); return Math.min(1, dr * 2.2); }, 50);
      k.poisson(stir, function () { return k.P.drag * 40; }, function (t) { k.S.bubble(stir.g, t, { size: k.rr(1.5, 3.5), gain: .15 }); });
      this._k = k; this._w = water;
    },
    on: function (d, t) { if (d.type !== "touch") return; var k = this._k; if (!this._w || this._w.dead) return; var V = k.Voice(this._w.g, [(d.x - .5) * 6, 0, -2]); k.S.drop(V.in, t, { f: k.rr(500, 900), len: .25, gain: .5 }); } });

  /* 7. THUNDERSTORM (for the storm scene): heavy rain, wind, branching thunder delayed by distance (P.storm km) */
  TS.define("storm", { name: "Thunderstorm", space: "forest", params: { rain: 1, wind: .7, storm: 2.5 },
    build: function (k) {
      var rain = k.L("rain", "Rain", .9); k.grains(rain, "rainHeavy", { grain: 2.4, density: 3.2, spread: 1 }); k.grains(rain, "leaves", { grain: 2, density: 2, spread: .9 });
      k.noiseBed(rain, "pink", { f: 4000, q: .3, gain: .25, walk: [2500, 7000], gainWalk: [.6, 1.2] }); drive(rain, "rain", function () { return .3 + k.P.rain * .9; }, 300);
      var wind = k.L("wind", "Wind", .55); k.grains(wind, "windTrees", { grain: 3, density: 2, spread: .9 }); k.noiseBed(wind, "pink", { f: 400, q: 1, gain: .4, walk: [200, 1100], walkMs: 1200, gainWalk: [.3, 1.2] });
      drive(wind, "wind", function () { return .3 + k.P.wind; }, 300);
      var drops = k.L("drops", "Near drips", .5); k.poisson(drops, function () { return 20 * k.P.rain; }, function (t) { var V = k.Voice(drops.g, [k.rr(-3, 3), k.rr(-1, 2), k.rr(-3, 1)], { ref: 1 }); k.S.drop(V.in, t, { gain: .14 }); setTimeout(function () { V.pan.disconnect(); }, 500); });
      this._t = storm(k, 1, 1 / 9); this._k = k;
    },
    on: function (d) { if (d.type === "lightning" && this._t && !this._t.dead) strike(this._k, this._t, d.dist || 2, d.x); } });

  /* 8. FIRE (for the fire scene): a campfire at night; embers, pops, the low roar, crickets after dark */
  TS.define("fire", { name: "Campfire at night", space: "forest", params: { tod: 22, intensity: 1 },
    build: function (k) { var c = k.ctx;
      var fire = k.L("fire", "Fire", .8); var fv = k.Voice(fire.g, [0, -.5, -2], { ref: 1.5 }); k.grains(fire, "fire", { grain: 1.6, density: 3, dest: fv.in, spread: 0, jitter: .05 });
      k.noiseBed(fire, "brown", { type: "lowpass", f: 220, gain: .8, walk: [140, 380], walkMs: 300, gainWalk: [.6, 1.2], walkT: .2, dest: fv.in });
      var cr = k.L("crackle", "Crackle", .7); k.poisson(cr, function () { return 14 * k.P.intensity; }, function (t) { var V = k.Voice(cr.g, [k.rr(-.6, .6), k.rr(-.6, .3), -2 + k.rr(-.4, .4)], { ref: 1 }); k.S.crackle(V.in, t, { gain: .45, burst: 4 }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      k.poisson(cr, function () { return .5 * k.P.intensity; }, function (t) { k.S.boom(fv.in, t, { f: k.rr(90, 160), len: .12, gain: .25, bright: 5000 }); k.S.crackle(fv.in, t, { gain: .9, burst: 6 }); });
      var night = k.L("night", "Crickets", .35, { wet: .6 }); k.grains(night, "crickets", { grain: 2.5, density: 2, spread: 1 });
      drive(night, "tod", function () { var h = k.P.tod; return (h > 19 || h < 5) ? 1 : 0; }, 1000);
      var owl = k.L("owl", "Owl", .4, { wet: 1 }); var ov = k.Voice(owl.g, [-20, 8, -30], { ref: 8 });
      k.poisson(owl, function () { var h = k.P.tod; return (h > 20 || h < 4) ? 1 / 50 : 0; }, function (t) { ov.at(k.rr(-30, 30), 8, -k.rr(15, 40)); k.oneShot(ov.in, "owl", { t: t, segs: SEG.owl, gain: .5 }); });
    } });


  /* ===== batch 2 ===== */
  function cricket(k, L, pos, o) { // one insect: carrier tone chirped in pulse trains, its own tempo, placed in space
    var c = k.ctx, V = k.Voice(L.g, pos, { ref: 1.5 }), f = o.f * k.rr(.97, 1.03), per = o.per * k.rr(.85, 1.15), n = o.pulses;
    k.poisson(L, function () { return 1 / per; }, function (t) { for (var i = 0; i < n; i++) { var tt = t + i * o.gap, os = c.createOscillator(), g = c.createGain(); os.frequency.value = f; os.type = o.wave || "sine";
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(o.gain, tt + o.on * .3); g.gain.linearRampToValueAtTime(0, tt + o.on); os.connect(g); g.connect(V.in); os.start(tt); os.stop(tt + o.on + .01); } });
  }
  function nightBugs(k, L, count) {
    for (var i = 0; i < count; i++) cricket(k, L, [k.rr(-12, 12), k.rr(-1, 1), -k.rr(2, 18)], { f: k.rr(3900, 5200), per: k.rr(.45, 1.1), pulses: 3 + (i % 3), gap: .028, on: .018, gain: .05 });
    for (var j = 0; j < Math.ceil(count / 4); j++) cricket(k, L, [k.rr(-15, 15), k.rr(0, 4), -k.rr(5, 20)], { f: k.rr(7000, 9000), per: k.rr(1.2, 2.4), pulses: 14, gap: .012, on: .008, gain: .025, wave: "square" }); // katydid rasp
  }
  /* firework: launch whoosh -> flash event -> boom + crackling tail after the sound's travel time */
  function shell(k, L, d) {
    var c = k.ctx, t = c.currentTime, x = d.x == null ? k.rr(.15, .85) : d.x, dist = d.dist || k.rr(.25, 1), delay = dist * 1000 / 343, px = (x - .5) * 2;
    var V = k.Voice(L.g, [px * 200 * dist, 150, -900 * dist], { ref: 120, roll: .3 });
    if (!d.burstOnly) { var lv = k.Voice(L.g, [px * 60, 0, -250 * dist], { ref: 30, roll: .4 }), n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), up = k.rr(1.4, 2.2);
      n.buffer = k.noiseBuf; bp.type = "bandpass"; bp.Q.value = 3; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(3500, t + up); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .1); g.gain.linearRampToValueAtTime(0, t + up);
      n.connect(bp); bp.connect(g); g.connect(lv.in); n.start(t, Math.random() * 3); n.stop(t + up + .1);
      if (Math.random() < .35) { var w = c.createOscillator(), wg = c.createGain(); w.frequency.setValueAtTime(k.rr(900, 1300), t); w.frequency.exponentialRampToValueAtTime(k.rr(2600, 3600), t + up); wg.gain.setValueAtTime(.06, t); wg.gain.linearRampToValueAtTime(0, t + up); w.connect(wg); wg.connect(lv.in); w.start(t); w.stop(t + up); }
      t += up; }
    var pw = d.power || k.rr(.6, 1); setTimeout(function () { k.emit("burst", { x: x, y: k.rr(.55, .85), dist: dist, power: pw }); }, (t - c.currentTime) * 1000);
    var tb = t + delay; k.S.boom(V.in, tb, { f: k.rr(38, 60), len: 1.6 + dist, gain: 1.1 * pw, bright: 5200 * (1 - dist * .4) });
    if (Math.random() < .55) for (var i = 0; i < 140 * k.budgetK(); i++) k.S.crackle(V.in, tb + .35 + Math.pow(Math.random(), .7) * 1.8, { f: k.rr(2500, 7500), gain: .22 * pw, burst: 2 });
  }

  /* 9. FIREWORKS: a show over the city; launch whoosh, flash, boom arriving dist/343 s later, crackling willow tails, echoes */
  TS.define("fireworks", { name: "Fireworks over the city", space: "street", params: { intensity: 1 },
    build: function (k) { nb(k); k.budgetK = function () { return 1; };
      var show = k.L("show", "Fireworks", 1, { wet: 1.2 }); this._s = show; this._k = k;
      var finale = 0; k.poisson(show, function () { return (.35 + finale) * k.P.intensity; }, function () { shell(k, show, {}); if (Math.random() < .03) { finale = 2.5; setTimeout(function () { finale = 0; }, 7000); } });
      var crowd = k.L("crowd", "Crowd far off", .25, { wet: 1 }); var cv = k.Voice(crowd.g, [0, 0, -60], { ref: 30, roll: .2 }); k.grains(crowd, "crowd", { grain: 2.5, density: 2, dest: cv.in, spread: 0 }); cv.lp.frequency.value = 1800;
      var air = k.L("air", "Night air", .3); k.grains(air, "wind", { grain: 3, density: 2, spread: .9 });
    },
    on: function (d) { if ((d.type === "burst" || d.type === "launch") && this._s && !this._s.dead) shell(this._k, this._s, { x: d.x, dist: d.dist, power: d.power, burstOnly: d.type === "burst" }); } });

  /* 10. BLIZZARD: a howling whiteout; layered gusts, resonant whistles, hissing snow, ice ticks; snow-muffled distance */
  TS.define("blizzard", { name: "Blizzard", space: "snow", params: { wind: 1, intensity: 1 },
    build: function (k) {
      var howl = k.L("howl", "Howling wind", .9, { wet: .4 }); k.grains(howl, "windHowl", { grain: 3.5, density: 2.6, spread: 1, jitter: .06 });
      k.noiseBed(howl, "pink", { f: 600, q: 1.5, gain: .7, walk: [250, 1800], walkMs: 800, gainWalk: [.3, 1.3], walkT: .6 });
      drive(howl, "wind", function () { return .3 + k.P.wind * .8; }, 300);
      var wh = k.L("whistle", "Whistling gaps", .35); [900, 1400, 2300].forEach(function (f) { k.noiseBed(wh, "white", { f: f, q: 30, gain: .15, walk: [f * .8, f * 1.3], walkMs: 1300, gainWalk: [0, 1], walkT: .8 }); });
      var snow = k.L("snow", "Driving snow", .45); k.noiseBed(snow, "white", { type: "highpass", f: 6000, gain: .3, walk: [4500, 9000], walkMs: 500, gainWalk: [.4, 1.2], walkT: .3 });
      k.poisson(snow, function () { return 25 * k.P.wind; }, function (t) { k.S.crackle(snow.g, t, { f: k.rr(7000, 12000), gain: .04, burst: 1 }); });
      var ice = k.L("ice", "Ice and creaks", .4, { wet: .8 }); var iv = k.Voice(ice.g, [-6, 1, -8]);
      k.poisson(ice, function () { return 1 / 6; }, function (t) { iv.at(k.rr(-10, 10), 1, -k.rr(4, 14)); k.oneShot(iv.in, "creak", { t: t, segs: [[0, 3.6], [4.1, 3.6], [8.2, 3.6]], gain: .35, rate: k.rr(.5, .7) }); });
      var sub = k.L("rumble", "Low rumble", .4); k.noiseBed(sub, "brown", { type: "lowpass", f: 90, gain: .9, walk: [50, 140], walkMs: 1500, gainWalk: [.4, 1.2] });
      this._k = k; this._ice = k.L("frost", "Frost snap (tap)", .8, { wet: .9 });   // fx builder #2: frost scene tap hook (additive)
    },
    on: function (d, t) { if ((d.type !== "touch" && d.type !== "frost" && d.type !== "shatter") || !this._ice || this._ice.dead) return; var k = this._k, L = this._ice;
      var V = k.Voice(L.g, [((d.x == null ? .5 : d.x) - .5) * 8, 1, -k.rr(1.5, 4)]); t = t || TS.ctx.currentTime;
      k.oneShot(V.in, "creak", { t: t, segs: [[k.rr(0, 8), 1.4]], gain: .5 * (d.power || 1), rate: k.rr(.9, 1.3) });
      for (var i = 0; i < 26; i++) k.S.crackle(V.in, t + i * k.rr(.012, .05), { f: k.rr(6000, 11000), gain: .06, burst: 1 }); } });

  /* 11. OCEAN: open shore; each wave is built (swell, crash, foam fizz, backwash over pebbles) plus a recorded surf bed and gulls */
  TS.define("ocean", { name: "Ocean shore", space: "open", params: { wind: .4, intensity: 1, tod: 14 },
    build: function (k) { var c = k.ctx;
      var bed = k.L("surf", "Surf bed", .55); k.grains(bed, "waves", { grain: 3.2, density: 2.2, spread: .9 });
      var waves = k.L("waves", "Breaking waves", .9, { wet: .3 });
      k.poisson(waves, function () { return 1 / k.rr(6, 10) * k.P.intensity; }, function (t) {
        var x = k.rr(-8, 8), V = k.Voice(waves.g, [x, 0, -k.rr(8, 16)], { ref: 6 }), big = k.rr(.6, 1.2);
        var sw = c.createBufferSource(), sl = c.createBiquadFilter(), sg = c.createGain(); sw.buffer = k.noiseBuf || (nb(k), k.noiseBuf); sl.type = "lowpass";
        sl.frequency.setValueAtTime(150, t); sl.frequency.exponentialRampToValueAtTime(2500 * big, t + 2.2); sl.frequency.exponentialRampToValueAtTime(400, t + 6);
        sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(.8 * big, t + 2); sg.gain.linearRampToValueAtTime(2.2 * big, t + 2.4); sg.gain.exponentialRampToValueAtTime(.001, t + 7.5);
        sw.connect(sl); sl.connect(sg); sg.connect(V.in); sw.start(t, Math.random() * 3); sw.stop(t + 8);
        k.S.boom(V.in, t + 2.3, { f: 45, len: 1.4, gain: .9 * big, bright: 900 });
        for (var i = 0; i < 90; i++) k.S.crackle(V.in, t + 2.6 + Math.pow(Math.random(), .6) * 4, { f: k.rr(3000, 9000), gain: .05, burst: 1 });
        var bw = k.Voice(waves.g, [x * .6, -1, -k.rr(2, 5)], { ref: 2 }); for (var j = 0; j < 60; j++) k.S.crackle(bw.in, t + 5 + Math.random() * 2.5, { f: k.rr(1500, 4000), gain: .07, burst: 2 }); });
      var gulls = k.L("gulls", "Gulls", .3, { wet: .6 }); var gv = k.Voice(gulls.g, [10, 15, -30], { ref: 10 });
      k.poisson(gulls, function () { var h = k.P.tod; return h > 6 && h < 20 ? 1 / 12 : 0; }, function (t) { gv.at(k.rr(-30, 30), 15, -k.rr(15, 40)); k.oneShot(gv.in, "gulls", { t: t, segs: [[k.rr(0, 30), 4]], gain: .6 }); });
      var wind = k.L("wind", "Sea wind", .35); k.noiseBed(wind, "pink", { f: 700, q: .8, gain: .5, walk: [300, 1500], walkMs: 1500, gainWalk: [.3, 1] }); drive(wind, "wind", function () { return .2 + k.P.wind; }, 300);
    } });

  /* 12. RAINFOREST: dense canopy; birds by day, frogs and insects by night, rain on leaves, canopy drips, distant river, cicada swells */
  TS.define("rainforest", { name: "Misty rainforest", space: "forest", params: { rain: .4, tod: 7, intensity: 1 },
    build: function (k) { var c = k.ctx; var day = function () { var h = k.P.tod; return h > 5.5 && h < 19 ? 1 : 0; };
      var birds = k.L("birds", "Birds", .6, { wet: .7 }); k.grains(birds, "birds", { grain: 2.6, density: 2.2, spread: 1 }); drive(birds, "tod", function () { return .15 + day() * .85; }, 1000);
      var frogs = k.L("frogs", "Frogs", .5, { wet: .6 }); k.grains(frogs, "frogs", { grain: 2.4, density: 2, spread: 1 }); drive(frogs, "tod", function () { return .2 + (1 - day()) * .8 + k.P.rain * .4; }, 1000);
      var bugs = k.L("insects", "Insects", .4); nightBugs(k, bugs, 8); drive(bugs, "tod", function () { return .3 + (1 - day()) * .7; }, 1000);
      var cic = k.L("cicadas", "Cicada swells", .3); var cb = k.noiseBed(cic, "white", { f: 5200, q: 8, gain: 0 });
      (function swell() { if (cic.dead) return; var t = c.currentTime, d = k.rr(6, 14); cb.g.gain.setValueAtTime(0, t); cb.g.gain.linearRampToValueAtTime(.5, t + d * .4); cb.g.gain.linearRampToValueAtTime(0, t + d); cic.timers.push(setTimeout(swell, (d + k.rr(4, 20)) * 1000)); })();
      var am = c.createOscillator(), amg = c.createGain(); am.frequency.value = 110; amg.gain.value = .4; am.connect(amg); amg.connect(cb.f2.frequency); am.start(); cic.nodes.push(am);
      var rain = k.L("rain", "Rain on leaves", .6); k.grains(rain, "leaves", { grain: 2.2, density: 2.6, spread: 1 }); drive(rain, "rain", function () { return k.P.rain * 1.2; }, 300);
      var drips = k.L("drips", "Canopy drips", .55); k.poisson(drips, function () { return 2 + k.P.rain * 10; }, function (t) { var V = k.Voice(drips.g, [k.rr(-6, 6), k.rr(-1, 4), -k.rr(1, 8)], { ref: 1 }); k.S.drop(V.in, t, { f: k.rr(700, 2200), len: k.rr(.05, .15), gain: .2 }); setTimeout(function () { V.pan.disconnect(); }, 600); });
      var river = k.L("river", "Distant river", .3, { wet: .8 }); var rv = k.Voice(river.g, [-25, -2, -40], { ref: 15, roll: .3 }); k.grains(river, "river", { grain: 2.5, density: 2.4, dest: rv.in, spread: 0 });
    } });

  /* 13. NIGHT INSECTS / FIREFLIES: a warm meadow at night; a field of individually placed crickets and katydids, frogs, an owl, grass breeze */
  TS.define("fireflies", { name: "Fireflies in a night meadow", space: "forest", params: { tod: 23, wind: .2 },
    build: function (k) {
      var bugs = k.L("crickets", "Crickets (each one placed)", .7); nightBugs(k, bugs, Math.round(14 * (TS.budget || 1)));
      var bed = k.L("field", "Meadow bed", .35, { wet: .5 }); k.grains(bed, "crickets", { grain: 2.8, density: 2, spread: 1 });
      var frogs = k.L("frogs", "Far pond frogs", .3, { wet: .8 }); var fv = k.Voice(frogs.g, [20, -1, -45], { ref: 15, roll: .3 }); k.grains(frogs, "frogs", { grain: 2.4, density: 2, dest: fv.in, spread: 0 });
      var owl = k.L("owl", "Owl", .4, { wet: 1.1 }); var ov = k.Voice(owl.g, [-20, 8, -30], { ref: 8 }); k.poisson(owl, function () { return 1 / 35; }, function (t) { ov.at(k.rr(-30, 30), 8, -k.rr(15, 40)); k.oneShot(ov.in, "owl", { t: t, segs: SEG.owl, gain: .5 }); });
      var grass = k.L("breeze", "Breeze in grass", .3); k.grains(grass, "windTrees", { grain: 3, density: 2, spread: 1, rate: 1.1 }); drive(grass, "wind", function () { return .2 + k.P.wind * 1.5; }, 300);
    } });
  TS.define("insects", Object.assign({}, TS.presets.fireflies, { name: "Night insects" }));

  /* ===== batch 3 ===== */
  /* 14. WATERFALL: a big fall in a gorge; recorded roar split into a near plunge and a high spray, mist hiss, splash drops, gorge echo */
  TS.define("waterfall", { name: "Waterfall in a gorge", space: "cave", params: { intensity: 1 },
    build: function (k) {
      var fall = k.L("fall", "Falling water", .85, { wet: .5 }); var fv = k.Voice(fall.g, [0, 4, -14], { ref: 8 });
      k.grains(fall, "waterfall", { grain: 2.4, density: 3, dest: fv.in, spread: 0, jitter: .05 });
      k.noiseBed(fall, "brown", { type: "lowpass", f: 160, gain: 1.2, walk: [90, 260], walkMs: 600, gainWalk: [.7, 1.2], dest: fv.in });
      drive(fall, "i", function () { return .5 + k.P.intensity * .5; }, 300);
      var spray = k.L("spray", "Spray and mist", .45); k.grains(spray, "river", { grain: 1.6, density: 3, spread: 1, rate: 1.25 });
      k.noiseBed(spray, "white", { type: "highpass", f: 5000, gain: .2, walk: [3500, 8000], gainWalk: [.5, 1.1], walkMs: 500 });
      var sp = k.L("splash", "Splashes", .5); k.poisson(sp, function () { return 18 * k.P.intensity; }, function (t) { var V = k.Voice(sp.g, [k.rr(-6, 6), k.rr(-2, 1), -k.rr(3, 10)], { ref: 1.5 }); k.S.drop(V.in, t, { f: k.rr(600, 2500), len: k.rr(.04, .12), gain: .22 }); setTimeout(function () { V.pan.disconnect(); }, 500); });
      var pool = k.L("pool", "Plunge pool", .35); var pv = k.Voice(pool.g, [-3, -2, -9], { ref: 3 }); k.poisson(pool, function () { return 3; }, function (t) { k.S.bubble(pv.in, t, { size: k.rr(2, 5), gain: .2 }); });
      var birds = k.L("birds", "Gorge birds", .2, { wet: 1 }); k.grains(birds, "birds", { grain: 2.5, density: 1.6, spread: 1 }); drive(birds, "tod", function () { var h = k.P.tod; return h > 6 && h < 19 ? 1 : 0; }, 1000);
    } });

  /* 15. UNDERWATER (open ocean, not the reef): pressure hum, slow current surges, a diver's breath bubbles, far whales, sonar-like ping echoes off the deep */
  TS.define("underwater", { name: "Deep underwater", space: "water", params: { intensity: 1 },
    build: function (k) { var c = k.ctx;
      var deep = k.L("deep", "Deep water", .8); var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.connect(deep.g);
      k.grains(deep, "underwater", { grain: 3, density: 2.4, spread: .9, rate: .85, dest: lp });
      k.noiseBed(deep, "brown", { type: "lowpass", f: 120, gain: 1, walk: [60, 220], walkMs: 3000, gainWalk: [.4, 1.3], walkT: 2.5 });
      var surge = k.L("current", "Current surges", .5);
      k.poisson(surge, function () { return 1 / 9; }, function (t) { var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = (nb(k), k.noiseBuf); n.loop = true; f.type = "lowpass";
        f.frequency.setValueAtTime(80, t); f.frequency.linearRampToValueAtTime(420, t + 3); f.frequency.linearRampToValueAtTime(80, t + 7); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.6, t + 3); g.gain.linearRampToValueAtTime(0, t + 7.5);
        var p = c.createStereoPanner(); p.pan.setValueAtTime(-.8, t); p.pan.linearRampToValueAtTime(.8, t + 7.5); n.connect(f); f.connect(g); g.connect(p); p.connect(surge.g); n.start(t, Math.random() * 3); n.stop(t + 8); });
      var br = k.L("breath", "Diver's bubbles", .45); var bv = k.Voice(br.g, [.3, .6, -.5], { ref: .6 });
      (function breathe() { if (br.dead) return; var t = c.currentTime + .1; for (var i = 0; i < 26; i++) k.S.bubble(bv.in, t + Math.pow(Math.random(), 1.4) * 1.6, { size: k.rr(.7, 2.5), gain: .16 }); br.timers.push(setTimeout(breathe, k.rr(4.5, 6) * 1000)); })();
      var wh = k.L("whales", "Whales far off", .5, { wet: 1.5 }); var wv = k.Voice(wh.g, [-100, -30, -400], { ref: 60, roll: .2 }); wv.lp.frequency.value = 1200;
      k.poisson(wh, function () { return 1 / 30; }, function (t) { wv.at(k.rr(-400, 400), -30, -k.rr(200, 600)); k.oneShot(wv.in, "whale", { t: t, gain: .7, rate: k.rr(.75, 1) }); });
      var pg = k.L("groan", "Hull and ice groans", .3, { wet: 1.4 }); var gv = k.Voice(pg.g, [40, -10, -120], { ref: 30, roll: .3 });
      k.poisson(pg, function () { return 1 / 20; }, function (t) { gv.at(k.rr(-100, 100), -10, -k.rr(60, 200)); k.oneShot(gv.in, "creak", { t: t, segs: [[0, 3.6], [4.1, 3.6], [8.2, 3.6], [12.3, 3.6]], gain: .5, rate: k.rr(.25, .4) }); });
    } });

  /* 16. LAVA: a lava field; deep earth rumble, slow viscous bubbles that burst with a thud and a spatter of crackle, cooling crust ticks, vent hiss, distant eruptions */
  TS.define("lava", { name: "Lava field", space: "open", params: { intensity: 1 },
    build: function (k) { var c = k.ctx;
      var rum = k.L("rumble", "Earth rumble", .8); k.noiseBed(rum, "brown", { type: "lowpass", f: 70, gain: 1.5, walk: [35, 120], walkMs: 1800, gainWalk: [.5, 1.3], walkT: 1.2 });
      [29, 31.3].forEach(function (f) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = .3; o.connect(g); g.connect(rum.g); o.start(); rum.nodes.push(o); });
      var flow = k.L("flow", "Molten flow", .6); var fv = k.Voice(flow.g, [-2, -1, -5], { ref: 3 }); k.grains(flow, "fire", { grain: 2, density: 3, rate: .45, dest: fv.in, spread: 0, jitter: .1 }); fv.lp.frequency.value = 1100;
      var blob = k.L("bubbles", "Lava bubbles", .8);
      k.poisson(blob, function () { return 1.1 * k.P.intensity; }, function (t) { var V = k.Voice(blob.g, [k.rr(-6, 6), -1, -k.rr(2, 9)], { ref: 2 }), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.connect(V.in);
        var up = k.rr(.3, 1.2); k.S.bubble(lp, t, { size: k.rr(8, 16), gain: .5 }); k.S.boom(V.in, t + up, { f: k.rr(50, 90), len: .35, gain: .45, bright: 900 });
        for (var i = 0; i < 12; i++) k.S.crackle(V.in, t + up + Math.random() * .5, { f: k.rr(1500, 5000), gain: .18, burst: 2 }); });
      var crust = k.L("crust", "Cooling crust", .4); k.poisson(crust, function () { return 9; }, function (t) { var V = k.Voice(crust.g, [k.rr(-5, 5), -1.2, -k.rr(1, 6)], { ref: 1 }); k.S.crackle(V.in, t, { f: k.rr(2500, 8000), gain: .1, burst: 1 }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      var vent = k.L("vent", "Gas vent", .35); var vv = k.Voice(vent.g, [5, 0, -7]); var vb = k.noiseBed(vent, "white", { f: 2500, q: .7, gain: 0, dest: vv.in });
      (function puff() { if (vent.dead) return; var t = c.currentTime, d = k.rr(2, 6); vb.g.gain.setValueAtTime(0, t); vb.g.gain.linearRampToValueAtTime(.5, t + .4); vb.g.gain.linearRampToValueAtTime(0, t + d); vent.timers.push(setTimeout(puff, (d + k.rr(3, 12)) * 1000)); })();
      var far = k.L("eruption", "Distant eruptions", .7, { wet: 1 }); var ev = k.Voice(far.g, [0, 50, -800], { ref: 200, roll: .3 });
      k.poisson(far, function () { return 1 / 25; }, function (t) { var dist = k.rr(.6, 2); ev.at(k.rr(-600, 600), 50, -dist * 1000); k.emit("flash", { dist: dist, x: k.rr(.2, .8), power: .5, kind: "eruption" }); k.S.thunder(ev.in, t + dist * 1000 / 343, dist, { gain: 1.2 }); });
    } });

  /* 17. AURORA / SPACE: the vast quiet; a pitchless solar-wind texture, slow inharmonic resonances, ionosphere crackle (natural VLF-style tweeks), sub pressure. No notes, no melody. */
  TS.define("aurora", { name: "Aurora and deep space", space: "space", params: { intensity: 1 },
    build: function (k) { var c = k.ctx;
      var wind = k.L("solar", "Solar wind", .6, { wet: 1.2 }); k.noiseBed(wind, "pink", { f: 900, q: .9, gain: .8, walk: [300, 2600], walkMs: 4000, gainWalk: [.3, 1], walkT: 4 });
      var res = k.L("glow", "Shimmer", .45, { wet: 1.6 }); [233, 377, 610, 987, 1597].forEach(function (f) { k.noiseBed(res, "pink", { f: f, q: 40, gain: .9, walk: [f * .9, f * 1.1], walkMs: 6000, gainWalk: [0, 1], walkT: 5 }); });
      var sub = k.L("sub", "Pressure", .35); k.noiseBed(sub, "brown", { type: "lowpass", f: 50, gain: 1.4, walk: [25, 80], walkMs: 5000, gainWalk: [.4, 1.2], walkT: 4 });
      var vlf = k.L("tweeks", "Radio tweeks", .3, { wet: 1.3 });
      k.poisson(vlf, function () { return .7 * k.P.intensity; }, function (t) { var o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner(), f0 = k.rr(3000, 7000), d = k.rr(.15, .6);
        o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * k.rr(.15, .3), t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .01); g.gain.exponentialRampToValueAtTime(1e-4, t + d);
        p.pan.value = k.rr(-1, 1); o.connect(g); g.connect(p); p.connect(vlf.g); o.start(t); o.stop(t + d + .05); });
      k.poisson(vlf, function () { return 6; }, function (t) { k.S.crackle(vlf.g, t, { f: k.rr(1500, 6000), gain: .05, burst: 2 }); });
      var cold = k.L("hum", "Station hum", .2, { wet: .8 }); k.grains(cold, "labHum", { grain: 3, density: 2, rate: .5, spread: 1 });
    } });
  TS.define("space", Object.assign({}, TS.presets.aurora, { name: "Deep space" }));

  /* 18. SANDSTORM: a wall of sand; roaring wind front that builds and passes, sand blasting the near field, rattling debris, low drone of the storm body */
  TS.define("sandstorm", { name: "Sandstorm", space: "open", params: { wind: 1.2, intensity: 1 },
    build: function (k) { var c = k.ctx;
      var roar = k.L("roar", "Storm roar", .9); k.grains(roar, "windHowl", { grain: 3, density: 3, spread: 1, rate: .8, jitter: .08 });
      k.noiseBed(roar, "pink", { f: 400, q: 1, gain: 1, walk: [180, 1200], walkMs: 700, gainWalk: [.5, 1.4], walkT: .5 });
      var front = 0; (function wave() { if (roar.dead) return; front = 1; roar.timers.push(setTimeout(function () { front = 0; }, k.rr(5, 10) * 1000)); roar.timers.push(setTimeout(wave, k.rr(14, 30) * 1000)); })();
      drive(roar, "wind", function () { return .4 + k.P.wind * .5 + front * .4; }, 400);
      var blast = k.L("blast", "Sand blast", .55); k.noiseBed(blast, "white", { type: "highpass", f: 3500, gain: .4, walk: [2500, 7000], walkMs: 300, gainWalk: [.4, 1.3], walkT: .2 });
      k.poisson(blast, function () { return 120 * (k.P.wind * .6 + front * .6) * k.P.intensity; }, function (t) { k.S.crackle(blast.g, t, { f: k.rr(4000, 11000), gain: .06, burst: 1 }); });
      var deb = k.L("debris", "Rattling debris", .4, { wet: .6 }); k.poisson(deb, function () { return .25 + front * .6; }, function (t) { var V = k.Voice(deb.g, [k.rr(-12, 12), 0, -k.rr(3, 15)]);
        k.oneShot(V.in, "clank", { t: t, segs: [[0, 2.6], [3.1, 2.6], [6.2, 2.6], [9.3, 2.6]], gain: .3, rate: k.rr(1.1, 1.6) }); });
      var body = k.L("body", "Storm body", .5); k.noiseBed(body, "brown", { type: "lowpass", f: 90, gain: 1.3, walk: [45, 150], walkMs: 1600, gainWalk: [.5, 1.3] });
    } });

  /* ===== batch 4 ===== */
  /* modal "struck glass/crystal": inharmonic partials (plate/bar ratios), each with its own decay, so it rings like an object, never a note sequence */
  function ring(k, dest, t, o) { var c = k.ctx, f = o.f, R = o.ratios || [1, 2.32, 4.25, 6.63, 9.38], g0 = o.gain || .2;
    R.forEach(function (r, i) { var os = c.createOscillator(), g = c.createGain(), fr = Math.min(18000, f * r * k.rr(.995, 1.005)), d = (o.decay || 2) / (1 + i * .8);
      os.frequency.value = fr; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(g0 / (1 + i * .6), t + .002); g.gain.exponentialRampToValueAtTime(1e-4, t + d); os.connect(g); g.connect(dest); os.start(t); os.stop(t + d + .05); }); }
  function shatter(k, L, x, big) { var c = k.ctx, t = c.currentTime + .01, V = k.Voice(L.g, [(x - .5) * 6, .5, -2], { ref: 1.5 });
    k.S.crackle(V.in, t, { f: 6000, gain: .9 * big, burst: 10 }); k.S.boom(V.in, t, { f: 120, len: .12, gain: .2 * big, bright: 8000 });
    for (var i = 0; i < 40 * big; i++) { var tt = t + .02 + Math.pow(Math.random(), 1.8) * 1.4, sv = k.Voice(L.g, [(x - .5) * 6 + k.rr(-2, 2), -1.5, -2 + k.rr(-1.5, 1)], { ref: 1 });
      ring(k, sv.in, tt, { f: k.rr(2500, 7000), decay: k.rr(.08, .4), gain: .06 }); k.S.crackle(sv.in, tt, { f: k.rr(5000, 11000), gain: .12, burst: 1 }); } }

  /* 19. GLASS: a quiet glass gallery; panes creak under stress, tiny settling ticks, occasional distant shatter; touch to shatter glass where you tap */
  TS.define("glass", { name: "Shattering glass", space: "hall", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var room = k.L("room", "Gallery air", .35, { wet: .8 }); k.grains(room, "roomTone", { grain: 3, density: 2, spread: 1, rate: .9 });
      k.noiseBed(room, "pink", { f: 3000, q: 5, gain: .15, walk: [2000, 5000], walkMs: 3000, gainWalk: [.2, 1] });
      var stress = k.L("stress", "Panes under stress", .4, { wet: .7 }); k.poisson(stress, function () { return .4; }, function (t) { var V = k.Voice(stress.g, [k.rr(-6, 6), k.rr(0, 3), -k.rr(2, 8)]);
        ring(k, V.in, t, { f: k.rr(900, 2200), decay: k.rr(1.5, 3.5), gain: .05, ratios: [1, 2.76, 5.4, 8.93] }); for (var i = 0; i < 4; i++) k.S.crackle(V.in, t + i * k.rr(.02, .08), { f: 9000, gain: .05, burst: 1 }); });
      var ticks = k.L("ticks", "Settling ticks", .3); k.poisson(ticks, function () { return 3; }, function (t) { var V = k.Voice(ticks.g, [k.rr(-5, 5), -1, -k.rr(1, 5)], { ref: 1 }); ring(k, V.in, t, { f: k.rr(4000, 9000), decay: .08, gain: .04 }); setTimeout(function () { V.pan.disconnect(); }, 400); });
      var far = k.L("far", "Distant shatters", .5, { wet: 1.4 }); this._sh = k.L("touch", "Shatter (tap)", .9);
      k.poisson(far, function () { return 1 / 25 * k.P.intensity; }, function () { shatter(k, far, Math.random(), .5); });
    },
    on: function (d) { if ((d.type === "touch" || d.type === "shatter") && this._sh && !this._sh.dead) shatter(this._k, this._sh, d.x == null ? .5 : d.x, d.power || 1); } });

  /* 20. PLASMA: a containment chamber; mains hum and corona hiss, crawling arcs that buzz and snap, ozone fizz; touch to strike an arc */
  function arc(k, L, x, big) { var c = k.ctx, t = c.currentTime + .01, V = k.Voice(L.g, [(x - .5) * 6, 1, -2.5], { ref: 1.5 }), d = k.rr(.15, .7) * big;
    var n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), am = c.createOscillator(), ag = c.createGain(); n.buffer = (nb(k), k.noiseBuf); bp.type = "bandpass"; bp.frequency.value = k.rr(1500, 4000); bp.Q.value = 1.5;
    am.type = "square"; am.frequency.value = k.rr(90, 240); ag.gain.value = .5; am.connect(ag); ag.connect(g.gain); g.gain.setValueAtTime(.5 * big, t); g.gain.exponentialRampToValueAtTime(1e-3, t + d);
    n.connect(bp); bp.connect(g); g.connect(V.in); n.start(t, Math.random() * 3); n.stop(t + d + .05); am.start(t); am.stop(t + d + .05);
    k.S.crackle(V.in, t, { f: 5000, gain: .8 * big, burst: 6 }); k.S.boom(V.in, t, { f: 90, len: .1, gain: .25 * big, bright: 6000 }); k.emit("arc", { x: x, power: big }); }
  TS.define("plasma", { name: "Plasma chamber", space: "hall", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var hum = k.L("hum", "Mains hum", .3); [60, 120, 180, 300].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.type = i ? "sine" : "sawtooth"; o.frequency.value = f; g.gain.value = [.15, .25, .1, .05][i]; o.connect(g); g.connect(hum.g); o.start(); hum.nodes.push(o); });
      var cor = k.L("corona", "Corona hiss", .4); k.noiseBed(cor, "white", { type: "highpass", f: 6000, gain: .3, walk: [5000, 10000], walkMs: 400, gainWalk: [.4, 1.2], walkT: .2 });
      k.poisson(cor, function () { return 40; }, function (t) { k.S.crackle(cor.g, t, { f: k.rr(6000, 12000), gain: .04, burst: 1 }); });
      var lab = k.L("lab", "Machinery", .3, { wet: .8 }); k.grains(lab, "labHum", { grain: 3, density: 2, spread: 1 });
      var arcs = k.L("arcs", "Arcs", .8, { wet: .6 }); this._a = arcs; k.poisson(arcs, function () { return .5 * k.P.intensity; }, function () { arc(k, arcs, Math.random(), k.rr(.4, 1)); });
    },
    on: function (d) { if ((d.type === "touch" || d.type === "arc") && this._a && !this._a.dead) arc(this._k, this._a, d.x == null ? .5 : d.x, 1); } });

  /* 21. CRYSTAL: a crystal cave growing; slow mineral ticks as lattices extend, cave drips, deep air, rare ringing of a large crystal struck by a drip */
  TS.define("crystal", { name: "Crystal cave", space: "cave", params: { intensity: 1 },
    build: function (k) { var c = k.ctx;
      var air = k.L("air", "Cave air", .45, { wet: .8 }); k.noiseBed(air, "brown", { type: "lowpass", f: 200, gain: .9, walk: [100, 350], walkMs: 3000, gainWalk: [.5, 1.1] }); k.grains(air, "drips", { grain: 2.4, density: 2, spread: 1, rate: .9 });
      var grow = k.L("growth", "Crystal growth", .5); k.poisson(grow, function () { return 14 * k.P.intensity; }, function (t) { var V = k.Voice(grow.g, [k.rr(-4, 4), k.rr(-1, 2), -k.rr(1, 5)], { ref: 1 });
        ring(k, V.in, t, { f: k.rr(5000, 11000), decay: k.rr(.03, .1), gain: .03, ratios: [1, 1.5, 2.9] }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      var drip = k.L("drips", "Drips", .55, { wet: 1.1 }); k.poisson(drip, function () { return 1.2; }, function (t) { var V = k.Voice(drip.g, [k.rr(-8, 8), 0, -k.rr(2, 12)]); k.S.drop(V.in, t, { f: k.rr(700, 1800), len: k.rr(.08, .2), gain: .3 });
        if (Math.random() < .15) ring(k, V.in, t + .01, { f: k.rr(700, 1600), decay: k.rr(3, 6), gain: .04, ratios: [1, 2.76, 5.4, 8.93, 13.3] }); });
      var deep = k.L("deep", "Deep earth", .3); k.noiseBed(deep, "brown", { type: "lowpass", f: 60, gain: 1.2, walk: [30, 90], walkMs: 4000 });
    } });

  /* 22. IRIDESCENT BUBBLES: a sunlit garden; soft breath blowing bubbles, bubbles drifting by close to your ears and popping, light breeze, birds far off; touch to pop */
  function pop(k, L, x, y) { var c = k.ctx, t = c.currentTime + .01, V = k.Voice(L.g, [(x - .5) * 5, (.5 - y) * 3, -1.2], { ref: .8 });
    var n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); n.buffer = (nb(k), k.noiseBuf); hp.type = "bandpass"; hp.frequency.value = k.rr(2500, 6000); hp.Q.value = 2;
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(1e-4, t + .03); n.connect(hp); hp.connect(g); g.connect(V.in); n.start(t, Math.random() * 3); n.stop(t + .05);
    for (var i = 0; i < 6; i++) k.S.drop(V.in, t + .01 + Math.random() * .15, { f: k.rr(3000, 7000), len: .02, gain: .04 }); }
  TS.define("bubbles", { name: "Iridescent bubbles", space: "forest", params: { wind: .2, tod: 13 },
    build: function (k) { var c = k.ctx; this._k = k;
      var air = k.L("breeze", "Breeze", .35); k.grains(air, "windTrees", { grain: 3, density: 2, spread: 1, rate: 1.05 }); drive(air, "wind", function () { return .3 + k.P.wind * 2; }, 400);
      var birds = k.L("birds", "Garden birds", .3, { wet: .7 }); k.grains(birds, "birds", { grain: 2.6, density: 1.8, spread: 1 });
      var blow = k.L("blow", "Blowing bubbles", .35); var bv = k.Voice(blow.g, [0, 0, -.6], { ref: .5 });
      k.poisson(blow, function () { return 1 / 8; }, function (t) { var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = (nb(k), k.noiseBuf); f.type = "bandpass"; f.frequency.value = 900; f.Q.value = .8;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .4); g.gain.linearRampToValueAtTime(0, t + 1.6); n.connect(f); f.connect(g); g.connect(bv.in); n.start(t, Math.random() * 3); n.stop(t + 1.7); });
      var drift = k.L("drift", "Bubbles drifting by", .45); this._p = drift;
      k.poisson(drift, function () { return .6; }, function () { var dir = Math.random() < .5 ? 1 : -1, z = -k.rr(.6, 2.5), y = k.rr(-.5, 1.5);
        var V = k.mover(drift, k.rr(3, 6), function (u) { return [dir * (u - .5) * 4, y + u * .5, z]; }, function (dest) { var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = k.noiseBuf; n.loop = true;
          f.type = "bandpass"; f.frequency.value = k.rr(6000, 9000); f.Q.value = 6; g.gain.value = .03; n.connect(f); f.connect(g); g.connect(dest); n.start();
          return { rate: function (r) { n.playbackRate.value = r; }, stop: function () { try { n.stop(); } catch (e) {} } }; }, { ref: .5 });
        if (Math.random() < .5) setTimeout(function () { if (!drift.dead) pop(k, drift, .5 + V.pos[0] / 5, .5 - V.pos[1] / 3); }, k.rr(1.5, 3) * 1000); });
    },
    on: function (d) { if ((d.type === "touch" || d.type === "pop") && this._p && !this._p.dead) pop(this._k, this._p, d.x == null ? .5 : d.x, d.y == null ? .5 : d.y); } });

  /* 23. BLACK HOLE: the edge of an event horizon; crushing sub pressure, the accretion disk's roar orbiting around your head, matter streaking in faster and deeper (Doppler), gravitational-wave chirps from merging stars far away */
  TS.define("blackhole", { name: "Black hole", space: "space", params: { intensity: 1 },
    build: function (k) { var c = k.ctx;
      var sub = k.L("sub", "Gravity well", .7); k.noiseBed(sub, "brown", { type: "lowpass", f: 45, gain: 1.6, walk: [22, 70], walkMs: 5000, gainWalk: [.6, 1.3], walkT: 4 });
      var o1 = c.createOscillator(), og = c.createGain(); o1.frequency.value = 24; og.gain.value = .35; o1.connect(og); og.connect(sub.g); o1.start(); sub.nodes.push(o1);
      var disk = k.L("disk", "Accretion disk (orbits you)", .55, { wet: 1 }); var dv = k.Voice(disk.g, [6, 0, 0], { ref: 3 });
      var db = k.noiseBed(disk, "pink", { f: 700, q: 1.2, gain: 1, walk: [300, 1600], walkMs: 1500, gainWalk: [.5, 1.2], dest: dv.in });
      var ang = 0; (function orbit() { if (disk.dead) return; ang += .05 * 2 * Math.PI * .08; dv.at(Math.cos(ang) * 6, Math.sin(ang * .5) * 1.5, Math.sin(ang) * 6); disk.timers.push(setTimeout(orbit, 50)); })();
      var fall = k.L("infall", "Matter falling in", .6, { wet: .8 });
      k.poisson(fall, function () { return .25 * k.P.intensity; }, function () { var a0 = Math.random() * 6.28, r0 = k.rr(40, 80);
        k.mover(fall, k.rr(3, 6), function (u) { var r = r0 * Math.pow(1 - u, 2) + .5, a = a0 + u * u * 12; return [Math.cos(a) * r, k.rr(-.2, .2), Math.sin(a) * r]; }, function (dest) {
          var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = (nb(k), k.noiseBuf); n.loop = true; f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 3; g.gain.value = .5;
          n.connect(f); f.connect(g); g.connect(dest); n.start(); return { rate: function (r) { n.playbackRate.setTargetAtTime(r, c.currentTime, .05); f.frequency.setTargetAtTime(1200 * r * r, c.currentTime, .05); }, stop: function () { try { n.stop(); } catch (e) {} } }; }, { ref: 4 }); });
      var gw = k.L("chirps", "Gravitational-wave chirps", .4, { wet: 1.5 });
      k.poisson(gw, function () { return 1 / 30; }, function (t) { var o = c.createOscillator(), g = c.createGain(), d = k.rr(1.5, 3); o.frequency.setValueAtTime(30, t); o.frequency.exponentialRampToValueAtTime(k.rr(250, 400), t + d);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + d * .97); g.gain.linearRampToValueAtTime(0, t + d + .05); o.connect(g); g.connect(gw.g); o.start(t); o.stop(t + d + .1); k.emit("ripple", { at: t + d }); });
      var hiss = k.L("radiation", "Hawking hiss", .2); k.noiseBed(hiss, "white", { type: "highpass", f: 8000, gain: .15, walk: [6000, 12000], walkMs: 2000 });
    } });

  /* ===== batch 5: dedicated scapes for the fx scenes (ids = fx/demo.html scene ids) ===== */
  function twinkle(k, dest, t, g) { ring(k, dest, t, { f: k.rr(3500, 9000), decay: k.rr(.15, .6), gain: g || .03, ratios: [1, 2.76, 5.4] }); }
  function swell(k, L, dest, t, o) { var c = k.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), d = o.d || 4; n.buffer = (nb(k), k.noiseBuf); n.loop = true;
    f.type = "bandpass"; f.Q.value = o.q || 2; f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(o.f1, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.gain || .4, t + d * (o.peak || .7)); g.gain.linearRampToValueAtTime(0, t + d);
    n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random() * 3); n.stop(t + d + .1); }
  function orbiter(k, L, r, speed, y) { var V = k.Voice(L.g, [r, y || 0, 0], { ref: 2 }), a = Math.random() * 6.28; (function o() { if (L.dead) return; a += speed * .05; V.at(Math.cos(a) * r, (y || 0) + Math.sin(a * .7) * .8, Math.sin(a) * r); L.timers.push(setTimeout(o, 50)); })(); return V; }

  TS.define("portal", { name: "Magic portal", space: "cave", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var vort = k.L("vortex", "Swirling vortex", .7, { wet: .8 }); var v1 = orbiter(k, vort, 3, 2.2), v2 = orbiter(k, vort, 4.5, -1.4, .5);
      k.noiseBed(vort, "pink", { f: 500, q: 3, gain: .9, walk: [250, 1400], walkMs: 500, gainWalk: [.5, 1.2], walkT: .3, dest: v1.in });
      k.noiseBed(vort, "pink", { f: 1800, q: 4, gain: .5, walk: [900, 3500], walkMs: 700, dest: v2.in });
      var throb = k.L("throb", "Throb", .5); var tg = c.createGain(); tg.gain.value = .5; tg.connect(throb.g); k.noiseBed(throb, "brown", { type: "lowpass", f: 70, gain: 1.4, dest: tg });
      var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .55; lg.gain.value = .45; lfo.connect(lg); lg.connect(tg.gain); lfo.start(); throb.nodes.push(lfo);
      var sp = k.L("sparks", "Sparkles", .45); k.poisson(sp, function () { return 7 * k.P.intensity; }, function (t) { var V = k.Voice(sp.g, [k.rr(-3, 3), k.rr(-1, 2), -k.rr(1, 4)], { ref: 1 }); twinkle(k, V.in, t, .025); k.S.crackle(V.in, t, { f: 9000, gain: .05, burst: 2 }); setTimeout(function () { V.pan.disconnect(); }, 800); });
      var pull = k.L("pull", "Inrush", .5, { wet: 1 }); this._p = pull; k.poisson(pull, function () { return 1 / 7; }, function (t) { swell(k, pull, pull.g, t, { f0: 200, f1: 3000, d: k.rr(2.5, 4.5), gain: .5, peak: .9 }); });
    },
    on: function (d) { var k = this._k, L = this._p; if (!L || L.dead) return; var t = k.ctx.currentTime + .01, V = k.Voice(L.g, [((d.x == null ? .5 : d.x) - .5) * 6, 0, -2]);
      swell(k, L, V.in, t, { f0: 300, f1: 6000, d: .6, gain: .7, peak: .8 }); for (var i = 0; i < 10; i++) k.S.crackle(V.in, t + .4 + Math.random() * .4, { f: 6000, gain: .3, burst: 3 }); k.S.boom(V.in, t + .55, { f: 55, len: .9, gain: .5, bright: 1500 }); } });

  TS.define("sun", { name: "The surface of the Sun", space: "space", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var roar = k.L("roar", "Plasma roar", .8); k.noiseBed(roar, "brown", { type: "lowpass", f: 140, gain: 1.6, walk: [70, 260], walkMs: 900, gainWalk: [.6, 1.3], walkT: .7 });
      k.noiseBed(roar, "pink", { f: 450, q: .8, gain: .5, walk: [200, 900], walkMs: 1100, gainWalk: [.4, 1] });
      var boil = k.L("boil", "Boiling surface", .6); k.poisson(boil, function () { return 3; }, function (t) { var V = k.Voice(boil.g, [k.rr(-10, 10), -2, -k.rr(4, 14)], { ref: 4 }), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500; lp.connect(V.in); k.S.bubble(lp, t, { size: k.rr(12, 24), gain: .6 }); });
      var mag = k.L("field", "Magnetic field", .3, { wet: 1.4 }); [151, 263, 419, 677].forEach(function (f) { k.noiseBed(mag, "pink", { f: f, q: 35, gain: .9, walk: [f * .92, f * 1.08], walkMs: 5000, gainWalk: [0, 1], walkT: 4 }); });
      var fl = k.L("flares", "Flares", .7, { wet: .9 }); this._f = fl; k.poisson(fl, function () { return 1 / 12 * k.P.intensity; }, function () { flare(k, fl, Math.random(), .8); });
    },
    on: function (d) { if (this._f && !this._f.dead) flare(this._k, this._f, d.x == null ? .5 : d.x, 1); } });
  function flare(k, L, x, p) { var t = k.ctx.currentTime + .01, V = k.Voice(L.g, [(x - .5) * 30, 10, -30], { ref: 10, roll: .4 });
    swell(k, L, V.in, t, { f0: 150, f1: 2500, d: 2.5, gain: .6 * p, peak: .35 }); k.S.thunder(V.in, t + .4, 1.5, { gain: .7 * p }); for (var i = 0; i < 30; i++) k.S.crackle(V.in, t + .3 + Math.random() * 2, { f: k.rr(2000, 6000), gain: .1 * p, burst: 2 }); k.emit("flare", { x: x, power: p }); }

  TS.define("glowforest", { name: "Glowing forest at night", space: "forest", params: { tod: 23, wind: .2 },
    build: function (k) { this._k = k;
      var bugs = k.L("insects", "Night insects", .45); nightBugs(k, bugs, 8);
      var frogs = k.L("frogs", "Tree frogs", .35, { wet: .7 }); k.grains(frogs, "frogs", { grain: 2.4, density: 2, spread: 1, rate: 1.15 });
      var leaves = k.L("leaves", "Leaves", .3); k.grains(leaves, "windTrees", { grain: 3, density: 2, spread: 1 }); drive(leaves, "wind", function () { return .3 + k.P.wind * 2; }, 400);
      var drip = k.L("drips", "Dew drips", .4); k.poisson(drip, function () { return 2.5; }, function (t) { var V = k.Voice(drip.g, [k.rr(-6, 6), k.rr(0, 3), -k.rr(1, 7)], { ref: 1 }); k.S.drop(V.in, t, { f: k.rr(900, 2400), len: .1, gain: .2 }); setTimeout(function () { V.pan.disconnect(); }, 600); });
      var glow = k.L("glow", "Glow shimmer", .4, { wet: 1.3 }); this._g = glow; k.poisson(glow, function () { return 1.5; }, function (t) { var V = k.Voice(glow.g, [k.rr(-8, 8), k.rr(0, 4), -k.rr(2, 10)]); twinkle(k, V.in, t, .02); });
      var owl = k.L("owl", "Owl", .35, { wet: 1 }); var ov = k.Voice(owl.g, [-20, 8, -30], { ref: 8 }); k.poisson(owl, function () { return 1 / 40; }, function (t) { ov.at(k.rr(-30, 30), 8, -k.rr(15, 40)); k.oneShot(ov.in, "owl", { t: t, segs: SEG.owl, gain: .45 }); });
    },
    on: function (d) { var k = this._k, L = this._g; if (!L || L.dead || d.type !== "touch") return; var t = k.ctx.currentTime + .01, V = k.Voice(L.g, [((d.x || .5) - .5) * 6, 0, -2]); for (var i = 0; i < 14; i++) twinkle(k, V.in, t + i * k.rr(.02, .08), .05); } });

  TS.define("jellyfish", { name: "Jellyfish in the deep", space: "water", params: {},
    build: function (k) { var c = k.ctx; this._k = k;
      var deep = k.L("deep", "Deep water", .6); var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; lp.connect(deep.g); k.grains(deep, "underwater", { grain: 3, density: 2.2, spread: 1, rate: .8, dest: lp });
      var pulse = k.L("pulse", "Jelly pulses", .55); this._j = pulse; k.poisson(pulse, function () { return 1 / 3.2; }, function (t) { jelly(k, pulse, k.rr(.1, .9), .6); });
      var bub = k.L("bubbles", "Rising bubbles", .3); k.poisson(bub, function () { return .7; }, function (t) { var V = k.Voice(bub.g, [k.rr(-4, 4), -1, -k.rr(2, 6)]); k.S.bubble(V.in, t, { size: k.rr(.6, 2), gain: .1 }); });
      var glow = k.L("bio", "Bioluminescence", .3, { wet: 1.4 }); k.poisson(glow, function () { return .8; }, function (t) { twinkle(k, glow.g, t, .015); });
      var wh = k.L("whale", "Far whale", .35, { wet: 1.5 }); var wv = k.Voice(wh.g, [-150, -30, -400], { ref: 60, roll: .2 }); wv.lp.frequency.value = 1000; k.poisson(wh, function () { return 1 / 50; }, function (t) { k.oneShot(wv.in, "whale", { t: t, gain: .6, rate: k.rr(.7, .9) }); });
    },
    on: function (d) { if (this._j && !this._j.dead) jelly(this._k, this._j, d.x == null ? .5 : d.x, 1); } });
  function jelly(k, L, x, p) { var c = k.ctx, t = c.currentTime + .01, V = k.Voice(L.g, [(x - .5) * 6, 0, -2.5], { ref: 1.5 }), n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = (nb(k), k.noiseBuf);
    f.type = "lowpass"; f.frequency.setValueAtTime(120, t); f.frequency.linearRampToValueAtTime(600, t + .35); f.frequency.linearRampToValueAtTime(100, t + 1.4); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.8 * p, t + .3); g.gain.exponentialRampToValueAtTime(1e-3, t + 1.6);
    n.connect(f); f.connect(g); g.connect(V.in); n.start(t, Math.random() * 3); n.stop(t + 1.7); }

  TS.define("sakura", { name: "Cherry blossoms in spring", space: "forest", params: { wind: .35, tod: 10 },
    build: function (k) { this._k = k;
      var breeze = k.L("breeze", "Spring breeze", .5); k.grains(breeze, "windTrees", { grain: 3, density: 2.2, spread: 1, rate: 1.05 }); drive(breeze, "wind", function () { return .3 + k.P.wind * 1.6; }, 400);
      var petals = k.L("petals", "Falling petals", .35); k.poisson(petals, function () { return 12 * (.4 + k.P.wind); }, function (t) { var V = k.Voice(petals.g, [k.rr(-4, 4), k.rr(-1, 3), -k.rr(.8, 4)], { ref: .8 }); k.S.crackle(V.in, t, { f: k.rr(5000, 9000), gain: .025, burst: 2 }); setTimeout(function () { V.pan.disconnect(); }, 400); });
      var birds = k.L("birds", "Songbirds", .45, { wet: .7 }); k.grains(birds, "birds", { grain: 2.6, density: 2, spread: 1 });
      var stream = k.L("stream", "Garden stream", .3); var sv = k.Voice(stream.g, [6, -1, -8], { ref: 3 }); k.grains(stream, "river", { grain: 2, density: 2.6, dest: sv.in, spread: 0, rate: 1.1 });
      var bell = k.L("temple", "Far temple bell", .25, { wet: 1.5 }); var bv = k.Voice(bell.g, [-60, 10, -120], { ref: 30, roll: .3 }); k.poisson(bell, function () { return 1 / 45; }, function (t) { k.oneShot(bv.in, "bowl", { t: t, rate: k.rr(.62, .66), gain: .5 }); });
    } });

  TS.define("cathedral", { name: "Light through a rose window", space: "cathedral", params: { tod: 15 },
    build: function (k) { var c = k.ctx;
      var air = k.L("air", "Nave air", .5, { wet: 1.2 }); [262, 393, 587, 881].forEach(function (f) { k.noiseBed(air, "pink", { f: f, q: 14, gain: .7, walk: [f * .97, f * 1.03], walkMs: 3500, gainWalk: [.2, 1], walkT: 3 }); });
      var room = k.L("room", "Stone room", .4, { wet: .6 }); k.grains(room, "hall", { grain: 3, density: 2, spread: 1 });
      var out = k.L("outside", "Birds outside the glass", .35); var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; lp.connect(out.g); k.grains(out, "birds", { grain: 2.6, density: 1.8, spread: 1, dest: lp });
      var wind = k.L("glass", "Wind on the glass", .3); k.noiseBed(wind, "white", { f: 1600, q: 18, gain: .12, walk: [1100, 2400], walkMs: 2500, gainWalk: [0, 1] });
      var bell = k.L("bell", "Tower bell", .35, { wet: 1.6 }); var bv = k.Voice(bell.g, [0, 30, -60], { ref: 20, roll: .3 }); k.poisson(bell, function () { return 1 / 50; }, function (t) { k.oneShot(bv.in, "bowl", { t: t, rate: k.rr(.5, .53), gain: .55 }); });
    } });

  TS.define("wormhole", { name: "Through a wormhole", space: "space", params: { intensity: 1 },
    build: function (k) { var c = k.ctx;
      var rush = k.L("rush", "Tunnel rush", .7); k.noiseBed(rush, "pink", { f: 900, q: 1.2, gain: 1, walk: [400, 2400], walkMs: 600, gainWalk: [.6, 1.2], walkT: .3 });
      var sub = k.L("sub", "Spacetime pressure", .5); k.noiseBed(sub, "brown", { type: "lowpass", f: 55, gain: 1.5, walk: [28, 90], walkMs: 2000 });
      var streak = k.L("streaks", "Streaks flying past", .6); k.poisson(streak, function () { return 1.4 * k.P.intensity; }, function () { var a = Math.random() * 6.28, r = k.rr(1.5, 4);
        k.mover(streak, k.rr(.8, 1.6), function (u) { return [Math.cos(a) * r, Math.sin(a) * r, -40 + u * 80]; }, function (dest) { var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = (nb(k), k.noiseBuf); n.loop = true;
          f.type = "bandpass"; f.frequency.value = k.rr(1500, 4000); f.Q.value = 4; g.gain.value = .5; n.connect(f); f.connect(g); g.connect(dest); n.start();
          return { rate: function (rt) { n.playbackRate.setTargetAtTime(rt, c.currentTime, .03); }, stop: function () { try { n.stop(); } catch (e) {} } }; }, { ref: 2 }); });
      var spiral = k.L("spiral", "Spiral drop", .35, { wet: 1.2 }); k.poisson(spiral, function () { return 1 / 9; }, function (t) { swell(k, spiral, spiral.g, t, { f0: 3000, f1: 120, d: k.rr(3, 6), gain: .5, q: 6, peak: .3 }); k.emit("ripple", {}); });
    } });

  TS.define("ringworld", { name: "Orbiting a ringed planet", space: "space", params: {},
    build: function (k) {
      var hush = k.L("hush", "Space hush", .4, { wet: 1.4 }); k.noiseBed(hush, "pink", { f: 700, q: .7, gain: .5, walk: [300, 1500], walkMs: 6000, gainWalk: [.3, 1], walkT: 5 });
      var hum = k.L("planet", "Planet hum", .5); k.noiseBed(hum, "brown", { type: "lowpass", f: 60, gain: 1.4, walk: [35, 85], walkMs: 5000 });
      var ice = k.L("rings", "Ring ice", .45); var rv = orbiter(k, ice, 7, .25); k.poisson(ice, function () { return 9; }, function (t) { k.S.crackle(rv.in, t, { f: k.rr(4000, 10000), gain: .05, burst: 1 }); if (Math.random() < .1) twinkle(k, rv.in, t, .02); });
      var radio = k.L("radio", "Radio whistlers", .25, { wet: 1.3 }); k.poisson(radio, function () { return .3; }, function (t) { var c = k.ctx, o = c.createOscillator(), g = c.createGain(), f0 = k.rr(2500, 6000), d = k.rr(.8, 2);
        o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .2, t + d); g.gain.setValueAtTime(.03, t); g.gain.exponentialRampToValueAtTime(1e-4, t + d); o.connect(g); g.connect(radio.g); o.start(t); o.stop(t + d + .05); });
    } });

  TS.define("galaxy", { name: "A spiral galaxy", space: "space", params: {},
    build: function (k) { var c = k.ctx;
      var glow = k.L("glow", "Galactic glow", .45, { wet: 1.6 }); [89, 144, 233, 377, 610].forEach(function (f) { k.noiseBed(glow, "pink", { f: f, q: 30, gain: .9, walk: [f * .9, f * 1.1], walkMs: 7000, gainWalk: [.1, 1], walkT: 6 }); });
      var arm = k.L("arms", "Turning arms", .45); var av = orbiter(k, arm, 8, .12); k.noiseBed(arm, "pink", { f: 1200, q: 1, gain: .6, walk: [600, 2400], walkMs: 3000, dest: av.in });
      var stars = k.L("stars", "Star twinkle", .3); k.poisson(stars, function () { return 3; }, function (t) { var V = k.Voice(stars.g, [k.rr(-20, 20), k.rr(-5, 10), -k.rr(5, 30)]); twinkle(k, V.in, t, .015); });
      var pul = k.L("pulsar", "A far pulsar", .3, { wet: 1.2 }); var pv = k.Voice(pul.g, [-30, 5, -60], { ref: 15, roll: .3 }); var per = k.rr(.7, 1.4), nt = c.currentTime + 1;
      (function tick() { if (pul.dead) return; while (nt < c.currentTime + .3) { k.S.crackle(pv.in, nt, { f: 1500, gain: .25, burst: 1 }); nt += per; } pul.timers.push(setTimeout(tick, 100)); })();
      var sub = k.L("sub", "Deep", .35); k.noiseBed(sub, "brown", { type: "lowpass", f: 45, gain: 1.3, walk: [25, 70], walkMs: 6000 });
    } });

  TS.define("nebula", { name: "Diving through a nebula", space: "space", params: { intensity: 1 },
    build: function (k) {
      var gas = k.L("gas", "Cosmic gas", .65, { wet: 1.2 }); k.noiseBed(gas, "pink", { f: 600, q: 1.5, gain: .9, walk: [200, 2200], walkMs: 1600, gainWalk: [.4, 1.2], walkT: 1.2 });
      k.noiseBed(gas, "white", { f: 3500, q: 2, gain: .15, walk: [2000, 6000], walkMs: 2200, gainWalk: [.2, 1] });
      var dust = k.L("dust", "Dust grains", .4); k.poisson(dust, function () { return 20 * k.P.intensity; }, function (t) { var V = k.Voice(dust.g, [k.rr(-3, 3), k.rr(-2, 2), -k.rr(.5, 4)], { ref: .8 }); k.S.crackle(V.in, t, { f: k.rr(3000, 9000), gain: .03, burst: 1 }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      var pad = k.L("cloud", "Cloud resonance", .4, { wet: 1.6 }); [197, 311, 503].forEach(function (f) { k.noiseBed(pad, "pink", { f: f, q: 20, gain: .9, walk: [f * .85, f * 1.15], walkMs: 5000, gainWalk: [.1, 1], walkT: 4 }); });
      var birth = k.L("birth", "Star birth", .5, { wet: 1.4 }); k.poisson(birth, function () { return 1 / 14; }, function (t) { swell(k, birth, birth.g, t, { f0: 80, f1: 1800, d: k.rr(5, 9), gain: .5, peak: .8 }); k.emit("flash", { dist: 3, x: k.rr(.2, .8), power: .3, kind: "starbirth" }); });
      var sub = k.L("sub", "Depth", .35); k.noiseBed(sub, "brown", { type: "lowpass", f: 50, gain: 1.3, walk: [28, 80], walkMs: 4000 });
    } });
  /* 35. INSIDE A WATCH MOVEMENT (Claude, theme #41 Tourbillon, 2026-10-21): a watchmaker's bench at night. Only recorded sound:
     room air from the room-tone recording; the escapement ticks 6 times a second (21,600 vph) using a real tick and tock cut from
     the clock recording and sped up to a wristwatch's size. The beats sit on the wall clock (Date), exactly where fx/tourbillon.js
     puts its beats, so the picture and the tick agree without messages (getOutputTimestamp maps wall time to audio time).
     titan:fx {type:"wind", at:[s...]} = ratchet clicks when you wind the crown; {type:"repeater", seq:[[s, gong]...]} = the minute
     repeater's two gongs, cut from a single isolated strike in the chimes recording and pitched a fourth apart. */
  var TICKS = [[.664, .13], [1.67, .13], [2.664, .13], [3.67, .13]];   // onsets measured in audio/ambience/clock (tick, tock, tick, tock)
  var GONG = [13.735, .6];                                            // an isolated strike in audio/ambience/chimes (about 4.2 kHz)
  function audioAt(c, wallMs) { var pm = wallMs - (Date.now() - performance.now());
    try { if (c.getOutputTimestamp) { var ts = c.getOutputTimestamp(); if (ts.performanceTime > 0) return ts.contextTime + (pm - ts.performanceTime) / 1000; } } catch (e) {}
    return c.currentTime + (pm - performance.now()) / 1000 - (c.outputLatency || c.baseLatency || 0); }
  function cut(k, dest, name, t, seg, rate, gain, rel) { var c = k.ctx, g = c.createGain(); g.connect(dest); var end = t + seg[1] / rate;
    g.gain.setValueAtTime(gain, t); g.gain.setValueAtTime(gain, Math.max(t, end - rel)); g.gain.linearRampToValueAtTime(0, end);
    k.oneShot(g, name, { t: t, segs: [seg], rate: rate }); setTimeout(function () { try { g.disconnect(); } catch (e) {} }, (end - c.currentTime) * 1000 + 400); }
  TS.define("movement", { name: "Inside a watch movement", space: "hall", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var room = k.L("room", "Bench room", .42, { wet: .3 }); k.grains(room, "roomTone", { grain: 3, density: 1.6, spread: .4 });
      var esc = k.L("escapement", "Escapement", .5, { wet: .12 }); var V = k.Voice(esc.g, [.3, -.15, -.4], { ref: .4 }); this._V = V;
      var next = Math.ceil(Date.now() / 1000 * 6);
      (function sched() { if (esc.dead) return; var now = Date.now(), horizon = now + 1200;   // a long look-ahead: a busy page never drops a beat
        if (next / 6 * 1000 < now - 200) next = Math.ceil(now / 1000 * 6);                         // back from a hidden tab: rejoin the beat
        while (next / 6 * 1000 < horizon) { var t = audioAt(c, next / 6 * 1000);
          if (t > c.currentTime + .004) cut(k, V.in, "clock", t, TICKS[next % 4], 2.3, .5 * (.9 + Math.random() * .2), .012);
          next++; }
        esc.timers.push(setTimeout(sched, 250)); if (esc.timers.length > 40) esc.timers.splice(0, 30); })();
      var mech = k.L("winding", "Winding and repeater", .6, { wet: .35 }); this._W = k.Voice(mech.g, [-.25, -.1, -.45], { ref: .4 });
    },
    on: function (d, t) { var k = this._k; if (!k || !this._W) return;
      if (d.type === "wind" && d.at) d.at.forEach(function (o, i) { cut(k, this._W.in, "clock", t + o, TICKS[i % 4], 3.1 + i * .06, .55, .01);
        cut(k, this._W.in, "clock", t + o + .004, TICKS[(i + 1) % 4], 1.35, .14, .02); }, this);
      if (d.type === "repeater" && d.seq) d.seq.forEach(function (s) { var tt = t + s[0];
        cut(k, this._W.in, "clock", tt - .012, TICKS[0], 3.4, .25, .01);                                  // the hammer lets go
        cut(k, this._W.in, "chimes", tt, GONG, s[1] ? .3 : .225, d.quiet ? .3 : .7, .25); }, this); } });

  /* 36. THE DARKROOM (Claude, theme #42 Darkroom, 2026-10-22): a darkroom at night, recordings only. The vent's air hum and the room;
     the developer sloshing each time the tray is rocked (every 1.6 s: a lowpassed cut of the river recording, swelling and settling);
     the timer ticking once a second while a print develops and its bell when it is done (the clock recording's tick; three quick
     strikes cut from the chimes recording); the paper going in. The print cycle is fx/darkroom.js's: 26 s on the wall clock, paper in
     at 0.55 s, developing from 1.4 to 19 s, bell at 19 s, rocks on every 1.6 s, so picture and sound agree without messages.
     titan:fx {type:"splash"} (a tap) = a stronger slosh and a drip. */
  var DR = { cyc: 26, devFrom: 1.4, devTo: 19, rock: 1.6 };
  function slosh(k, dest, t, gain, len) { cut(k, dest, "river", t, [k.rr(2, 36), len || .9], k.rr(.85, 1.05), gain, (len || .9) * .6); }
  TS.define("darkroom", { name: "A darkroom at night", space: "hall", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var vent = k.L("vent", "Vent and room", .45, { wet: .25 }); k.grains(vent, "labHum", { grain: 3, density: 1.5, spread: .3 }); k.grains(vent, "roomTone", { grain: 3, density: 1.2, spread: .5, dest: vent.g });
      var bath = k.L("developer", "Developer sloshing", .5, { wet: .2 }); var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.Q.value = .4; lp.connect(bath.g);
      var V = k.Voice(lp, [0, -.3, -.5], { ref: .5 }); this._V = V;
      var tim = k.L("timer", "Timer and bell", .45, { wet: .3 }); var VT = k.Voice(tim.g, [.45, -.1, -.6], { ref: .5 });
      var nR = Math.ceil(Date.now() / 1000 / DR.rock), nS = Math.ceil(Date.now() / 1000), nP = Math.floor(Date.now() / 1000 / DR.cyc) + 1;
      (function sched() { if (bath.dead) return; var now = Date.now(), hz = now + 1200;
        if (nR * DR.rock * 1000 < now - 200) nR = Math.ceil(now / 1000 / DR.rock); if (nS * 1000 < now - 200) nS = Math.ceil(now / 1000);
        while (nR * DR.rock * 1000 < hz) { var t = audioAt(c, nR * DR.rock * 1000); if (t > c.currentTime + .004) slosh(k, V.in, t, .55 * k.rr(.8, 1.1)); nR++; }
        while (nS * 1000 < hz) { var ph = nS % DR.cyc, t2 = audioAt(c, nS * 1000);
          if (t2 > c.currentTime + .004) { if (ph > DR.devFrom && ph <= DR.devTo - 1) cut(k, VT.in, "clock", t2, TICKS[ph % 2], 1, .32, .02);   // the timer, once a second
            if (ph === DR.devTo) [0, .17, .34, .51].forEach(function (o) { cut(k, VT.in, "chimes", t2 + o, GONG, .78, .5, .15); }); }       // its bell
          nS++; }
        while (nP * DR.cyc * 1000 < hz) { var t3 = audioAt(c, nP * DR.cyc * 1000 + 550); if (t3 > c.currentTime + .004) slosh(k, V.in, t3, .7, .6); nP++; }   // the paper goes in
        bath.timers.push(setTimeout(sched, 250)); if (bath.timers.length > 40) bath.timers.splice(0, 30); })();
    },
    on: function (d, t) { var k = this._k; if (!k || !this._V || d.type !== "splash") return;
      slosh(k, this._V.in, t + .01, .8, .7); cut(k, this._V.in, "drips", t + .2, [k.rr(1, 38), .35], 1, .4, .1); } });

  /* 37. THE PICTURE HOUSE (Claude, theme #43 Silver Screen, 2026-10-22): a 1920s picture palace during a silent picture, recordings only.
     The projector in its booth behind and above you: the intermittent's rattle at 18 frames a second (the clock recording's tick, sped
     up and dulled by the booth glass) over the motor's hum (the laboratory recording, low-passed); the changeover between subjects
     (the slide-projector recording's mechanism) as the iris closes; the hall itself (the church recording, far) with a full house
     murmuring under it and now and then a seat creaking. The reel is fx/silverscreen.js's: 12 s a subject on the wall clock, frames on
     the 18 fps wall-clock grid, so the rattle and the changeover land with the picture without messages. */
  var PH = { seg: 12, fps: 18 };
  TS.define("picturehouse", { name: "A picture palace", space: "hall", params: { intensity: 1 },
    build: function (k) { var c = k.ctx; this._k = k;
      var hall = k.L("hall", "The hall", .4, { wet: .4 }); k.grains(hall, "hall", { grain: 4, density: 1.2, spread: .6 });
      var aud = k.L("audience", "A full house", .16, { wet: .45 }); var alp = c.createBiquadFilter(); alp.type = "lowpass"; alp.frequency.value = 900; alp.connect(aud.g);
      k.grains(aud, "crowd", { grain: 4, density: .8, spread: .7, dest: alp });
      var pj = k.L("projector", "The projector", .42, { wet: .2 }); var glass = c.createBiquadFilter(); glass.type = "lowpass"; glass.frequency.value = 2600; glass.Q.value = .5; glass.connect(pj.g);
      var V = k.Voice(glass, [.9, 1.6, 3.2], { ref: 1.2 });                                                  // the booth: behind you, up and to the right
      var mlp = c.createBiquadFilter(); mlp.type = "lowpass"; mlp.frequency.value = 520; mlp.connect(V.in); k.grains(pj, "labHum", { grain: 3, density: 1.4, spread: .2, dest: mlp });
      var seats = k.L("seats", "Seats", .3, { wet: .35 }); var slp = c.createBiquadFilter(); slp.type = "lowpass"; slp.frequency.value = 1800; slp.connect(seats.g);
      var nF = Math.ceil(Date.now() / 1000 * PH.fps), nS = Math.ceil(Date.now() / 1000 / PH.seg), nC = Date.now() + k.rr(6, 14) * 1000;
      (function sched() { if (pj.dead) return; var now = Date.now(), hz = now + 1200;   // a long look-ahead: a busy page never drops a frame
        if (nF / PH.fps * 1000 < now - 200) nF = Math.ceil(now / 1000 * PH.fps); if (nS * PH.seg * 1000 < now - 200) nS = Math.ceil(now / 1000 / PH.seg);
        while (nF / PH.fps * 1000 < hz) { var t = audioAt(c, nF / PH.fps * 1000);
          if (t > c.currentTime + .004) cut(k, V.in, "clock", t, TICKS[nF % 4], 2.7 + (nF % 3) * .08, .3 * (.85 + Math.random() * .3), .01);
          nF++; }
        while (nS * PH.seg * 1000 < hz) { var t2 = audioAt(c, nS * PH.seg * 1000 - 420); if (t2 > c.currentTime + .004) cut(k, V.in, "clank", t2, [[0, 3.1, 6.2, 9.3][nS % 4], .75], 1, .34, .2); nS++; }   // the changeover
        if (nC < hz) { var t3 = audioAt(c, nC), x = k.rr(-1, 1); if (t3 > c.currentTime + .004) { var VS = k.Voice(slp, [x * 4, -.6, k.rr(-2, 3)], { ref: 1 }); cut(k, VS.in, "creak", t3, [[0, 4.1, 8.2, 12.3, 16.4][Math.floor(Math.random() * 5)] + k.rr(0, 2.6), .55], k.rr(.85, 1.1), .22, .2); }
          nC = now + k.rr(9, 22) * 1000; }
        pj.timers.push(setTimeout(sched, 250)); if (pj.timers.length > 40) pj.timers.splice(0, 30); })();
    } });

  /* fix-ups: give touch handlers access to the kit */
  ["metal"].forEach(function (id) { var p = TS.presets[id], b = p.build; p.build = function (k) { this._k = k; return b.call(this, k); }; });
})();
