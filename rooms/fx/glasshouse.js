/* fx/glasshouse.js: The Glasshouse (glasshouse), theme #48 v2, on the TitanFXK kit (Gemini, 2026-10-24).
   Bespoke Victorian wrought-iron & curved steamed-glass palm house dome at midnight in tropical rain,
   with 16 arched iron ribs, scalloped spandrel filigree, raindrop trails, swaying palm fronds, and verdigris-brass specimen mount. */
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
    "uniform vec4 uView; uniform float uRain, uGlow, uSpeed;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p += uView.xy;",
    "  p *= (1.0 - uView.z * 0.4);",
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
    "  vec2 lXY = vec2(0.28*sin(uT*0.25*uSpeed), 0.24*cos(uT*0.22*uSpeed)) + (uPtr - 0.5)*vec2(0.45, 0.45);",
    "  vec3 L = normalize(vec3(lXY - bp, 0.48));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    "  float tapAge = uTap.z;",
    "  float shock = 0.0;",
    "  if(tapAge >= 0.0 && tapAge < 3.2){",
    "    float td = length(p - uTap.xy);",
    "    shock = cos(td*42.0 - tapAge*14.0) * exp(-tapAge*1.2) * exp(-td*4.2);",
    "  }",
    "  float ribs = 16.0;",
    "  float secA = (fract(a*ribs/6.2831853) - 0.5)*2.0;",
    "  float purlins = 5.0;",
    "  float purlR = (fract((r - bRad)*purlins) - 0.5)*2.0;",
    "  float dropCell = floor(a*48.0);",
    "  float dropSpeed = (0.18 + 0.12*h1(dropCell)) * uSpeed;",
    "  float dropR = fract(r*2.4 + uT*dropSpeed + h1(dropCell*3.1));",
    "  float dropTrail = smoothstep(0.35, 0.0, abs(fract(a*48.0) - 0.5)) * smoothstep(0.25, 0.0, dropR) * uRain;",
    "  vec2 paneGrad = rDir*(purlR*0.22 - dropTrail*0.35) + tDir*(secA*0.24);",
    "  vec3 gN = normalize(vec3(-paneGrad, 1.0));",
    "  vec2 botP = bp + gN.xy*0.035;",
    "  float frond1A = atan(botP.y - 0.32, botP.x + 0.36) + 0.04*sin(uT*0.7*uSpeed);",
    "  float frond1R = length(botP - vec2(-0.36, 0.32));",
    "  float leaflets1 = smoothstep(0.15, 0.65, sin(frond1A*28.0 + frond1R*12.0)) * smoothstep(0.62, 0.18, frond1R) * smoothstep(0.05, 0.15, frond1R);",
    "  float frond2A = atan(botP.y - 0.28, botP.x - 0.38) - 0.04*cos(uT*0.65*uSpeed);",
    "  float frond2R = length(botP - vec2(0.38, 0.28));",
    "  float leaflets2 = smoothstep(0.15, 0.65, sin(frond2A*26.0 - frond2R*11.0)) * smoothstep(0.64, 0.18, frond2R) * smoothstep(0.05, 0.15, frond2R);",
    "  float frond3A = atan(botP.y + 0.36, botP.x + 0.28) + 0.03*sin(uT*0.55*uSpeed);",
    "  float frond3R = length(botP - vec2(-0.28, -0.36));",
    "  float leaflets3 = smoothstep(0.20, 0.70, cos(frond3A*24.0 + frond3R*10.0)) * smoothstep(0.58, 0.16, frond3R);",
    "  float foliage = clamp(leaflets1 + leaflets2 + leaflets3*0.8, 0.0, 1.0);",
    "  float steam = fbm(bp*5.5 + vec2(0.0, uT*0.03*uSpeed)) * (1.0 - 0.35*dropTrail);",
    "  float lanternGlow = exp(-length(bp - lXY*0.5)*3.2) * uGlow;",
    "  vec3 nightSky = mix(vec3(0.025, 0.055, 0.048), vec3(0.06, 0.14, 0.11), steam);",
    "  vec3 palmCol = mix(vec3(0.03, 0.09, 0.06), vec3(0.14, 0.32, 0.21), steam*0.8 + lanternGlow*0.5);",
    "  vec3 col = mix(nightSky, palmCol, foliage*0.78);",
    "  col += vec3(0.88, 0.68, 0.34) * lanternGlow * (0.18 + 0.14*steam);",
    "  float glassSpec = pow(max(0.0, dot(gN, H)), 42.0);",
    "  col += vec3(0.75, 0.94, 0.84) * glassSpec * (0.28 + 0.45*dropTrail);",
    "  if(r >= bRad){",
    "    float ribDist = abs(secA) * (r * 3.14159 / ribs);",
    "    float mainRib = smoothstep(0.011, 0.004, ribDist);",
    "    float subRibDist = abs(fract(a*ribs*2.0/6.2831853) - 0.5) * (r * 3.14159 / ribs);",
    "    float subRib = smoothstep(0.005, 0.0015, subRibDist) * smoothstep(bRad+0.08, bRad+0.12, r);",
    "    float ring1 = smoothstep(0.009, 0.003, abs(r - (bRad + 0.085)));",
    "    float ring2 = smoothstep(0.010, 0.003, abs(r - (bRad + 0.185)));",
    "    float scallopR = bRad + 0.042 + 0.024*cos(a*ribs*2.0);",
    "    float filigree = smoothstep(0.006, 0.002, abs(r - scallopR)) * step(r, bRad + 0.085);",
    "    float ironMask = clamp(mainRib + subRib*0.75 + ring1 + ring2 + filigree*0.85, 0.0, 1.0);",
    "    vec2 ironGrad = tDir * sign(secA) * mainRib * 0.75 + rDir * sin((r - bRad)*purlins*6.283) * (ring1 + ring2) * 0.75;",
    "    vec3 iN = normalize(vec3(-ironGrad, 1.0));",
    "    float iDiff = max(0.0, dot(iN, L));",
    "    float iSpec = pow(max(0.0, dot(iN, H)), 48.0);",
    "    vec3 verdigrisIron = mix(vec3(0.04, 0.07, 0.06), vec3(0.18, 0.28, 0.24), iDiff) + vec3(0.82, 0.94, 0.86)*iSpec*0.62;",
    "    col = mix(col, verdigrisIron, ironMask);",
    "  }",
    "  if(r < bRad + 0.018){",
    "    float bezel = smoothstep(bRad+0.018, bRad+0.003, r) * smoothstep(bRad-0.006, bRad+0.003, r);",
    "    float fluting = 0.5 + 0.5*cos(a*64.0);",
    "    vec3 bN = normalize(vec3(-rDir*(r - (bRad+0.006))*45.0, 1.0));",
    "    float bDiff = max(0.0, dot(bN, L));",
    "    float bSpec = pow(max(0.0, dot(bN, H)), 36.0);",
    "    vec3 brassBezel = mix(vec3(0.22, 0.34, 0.26), vec3(0.76, 0.64, 0.36), 0.55 + 0.45*fluting)*(0.45 + 0.75*bDiff) + vec3(0.96, 0.90, 0.72)*bSpec*0.55;",
    "    col = mix(col, brassBezel, bezel);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5 + rDir*shock*0.010, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.6, 3.2, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    "      pic = pic / (1.0 + 0.36*pic);",
    "      float domeGlint = smoothstep(bRad*0.5, bRad, r) * exp(-abs(bp.x*0.7 + bp.y*0.7 - 0.05)*14.0)*0.08;",
    "      col = mix(col, pic*0.68 + vec3(0.78, 0.95, 0.86)*domeGlint, smoothstep(bRad, bRad-0.005, r));",
    "    }",
    "  }",
    "  float outerMask = smoothstep(bRad - 0.01, bRad + 0.03, r);",
    "  col += vec3(0.62, 0.92, 0.76) * max(0.0, shock) * (0.15 + 0.85*outerMask) * 0.28;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#8cd9b3"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(220, 195, 128, 0.48)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#12241d"); gr.addColorStop(1, "#060d0a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#edf5f0"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("steamed glass & wrought iron", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("under the midnight palm dome", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#b6ccc0"; g.font = "italic 23px " + serif; g.fillText("— in the botanical conservatory —", W / 2, 162);
    g.fillStyle = "#edf5f0"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#bae8d0"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#b6ccc0"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  // shotFor draws ONLY the circular-clipped coin photograph inside the medallion bezel — never drawing text over the coin photo
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#12241d"); gr.addColorStop(1, "#060d0a");
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

  K.mod("glasshouse", function (gl, s, K) {
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
      name: "glasshouse",
      step: function (c) {
        var v = c.view || {};
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var room = v.mode === "room";
        var targetPtrX = room ? 0.5 : (P.x || 0.5);
        var targetPtrY = room ? 0.5 : (P.y || 0.5);
        ptr[0] += (targetPtrX - ptr[0]) * 0.08;
        ptr[1] += (targetPtrY - ptr[1]) * 0.08;
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
        var yaw = v.yaw || 0, pitch = v.pitch || 0, move = v.move || 0, upVal = v.up || 0;
        var A = c.w / c.h, now = Date.now() / 1000;
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t);
        gl.uniform1f(u.uPh, pinned ? 6.0 : (now % SEG));
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform4f(u.uView, yaw, pitch, move, upVal);
        gl.uniform1f(u.uRain, look("rain", 1));
        gl.uniform1f(u.uGlow, look("glow", 1));
        gl.uniform1f(u.uSpeed, look("speed", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = K.view || {};
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)],
          look: { rain: look("rain", 1), glow: look("glow", 1), speed: look("speed", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.glasshouse = {
    stack: [
      { mod: "glasshouse" },
      { mod: "post", bloom: 0.46, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.03, grain: 0.03, vig: 0.32 }
    ],
    room: { name: "The Victorian conservatory dome", yaw: [-.15, .15], pitch: [-.12, .12], move: [-.4, .5], up: [-.08, .08],
      unit: "m", sound: "rainforest",
      look: [{ id: "rain", label: "Rain", min: 0, max: 2.5, def: 1, scape: "rain" }, { id: "glow", label: "Lantern Glow", min: 0.2, max: 2.5, def: 1 }, { id: "speed", label: "Frond Speed", min: 0.2, max: 3, def: 1 }],
      touch: "Tap the conservatory: a ripple of raindrops across the glass dome.",
      opening: { dur: 5.0, from: { yaw: 0, pitch: 0, move: -.32, up: .064 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.0, at: [.5, .5] } }
  };
})();
