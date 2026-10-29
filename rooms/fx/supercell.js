/* fx/supercell.js: Supercell (supercell), theme #40, on the TitanFXK kit (Claude, 2026-10-21; Grok's plan in notes/agents/themes-37-50.md).
   A rotating thunderstorm at dusk, seen from the open plains. A real raymarched volume (rendered at reduced resolution into its own
   buffer, like fx/volume.js, then upscaled): an updraft tower, a flat-topped anvil with an overshooting dome, a striated rotating base
   ("mothership" plates) with a lowered wall cloud under it, rain curtains below. Lit by a low sun behind the camera (warm front faces,
   blue shadows) and from INSIDE by lightning: every flash is a point light in the cloud that the volume scatters, with return strokes.
   Composite pass: dusk sky, the sun glow on the horizon, dark wet plains that catch the flashes, cloud-to-ground bolts (jagged, branched,
   full resolution), a little rain. Then the kit's post (bloom, ACES, grain).
   Sound sync: when the Scene Studio soundscape plays "storm" it emits titan:scape {type:"flash", dist, x}; each one becomes a flash here
   (dist under 1.4 km = a ground strike), so the light and the thunder belong together. With no soundscape the storm keeps its own
   schedule (silently). Tap = a ground strike where you tapped (titan:fx {type:"lightning", dist: .7, x} so the thunder answers).
   Quality tiers (Low/Medium/High/Max, user-chosen, never automatic): march steps 26/38/56/80, noise octaves 3/4/5/5, volume buffer .32/.4/.5/.66. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var TIERS = { low: [26, 3, .32], medium: [38, 4, .4], high: [56, 5, .5], max: [80, 5, .66] };
  // the camera is shared by the volume, the composite and the JS that places flashes, so all three agree on where things are
  var CAM = { o: [0, .25, 0], pitch: .16, fov: .95 };
  // CAM is the backdrop view; the room moves away from it (world contract in fx/kit.js: ctx.view yaw, pitch, move, up)
  var CAM_GLSL = [
    "uniform vec3 uCO, uCF, uCR, uCU; uniform float uFov;",
    "vec3 camRay(vec2 uv, float A){ vec2 p=(uv-.5)*vec2(A,1.); return normalize(uCF+(p.x*uCR+p.y*uCU)*uFov); }",
    "#define CO uCO", ""
  ].join("\n");
  var N3 = [
    "float h31(vec3 p){ p=fract(p*.3183099+vec3(.1,.2,.3)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }",
    "float vn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);",
    "  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),",
    "             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }"
  ].join("\n");

  /* ---- the volume ---- */
  var VOL = function (steps, oct) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + N3 + "\n" + CAM_GLSL + [
    "uniform vec2 uRes; uniform float uT, uA, uTr, uRain, uSun; uniform vec3 uC; uniform vec4 uF[4]; uniform vec2 uSway;",
    "#define STEPS " + steps, "#define OCT " + oct,
    "float fb3(vec3 p){ float s=0., a=.5; for(int i=0;i<OCT;i++){ s+=a*vn3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }",
    // storm shape in storm-local space (km): tower, anvil + overshooting dome, striated rotating base shelf, wall cloud
    "float shape(vec3 q, out float ang, out float r){ float y=q.y;",
    "  float a=uTr*.045*(1.5-y*.11); float c=cos(a), s=sin(a); q.xz=mat2(c,-s,s,c)*q.xz; r=length(q.xz); ang=atan(q.z,q.x);",
    "  float lean=max(0.,y-1.5)*.16; float rt=length(vec2(q.x-lean,q.z));",
    "  float ta=atan(q.z,q.x-lean); float bump=1.3*(vn3(vec3(ta*1.6,y*.55,1.))-.5)+.7*(vn3(q*vec3(.55,.4,.55)+2.)-.5);",   // turrets and bulges, not a cylinder
    "  float tower=smoothstep(mix(3.8,2.4,smoothstep(1.5,7.5,y))+bump,.8+bump*.5,rt)*smoothstep(1.4,2.6,y)*smoothstep(9.6,8.0,y);",
    "  float shear=(y-7.)*.55; float ra=length(vec2(q.x-max(0.,shear)*1.6,q.z));",
    "  float anvR=mix(2.6,9.,smoothstep(7.2,9.6,y))*(.8+.45*vn3(vec3(q.xz*.22,3.)))+2.*vn3(vec3(q.xz*.5,7.)); float dome=1.1*exp(-r*r*.2);",
    "  vec2 mc=fract(q.xz*.62+.5*vec2(vn3(q*.3),vn3(q*.3+4.)))-.5; float pouch=.75*smoothstep(.5,0.,length(mc))*smoothstep(3.,6.,ra);",   // mammatus under the anvil
    "  float anvil=smoothstep(anvR,anvR-4.5,ra)*smoothstep(7.,8.4,y+pouch)*smoothstep(10.,9.2,y-dome+.6*vn3(q*.4));",
    "  float sr=5.+1.3*(vn3(vec3(ang*1.3,0.,uT*.01))-.5); float lo=.95+.35*vn3(vec3(q.xz*.5,9.)), hi=2.6+.6*sin(ang+uT*.05)+.4*vn3(vec3(q.xz*.4,3.));",
    "  float shelf=smoothstep(sr,sr-1.8,r)*smoothstep(lo,lo+.4,y)*smoothstep(hi,hi-.8,y+.35*(r/sr));",           // a wedge that flares outward, not a disk
    "  float wall=smoothstep(1.7,.6,r)*smoothstep(.42,.78,y)*smoothstep(1.45,1.05,y);",
    "  return max(max(tower,anvil),max(shelf,wall)); }",
    "float dens(vec3 p, out float rain){ vec3 q=p-uC; float ang, r; float b=shape(q,ang,r); rain=0.;",
    "  if(q.y<1.25){ rain=.2*uRain*smoothstep(3.4,1.6,r+.6*vn3(vec3(q.xz*.6,1.)))*smoothstep(1.25,.95,q.y)*(.45+.55*vn3(vec3(q.x*2.6,(q.y+uT*1.7)*.35,q.z*2.6))); }",
    "  if(b<.02) return 0.;",
    "  vec3 w=q*vec3(.42,.5,.42)+vec3(uT*.01,-uT*.02,0.); w+=.9*vec3(vn3(w*.7+5.),vn3(w*.7+11.),vn3(w*.7+17.))-.45;",
    "  float n=fb3(w*1.35);",
    "  float plates=.62+.38*smoothstep(-.3,.7,sin(q.y*9.5+ang*1.+r*.4+n*3.));",                                   // stacked plates on the rotating base and lower tower
    "  plates=mix(1.,plates,smoothstep(3.4,1.5,q.y));",
    "  return clamp((b*plates-(1.-n)*.78)*3.,0.,1.); }",
    "vec2 box(vec3 ro, vec3 rd, vec3 mn, vec3 mx){ vec3 t0=(mn-ro)/rd, t1=(mx-ro)/rd; vec3 a=min(t0,t1), b=max(t0,t1); return vec2(max(max(a.x,a.y),a.z),min(min(b.x,b.y),b.z)); }",
    "void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec3 rd=camRay(uv,uA); rd.x+=uSway.x*.02; rd=normalize(rd);",
    "  vec2 tb=box(CO,rd,uC+vec3(-12.,-.05,-11.),uC+vec3(13.,11.,11.)); if(tb.y<=max(tb.x,0.)){ o=vec4(0.); return; }",
    "  float t0=max(tb.x,0.), t1=tb.y, dt=(t1-t0)/float(STEPS); float t=t0+dt*h21(gl_FragCoord.xy+fract(uT)*7.);",
    "  vec3 Ls=normalize(vec3(-.78,.2,-.58)); vec3 sunC=vec3(1.,.5,.24)*1.55*uSun, skyC=vec3(.05,.07,.12), fogC=vec3(.32,.22,.22);",
    "  vec3 col=vec3(0.); float T=1.;",
    "  for(int i=0;i<STEPS;i++){ if(T<.02) break; vec3 p=CO+rd*t; float rain; float d=dens(p,rain);",
    "    float dd=d+rain;",
    "    if(dd>.003){",
    "      float r2; float sh=exp(-(dens(p+Ls*.35,r2)+dens(p+Ls*1.1,r2)+dens(p+Ls*2.4,r2)*.6)*3.4);",          // sun shadow through the cloud
    "      float h=clamp((p.y-uC.y)/9.,0.,1.), under=smoothstep(.6,2.8,p.y-uC.y);",
    "      vec3 L=sunC*sh*(.15+.85*h)*(1.-exp(-d*3.))+skyC*(.15+.85*h)*under+vec3(.018,.02,.028)+vec3(.09,.05,.05)*smoothstep(6.5,8.,p.y-uC.y)*(1.-h)*2.;",   // the anvil's underside catches the afterglow
    "      for(int k=0;k<4;k++){ vec4 F=uF[k]; if(F.w<=.001) continue; float fd=length(p-F.xyz); L+=vec3(.75,.82,1.)*F.w*7.*exp(-fd*1.05)/(1.+fd*fd*.3); }",   // lightning inside the cloud
    "      vec3 cc=mix(L, L*vec3(.55,.62,.75)+vec3(.05), rain/max(dd,.001));",                                    // rain shafts: greyer, softer
    "      float ex=(d*4.5+rain*1.2)*dt*4.;",
    "      float a=1.-exp(-ex); col+=T*a*cc; T*=1.-a; }",
    "    t+=dt; }",
    "  float fogA=1.-exp(-t0*.012); col=mix(col,fogC*(1.-T),fogA*.5);",                                         // a little haze over the distance
    "  o=vec4(col,1.-T); }"].join("\n"); };

  /* ---- the composite: sky, ground, the volume, bolts ---- */
  var COMP = "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + "\n" + CAM_GLSL + [
    "uniform vec2 uRes; uniform float uT, uA, uFl, uSun; uniform sampler2D uV; uniform vec4 uB[2]; uniform vec4 uBI[2]; uniform vec2 uSway;",
    "float boltX(float s, vec4 b, float seed){ return mix(b.z,b.x,s)+(vn(vec2(s*7.,seed))-.5)*.07*(1.-s*.3)+(vn(vec2(s*24.,seed*3.1))-.5)*.016+(vn(vec2(s*70.,seed*7.7))-.5)*.003; }",
    "float boltD(vec2 p, vec4 b, float seed, out float s){ float top=b.y, bot=b.w; s=clamp((p.y-bot)/(top-bot),0.,1.);",
    "  float x=boltX(s,b,seed), sl=(boltX(s+.004,b,seed)-x)/(.004*(top-bot));",                // the zigzag's slope: perpendicular distance, so the line never breaks into dots
    "  float d=abs(p.x-x)/sqrt(1.+sl*sl); if(p.y>top+.01||p.y<bot-.005) d=1.; return d; }",
    "void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec3 rd=camRay(uv,uA); rd.x+=uSway.x*.02; rd=normalize(rd);",
    "  vec3 Ls=normalize(vec3(-.78,.2,-.58)); vec2 sunDir=normalize(vec2(Ls.x,Ls.z));",
    // dusk sky: deep blue overhead, mauve, a burning band on the horizon, the sun's glow off to the left behind us
    "  float e=rd.y; vec3 sky=mix(vec3(.5,.24,.13),vec3(.2,.13,.17),smoothstep(0.,.12,e)); sky=mix(sky,vec3(.04,.055,.1),smoothstep(.1,.5,e));",
    "  float az=dot(normalize(rd.xz),-sunDir); sky+=vec3(1.,.45,.15)*pow(max(0.,1.-abs(e)*6.),3.)*(.35+.65*smoothstep(-.6,1.,-rd.x))*.6*uSun;",
    "  sky*=1.+uFl*vec3(.6,.7,.95)*1.8;",                                                                           // the whole sky lights with a flash
    "  vec3 col=sky;",
    "  if(e<0.){ float tg=-CO.y/e; vec3 g=CO+rd*tg; float far=1.-exp(-tg*.06);",
    "    vec3 gr=vec3(.03,.028,.024)*(.8+.4*vn(g.xz*vec2(.8,.25)))+vec3(.04,.032,.024)*smoothstep(.3,.5,fract(g.x*1.3))*smoothstep(.7,.5,fract(g.x*1.3))*.3*(1.-far);",   // field rows near us
    "    float wet=pow(1.-clamp(-e*6.,0.,1.),3.); gr+=vec3(.55,.6,.75)*uFl*.35*wet+vec3(.6,.3,.15)*.05*wet;",
    "    col=mix(gr,vec3(.42,.22,.14),far*.85); }",
    "  vec2 tx=1./vec2(textureSize(uV,0)); vec4 v=texture(uV,uv)*.4+(texture(uV,uv+vec2(tx.x,0.))+texture(uV,uv-vec2(tx.x,0.))+texture(uV,uv+vec2(0.,tx.y))+texture(uV,uv-vec2(0.,tx.y)))*.15;",   // soft upscale of the reduced-resolution volume
    "  col=col*(1.-v.a)+v.rgb;",
    // cloud-to-ground bolts with a branch, a hot core and a wide glow; the ground under a strike lights up
    "  for(int i=0;i<2;i++){ float I=uBI[i].x; if(I<=.001) continue; float seed=uBI[i].y; vec2 p=vec2(uv.x*uA,uv.y); vec4 b=uB[i]*vec4(uA,1.,uA,1.); float s;",
    "    float d=boltD(p,b,seed,s); float br=1.;",
    "    vec4 b2=vec4(mix(b.z,b.x,.62)+(vn(vec2(seed,2.))-.5)*.02, mix(b.w,b.y,.62), mix(b.z,b.x,.62)+(vn(vec2(seed,5.))-.4)*.16, mix(b.w,b.y,.25)); float s2; float d2=boltD(p,b2,seed+11.,s2);",
    "    float core=exp(-d*uRes.y*.35)+exp(-d2*uRes.y*.6)*.6*(1.-s2*.2); float glow=exp(-min(d,d2)*60.)*.35+exp(-length(p-vec2(b.z,b.w))*22.)*.25;",
    "    col+=vec3(.82,.88,1.)*I*(core*9.+glow*1.4); }",
    "  o=vec4(col,1.); }"].join("\n");

  K.mod("supercell", function (gl, s, K) {
    var T = tier(), cfg = TIERS[T];
    var pv = K.compile(K.FSQ, VOL(cfg[0], cfg[1])), pc = K.compile(K.FSQ, COMP); if (!pv || !pc) return null;
    var rt = null;
    function mk(w, h) { if (rt && rt.w === w && rt.h === h) return; if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); }
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (K.halfRT) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); });
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); rt = { t: t, f: f, w: w, h: h }; }

    /* camera maths in JS (same as camRay) to place flashes and bolts */
    // yaw orbits the camera around a pivot ORBIT km ahead of the backdrop view (the storm), so the storm stays in view from every side;
    // pitch tilts the view, move dollies toward the pivot, up raises the camera. yaw = pitch = move = up = 0 is the backdrop view exactly.
    var ORBIT = 15;
    function basis(v) { var yaw = v && v.yaw || 0, pit = Math.tan(Math.atan(CAM.pitch) + (v && v.pitch || 0)), cy = Math.cos(yaw), sy = Math.sin(yaw);
      var f0 = norm([0, pit, 1]), f = [f0[2] * sy, f0[1], f0[2] * cy], r = norm(cross([0, 1, 0], f)), u = cross(f, r), d = ORBIT - (v && v.move || 0);
      O = [CAM.o[0] - sy * d, CAM.o[1] + (v && v.up || 0), CAM.o[2] + ORBIT - cy * d]; return { f: f, r: r, u: u, h: [sy, 0, cy] }; }
    function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    var O = CAM.o.slice(), B = basis();
    function ray(uvx, uvy, A) { var px = (uvx - .5) * A, py = uvy - .5; return norm([B.f[0] + (px * B.r[0] + py * B.u[0]) * CAM.fov, B.f[1] + (px * B.r[1] + py * B.u[1]) * CAM.fov, B.f[2] + (px * B.r[2] + py * B.u[2]) * CAM.fov]); }
    function proj(P, A) { var d = norm([P[0] - O[0], P[1] - O[1], P[2] - O[2]]); var z = dot(d, B.f); if (z < .05) return null; return [dot(d, B.r) / z / CAM.fov / A + .5, dot(d, B.u) / z / CAM.fov + .5]; }
    // where a screen x meets the storm: on the plane through the storm centre that faces the way we look (z = the centre's z when we look straight)
    function onPlane(uvx, A, zc) { var d = ray(uvx, .5, A), C = center(A), dz = (C[0] - O[0]) * B.h[0] + (zc - O[2]) * B.h[2], k = dz / Math.max(.05, d[0] * B.h[0] + d[2] * B.h[2]);
      return [O[0] + d[0] * k, O[2] + d[2] * k]; }
    function center(A) { return [A > 1 ? 1.2 : .2, 0, A > 1 ? 15 : 16]; }

    /* flashes: in-cloud lights (4 slots) and ground strikes (2 slots), each with a few return strokes */
    var flashes = [], bolts = [], nextOwn = 2 + Math.random() * 3, lastScape = -99, seen = K.ptr.tap, tNow = 0, Aspect = 1;
    var STROKES = [[0, 1], [.07, .7], [.15, .9], [.31, .45]];
    function env(age) { var v = 0; for (var i = 0; i < STROKES.length; i++) { var o = STROKES[i][0]; if (age >= o) v += STROKES[i][1] * Math.exp(-(age - o) * 16); } return age > 1.2 ? 0 : v; }
    function inCloud(x, power) { var C = center(Aspect), X = x == null ? [C[0] + (Math.random() - .5) * 6, C[2]] : onPlane(x, Aspect, C[2]);
      flashes.push({ P: [X[0], 2.5 + Math.random() * 5.5, X[1] + (Math.random() - .5) * 3], t: tNow, p: power || 1 }); if (flashes.length > 4) flashes.shift(); }
    // a bolt keeps its place in the world (top and ground point) and is projected every frame, so it stays put while the room camera moves
    function strike(x, power) { var C = center(Aspect), X = onPlane(x == null ? .3 + Math.random() * .4 : x, Aspect, C[2]);
      var top = [X[0], 1.05, X[1] - .5], gnd = [X[0] + (Math.random() - .5) * 1.4, 0, X[1] - 2 - Math.random() * 3];
      bolts.push({ top: top, gnd: gnd, t: tNow, seed: Math.random() * 100, p: power || 1 }); if (bolts.length > 2) bolts.shift();
      flashes.push({ P: [X[0], 1.3, X[1] - .3], t: tNow, p: (power || 1) * 1.4 }); if (flashes.length > 4) flashes.shift(); }
    function onScape(e) { var d = e.detail || {}; if (d.type !== "flash") return; lastScape = tNow;
      var dist = d.dist == null ? 3 : d.dist, x = d.x == null ? null : Math.min(.92, Math.max(.08, d.x)); if (dist < 1.4) strike(x, d.power); else inCloud(x, d.power); }
    addEventListener("titan:scape", onScape);
    var F = new Float32Array(16), UB = new Float32Array(8), UBI = new Float32Array(8), trOff = 0;

    return { name: "supercell",
      step: function (c) { tNow = c.t; Aspect = c.w / c.h; var P = c.ptr, v = c.view || {}; B = basis(v); trOff += (K.look("spin", 1) - 1) * c.dt;
        if (P.tap !== seen) { seen = P.tap; strike(P.tx, 1.3);
          try { dispatchEvent(new CustomEvent("titan:fx", { detail: { type: "lightning", dist: .7, x: P.tx, power: 1, from: "scene" } })); } catch (e) { /* ignore */ } }
        var rate = K.look("lightning", 1);
        if (c.t - lastScape > 25 && c.t > nextOwn && rate > 0) { if (Math.random() < .28) strike(null, .9); else inCloud(null, .8 + Math.random() * .5); nextOwn = c.t + (3 + Math.random() * 7) / rate; } },
      draw: function (c) {
        var A = c.w / c.h, C = center(A), w = Math.max(2, Math.round(c.w * cfg[2])), h = Math.max(2, Math.round(c.h * cfg[2])); mk(w, h);
        var sum = 0; F.fill(0); for (var i = 0; i < flashes.length; i++) { var f = flashes[i], I = env(c.t - f.t) * f.p; F.set([f.P[0], f.P[1], f.P[2], I], i * 4); sum += I; }
        UB.fill(0); UBI.fill(0); for (i = 0; i < bolts.length; i++) { var b = bolts[i], bi = env(c.t - b.t) * b.p, ta = proj(b.top, A), gb = proj(b.gnd, A); if (!ta || !gb) continue;
          UB.set([ta[0], ta[1], gb[0], Math.max(gb[1], .02)], i * 4); UBI.set([bi, b.seed, 0, 0], i * 4); }
        var room = c.view && c.view.mode === "room", sway = room ? [0, 0] : [(c.ptr.x - .5), (c.ptr.y - .5)], sun = K.look("sun", 1);
        function cam(u) { gl.uniform3f(u.uCO, O[0], O[1], O[2]); gl.uniform3f(u.uCF, B.f[0], B.f[1], B.f[2]); gl.uniform3f(u.uCR, B.r[0], B.r[1], B.r[2]); gl.uniform3f(u.uCU, B.u[0], B.u[1], B.u[2]); gl.uniform1f(u.uFov, CAM.fov); }
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt.f); gl.viewport(0, 0, w, h); gl.disable(gl.BLEND); gl.useProgram(pv.p); var u = pv.u;
        gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uA, A); gl.uniform3f(u.uC, C[0], C[1], C[2]); gl.uniform4fv(u.uF, F); gl.uniform2f(u.uSway, sway[0], sway[1]);
        cam(u); gl.uniform1f(u.uTr, c.t + trOff); gl.uniform1f(u.uRain, K.look("rain", 1)); gl.uniform1f(u.uSun, sun);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pc.p); u = pc.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rt.t); gl.uniform1i(u.uV, 0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uA, A); gl.uniform1f(u.uFl, Math.min(1.5, sum * .35)); gl.uniform4fv(u.uB, UB); gl.uniform4fv(u.uBI, UBI); gl.uniform2f(u.uSway, sway[0], sway[1]);
        cam(u); gl.uniform1f(u.uSun, sun);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () { return { tier: T, steps: cfg[0], res: cfg[2], flashes: flashes.length, bolts: bolts.length }; },
      flash: function (x, ground) { if (ground) strike(x, 1.2); else inCloud(x, 1.2); },     // for tests and the intro hand-over
      dispose: function () { removeEventListener("titan:scape", onScape); if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); } gl.deleteProgram(pv.p); gl.deleteProgram(pc.p); } };
  });
  K.themes.supercell = { stack: [
    { mod: "supercell" },
    { mod: "post", bloom: 1.2, threshold: .75, knee: .5, exposure: .95, aberr: .1, grain: .035, vig: .55 }
  ],
    // the room: how far you may look and move (radians, km), the named look controls, and its soundscape (audio/scape preset)
    room: { name: "The plains under the storm", yaw: [-3.1, 3.1], pitch: [-.12, .6], move: [-4, 8], up: [0, 3], orbit: true, unit: "km", sound: "storm",
      look: [{ id: "rain", label: "Rain", min: 0, max: 2.5, def: 1, scape: "rain" }, { id: "lightning", label: "Lightning", min: 0, max: 4, def: 1, scape: "intensity" },
        { id: "spin", label: "Rotation", min: 0, max: 6, def: 1 }, { id: "sun", label: "Sunset", min: .2, max: 2, def: 1 }],
      touch: "Tap the sky: a ground strike where you tapped, and its thunder.",
      // the opening on this engine: a camera move from the dark plains up to the storm, a strike, then the name
      opening: { dur: 5.2, from: { yaw: .62, pitch: -.1, move: -2.6, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.1, at: [.5, .56] } } };
})();
