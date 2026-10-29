/* fx/canopy.js: Cloud Forest (canopy), theme #44, v2 on the TitanFXK kit (Gemini, 2026-10-24; plan in
   notes/agents/themes-37-50.md: "Dripping cloud forest at dawn. Parallax canopy depth, volumetric god rays, fireflies").
   v2 changes per Claude's review (2026-10-24):
   1. Fixed negative tapAge at startup (tap initialized to [9,9,-99] and guarded by tapAge >= 0.0 && tapAge < 3.5 / 2.5).
   2. Replaced texture() inside if(bDist < bRad) with explicit textureLod(..., 0.0) to avoid undefined branch derivatives.
   3. Cleared the basin halo: all three frond layers fade out smoothly outside the basin (smoothstep(bRad+0.04, bRad+0.16, bDist))
      so no frond ever crosses the coin or plaque on desktop or phone.
   4. Replaced saw-tooth comb fronds with drooping Cyathea tree-fern fronds: overarching quadratic/cubic rachis droop, curved
      tapering pinnae with sub-pinnae lobes, warm-green subsurface light transmission where sun shafts cross the leaves, bright
      sunward rim highlights, far-layer depth blur and haze, and stronger volumetric god rays reaching the basin.
   5. Redesigned the botanical plaque as a circular medallion inscribed well within the round basin (r <= 0.66 of diameter)
      so denomination and country lines are never clipped on phone viewports. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var SEG = 12, DROP = 1.4;
  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define LITE " + (lite ? 1 : 0),
    "uniform vec2 uRes; uniform float uT, uPh, uPort; uniform vec2 uPtr; uniform vec3 uTap; uniform float uNoShot;",
    "uniform vec4 uView; uniform vec4 uLook;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    // Organic drooping Cyathea tree-fern frond returns vec2(signedDist, localThicknessAndVein)
    "vec2 fernFrond(vec2 p, float len, float wid, float sway, float droopDir){",
    "  float t = clamp(p.x/len, 0.0, 1.0);",
    // Natural gravity droop along the arching rachis + gentle wind wave
    "  float arch = droopDir * (0.14*t*t + 0.09*t*t*t) + sin(p.x*3.0 - sway)*0.028*t;",
    "  p.y -= arch;",
    "  if(p.x < -0.02 || p.x > len + 0.03) return vec2(1.0, 0.0);",
    "  float env = wid * pow(sin(clamp(t, 0.0, 1.0)*3.14159265), 0.75) * (1.0 - 0.28*t);",
    "  float rachisW = 0.0045*(1.0 - 0.65*t);",
    "  float rachis = abs(p.y) - rachisW;",
    // Curved tapering pinnae that sweep forward toward the tip and curl at their ends
    "  float py = abs(p.y);",
    "  float u = clamp(py / max(env, 1e-4), 0.0, 1.5);",
    "  float freq = 34.0;",
    "  float bend = 0.26*py + 0.95*py*py;",
    "  float localX = (p.x - bend)*freq;",
    "  float pinCell = (fract(localX) - 0.5)/freq;",
    // Sub-pinnae crenulation (tiny rounded pinnules along each pinna)
    "  float pinnule = 0.0016 * sin(py*210.0) * smoothstep(0.1, 0.8, u);",
    "  float pinHalfW = (0.0105*(1.0 - 0.32*t) * (1.0 - 0.55*u*u) + pinnule) * smoothstep(1.06, 0.78, u);",
    "  float pin = max(abs(pinCell) - pinHalfW, py - env);",
    "  float d = min(rachis, pin);",
    // Second component encodes leaf thinness (0 on thick stem, 1 toward translucent pinna tips)
    "  float trans = clamp(u*0.75 + 0.25*(1.0 - abs(pinCell)/max(pinHalfW, 1e-4)), 0.0, 1.0) * step(rachisW, py);",
    "  return vec2(d, trans);",
    "}",
    // Evaluates a canopy layer of 6 overarching fronds rooted outside the clearing
    "vec2 canopyLayer(vec2 p, float sc, float seed, float t, vec2 par){",
    "  vec2 q = p - par;",
    "  vec2 best = vec2(1.0, 0.0);",
    "  for(int i=0; i<6; i++){",
    "    float fi = float(i) + seed*7.0;",
    "    float side = (i<3) ? -1.0 : 1.0;",
    "    float row = float(i%3);",
    "    vec2 orig = vec2(side*(0.56 + 0.14*h1(fi*1.3)), 0.48 - row*0.30 + 0.07*h1(fi*2.1));",
    "    float ang = (side<0.0 ? -0.28 - row*0.14 : 3.42 + row*0.14) + (h1(fi*3.7)-0.5)*0.22 + 0.04*sin(t*0.65 + fi);",
    "    float cs = cos(ang), sn = sin(ang);",
    "    vec2 lp = (q - orig)*sc;",
    "    lp = vec2(cs*lp.x + sn*lp.y, -sn*lp.x + cs*lp.y);",
    "    vec2 f = fernFrond(lp, 0.64, 0.145, t*0.85 + fi, side);",
    "    f.x /= sc;",
    "    if(f.x < best.x) best = f;",
    "  }",
    "  return best;",
    "}",
    "void main(){",
    "  vec2 sp = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  vec2 p = (sp - vec2(uView.x, uView.y + uView.w)) * exp(-uView.z);",
    "  float A = uRes.x/uRes.y, px = 1.0/uRes.y;",
    "  vec2 par = (uPtr - 0.5)*vec2(0.055, 0.035);",
    // Rich dawn cloud-forest atmosphere
    "  vec3 skyTop = vec3(0.045, 0.125, 0.082);",
    "  vec3 skyBot = vec3(0.010, 0.026, 0.017);",
    "  vec3 col = mix(skyBot, skyTop, smoothstep(-0.55, 0.58, p.y));",
    // Basin geometry computed early so god rays & frond clearing mask reference it
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.02 : -0.03) - par*0.8;",
    "  vec2 bp = p - bCenter;",
    "  float bRad = uPort>0.5 ? 0.225 : 0.255;",
    "  float bDist = length(bp);",
    "  float clearMask = smoothstep(bRad + 0.035, bRad + 0.155, bDist);",
    // Volumetric crepuscular god rays slanting from upper-left canopy break down across the basin
    "  vec2 sunPos = vec2(-0.34*A, 0.64) - par*0.25;",
    "  vec2 toP = p - sunPos;",
    "  float rDist = length(toP);",
    "  float rAng = atan(toP.y, toP.x);",
    "  float s1 = 0.5 + 0.5*cos((rAng + 0.92)*14.0 + sin(rAng*5.0 + uT*0.15)*1.2);",
    "  float s2 = 0.5 + 0.5*sin((rAng + 0.85)*23.0 - uT*0.10);",
    "  float cone = smoothstep(-1.52, -0.42, rAng) * smoothstep(0.02, -0.52, rAng);",
    "  float shafts = (0.35*pow(s1, 1.8) + 0.65*pow(s1*s2, 2.4)) * cone;",
    "  vec2 mUV = p*vec2(2.0, 2.8) + vec2(uT*0.025, -uT*0.012);",
    "  #if LITE",
    "  float mist = fbm3(mUV) * uLook.y;",
    "  #else",
    "  float mist = (fbm(mUV)*0.65 + fbm3(mUV*2.6 - vec2(uT*0.018, 0.0))*0.35) * uLook.y;",
    "  #endif",
    "  float beam = shafts * (0.38 + 1.55*mist*mist) * exp(-rDist*0.78) * uLook.x;",
    // Far parallax canopy layer (soft depth blur + warm dawn haze)
    "  vec2 fFar = canopyLayer(p, 1.32, 1.0, uT*0.55, par*0.35);",
    "  float aFar = smoothstep(px*6.5, -px*4.5, fFar.x) * clearMask;",
    "  vec3 cFar = vec3(0.024, 0.068, 0.045) + vec3(0.16, 0.34, 0.14)*beam*0.6 + vec3(0.22, 0.46, 0.18)*fFar.y*beam*0.8;",
    "  col = mix(col, cFar, aFar*0.82);",
    // First volumetric scatter pass behind mid layer
    "  col += vec3(0.36, 0.66, 0.28) * beam * 0.34;",
    // Mid parallax canopy layer with subsurface sun transmission & sunward rim light
    "  vec2 fMid = canopyLayer(p, 1.0, 2.0, uT*0.75, par*0.75);",
    "  float aMid = smoothstep(px*2.2, -px*1.5, fMid.x) * clearMask;",
    "  float midRim = smoothstep(0.014, 0.0, abs(fMid.x)) * (0.35 + 1.6*beam);",
    "  vec3 cMid = vec3(0.015, 0.044, 0.026) + vec3(0.38, 0.72, 0.22)*fMid.y*(0.25 + 1.35*beam) + vec3(0.52, 0.86, 0.36)*midRim;",
    "  col = mix(col, cMid, aMid);",
    // Wet mossy basalt basin & rainwater lens in the clearing
    "  float dropAge = uPh;",
    "  float dropRip = 0.0;",
    "  if(dropAge >= 0.0 && dropAge < " + (DROP * 2.5).toFixed(2) + "){",
    "    float w = bDist*42.0 - dropAge*14.0;",
    "    dropRip += sin(w) * exp(-dropAge*1.35) * exp(-bDist*5.5) * smoothstep(0.0, 0.15, dropAge) * uLook.w;",
    "  }",
    "  float tapAge = uTap.z;",
    "  if(tapAge >= 0.0 && tapAge < 3.5){",
    "    float td = length(p - uTap.xy);",
    "    dropRip += sin(td*48.0 - tapAge*16.0) * exp(-tapAge*1.4) * exp(-td*6.0) * uLook.w;",
    "  }",
    "  if(bDist < bRad + 0.044){",
    "    float rim = smoothstep(bRad+0.044, bRad+0.016, bDist) * smoothstep(bRad-0.010, bRad+0.012, bDist);",
    "    float m1 = fbm3(bp*16.0), m2 = fbm3(bp*38.0 + 3.7);",
    "    float mossPatch = smoothstep(0.32, 0.68, m1*0.7 + m2*0.3);",
    "    vec3 basalt = vec3(0.026, 0.038, 0.032) * (0.7 + 0.6*m2);",
    "    vec3 mossCol = mix(vec3(0.06, 0.18, 0.07), vec3(0.22, 0.44, 0.14), m2) * (0.5 + 1.2*beam);",
    "    vec3 stone = mix(basalt, mossCol, mossPatch);",
    "    float sunFacing = max(0.0, dot(normalize(bp + 1e-4), normalize(vec2(-0.6, 0.8))));",
    "    stone += vec3(0.45, 0.72, 0.36)*pow(sunFacing, 3.5)*(0.35 + 0.8*beam);",
    "    col = mix(col, stone, rim);",
    "    if(bDist < bRad){",
    "      vec2 ruv = clamp(bp / (bRad*2.0) + 0.5 + normalize(bp + 1e-4)*dropRip*0.016, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(ruv.x, 1.0-ruv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(ruv.x, 1.0-ruv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.8, 3.4, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 poolPic = mix(shotC*vec3(0.92, 0.99, 0.93), cardC*vec3(0.90, 0.98, 0.88), showCard);",
    "      float fres = pow(clamp(bDist/bRad, 0.0, 1.0), 2.6);",
    "      vec3 water = mix(poolPic*0.64, vec3(0.10, 0.24, 0.16) + vec3(0.28, 0.52, 0.24)*beam, 0.24*fres);",
    "      water += vec3(0.42, 0.74, 0.36)*beam*0.18;",
    "      water += vec3(0.68, 0.94, 0.60)*max(0.0, dropRip)*0.32;",
    "      col = mix(col, water, smoothstep(bRad, bRad-0.008, bDist));",
    "    }",
    "  }",
    // Second volumetric god-ray pass in front of the basin
    "  col += vec3(0.42, 0.74, 0.32) * beam * 0.28;",
    // Near foreground fern layer (strictly masked outside the basin clearing by clearMask)
    "  vec2 fNear = canopyLayer(p, 0.78, 3.5, uT*1.0, par*1.2);",
    "  float aNear = smoothstep(px*1.4, -px*1.2, fNear.x) * clearMask;",
    "  float nearRim = smoothstep(0.009, 0.0, abs(fNear.x)) * (0.3 + 1.4*beam);",
    "  vec3 cNear = vec3(0.008, 0.024, 0.015) + vec3(0.34, 0.68, 0.20)*fNear.y*(0.2 + 1.25*beam) + vec3(0.55, 0.90, 0.38)*nearRim;",
    "  col = mix(col, cNear, aNear);",
    // Bioluminescent fireflies & dewdrops
    "  for(int i=0; i<14; i++){",
    "    float fi = float(i);",
    "    #if LITE",
    "    if(i>=7) break;",
    "    #endif",
    "    vec2 fp = vec2(0.52*A*sin(uT*0.32 + fi*2.1) + 0.16*cos(uT*0.71 + fi), 0.36*cos(uT*0.27 + fi*1.7) + 0.14*sin(uT*0.63 + fi*3.1));",
    "    if(tapAge >= 0.0 && tapAge < 2.5){ vec2 df = fp - uTap.xy; fp += normalize(df + 1e-4)*0.18*exp(-length(df)*4.0)*(1.0 - tapAge/2.5); }",
    "    float fd = length(p - fp);",
    "    float pulse = 0.35 + 0.65*pow(0.5 + 0.5*sin(uT*2.4 + fi*4.3), 3.0);",
    "    col += vec3(0.62, 0.96, 0.38) * pulse * (0.00042 / (fd*fd + 0.00085)) * uLook.z;",
    "  }",
    "  col *= 1.0 - 0.36*smoothstep(0.40, 1.04, length(sp*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.60));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  // Circular medallion plaque so the round rainwater basin never clips text on phone or desktop
  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#a6e27a"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(210, 244, 184, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#102419"); gr.addColorStop(1, "#050c08");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#e9f5ee"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("cloud forest reliquary", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("beneath the montane canopy", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#b8d4c3"; g.font = "italic 23px " + serif; g.fillText("— specimen in the basin —", W / 2, 162);
    g.fillStyle = "#e9f5ee"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    // Inscribed safe width inside the circular medallion (max width 330px at y=228)
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#d2f4b8"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#b8d4c3"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#1c3829"); gr.addColorStop(0.65, "#0c1b13"); gr.addColorStop(1, "#050b08");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (img) {
      g.save(); g.shadowColor = "rgba(0,0,0,0.85)"; g.shadowBlur = 26; g.shadowOffsetY = 10;
      var s = 330; g.drawImage(img, (W - s) / 2, (H - s) / 2, s, s); g.restore();
    }
    return c;
  }

  K.mod("canopy", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    function mkTex() {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([6, 13, 9, 255]));
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
    var coins = [], queue = [], next = null, seg = null, shown = null, dead = false, late = false;
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
    function onCoin(ev) { var id = ev.detail && ev.detail.id; var e = coins.filter(function (x) { return x.scan === id; })[0]; if (!e || shown === id) return; prepare(e); }
    addEventListener("titan:coin", onCoin);
    var seen = K.ptr.tap, tap = [9, 9, -99], ptr = [0.5, 0.5], camVals = [0, 0, 0, 0];
    return {
      name: "canopy",
      step: function (c) {
        var v = c.view || {}, room = v.mode === "room";
        camVals = [v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0];
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var px = room ? 0.5 : (P.x || 0.5);
        var py = room ? 0.5 : (P.y || 0.5);
        ptr[0] += (px - ptr[0]) * 0.08;
        ptr[1] += (py - ptr[1]) * 0.08;
        if (si !== seg) {
          if (seg == null) show(null);
          else if (next && next.ok) { show(next); next = null; } else late = true;
          seg = si;
          if (!next && coins.length) prepare(pick(si + 1));
        }
        if (late && next && next.ok) { late = false; if (ph < 0.45) { show(next); next = null; prepare(pick(si + 1)); } }
        if (P.tap !== seen) {
          seen = P.tap; var A = c.w / c.h;
          var tx = ((P.tx - 0.5) * A - camVals[0]) * Math.exp(-camVals[2]);
          var ty = (P.ty - 0.5 - (camVals[1] + camVals[3])) * Math.exp(-camVals[2]);
          tap = [tx, ty, c.t];
        }
      },
      draw: function (c) {
        var v = c.view || {};
        camVals = [v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0];
        var A = c.w / c.h, now = Date.now() / 1000;
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uPh, now % SEG);
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform4f(u.uView, camVals[0], camVals[1], camVals[2], camVals[3]);
        gl.uniform4f(u.uLook, look("rays", 1), look("mist", 1), look("fireflies", 1), look("ripples", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () { return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok), cam: camVals.map(function (x) { return +x.toFixed(3); }), look: { rays: look("rays", 1), mist: look("mist", 1), fireflies: look("fireflies", 1), ripples: look("ripples", 1) } }; },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.canopy = {
    stack: [
      { mod: "canopy" },
      { mod: "post", bloom: 0.85, threshold: 0.68, knee: 0.5, exposure: 1.04, aberr: 0.06, grain: 0.03, vig: 0.34 }
    ],
    room: {
      name: "The montane cloud forest basin",
      yaw: [-0.22, 0.22],     // kept so the medallion stays on a phone's screen at every limit
      pitch: [-0.16, 0.2],
      move: [-0.5, 0.6],
      up: [-0.1, 0.12],
      unit: "m",
      sound: "rainforest",
      look: [
        { id: "rays", label: "Sunbeams", min: 0, max: 2.5, def: 1 },
        { id: "mist", label: "Mist", min: 0, max: 2.5, def: 1 },
        { id: "fireflies", label: "Fireflies", min: 0, max: 3, def: 1 },
        { id: "ripples", label: "Ripples", min: 0, max: 2.5, def: 1 }
      ],
      touch: "Tap the clearing: creates ripples in the rainwater basin and scatters nearby fireflies.",
      opening: { dur: 5.0, from: { yaw: -0.18, pitch: 0.16, move: -0.45, up: -0.06 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.8, at: [0.5, 0.48] }
    }
  };
})();
