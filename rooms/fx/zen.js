/* fx/zen.js: Zen (zen), theme #52 v2, on the TitanFXK kit (Gemini, 2026-10-24).
   Bespoke Kyoto karesansui dry landscape courtyard with 3D analytical raked Shirakawa gravel ridges,
   moss-rimmed Kurama basalt islands, swaying bamboo moon-shadows, and a hand-chiselled tsukubai stone basin. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) {}
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) {}
    return "high";
  }
  var SEG = 12;
  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define LITE " + (lite ? 1 : 0),
    "uniform vec2 uRes; uniform float uT, uPh, uPort; uniform vec2 uPtr; uniform vec3 uTap; uniform float uNoShot;",
    "uniform sampler2D uCard, uShot; uniform vec4 uView; uniform float uMoss, uGravel, uSway;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  float A = uRes.x/uRes.y;",
    "  p.x -= uView.x; p.y -= uView.y; float zoom = exp(uView.z); p /= zoom;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 par = (uPtr - 0.5)*vec2(0.03, 0.03)*S;",
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.01 : -0.02) - par;",
    "  vec2 bp = (p - bCenter) / S;",
    "  float r = length(bp);",
    "  float a = atan(bp.y, bp.x);",
    "  vec2 rDir = bp / (r + 1e-5);",
    "  vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  float bRad = 0.226;",
    "  vec2 lXY = vec2(0.32*cos(uT*0.18), 0.28*sin(uT*0.15)) + (uPtr - 0.5)*vec2(0.45, 0.45);",
    "  vec3 L = normalize(vec3(lXY - bp, 0.46));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    "  float tapAge = uTap.z;",
    "  float shock = 0.0;",
    "  if(tapAge >= 0.0 && tapAge < 3.4){",
    "    float td = length(p - uTap.xy);",
    "    shock = cos(td*42.0 - tapAge*12.0) * exp(-tapAge*1.1) * exp(-td*4.2);",
    "  }",
    "  vec2 st2 = bp - vec2(0.34, 0.26);",
    "  float r2 = length(st2);",
    "  float ringWeight1 = exp(-max(0.0, r - bRad)*5.5);",
    "  float ringWeight2 = exp(-max(0.0, r2 - 0.06)*9.0);",
    "  float grooveField = mix(bp.y + 0.08*sin(bp.x*6.0), r, ringWeight1) - 0.05*ringWeight2;",
    "  float groovePhase = grooveField * 135.0;",
    "  float ridge = sin(groovePhase);",
    "  float ridgeSlope = cos(groovePhase);",
    "  float gravelSpeckle = fbm(bp*68.0) - 0.5;",
    "  vec2 gGrad = mix(vec2(0.0, 1.0), rDir, ringWeight1) * ridgeSlope * 0.72 + vec2(gravelSpeckle, -gravelSpeckle)*0.32;",
    "  vec3 gN = normalize(vec3(-gGrad, 1.0));",
    "  float gDiff = max(0.0, dot(gN, L));",
    "  float gSpec = pow(max(0.0, dot(gN, H)), 32.0);",
    "  vec3 shirakawa = vec3(0.11, 0.125, 0.115)*(0.45 + 0.75*gDiff + 0.12*ridge*uGravel) + vec3(0.76, 0.86, 0.72)*gSpec*0.28;",
    "  float sway = 0.018*sin(uT*0.75 + bp.y*2.5)*uSway;",
    "  float culm1 = smoothstep(0.014, 0.003, abs((bp.x - 0.36) + (bp.y - 0.10)*0.55 + 0.08*bp.y*bp.y + sway)) * step(-0.15, bp.y);",
    "  float culm2 = smoothstep(0.011, 0.002, abs((bp.x + 0.38) - (bp.y - 0.18)*0.65 + sway*0.8)) * step(0.05, bp.y);",
    "  vec2 lf1 = (bp - vec2(0.24 - sway, 0.32)) * mat2(0.86, -0.50, 0.50, 0.86);",
    "  float blade1 = smoothstep(0.022*(1.0 - clamp(abs(lf1.x)*7.0, 0.0, 1.0)), 0.0, abs(lf1.y)) * step(abs(lf1.x), 0.14);",
    "  vec2 lf2 = (bp - vec2(0.30 - sway, 0.22)) * mat2(0.64, 0.76, -0.76, 0.64);",
    "  float blade2 = smoothstep(0.020*(1.0 - clamp(abs(lf2.x)*8.0, 0.0, 1.0)), 0.0, abs(lf2.y)) * step(abs(lf2.x), 0.12);",
    "  float shadowMask = clamp((culm1 + culm2 + blade1 + blade2)*0.55, 0.0, 0.52) * smoothstep(bRad, bRad+0.06, r);",
    "  vec3 col = shirakawa * (1.0 - shadowMask*0.62);",
    "  if(r2 < 0.085){",
    "    float rockM = smoothstep(0.085, 0.055, r2 + 0.012*fbm(st2*24.0));",
    "    vec3 rkN = normalize(vec3(-st2/0.08, 1.0));",
    "    float rkDiff = max(0.0, dot(rkN, L));",
    "    vec3 rkCol = mix(vec3(0.12, 0.22, 0.11), vec3(0.08, 0.09, 0.08), smoothstep(0.06, 0.02, r2))*(0.5 + 0.7*rkDiff);",
    "    col = mix(col, rkCol, rockM);",
    "  }",
    "  float mossOuter = bRad + 0.052 + 0.014*fbm(bp*14.0);",
    "  if(r < mossOuter){",
    "    float mossRing = smoothstep(mossOuter, mossOuter - 0.014, r) * smoothstep(bRad, bRad + 0.018, r);",
    "    float mossTurf = fbm(bp*36.0);",
    "    vec3 mN = normalize(vec3(-rDir*(r - (bRad+0.025))*24.0 + (mossTurf - 0.5)*0.45, 1.0));",
    "    float mDiff = max(0.0, dot(mN, L));",
    "    vec3 mossCol = mix(vec3(0.10, 0.19, 0.09), vec3(0.28, 0.44, 0.22), mossTurf)*(0.48 + 0.72*mDiff);",
    "    col = mix(col, mossCol * uMoss, mossRing);",
    "  }",
    "  if(r < bRad + 0.018){",
    "    float bezel = smoothstep(bRad+0.018, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    float chisel = fbm3(bp*44.0) - 0.5;",
    "    vec3 bN = normalize(vec3(-rDir*(r - (bRad+0.005))*45.0 + vec2(chisel, -chisel)*0.3, 1.0));",
    "    float bDiff = max(0.0, dot(bN, L));",
    "    float bSpec = pow(max(0.0, dot(bN, H)), 28.0);",
    "    vec3 kuramaStone = vec3(0.26, 0.30, 0.25)*(0.45 + 0.75*bDiff) + vec3(0.78, 0.90, 0.72)*bSpec*0.42;",
    "    col = mix(col, kuramaStone, bezel);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5 + rDir*shock*0.010, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.6, 3.2, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    "      pic = pic / (1.0 + 0.36*pic);",
    "      float waterSheen = smoothstep(bRad*0.55, bRad, r) * exp(-abs(bp.x*0.7 + bp.y*0.7 - 0.04)*16.0)*0.07;",
    "      col = mix(col, pic*0.68 + vec3(0.76, 0.90, 0.72)*waterSheen, smoothstep(bRad, bRad-0.005, r));",
    "    }",
    "  }",
    "  float outerMask = smoothstep(bRad - 0.01, bRad + 0.03, r);",
    "  col += vec3(0.72, 0.88, 0.64) * max(0.0, shock) * (0.15 + 0.85*outerMask) * 0.28;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#b8d89a"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(192, 204, 192, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#151b15"); gr.addColorStop(1, "#090b09");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#eff4ee"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("raked shirakawa gravel & moss", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("in the karesansui courtyard", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#c0ccc0"; g.font = "italic 23px " + serif; g.fillText("— resting on the garden stone —", W / 2, 162);
    g.fillStyle = "#eff4ee"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#dcf0c8"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#c0ccc0"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  // shotFor draws ONLY the circular-clipped coin photograph inside the medallion bezel — never drawing text over the coin photo
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#151b15"); gr.addColorStop(1, "#090b09");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (img) {
      var iw = img.naturalWidth || img.width || 512, ih = img.naturalHeight || img.height || 512;
      var rad = 198, sc = Math.max((rad * 2) / iw, (rad * 2) / ih);
      var dw = iw * sc, dh = ih * sc;
      g.save();
      g.beginPath(); g.arc(W / 2, H / 2, rad, 0, Math.PI * 2); g.closePath(); g.clip();
      g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      g.restore();
      g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 2;
      g.beginPath(); g.arc(W / 2, H / 2, rad, 0, Math.PI * 2); g.stroke();
    }
    borderMedallion(g, W, H);
    return c;
  }

  K.mod("zen", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    function mkTex() {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 10, 12, 255]));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      return t;
    }
    var tCard = mkTex(), tShot = mkTex();
    function up(t, c) {
      gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    var coins = [], queue = [], next = null, seg = null, shown = null, pinned = false, dead = false, late = false;
    function prepare(e) { if (!e) return; var img = new Image(), nx = { e: e, img: img, ok: false }; img.onload = function () { nx.ok = true; }; img.src = e.thumb; next = nx; }
    function pick(si) { if (queue.length) return queue.shift(); if (!coins.length) return null; var h = Math.abs(Math.sin(si * 78.233) * 43758.5453) % 1; return coins[Math.floor(h * coins.length)]; }
    function show(nx) { up(tCard, cardFor(nx ? nx.e : null)); up(tShot, shotFor(nx ? nx.img : null)); shown = nx ? nx.e.scan : null; }
    try {
      fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) {
        if (dead) return;
        coins = (d.flips || []).filter(function (f) { return f.thumb; }).map(function (f) { return { scan: f.scan, thumb: f.thumb, label: f.label }; });
        if (!next && seg != null) prepare(pick(seg + 1));
      }).catch(function () {});
    } catch (e) {}
    function onCoin(ev) {
      var id = ev.detail && ev.detail.id;
      var e = coins.filter(function (x) { return x.scan === id; })[0];
      if (!e) return;
      pinned = true;
      var img = new Image();
      img.onload = function () { if (!dead) show({ e: e, img: img, ok: true }); };
      img.src = e.thumb;
    }
    addEventListener("titan:coin", onCoin);
    var seen = K.ptr.tap, tap = [9, 9, -99], ptr = [0.5, 0.5];
    return {
      name: "zen",
      step: function (c) {
        var P = c.ptr, v = c.view || {}, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var room = v.mode === "room", sway = room ? 0.5 : P.x || 0.5, swayY = room ? 0.5 : P.y || 0.5;
        ptr[0] += (sway - ptr[0]) * 0.08;
        ptr[1] += (swayY - ptr[1]) * 0.08;
        if (si !== seg) {
          pinned = false;
          if (seg == null) show(null);
          else if (next && next.ok) { show(next); next = null; } else late = true;
          seg = si;
          if (!next && coins.length) prepare(pick(si + 1));
        }
        if (late && next && next.ok) { late = false; if (ph < 0.45) { show(next); next = null; prepare(pick(si + 1)); } }
        if (P.tap !== seen) { seen = P.tap; var A = c.w / c.h; tap = [(P.tx - 0.5) * A, P.ty - 0.5, c.t]; }
      },
      draw: function (c) {
        var A = c.w / c.h, v = c.view || {}, now = Date.now() / 1000;
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t);
        gl.uniform1f(u.uPh, pinned ? 6.0 : (now % SEG));
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform4f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0);
        gl.uniform1f(u.uMoss, look("moss", 1)); gl.uniform1f(u.uGravel, look("gravel", 1)); gl.uniform1f(u.uSway, look("sway", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = K.view || {};
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0].map(function (x) { return +x.toFixed(3); }),
          look: { moss: look("moss", 1), gravel: look("gravel", 1), sway: look("sway", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.zen = {
    stack: [
      { mod: "zen" },
      { mod: "post", bloom: 0.44, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.025, grain: 0.03, vig: 0.32 }
    ],
    room: { name: "The dry garden courtyard", yaw: [-.15, .15], pitch: [-.12, .12], move: [-.4, .6], up: [-.08, .08],
      unit: "screen", sound: "sand",
      look: [
        { id: "moss", label: "Moss growth", min: 0, max: 2.5, def: 1 },
        { id: "gravel", label: "Rake depth", min: 0, max: 3, def: 1 },
        { id: "sway", label: "Bamboo sway", min: 0, max: 4, def: 1 }
      ],
      touch: "A tap on the gravel creates a ripple of focus and light.",
      opening: { dur: 5.5, from: { yaw: .12, pitch: -.096, move: -.32, up: .064 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.5, at: [0.5, 0.5] } }
  };
})();
