/* fx/fluid.js: real-time stable-fluids (Navier-Stokes) for TitanFXK (Grok 2026-10-20). GPU only, WebGL2 half-float ping-pong.
   Per frame: curl -> vorticity confinement -> divergence -> pressure (Jacobi, s.iters) -> gradient subtract -> advect velocity
   -> advect dye (semi-Lagrangian, dissipation). Touch/mouse drags inject velocity + dye; s.auto = ambient emitters so the fluid is
   alive without input. Publishes K.fluid = { vel, res } so fx/particles-gpu.js can ride the flow (s.fluidK in a particle stack).
   Draw: dye with gradient-normal shading (lit, glossy fluid), premultiplied, additive or alpha.
   Options: simRes (128), dyeRes (1024), iters (24), curl (28), velDiss (.25), dyeDiss (.9), splatR (.0025), force (6000),
   colors [[r,g,b],...], auto (0..n emitters), autoForce, shade (0..1), blend "add"|"alpha", alpha, sky (bool: emitters rise). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  K.mod("fluid", function (gl, s, K) {
    if (!K.floatRT) return null;   // R16F/RG16F targets need EXT_color_buffer_float (S24 Ultra, iPad Pro, desktop: yes)
    var HF = gl.HALF_FLOAT, simR = s.simRes || 160, dyeR = s.dyeRes || 1024;
    function tgt(w, h, ifmt, fmt) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, HF, null);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return { t: t, f: f, w: w, h: h }; }
    function dbl(w, h, i, f) { var a = tgt(w, h, i, f), b = tgt(w, h, i, f); return { r: a, w: b, swap: function () { var x = this.r; this.r = this.w; this.w = x; } }; }
    var asp = innerWidth / innerHeight, sw = Math.round(asp >= 1 ? simR * asp : simR), sh = Math.round(asp >= 1 ? simR : simR / asp);
    var dw = Math.round(asp >= 1 ? dyeR * asp : dyeR), dh = Math.round(asp >= 1 ? dyeR : dyeR / asp);
    var vel = dbl(sw, sh, gl.RG16F, gl.RG), dye = dbl(dw, dh, gl.RGBA16F, gl.RGBA), prs = dbl(sw, sh, gl.R16F, gl.RED);
    var div = tgt(sw, sh, gl.R16F, gl.RED), crl = tgt(sw, sh, gl.R16F, gl.RED);
    var H = "#version 300 es\nprecision highp float; precision highp sampler2D; out vec4 o; uniform vec2 tx;\n" +
      "vec2 uv(){ return gl_FragCoord.xy*tx; }\n";
    var P = {
      splat: K.compile(K.FSQ, H + "uniform sampler2D uT; uniform vec2 uP; uniform vec3 uC; uniform float uR, uAsp;\nvoid main(){ vec2 d = uv()-uP; d.x *= uAsp; vec3 s = exp(-dot(d,d)/uR)*uC; o = vec4(texture(uT, uv()).xyz + s, 1.); }"),
      adv: K.compile(K.FSQ, H + "uniform sampler2D uV, uS; uniform float uDt, uDiss; uniform vec2 vtx;\nvoid main(){ vec2 c = uv() - uDt*texture(uV, uv()).xy*vtx; o = texture(uS, c)/(1.+uDiss*uDt); }"),
      curl: K.compile(K.FSQ, H + "uniform sampler2D uV;\nvoid main(){ vec2 u = uv(); float L = texture(uV,u-vec2(tx.x,0)).y, R = texture(uV,u+vec2(tx.x,0)).y, T = texture(uV,u+vec2(0,tx.y)).x, B = texture(uV,u-vec2(0,tx.y)).x; o = vec4(.5*(R-L-T+B)); }"),
      vort: K.compile(K.FSQ, H + "uniform sampler2D uV, uC; uniform float uK, uDt;\nvoid main(){ vec2 u = uv(); float L = texture(uC,u-vec2(tx.x,0)).x, R = texture(uC,u+vec2(tx.x,0)).x, T = texture(uC,u+vec2(0,tx.y)).x, B = texture(uC,u-vec2(0,tx.y)).x, C = texture(uC,u).x;\n vec2 f = .5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+1e-4; f *= uK*C; f.y *= -1.; vec2 v = texture(uV,u).xy + f*uDt; o = vec4(clamp(v,-1000.,1000.),0,1); }"),
      div: K.compile(K.FSQ, H + "uniform sampler2D uV;\nvoid main(){ vec2 u = uv(); vec2 C = texture(uV,u).xy; float L = texture(uV,u-vec2(tx.x,0)).x, R = texture(uV,u+vec2(tx.x,0)).x, T = texture(uV,u+vec2(0,tx.y)).y, B = texture(uV,u-vec2(0,tx.y)).y;\n if (u.x-tx.x<0.) L = -C.x; if (u.x+tx.x>1.) R = -C.x; if (u.y+tx.y>1.) T = -C.y; if (u.y-tx.y<0.) B = -C.y; o = vec4(.5*(R-L+T-B)); }"),
      clr: K.compile(K.FSQ, H + "uniform sampler2D uT; uniform float uK;\nvoid main(){ o = uK*texture(uT, uv()); }"),
      prs: K.compile(K.FSQ, H + "uniform sampler2D uP, uD;\nvoid main(){ vec2 u = uv(); float L = texture(uP,u-vec2(tx.x,0)).x, R = texture(uP,u+vec2(tx.x,0)).x, T = texture(uP,u+vec2(0,tx.y)).x, B = texture(uP,u-vec2(0,tx.y)).x; o = vec4((L+R+B+T-texture(uD,u).x)*.25); }"),
      grad: K.compile(K.FSQ, H + "uniform sampler2D uP, uV;\nvoid main(){ vec2 u = uv(); float L = texture(uP,u-vec2(tx.x,0)).x, R = texture(uP,u+vec2(tx.x,0)).x, T = texture(uP,u+vec2(0,tx.y)).x, B = texture(uP,u-vec2(0,tx.y)).x; o = vec4(texture(uV,u).xy - vec2(R-L,T-B), 0, 1); }"),
      draw: K.compile(K.FSQ, H + "uniform sampler2D uS; uniform float uShade, uAlpha, uAdd;\nvoid main(){ vec2 u = uv(); vec3 c = texture(uS,u).rgb; vec2 d = 1./vec2(textureSize(uS,0));\n" +
        " float l = length(texture(uS,u-vec2(d.x,0)).rgb), r = length(texture(uS,u+vec2(d.x,0)).rgb), t = length(texture(uS,u+vec2(0,d.y)).rgb), b = length(texture(uS,u-vec2(0,d.y)).rgb);\n" +
        " vec3 n = normalize(vec3(l-r, b-t, length(d)*40.)); float dif = clamp(dot(n, normalize(vec3(-.4,.6,1.))),0.,1.); float spec = pow(clamp(dot(reflect(-normalize(vec3(-.4,.6,1.)),n), vec3(0,0,1)),0.,1.), 40.);\n" +
        " c = c*mix(1., .55+.6*dif, uShade) + spec*uShade*.6*min(1.,length(c)); float a = clamp(max(c.r,max(c.g,c.b)),0.,1.)*uAlpha; o = uAdd > .5 ? vec4(c*uAlpha, 0.) : vec4(c*uAlpha, a); }")
    };
    for (var k in P) if (!P[k]) return null;
    function run(p, out, set) { gl.useProgram(p.p); gl.uniform2f(p.u.tx, 1 / out.w, 1 / out.h); var unit = 0;
      for (var n in set) { var v = set[n]; if (v && v.t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.t); gl.uniform1i(p.u[n], unit++); }
        else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, p.u[n], v); else gl.uniform1f(p.u[n], v); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.f); gl.viewport(0, 0, out.w, out.h); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    var cols = s.colors || [[1, .2, .6], [.2, .8, 1], [.6, .3, 1]], ci = 0, lastP = null, auto = [];
    for (var i = 0; i < (s.auto || 0); i++) auto.push({ ph: Math.random() * 6.28, sp: .15 + Math.random() * .2, c: cols[i % cols.length] });
    function splat(x, y, dx, dy, c, r) {
      var a = dw / dh;
      run(P.splat, vel.w, { uT: vel.r, uP: [x, y], uC: [dx, dy, 0], uR: r, uAsp: a }); vel.swap();
      run(P.splat, dye.w, { uT: dye.r, uP: [x, y], uC: c, uR: r, uAsp: a }); dye.swap(); }
    K.fluid = { vel: vel, w: sw, h: sh, splat: splat };
    var api = { name: "fluid",
      step: function (c) {
        gl.disable(gl.BLEND); var dt = c.still ? 0 : Math.min(c.dt, 1 / 30), R = s.splatR || .0025, F = s.force || 6000, p = c.ptr;
        // input: a drag injects velocity along the motion and a dye ribbon; a tap is a burst
        if (p.down || (performance.now() - p.t < 50 && !("ontouchstart" in window))) {
          if (lastP) { var dx = (p.x - lastP[0]) * F, dy = (p.y - lastP[1]) * F; if (Math.abs(dx) + Math.abs(dy) > .5) { var cc = cols[(ci++ >> 4) % cols.length]; splat(p.x, p.y, dx, dy, cc.map(function (v) { return v * (s.dyeK || .2); }), R); } }
          lastP = [p.x, p.y]; } else lastP = null;
        for (var j = 0; j < auto.length; j++) { var e = auto[j]; e.ph += dt * e.sp; var x = .5 + .38 * Math.sin(e.ph * 1.3 + j), y = s.sky ? .08 : .5 + .32 * Math.cos(e.ph + j * 2.1);
          var fx = Math.cos(e.ph * 2.7 + j) * (s.autoForce || 300), fy = s.sky ? (s.autoForce || 300) * 1.2 : Math.sin(e.ph * 2.1) * (s.autoForce || 300);
          if (dt > 0) splat(x, y, fx * dt * 8, fy * dt * 8, e.c.map(function (v) { return v * (s.autoDye || .035); }), R * 1.6); }
        if (dt <= 0) return;
        run(P.curl, crl, { uV: vel.r });
        run(P.vort, vel.w, { uV: vel.r, uC: crl, uK: s.curl == null ? 28 : s.curl, uDt: dt }); vel.swap();
        run(P.div, div, { uV: vel.r });
        run(P.clr, prs.w, { uT: prs.r, uK: .8 }); prs.swap();
        for (var it = 0; it < (s.iters || 24); it++) { run(P.prs, prs.w, { uP: prs.r, uD: div }); prs.swap(); }
        run(P.grad, vel.w, { uP: prs.r, uV: vel.r }); vel.swap();
        gl.useProgram(P.adv.p); gl.uniform2f(P.adv.u.vtx, 1 / sw, 1 / sh);
        run(P.adv, vel.w, { uV: vel.r, uS: vel.r, uDt: dt, uDiss: s.velDiss == null ? .25 : s.velDiss, vtx: [1 / sw, 1 / sh] }); vel.swap();
        run(P.adv, dye.w, { uV: vel.r, uS: dye.r, uDt: dt, uDiss: s.dyeDiss == null ? .9 : s.dyeDiss, vtx: [1 / sw, 1 / sh] }); dye.swap();
      },
      draw: function (c) {
        K.bindTarget(); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(P.draw.p); gl.uniform2f(P.draw.u.tx, 1 / c.w, 1 / c.h); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dye.r.t); gl.uniform1i(P.draw.u.uS, 0);
        gl.uniform1f(P.draw.u.uShade, s.shade == null ? .8 : s.shade); gl.uniform1f(P.draw.u.uAlpha, s.alpha == null ? 1 : s.alpha); gl.uniform1f(P.draw.u.uAdd, s.blend === "alpha" ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose: function () { K.fluid = null; [vel.r, vel.w, dye.r, dye.w, prs.r, prs.w, div, crl].forEach(function (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); }); for (var n in P) gl.deleteProgram(P[n].p); }
    };
    return api;
  });
})();
