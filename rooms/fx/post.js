/* fx/post.js: the post stack for TitanFXK (Grok 2026-10-20). Put { mod: "post", ... } LAST in a theme's stack; the kit then renders
   every module into an HDR (RGBA16F) buffer and this pass composites it to the screen:
     bloom      threshold prefilter -> 6-level downsample (13-tap) -> tent upsample, added back (s.bloom, s.threshold, s.knee)
     trails     motion-blur style persistence: blend with last frame's output (s.trails 0..0.95)
     dof        depth-of-field approximation: blur grows away from a focus band (s.dof, s.focusY)
     aberr      chromatic aberration, radial (s.aberr)
     tonemap    ACES filmic (s.exposure), then grain (s.grain) and vignette (s.vig)
   Output keeps the scene alpha (premultiplied) so pages without a full background still see the app behind it. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  K.mod("post", function (gl, s, K) {
    var H = "#version 300 es\nprecision highp float; out vec4 o; uniform sampler2D uA; uniform vec2 uTx;\n";
    var pre = K.compile(K.FSQ, H + "uniform float uTh, uKnee;\nvoid main(){ vec2 u = gl_FragCoord.xy*uTx; vec3 c = texture(uA,u).rgb; float b = max(c.r,max(c.g,c.b)); float r = clamp(b-uTh+uKnee,0.,2.*uKnee); r = r*r/(4.*uKnee+1e-4); o = vec4(c*max(r, b-uTh)/max(b,1e-4), 1.); }");
    var down = K.compile(K.FSQ, H + "void main(){ vec2 u = gl_FragCoord.xy*uTx, d = uTx; vec3 a = texture(uA,u+d*vec2(-2,2)).rgb, b = texture(uA,u+d*vec2(0,2)).rgb, c = texture(uA,u+d*vec2(2,2)).rgb, e = texture(uA,u+d*vec2(-2,0)).rgb, f = texture(uA,u).rgb, g = texture(uA,u+d*vec2(2,0)).rgb, h = texture(uA,u+d*vec2(-2,-2)).rgb, i = texture(uA,u+d*vec2(0,-2)).rgb, j = texture(uA,u+d*vec2(2,-2)).rgb, k = texture(uA,u+d*vec2(-1,1)).rgb, l = texture(uA,u+d*vec2(1,1)).rgb, m = texture(uA,u+d*vec2(-1,-1)).rgb, n = texture(uA,u+d*vec2(1,-1)).rgb;\n o = vec4(f*.125 + (a+c+h+j)*.03125 + (b+e+g+i)*.0625 + (k+l+m+n)*.125, 1.); }");
    var up = K.compile(K.FSQ, H + "uniform float uR;\nvoid main(){ vec2 u = gl_FragCoord.xy*uTx, d = uTx*uR; vec3 c = texture(uA,u).rgb*4. + (texture(uA,u+vec2(d.x,0)).rgb+texture(uA,u-vec2(d.x,0)).rgb+texture(uA,u+vec2(0,d.y)).rgb+texture(uA,u-vec2(0,d.y)).rgb)*2. + texture(uA,u+d).rgb+texture(uA,u-d).rgb+texture(uA,u+vec2(d.x,-d.y)).rgb+texture(uA,u+vec2(-d.x,d.y)).rgb; o = vec4(c/16., 1.); }");
    var comp = K.compile(K.FSQ, H + [
      "uniform sampler2D uB, uPrev; uniform float uBloom, uExp, uAb, uGrain, uVig, uTrails, uDof, uFocus, uT;",
      "vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }",
      "float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }",
      "void main(){ vec2 u = gl_FragCoord.xy*uTx; vec2 cc = u-.5; vec4 base = texture(uA,u);",
      "  vec3 col;",
      "  if (uAb > 0.) { vec2 off = cc*uAb*.012; col = vec3(texture(uA,u+off).r, base.g, texture(uA,u-off).b); } else col = base.rgb;",
      "  if (uDof > 0.) { float r = uDof*abs(u.y-uFocus)*6.; vec3 acc = col; for (int i=0;i<8;i++){ float a = float(i)*.785; acc += texture(uA, u+vec2(cos(a),sin(a))*uTx*r*3.).rgb; } col = mix(col, acc/9., clamp(r,0.,1.)); }",
      "  vec3 bl = texture(uB,u).rgb; col += bl*uBloom;",
      "  col = aces(col*uExp);",
      "  col = pow(col, vec3(1./1.0));",
      "  if (uVig > 0.) col *= mix(1., smoothstep(.95,.25,length(cc*vec2(1.1,1.))), uVig);",
      "  col += (h(gl_FragCoord.xy+fract(uT*7.)*311.)-.5)*uGrain;",
      "  float a = clamp(max(base.a, max(bl.r,max(bl.g,bl.b))*uBloom), 0., 1.);",
      "  vec4 outc = vec4(col*a, a);",
      "  if (uTrails > 0.) outc = max(outc, texture(uPrev,u)*uTrails);",
      "  o = outc; }"].join("\n"));
    var copy = K.compile(K.FSQ, H + "void main(){ o = texture(uA, gl_FragCoord.xy*uTx); }");
    if (!pre || !down || !up || !comp || !copy) return null;
    var lv = [], prev = null, outT = null, W = 0, Hh = 0;
    function mk(w, h) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); });
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t: t, f: f, w: w, h: h }; }
    function free(x) { if (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); } }
    function alloc(w, h) { lv.forEach(free); free(prev); free(outT); lv = []; var x = w >> 1, y = h >> 1; for (var i = 0; i < 6 && x > 4 && y > 4; i++) { lv.push(mk(x, y)); x >>= 1; y >>= 1; } prev = mk(w, h); outT = mk(w, h); W = w; Hh = h; }
    function pass(p, src, dst, extra) { gl.useProgram(p.p); gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f : null); var w = dst ? dst.w : W, h = dst ? dst.h : Hh; gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.uniform1i(p.u.uA, 0); gl.uniform2f(p.u.uTx, 1 / w, 1 / h); if (extra) extra(p.u); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    return { name: "post", draw: function (c) {
      var src = K.hdr(); if (!src) return; if (W !== c.w || Hh !== c.h) alloc(c.w, c.h); gl.disable(gl.BLEND);
      pass(pre, src, lv[0], function (u) { gl.uniform1f(u.uTh, s.threshold == null ? .8 : s.threshold); gl.uniform1f(u.uKnee, s.knee == null ? .5 : s.knee); });
      for (var i = 1; i < lv.length; i++) pass(down, lv[i - 1], lv[i]);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (i = lv.length - 1; i > 0; i--) pass(up, lv[i], lv[i - 1], function (u) { gl.uniform1f(u.uR, 1); });
      gl.disable(gl.BLEND);
      var trails = c.still ? 0 : (s.trails || 0);
      pass(comp, src, outT, function (u) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lv[0].t); gl.uniform1i(u.uB, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, prev.t); gl.uniform1i(u.uPrev, 2);
        gl.uniform1f(u.uBloom, s.bloom == null ? .8 : s.bloom); gl.uniform1f(u.uExp, s.exposure || 1.1); gl.uniform1f(u.uAb, s.aberr || 0); gl.uniform1f(u.uGrain, s.grain == null ? .025 : s.grain);
        gl.uniform1f(u.uVig, s.vig == null ? .35 : s.vig); gl.uniform1f(u.uTrails, trails); gl.uniform1f(u.uDof, s.dof || 0); gl.uniform1f(u.uFocus, s.focusY == null ? .5 : s.focusY); gl.uniform1f(u.uT, c.t); });
      pass(copy, outT, null);
      var x = prev; prev = outT; outT = x;   // this frame becomes next frame's trail source
    }, dispose: function () { lv.forEach(free); free(prev); free(outT); [pre, down, up, comp, copy].forEach(function (p) { gl.deleteProgram(p.p); }); } };
  });
})();
