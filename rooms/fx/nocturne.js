/* fx/nocturne.js: Nocturne (nocturne), theme #51 v2, on the TitanFXK kit (Gemini, 2026-10-24).
   Bespoke candlelit Parisian recital salon over a concert grand piano's gilded cast-iron harp,
   overstrung vibrating copper-wound bass & steel treble strings, Sitka spruce soundboard, and French-lacquered rosewood rim. */
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
    "uniform vec2 uRes; uniform float uT, uPh, uPort, uGlow, uVib, uWarm; uniform vec2 uPtr, uView; uniform vec3 uTap; uniform float uNoShot;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p -= uView;",
    "  float A = uRes.x/uRes.y;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 par = (uPtr - 0.5)*vec2(0.032, 0.032)*S;",
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.01 : -0.02) - par;",
    "  vec2 bp = (p - bCenter) / S;",
    "  float r = length(bp);",
    "  float a = atan(bp.y, bp.x);",
    "  vec2 rDir = bp / (r + 1e-5);",
    "  vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  float bRad = 0.226;",
    "  float flicker = 0.94 + 0.06*sin(uT*6.2)*cos(uT*9.7);",
    "  vec2 c1XY = vec2(-0.32, 0.26) + (uPtr - 0.5)*vec2(0.38, 0.38) + 0.012*vec2(sin(uT*2.7), cos(uT*3.1));",
    "  vec3 L = normalize(vec3(c1XY - bp, 0.44));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    "  float tapAge = uTap.z;",
    "  float shock = 0.0, stringPluck = 0.0;",
    "  if(tapAge >= 0.0 && tapAge < 3.4){",
    "    float td = length(p - uTap.xy);",
    "    shock = cos(td*44.0 - tapAge*16.0) * exp(-tapAge*1.3) * exp(-td*4.5);",
    "    stringPluck = exp(-tapAge*1.4);",
    "  }",
    "  float spruceGrain = sin((bp.x*0.7 + bp.y*0.7)*140.0 + fbm(bp*6.0)*2.5)*0.5 + 0.5;",
    "  vec3 soundboard = mix(vec3(0.045, 0.028, 0.018), vec3(0.095, 0.058, 0.032), spruceGrain*0.65);",
    "  float uTreb = bp.x*0.848 + bp.y*0.530;",
    "  float vTreb = -bp.x*0.530 + bp.y*0.848;",
    "  float trebVib = 0.0025 * uVib * sin(vTreb*18.0 + uT*24.0) * (0.25 + 0.75*stringPluck);",
    "  float trebPhase = (uTreb + trebVib)*125.0;",
    "  float trebWire = smoothstep(0.15, 0.85, cos(trebPhase));",
    "  vec3 trebN = normalize(vec3(-0.848*sin(trebPhase)*0.75, -0.530*sin(trebPhase)*0.75, 1.0));",
    "  float trebSpec = pow(max(0.0, dot(trebN, H)), 56.0) * trebWire;",
    "  float uBass = bp.x*0.914 - bp.y*0.407;",
    "  float bassMask = smoothstep(0.26, 0.14, abs(uBass - 0.12)) * step(bRad + 0.02, r);",
    "  float bassVib = 0.0035 * uVib * sin(bp.y*14.0 - uT*19.0) * (0.3 + 0.7*stringPluck);",
    "  float bassPhase = (uBass + bassVib)*78.0;",
    "  float bassWire = smoothstep(0.10, 0.88, cos(bassPhase)) * bassMask;",
    "  vec3 bassN = normalize(vec3(-0.914*sin(bassPhase)*0.82, 0.407*sin(bassPhase)*0.82, 1.0));",
    "  float bassDiff = max(0.0, dot(bassN, L));",
    "  float bassSpec = pow(max(0.0, dot(bassN, H)), 42.0) * bassWire;",
    "  vec3 col = soundboard + vec3(0.55, 0.58, 0.65)*trebWire*0.22 + vec3(0.96, 0.86, 0.65)*trebSpec*0.65*flicker;",
    "  vec3 copperBass = vec3(0.76, 0.44, 0.22)*(0.45 + 0.75*bassDiff) + vec3(1.0, 0.82, 0.52)*bassSpec*0.75*flicker;",
    "  col = mix(col, copperBass, bassWire*0.88);",
    "  float harpRib = smoothstep(0.018, 0.007, abs(fract((a + 0.4)*5.0/6.2831853) - 0.5)*r) * step(bRad + 0.015, r) * step(r, bRad + 0.18);",
    "  float harpRing = smoothstep(0.022, 0.008, abs(r - (bRad + 0.165)));",
    "  float portA = (fract(a*8.0/6.2831853) - 0.5)*2.0;",
    "  float portR = (r - (bRad + 0.095))*18.0;",
    "  float harpPlate = smoothstep(0.55, 0.68, length(vec2(portA*0.75, portR))) * smoothstep(bRad+0.02, bRad+0.04, r) * smoothstep(bRad+0.18, bRad+0.15, r);",
    "  float goldMask = clamp(harpRib + harpRing + harpPlate*0.65, 0.0, 1.0);",
    "  if(goldMask > 0.001){",
    "    float castTex = fbm3(bp*38.0) - 0.5;",
    "    vec3 hN = normalize(vec3(-rDir*sin((r - bRad)*45.0)*0.45 + vec2(castTex, -castTex)*0.25, 1.0));",
    "    float hDiff = max(0.0, dot(hN, L));",
    "    float hSpec = pow(max(0.0, dot(hN, H)), 38.0);",
    "    vec3 harpGold = vec3(0.68, 0.50, 0.20)*(0.38 + 0.78*hDiff) + vec3(1.0, 0.88, 0.58)*hSpec*0.62*flicker;",
    "    col = mix(col, harpGold, goldMask*0.82);",
    "  }",
    "  if(r > bRad + 0.175){",
    "    float rimMask = smoothstep(bRad + 0.175, bRad + 0.195, r);",
    "    vec3 rwN = normalize(vec3(-rDir*0.55, 1.0));",
    "    float rwSpec = pow(max(0.0, dot(rwN, H)), 72.0);",
    "    vec3 rosewood = vec3(0.038, 0.018, 0.022) + vec3(0.98, 0.78, 0.42)*rwSpec*0.55*flicker;",
    "    col = mix(col, rosewood, rimMask*0.85);",
    "  }",
    "  if(r < bRad + 0.018){",
    "    float bezel = smoothstep(bRad+0.018, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    float rosette = 0.5 + 0.5*cos(a*48.0)*sin(r*180.0);",
    "    vec3 bN = normalize(vec3(-rDir*(r - (bRad+0.005))*46.0, 1.0));",
    "    float bSpec = pow(max(0.0, dot(bN, H)), 42.0);",
    "    vec3 rosCol = mix(vec3(0.45, 0.32, 0.14), vec3(0.84, 0.66, 0.30), rosette) + vec3(1.0, 0.90, 0.62)*bSpec*0.60;",
    "    col = mix(col, rosCol, bezel);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5 + rDir*shock*0.010, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.6, 3.2, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    "      pic = pic / (1.0 + 0.36*pic);",
    "      float candleSheen = smoothstep(bRad*0.55, bRad, r) * exp(-abs(bp.x*0.7 + bp.y*0.7 - 0.04)*16.0)*0.08;",
    "      col = mix(col, pic*0.68 + vec3(0.98, 0.82, 0.48)*candleSheen, smoothstep(bRad, bRad-0.005, r));",
    "    }",
    "  }",
    "  float outerMask = smoothstep(bRad - 0.01, bRad + 0.03, r);",
    "  col += vec3(0.96, 0.78, 0.40) * max(0.0, shock) * (0.15 + 0.85*outerMask) * 0.30 * uGlow;",
    "  col *= 1.0 - 0.34*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = mix(col, col * vec3(1.1, 1.0, 0.85), uWarm - 1.0);",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#e6be6a"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(196, 189, 212, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#181422"); gr.addColorStop(1, "#07070c");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#f2eff8"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("candlelit rosewood & gilded harp", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("in the late-night recital salon", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#c4bdd4"; g.font = "italic 23px " + serif; g.fillText("— on the concert soundboard —", W / 2, 162);
    g.fillStyle = "#f2eff8"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#f5d78e"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#c4bdd4"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  // shotFor draws ONLY the circular-clipped coin photograph inside the medallion bezel — never drawing text over the coin photo
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#181422"); gr.addColorStop(1, "#07070c");
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

  K.mod("nocturne", function (gl, s, K) {
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
      name: "nocturne",
      step: function (c) {
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var v = c.view || {}, room = v.mode === "room";
        var sx = room ? 0.5 : P.x, sy = room ? 0.5 : P.y;
        ptr[0] += ((sx || 0.5) - ptr[0]) * 0.08;
        ptr[1] += ((sy || 0.5) - ptr[1]) * 0.08;
        if (si !== seg) {
          pinned = false;
          if (seg == null) show(null);
          else if (next && next.ok) { show(next); next = null; } else late = true;
          seg = si;
          if (!next && coins.length) prepare(pick(si + 1));
        }
        if (late && next && next.ok) { late = false; if (ph < 0.45) { show(next); next = null; prepare(pick(si + 1)); } }
        if (P.tap !== seen) { seen = P.tap; var A = c.w / c.h; tap = [(P.tx - 0.5) * A - (v.yaw || 0), P.ty - 0.5 - (v.pitch || 0), c.t]; }
      },
      draw: function (c) {
        var A = c.w / c.h, now = Date.now() / 1000, v = c.view || {};
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t);
        gl.uniform1f(u.uPh, pinned ? 6.0 : (now % SEG));
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform2f(u.uView, v.yaw || 0, v.pitch || 0);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform1f(u.uGlow, look("glow", 1)); gl.uniform1f(u.uVib, look("vib", 1)); gl.uniform1f(u.uWarm, look("warm", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = (window.TitanFXK && window.TitanFXK.view) || {};
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)],
          look: { glow: look("glow", 1), vib: look("vib", 1), warm: look("warm", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.nocturne = {
    stack: [
      { mod: "nocturne" },
      { mod: "post", bloom: 0.46, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.03, grain: 0.03, vig: 0.34 }
    ],
    room: { name: "The candlelit recital salon", yaw: [-.12, .12], pitch: [-.1, .1], move: [0, 0], up: [0, 0],
      unit: "screen", sound: "fireflies",
      look: [{ id: "glow", label: "Candlelight", min: 0, max: 3, def: 1 }, { id: "vib", label: "Vibration", min: 0, max: 4, def: 1 }, { id: "warm", label: "Warmth", min: 0.5, max: 2, def: 1 }],
      touch: "A tap on the soundboard creates a ripple of vibration and a golden glow.",
      opening: { dur: 5.5, from: { yaw: 0, pitch: -.08, move: 0, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.5, at: [0.5, 0.48] } }
  };
})();
