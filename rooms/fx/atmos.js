/* fx/atmos.js: the shared atmosphere pass for TitanFXK (Grok 2026-10-20). One full-screen fragment shader, every layer weighted by
   the theme's stack entry (0 = off, the branch is skipped). Layers, back to front:
     base     two-colour sky/floor gradient (s.top, s.bottom, s.baseA)
     sand     raked zen gravel: parallel rake lines that bend into concentric rings around rocks, moonlit relief (s.sand)
     rocks    dark stones with mossy rims sitting in the sand (s.rocks = [[x,y,r],...])
     grid     a light-grid floor in perspective + light-cycle trails running its lanes (s.grid, s.gridC, s.trailC)
     signs    neon tubes (bars, rings, frames) with flicker, hum-glow and bloom halos; mirrored below the horizon on a wet street
              with ripple-broken, vertically smeared reflections and rain rings in puddles (s.signs, s.wet, s.horizon)
     portal   a swirling domain-warped portal with a hot rim and drifting goo blobs (s.portal, s.portalC, s.portalAt)
     aurora   curtains of light (s.aurora, s.auroraC)        plasma  boiling granulation + prominences (s.plasma)
     caustics underwater/ice light network (s.caustics, s.causticC)      rays  god rays from s.rayAt (s.rays, s.rayC)
     fog      volumetric fog: 3 fbm slabs drifting at different speeds, lit by signs/rays/portal, thicker low (s.fog, s.fogC)
     vignette + grain (s.vig, s.grain)
   Output is premultiplied; touch makes a soft light bloom where you touch (s.touchGlow). Quality tiers drop octaves/taps. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var FS = "#version 300 es\nprecision highp float;\n" + "NOISE" + [
    "uniform vec2 uRes, uPtr; uniform float uT, uQ, uTap;",
    "uniform vec3 uTop, uBot, uFogC, uRayC, uCauC, uAurC, uPorC, uGridC, uTrailC, uSandC, uTouchC;",
    "uniform float uBaseA, uSand, uRocksN, uGrid, uSigns, uWet, uHor, uPortal, uAurora, uPlasma, uCaus, uRays, uFog, uVig, uGrain, uTouch, uRain;",
    "uniform vec2 uRayAt, uPorAt; uniform vec3 uRocks[6]; uniform vec3 uSignC[4]; out vec4 o;",
    "float sq(float x){ return x*x; }",
    "float sdBox(vec2 p, vec2 b){ vec2 d = abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }",
    /* neon tubes: returns colour*glow. 7 tubes laid out on a facade; each flickers on its own clock, one buzzes broken */
    "vec3 signs(vec2 p, float a){ vec3 c = vec3(0.);",
    "  for (int i=0;i<7;i++){ float fi = float(i); vec2 h = vec2(fract(sin(fi*12.9)*437.5), fract(sin(fi*78.2)*137.1));",
    "    vec2 ctr = vec2((h.x-.5)*a*1.15, mix(uHor+.06, .72, h.y)); vec2 q = p-ctr; float d;",
    "    float kind = mod(fi,3.);",
    "    if (kind < .5) d = abs(sdBox(q, vec2(.09+.07*h.y, .028+.02*h.x))-.004);",       // frame
    "    else if (kind < 1.5) d = abs(length(q)-(.04+.03*h.x));",                        // ring
    "    else d = sdBox(q, vec2(.004, .07+.05*h.y));",                                   // vertical bar (a blade sign)
    "    vec3 col = uSignC[int(mod(fi,4.))];",
    "    float fl = step(.07, fract(sin(floor(uT*(6.+fi*3.))*(fi+1.)*91.3)*4375.)); if (i == 3) fl *= step(.5, fract(uT*.37)) + step(.92, fract(sin(floor(uT*21.)*7.)*99.));",   // flicker; tube 3 is on the blink
    "    float on = mix(1., fl, .9) * (.85+.15*sin(uT*120.+fi));",                       // mains hum
    "    c += col*(exp(-d*900.)*1.6 + exp(-d*90.)*.55 + exp(-d*16.)*.16)*on; }",        // core + halo + bloom
    "  return c; }",
    "vec4 layer(vec4 dst, vec3 c, float a){ return vec4(c*a + dst.rgb*(1.-a), a + dst.a*(1.-a)); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float a = uRes.x/uRes.y; vec2 p = vec2((uv.x-.5)*a, uv.y); float t = uT;",
    "  vec4 c = vec4(mix(uBot, uTop, smoothstep(0.,1.,uv.y))*uBaseA, uBaseA);",
    "  vec3 light = vec3(0.);",
    /* zen sand: rake lines whose phase follows distance to the nearest rock (concentric rings) blended into straight rows */
    "  if (uSand > 0.) { float best = 9.; vec2 bq = vec2(0.);",
    "    for (int i=0;i<6;i++){ if (float(i) >= uRocksN) break; vec2 q = (uv-uRocks[i].xy)*vec2(a,1.); float L = length(q)-uRocks[i].z; if (L < best){ best = L; bq = q; } }",
    "    float rows = uv.y*60. + fbm3(uv*vec2(3.,2.))*1.5, rings = best*230.;",
    "    float w = smoothstep(.16,.05,best); float ph = mix(rows, rings, w);",
    "    float groove = sin(ph*3.1416); float relief = groove*.5+.5;",
    "    float grain = h21(floor(gl_FragCoord.xy*.9))*.12;",
    "    vec3 sc = uSandC*(.55 + .35*relief + grain) + vec3(.25,.3,.4)*.05*sin(ph*3.1416+1.);",
    "    float moon = .75+.25*smoothstep(1.2,.0,length(uv-vec2(.8,1.05)));",
    "    c = layer(c, sc*moon*.62, uSand);",
    "    for (int i=0;i<6;i++){ if (float(i) >= uRocksN) break; vec2 q = (uv-uRocks[i].xy)*vec2(a,1.); float r = uRocks[i].z*(1.+.12*(fbm3(q*14.+float(i)*3.)-.5));",
    "      float L = length(q*vec2(1.,1.25)); float m = smoothstep(r, r*.92, L);",
    "      float sh = smoothstep(r*1.35, r, length((q+vec2(-.012,.02))*vec2(1.,1.25)))*(1.-m)*.55;",   // contact shadow
    "      c.rgb *= 1.-sh;",
    "      vec2 n2 = q/max(r,1e-3); float lit = clamp(.55 + .5*dot(normalize(vec3(n2, sqrt(max(0.,1.-dot(n2,n2))))), normalize(vec3(.5,.6,.6))), 0., 1.);",
    "      vec3 rc = mix(vec3(.07,.075,.08), vec3(.30,.31,.30), lit*fbm(q*40.+float(i)));",
    "      rc = mix(rc, vec3(.33,.45,.2)*(.6+.4*fbm3(q*60.)), smoothstep(.2,.9,n2.y)*smoothstep(.45,.75,fbm3(q*25.+3.))*.8);",   // moss on top
    "      c = layer(c, rc, m); } }",
    /* light grid + light-cycle trails */
    "  if (uGrid > 0.) { float hz = .46; if (uv.y < hz) { float z = .12/(hz-uv.y+.002); vec2 g = vec2(p.x*z*1.5, z - t*.9);",
    "      vec2 f = abs(fract(g)-.5); vec2 fw = fwidth(g); float L = max(1.-smoothstep(0.,fw.x*1.5,.5-f.x), 1.-smoothstep(0.,fw.y*1.5,.5-f.y));",
    "      float fade = smoothstep(14.,1.,z); vec3 gc = uGridC*L*fade*1.4 + uGridC*.05*fade;",
    "      for (int k=0;k<3;k++){ float lane = floor(-3.+float(k)*3.+.5), head = mod(t*(4.+float(k)*1.3)+float(k)*7., 40.)-6.;",
    "        float dx = abs(g.x-lane-.5+.5), along = (g.y+t*.9) - head; float tr = exp(-dx*dx*900./max(z,1.))*smoothstep(-12.,0.,-along)*step(along,0.)*fade;",
    "        vec3 tc = k==1 ? uTrailC.bgr : uTrailC; gc += tc*tr*2.2 + tc*exp(-abs(along)*4.)*exp(-dx*dx*60.)*fade*1.5; }",
    "      c = layer(c, gc, clamp(length(gc),0.,1.)*uGrid); }",
    "    float hl = exp(-abs(uv.y-hz)*90.); c.rgb += uGridC*hl*.6*uGrid; light += uGridC*hl*.4*uGrid; }",
    /* neon signs + wet street */
    "  if (uSigns > 0.) { if (uv.y > uHor) { vec3 s = signs(p, a); c.rgb += s*uSigns; light += s*.25; }",
    "    else { float dy = uHor-uv.y; vec2 rp = vec2(p.x, uHor+dy);",
    "      float rip = fbm3(vec2(p.x*12., dy*40.-t*.6))-.5;",                         // wet asphalt ripples break the reflection up
    "      vec3 r = vec3(0.); int TAPS = uQ > .6 ? 6 : 3;",
    "      for (int k=0;k<6;k++){ if (k>=TAPS) break; float o_ = float(k)/float(TAPS)*.06*(.3+dy*3.); r += signs(rp+vec2(rip*.025*(1.+dy*4.), o_), a); }",
    "      r /= float(TAPS);",
    "      float puddle = smoothstep(.45,.6, fbm(p*vec2(2.5,7.)+3.));",
    "      float conc = fbm(p*vec2(40.,90.))*.5+h21(floor(gl_FragCoord.xy))*.15;",   // concrete grain
    "      vec3 street = vec3(.02,.018,.03)*(.6+conc);",
    "      float ringy = 0.; if (uRain > 0.) { vec2 g = p*vec2(9.,26.); vec2 id = floor(g); vec2 f = fract(g)-.5; float ph = fract(t*.8+h21(id)); ringy = exp(-sq(length(f*vec2(1.,.6))-ph*.45)*900.)*(1.-ph)*step(.55,h21(id+3.)); }",
    "      vec3 refl = r*mix(.35,1.05,puddle)*uWet*exp(-dy*1.6) + ringy*uRain*(.15+r*1.5);",
    "      c = layer(c, street, .85*uSigns); c.rgb += refl*uSigns; light += r*.12; } }",
    /* portal */
    "  if (uPortal > 0.) { vec2 q = (uv-uPorAt)*vec2(a,1.); float L = length(q), ang = atan(q.y,q.x);",
    "    float sw = fbm(vec2(ang*2.+L*14.-t*1.6, L*6.-t*.4)+fbm3(q*6.+t*.2)*2.);",
    "    float R = .26+.015*sin(ang*7.+t*3.)+.02*fbm3(vec2(ang*3.,t));",
    "    float inside = smoothstep(R, R-.03, L), rim = exp(-sq((L-R)*38.));",
    "    vec3 pc = mix(uPorC*.25, uPorC*1.6, sw)*inside + mix(uPorC, vec3(.95,1.,.7), .5)*rim*1.6;",
    "    float goo = 0.; for (int k=0;k<5;k++){ float fk = float(k); vec2 bp = uPorAt + vec2(sin(t*.3+fk*2.1)/a, cos(t*.23+fk*1.7))*(.32+.06*fk); goo += .0009/max(1e-4, dot((uv-bp)*vec2(a,1.), (uv-bp)*vec2(a,1.))); }",
    "    float gb = smoothstep(.9,1.1,goo); vec3 gc = uPorC*.6*gb + vec3(1.)*smoothstep(1.4,2.,goo)*.25;",
    "    c.rgb = c.rgb*(1.-inside*.85*uPortal) + (pc + gc*.6)*uPortal; light += uPorC*exp(-L*3.)*.5*uPortal; }",
    /* aurora */
    "  if (uAurora > 0.) { float x = p.x*1.3; float cur = 0.; for (int k=0;k<3;k++){ float fk = float(k); float y0 = .72+.08*fk+.06*sin(x*2.+t*.15+fk)+.04*fbm3(vec2(x*3.,t*.1+fk));",
    "      float d = uv.y-y0; cur += exp(-d*d*(d>0.?60.:900.))*(.5+.5*fbm3(vec2(x*18.,t*.4+fk*5.))); }",
    "    vec3 ac = mix(uAurC, uAurC.gbr, smoothstep(.7,.95,uv.y)); c.rgb += ac*cur*.5*uAurora; light += ac*cur*.1*uAurora; }",
    /* plasma (solar granulation + a prominence arc) */
    "  if (uPlasma > 0.) { vec2 q = (uv-uRayAt)*vec2(a,1.); float L = length(q); float gran = fbm(q*30.+vec2(t*.05,0.)+fbm3(q*12.-t*.08)*2.);",
    "    float disc = smoothstep(.2,.19,L); vec3 sc = mix(vec3(1.,.35,.05), vec3(1.,.85,.4), gran)*disc;",
    "    float cor = exp(-max(0.,L-.2)*9.)*(1.-disc)*(.6+.4*fbm3(vec2(atan(q.y,q.x)*4.,L*8.-t*.3)));",
    "    c.rgb += (sc*1.2 + vec3(1.,.6,.2)*cor*.8)*uPlasma; light += vec3(1.,.6,.2)*cor*.3*uPlasma; }",
    /* caustics */
    "  if (uCaus > 0.) { vec2 q = p*5.; float cs = 0.; vec2 w = q; for (int k=0;k<3;k++){ w += vec2(sin(w.y*1.3+t*.7), cos(w.x*1.1-t*.6))*.55; cs += 1./(1.+40.*sq(sin(w.x)*sin(w.y))); }",
    "    cs = pow(cs/3.,2.2); c.rgb += uCauC*cs*uCaus*(.4+.6*uv.y); }",
    /* god rays */
    "  if (uRays > 0.) { vec2 q = (uv-uRayAt)*vec2(a,1.); float ang = atan(q.y,q.x), L = length(q);",
    "    float sh = fbm3(vec2(ang*9., t*.05))*.7 + fbm3(vec2(ang*23., -t*.07))*.3; float r = pow(sh, 3.)*exp(-L*1.4)*1.6 + exp(-L*6.)*.4;",
    "    c.rgb += uRayC*r*uRays; light += uRayC*r*.3*uRays; }",
    /* volumetric fog: three slabs, lit by what is behind them */
    "  if (uFog > 0.) { float fo = 0.; int S = uQ > .6 ? 3 : 2; for (int k=0;k<3;k++){ if (k>=S) break; float fk = float(k); fo += fbm(p*(1.4+fk*.9)+vec2(t*(.02+fk*.015), fk*3.1))*(1.-fk*.25); }",
    "    fo = fo/float(S); float hgt = mix(1., .45, smoothstep(0.,.9,uv.y)); float dens = smoothstep(.25,.85,fo)*hgt*uFog;",
    "    vec3 fc = uFogC + light*1.8; c = layer(c, fc, clamp(dens*.75,0.,.9)); }",
    "  if (uTouch > 0.) { vec2 q = (uv-uPtr)*vec2(a,1.); float age = t-uTap; c.rgb += uTouchC*exp(-dot(q,q)*90.)*exp(-age*1.6)*uTouch + uTouchC*exp(-sq((length(q)-age*.5)*40.))*exp(-age*2.5)*.4*uTouch; }",
    "  if (uRain > 0. && uSigns <= 0.) {} ",
    "  if (uVig > 0.) { float v = smoothstep(1.25,.35,length((uv-.5)*vec2(a*.85,1.))); c.rgb *= mix(1.,v,uVig); }",
    "  if (uGrain > 0.) c.rgb += (h21(gl_FragCoord.xy+fract(t)*91.)-.5)*uGrain*c.a;",
    "  o = vec4(min(c.rgb, vec3(c.a+.6)), c.a); }"].join("\n");
  K.mod("atmos", function (gl, s, K) {
    var pr = K.compile(K.FSQ, FS.replace("NOISE", K.NOISE)); if (!pr) return null;
    var V = function (x, d) { return x || d || [0, 0, 0]; }, N = function (x) { return x || 0; };
    var rocks = new Float32Array(18); (s.rocks || []).slice(0, 6).forEach(function (r, i) { rocks.set(r, i * 3); });
    var sc = new Float32Array(12); (s.signC || [[1, .3, .75], [.2, .9, 1], [.6, .4, 1], [1, .75, .3]]).forEach(function (c, i) { sc.set(c, i * 3); });
    return { name: "atmos", draw: function (c) {
      gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
      gl.uniform2f(u.uRes, c.w, c.h); gl.uniform2f(u.uPtr, c.ptr.tx, c.ptr.ty); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uQ, c.q); gl.uniform1f(u.uTap, c.ptr.tap);
      gl.uniform3fv(u.uTop, V(s.top)); gl.uniform3fv(u.uBot, V(s.bottom)); gl.uniform3fv(u.uFogC, V(s.fogC, [.3, .3, .35])); gl.uniform3fv(u.uRayC, V(s.rayC, [1, .9, .7]));
      gl.uniform3fv(u.uCauC, V(s.causticC, [.5, .9, 1])); gl.uniform3fv(u.uAurC, V(s.auroraC, [.2, 1, .6])); gl.uniform3fv(u.uPorC, V(s.portalC, [.35, 1, .3]));
      gl.uniform3fv(u.uGridC, V(s.gridC, [.2, .9, 1])); gl.uniform3fv(u.uTrailC, V(s.trailC, [1, .55, .1])); gl.uniform3fv(u.uSandC, V(s.sandC, [.85, .82, .74])); gl.uniform3fv(u.uTouchC, V(s.touchC, [1, 1, 1]));
      gl.uniform1f(u.uBaseA, s.baseA == null ? 1 : s.baseA); gl.uniform1f(u.uSand, N(s.sand)); gl.uniform1f(u.uRocksN, (s.rocks || []).length); gl.uniform3fv(u.uRocks, rocks);
      gl.uniform1f(u.uGrid, N(s.grid)); gl.uniform1f(u.uSigns, N(s.signs)); gl.uniform1f(u.uWet, s.wet == null ? 1 : s.wet); gl.uniform1f(u.uHor, s.horizon || .36);
      gl.uniform1f(u.uPortal, N(s.portal)); gl.uniform2fv(u.uPorAt, s.portalAt || [.72, .62]); gl.uniform1f(u.uAurora, N(s.aurora)); gl.uniform1f(u.uPlasma, N(s.plasma));
      gl.uniform1f(u.uCaus, N(s.caustics)); gl.uniform1f(u.uRays, N(s.rays)); gl.uniform2fv(u.uRayAt, s.rayAt || [.8, 1.05]); gl.uniform1f(u.uFog, N(s.fog));
      gl.uniform1f(u.uVig, s.vig == null ? .5 : s.vig); gl.uniform1f(u.uGrain, s.grain == null ? .03 : s.grain); gl.uniform1f(u.uTouch, s.touchGlow == null ? .5 : s.touchGlow);
      gl.uniform1f(u.uRain, N(s.rain)); gl.uniform3fv(u.uSignC, sc);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, dispose: function () { gl.deleteProgram(pr.p); } };
  });
})();
