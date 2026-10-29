/* fx/lightwell.js: Light Well (lightwell), theme #46 v2, on the TitanFXK kit (Gemini, 2026-10-24; plan in
   notes/agents/themes-37-50.md: "Raw concrete and one blade of sun. Board-formed concrete PBR, a moving sun blade, dust in the beam").
   v2 fixes from REVIEW from Claude (2026-10-24).txt:
   1. On phone & desktop, the sun blade sweeps across the coin during the shutter shift (uPh < 2.2s) and rests diagonally across the
      upper-left concrete wall and bezel rim rather than sitting over the coin face; volumetric beam haze is masked over the recessed
      plinth and the coin photo is tone-mapped so detail is never burned to white at 3, 6, or 9 s.
   2. Board-formed concrete lifted to cool architectural mineral grey with fine-grained aggregate and only a faint wood-form imprint. */
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
    "uniform vec2 uRes; uniform float uT, uPh, uPort; uniform vec2 uPtr; uniform vec3 uTap; uniform float uNoShot; uniform vec4 uView;",
    "uniform sampler2D uCard, uShot;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    // Board-formed architectural concrete: cool mineral grey, fine aggregate, faint formwork imprint, form-tie cones, analytical normal
    "vec4 concretePBR(vec2 p, out vec3 outN){",
    "  float plankH = 0.115;",
    "  float row = floor(p.y / plankH);",
    "  float fy = fract(p.y / plankH);",
    "  float seam = smoothstep(0.012, 0.0, fy) + smoothstep(0.988, 1.0, fy);",
    "  float vJoint = smoothstep(0.008, 0.0, abs(mod(p.x + row*0.32, 0.64) - 0.32));",
    "  float agg = fbm(p*52.0)*0.65 + fbm3(p*110.0)*0.35;",
    "  float imprint = fbm3(vec2(p.x*6.5 + row*4.1, p.y*18.0));",
    "  vec2 tieCell = vec2(mod(p.x + 0.16, 0.32) - 0.16, (fy - 0.5)*plankH);",
    "  float tieD = length(tieCell);",
    "  float tieCone = smoothstep(0.014, 0.004, tieD);",
    "  float tieInner = smoothstep(0.005, 0.002, tieD);",
    "  float tieRim = smoothstep(0.018, 0.012, tieD) * smoothstep(0.006, 0.012, tieD);",
    "  vec2 coneDir = tieCell / (tieD + 1e-5);",
    "  float seamSlope = (fy < 0.02 ? -1.0 : (fy > 0.98 ? 1.0 : 0.0)) * seam * 0.45;",
    "  vec2 nXY = coneDir * (tieCone - tieRim*0.5) * 0.55 + vec2((agg - 0.5)*0.18, seamSlope + (imprint - 0.5)*0.05);",
    "  outN = normalize(vec3(nXY, 1.0));",
    "  vec3 baseGrey = vec3(0.165, 0.172, 0.182) + (row - 2.0*floor(row*0.5))*vec3(0.005, 0.005, 0.006);",
    "  vec3 alb = baseGrey * (0.96 + 0.08*(agg - 0.5) + 0.03*(imprint - 0.5) - 0.22*seam - 0.15*vJoint - 0.36*tieCone - 0.25*tieInner + 0.08*tieRim);",
    "  return vec4(alb, 0.0);",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p += uView.xy;",
    "  p *= (1.0 - uView.z * 0.25);",
    "  p.y -= uView.w;",
    "  float A = uRes.x/uRes.y;",
    "  vec2 par = (uPtr - 0.5)*vec2(0.035, 0.025);",
    "  vec2 wp = p - par;",
    "  vec3 norm; vec4 cSurf = concretePBR(wp, norm);",
    // Ceiling aperture above left; during uPh < 2.2s the blade sweeps across the plinth, then rests on the upper-left wall & bezel
    "  vec2 slitOrigin = vec2(uPort > 0.5 ? -0.18 : -0.22*A, 0.56);",
    "  float sweep = (uPh < 2.2) ? sin(uPh / 2.2 * 3.14159265) * 0.26 : 0.0;",
    "  float restX = (uPort > 0.5 ? 0.08 : 0.18) + sweep + 0.02*sin(uT*0.22);",
    "  vec2 bDir = normalize(vec2(restX, -1.0));",
    "  vec2 bPerp = vec2(-bDir.y, bDir.x);",
    "  vec2 relP = wp - slitOrigin;",
    "  float along = dot(relP, bDir);",
    "  float across = dot(relP, bPerp);",
    "  float halfW = 0.042 + max(0.0, along)*0.095;",
    "  float inBlade = smoothstep(halfW + 0.045, halfW - 0.018, abs(across)) * step(0.0, along);",
    "  vec3 lightDir = normalize(vec3(slitOrigin - wp, 0.34));",
    "  float diff = max(0.0, dot(norm, lightDir));",
    "  float spec = pow(max(0.0, dot(reflect(-lightDir, norm), vec3(0.0, 0.0, 1.0))), 18.0);",
    // Cool daylight ambient on concrete + warm-neutral sun blade raking the mineral texture
    "  vec3 col = cSurf.rgb * (0.52 + 0.48*diff + 1.15*diff*inBlade) + vec3(0.95, 0.90, 0.78)*spec*inBlade*0.18;",
    // Cast concrete plinth in the center of the rotunda
    "  vec2 bCenter = vec2(0.0, uPort>0.5 ? -0.02 : -0.03) - par*0.8;",
    "  vec2 bp = p - bCenter;",
    "  float bRad = uPort>0.5 ? 0.185 : 0.245;",
    "  float bDist = length(bp);",
    "  if(bDist < bRad + 0.032){",
    "    float outerShadow = smoothstep(bRad+0.032, bRad+0.012, bDist);",
    "    float bevel = smoothstep(bRad+0.026, bRad+0.006, bDist) * smoothstep(bRad-0.006, bRad+0.006, bDist);",
    "    float sunGraze = max(0.0, dot(normalize(bp + 1e-4), normalize(slitOrigin - bCenter)));",
    "    vec3 bezelCol = vec3(0.13, 0.134, 0.14) + vec3(0.88, 0.76, 0.52)*pow(sunGraze, 2.2)*(0.35 + 0.65*inBlade);",
    "    col *= 1.0 - 0.35*outerShadow*(1.0 - step(bRad, bDist));",
    "    col = mix(col, bezelCol, bevel);",
    "    if(bDist < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.8, 3.4, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC, cardC, showCard);",
    // Tone-mapped raking light on the coin: capped so it never burns out to white
    "      float rimLight = smoothstep(0.4, 1.0, sunGraze) * inBlade * 0.18;",
    "      vec3 litPic = pic * (0.64 + 0.14*inBlade) + vec3(0.96, 0.88, 0.68)*rimLight*pic;",
    "      litPic = litPic / (1.0 + 0.38*litPic);",
    "      col = mix(col, litPic, smoothstep(bRad, bRad-0.005, bDist));",
    "    }",
    "  }",
    // Volumetric sun blade & swirling dust motes (attenuated over the recessed coin plinth so the coin never washes out)
    "  float plinthMask = smoothstep(bRad - 0.01, bRad + 0.04, bDist);",
    "  float tapAge = uTap.z;",
    "  vec2 swirl = vec2(0.0);",
    "  if(tapAge >= 0.0 && tapAge < 3.5){",
    "    vec2 tp = p - uTap.xy;",
    "    swirl = vec2(-tp.y, tp.x) * exp(-length(tp)*7.5) * exp(-tapAge*0.85) * 2.6;",
    "  }",
    "  vec2 hUV = wp*vec2(2.4, 3.2) + vec2(uT*0.02, -uT*0.015) + swirl;",
    "  #if LITE",
    "  float haze = fbm3(hUV);",
    "  #else",
    "  float haze = fbm(hUV)*0.65 + fbm3(hUV*2.8 - swirl)*0.35;",
    "  #endif",
    "  col += vec3(0.95, 0.84, 0.58) * inBlade * (0.08 + 0.28*haze*haze) * exp(-along*0.65) * (0.12 + 0.88*plinthMask) * 0.36;",
    "  #if !LITE",
    "  vec2 dg = (wp + swirl*0.25)*46.0 + vec2(uT*0.42, -uT*0.26);",
    "  vec2 did = floor(dg), df = fract(dg) - 0.5 - (h22(did) - 0.5)*0.65;",
    "  float mote = smoothstep(0.06, 0.0, length(df)) * step(0.915, h21(did)) * inBlade * (0.25 + 0.75*plinthMask);",
    "  col += vec3(1.0, 0.94, 0.78) * mote * 0.34;",
    "  #endif",
    "  col *= 1.0 - 0.34*smoothstep(0.42, 1.06, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#ecc468"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(247, 223, 158, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#1d1e22"); gr.addColorStop(1, "#0b0c0e");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#f2efe9"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("architectural sanctuary", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("concrete and one blade of sun", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#c8c3b8"; g.font = "italic 23px " + serif; g.fillText("— in the light well —", W / 2, 162);
    g.fillStyle = "#f2efe9"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#f7df9e"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#c8c3b8"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
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

  K.mod("lightwell", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    function mkTex() {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([14, 15, 17, 255]));
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
    var lastView = {};   // the view the world last drew (for debug)
    return {
      name: "lightwell",
      step: function (c) {
        var v = c.view || {}; lastView = v;
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var room = v.mode === "room";
        ptr[0] = room ? 0.5 : (ptr[0] + ((P.x || 0.5) - ptr[0]) * 0.08);
        ptr[1] = room ? 0.5 : (ptr[1] + ((P.y || 0.5) - ptr[1]) * 0.08);
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
        var v = c.view || {}; lastView = v;
        var A = c.w / c.h, now = Date.now() / 1000;
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uPh, now % SEG);
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform4f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = lastView;
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)],
          look: { dust: look("dust", 1), light: look("light", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.lightwell = {
    stack: [
      { mod: "lightwell" },
      { mod: "post", bloom: 0.48, threshold: 0.78, knee: 0.45, exposure: 0.96, aberr: 0.04, grain: 0.03, vig: 0.34 }
    ],
    room: { name: "The Concrete Rotunda", yaw: [-.12, .12], pitch: [-.1, .1], move: [-.4, .4], up: [-.08, .08],
      unit: "screen", sound: "cathedral",
      look: [{ id: "dust", label: "Dust Motes", min: 0, max: 3, def: 1 }, { id: "light", label: "Sunlight", min: .2, max: 2, def: 1 }],
      touch: "Tap the concrete or the coin: a soft ripple across the light well.",
      opening: { dur: 5, from: { yaw: .096, pitch: -.08, move: .3, up: -.064 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3, at: [.5, .5] } }
  };
})();
