/* fx/metal.js: liquid metal metaballs / SDF morphing (Grok 2026-10-20). N blobs orbit and merge with a smooth union (true 3D SDF,
   raymarched), shaded as polished metal reflecting a procedural studio (softboxes, horizon, coloured fill) with Fresnel and a
   thin-film tint; touch pulls the nearest blobs to your finger and they stretch to follow (surface tension feel).
   Options: n (7), size (.22), tint [..] (gold [1,.78,.4], silver [.95,.97,1], copper [1,.6,.45]), film (0..1), area [x,y,r] (where they
   live, uv), env "studio"|"neon"|"night", speed, res. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var FS = "#version 300 es\nprecision highp float; out vec4 o;\n" + [
    "uniform vec2 uRes; uniform float uT, uSize, uFilm, uEnv, uN; uniform vec3 uTint, uArea; uniform vec4 uB[10];",
    "float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }",
    "float map(vec3 p){ float d = 1e3; for (int i=0;i<10;i++){ if (float(i)>=uN) break; d = smin(d, length(p-uB[i].xyz)-uB[i].w, .22); } return d; }",
    "vec3 nrm(vec3 p){ vec2 e = vec2(.002,0.); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }",
    "vec3 env(vec3 r){ float y = r.y; vec3 c;",
    "  if (uEnv < .5) { c = mix(vec3(.05,.05,.06), vec3(.9,.92,1.), smoothstep(-.1,.7,y)); c = mix(c, vec3(.02), exp(-y*y*80.)*.8); c += smoothstep(.9,.97,dot(r,normalize(vec3(-.6,.6,.5))))*2.5; c += vec3(.6,.75,1.)*smoothstep(.93,.99,dot(r,normalize(vec3(.8,.1,.6))))*1.5; }",
    "  else if (uEnv < 1.5) { c = vec3(.01,.005,.02); c += vec3(1.,.2,.6)*smoothstep(.96,.995,dot(r,normalize(vec3(-.7,.3,.6))))*3.; c += vec3(.1,.9,1.)*smoothstep(.95,.995,dot(r,normalize(vec3(.7,.2,.6))))*3.; c += vec3(.3,.1,.5)*smoothstep(-.2,.6,y)*.3; }",
    "  else { c = mix(vec3(.01,.012,.03), vec3(.15,.2,.35), smoothstep(-.2,.8,y)); c += vec3(1.,.9,.7)*smoothstep(.985,.999,dot(r,normalize(vec3(.3,.7,.6))))*4.; }",
    "  return c; }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float a = uRes.x/uRes.y; vec2 p = vec2((uv.x-uArea.x)*a, uv.y-uArea.y)/uArea.z;",
    "  if (abs(p.x) > 1.6 || abs(p.y) > 1.6) { o = vec4(0.); return; }",
    "  vec3 ro = vec3(0,0,3.), rd = normalize(vec3(p, -2.2)); float t = 1.; bool hit = false;",
    "  for (int i=0;i<64;i++){ float d = map(ro+rd*t); if (d < .001) { hit = true; break; } t += d; if (t > 5.) break; }",
    "  if (!hit) { o = vec4(0.); return; }",
    "  vec3 q = ro+rd*t, n = nrm(q), r = reflect(rd, n); float fr = pow(1.-max(dot(n,-rd),0.), 5.);",
    "  vec3 c = env(r)*mix(uTint, vec3(1.), fr);",
    "  c += uFilm*.35*(.5+.5*cos(6.2832*(fr*1.5+n.y*.3+vec3(0.,.33,.67))))*fr*2.;",   // thin-film interference at grazing angles
    "  float ao = clamp(map(q+n*.15)/.15, .3, 1.); c *= ao;",
    "  o = vec4(c, 1.); }"].join("\n");
  K.mod("metal", function (gl, s, K) {
    var pr = K.compile(K.FSQ, FS); if (!pr) return null;
    var n = Math.min(10, s.n || 7), B = new Float32Array(40), sz = s.size || .22, area = s.area || [.5, .5, .35], spd = s.speed || .35;
    var pts = []; for (var i = 0; i < n; i++) pts.push({ x: 0, y: 0, z: 0, ph: Math.random() * 6.28, r: sz * (.6 + Math.random() * .7) });
    var envI = { studio: 0, neon: 1, night: 2 }[s.env || "studio"];
    return { name: "metal", draw: function (c) {
      var a = c.w / c.h, P = c.ptr, px = ((P.x - area[0]) * a) / area[2], py = (P.y - area[1]) / area[2], t = c.t * spd;
      for (var i = 0; i < n; i++) { var b = pts[i], tx = Math.sin(t * (1 + i * .13) + b.ph) * .75, ty = Math.cos(t * (.8 + i * .11) + b.ph * 1.7) * .6, tz = Math.sin(t * .7 + i) * .3;
        if (P.down && Math.abs(px) < 2 && Math.abs(py) < 2) { var k = i < 3 ? .6 : .15; tx += (px - tx) * k; ty += (py - ty) * k; }
        b.x += (tx - b.x) * .08; b.y += (ty - b.y) * .08; b.z += (tz - b.z) * .08; B.set([b.x, b.y, b.z, b.r * (1 + .08 * Math.sin(c.t * 2 + i))], i * 4); }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(pr.p); var u = pr.u;
      gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uN, n); gl.uniform4fv(u.uB, B); gl.uniform3fv(u.uTint, s.tint || [.95, .97, 1]);
      gl.uniform3fv(u.uArea, area); gl.uniform1f(u.uFilm, s.film || 0); gl.uniform1f(u.uEnv, envI); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, dispose: function () { gl.deleteProgram(pr.p); } };
  });
})();
