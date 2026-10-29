/* fx/obsidian.js: Obsidian Sun (obsidian), theme #47 v2, on the TitanFXK kit (Gemini, 2026-10-24; plan in
   notes/agents/themes-37-50.md: "Volcanic glass, jade, a hammered gold sun. Obsidian mirror reflections, rotating gold calendar rings").
   v2 fixes from REVIEW from Claude (2026-10-24).txt:
   1. Analytical 3D surface normals (smooth per-pixel gradients, no 2x2 dFdx blockiness) and moving specular reflections for
      conchoidal volcanic glass, hammered solar gold relief, pointed cardinal/intercardinal sun rays, and curved Olmeca jadeite cabochons.
   2. Scaled to screen width (`S = min(1.0, A * 0.96)`) so all three calendar rings and solar rays fit inside a 390x844 phone screen without clipping.
   3. Tone-mapped coin photo inside the smoked obsidian mirror so it never burns out to white. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var SEG = 12;
  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define LITE " + (lite ? 1 : 0),
    "uniform vec2 uRes; uniform float uT, uPh, uPort, uViewYaw, uViewPitch, uViewMove, uViewUp, uSpin, uGlow, uFog, uWarm;",
    "uniform vec2 uPtr; uniform vec3 uTap; uniform float uNoShot;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p.x -= uViewYaw * 0.3;",
    "  p.y -= uViewPitch * 0.3;",
    "  p -= vec2(0.0, uViewUp * 0.1);",
    "  float zoom = exp(-uViewMove * 0.25);",   // move > 0 = toward the sun (world contract)
    "  p *= zoom;",
    "  float A = uRes.x/uRes.y;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 par = (uPtr - 0.5)*vec2(0.03, 0.03)*S;",
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.01 : -0.02) - par;",
    "  vec2 bp = (p - bCenter) / S;",
    "  float r = length(bp);",
    "  float a = atan(bp.y, bp.x);",
    "  vec2 rDir = bp / (r + 1e-5);",
    "  vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  float bRad = 0.225;",
    // Moving ceremonial torch + pointer light in 3D space
    "  vec2 lXY = vec2(0.34*cos(uT*0.38*uSpin), 0.30*sin(uT*0.31*uSpin)) + (uPtr - 0.5)*vec2(0.45, 0.45);",
    "  vec3 L = normalize(vec3(lXY - bp, 0.44));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    // Conchoidal volcanic glass (obsidian) with smooth analytical fracture normals & glassy Fresnel sheen
    "  float warp = fbm(bp*4.5)*0.65 + fbm3(bp*11.0)*0.35;",
    "  float phase = r*38.0 - warp*5.2 + a*2.0;",
    "  float conchSlope = cos(phase) * (0.45 + 0.35*sin(r*14.0 + warp*3.0));",
    "  vec3 obN = normalize(vec3(-rDir * conchSlope * 0.42, 1.0));",
    "  float obDiff = max(0.0, dot(obN, L));",
    "  float obSpec = pow(max(0.0, dot(obN, H)), 52.0);",
    "  float obFres = pow(1.0 - max(0.0, dot(obN, V)), 3.2);",
    "  vec3 col = (vec3(0.022, 0.019, 0.028)*(0.60 + 0.85*obDiff) + vec3(0.14, 0.11, 0.20)*obFres*0.58 + vec3(0.95, 0.86, 0.70)*obSpec*0.34) * uFog;",
    // 12-second wall-clock ratchet rotation
    "  float turn = smoothstep(0.0, 1.1, uPh);",
    "  turn = turn*turn*(3.0 - 2.0*turn);",
    "  float tapAge = uTap.z;",
    "  float shock = 0.0;",
    "  if(tapAge >= 0.0 && tapAge < 3.0){",
    "    float td = length(p - uTap.xy);",
    "    shock = cos(td*44.0 - tapAge*16.0) * exp(-tapAge*1.3) * exp(-td*4.5);",
    "  }",
    // Ring 1 (Inner Hammered Solar Gold Ring): 20 embossed Aztec day-sign cartouches with smooth analytical 3D bevels
    "  float r1In = bRad + 0.012, r1Out = bRad + 0.078;",
    "  if(r >= r1In && r <= r1Out){",
    "    float a1 = a + turn*1.570796 + sin(uT*0.15)*0.015;",
    "    float u1 = (fract(a1*20.0/6.2831853) - 0.5)*2.0;",
    "    float v1 = ((r - r1In)/(r1Out - r1In) - 0.5)*2.0;",
    "    float box = max(abs(u1)*0.82, abs(v1)*0.78);",
    "    float cartouche = smoothstep(0.76, 0.58, box);",
    "    float glyphRelief = sin(u1*4.5)*cos(v1*4.5)*smoothstep(0.55, 0.25, box);",
    "    float peen = fbm3(bp*42.0) - 0.5;",
    "    vec2 bevGrad = rDir*(v1*0.85 - sin(v1*4.5)*0.25) + tDir*(u1*0.85 - cos(u1*4.5)*0.25) + vec2(peen, -peen)*0.48;",
    "    vec3 gN = normalize(vec3(-bevGrad, 1.0));",
    "    float gDiff = max(0.0, dot(gN, L));",
    "    float gSpec = pow(max(0.0, dot(gN, H)), 38.0);",
    "    vec3 darkNiello = vec3(0.05, 0.038, 0.022);",
    "    vec3 gR = reflect(vec3(0.0, 0.0, -1.0), gN);",
    "    float gEnv = smoothstep(0.05, 0.85, gR.y*0.65 + gR.x*0.35 + 0.18*sin(uT*0.21 + a*3.0));",
    "    vec3 baseGold = (vec3(0.84, 0.61, 0.21)*(0.07 + 0.28*gDiff + 0.85*gEnv*gEnv + 0.10*glyphRelief) + vec3(1.0, 0.92, 0.66)*gSpec*0.90) * uGlow;",
    "    vec3 ring1Col = mix(darkNiello, baseGold, 0.20 + 0.80*cartouche);",
    "    float edge1 = smoothstep(r1In, r1In+0.004, r) * smoothstep(r1Out, r1Out-0.004, r);",
    "    col = mix(col, ring1Col, edge1);",
    "  }",
    // Ring 2 (Middle Carved Olmeca Jadeite Ring): 12 curved translucent jadeite cabochons with smooth analytical dome normals
    "  float r2In = bRad + 0.084, r2Out = bRad + 0.154;",
    "  if(r >= r2In && r <= r2Out){",
    "    float a2 = a - turn*1.047197 - sin(uT*0.12)*0.015;",
    "    float u2 = (fract(a2*12.0/6.2831853) - 0.5)*2.0;",
    "    float v2 = ((r - r2In)/(r2Out - r2In) - 0.5)*2.0;",
    "    float dome = max(0.0, 1.0 - (u2*u2*0.88 + v2*v2*0.96));",
    "    float cab = smoothstep(0.04, 0.22, dome);",
    "    float vein = fbm(bp*24.0 + 3.7);",
    "    vec2 jGrad = rDir*v2*0.95 + tDir*u2*0.88 + (vein - 0.5)*0.12;",
    "    vec3 jN = normalize(vec3(-jGrad, 1.0));",
    "    float jDiff = max(0.0, dot(jN, L));",
    "    float jSpec = pow(max(0.0, dot(jN, H)), 64.0);",
    "    float sss = pow(max(0.0, dot(-L, jN) + 0.65), 2.0)*0.32;",
    "    vec3 jadeAlb = mix(vec3(0.04, 0.24, 0.15), vec3(0.22, 0.64, 0.42), smoothstep(0.22, 0.78, vein));",
    "    vec3 jadeCol = jadeAlb*(0.40 + 0.78*jDiff + sss) + vec3(0.90, 1.0, 0.95)*jSpec*0.65;",
    "    vec3 goldSetting = vec3(0.70, 0.50, 0.18)*(0.10 + 0.35*jDiff) + vec3(1.0, 0.90, 0.62)*jSpec*0.55;",
    "    vec3 ring2Col = mix(goldSetting, jadeCol, cab);",
    "    float edge2 = smoothstep(r2In, r2In+0.004, r) * smoothstep(r2Out, r2Out-0.004, r);",
    "    col = mix(col, ring2Col, edge2);",
    "  }",
    // Ring 3 (Outer Hammered Solar Crown): 8 sharp cardinal/intercardinal triangular sun pointers + 8 secondary rays
    "  float r3In = bRad + 0.160, r3Out = bRad + 0.248;",
    "  if(r >= r3In && r <= r3Out){",
    "    float a3 = a + turn*0.785398;",
    "    float cell8 = (fract(a3*8.0/6.2831853) - 0.5)*2.0;",
    "    float cell16 = (fract((a3 + 0.392699)*8.0/6.2831853) - 0.5)*2.0;",
    "    float taper = (r - r3In) / (r3Out - r3In);",
    // Primary pointed ray tapers cleanly to 0 at tip (taper = 1.0)
    "    float halfW1 = max(0.0, 0.62*(1.0 - taper));",
    "    float inRay1 = smoothstep(halfW1 + 0.04, halfW1 - 0.02, abs(cell8));",
    // Secondary shorter dart between primary rays (reaches taper = 0.58)
    "    float taper2 = clamp(taper / 0.58, 0.0, 1.0);",
    "    float halfW2 = max(0.0, 0.36*(1.0 - taper2)) * step(taper, 0.58);",
    "    float inRay2 = smoothstep(halfW2 + 0.04, halfW2 - 0.02, abs(cell16));",
    // Continuous basal gold collar at r3In..r3In+0.018
    "    float collar = smoothstep(0.18, 0.12, taper);",
    "    float mask3 = max(collar, max(inRay1, inRay2));",
    "    float slopeT = (inRay1 >= inRay2) ? clamp(cell8 / (halfW1 + 0.05), -1.0, 1.0) : clamp(cell16 / (halfW2 + 0.05), -1.0, 1.0);",
    "    float peen3 = fbm3(bp*46.0) - 0.5;",
    "    vec3 rN = normalize(vec3(-tDir*slopeT*1.15 - rDir*0.30 + vec2(peen3, -peen3)*0.50, 1.0));",
    "    float rDiff = max(0.0, dot(rN, L));",
    "    float rSpec = pow(max(0.0, dot(rN, H)), 42.0);",
    "    vec3 rR = reflect(vec3(0.0, 0.0, -1.0), rN);",
    "    float rEnv = smoothstep(0.05, 0.85, rR.y*0.65 + rR.x*0.35 + 0.18*sin(uT*0.21 + a*2.0));",
    "    vec3 rayGold = (vec3(0.86, 0.62, 0.22)*(0.06 + 0.26*rDiff + 0.95*rEnv*rEnv) + vec3(1.0, 0.93, 0.70)*rSpec*0.95) * uGlow;",
    "    col = mix(col, rayGold, mask3 * smoothstep(r3In, r3In+0.004, r));",
    "  }",
    // Central Polished Obsidian Mirror Basin holding the active coin (unobstructed & tone-mapped)
    "  if(r < bRad + 0.012){",
    "    float bezel = smoothstep(bRad+0.012, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    float bSpec = pow(max(0.0, dot(rDir, normalize(lXY))), 4.0);",
    "    col = mix(col, (vec3(0.78, 0.58, 0.22) + vec3(0.98, 0.86, 0.52)*bSpec*0.45) * uGlow, bezel*0.90);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5 + rDir*shock*0.010, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.8, 3.4, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    "      pic = pic / (1.0 + 0.38*pic);",
    "      float edgeSheen = smoothstep(bRad*0.55, bRad, r) * exp(-abs(bp.x*0.8 + bp.y*0.6 - 0.04*sin(uT*0.5))*18.0)*0.08;",
    "      col = mix(col, pic*0.66 + vec3(0.92, 0.78, 0.44)*edgeSheen, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float mirrorMask = smoothstep(bRad - 0.01, bRad + 0.03, r);",
    "  col += vec3(0.96, 0.78, 0.34) * max(0.0, shock) * (0.15 + 0.85*mirrorMask) * 0.30;",
    "  col *= 1.0 - 0.34*smoothstep(0.44, 1.06, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col *= mix(vec3(1.0, 0.95, 0.85), vec3(1.05, 0.98, 0.90), uWarm - 1.0);",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#f0bc58"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(104, 224, 164, 0.5)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#1e1924"); gr.addColorStop(1, "#08070a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#f4efe6"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("volcanic glass & hammered gold", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("in the obsidian sun stone", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#cfc4b4"; g.font = "italic 23px " + serif; g.fillText("— locked in the sun stone —", W / 2, 162);
    g.fillStyle = "#f4efe6"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#fae0a0"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#cfc4b4"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
    return c;
  }
  function shotFor(img) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * 0.5, H * 0.48, 16, W * 0.5, H * 0.5, W * 0.52);
    gr.addColorStop(0, "#22242a"); gr.addColorStop(0.68, "#121318"); gr.addColorStop(1, "#07080b");
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

  K.mod("obsidian", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    function mkTex() {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 7, 9, 255]));
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
    var seen = K.ptr.tap, tap = [9, 9, -99], ptr = [0.5, 0.5];
    return {
      name: "obsidian",
      step: function (c) {
        var v = c.view || {};
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var room = v.mode === "room";
        ptr[0] += ((room ? 0.5 : (P.x || 0.5)) - ptr[0]) * 0.08;
        ptr[1] += ((room ? 0.5 : (P.y || 0.5)) - ptr[1]) * 0.08;
        if (si !== seg) {
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
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uPh, now % SEG);
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform1f(u.uViewYaw, v.yaw || 0); gl.uniform1f(u.uViewPitch, v.pitch || 0);
        gl.uniform1f(u.uViewMove, v.move || 0); gl.uniform1f(u.uViewUp, v.up || 0);
        gl.uniform1f(u.uSpin, look("spin", 1)); gl.uniform1f(u.uGlow, look("glow", 1));
        gl.uniform1f(u.uFog, look("fog", 1)); gl.uniform1f(u.uWarm, look("warm", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = K.view || {};
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)],
          look: { spin: look("spin", 1), glow: look("glow", 1), fog: look("fog", 1), warm: look("warm", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.obsidian = {
    stack: [
      { mod: "obsidian" },
      { mod: "post", bloom: 0.48, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.04, grain: 0.03, vig: 0.34 }
    ],
    room: { name: "The Obsidian Sun Stone", yaw: [-.3, .3], pitch: [-.25, .25], move: [-1.2, 1.5], up: [-.6, .6], unit: "screen", sound: "lava",
      look: [{ id: "spin", label: "Rotation", min: 0.2, max: 3, def: 1 }, { id: "glow", label: "Solar Gold", min: 0.2, max: 2, def: 1 },
        { id: "fog", label: "Obsidian Sheen", min: 0.5, max: 1.5, def: 1 }, { id: "warm", label: "Warmth", min: 0.8, max: 1.2, def: 1 }],
      touch: "Tap the mirror surface: ripples the obsidian glass and triggers a pulse wave.",
      opening: { dur: 5.0, from: { yaw: .24, pitch: -.2, move: -.96, up: .48 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.0, at: [0.5, 0.5] } }
  };
})();
