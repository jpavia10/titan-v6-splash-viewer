/* TitanFXK: shared, reusable GPU effects (Grok theme-rebuild worker, 2026-10-20). Owner of fx/.
   One WebGL2 canvas behind the page (z-index 0, like the engine's "back" layer), driven by the per-theme table in fx/themes.js.
   Modules plug in with TitanFXK.mod(name, factory): fx/atmos.js (fog, god rays, caustics, neon signs + wet reflections, aurora,
   portal swirl, light grid, plasma, rocks), fx/particles-gpu.js (GPGPU ping-pong particle field: curl noise, rake, obstacles).
   Lite-aware: Lite mode (window.TitanLite / html.tr-lite) = fewer particles, lower resolution, 30 fps cap.
   Motion "calm"/"off" or prefers-reduced-motion = one still frame, no loop. No automatic downscaling (owner rule: S24 Ultra is the floor).
   Pauses when the tab is hidden. Never blocks input (pointer-events:none); touch/drag is read passively for the rake. */
(function () {
  "use strict";
  var K = window.TitanFXK = window.TitanFXK || { mods: {}, themes: {} };
  K.lazy = K.lazy || { lumen: "fx/lumen.js", rift: "fx/rift.js", horizon: ["fx/scenes-nms.js", "fx/horizon.js"], kintsugi: "fx/kintsugi.js", ferro: "fx/ferro.js", supercell: "fx/supercell.js", tourbillon: "fx/tourbillon.js", darkroom: "fx/darkroom.js", silverscreen: "fx/silverscreen.js", canopy: "fx/canopy.js", glasshouse: "fx/glasshouse.js", orbit: "fx/orbit.js", sahel: "fx/sahel.js", nocturne: "fx/nocturne.js", zen: "fx/zen.js", saltflat: "fx/saltflat.js", lightwell: "fx/lightwell.js", obsidian: "fx/obsidian.js" };   /* a list loads in order */
  K.mod = function (name, f) { K.mods[name] = f; };
  /* world contract (depth upgrade, notes/agents/depth-upgrade.md): one world runs as the backdrop (default, unchanged), the opening or
     the theme's room. A world reads ctx.view: mode, the camera offset from its own view (yaw and pitch in radians, move = metres along
     the view, up = metres) and look = its named controls (each world lists them in K.themes[id].room.look; a missing one = its default). */
  K.view = K.view || { mode: "backdrop", yaw: 0, pitch: 0, move: 0, up: 0, look: {} };
  K.look = function (id, def) { var v = K.view.look && K.view.look[id]; return v == null ? def : v; };
  var root = document.documentElement, cv = null, gl = null, active = null, raf = 0, last = 0, t0 = performance.now();
  var lite = function () { try { return localStorage.getItem("tr_lite_v1") === "1"; } catch (e) { return false; } };   /* owner rule: assume a capable GPU; only an explicit Lite choice scales down */
  var still = function () { var m = root.dataset.motion; return m === "calm" || m === "off" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var phone = Math.min(screen.width, screen.height) < 820;
  /* quality: 0..1, fixed at 1 unless Lite mode */
  var Q = { q: 1, scale: /[?&]fxkscale=/.test(location.search) ? .3 : 1, slow: 0, fast: 0 };
  K.quality = function () { return Q.q; };
  /* pointer: position in canvas uv (0..1, y up), velocity, down flag; also a short history used for raking */
  var ptr = K.ptr = { x: .5, y: .5, vx: 0, vy: 0, down: 0, t: 0, tap: -9, tx: .5, ty: .5 };
  /* a tap from a page that reads the pointer itself (the room: a drag looks around, only a short tap reaches the world) */
  K.tap = function (x, y) { ptr.x = ptr.tx = x; ptr.y = ptr.ty = y; ptr.t = performance.now(); ptr.tap = (ptr.t - t0) / 1000; };
  function pmove(e) { var nx = e.clientX / innerWidth, ny = 1 - e.clientY / innerHeight, now = performance.now(), dt = Math.max(8, now - ptr.t);
    ptr.vx = ptr.vx * .5 + (nx - ptr.x) / dt * 1000 * .5; ptr.vy = ptr.vy * .5 + (ny - ptr.y) / dt * 1000 * .5; ptr.x = nx; ptr.y = ny; ptr.t = now; }
  addEventListener("pointermove", pmove, { passive: true });
  addEventListener("pointerdown", function (e) { ptr.down = 1; ptr.x = e.clientX / innerWidth; ptr.y = 1 - e.clientY / innerHeight; ptr.vx = ptr.vy = 0; ptr.t = performance.now(); ptr.tap = (ptr.t - t0) / 1000; ptr.tx = ptr.x; ptr.ty = ptr.y; }, { passive: true });
  addEventListener("pointerup", function () { ptr.down = 0; }, { passive: true });
  addEventListener("pointercancel", function () { ptr.down = 0; }, { passive: true });
  /* obstacles: up to 8 circles from coin images on screen (sand flows around the coins you are looking at) */
  var obs = K.obs = new Float32Array(32), obsN = 0, obsAt = 0;
  K.obsCount = function () { return obsN; };
  function scanObs(now) {
    if (now - obsAt < 300) return; obsAt = now; obsN = 0;
    var els = document.querySelectorAll(".gxd-face img, .gxd-faces img, .hg-tile img, .coin-thumb img, .museum-slab img, .tile img, .card img");
    for (var i = 0; i < els.length && obsN < 8; i++) { var r = els[i].getBoundingClientRect(); if (r.width < 24 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      obs[obsN * 4] = (r.left + r.width / 2) / innerWidth; obs[obsN * 4 + 1] = 1 - (r.top + r.height / 2) / innerHeight; obs[obsN * 4 + 2] = Math.min(r.width, r.height) * .55 / innerHeight; obs[obsN * 4 + 3] = 1; obsN++; }
  }
  K.compile = function (vs, fs) {
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn("[fxk]", gl.getShaderInfoLog(o)); return null; } return o; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null;
    var p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("[fxk]", gl.getProgramInfoLog(p)); return null; }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u };
  };
  K.FSQ = "#version 300 es\nvoid main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position = vec4(p*2.-1.,0.,1.); }";
  /* shared GLSL noise kit (value noise, fbm, curl), used by atmos + particles */
  K.NOISE = [
    "float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }",
    "vec2 h22(vec2 p){ float a = h21(p); return vec2(a, h21(p+a*17.1)); }",
    "float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }",
    "float fbm(vec2 p){ float s = 0., a = .5; for (int i=0;i<5;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }",
    "float fbm3(vec2 p){ float s = 0., a = .5; for (int i=0;i<3;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }",
    "vec2 curl(vec2 p, float t){ float e = .02; float n1 = fbm3(p+vec2(0,e)+t), n2 = fbm3(p-vec2(0,e)+t), n3 = fbm3(p+vec2(e,0)+t), n4 = fbm3(p-vec2(e,0)+t); return vec2(n1-n2, -(n3-n4))/(2.*e); }"
  ].join("\n") + "\n";
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), s = (lite() ? .45 : 1) * Q.scale;
    var w = Math.max(2, Math.round(innerWidth * dpr * s)), h = Math.max(2, Math.round(innerHeight * dpr * s));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function ensure() {
    if (cv) return !!gl;
    cv = document.createElement("canvas"); cv.id = "fxk"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0;transition:opacity .9s ease;contain:strict";
    document.body.insertBefore(cv, document.body.firstChild);
    gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
    if (!gl) return false;
    K.floatRT = !!gl.getExtension("EXT_color_buffer_float"); K.halfRT = K.floatRT || !!gl.getExtension("EXT_color_buffer_half_float");
    gl.getExtension("OES_texture_float_linear");
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); stop(); active = null; }, false);
    cv.addEventListener("webglcontextrestored", function () { apply(true); }, false);
    return true;
  }
  K.gl = function () { return gl; };
  /* HDR scene target: when a theme's stack has a "post" module, every module draws into this RGBA16F buffer and post composites
     it to the screen (bloom, ACES, aberration, grain, trails). Modules call K.bindTarget() before drawing. */
  var hdr = null; K.hdr = function () { return hdr; };
  function ensureHdr(w, h) {
    if (hdr && hdr.w === w && hdr.h === h) return;
    if (hdr) { gl.deleteTexture(hdr.t); gl.deleteFramebuffer(hdr.f); }
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); });
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    hdr = { t: t, f: f, w: w, h: h };
  }
  K.bindTarget = function () { var useH = active && active.post && hdr; gl.bindFramebuffer(gl.FRAMEBUFFER, useH ? hdr.f : null); gl.viewport(0, 0, cv.width, cv.height); };
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function teardown() { stop(); if (active) active.parts.forEach(function (p) { p.dispose && p.dispose(); }); active = null; if (cv) cv.style.opacity = "0"; root.removeAttribute("data-fxk"); }
  function frame(now) {
    raf = 0; if (!active) return;
    var cap = lite() ? 33 : 15.5; if (now - last < cap) { raf = requestAnimationFrame(frame); return; }
    var dt = Math.min(.05, (now - last) / 1000 || .016);
    /* no automatic quality drop (owner rule: the S24 Ultra is the floor, never downscale on our own); only Lite mode lowers quality */
    last = now; draw((now - t0) / 1000, dt);
    if (!still() && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function draw(t, dt) {
    scanObs(performance.now()); size();
    gl.viewport(0, 0, cv.width, cv.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    var ctx = { t: t, dt: dt, w: cv.width, h: cv.height, q: Q.q, lite: lite(), still: still(), ptr: ptr, obs: obs, obsN: obsN, cfg: active.cfg, id: active.id, view: K.view };
    for (var i = 0; i < active.parts.length; i++) active.parts[i].step && active.parts[i].step(ctx);
    if (active.post) { ensureHdr(cv.width, cv.height); K.bindTarget(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } else K.bindTarget();
    for (i = 0; i < active.parts.length; i++) { if (active.parts[i].name !== "post") K.bindTarget(); active.parts[i].draw(ctx); }
    ptr.vx *= .85; ptr.vy *= .85;
  }
  function apply(force) {
    var id = K.forced || root.dataset.atmo, cfg = K.themes[id];
    if (!force && active && active.id === id) return;
    if (!cfg && K.lazy[id]) { lazyLoad(id); return; }
    teardown(); if (!cfg || root.dataset.ui === "field" && !cfg.field) return;
    if (!ensure()) return;
    var parts = []; (cfg.stack || []).forEach(function (s) { var f = K.mods[s.mod]; if (f) { try { var p = f(gl, s, K); if (p) parts.push(p); } catch (e) { console.warn("[fxk]", s.mod, e); } } });
    if (!parts.length) return;
    active = { id: id, cfg: cfg, parts: parts, post: parts.some(function (p) { return p.name === "post"; }) }; root.setAttribute("data-fxk", id);
    cv.style.opacity = String(cfg.opacity == null ? 1 : cfg.opacity); last = 0; Q.slow = Q.fast = 0;
    raf = requestAnimationFrame(frame);
  }
  // Lazy theme scripts (keeps first load within the speed budget): fetched only when that theme is shown.
  var lazyV = (function () { var s = document.querySelector('script[src*="fx/kit.js"]'); var m = s && /\?v=([^&]+)/.exec(s.src); return m ? "?v=" + m[1] : ""; })(), lazyBusy = {};
  var lazyDone = {};
  function lazyLoad(id) { if (lazyBusy[id]) return; lazyBusy[id] = 1; teardown(); var list = [].concat(K.lazy[id]);
    (function next(i) { if (i >= list.length) { if (K.themes[id] && (K.forced || root.dataset.atmo) === id) apply(true); return; }
      if (lazyDone[list[i]]) return next(i + 1);
      var s = document.createElement("script"); s.src = list[i] + lazyV;
      s.onload = function () { lazyDone[list[i]] = 1; next(i + 1); }; s.onerror = function () { lazyBusy[id] = 0; }; document.head.appendChild(s); })(0); }
  K.apply = apply; K.debug = function () { return { id: active && active.id, q: Q.q, scale: Q.scale, w: cv && cv.width, h: cv && cv.height, parts: active ? active.parts.map(function (p) { return p.name + (p.count ? ":" + p.count() : ""); }) : [] }; };
  function start() { apply(); new MutationObserver(function () { apply(); }).observe(root, { attributes: true, attributeFilter: ["data-atmo", "data-motion", "data-ui"] });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && active && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
    addEventListener("resize", function () { if (active && !raf) raf = requestAnimationFrame(frame); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 0); }); else setTimeout(start, 0);
})();
