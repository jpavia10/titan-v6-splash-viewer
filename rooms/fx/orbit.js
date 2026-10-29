/* fx/orbit.js: Low Orbit (orbit), theme #49 v2, on the TitanFXK kit (Gemini, 2026-10-24).
   Bespoke machined aerospace Cupola observation window at 400 km altitude over Earth's curved Rayleigh airglow limb,
   nocturnal city-light constellations, 6 titanium structural struts, orbital reticle ticks, and fused-silica nadir coin mount. */
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
    "uniform vec4 uView; uniform float uAtm, uCity, uStar, uSpeed;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "void main(){",
    "  float t = uT * uSpeed;",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p = (p - vec2(uView.x, uView.y + uView.w)) * exp(-uView.z);",   // the room: pan (yaw, pitch, up) and zoom (move) in screen heights
    "  float A = uRes.x/uRes.y;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 par = (uPtr - 0.5)*vec2(0.035, 0.035)*S;",
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.01 : -0.02) - par;",
    "  vec2 bp = (p - bCenter) / S;",
    "  float r = length(bp);",
    "  float a = atan(bp.y, bp.x);",
    "  vec2 rDir = bp / (r + 1e-5);",
    "  vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  float bRad = 0.228;",
    "  vec2 lXY = vec2(0.36*cos(t*0.22), 0.28 + 0.10*sin(t*0.18)) + (uPtr - 0.5)*vec2(0.48, 0.48);",
    "  vec3 L = normalize(vec3(lXY - bp, 0.45));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    "  float tapAge = uTap.z;",
    "  float shock = 0.0;",
    "  if(tapAge >= 0.0 && tapAge < 3.0){",
    "    float td = length(p - uTap.xy);",
    "    shock = cos(td*46.0 - tapAge*16.0) * exp(-tapAge*1.3) * exp(-td*4.5);",
    "  }",
    "  vec2 earthCenter = vec2(-0.08 + par.x*0.6, -1.28 + par.y*0.6);",
    "  float earthR = 1.42;",
    "  float dEarth = length(bp - earthCenter) - earthR;",
    "  float onEarth = smoothstep(0.008, -0.012, dEarth);",
    "  float airglow1 = exp(-abs(dEarth - 0.012)*38.0) * uAtm;",
    "  float airglow2 = exp(-max(0.0, dEarth)*14.0) * uAtm;",
    "  float sunAng = atan(bp.y - earthCenter.y, bp.x - earthCenter.x);",
    "  float termFlare = exp(-abs(sunAng - (1.48 + (uPtr.x - 0.5)*0.35))*4.5) * exp(-abs(dEarth)*24.0) * uAtm;",
    "  vec2 geoUV = (bp - earthCenter)*3.4 + vec2(t*0.025, -t*0.01);",
    "  float landMask = smoothstep(0.42, 0.56, fbm(geoUV*1.2));",
    "  float cityGrid = fbm3(geoUV*14.0) * fbm3(geoUV*28.0 + 2.3);",
    "  float cities = smoothstep(0.26, 0.48, cityGrid) * landMask * smoothstep(0.0, -0.06, dEarth) * uCity;",
    "  float clouds = fbm(geoUV*2.8 + vec2(t*0.015, 0.0));",
    "  vec3 earthSurface = mix(vec3(0.012, 0.028, 0.058), vec3(0.03, 0.065, 0.12), clouds);",
    "  earthSurface += vec3(0.98, 0.76, 0.36) * cities * (1.0 - 0.5*clouds) * 0.85;",
    "  vec2 starCell = floor(bp*65.0);",
    "  vec2 starF = fract(bp*65.0) - 0.5;",
    "  float starH = h21(starCell);",
    "  float star = smoothstep(0.09, 0.01, length(starF - (vec2(starH, fract(starH*17.3)) - 0.5)*0.5)) * step(0.93, starH) * (1.0 - onEarth) * uStar;",
    "  vec3 spaceCol = vec3(0.01, 0.015, 0.025) + vec3(0.80, 0.90, 1.0)*star*0.65;",
    "  vec3 col = mix(spaceCol, earthSurface, onEarth);",
    "  col += vec3(0.16, 0.58, 0.98)*airglow2*0.42 + vec3(0.38, 0.90, 0.98)*airglow1*0.52 + vec3(1.0, 0.82, 0.46)*termFlare*0.48;",
    "  float frameIn = bRad + 0.145;",
    "  float strutDist = abs(fract(a*6.0/6.2831853) - 0.5) * (r * 3.14159 / 3.0);",
    "  float strut = smoothstep(0.022, 0.012, strutDist) * step(bRad + 0.016, r);",
    "  float outerHull = smoothstep(frameIn - 0.01, frameIn + 0.008, r);",
    "  float hullBevel = smoothstep(frameIn + 0.032, frameIn, r) * outerHull;",
    "  float panelSeam = smoothstep(0.006, 0.001, abs(fract(a*6.0/6.2831853)-0.5)*r) + smoothstep(0.006, 0.001, abs(r - (frameIn + 0.14)));",
    "  float pressureRing = smoothstep(0.016, 0.006, abs(r - (bRad + 0.024)));",
    "  float frameMask = clamp(outerHull + strut + pressureRing, 0.0, 1.0);",
    "  if(frameMask > 0.001){",
    "    float boltA = (fract(a*24.0/6.2831853) - 0.5)*2.0;",
    "    float boltR = (r - (frameIn + 0.028))*38.0;",
    "    float bolt = smoothstep(0.32, 0.18, length(vec2(boltA*0.65, boltR)));",
    "    vec2 tiGrad = rDir*(hullBevel - pressureRing)*0.85 + tDir*sign(fract(a*6.0/6.2831853)-0.5)*strut*0.75 - rDir*bolt*0.4;",
    "    vec3 tiN = normalize(vec3(-tiGrad, 1.0));",
    "    float tiDiff = max(0.0, dot(tiN, L));",
    "    float tiSpec = pow(max(0.0, dot(tiN, H)), 54.0);",
    "    vec3 tiCol = vec3(0.05, 0.065, 0.09)*(0.42 + 0.55*tiDiff)*(1.0 - 0.35*bolt - 0.25*panelSeam) + vec3(0.65, 0.86, 1.0)*tiSpec*(0.15 + 0.75*hullBevel + 0.65*strut + 0.65*pressureRing);",
    "    col = mix(col, tiCol, frameMask);",
    "  }",
    "  if(r >= bRad + 0.028 && r < frameIn){",
    "    float tick = smoothstep(0.003, 0.0008, abs(fract(a*36.0/6.2831853) - 0.5)*r) * smoothstep(0.018, 0.0, abs(r - (bRad + 0.082)));",
    "    float arcLine = smoothstep(0.0025, 0.0006, abs(r - (bRad + 0.082)));",
    "    col += vec3(0.38, 0.82, 0.98) * (tick*0.45 + arcLine*0.18);",
    "  }",
    "  if(r < bRad + 0.016){",
    "    float bezel = smoothstep(bRad+0.016, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    vec3 bN = normalize(vec3(-rDir*(r - (bRad+0.005))*52.0, 1.0));",
    "    float bSpec = pow(max(0.0, dot(bN, H)), 48.0);",
    "    vec3 tiBezel = vec3(0.24, 0.34, 0.46) + vec3(0.75, 0.92, 1.0)*bSpec*0.65;",
    "    col = mix(col, tiBezel, bezel);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5 + rDir*shock*0.010, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.6, 3.2, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    "      pic = pic / (1.0 + 0.36*pic);",
    "      float arCoat = smoothstep(bRad*0.52, bRad, r) * exp(-abs(bp.x*0.8 - bp.y*0.6 + 0.04)*16.0)*0.09;",
    "      col = mix(col, pic*0.68 + vec3(0.48, 0.86, 1.0)*arCoat, smoothstep(bRad, bRad-0.005, r));",
    "    }",
    "  }",
    "  float outerMask = smoothstep(bRad - 0.01, bRad + 0.03, r);",
    "  col += vec3(0.45, 0.88, 1.0) * max(0.0, shock) * (0.15 + 0.85*outerMask) * 0.30;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#78c8ff"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255, 205, 112, 0.48)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#0e1826"); gr.addColorStop(1, "#05080f");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#eef4fb"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("400 km above the night limb", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("in the cupola nadir window", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#b4c4d8"; g.font = "italic 23px " + serif; g.fillText("— in orbital freefall —", W / 2, 162);
    g.fillStyle = "#eef4fb"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#9ad8ff"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#b4c4d8"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  // shotFor draws ONLY the circular-clipped coin photograph inside the medallion bezel — never drawing text over the coin photo
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#0e1826"); gr.addColorStop(1, "#05080f");
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

  K.mod("orbit", function (gl, s, K) {
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
      name: "orbit",
      step: function (c) {
        var v = c.view || {};
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var room = v.mode === "room";
        ptr[0] += ((room ? 0.5 : (P.x || 0.5)) - ptr[0]) * 0.08;
        ptr[1] += ((room ? 0.5 : (P.y || 0.5)) - ptr[1]) * 0.08;
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
        gl.uniform4f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0);
        gl.uniform1f(u.uAtm, look("atmosphere", 1));
        gl.uniform1f(u.uCity, look("cities", 1));
        gl.uniform1f(u.uStar, look("stars", 1));
        gl.uniform1f(u.uSpeed, look("speed", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = K.view || {};
        return {
          tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)],
          look: { atmosphere: look("atmosphere", 1), cities: look("cities", 1), stars: look("stars", 1), speed: look("speed", 1) }
        };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.orbit = {
    stack: [
      { mod: "orbit" },
      { mod: "post", bloom: 0.48, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.04, grain: 0.025, vig: 0.34 }
    ],
    room: { name: "The Cupola window", yaw: [-.12, .12], pitch: [-.1, .1], move: [-.4, .5], up: [-.06, .06], unit: "screen", sound: "aurora",
      look: [{ id: "atmosphere", label: "Atmosphere", min: 0.2, max: 2, def: 1 }, { id: "cities", label: "City Lights", min: 0, max: 2.5, def: 1 }, { id: "stars", label: "Starlight", min: 0, max: 2, def: 1 }, { id: "speed", label: "Orbit Speed", min: 0, max: 3, def: 1 }],
      touch: "Tap the window: a ripple across the cupola glass.",
      opening: { dur: 5, from: { yaw: .096, pitch: -.08, move: -.3, up: .048 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3, at: [0.5, 0.5] } }
  };
})();
