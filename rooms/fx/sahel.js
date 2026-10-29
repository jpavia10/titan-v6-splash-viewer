/* fx/sahel.js: Sahel Futurism (sahel), theme #50 v2, on the TitanFXK kit (Gemini, 2026-10-24).
   Bespoke Sudano-Sahelian carved rammed-earth adobe buttresses, projecting toron timber beams, indigo inlay,
   and rotating hammered-brass solar astrolabe rings with Agadez cardinal pointers. */
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
    "uniform vec2 uRes; uniform float uT, uPh, uPort, uZoom, uYaw, uPitch, uUp, uHaze, uGlow, uSpeed; uniform vec2 uPtr; uniform vec3 uTap; uniform float uNoShot;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p.x -= uYaw * 0.4; p.y -= uPitch * 0.4;",
    "  p *= (1.0 - uZoom * 0.35);",
    "  p.y -= uUp * 0.35;",
    "  float A = uRes.x/uRes.y;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 par = (uPtr - 0.5)*vec2(0.035, 0.035)*S;",
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.01 : -0.02) - par;",
    "  vec2 bp = (p - bCenter) / S;",
    "  float r = length(bp);",
    "  float a = atan(bp.y, bp.x);",
    "  vec2 rDir = bp / (r + 1e-5);",
    "  vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  float bRad = 0.226;",
    "  vec2 lXY = vec2(0.35*cos(uT*0.24*uSpeed), 0.32*sin(uT*0.20*uSpeed)) + (uPtr - 0.5)*vec2(0.45, 0.45);",
    "  vec3 L = normalize(vec3(lXY - bp, 0.42));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    "  float turn = smoothstep(0.0, 1.1, uPh); turn = turn*turn*(3.0 - 2.0*turn);",
    "  float tapAge = uTap.z;",
    "  float shock = 0.0;",
    "  if(tapAge >= 0.0 && tapAge < 3.0){",
    "    float td = length(p - uTap.xy);",
    "    shock = cos(td*42.0 - tapAge*15.0) * exp(-tapAge*1.3) * exp(-td*4.2);",
    "  }",
    "  float plaster = fbm(bp*18.0)*0.6 + fbm3(bp*42.0)*0.4;",
    "  float pilasterX = sin(bp.x*22.0);",
    "  float chevron = sin(bp.x*36.0 + abs( fract(bp.y*8.0) - 0.5 )*12.0);",
    "  float adobeRelief = 0.45*pilasterX + 0.30*chevron*smoothstep(bRad+0.12, bRad+0.28, r) + 0.25*(plaster - 0.5);",
    "  vec2 adGrad = vec2(cos(bp.x*22.0)*0.55, (plaster - 0.5)*0.4);",
    "  vec3 adN = normalize(vec3(-adGrad, 1.0));",
    "  float adDiff = max(0.0, dot(adN, L));",
    "  vec3 terracotta = mix(vec3(0.075, 0.038, 0.026), vec3(0.24, 0.115, 0.068), 0.35 + 0.65*adDiff + 0.12*adobeRelief);",
    "  vec2 toronGrid = fract(bp*vec2(5.0, 7.0)) - 0.5;",
    "  float toronPeg = smoothstep(0.14, 0.07, length(toronGrid)) * step(bRad + 0.16, r);",
    "  float toronShadow = smoothstep(0.18, 0.06, length(toronGrid - normalize(lXY)*0.12)) * step(bRad + 0.16, r);",
    "  vec3 col = terracotta * (1.0 - 0.45*toronShadow);",
    "  col = mix(col, vec3(0.12, 0.07, 0.04)*(0.5 + 0.6*adDiff), toronPeg);",
    "  float astIn = bRad + 0.012, astOut = bRad + 0.155;",
    "  if(r >= astIn && r <= astOut){",
    "    float aRot = a + turn*1.047197 + (uPtr.x - 0.5)*0.25;",
    "    float degTick = smoothstep(0.32, 0.0, abs(fract(aRot*72.0/6.2831853) - 0.5));",
    "    float band1 = smoothstep(0.014, 0.004, abs(r - (bRad + 0.036)));",
    "    float band2 = smoothstep(0.016, 0.005, abs(r - (bRad + 0.092)));",
    "    float band3 = smoothstep(0.012, 0.004, abs(r - (bRad + 0.142)));",
    "    float armCell = abs(fract(aRot*8.0/6.2831853) - 0.5)*2.0;",
    "    float armW = 0.16 + 0.08*sin((r - astIn)*42.0);",
    "    float arm = smoothstep(armW + 0.03, armW - 0.02, armCell);",
    "    float brassMask = clamp(band1 + band2 + band3 + arm*0.88, 0.0, 1.0);",
    "    vec2 brGrad = rDir*sin((r - astIn)*85.0)*0.55 + tDir*(armCell)*arm*0.65 + (plaster - 0.5)*0.25;",
    "    vec3 brN = normalize(vec3(-brGrad, 1.0));",
    "    float brDiff = max(0.0, dot(brN, L));",
    "    float brSpec = pow(max(0.0, dot(brN, H)), 44.0);",
    "    vec3 indigoInlay = vec3(0.04, 0.06, 0.14)*(0.6 + 0.4*plaster);",
    "    vec3 brassCol = vec3(0.80, 0.54, 0.22)*(0.42 + 0.85*brDiff - 0.18*degTick) + vec3(1.0, 0.88, 0.58)*brSpec*0.72*uGlow;",
    "    vec3 dialCol = mix(indigoInlay, brassCol, brassMask);",
    "    col = mix(col, dialCol, smoothstep(astIn, astIn+0.004, r) * smoothstep(astOut, astOut-0.004, r));",
    "  }",
    "  if(r < bRad + 0.014){",
    "    float bezel = smoothstep(bRad+0.014, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    vec3 bN = normalize(vec3(-rDir*(r - (bRad+0.004))*48.0, 1.0));",
    "    float bSpec = pow(max(0.0, dot(bN, H)), 40.0);",
    "    col = mix(col, vec3(0.82, 0.56, 0.24) + vec3(1.0, 0.88, 0.56)*bSpec*0.55*uGlow, bezel);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5 + rDir*shock*0.010, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.6, 3.2, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    "      pic = pic / (1.0 + 0.36*pic);",
    "      float sunGlint = smoothstep(bRad*0.55, bRad, r) * exp(-abs(bp.x*0.75 + bp.y*0.65 - 0.04)*16.0)*0.08*uGlow;",
    "      col = mix(col, pic*0.68 + vec3(0.96, 0.76, 0.42)*sunGlint, smoothstep(bRad, bRad-0.005, r));",
    "    }",
    "  }",
    "  float outerMask = smoothstep(bRad - 0.01, bRad + 0.03, r);",
    "  col += vec3(0.96, 0.68, 0.32) * max(0.0, shock) * (0.15 + 0.85*outerMask) * 0.30;",
    "  col *= (1.0 - (uHaze - 1.0) * 0.15);",   // haze 1 (the default) = the backdrop as it was
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#e89b54"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(116, 158, 232, 0.48)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#24140e"); gr.addColorStop(1, "#0c0705");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#f6efe8"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("rammed earth & brass astrolabe", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("in the saharan solar court", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#ccb8a8"; g.font = "italic 23px " + serif; g.fillText("— aligned in the solar dial —", W / 2, 162);
    g.fillStyle = "#f6efe8"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#f4b978"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#ccb8a8"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  // shotFor draws ONLY the circular-clipped coin photograph inside the medallion bezel — never drawing text over the coin photo
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#24140e"); gr.addColorStop(1, "#0c0705");
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

  K.mod("sahel", function (gl, s, K) {
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
      name: "sahel",
      step: function (c) {
        var v = c.view || {};
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var room = v.mode === "room";
        var swayX = room ? 0.5 : (P.x || 0.5);
        var swayY = room ? 0.5 : (P.y || 0.5);
        ptr[0] += (swayX - ptr[0]) * 0.08;
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
        var v = c.view || {};
        var A = c.w / c.h, now = Date.now() / 1000;
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t);
        gl.uniform1f(u.uPh, pinned ? 6.0 : (now % SEG));
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform1f(u.uZoom, v.move || 0);
        gl.uniform1f(u.uYaw, v.yaw || 0);
        gl.uniform1f(u.uPitch, v.pitch || 0);
        gl.uniform1f(u.uUp, v.up || 0);
        gl.uniform1f(u.uHaze, look("haze", 1));
        gl.uniform1f(u.uGlow, look("glow", 1));
        gl.uniform1f(u.uSpeed, look("speed", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = {};
        try { v = window.TitanFXK && window.TitanFXK.view || {}; } catch(e){}
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [+(v.yaw||0).toFixed(3), +(v.pitch||0).toFixed(3), +(v.move||0).toFixed(3), +(v.up||0).toFixed(3)],
          look: { haze: look("haze", 1), glow: look("glow", 1), speed: look("speed", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.sahel = {
    stack: [
      { mod: "sahel" },
      { mod: "post", bloom: 0.48, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.03, grain: 0.035, vig: 0.34 }
    ],
    room: { name: "The Saharan Solar Court", yaw: [-.3, .3], pitch: [-.25, .25], move: [-.5, .5], up: [-.2, .2], unit: "screen", sound: "sand",
      look: [{ id: "haze", label: "Desert Haze", min: 0, max: 2, def: 1 }, { id: "glow", label: "Astrolabe Glow", min: 0.2, max: 2, def: 1 }, { id: "speed", label: "Rotation Speed", min: 0, max: 3, def: 1 }],
      touch: "Tap the astrolabe: a ripple across the solar court.",
      opening: { dur: 5, from: { yaw: .24, pitch: -.2, move: -.4, up: .16 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.5, at: [0.5, 0.5] } }
  };
})();
