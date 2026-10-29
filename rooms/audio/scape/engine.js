/* Titan Reliquary · SCAPE: ambient soundscape engine (Grok, soundscape worker, 2026-10-20).
   Separate from theme music. WebAudio only, no build step. Global: window.TitanScape.

   Graph:  layers -> [space send] -> convolution reverb (per-space IR) ---\
           layers -> dry bus -------------------------------------------- > bed bus -> duck gain -> AGC -> limiter -> master -> out
   - Textures are granular: overlapping Hann grains read from random offsets of a field recording (no loop seam, never repeats)
     mixed with procedural layers (noise beds with random-walk filters, droplet/crackle/bubble micro-events).
   - Events: Poisson schedulers with a 120 ms lookahead (birds, thunder, drips, insects, cars...).
   - Space: HRTF PannerNodes, air absorption lowpass by distance, occlusion lowpass, manual Doppler (playbackRate/frequency).
   - Params: intensity, rain, wind, storm (distance km), tod (0..24 h), plus per-layer gains for the chill mixer.
   - Sync: listens for window "titan:fx" {type, x, y, dist, power}; emits "titan:scape" {type:"flash", dist, x} for its own
     lightning so visuals can flash first and thunder arrives dist/343 s later.
   - Music API: TitanScape.duck(db, sec), TitanScape.sidechain(audioNode) (envelope follower ducks beds under music),
     TitanScape.ctx / TitanScape.out to share one context.
   - Mute: shared key tr_mute_v1 and the "titan:mute" event. iOS: audioSession "ambient" so the silent switch silences us. */
(function () {
  "use strict";
  if (window.TitanScape) return;
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, "") : "audio/scape/"; })();
  var AMB = BASE + "../ambience/", OWN = BASE;
  var AC = window.AudioContext || window.webkitAudioContext;
  var tilt, RATE = 1, ctx = null, master, limiter, agc, duckG, bed, dry, sends = {}, irs = {}, buffers = {}, loading = {};
  var preset = null, layers = [], timers = [], P = { intensity: 1, rain: .6, wind: .5, storm: 3, tod: 22, vol: .9, drag: 0, px: .5, py: .5 };
  var muted = false, vol = .9, sleepT = 0, listeners = {}, budget = 1, noiseBufs = {};
  try { muted = localStorage.getItem("tr_mute_v1") === "1"; vol = +(localStorage.getItem("tr_scape_vol") || .9); } catch (e) {}
  var R = Math.random, clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  function rr(a, b) { return a + R() * (b - a); }
  function db(d) { return Math.pow(10, d / 20); }
  function emit(type, d) { (listeners[type] || []).forEach(function (f) { try { f(d); } catch (e) {} }); }
  var useWebm = (function () { var a = document.createElement("audio"); return !!(a.canPlayType && a.canPlayType('audio/webm; codecs="opus"')) && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent); })();

  function tier() { var q = window.TitanQuality; var t = q && (q.tier || (q.get && q.get())); var m = { low: .4, medium: .65, high: 1, ultra: 1.3, max: 1.6 }; return m[String(t || "").toLowerCase()] || 1; }

  /* ---------- context + master chain ---------- */
  var ext = null; // { ctx, dest } when hosted inside the app (shares the app's context and output route)
  function init() {
    if (ctx) return ctx;
    if (!AC && !ext) return null;
    if (ext) ctx = ext.ctx;
    else { try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (e) {} ctx = new AC({ latencyHint: "playback" }); }
    master = ctx.createGain(); master.gain.value = muted ? 0 : vol;
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 2; limiter.ratio.value = 20; limiter.attack.value = .002; limiter.release.value = .18;
    agc = ctx.createGain(); duckG = ctx.createGain(); bed = ctx.createGain(); dry = ctx.createGain();
    dry.connect(bed); tilt = ctx.createBiquadFilter(); tilt.type = "lowpass"; tilt.frequency.value = 20000; tilt.Q.value = .5; bed.connect(tilt); tilt.connect(duckG); duckG.connect(agc); agc.connect(limiter); limiter.connect(master); master.connect(ext ? ext.dest : ctx.destination);
    // loudness normalisation: slow RMS follower steers agc toward -20 dBFS (+-9 dB), the limiter catches peaks
    var an = ctx.createAnalyser(); an.fftSize = 2048; agc.connect(an); var buf = new Float32Array(an.fftSize), lvl = -20;
    setInterval(function () { if (!preset || ctx.state !== "running") return; an.getFloatTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      var d = 10 * Math.log10(s / buf.length + 1e-9); if (d < -70) return; lvl += (d - lvl) * .05; var cur = 20 * Math.log10(agc.gain.value + 1e-9);
      var want = clamp(cur + (-20 - lvl) * .3, -9, 9); agc.gain.setTargetAtTime(db(want), ctx.currentTime, 2.5); }, 250);
    ctx.listener.positionX ? (ctx.listener.positionX.value = 0) : ctx.listener.setPosition(0, 0, 0);
    budget = tier();
    return ctx;
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state !== "running") ctx.resume();
    var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  }
  /* pointer: P.px/P.py (0..1), P.drag (smoothed speed 0..1) for drag-driven layers (stir, rake, pour) */
  var lastPM = null;
  addEventListener("pointermove", function (e) { var x = e.clientX / innerWidth, y = e.clientY / innerHeight, t = performance.now();
    if (lastPM && (e.buttons || e.pointerType === "touch")) { var v = Math.hypot(x - lastPM[0], y - lastPM[1]) / Math.max(8, t - lastPM[2]) * 1000; P.drag = clamp(P.drag * .7 + v * .3 * .5, 0, 1); }
    lastPM = [x, y, t]; P.px = x; P.py = y; }, { passive: true });
  addEventListener("pointerdown", function (e) { P.px = e.clientX / innerWidth; P.py = e.clientY / innerHeight; if (preset && preset.on && ctx) try { preset.on({ type: "touch", x: P.px, y: P.py }, ctx.currentTime); } catch (er) {} }, { passive: true });
  setInterval(function () { P.drag *= .86; }, 50);
  ["pointerdown", "touchend", "keydown"].forEach(function (ev) { addEventListener(ev, function () { if (ctx && ctx.state !== "running") ctx.resume(); }, { passive: true, capture: true }); });
  document.addEventListener("visibilitychange", function () { if (!ctx || ext) return; if (document.hidden) ctx.suspend(); else if (preset && !muted) ctx.resume(); });

  function setMuted(m, silent) { muted = !!m; try { localStorage.setItem("tr_mute_v1", muted ? "1" : "0"); } catch (e) {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, .08);
    if (!silent) window.dispatchEvent(new CustomEvent("titan:mute", { detail: { muted: muted, from: "scape" } })); emit("mute", muted); }
  addEventListener("titan:mute", function (e) { if (e.detail && e.detail.from !== "scape") setMuted(e.detail.muted, true); });

  /* ---------- buffers ---------- */
  function noise(kind, sec) {
    var k = kind + sec; if (noiseBufs[k]) return noiseBufs[k];
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (var i = 0; i < n; i++) { var w = R() * 2 - 1;
        if (kind === "white") d[i] = w * .5;
        else if (kind === "brown") { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
        else { b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; } } }
    return (noiseBufs[k] = b);
  }
  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    var own = name.charAt(0) === "@", url = own ? OWN + name.slice(1) + (useWebm ? ".webm" : ".m4a") : AMB + name + (useWebm ? ".webm" : ".m4a");
    return (loading[name] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.arrayBuffer(); })
      .then(function (a) { return new Promise(function (ok, no) { ctx.decodeAudioData(a, ok, no); }); })
      .then(function (b) { buffers[name] = b; return b; }).catch(function (e) { console.warn("scape: load failed", name, e); return null; }));
  }

  /* ---------- convolution spaces ---------- */
  /* IRs are built per space from measured-style parameters: early-reflection tap pattern + 3-band exponentially decaying
     diffuse tail with per-band RT60 (high frequencies die first), stereo-decorrelated. */
  var SPACES = {
    forest:    { rt: [1.6, 1.1, .55], pre: .012, er: 14, erSpan: .09, size: 2.0, wet: .28, ir: "forest" },
    cave:      { rt: [4.8, 3.6, 2.0], pre: .03,  er: 22, erSpan: .14, size: 5.0, wet: .42, ir: "cave" },
    cathedral: { rt: [7.5, 5.8, 3.2], pre: .045, er: 30, erSpan: .22, size: 8.0, wet: .4, ir: "cathedral" },
    street:    { rt: [1.9, 1.4, .8],  pre: .018, er: 10, erSpan: .12, size: 2.4, wet: .24, ir: "street" },
    space:     { rt: [12, 10, 7],     pre: .08,  er: 6,  erSpan: .4,  size: 14,  wet: .55, ir: "space" },
    snow:      { rt: [1.2, .7, .3], pre: .015, er: 6, erSpan: .2, size: 1.6, wet: .2, ir: "snow" },
    hall:      { rt: [3.0, 2.4, 1.4], pre: .025, er: 18, erSpan: .1,  size: 3.4, wet: .32, ir: "hall" },
    open:      { rt: [.9, .6, .35],   pre: .02,  er: 4,  erSpan: .2,  size: 1.1, wet: .14 },
    water:     { rt: [2.6, 1.2, .5],  pre: .006, er: 26, erSpan: .05, size: 2.8, wet: .5 }
  };
  function buildIR(sp) {
    var sr = ctx.sampleRate, len = Math.floor(sr * sp.size), b = ctx.createBuffer(2, len, sr);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c), lp = 0, lp2 = 0, pre = Math.floor(sp.pre * sr);
      for (var i = pre; i < len; i++) { var t = (i - pre) / sr, w = R() * 2 - 1; lp += (w - lp) * .08; lp2 += (w - lp2) * .45;
        var lo = lp, mid = lp2 - lp, hi = w - lp2;
        d[i] = (lo * 2.2 * Math.exp(-6.9 * t / sp.rt[0]) + mid * 1.2 * Math.exp(-6.9 * t / sp.rt[1]) + hi * .6 * Math.exp(-6.9 * t / sp.rt[2])) * Math.min(1, t / .02 + .1); }
      for (var k = 0; k < sp.er; k++) { var at = pre + Math.floor(rr(0, sp.erSpan) * sr); if (at < len) d[at] += (R() < .5 ? -1 : 1) * rr(.2, .7) * (1 - k / sp.er); } }
    var peak = 0, ch0 = b.getChannelData(0); for (var j = 0; j < len; j += 8) peak = Math.max(peak, Math.abs(ch0[j]));
    return b;
  }
  function space(name) {
    if (sends[name]) return sends[name];
    var sp = SPACES[name] || SPACES.open, conv = ctx.createConvolver(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    conv.normalize = true; conv.buffer = irs[name] || (irs[name] = buildIR(sp));
    /* recorded OpenAIR impulse response (CC BY 4.0, see CREDITS.md) replaces the generated one once decoded */
    if (sp.ir) load("@ir/" + sp.ir).then(function (b) { if (b) { var c2 = ctx.createConvolver(); c2.normalize = true; c2.buffer = b; hp.disconnect(); hp.connect(c2); c2.connect(g); conv.disconnect(); } }); hp.type = "highpass"; hp.frequency.value = 90;
    g.gain.value = 0; hp.connect(conv); conv.connect(g); g.connect(bed);
    return (sends[name] = { input: hp, out: g, wet: sp.wet });
  }
  var curSpace = null;
  function useSpace(name) {
    var s = space(name); Object.keys(sends).forEach(function (k) { sends[k].out.gain.setTargetAtTime(k === name ? 1 : 0, ctx.currentTime, .8); });
    curSpace = s; return s;
  }

  /* ---------- layer plumbing ---------- */
  function Layer(id, label, gain, opt) {
    opt = opt || {};
    var L = { id: id, label: label, base: gain, user: 1, g: ctx.createGain(), wet: ctx.createGain(), nodes: [], tick: null, stop: null };
    L.g.gain.value = 0; L.g.connect(dry); L.wet.gain.value = opt.wet == null ? 1 : opt.wet; L.g.connect(L.wet);
    if (curSpace) L.wet.connect(curSpace.input);
    L.level = function (t) { L.g.gain.setTargetAtTime(L.base * L.user * (L.mod == null ? 1 : L.mod), ctx.currentTime, t || .6); };
    layers.push(L); return L;
  }
  /* spatial voice: source -> occlusion/air lowpass -> HRTF panner -> dest */
  function Voice(dest, pos, o) {
    o = o || {};
    var lp = ctx.createBiquadFilter(), pn = ctx.createPanner(), g = ctx.createGain();
    lp.type = "lowpass"; lp.frequency.value = 20000; lp.Q.value = .5;
    pn.panningModel = budget < .5 ? "equalpower" : "HRTF"; pn.distanceModel = "inverse"; pn.refDistance = o.ref || 2; pn.rolloffFactor = o.roll == null ? 1 : o.roll; pn.maxDistance = 10000;
    lp.connect(g); g.connect(pn); pn.connect(dest);
    var V = { in: lp, lp: lp, pan: pn, g: g, pos: [0, 0, 0], occl: o.occl || 0,
      at: function (x, y, z, t) { V.pos = [x, y, z]; var w = ctx.currentTime + (t || 0);
        if (pn.positionX) { pn.positionX.setTargetAtTime(x, w, .03); pn.positionY.setTargetAtTime(y, w, .03); pn.positionZ.setTargetAtTime(z, w, .03); } else pn.setPosition(x, y, z);
        var d = Math.sqrt(x * x + y * y + z * z), f = clamp(20000 * Math.exp(-d / 180) * (1 - .85 * V.occl), 300, 20000); lp.frequency.setTargetAtTime(f, w, .05); return V; } };
    V.at(pos[0], pos[1], pos[2]); return V;
  }
  function env(g, t0, a, hold, rel, peak) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(1e-4, t0 + a + hold + rel); }

  /* granular cloud over a buffer: grains of `grain` s at `density`/s, random offset, rate jitter, stereo/positional spread */
  function grains(L, name, o) {
    o = o || {};
    var dens = o.density || 3, gl = o.grain || 1.6;
    load(name).then(function (b) { if (!b || L.dead) return;
      var segs = o.segs, next = ctx.currentTime + .05;
      function sched() { if (L.dead) return; var now = ctx.currentTime;
        while (next < now + .4) { var s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          s.buffer = b; s.playbackRate.value = (o.rate || 1) * RATE * Math.pow(2, rr(-1, 1) * (o.jitter == null ? .03 : o.jitter));
          var len = gl * rr(.8, 1.25), off = rr(0, Math.max(0, b.duration - len - .01));
          env2(g, next, len); s.connect(g); if (p) { p.pan.value = rr(-1, 1) * (o.spread == null ? .6 : o.spread); g.connect(p); p.connect(o.dest || L.g); } else g.connect(o.dest || L.g);
          s.start(next, off, len); next += (gl / dens) * rr(.7, 1.3) * (1 / (o.dmul ? o.dmul() : 1)); }
        L._g = setTimeout(sched, 150); }
      sched(); });
  }
  function env2(g, t, len) { var c = new Float32Array(32); for (var i = 0; i < 32; i++) c[i] = Math.pow(Math.sin(Math.PI * i / 31), 1.2) * .72; g.gain.setValueCurveAtTime(c, t, len); }

  /* procedural noise bed with random-walk bandpass, two detuned sources so the noise never periodises */
  function noiseBed(L, kind, o) {
    o = o || {};
    var f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = o.type || "bandpass"; f.frequency.value = o.f || 800; f.Q.value = o.q || .7;
    f2.type = o.type2 || "lowpass"; f2.frequency.value = o.f2 || 16000; g.gain.value = o.gain || 1;
    for (var k = 0; k < 2; k++) { var s = ctx.createBufferSource(); s.buffer = noise(kind, 9 + k * 2.3); s.loop = true; s.playbackRate.value = 1 + k * .013; s.connect(f); s.start(ctx.currentTime, R() * 5); L.nodes.push(s); }
    f.connect(f2); f2.connect(g); g.connect(o.dest || L.g);
    var B = { f: f, f2: f2, g: g, x: R() };
    if (o.walk) { (function w() { if (L.dead) return; B.x = clamp(B.x + rr(-.25, .25), 0, 1); var fr = o.walk[0] * Math.pow(o.walk[1] / o.walk[0], B.x * (o.walkK ? o.walkK() : 1));
      f.frequency.setTargetAtTime(fr, ctx.currentTime, o.walkT || 1.2); if (o.gainWalk) g.gain.setTargetAtTime((o.gain || 1) * (o.gainWalk[0] + (o.gainWalk[1] - o.gainWalk[0]) * B.x), ctx.currentTime, o.walkT || 1.2);
      L._w = setTimeout(w, (o.walkMs || 900) * rr(.6, 1.4)); })(); }
    return B;
  }
  /* Poisson event scheduler; rate() is events per second, fn(t) schedules one at audio time t */
  function poisson(L, rate, fn) {
    var next = ctx.currentTime + rr(0, 1 / Math.max(rate(), .01));
    (function loop() { if (L.dead) return; var now = ctx.currentTime, r = rate() * budget;
      while (r > 0 && next < now + .12) { if (next > now - .05) fn(Math.max(next, now)); next += -Math.log(1 - R() + 1e-9) / r; }
      if (r <= 0) next = now + .3; L.timers.push(setTimeout(loop, 40)); if (L.timers.length > 40) L.timers.splice(0, 30); })();
  }
  function oneShot(dest, name, o) {
    o = o || {};
    return load(name).then(function (b) { if (!b) return; var segs = o.segs, s = ctx.createBufferSource(), g = ctx.createGain(), t = o.t || ctx.currentTime;
      s.buffer = b; s.playbackRate.value = o.rate || 1; g.gain.value = o.gain || 1; s.connect(g); g.connect(dest);
      var seg = segs ? segs[Math.floor(R() * segs.length)] : [0, b.duration]; s.start(t, seg[0], seg[1]); return s; });
  }

  /* ---------- procedural micro-sounds ---------- */
  var S = {
    drop: function (dest, t, o) { // raindrop / drip: impact click + resonant bubble chirp (Minnaert)
      o = o || {}; var g = ctx.createGain(), os = ctx.createOscillator(), f0 = o.f || rr(1400, 4200);
      os.type = "sine"; os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f0 * rr(1.3, 2.1), t + .05);
      env(g, t, .001, .002, o.len || rr(.02, .07), (o.gain || .2) * rr(.4, 1)); os.connect(g); g.connect(dest); os.start(t); os.stop(t + .15);
      var n = ctx.createBufferSource(), ng = ctx.createGain(), hp = ctx.createBiquadFilter(); n.buffer = noise("white", 2); hp.type = "highpass"; hp.frequency.value = 3000;
      env(ng, t, .0005, 0, .008, (o.gain || .2) * .7); n.connect(hp); hp.connect(ng); ng.connect(dest); n.start(t, R()); n.stop(t + .03); },
    crackle: function (dest, t, o) { // ember snap: band-limited impulse train
      o = o || {}; var n = ctx.createBufferSource(), g = ctx.createGain(), bp = ctx.createBiquadFilter(); n.buffer = noise("white", 2); bp.type = "bandpass"; bp.frequency.value = o.f || rr(1500, 6000); bp.Q.value = rr(.8, 3);
      var k = 1 + Math.floor(R() * (o.burst || 3)); g.gain.setValueAtTime(0, t); for (var i = 0; i < k; i++) { var tt = t + i * rr(.004, .02); g.gain.setValueAtTime((o.gain || .5) * rr(.3, 1), tt); g.gain.exponentialRampToValueAtTime(1e-4, tt + rr(.002, .012)); }
      n.connect(bp); bp.connect(g); g.connect(dest); n.start(t, R()); n.stop(t + .2); },
    bubble: function (dest, t, o) { // rising bubble
      o = o || {}; var r = rr(.6, 4) * (o.size || 1), f = Math.min(9000, 3260 / r), os = ctx.createOscillator(), g = ctx.createGain();
      os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(Math.min(20000, f * rr(1.6, 2.6)), t + .06 * r); env(g, t, .002, .01, .05 * r, (o.gain || .15) * rr(.4, 1));
      os.connect(g); g.connect(dest); os.start(t); os.stop(t + .4 * r + .1); },
    boom: function (dest, t, o) { // low thump with body (firework/lava/blast/thunder near crack)
      o = o || {}; var os = ctx.createOscillator(), g = ctx.createGain(), f = o.f || rr(45, 70); os.frequency.setValueAtTime(f * 2.2, t); os.frequency.exponentialRampToValueAtTime(f, t + .12);
      env(g, t, .004, .03, o.len || 1.2, o.gain || .8); os.connect(g); g.connect(dest); os.start(t); os.stop(t + (o.len || 1.2) + .2);
      var n = ctx.createBufferSource(), ng = ctx.createGain(), lp = ctx.createBiquadFilter(); n.buffer = noise("brown", 4); lp.type = "lowpass"; lp.frequency.setValueAtTime(o.bright || 2400, t); lp.frequency.exponentialRampToValueAtTime(120, t + (o.len || 1.2));
      env(ng, t, .002, .02, (o.len || 1.2) * 1.4, (o.gain || .8) * 1.2); n.connect(lp); lp.connect(ng); ng.connect(dest); n.start(t, R() * 2); n.stop(t + (o.len || 1.2) * 1.6 + .2); },
    thunder: function (dest, t, dist, o) { // procedural thunder: near crack, then N-wave rumble clusters stretched by distance
      o = o || {}; var near = clamp(1 - dist / 6, 0, 1), dur = 3 + dist * 1.6, lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.value = 180 + near * 2600; g.gain.value = (o.gain || 1) * (0.35 + near * .8); lp.connect(g); g.connect(dest);
      if (near > .35) S.crackle(g, t, { f: 3000, burst: 8, gain: 1.4 * near });
      var k = 4 + Math.floor(R() * 6);
      for (var i = 0; i < k; i++) { var tt = t + Math.pow(R(), 1.6) * dur * .6, n = ctx.createBufferSource(), ng = ctx.createGain(), ln = rr(.6, 2.6) * (1 + dist * .25);
        n.buffer = noise("brown", 6); env(ng, tt, rr(.01, .25 + dist * .05), rr(0, .3), ln, rr(.4, 1) * (i ? .8 : 1.2)); n.connect(ng); ng.connect(lp); n.start(tt, R() * 3); n.stop(tt + ln + 1); }
      var tail = ctx.createBufferSource(), tg = ctx.createGain(); tail.buffer = noise("brown", 6); env(tg, t, .5, dur * .3, dur, .35); tail.connect(tg); tg.connect(lp); tail.start(t, R()); tail.stop(t + dur * 1.5); }
  };

  /* moving source with Doppler: path(t)->[x,y,z]; build(dest) returns {rate:fn(r)} to retune its sources */
  function mover(L, dur, path, build, o) {
    o = o || {}; var V = Voice(L.g, path(0), o), h = build(V.in), t0 = ctx.currentTime, prev = null;
    var end = t0 + dur;
    (function step() { if (L.dead) return; var now = ctx.currentTime, u = (now - t0) / dur; if (u > 1) { h.stop && h.stop(); setTimeout(function () { V.pan.disconnect(); }, 500); return; }
      var p = path(u), d = Math.hypot(p[0], p[1], p[2]);
      if (prev != null) { var vr = (d - prev) / .05; h.rate(343 / (343 + clamp(vr, -120, 120))); } prev = d; V.at(p[0], p[1], p[2]); setTimeout(step, 50); })();
    return V;
  }

  /* ---------- presets ---------- */
  var PRESETS = {};
  function def(id, o) { o.id = id; PRESETS[id] = o; }

  function play(id, opts) {
    if (!init()) return;
    unlock(); stopAll(.8);
    var pr = PRESETS[id]; if (!pr) return;
    opts = opts || {}; RATE = opts.rate || 1; tilt.frequency.setTargetAtTime(opts.tone || 20000, ctx.currentTime, .5);
    preset = pr; useSpace(opts.space || pr.space || "open");
    if (pr.params) Object.keys(pr.params).forEach(function (k) { P[k] = pr.params[k]; });
    if (opts) Object.keys(opts).forEach(function (k) { if (typeof opts[k] === "number") P[k] = opts[k]; });
    var mine = []; P.drag = 0; var mk = function (id2, label, gain, o) { var L = Layer(id2, label, gain, o); L.timers = []; mine.push(L); return L; };
    pr.build({ L: mk, P: P, S: S, grains: grains, noiseBed: noiseBed, poisson: poisson, oneShot: oneShot, Voice: Voice, mover: mover, rr: rr, ctx: ctx, emit: fire, space: curSpace });
    var lm = opts.layers || {}; mine.forEach(function (L) { if (lm[L.id] != null) L.user = lm[L.id]; L.level(1.5); });
    pr._layers = mine; emit("preset", id); return pr;
  }
  function stopAll(fade) {
    var old = layers; layers = [];
    old.forEach(function (L) { L.dead = true; clearTimeout(L._g); clearTimeout(L._w); (L.timers || []).forEach(clearTimeout); L.g.gain.setTargetAtTime(0, ctx.currentTime, (fade || .5) / 3);
      setTimeout(function () { L.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); try { L.g.disconnect(); L.wet.disconnect(); } catch (e) {} }, (fade || .5) * 1000 + 600); });
    preset = null;
  }
  /* engine-originated visual events (e.g. its own lightning): tell the visuals */
  function fire(type, d) { d = d || {}; d.type = type; d.from = "scape"; window.dispatchEvent(new CustomEvent("titan:scape", { detail: d })); emit(type, d); }
  /* visual-originated events: route to the active preset */
  addEventListener("titan:fx", function (e) { var d = e.detail || {}; if (preset && preset.on && ctx && d.from !== "scape") try { preset.on(d, ctx.currentTime); } catch (er) { console.warn(er); } });

  /* ---------- ducking / sidechain for music ---------- */
  var duckDb = 0;
  function duck(d, sec) { if (!ctx) return; duckDb = d || 0; duckG.gain.setTargetAtTime(db(-Math.abs(duckDb)), ctx.currentTime, (sec || .4) / 3); }
  function sidechain(node, o) {
    if (!init() || !node) return; o = o || {}; var an = ctx.createAnalyser(); an.fftSize = 1024; try { node.connect(an); } catch (e) { return; }
    var b = new Float32Array(an.fftSize), depth = o.depth || 8, thr = o.threshold || -38;
    var id = setInterval(function () { an.getFloatTimeDomainData(b); var s = 0; for (var i = 0; i < b.length; i++) s += b[i] * b[i]; var lv = 10 * Math.log10(s / b.length + 1e-9);
      var red = clamp((lv - thr) * .5, 0, depth) + Math.abs(duckDb); duckG.gain.setTargetAtTime(db(-red), ctx.currentTime, red > 0 ? .05 : .5); }, 40);
    return function () { clearInterval(id); try { node.disconnect(an); } catch (e) {} };
  }

  function setParam(k, v) { P[k] = v; layers.forEach(function (L) { if (L.update) L.update(k, v); }); if (preset && preset.update) preset.update(P, k); emit("param", { k: k, v: v }); }
  function setVolume(v) { vol = clamp(v, 0, 1); try { localStorage.setItem("tr_scape_vol", vol); } catch (e) {} if (master && !muted) master.gain.setTargetAtTime(vol, ctx.currentTime, .1); }
  function sleep(min) { clearTimeout(sleepT); if (!min) return; sleepT = setTimeout(function () { master.gain.setTargetAtTime(0, ctx.currentTime, 20); setTimeout(function () { stopAll(1); master.gain.value = muted ? 0 : vol; }, 70000); }, min * 60000); }

  /* the listener turns with a room's camera (yaw right = positive, pitch up = positive, radians): sounds stay where they are in the
     room while you look around. Positions in presets are metres with the listener facing -z at yaw 0. */
  function face(yaw, pitch) { if (!init()) return; var L = ctx.listener, cp = Math.cos(pitch || 0), fx = Math.sin(yaw) * cp, fy = Math.sin(pitch || 0), fz = -Math.cos(yaw) * cp;
    var ux = -Math.sin(yaw) * fy, uy = cp, uz = Math.cos(yaw) * fy, t = ctx.currentTime;
    if (L.forwardX) { L.forwardX.setTargetAtTime(fx, t, .03); L.forwardY.setTargetAtTime(fy, t, .03); L.forwardZ.setTargetAtTime(fz, t, .03);
      L.upX.setTargetAtTime(ux, t, .03); L.upY.setTargetAtTime(uy, t, .03); L.upZ.setTargetAtTime(uz, t, .03); } else if (L.setOrientation) L.setOrientation(fx, fy, fz, ux, uy, uz); }

  window.TitanScape = {
    define: def, presets: PRESETS, play: play, stop: function () { if (ctx) stopAll(1.2); },
    attach: function (c, dest) { if (ctx) return ctx === c; ext = { ctx: c, dest: dest }; init(); return true; },
    unlock: unlock, get ctx() { return init(); }, get out() { init(); return bed; },
    get current() { return preset && preset.id; }, layers: function () { return layers.map(function (L) { return { id: L.id, label: L.label, gain: L.user }; }); },
    setLayer: function (id, g) { layers.forEach(function (L) { if (L.id === id) { L.user = g; L.level(.3); } }); },
    setParam: setParam, params: P, setVolume: setVolume, get volume() { return vol; }, setMuted: setMuted, get muted() { return muted; },
    duck: duck, sidechain: sidechain, sleep: sleep, face: face, fx: function (d) { if (preset && preset.on && ctx) preset.on(d, ctx.currentTime); },
    _dbg: function () { return layers.map(function (L) { return L.id + ":" + L.g.gain.value.toFixed(3) + "/" + L.mod; }).join(" ") + " ctxT=" + ctx.currentTime.toFixed(1); }, on: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, spaces: SPACES, _S: S
  };
})();
