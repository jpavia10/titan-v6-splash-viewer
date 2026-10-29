/* fx/saltflat.js: Salt Mirror (saltflat), theme #45 v2, on the TitanFXK kit (Gemini, 2026-10-24; plan in
   notes/agents/themes-37-50.md: "Flooded salt flat, the sky doubled. Planar sky reflection, ripple rings from touch, hex salt crust").
   v2 fixes from REVIEW from Claude (2026-10-24).txt:
   1. Fixed shader newline separator (`\n` instead of `\\n`) so the WebGL2 program compiles cleanly on all devices.
   2. Verified upright coin/plaque above the horizon and inverted planar reflection below the horizon at phone (390x844) and desktop (1280x760). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var SEG = 12, STEP_RIP = 2.6;
  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define LITE " + (lite ? 1 : 0),
    "uniform vec2 uRes; uniform float uT, uPh, uPort; uniform vec2 uPtr; uniform vec3 uTap; uniform float uNoShot;",
    "uniform sampler2D uCard, uShot; uniform vec4 uView; uniform float uSalt, uGlow, uWind;",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    // Distance to nearest hexagonal salt-crust ridge in ground plane coordinates
    "float hexRidge(vec2 p){",
    "  const vec2 s = vec2(1.0, 1.7320508);",
    "  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0))/s.xyxy) + 0.5;",
    "  vec4 h = vec4(p - hC.xy*s, p - (hC.zw + 0.5)*s);",
    "  vec2 d = (dot(h.xy, h.xy) < dot(h.zw, h.zw)) ? h.xy : h.zw;",
    "  d = abs(d);",
    "  float hex = max(dot(d, s*0.5), d.x);",
    "  return 0.5 - hex;",
    "}",
    // Evaluates sky + rising coin medallion at sky-space position sp (where sp.y >= 0 above horizon)
    "vec3 sampleSkyAndCoin(vec2 sp, float horY, float bRad, float t, float uPh, float uNoShot){",
    "  float y = max(0.0, sp.y);",
    "  vec3 zen = vec3(0.025, 0.055, 0.115);",
    "  vec3 mid = vec3(0.075, 0.155, 0.275);",
    "  vec3 hor = vec3(0.28, 0.21, 0.24) + vec3(0.18, 0.12, 0.06)*exp(-abs(sp.x)*2.4);",
    "  vec3 sky = mix(hor, mid, smoothstep(0.0, 0.22, y));",
    "  sky = mix(sky, zen, smoothstep(0.18, 0.62, y));",
    "  float cir = fbm3(vec2(sp.x*2.4 + t*0.015, y*6.5));",
    "  sky += vec3(0.24, 0.22, 0.28) * smoothstep(0.42, 0.78, cir) * exp(-y*3.2) * 0.45 * uGlow;",
    "  #if !LITE",
    "  vec2 sg = floor((sp + vec2(0.0, 0.5))*95.0);",
    "  vec2 sf = fract((sp + vec2(0.0, 0.5))*95.0) - 0.5;",
    "  float st = smoothstep(0.08, 0.0, length(sf)) * step(0.965, h21(sg)) * smoothstep(0.12, 0.35, y);",
    "  sky += vec3(0.75, 0.88, 1.0) * st * (0.5 + 0.5*sin(t*2.2 + h21(sg)*12.0)) * uGlow;",
    "  #endif",
    "  vec2 cCenter = vec2(0.0, bRad + 0.018);",
    "  vec2 cp = sp - cCenter;",
    "  float cDist = length(cp);",
    "  if(cDist < bRad + 0.016){",
    "    float rim = smoothstep(bRad+0.016, bRad+0.004, cDist) * smoothstep(bRad-0.006, bRad+0.004, cDist);",
    "    sky = mix(sky, vec3(0.55, 0.78, 0.96), rim*0.82);",
    "    if(cDist < bRad){",
    "      vec2 cuv = clamp(cp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 shotC = textureLod(uShot, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      vec3 cardC = textureLod(uCard, vec2(cuv.x, 1.0 - cuv.y), 0.0).rgb;",
    "      float showCard = smoothstep(0.0, 0.45, uPh) * (1.0 - smoothstep(2.8, 3.4, uPh));",
    "      if(uNoShot > 0.5) showCard = 1.0;",
    "      vec3 pic = mix(shotC*vec3(0.96, 0.98, 1.02), cardC*vec3(0.94, 0.97, 1.0), showCard);",
    "      pic = pic / (1.0 + 0.32*pic);",
    "      sky = mix(sky, pic*0.66, smoothstep(bRad, bRad-0.006, cDist));",
    "    }",
    "  }",
    "  return sky;",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
    "  p = (p - vec2(0., uView.w)) * exp(-uView.z);",   // move > 0 = toward the medallion (world contract)
    "  p.x += uView.x; p.y += uView.y;",
    "  float A = uRes.x/uRes.y;",
    "  vec2 par = (uPtr - 0.5)*vec2(0.04, 0.02);",
    "  float horY = (uPort > 0.5 ? -0.02 : -0.04) - par.y;",
    "  float bRad = uPort > 0.5 ? 0.165 : 0.195;",
    "  vec2 sp = vec2(p.x - par.x, p.y - horY);",
    "  vec3 col;",
    "  if(sp.y >= 0.0){",
    "    col = sampleSkyAndCoin(sp, horY, bRad, uT, uPh, uNoShot);",
    "  } else {",
    "    float depth = max(0.008, -sp.y);",
    "    vec2 gnd = vec2(sp.x / depth, 1.0 / depth) * 0.32;",
    "    vec2 gWarp = gnd + 0.08*vec2(vn(gnd*1.8), vn(gnd*1.8 + 5.2));",
    "    float hr = hexRidge(gWarp * 1.45);",
    "    float crustRidge = smoothstep(0.075, 0.0, hr) * exp(-depth*3.0) * uSalt;",
    "    vec2 ripGrad = vec2(0.0);",
    "    if(uPh >= 0.0 && uPh < " + (STEP_RIP * 2.2).toFixed(2) + "){",
    "      vec2 dp = p - vec2(par.x, horY - 0.06);",
    "      dp.y *= 2.4;",
    "      float rd = length(dp);",
    "      float w = rd*46.0 - uPh*14.0;",
    "      float amp = cos(w) * exp(-uPh*1.15) * exp(-rd*4.5) * smoothstep(0.0, 0.15, uPh);",
    "      ripGrad += normalize(dp + 1e-4) * amp * 0.020;",
    "    }",
    "    float tapAge = uTap.z;",
    "    if(tapAge >= 0.0 && tapAge < 3.5){",
    "      vec2 tp = p - uTap.xy;",
    "      tp.y *= 2.0;",
    "      float td = length(tp);",
    "      float w2 = td*52.0 - tapAge*16.0;",
    "      float amp2 = cos(w2) * exp(-tapAge*1.25) * exp(-td*5.0);",
    "      ripGrad += normalize(tp + 1e-4) * amp2 * 0.024;",
    "    }",
    "    float windRip = sin(gnd.y*12.0 - uT*1.6 + sin(gnd.x*4.0))*0.0025*smoothstep(0.0, 0.25, depth) * uWind;",
    "    vec2 reflP = vec2(sp.x + ripGrad.x + windRip, -sp.y + ripGrad.y);",
    "    vec3 reflSky = sampleSkyAndCoin(reflP, horY, bRad, uT, uPh, uNoShot);",
    "    float fres = 0.72 + 0.26*exp(-depth*4.5);",
    "    vec3 saltBase = vec3(0.05, 0.09, 0.15) + vec3(0.46, 0.68, 0.88)*crustRidge*0.42;",
    "    col = mix(saltBase, reflSky, fres);",
    "    col += vec3(0.58, 0.82, 1.0) * max(0.0, ripGrad.y*16.0) * 0.40;",
    "  }",
    "  col += vec3(0.45, 0.68, 0.92) * exp(-abs(sp.y)*180.0) * 0.26;",
    "  col *= 1.0 - 0.34*smoothstep(0.42, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  col = min(col, vec3(0.58));",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n"); };

  function borderMedallion(g, W, H) {
    var cx = W / 2, cy = H / 2;
    g.strokeStyle = "#8fd4ff"; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(196, 233, 255, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 210, 0, Math.PI * 2); g.stroke();
  }
  function cardFor(e) {
    var W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#122238"); gr.addColorStop(1, "#060b14");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); borderMedallion(g, W, H);
    g.fillStyle = "#eef4fc"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) {
      g.font = "italic 500 24px " + serif; g.fillText("altiplano salt mirror", W / 2, 178);
      g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
      g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
      g.font = "italic 22px " + serif; g.fillText("the sky and collection doubled", W / 2, 352);
      return c;
    }
    var parts = String(e.label || "").split(" · ");
    g.fillStyle = "#b8cae0"; g.font = "italic 23px " + serif; g.fillText("— mirrored on the brine —", W / 2, 162);
    g.fillStyle = "#eef4fc"; var t = (parts[0] || "").toUpperCase(), fs = 46;
    g.font = "600 " + fs + "px " + serif;
    while (fs > 22 && g.measureText(t).width > 330) { fs -= 2; g.font = "600 " + fs + "px " + serif; }
    g.fillText(t, W / 2, 226);
    var sub = (parts[1] || "") + (parts[2] ? " · " + parts[2] : ""), sfs = 32;
    g.fillStyle = "#c4e9ff"; g.font = "500 " + sfs + "px " + serif;
    while (sfs > 18 && g.measureText(sub).width > 330) { sfs -= 2; g.font = "500 " + sfs + "px " + serif; }
    g.fillText(sub, W / 2, 286);
    g.fillStyle = "#b8cae0"; g.font = "italic 22px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 346);
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

  K.mod("saltflat", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    function mkTex() {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([7, 11, 18, 255]));
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
      name: "saltflat",
      step: function (c) {
        var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG;
        var v = c.view || {};
        var sway = v.mode === "room" ? 0 : 1;
        ptr[0] += (((P.x || 0.5) - ptr[0]) * 0.08) * sway;
        ptr[1] += (((P.y || 0.5) - ptr[1]) * 0.08) * sway;
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
        var A = c.w / c.h, now = Date.now() / 1000, v = c.view || {};
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uPh, now % SEG);
        gl.uniform1f(u.uPort, A < 1 ? 1 : 0); gl.uniform2f(u.uPtr, ptr[0], ptr[1]);
        gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1);
        gl.uniform4f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0);
        gl.uniform1f(u.uSalt, look("salt", 1)); gl.uniform1f(u.uGlow, look("glow", 1)); gl.uniform1f(u.uWind, look("wind", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = TitanFXK.view || {};
        return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
          cam: [v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0].map(function (x) { return +x.toFixed(3); }),
          look: { salt: look("salt", 1), glow: look("glow", 1), wind: look("wind", 1) } };
      },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); }
    };
  });
  K.themes.saltflat = {
    stack: [
      { mod: "saltflat" },
      { mod: "post", bloom: 0.52, threshold: 0.76, knee: 0.45, exposure: 0.98, aberr: 0.04, grain: 0.03, vig: 0.34 }
    ],
    room: { name: "The Altiplano Mirror", yaw: [-.15, .15], pitch: [-.1, .1], move: [-.3, .4], up: [-.06, .06],
      unit: "screen", sound: "sand",
      look: [
        { id: "salt", label: "Salt Crust", min: 0, max: 3, def: 1 },
        { id: "glow", label: "Sky Glow", min: 0, max: 2.5, def: 1 },
        { id: "wind", label: "Wind Ripples", min: 0, max: 4, def: 1 }
      ],
      touch: "A tap on the flooded surface sends out a ripple ring from that point.",
      opening: { dur: 5.0, from: { yaw: -.12, pitch: .08, move: .32, up: -.048 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.5, at: [0.5, 0.3] } }
  };
})();
