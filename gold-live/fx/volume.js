/* fx/volume.js: raymarched volumetric fog/smoke with light shafts (Grok 2026-10-20). A 3D fbm density field drifting through a box
   in front of the camera, marched at s.res (0.5) of the canvas; at each step the density is lit by a point/spot light with a short
   shadow march toward it (real occlusion = real god rays through the gaps in the smoke) plus a coloured ambient.
   Options: steps (48), density (1), color [..], light [..], lightAt [x,y] (screen uv), lightPow, ambient [..], speed, scale, low (fog
   hugs the floor 0..1), res, blend. Pointer: the light follows a drag when s.follow. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var FS = "#version 300 es\nprecision highp float; out vec4 o;\n" + [
    "uniform vec2 uRes, uL; uniform float uT, uSteps, uDen, uLP, uSpd, uSc, uLow; uniform vec3 uC, uLC, uAmb;",
    "float h31(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }",
    "float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y), mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }",
    "float den(vec3 p){ vec3 q = p*uSc + vec3(uT*uSpd, -uT*uSpd*.3, uT*uSpd*.6); float d = n3(q)*.5 + n3(q*2.03+1.7)*.25 + n3(q*4.01-3.1)*.125 + n3(q*8.1)*.0625;",
    "  d = d - .5 + .22*uLow*(-p.y); return clamp(d*uDen*2.2, 0., 1.); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float a = uRes.x/uRes.y; vec3 ro = vec3(0., 0., -2.), rd = normalize(vec3((uv.x-.5)*a, uv.y-.5, 1.4));",
    "  vec3 lp = vec3((uL.x-.5)*a*2.2, (uL.y-.5)*2.2, 1.2);",
    "  float T = 1.; vec3 acc = vec3(0.); float st = 3.2/uSteps; float t = st*fract(sin(dot(gl_FragCoord.xy,vec2(12.9,78.2)))*43758.5);",   // blue-ish dither: no banding
    "  for (int i=0;i<96;i++){ if (float(i) >= uSteps || T < .02) break; vec3 p = ro+rd*(t+.4); float d = den(p);",
    "    if (d > .003) { vec3 ld = lp-p; float L = length(ld); ld /= L; float sh = 0.; for (int j=1;j<5;j++) sh += den(p+ld*float(j)*.18);",
    "      float lit = exp(-sh*1.4)*uLP/(1.+L*L*.6); float ph = .6+.4*pow(max(dot(rd,ld),0.),6.);",   // forward-scattering phase: glow toward the light
    "      vec3 cs = uC*(uAmb + uLC*lit*ph*.9); float ab = d*st*2.6; acc += T*cs*ab; T *= exp(-ab); }",
    "    t += st; }",
    "  vec3 dir = normalize(lp-ro); float sun = pow(max(dot(rd,dir),0.),300.)*T;",
    "  o = vec4(acc + uLC*sun*.6, 1.-T); }"].join("\n");
  K.mod("volume", function (gl, s, K) {
    var pr = K.compile(K.FSQ, FS); if (!pr) return null;
    var rt = null;
    function mk(w, h) { if (rt && rt.w === w && rt.h === h) return; if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); }
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); });
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); rt = { t: t, f: f, w: w, h: h }; }
    var blit = K.compile(K.FSQ, "#version 300 es\nprecision highp float; out vec4 o; uniform sampler2D uA; uniform vec2 uTx; void main(){ vec2 u = gl_FragCoord.xy*uTx; vec2 d = 1./vec2(textureSize(uA,0));\n o = (texture(uA,u)*4. + texture(uA,u+vec2(d.x,0)) + texture(uA,u-vec2(d.x,0)) + texture(uA,u+vec2(0,d.y)) + texture(uA,u-vec2(0,d.y)))/8.; }");
    var L = (s.lightAt || [.75, .85]).slice();
    return { name: "volume", draw: function (c) {
      var r = s.res || .5, w = Math.max(2, Math.round(c.w * r)), h = Math.max(2, Math.round(c.h * r)); mk(w, h);
      if (s.follow && c.ptr.down) { L[0] += (c.ptr.x - L[0]) * .15; L[1] += (c.ptr.y - L[1]) * .15; }
      gl.bindFramebuffer(gl.FRAMEBUFFER, rt.f); gl.viewport(0, 0, w, h); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
      gl.uniform2f(u.uRes, w, h); gl.uniform2f(u.uL, L[0], L[1]); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uSteps, Math.max(16, Math.round((s.steps || 48) * c.q)));
      gl.uniform1f(u.uDen, s.density == null ? 1 : s.density); gl.uniform1f(u.uLP, s.lightPow == null ? 1.6 : s.lightPow); gl.uniform1f(u.uSpd, s.speed == null ? .12 : s.speed);
      gl.uniform1f(u.uSc, s.scale || 3); gl.uniform1f(u.uLow, s.low || 0); gl.uniform3fv(u.uC, s.color || [1, 1, 1]); gl.uniform3fv(u.uLC, s.light || [1, .85, .6]); gl.uniform3fv(u.uAmb, s.ambient || [.08, .09, .12]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      K.bindTarget(); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(blit.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rt.t); gl.uniform1i(blit.u.uA, 0); gl.uniform2f(blit.u.uTx, 1 / c.w, 1 / c.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, dispose: function () { if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); } gl.deleteProgram(pr.p); gl.deleteProgram(blit.p); } };
  });
})();
