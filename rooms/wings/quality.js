/* TitanQuality (Grok 2026-10-20): the one graphics-quality setting every system reads. Replaces the old Lite switch.
   Device targets (Joseph): floor = Galaxy S24 Ultra (Adreno 750, Chrome) at a smooth 60fps; iPad Pro (Safari, WebGPU with
   WebGL2 fallback); top = RTX 4090 + i9 on a 45" ultrawide. Assume a capable GPU.
   Setting: localStorage "tr_quality_v1" = auto | low | medium | high | ultra | max (default auto). The user's choice always
   wins. Auto picks a start tier from the device once (High on phones/tablets, Max on a discrete desktop GPU, Ultra on other
   desktops) and never changes it mid-session. Old Lite users ("tr_lite_v1" = "1") are migrated to Low.
   Low is the Lite level: it sets window.TitanLite, html.tr-lite and tr_lite_v1 = "1" so every older reader agrees.
   ?q=<tier> forces a tier for one visit.
   API: TitanQuality.tier() ("low".."max"; also coerces to that string), .choice ("auto" or a tier), .q (knobs below), .set(choice) (saves, reloads),
        .open() (the Graphics panel), .ultrawide, .webgpu, .gpu, .TIERS, .ORDER. Event "titan:quality" on window.
   Knobs (read these, never hardcode counts):
     particles  absolute GPU particle budget for one full-screen effect
     simRes     simulation grid / texture size (fluids, fields)
     dpr        render-scale cap (min with devicePixelRatio)
     renderScale extra multiplier on the drawing buffer
     bloom      bloom passes (0 none)   post: post-fx passes (0 none, 1 tone map + grade, 2 + DOF/CA/grain)
     volSteps   ray-march steps for volumetric fog/light (0 off)
     shadow     shadow-map size (0 off)    aa: MSAA samples (0 off)    fx: density multiplier for decorative fx (1 = High)
     fps        frame cap (0 uncapped) */
(function () {
  "use strict";
  const ORDER = ["low", "medium", "high", "ultra", "max"];
  const NAMES = { auto: "Auto", low: "Low", medium: "Medium", high: "High", ultra: "Ultra", max: "Max" };
  const TIERS = {
    low:    { particles: 20000,   simRes: 64,  dpr: 1,    renderScale: 0.85, bloom: 0, post: 0, volSteps: 0,  shadow: 0,    aa: 0, fx: 0.25, fps: 30 },
    medium: { particles: 120000,  simRes: 128, dpr: 1.5,  renderScale: 1,    bloom: 1, post: 1, volSteps: 16, shadow: 1024, aa: 2, fx: 0.6,  fps: 60 },
    high:   { particles: 400000,  simRes: 256, dpr: 2,    renderScale: 1,    bloom: 2, post: 1, volSteps: 32, shadow: 2048, aa: 4, fx: 1,    fps: 60 },
    ultra:  { particles: 1000000, simRes: 384, dpr: 2,    renderScale: 1,    bloom: 3, post: 2, volSteps: 48, shadow: 2048, aa: 4, fx: 1.6,  fps: 0 },
    max:    { particles: 2000000, simRes: 512, dpr: 3,    renderScale: 1.25, bloom: 4, post: 2, volSteps: 96, shadow: 4096, aa: 8, fx: 2.5,  fps: 0 }
  };
  const KEY = "tr_quality_v1", LKEY = "tr_lite_v1";
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
  let gpu = "";
  try { const c = document.createElement("canvas"), g = c.getContext("webgl2") || c.getContext("webgl"), e = g && g.getExtension("WEBGL_debug_renderer_info");
    gpu = (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "") || ""; const lc = g && g.getExtension("WEBGL_lose_context"); lc && lc.loseContext(); } catch (e) { /* ignore */ }
  const touch = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  const discrete = /RTX|GeForce|Quadro|Radeon (RX|Pro)|Arc\(?TM\)? A|Apple M\d (Pro|Max|Ultra)/i.test(gpu);
  const autoTier = touch ? "high" : discrete ? "max" : "ultra";
  /* migrate the old Lite switch once */
  let choice = ls.get(KEY);
  if (!choice) { choice = ls.get(LKEY) === "1" ? "low" : "auto"; ls.set(KEY, choice); }
  if (choice !== "auto" && !TIERS[choice]) choice = "auto";
  const forced = (/[?&]q=(low|medium|high|ultra|max)\b/.exec(location.search) || [])[1];
  const tier = forced || (choice === "auto" ? autoTier : choice);   // fixed for this session
  const isLow = tier === "low";
  window.TitanLite = isLow; ls.set(LKEY, isLow ? "1" : "0");
  const html = document.documentElement; html.classList.toggle("tr-lite", isLow); html.dataset.quality = tier;
  const ultrawide = () => innerWidth / Math.max(1, innerHeight) >= 2.1;
  const markUW = () => html.classList.toggle("tr-ultrawide", ultrawide()); markUW(); addEventListener("resize", markUW);
  function set(c) { if (c !== "auto" && !TIERS[c]) return; ls.set(KEY, c); ls.set("tr_quality", c === "auto" ? autoTier : c); ls.set(LKEY, (c === "auto" ? autoTier : c) === "low" ? "1" : "0");
    try { window.dispatchEvent(new CustomEvent("titan:quality", { detail: { choice: c } })); } catch (e) { /* ignore */ }
    const u = new URL(location.href); u.searchParams.delete("q"); location.replace(u.toString()); }
  /* tier() is the call the themes use (fx/lumen.js); it also coerces to the tier string for older property readers */
  const tierFn = () => tier; tierFn.toString = tierFn.valueOf = tierFn; tierFn[Symbol.toPrimitive] = tierFn;
  ls.set("tr_quality", choice === "auto" ? tier : choice);   // plain mirror for themes that read localStorage directly
  const api = { ORDER, TIERS, NAMES, tier: tierFn, choice, auto: autoTier, gpu, discrete, touch, webgpu: !!navigator.gpu,
    get q() { return TIERS[tier]; }, get ultrawide() { return ultrawide(); }, set, open: () => panel() };
  window.TitanQuality = api;

  /* ---------------- the Graphics panel: a GPU-rendered card with a live preview at the selected level ---------------- */
  let root = null, gl = null, prog = null, raf = 0, sel = choice, lastFocus = null;
  function panel() {
    if (root) return; lastFocus = document.activeElement;
    root = document.createElement("div"); root.className = "tq"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Graphics quality");
    root.innerHTML = '<canvas class="tq-gl" aria-hidden="true"></canvas><div class="tq-card"><div class="tq-top"><div><div class="tq-kick">Graphics</div><h2>Quality</h2></div>' +
      '<div class="tq-fps" aria-live="off"><b>--</b><span>fps</span></div><button type="button" class="tq-x" aria-label="Close">✕</button></div>' +
      '<div class="tq-preview"><canvas class="tq-pv" aria-hidden="true"></canvas><div class="tq-pvlbl"></div></div>' +
      '<div class="tq-opts" role="radiogroup" aria-label="Quality level">' + ["auto"].concat(ORDER).map((k) => '<button type="button" role="radio" data-q="' + k + '"><b>' + NAMES[k] + "</b><i>" +
        (k === "auto" ? NAMES[autoTier] + " here" : (TIERS[k].particles >= 1e6 ? (TIERS[k].particles / 1e6) + "M" : (TIERS[k].particles / 1e3) + "k") + " particles") + "</i></button>").join("") + "</div>" +
      '<dl class="tq-knobs"></dl><div class="tq-foot"><span class="tq-gpu"></span><button type="button" class="tq-apply">Apply</button></div></div>';
    document.body.appendChild(root);
    root.querySelector(".tq-gpu").textContent = (gpu ? gpu.replace(/ANGLE \(|\)$|, ?D3D11.*|Direct3D.*/g, "").slice(0, 60) : "GPU") + (navigator.gpu ? " · WebGPU" : " · WebGL2");
    root.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) { pick(b.dataset.q); return; }
      if (e.target.closest(".tq-apply")) { if (sel === choice && !forced) close(); else set(sel); } else if (e.target.closest(".tq-x") || e.target === root) close(); });
    root.addEventListener("keydown", onKey, true);
    pick(sel); start(); requestAnimationFrame(() => root && root.classList.add("on"));
    const f = root.querySelector('[aria-checked="true"]'); f && f.focus();
  }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const ks = ["auto"].concat(ORDER), i = ks.indexOf(sel) + (e.key === "ArrowRight" ? 1 : -1); if (i >= 0 && i < ks.length) { pick(ks[i]); root.querySelector('[data-q="' + sel + '"]').focus(); } e.preventDefault(); } }
  function pick(k) { sel = k; const t = k === "auto" ? autoTier : k, q = TIERS[t];
    root.querySelectorAll("[data-q]").forEach((b) => { b.setAttribute("aria-checked", String(b.dataset.q === k)); b.tabIndex = b.dataset.q === k ? 0 : -1; });
    const row = (a, b) => "<div><dt>" + a + "</dt><dd>" + b + "</dd></div>";
    root.querySelector(".tq-knobs").innerHTML = row("Particles", q.particles.toLocaleString()) + row("Simulation", q.simRes + "²") + row("Render scale", "up to " + q.dpr + "× · " + Math.round(q.renderScale * 100) + "%") +
      row("Bloom", q.bloom ? q.bloom + " passes" : "off") + row("Volumetrics", q.volSteps ? q.volSteps + " steps" : "off") + row("Shadows", q.shadow ? q.shadow + "px" : "off") + row("Anti-alias", q.aa ? q.aa + "× MSAA" : "off") + row("Frame cap", q.fps ? q.fps + " fps" : "none");
    root.querySelector(".tq-pvlbl").textContent = "Live preview · " + NAMES[t] + (k === "auto" ? " (Auto)" : "");
    const ap = root.querySelector(".tq-apply"); ap.textContent = sel === choice && !forced ? "Done" : "Apply & reload";
    preview.n = Math.min(q.particles, 2000000); preview.glow = q.bloom; preview.vol = q.volSteps; preview.scale = Math.min(devicePixelRatio || 1, q.dpr) * q.renderScale; preview.resize && preview.resize(); }
  function close() { if (!root) return; cancelAnimationFrame(raf); raf = 0; if (gl) { const lc = gl.getExtension("WEBGL_lose_context"); lc && lc.loseContext(); } gl = null; preview.resize = null;
    root.remove(); root = null; lastFocus && lastFocus.focus && lastFocus.focus(); }
  /* one WebGL2 context: a full-screen animated backdrop (holographic field) and a particle preview drawn with additive light.
     Particles are generated in the vertex shader from gl_VertexID, so 2M points cost no upload. */
  const preview = { n: 400000, glow: 2, vol: 32, scale: 1 };
  function start() {
    const bg = root.querySelector(".tq-gl"), pv = root.querySelector(".tq-pv");
    gl = pv.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true });
    const bctx = bg.getContext("2d");
    if (!gl) { root.querySelector(".tq-pvlbl").textContent = "Preview needs WebGL2"; return; }
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn("TitanQuality preview shader:", gl.getShaderInfoLog(o)); return o; };
    const mk = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; };
    const P = mk(`#version 300 es
      uniform float uT, uN, uA; out vec3 vC; out float vF;
      float h(float n){ uint x = uint(n) * 747796405u + 2891336453u; x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u; x = (x >> 22u) ^ x; return float(x) / 4294967295.0; }
      void main(){ float i = float(gl_VertexID), u = i / uN;
        float a = u * 6.2831 * 377.0 + uT * (0.15 + 0.35 * h(i)), r = 0.18 + 0.75 * pow(h(i + 1.0e7), 0.6);
        float arm = floor(h(i + 2.0e7) * 3.0) * 2.094; float jit = (h(i + 4.0e7) - 0.5) * (h(i + 5.0e7) - 0.5) * 3.0; float sw = arm + r * 5.5 + jit + a * 0.0 - uT * 0.3 / (0.3 + r);
        vec3 p = vec3(cos(sw) * r, (h(i + 3.0e7) - 0.5) * 0.12 * (1.2 - r), sin(sw) * r);
        p.xz += 0.035 * vec2(sin(p.z * 9.0 + uT), cos(p.x * 9.0 - uT * 1.3));
        float cy = cos(0.45), sy = sin(0.45); p = vec3(p.x, p.y * cy - p.z * sy, p.y * sy + p.z * cy);
        float z = p.z + 2.2; gl_Position = vec4(p.x / z * 3.4 / uA, p.y / z * 3.4 + 0.04, 0.0, 1.0);
        gl_PointSize = clamp(2.6 * sqrt(400000.0 / uN) / z * 2.2, 1.0, 7.0); vF = 1.0 / z;
        vC = mix(vec3(0.95, 0.72, 0.35), vec3(0.35, 0.75, 1.0), smoothstep(0.2, 0.9, r)); }`,
      `#version 300 es
      precision highp float; in vec3 vC; in float vF; uniform float uG, uF, uN; out vec4 o;
      void main(){ vec2 d = gl_PointCoord - 0.5; float k = exp(-dot(d, d) * (12.0 - uG * 2.0)); o = vec4(vC * k * (0.004 + 0.0015 * uG) * min(6.0, pow(400000.0 / uN, 0.6)) * uF, 1.0); }`);
    const V = gl.createVertexArray();
    const uT = gl.getUniformLocation(P, "uT"), uN = gl.getUniformLocation(P, "uN"), uA = gl.getUniformLocation(P, "uA"), uG = gl.getUniformLocation(P, "uG"), uF = gl.getUniformLocation(P, "uF");
    preview.resize = () => { const r = pv.getBoundingClientRect(), s = preview.scale; pv.width = Math.max(2, r.width * s | 0); pv.height = Math.max(2, r.height * s | 0);
      bg.width = Math.max(2, innerWidth / 4 | 0); bg.height = Math.max(2, innerHeight / 4 | 0); };
    preview.resize(); addEventListener("resize", () => preview.resize && preview.resize());
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fpsEl = root.querySelector(".tq-fps b"); let frames = 0, t0 = performance.now(), last = 0;
    const loop = (now) => { if (!gl) return; raf = requestAnimationFrame(loop);
      frames++; if (now - t0 > 500) { fpsEl.textContent = Math.round(frames * 1000 / (now - t0)); frames = 0; t0 = now; }
      const t = reduce ? 2 : now / 1000;
      /* backdrop: slow scan lines and a soft aurora, drawn small and scaled up by CSS blur */
      if (now - last > 50) { last = now; const w = bg.width, hh = bg.height, g = bctx.createLinearGradient(0, 0, w, hh);
        g.addColorStop(0, "rgba(6,10,18,0.96)"); g.addColorStop(0.5 + 0.2 * Math.sin(t * 0.3), "rgba(18,30,52,0.94)"); g.addColorStop(1, "rgba(4,6,12,0.97)"); bctx.fillStyle = g; bctx.fillRect(0, 0, w, hh);
        bctx.fillStyle = "rgba(120,190,255,0.05)"; for (let y = (t * 6) % 4; y < hh; y += 4) bctx.fillRect(0, y, w, 1); }
      gl.viewport(0, 0, pv.width, pv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(P); gl.bindVertexArray(V);
      gl.uniform1f(uT, t); gl.uniform1f(uN, preview.n); gl.uniform1f(uA, pv.width / pv.height); gl.uniform1f(uG, preview.glow); gl.uniform1f(uF, 1.0);
      gl.drawArrays(gl.POINTS, 0, preview.n); };
    raf = requestAnimationFrame(loop);
  }
  addEventListener("keydown", (e) => { if ((e.key === "G" || e.key === "g") && e.shiftKey && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")) panel(); });
  if (/[?&]graphics\b/.test(location.search)) (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", panel) : panel());
})();
