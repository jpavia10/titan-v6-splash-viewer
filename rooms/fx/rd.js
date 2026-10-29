/* fx/rd.js: Gray-Scott reaction-diffusion (Grok 2026-10-20). Two chemicals on a ping-pong RG16F grid (s.res 384), several substeps
   per frame; touch seeds new growth. Rendered as embossed relief with a colour ramp (s.c0 -> s.c1 -> s.c2) and a specular glint,
   so it reads as a living material (coral, lichen, frost, cells, verdigris). Presets via s.kind: "coral" (f .0545 k .062),
   "mitosis" (.0367/.0649), "maze" (.029/.057), "spots" (.035/.065), or s.feed/s.kill. Options: steps (12), alpha, blend. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  K.mod("rd", function (gl, s, K) {
    if (!K.floatRT) return null;
    var KIND = { coral: [.0545, .062], mitosis: [.0367, .0649], maze: [.029, .057], spots: [.035, .065] }[s.kind || "coral"];
    var feed = s.feed || KIND[0], kill = s.kill || KIND[1], a = innerWidth / innerHeight, R = s.res || 384, w = Math.round(a >= 1 ? R * a : R), h = Math.round(a >= 1 ? R : R / a);
    var init = new Float32Array(w * h * 4); for (var i = 0; i < w * h; i++) { init[i * 4] = 1; init[i * 4 + 1] = Math.random() < .002 ? 1 : 0; }
    var half = new Uint16Array(init.length), f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
    for (i = 0; i < init.length; i++) { f32[0] = init[i]; var x = u32[0], e = ((x >> 23) & 255) - 112, m = (x >> 13) & 1023; half[i] = e <= 0 ? 0 : (e << 10) | m; }
    function mk() { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, half);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); });
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.REPEAT); });
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t: t, f: f }; }
    var S = [mk(), mk()], cur = 0;
    var sim = K.compile(K.FSQ, "#version 300 es\nprecision highp float; out vec4 o; uniform sampler2D uA; uniform vec2 uTx, uP; uniform float uF, uK, uSeed, uAsp, uT;\n" +
      "void main(){ vec2 u = gl_FragCoord.xy*uTx; vec2 c = texture(uA,u).xy; vec2 l = -c + .2*(texture(uA,u+vec2(uTx.x,0)).xy+texture(uA,u-vec2(uTx.x,0)).xy+texture(uA,u+vec2(0,uTx.y)).xy+texture(uA,u-vec2(0,uTx.y)).xy)\n" +
      " + .05*(texture(uA,u+uTx).xy+texture(uA,u-uTx).xy+texture(uA,u+vec2(uTx.x,-uTx.y)).xy+texture(uA,u+vec2(-uTx.x,uTx.y)).xy);\n" +
      " float f = uF*(1.+.12*sin(u.x*6.+uT*.05)), r = c.x*c.y*c.y; vec2 n = c + vec2(1.*l.x - r + f*(1.-c.x), .5*l.y + r - (uK+f)*c.y);\n" +
      " vec2 d = (u-uP)*vec2(uAsp,1.); if (uSeed > 0. && dot(d,d) < .0004) n.y = .9; o = vec4(clamp(n,0.,1.),0,1); }");
    var drw = K.compile(K.FSQ, "#version 300 es\nprecision highp float; out vec4 o; uniform sampler2D uA; uniform vec2 uTx; uniform vec3 uC0, uC1, uC2; uniform float uAl, uAdd;\n" +
      "void main(){ vec2 u = gl_FragCoord.xy*uTx; vec2 d = 1./vec2(textureSize(uA,0)); float v = texture(uA,u).y; float gx = texture(uA,u+vec2(d.x,0)).y - texture(uA,u-vec2(d.x,0)).y, gy = texture(uA,u+vec2(0,d.y)).y - texture(uA,u-vec2(0,d.y)).y;\n" +
      " vec3 n = normalize(vec3(-gx*6., -gy*6., 1.)); float dif = clamp(dot(n, normalize(vec3(-.5,.6,.7))),0.,1.), sp = pow(clamp(dot(reflect(normalize(vec3(.5,-.6,-.7)),n), vec3(0,0,1)),0.,1.), 30.);\n" +
      " float m = smoothstep(.1,.35,v); vec3 c = mix(uC0, mix(uC1, uC2, smoothstep(.25,.45,v)), m)*(.5+.7*dif) + sp*m*.6; float a = m*uAl; o = uAdd > .5 ? vec4(c*a, 0.) : vec4(c*a, a); }");
    if (!sim || !drw) return null;
    var seedT = 0;
    return { name: "rd", step: function (c) {
      if (c.still) return; gl.disable(gl.BLEND); gl.viewport(0, 0, w, h); gl.useProgram(sim.p); var u = sim.u;
      gl.uniform2f(u.uTx, 1 / w, 1 / h); gl.uniform1f(u.uF, feed); gl.uniform1f(u.uK, kill); gl.uniform1f(u.uAsp, w / h); gl.uniform1f(u.uT, c.t);
      var seed = c.ptr.down ? 1 : 0; if (!seed && c.t - seedT > 1.5) { seedT = c.t; seed = 1; gl.uniform2f(u.uP, Math.random(), Math.random()); } else gl.uniform2f(u.uP, c.ptr.x, c.ptr.y);
      gl.uniform1f(u.uSeed, seed);
      for (var i = 0; i < (s.steps || 12); i++) { gl.bindFramebuffer(gl.FRAMEBUFFER, S[1 - cur].f); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S[cur].t); gl.uniform1i(u.uA, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur; if (i === 0) gl.uniform1f(u.uSeed, 0); }
    }, draw: function (c) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(drw.p); var u = drw.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S[cur].t); gl.uniform1i(u.uA, 0); gl.uniform2f(u.uTx, 1 / c.w, 1 / c.h);
      gl.uniform3fv(u.uC0, s.c0 || [.05, .1, .1]); gl.uniform3fv(u.uC1, s.c1 || [.2, .7, .6]); gl.uniform3fv(u.uC2, s.c2 || [.9, 1, .8]); gl.uniform1f(u.uAl, s.alpha == null ? 1 : s.alpha); gl.uniform1f(u.uAdd, s.blend === "add" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, dispose: function () { S.forEach(function (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); }); gl.deleteProgram(sim.p); gl.deleteProgram(drw.p); } };
  });
})();
