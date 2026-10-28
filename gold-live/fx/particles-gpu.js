/* fx/particles-gpu.js  [2026-10-28: + shock impulses (K.shock / K.shk, up to 6 decaying blasts with a travelling front), K.bass curl gain, s.shock/s.swirl, tier sizing via K.tierSide]
  : GPGPU particle field for TitanFXK (shared, reusable; Grok 2026-10-20).
   WebGL2 ping-pong float textures: state = (x, y, life, seed) per texel; an update pass moves every particle through a flow field
   (drift + gravity + curl noise + a decaying "rake" velocity texture written by touch/drag + flow around obstacle circles, i.e. the
   coins on screen); the draw pass reads the state with texelFetch(gl_VertexID) and draws shaped point sprites.
   Sizes: desktop 1024² (1M) × s.count, phone 512² (262k), Lite 256² (65k); the governor (TitanFXK.quality) trims the drawn count.
   Stack options (fx/themes.js): count, curl, scale, speed, drift [x,y], gravity, life, spawn "any"|"top"|"bottom"|"ring",
   rake, obstacles, size, shape "dot"|"petal"|"streak"|"goo"|"spark"|"mote", c1, c2, alpha, blend "add"|"alpha", glint, depth. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  K.mod("particles", function (gl, s, K) {
    if (!K.halfRT) return null;
    var phone = Math.min(screen.width, screen.height) < 820, lite = (function () { try { return localStorage.getItem("tr_lite_v1") === "1"; } catch (e) { return false; } })();
    var TS = K.tierSide ? K.tierSide() : 0; var big = screen.width * (window.devicePixelRatio || 1) >= 2500 && !phone; var side = lite ? 256 : big ? 1448 : 1024;   /* ultrawide / desktop GPU: ~2M;  rule: full fidelity on phones too (1M) */
    var mult = (s.count == null ? 1 : s.count) * (function () { var m = /[?&]fxkscale=([0-9.]+)/.exec(location.search); return m ? +m[1] : 1; })();   /* ?fxkscale= for CPU-rendered review shots */
    if (TS) side = TS; side = Math.max(16, Math.round(side * Math.sqrt(mult)));
    var N = side * side, IF = K.floatRT ? gl.RGBA32F : gl.RGBA16F, TY = K.floatRT ? gl.FLOAT : gl.HALF_FLOAT;
    function tex(w, h, ifmt, fmt, type, data) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
    var init = new Float32Array(N * 4); for (var i = 0; i < N; i++) { init[i * 4] = Math.random(); init[i * 4 + 1] = Math.random(); init[i * 4 + 2] = Math.random(); init[i * 4 + 3] = Math.random(); }
    var initData = K.floatRT ? init : (function () { var h = new Uint16Array(N * 4), f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
      for (var j = 0; j < h.length; j++) { f32[0] = init[j]; var x = u32[0], e = ((x >> 23) & 255) - 112, m = (x >> 13) & 1023; h[j] = e <= 0 ? 0 : (e << 10) | m; } return h; })();
    var A = [tex(side, side, IF, gl.RGBA, TY, initData), tex(side, side, IF, gl.RGBA, TY, initData)];
    var FB = A.map(function (t) { var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; });
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
    var RS = 64, R = [tex(RS, RS, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null), tex(RS, RS, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null)];
    R.forEach(function (t) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); });
    var RF = R.map(function (t) { var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return f; });
    var cur = 0, rc = 0;
    var HEAD = "#version 300 es\nprecision highp float;\n" + K.NOISE;
    var rake = K.compile(K.FSQ, HEAD + [
      "uniform sampler2D uR; uniform vec2 uP, uV; uniform float uDown, uAsp, uDt; out vec4 o;",
      "void main(){ vec2 uv = gl_FragCoord.xy/64.; vec4 r = texture(uR, uv)*exp(-uDt*.55);",   // the wake fades over ~2 s
      "  vec2 d = (uv-uP)*vec2(uAsp,1.); float g = exp(-dot(d,d)/.0035)*uDown;",
      "  r.xy += uV*g*.9; r.z = max(r.z*exp(-uDt*.4), g); o = r; }"].join("\n"));
    var upd = K.compile(K.FSQ, HEAD + [
      "uniform sampler2D uS, uR, uF; uniform float uFluidK, uT, uDt, uAsp, uCurl, uScale, uSpeed, uGrav, uLife, uRake, uSpawn, uObsK; uniform vec2 uDrift; uniform vec4 uObs[8]; uniform int uObsN; uniform vec4 uShk[6]; uniform float uBass, uShkK, uSwirl; out vec4 o;",
      "vec2 field(vec2 p){ vec2 q = p*vec2(uAsp,1.);",
      "  vec2 v = uDrift + vec2(0.,-uGrav) + curl(q*uScale, uT*uSpeed)*uCurl*.02*(1.+uBass*2.5);",
      "  for (int i=0;i<6;i++){ vec4 k = uShk[i]; if (k.z < .002) continue; vec2 d = (p-k.xy)*vec2(uAsp,1.); float L = length(d)+1e-4; vec2 n = d/L;",
      "    float ring = k.w*.9, f = exp(-L*L/.06)*.6 + exp(-(L-ring)*(L-ring)/.004);",   /* core blast + travelling shock front */
      "    v += (n + vec2(-n.y,n.x)*uSwirl)*k.z*f*uShkK; }",
      "  v += texture(uR, p).xy*uRake; if (uFluidK > 0.) v += texture(uF, p).xy*uFluidK*.0015;",
      "  for (int i=0;i<8;i++){ if (i>=uObsN) break; vec2 d = (p-uObs[i].xy)*vec2(uAsp,1.); float r = uObs[i].z, L = length(d);",
      "    if (L < r*1.8){ vec2 n = d/max(L,1e-4), tg = vec2(-n.y,n.x)*sign(dot(vec2(-n.y,n.x), v)+1e-4); float k = smoothstep(r*1.8, r, L)*uObsK;",
      "      v = mix(v, tg*length(v)*1.25 + n*.02, k); if (L < r) v += n*(r-L)*6.*uObsK; } }",
      "  return v; }",
      "void main(){ ivec2 ij = ivec2(gl_FragCoord.xy); vec4 s = texelFetch(uS, ij, 0); vec2 p = s.xy;",
      "  vec2 v = field(p); vec2 mid = p + v*uDt*.5; p += field(mid)*uDt;",   // midpoint step: smooth streamlines
      "  float life = s.z - uDt*uLife*(.6+.8*s.w);",
      "  bool out_ = p.x < -.05 || p.x > 1.05 || p.y < -.05 || p.y > 1.05;",
      "  if (life <= 0. || out_){ vec2 r = h22(vec2(s.w*91.7, uT*1.37+float(ij.x)*.013+float(ij.y)*.0071));",
      "    p = r; if (uSpawn == 1.) p.y = 1.02; else if (uSpawn == 2.) p.y = -.02; else if (uSpawn == 3.) { float a = r.x*6.2832; p = vec2(.5)+vec2(cos(a)/uAsp,sin(a))*(.05+.04*r.y); }",
      "    if (out_ && uSpawn == 0.) { if (p.x < 0. || p.x > 1.) p.x = fract(p.x); }",
      "    life = 1.; }",
      "  o = vec4(p, life, s.w); }"].join("\n"));
    var shapes = { dot: 0, petal: 1, streak: 2, goo: 3, spark: 4, mote: 5 };
    var drw = K.compile([
      "#version 300 es\nprecision highp float; uniform sampler2D uS; uniform float uSize, uT, uDepth, uGlint, uDpr; uniform int uSide; out vec3 vC; out float vA, vSeed, vRot;",
      "uniform vec3 uC1, uC2; uniform float uAlpha;",
      "float hh(float n){ return fract(sin(n)*43758.5453); }",
      "void main(){ int id = gl_VertexID; vec4 s = texelFetch(uS, ivec2(id % uSide, id / uSide), 0);",
      "  gl_Position = vec4(s.xy*2.-1., 0., 1.);",
      "  float z = mix(1., .35+1.3*hh(s.w*13.1), uDepth);",          // depth: near grains bigger & brighter, far smaller & dimmer (depth of field)
      "  gl_PointSize = max(1., uSize*uDpr*z);",
      "  float fade = smoothstep(0.,.15,s.z)*smoothstep(1.,.85,s.z);",
      "  float tw = pow(max(0., sin(uT*(2.+hh(s.w*7.)*5.) + s.w*80.)), 24.)*uGlint;",   // occasional glints: grains catching the moon
      "  vC = mix(uC1, uC2, hh(s.w*3.7)) * (1.+tw*3.); vA = uAlpha*fade*(.45+.55*z)*(1.+tw); vSeed = s.w; vRot = s.w*6.2832 + uT*(hh(s.w)-.5)*2.; }"].join("\n"),
      "#version 300 es\nprecision highp float; in vec3 vC; in float vA, vSeed, vRot; uniform int uShape; uniform float uBlend; out vec4 o;\n" + [
      "void main(){ vec2 q = gl_PointCoord*2.-1.; float a = 1.;",
      "  if (uShape == 0) a = 1.-smoothstep(.55,1.,length(q));",
      "  else if (uShape == 1) { float c = cos(vRot), s = sin(vRot); q = mat2(c,-s,s,c)*q; a = 1.-smoothstep(.85,1.,length(q*vec2(1.,2.1)) + .25*q.x*q.x); }",
      "  else if (uShape == 2) a = (1.-smoothstep(.0,.16,abs(q.x)))*smoothstep(1.,.2,abs(q.y));",
      "  else if (uShape == 3) { float r = length(q); a = smoothstep(1.,.75,r); vec3 hl = vec3(1.)*smoothstep(.35,.0,length(q-vec2(-.3,.35))); o = vec4((vC+hl*.8)*a*vA, a*vA); return; }",
      "  else if (uShape == 4) { a = exp(-dot(q,q)*4.) + .5*exp(-abs(q.x)*14.)*exp(-abs(q.y)*2.) + .5*exp(-abs(q.y)*14.)*exp(-abs(q.x)*2.); }",
      "  else a = exp(-dot(q,q)*2.2);",
      "  a *= vA; if (a < .003) discard; o = vec4(vC*a, uBlend > .5 ? 0. : a); }"].join("\n"));
    if (!rake || !upd || !drw) return null;
    var c1 = s.c1 || [1, 1, 1], c2 = s.c2 || c1, sp = { any: 0, top: 1, bottom: 2, ring: 3 }[s.spawn || "any"];
    return {
      name: "particles", count: function () { return N; },
      step: function (c) {
        var asp = c.w / c.h, p = c.ptr; gl.disable(gl.BLEND);
        gl.viewport(0, 0, RS, RS); gl.bindFramebuffer(gl.FRAMEBUFFER, RF[1 - rc]); gl.useProgram(rake.p);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R[rc]); gl.uniform1i(rake.u.uR, 1);
        gl.uniform2f(rake.u.uP, p.x, p.y); gl.uniform2f(rake.u.uV, Math.max(-3, Math.min(3, p.vx)), Math.max(-3, Math.min(3, p.vy)));
        gl.uniform1f(rake.u.uDown, p.down || (performance.now() - p.t < 60 && !("ontouchstart" in window)) ? 1 : 0); gl.uniform1f(rake.u.uAsp, asp); gl.uniform1f(rake.u.uDt, c.dt);
        gl.drawArrays(gl.TRIANGLES, 0, 3); rc = 1 - rc;
        gl.viewport(0, 0, side, side); gl.bindFramebuffer(gl.FRAMEBUFFER, FB[1 - cur]); gl.useProgram(upd.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A[cur]); gl.uniform1i(upd.u.uS, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R[rc]); gl.uniform1i(upd.u.uR, 1);
        var F = K.fluid; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, F ? F.vel.r.t : R[rc]); gl.uniform1i(upd.u.uF, 2); gl.uniform1f(upd.u.uFluidK, F ? (s.fluidK || 0) : 0);
        var u = upd.u; gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uDt, c.still ? 0 : c.dt); gl.uniform1f(u.uAsp, asp);
        gl.uniform1f(u.uCurl, s.curl == null ? 1 : s.curl); gl.uniform1f(u.uScale, s.scale || 2); gl.uniform1f(u.uSpeed, s.speed == null ? .05 : s.speed);
        gl.uniform1f(u.uGrav, s.gravity || 0); gl.uniform1f(u.uLife, s.life == null ? .08 : s.life); gl.uniform1f(u.uRake, s.rake == null ? .6 : s.rake);
        gl.uniform1f(u.uSpawn, sp); gl.uniform1f(u.uObsK, s.obstacles ? 1 : 0); var d = s.drift || [0, 0]; gl.uniform2f(u.uDrift, d[0], d[1]);
        gl.uniform4fv(u.uShk, K.shk); gl.uniform1f(u.uBass, K.bass || 0); gl.uniform1f(u.uShkK, s.shock == null ? 1 : s.shock); gl.uniform1f(u.uSwirl, s.swirl || 0); gl.uniform4fv(u.uObs, c.obs); gl.uniform1i(u.uObsN, s.obstacles ? c.obsN : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur;
      },
      draw: function (c) {
        gl.enable(gl.BLEND); if (s.blend === "alpha") gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(drw.p); var u = drw.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A[cur]); gl.uniform1i(u.uS, 0); gl.uniform1i(u.uSide, side);
        gl.uniform1f(u.uSize, s.size || 1.2); gl.uniform1f(u.uDpr, c.h / innerHeight); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uDepth, s.depth == null ? .6 : s.depth);
        gl.uniform1f(u.uGlint, s.glint || 0); gl.uniform3fv(u.uC1, c1); gl.uniform3fv(u.uC2, c2); gl.uniform1f(u.uAlpha, s.alpha == null ? .5 : s.alpha);
        gl.uniform1i(u.uShape, shapes[s.shape || "dot"]); gl.uniform1f(u.uBlend, s.blend === "alpha" ? 0 : 1);
        gl.drawArrays(gl.POINTS, 0, Math.max(1, Math.floor(N * c.q)));
      },
      dispose: function () { A.concat(R).forEach(function (t) { gl.deleteTexture(t); }); FB.concat(RF).forEach(function (f) { gl.deleteFramebuffer(f); }); [rake, upd, drw].forEach(function (p) { gl.deleteProgram(p.p); }); }
    };
  });
})();
