/* fx/scenes-nms.js: NATURE / SPACE / MATERIAL+MAGIC scenes for TitanFXK (Grok, fx builder #2, 2026-10-20).
   One module, "scene": a full-screen HDR fragment scene picked by s.kind, drawn opaque as the base of a stack (put particles and
   { mod:"post" } after it). Every scene reads touch/mouse: K.ptr position, drag (accumulated into an orbit/turn), and taps.
   Quality: reads the tier from window.TitanQuality (Low/Medium/High/Ultra/Max) when it exists, else High; never auto-downgrades
   (the kit's frame governor is the only safety net). Ports and credits: fx/CREDITS.md.
   Kinds (batch 6): "orbit", "eclipse", "glowworms", "opal", "spellorb". Kinds (batch 5): "comet", "pulsar", "dunes", "frost", "clockwork". Kinds (batch 4): "jellyfish", "ringworld", "wormhole", "sakura", "cathedral". Kinds (batch 3): "waterfall", "portal", "glowforest", "sun", "plasmaglobe". Kinds (batch 2): "aurora", "galaxy", "lava", "crystals", "arcane". Kinds (batch 1): "nebula" (Star Nest volumetric fractal, MIT), "blackhole" (geodesic-bent rays + Doppler accretion disk),
   "rainforest" (layered swaying canopy + screen-space god rays + mist), "bubbles" (thin-film soap interference),
   "shatter" (polar-Voronoi glass fracture with per-shard refraction).
   Theme use:  T.mytheme = { stack: [ { mod:"scene", kind:"blackhole" }, { mod:"post", bloom:1.2 } ] }  or  K.preset("blackhole"). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var TIERS = { low: .45, medium: .65, high: .85, ultra: 1, max: 1.35 };
  /* Quality: TitanQuality.tier() first, then localStorage tr_quality (legacy tr_quality_v1), ?q= override; default High. Never auto-downgrades. */
  K.tier = function () { var Q = window.TitanQuality, v = null;
    try { v = Q && (typeof Q.tier === "function" ? Q.tier() : typeof Q.level === "function" ? Q.level() : Q.tier || Q.level); } catch (e) {}
    if (!v) try { v = localStorage.getItem("tr_quality") || localStorage.getItem("tr_quality_v1"); } catch (e) {}
    var m = /[?&]q=(low|medium|high|ultra|max)/i.exec(location.search); if (m) v = m[1];
    return TIERS[String(v || "high").toLowerCase()] || .85; };
  var HEAD = "#version 300 es\nprecision highp float;\nNOISE\nuniform vec2 uRes, uP, uTapP, uDrag; uniform float uT, uDown, uTap, uQ, uFl; out vec4 o;\n" +
    /* world contract (fx/kit.js): every kind reads its pixel through FC(), the screen seen through the room camera: yaw and pitch pan
       (in screen heights), move zooms toward the centre, up lifts. The default view gives gl_FragCoord exactly. */
    "uniform vec4 uView;\nvec4 FC(){ vec2 c = (FC_RAW.xy-.5*uRes)*exp(-uView.z)+.5*uRes+vec2(uView.x, uView.y+uView.w)*uRes.y; return vec4(c, FC_RAW.zw); }\n" +
    "float h31(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }\n" +
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,s,-s,c); }\n" +
    "vec3 aspectP(){ vec2 uv = gl_FragCoord.xy/uRes; return vec3((uv-.5)*vec2(uRes.x/uRes.y,1.), 0.); }\n";
  var S = {};
  /* ---- SPACE: nebula. Port of "Star Nest" by Pablo Roman Andrioli (Kali), Shadertoy XlfGRj, MIT. Drag turns the camera,
     tap fires a warp surge; volume steps scale with tier. Recoloured toward a nebula palette, HDR so post bloom catches stars. */
  S.nebula = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes-.5; uv.y *= uRes.y/uRes.x;",
    "  float surge = exp(-uTap*1.4)*step(0.,uTap); vec3 dir = vec3(uv*(.8+surge*.5), 1.);",
    "  float time = uT*(.01+surge*.08)+.25+surge*.0;",
    "  float a1 = .5+uDrag.x*2.+sin(uT*.03)*.2, a2 = .8+uDrag.y*2.;",
    "  dir.xz *= rot(a1); dir.xy *= rot(a2);",
    "  vec3 from = vec3(1.,.5,.5) + vec3(time*2., time, -2.); from.xz *= rot(a1); from.xy *= rot(a2);",
    "  float s = .1, fade = 1.; vec3 v = vec3(0.); int VS = int(clamp(14.*uQ+3., 8., 22.));",
    "  for (int r=0;r<22;r++){ if (r>=VS) break; vec3 p = from+s*dir*.5; p = abs(vec3(.85)-mod(p,vec3(1.7)));",
    "    float pa = 0., a = 0.; for (int i=0;i<17;i++){ p = abs(p)/dot(p,p)-.53; a += abs(length(p)-pa); pa = length(p); }",
    "    float dm = max(0., .3-a*a*.001); a *= a*a; if (r>6) fade *= 1.-dm;",
    "    v += fade; v += vec3(s, s*s, s*s*s*s)*a*.0015*fade; fade *= .73; s += .1; }",
    "  v = mix(vec3(length(v)), v, .85)*.01*(20./float(VS+6));",
    "  vec3 c = v*vec3(.9,.75,1.15); c = pow(c, vec3(1.35))*.75;",
    "  vec2 q = (gl_FragCoord.xy/uRes-uP)*vec2(uRes.x/uRes.y,1.); c += vec3(.6,.4,1.)*exp(-dot(q,q)*40.)*.35*uDown;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: black hole. Photon paths bent by the Schwarzschild term (a = -1.5 h^2 r / |r|^5, rs = 1), the technique popularised by
     Riccardo Antonelli's "starless" and many Shadertoy Gargantua ports; written fresh here. Disk 2.6..12 rs, Keplerian swirl,
     temperature ramp and relativistic beaming (D^3). Drag orbits the camera; tap = a flare that rides the disk. */
  S.blackhole = [
    "vec3 sky(vec3 d){ vec3 q = d*260.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5;",
    "  float st = step(.9965,h)*exp(-dot(f,f)*30.)*(2.+8.*h31(id+7.)); vec3 sc = mix(vec3(1.,.8,.6), vec3(.6,.75,1.), h31(id+3.));",
    "  float n = fbm(d.xy*2.+d.z)*fbm(d.yz*3.+4.); vec3 neb = mix(vec3(.05,.02,.09), vec3(.25,.08,.15), n)*n*1.4 + vec3(.02,.05,.1)*fbm(d.xz*5.);",
    "  return sc*st + neb*.6; }",
    "void main(){ vec3 a = aspectP(); vec2 uv = a.xy;",
    "  float yaw = uDrag.x*3.+uT*.03, pit = clamp(.26+uDrag.y*1.5, -1.2, 1.2), dist = 19.-3.*uDown;",
    "  vec3 ro = dist*vec3(sin(yaw)*cos(pit), sin(pit), -cos(yaw)*cos(pit)); vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*1.6 + rt*uv.x + up*uv.y);",
    "  vec3 p = ro, v = rd; vec3 hh = cross(p,v); float h2 = dot(hh,hh); vec3 col = vec3(0.); float tr = 1.;",
    "  int N = int(90.+130.*uQ); float flare = exp(-uTap*.6)*step(0.,uTap);",
    "  for (int i=0;i<300;i++){ if (i>=N) break; float r = length(p); if (r < 1.) { tr = 0.; break; } if (r > 45.) break;",
    "    float dt = clamp(.07*r, .015, 1.2); vec3 pp = p; v += -1.5*h2*p/pow(r,5.)*dt; p += v*dt;",
    "    if (pp.y*p.y < 0.) { vec3 x = mix(pp, p, pp.y/(pp.y-p.y)); float R = length(x.xz);",
    "      if (R > 2.6 && R < 12.) { vec2 sw = rot(uT*2.2/pow(R,1.5))*x.xz; float n = fbm(sw*1.3)*.6+fbm(vec2(R*4., atan(sw.y,sw.x)*2.))*.5;",
    "        float T = pow(2.6/R, .8); vec3 bb = mix(vec3(1.,.28,.05), mix(vec3(1.,.72,.38), vec3(.85,.9,1.), smoothstep(.6,1.,T)), T);",
    "        vec3 vd = normalize(vec3(-x.z,0.,x.x)); float D = 1./(1.-.55*dot(vd, -normalize(v))*inversesqrt(R*.5)); ",
    "        float fl = flare*exp(-pow(mod(atan(sw.y,sw.x)-uTap*1.5,6.2832)-3.,2.)*2.)*smoothstep(7.,3.,R)*3.;",
    "        float I = (n*n*1.6+.08+fl)*smoothstep(2.6,3.2,R)*smoothstep(12.,6.,R)*T*T*1.1*pow(D,3.);",
    "        float al = clamp(I*.6+.2, 0., .97);",
    "        col += tr*bb*I; tr *= 1.-al; } } }",
    "  col += tr*sky(normalize(v));",
    "  float r0 = length(uv); col += vec3(.5,.3,.15)*exp(-r0*3.)*.04;",
    "  o = vec4(col, 1.); }"].join("\n");
  /* ---- NATURE: rainforest canopy. Five parallax foliage layers (fbm leaf clumps, hanging vines, trunks) swaying on a wind field,
     aerial-perspective mist between them, and screen-space god rays (GPU Gems 3 ch.13, K. Mitchell: radial occlusion sampling toward
     the sun). The pointer steers the sun; a tap sends a gust through the leaves. Fireflies/leaves/pollen come from particles. */
  S.rainforest = [
    "float gustT(){ return exp(-uTap*.9)*step(0.,uTap); }",
    "float leaves(vec2 p, float L){ float A = uRes.x/uRes.y; float g = gustT();",
    "  float w = sin(uT*.6+p.y*2.+L)*.012*(1.+L*.4) + sin(uT*1.7+p.x*9.)*.004 + g*sin(uT*9.+p.x*6.)*.02*(1.+L);",
    "  p.x += w*smoothstep(.2,1.,p.y); vec2 uv = vec2(p.x/A+.5, p.y); vec2 q = p*(2.6+L*.7)+vec2(L*13.7, L*3.1);",
    "  float n = fbm(q*vec2(1.,1.3)) + .3*vn(q*11.) + .15*vn(q*31.);",
    "  float top = smoothstep(-.01,.01, p.y - (.97 - .055*L + (n-.6)*(.22+.05*L)));",
    "  float sd = abs(uv.x-.5)*2.; float side = smoothstep(-.01,.01, sd - (1.08 - .075*L + (n-.6)*.3))*step(1.5,L);",
    "  float under = smoothstep(.01,-.01, p.y - (.03 + .028*L + (n-.5)*.14 + .05*vn(vec2(p.x*40.,L))));",
    "  float vine = 0.; for (int k=0;k<3;k++){ float fk = float(k); float x0 = (h21(vec2(fk,L))-.5)*A*.9; float len = .15+.35*h21(vec2(L,fk+4.));",
    "    vine = max(vine, smoothstep(.0025+.001*L, .0, abs(p.x-x0-sin(p.y*7.+uT*.8+fk)*.012))*smoothstep(.95-len-.08*L, 1.-len-.08*L, p.y)); }",
    "  float trunk = 0.; for (int k=0;k<2;k++){ float fk = float(k); float x0 = (h21(vec2(L*7.,fk))-.5)*A*1.1; float wd = (.004+.01*h21(vec2(fk,L*3.)))*(1.+L*.6);",
    "    trunk = max(trunk, smoothstep(wd, wd*.6, abs(p.x-x0+sin(p.y*3.+fk)*.015*(1.-p.y)))); }",
    "  return clamp(max(max(max(top, side), under), max(vine, trunk)), 0., 1.); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = vec2((uv.x-.5)*A, uv.y);",
    "  vec2 sun = vec2(mix(.25,.75,uP.x), 1.08);",
    "  vec3 skyC = mix(vec3(.3,.45,.36), vec3(.95,.93,.7), smoothstep(.6,0.,length((uv-sun)*vec2(A,1.))));",
    "  vec3 c = skyC; float occ = 0.;",
    "  for (int i=0;i<5;i++){ float L = float(i); float par = (uP.x-.5)*.04*(L+1.); float m = leaves(p+vec2(par,0.), L);",
    "    float depth = 1.-L/5.; vec3 lc = mix(vec3(.02,.06,.03), vec3(.1,.3,.16), depth*.8); lc += vec3(.35,.45,.1)*vn(p*60.+L)*.08*depth;",
    "    vec3 mist = mix(vec3(.2,.34,.28), vec3(.5,.62,.48), uv.y)*(1.-.35*smoothstep(.2,.9,abs(uv.x-.5)*2.)); c = mix(c, mix(lc, mist, depth*depth*.75), m);",
    "    c = mix(c, mist, .07*(1.-uv.y)*(1.+fbm3(p*3.+vec2(uT*.03,L))));",          // mist between layers
    "    occ = max(occ, m); }",
    "  vec2 d = (sun-uv); float NS = 24.+24.*uQ; float sh = 0., w = 1.;",
    "  for (int k=0;k<56;k++){ if (float(k)>=NS) break; vec2 s = uv + d*(float(k)/NS)*.9; vec2 sp = vec2((s.x-.5)*A, s.y);",
    "    float mm = 0.; for (int i=0;i<3;i++){ float L = float(i)*2.; mm = max(mm, leaves(sp+vec2((uP.x-.5)*.04*(L+1.),0.), L)); }",
    "    sh += (1.-mm)*w; w *= .965; }",
    "  sh /= NS*.6; vec3 rays = vec3(1.,.93,.7)*pow(sh,2.)*.35*(.6+.4*fbm3(vec2(atan(d.y,d.x)*8.,uT*.1)));",
    "  c += rays*(1.-occ*.5); c += vec3(1.,.95,.75)*exp(-length((uv-sun)*vec2(A,1.))*6.)*.9;",
    "  float hz = fbm(p*vec2(1.5,4.)+vec2(uT*.02,0.)); c = mix(c, vec3(.55,.7,.6)+rays*.6, smoothstep(.45,.9,hz)*.25*(1.-uv.y*.5));",
    "  o = vec4(c*.8, 1.); }"].join("\n");
  /* ---- MATERIAL: soap bubbles. Analytic spheres with thin-film interference (Glassner/Belcour-style 3-wavelength approximation:
     I = .5 + .5 cos(4 pi n d cos(theta_t) / lambda)), film thickness draining downward with swirling Marangoni noise, Fresnel rim,
     reflected softbox highlights and a refracted bokeh backdrop. Bubbles drift on a CPU spring system: drag pushes, tap pops. */
  S.bubbles = [
    "uniform vec4 uB[10]; uniform float uPop[10];",
    "vec3 back(vec2 p){ vec3 c = mix(vec3(.01,.012,.03), vec3(.05,.03,.08), p.y+.5);",
    "  for (int k=0;k<9;k++){ float fk = float(k); vec2 bp = vec2(sin(fk*3.1+uT*.05)*.9, fract(fk*.37+uT*.008)*1.2-.6); vec3 bc = .5+.5*cos(fk*1.7+vec3(0,2,4));",
    "    c += bc*smoothstep(.06,.05,length(p-bp))*.12 + bc*exp(-length(p-bp)*7.)*.06; } return c; }",
    "vec3 film(float d, float ct){ vec3 lam = vec3(650.,510.,475.); return .5+.5*cos(6.2832*2.*1.33*d*ct/lam); }",
    "void main(){ vec3 a = aspectP(); vec2 p = a.xy; vec3 c = back(p);",
    "  for (int i=0;i<10;i++){ vec4 b = uB[i]; if (b.w <= 0.) continue; vec2 d = (p-b.xy)/b.w; float r2 = dot(d,d);",
    "    float pop = uPop[i]; if (pop > 0.) { float ring = exp(-pow(sqrt(r2)-1.-pop*3.,2.)*60.)*(1.-pop); c += vec3(.8,.9,1.)*ring*.5; continue; }",
    "    if (r2 > 1.) continue; vec3 n = vec3(d, sqrt(1.-r2)); float ct = n.z;",
    "    float sw = fbm(n.xy*2.5+vec2(uT*.08, -uT*.05)+float(i)*7.) + .5*fbm(n.xy*6.-uT*.1);",
    "    float thick = mix(180., 900., smoothstep(.9,-.9,n.y)*.6+sw*.6);",
    "    float F = .04+.96*pow(1.-ct, 5.); vec3 ir = film(thick, sqrt(1.-(1.-ct*ct)/1.77));",
    "    vec3 refr = back(p - d*b.w*.08*(1.-ct));",
    "    vec3 R = reflect(vec3(0,0,-1), n); float box = smoothstep(.12,.0,length(max(abs(R.xy-vec2(-.45,.5))-vec2(.18,.12),0.)))*step(0.,R.z);",
    "    float box2 = smoothstep(.2,.0,length(R.xy-vec2(.6,-.3)))*.4; vec3 env = vec3(1.,.98,.95)*(box*3.+box2) + vec3(.2,.25,.4)*(R.y*.5+.5)*.3;",
    "    vec3 sc = refr*(1.-F*.6) + ir*(F*1.4+.08)*(.5+env) + env*F*ir*1.5;",
    "    c = mix(c, sc, smoothstep(1.,.985,r2)); c += ir*exp(-pow(1.-sqrt(r2),2.)*900.)*.25; }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MATERIAL: glass shatter. A pane in front of a night-city bokeh; a tap is an impact: radial + concentric cracks race out
     (polar Voronoi, F2-F1 edges), every shard tilts on its own so the city refracts and glints differently through it, a white
     stress flash rides the crack front, then the pane slowly heals with a light sweep. Drag tilts the whole pane (specular). */
  S.shatter = [
    "vec3 city(vec2 p){ vec3 c = mix(vec3(.02,.01,.04), vec3(.08,.03,.1), p.y+.5);",
    "  for (int k=0;k<24;k++){ float fk = float(k); vec2 bp = vec2(fract(fk*.618)*2.4-1.2, fract(fk*.437)*1.2-.6) + vec2(sin(uT*.1+fk),0.)*.03;",
    "    vec3 bc = mix(vec3(1.,.55,.2), vec3(.3,.6,1.), step(.5, fract(fk*.73))); if (fract(fk*.31)>.75) bc = vec3(1.,.25,.45);",
    "    float r = .025+.06*fract(fk*.53); c += bc*smoothstep(r, r*.85, length(p-bp))*.35*(.6+.4*sin(fk+uT*.7)); }",
    "  return c; }",
    "vec3 vor(vec2 x){ vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.; vec2 id = vec2(0.);",
    "  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 cid = n+g; cid.x = mod(cid.x, 14.); vec2 o2 = g + .15 + .7*h22(cid) - f; float d = dot(o2,o2);",
    "    if (d < d1) { d2 = d1; d1 = d; id = cid; } else if (d < d2) d2 = d; }",
    "  return vec3(sqrt(d2)-sqrt(d1), id); }",
    "void main(){ vec3 a = aspectP(); vec2 p = a.xy; float A = uRes.x/uRes.y; vec2 ip = (uTapP-.5)*vec2(A,1.);",
    "  float tau = uTap < 0. ? 99. : uTap; float heal = smoothstep(9.,11.,tau); float front = tau*2.2;",
    "  vec2 q = p-ip; float r = length(q), ang = atan(q.y,q.x);",
    "  vec3 v = vor(vec2((ang/6.2832+.5)*14., log(r+.02)*3.2));",
    "  float on = smoothstep(front, front-.15, r)*(1.-heal)*step(tau, 11.);",
    "  float crack = smoothstep(.06, .0, v.x)*on; float shard = on;",
    "  vec2 tilt = (h22(v.yz+3.)-.5)*.06*shard*smoothstep(0.,.5,r) + (uDrag)*.05;",
    "  vec3 bgc = city(p + tilt); vec3 n = normalize(vec3(tilt*8., 1.));",
    "  float spec = pow(clamp(dot(reflect(normalize(vec3(p, -1.5)), n), normalize(vec3(-.3,.5,.8))), 0., 1.), 60.);",
    "  vec3 c = bgc*(1.-.15*shard) + vec3(.7,.85,1.)*spec*(.3+shard*1.2);",
    "  c += vec3(.85,.92,1.)*crack*(.5+1.5*exp(-tau*1.5));",
    "  c += vec3(.9,.95,1.)*exp(-pow((r-front)*25.,2.))*(1.-heal)*step(tau,3.)*1.5;",            // stress flash on the crack front
    "  c += vec3(1.,.95,.9)*exp(-r*r*400.)*exp(-tau*3.)*6.;",                                   // impact point
    "  float sweep = exp(-pow((p.x+p.y*.5) - (tau-9.)*1.4 + 1.2, 2.)*30.)*step(9.,tau)*step(tau,11.5); c += vec3(.6,.8,1.)*sweep*.8;",
    "  c += vec3(.7,.8,1.)*.025*smoothstep(.0,.6,1.-abs(p.y-p.x*.3-.2))*(1.-shard);",            // faint pane sheen
    "  o = vec4(c, 1.); }"].join("\n");
  /* ===================== batch 2 (fx builder #2): aurora, galaxy, lava, crystals, arcane ===================== */
  /* ---- NATURE: aurora. Curtains follow nimitz's "Auroras" (Shadertoy XtGGRt) approach: a stack of planes sampled with
     rotated triangle noise, each a step higher and redder; re-written for this kit. Over a snow ridge and a still lake that
     mirrors the sky. Drag looks around, tap sends a substorm surge rippling along the curtains. */
  S.aurora = [
    "float tri(float x){ return clamp(abs(fract(x)-.5),.01,.49); } vec2 tri2(vec2 p){ return vec2(tri(p.x)+tri(p.y), tri(p.y+tri(p.x))); }",
    "float triN(vec2 p, float spd){ float z = 1.8, z2 = 2.5, rz = 0.; p *= rot(p.x*.06); vec2 bp = p;",
    "  for (int i=0;i<5;i++){ vec2 dg = tri2(bp*1.85)*.75; dg *= rot(uT*spd); p -= dg/z2; bp *= 1.3; z2 *= .45; z *= .42; p *= 1.21+(rz-1.)*.02; rz += tri(p.x+tri(p.y))*z; p *= -mat2(.95534,.29552,-.29552,.95534); }",
    "  return clamp(1./pow(rz*29.,1.3),0.,.55); }",
    "vec4 aur(vec3 ro, vec3 rd, float surge){ vec4 col = vec4(0.), avg = vec4(0.); int N = int(18.+26.*uQ);",
    "  for (int i=0;i<50;i++){ if (i>=N) break; float fi = float(i)*50./float(N); float of = .006*h21(gl_FragCoord.xy)*smoothstep(0.,15.,fi);",
    "    float pt = ((.8+pow(fi,1.4)*.002)-ro.y)/(rd.y*2.+.4); pt -= of; vec3 bpos = ro + pt*rd; vec2 p = bpos.zx;",
    "    float rzt = triN(p+vec2(surge*.3*sin(p.y*3.),0.), .06+surge*.2);",
    "    vec4 c2 = vec4(0,0,0,rzt); c2.rgb = (sin(1.-vec3(2.15,-.5,1.2)+fi*.043)*.5+.5)*rzt;",
    "    avg = mix(avg, c2, .5); col += avg*exp2(-fi*.065-2.5)*smoothstep(0.,5.,fi); }",
    "  col *= clamp(rd.y*15.+.4,0.,1.); return col*.75*(1.+surge*1.5); }",
    "vec3 stars(vec3 d){ vec3 q = d*300.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5; return vec3(.9,.95,1.)*step(.997,h)*exp(-dot(f,f)*25.)*(1.+2.*h31(id+2.)); }",
    "vec3 sky(vec3 rd, vec3 ro, float surge){ vec3 c = mix(vec3(.01,.015,.03), vec3(.04,.06,.1), pow(1.-max(rd.y,0.),3.));",
    "  c += stars(rd)*smoothstep(0.,.1,rd.y); vec4 a = aur(ro, rd, surge); return c*(1.-a.a) + a.rgb; }",
    "void main(){ vec3 a = aspectP(); vec2 uv = a.xy; float surge = uTap<0. ? 0. : exp(-uTap*.5)*smoothstep(0.,.3,uTap);",
    "  vec3 ro = vec3(0,0,-6.7); vec3 rd = normalize(vec3(uv, 1.3));",
    "  rd.yz *= rot(-.1-clamp(uDrag.y,-.4,.3)); rd.xz *= rot(uDrag.x*1.5+sin(uT*.025)*.15);",
    "  vec3 c; float hz = .035*fbm3(vec2(atan(rd.x,rd.z)*4.,1.)) + .012*fbm(vec2(atan(rd.x,rd.z)*20.,3.));",
    "  if (rd.y > hz) c = sky(rd, ro, surge);",
    "  else if (rd.y > -.02+hz*.2 && rd.y <= hz) { float s = fbm(vec2(atan(rd.x,rd.z)*30., rd.y*90.)); c = vec3(.04,.05,.08)*(.4+s) + sky(vec3(rd.x,.1,rd.z),ro,surge)*.08; }",
    "  else { vec3 rr = rd; rr.y = abs(rr.y); vec2 w = rd.xz/max(-rd.y,.01)*.5; float rip = fbm(w*3.+uT*.1)*.006; rr.y += rip; rr = normalize(rr);",
    "    float F = .25+.75*pow(1.-abs(rd.y),5.); c = sky(rr, ro, surge)*F*.7 + vec3(.005,.008,.012); }",
    "  vec2 q = (gl_FragCoord.xy/uRes-uP)*vec2(uRes.x/uRes.y,1.); c += vec3(.2,1.,.6)*exp(-dot(q,q)*30.)*.05*uDown;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: galaxy. A barred spiral rendered as a thin volume: logarithmic arms (pitch 14 deg) warped by fbm, blue star-forming
     knots on the arm crests, brown dust lanes on their inner edges, a warm bulge and a halo of field stars. Raymarched through the
     disk so dust really occludes and the inclination is a true 3D tilt. Drag tilts/turns it; tap = a supernova in an arm. */
  S.galaxy = [
    "float dens(vec3 p, out float dust, out float knots){ float r = length(p.xz), a = atan(p.z,p.x) - uT*.04/(.3+r);",
    "  float arm = .5+.5*cos(2.*(a - log(r+.05)*4.));",
    "  float w = fbm(p.xz*3.+3.)*.9; float arms = pow(clamp(arm+w*.35-.15,0.,1.), 3.);",
    "  float disk = exp(-r*1.5)*exp(-abs(p.y)*(14.+6.*r));",
    "  dust = pow(clamp(.5+.5*cos(2.*(a - log(r+.05)*4.)+.55)+fbm(p.xz*7.)*.4-.4,0.,1.),2.)*disk*smoothstep(.05,.25,r)*3.;",
    "  knots = pow(fbm(p.xz*14.+9.),4.)*arms*disk*18.;",
    "  return arms*disk*2.5 + exp(-r*r*30.-p.y*p.y*90.)*1.6; }",
    "void main(){ vec3 A = aspectP(); vec2 uv = A.xy;",
    "  float inc = clamp(1.05+uDrag.y*2.,.15,1.5), spin = uDrag.x*2.;",
    "  vec3 ro = vec3(0., sin(inc), -cos(inc))*2.4; vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*1.5+rt*uv.x+up*uv.y); ro.xz *= rot(spin); rd.xz *= rot(spin);",
    "  vec3 bg = vec3(0.); { vec3 q = rd*220.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5; bg = mix(vec3(1.,.85,.7),vec3(.7,.8,1.),h31(id+1.))*step(.996,h)*exp(-dot(f,f)*30.)*(1.+3.*h31(id+5.)); }",
    "  float t0 = (-ro.y-.25*sign(rd.y))/rd.y, t1 = (-ro.y+.25*sign(rd.y))/rd.y; if (abs(rd.y)<1e-3){ t0 = 0.; t1 = 6.; } t0 = max(t0,0.); t1 = min(t1, 7.);",
    "  int N = int(28.+44.*uQ); float dt = (t1-t0)/float(N); float t = t0 + dt*h21(gl_FragCoord.xy+uT);",
    "  vec3 col = vec3(0.); float tr = 1.;",
    "  vec2 snP = vec2(cos(5.1),sin(5.1))*.42; float sn = uTap<0. ? 0. : exp(-uTap*.45)*smoothstep(0.,.08,uTap);",
    "  for (int i=0;i<80;i++){ if (i>=N || t>t1 || tr<.02) break; vec3 p = ro+rd*t; float du, kn; float d = dens(p, du, kn);",
    "    float r = length(p.xz); vec3 em = mix(vec3(1.,.78,.5), vec3(.75,.85,1.), smoothstep(.1,.7,r))*d + vec3(.4,.6,1.)*kn + vec3(1.,.35,.5)*kn*.4*fbm(p.xz*20.);",
    "    em += vec3(1.,.95,.9)*sn*30.*exp(-dot(p.xz-snP,p.xz-snP)*900.-p.y*p.y*900.);",
    "    col += tr*em*dt*1.1; tr *= exp(-du*dt*30.); t += dt; }",
    "  col += bg*tr; col += vec3(1.,.8,.6)*sn*.02/(length(uv - (vec2(dot(vec3(snP.x,0.,snP.y)-ro,rt), dot(vec3(snP.x,0.,snP.y)-ro,up))/dot(vec3(snP.x,0.,snP.y)-ro,fw)*1.5))+.01);",
    "  o = vec4(col, 1.); }"].join("\n");
  /* ---- NATURE: lava field. Flow-noise magma (after Inigo Quilez's domain warping and Perlin/Neyret "flow noise") with black basalt crust
     plates (Voronoi) that split along glowing seams, rafts drift with the current, crust edges cool from orange to black, heat shimmer
     above it all. Drag stirs the flow, hold heats the crust under your finger, tap bursts a lava fountain. */
  S.lava = [
    "vec3 vor(vec2 x){ vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.; vec2 id = vec2(0.);",
    "  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 o2 = g + .5+.4*sin(uT*.15+6.28*h22(n+g)) - f; float d = dot(o2,o2);",
    "    if (d<d1){ d2 = d1; d1 = d; id = n+g; } else if (d<d2) d2 = d; } return vec3(sqrt(d2)-sqrt(d1), id); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec2 P = vec2(p.x, p.y/(.55+.45*(1.-uv.y)))*2.2;",   // fake perspective: farther toward the top
    "  vec2 fl = vec2(.06,.03)*uT + uDrag*.8; float sh = (fbm3(P*6.+uT*2.)-.5)*.012*(1.-uv.y); P += sh;",
    "  vec2 q = vec2(fbm(P+fl), fbm(P+vec2(5.2,1.3)-fl*.7)); vec2 r = vec2(fbm(P+4.*q+vec2(1.7,9.2)+uT*.05), fbm(P+4.*q+vec2(8.3,2.8)-uT*.04));",
    "  float m = fbm(P+4.*r);",
    "  vec3 v = vor(P*2.4+q*1.2); float seam = smoothstep(.0,.16+.06*sin(uT*.6+v.y*3.), v.x);",
    "  vec2 fp = (uP-.5)*vec2(A,1.); float heat = exp(-dot(p-fp,p-fp)*25.)*uDown;",
    "  float tap = uTap<0. ? 0. : exp(-uTap*.7); vec2 tp = (uTapP-.5)*vec2(A,1.); float burst = exp(-dot(p-tp,p-tp)*(120./(.2+max(uTap,0.)*.6)))*tap;",
    "  float crust = clamp(seam*(.75+.5*h21(v.yz)) - heat*.9 - burst*1.5, 0., 1.);",
    "  float T = clamp(m*1.3 + (1.-crust)*.9 - crust*.6 + heat*.6 + burst*2., 0., 3.);",
    "  vec3 magma = (vec3(1.,.25,.02)*T + vec3(1.,.7,.2)*pow(T,3.)*.25 + vec3(1.,.95,.8)*pow(max(T-1.6,0.),2.)*.6)*.6;",
    "  float rough = fbm(P*14.+v.yz); vec3 rock = vec3(.035,.03,.03)*(.5+rough) + vec3(.6,.15,.02)*pow(1.-seam,6.)*.8;",
    "  vec3 n = normalize(vec3(dFdx(rough), dFdy(rough), .02)); rock += vec3(.9,.4,.15)*pow(max(dot(n, normalize(vec3(0.,-.4,1.))),0.),12.)*.15*(1.-crust*.3);",
    "  vec3 c = mix(magma, rock, smoothstep(.25,.6,crust));",
    "  float erupt = uFl<0. ? 0. : exp(-uFl*1.5)*smoothstep(0.,.05,uFl); c += vec3(1.,.3,.05)*.12*smoothstep(.3,1.,uv.y)*(.6+.4*fbm3(vec2(uv.x*3.,uT*.2)))*(1.+6.*erupt); c *= 1.+.35*erupt;",   // glow haze on the far field
    "  c *= .85+.15*(1.-smoothstep(.2,1.2,length(p)));",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MATERIAL: crystal geode. Raymarched cluster of hexagonal quartz/amethyst prisms (Inigo Quilez's hexagonal-prism SDF and
     smooth-min) growing out of a split geode; glass shading with Fresnel, an internal-path approximation with RGB dispersion
     (three IORs), inner veils and a slow caustic light that orbits. Drag turns it; hold draws the light to your finger; tap = resonance
     pulse that rings up through every crystal. */
  S.crystals = [
    "float sdHex(vec3 p, vec2 h){ const vec3 k = vec3(-.8660254,.5,.57735); p = abs(p); p.xy -= 2.*min(dot(k.xy,p.xy),0.)*k.xy;",
    "  vec2 d = vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x),h.x))*sign(p.y-h.x), p.z-h.y); return min(max(d.x,d.y),0.)+length(max(d,0.)); }",
    "float xtal(vec3 p, vec3 base, vec3 dir, float r, float len){ vec3 z = normalize(dir); vec3 x = normalize(cross(z, vec3(.3,1.,.2))); vec3 y = cross(z,x);",
    "  vec3 q = p-base; q = vec3(dot(q,x),dot(q,y),dot(q,z)); q.z -= len*.5;",
    "  float body = sdHex(q, vec2(r, len*.5)); float tip = dot(vec3(abs(q.xy), q.z-len*.5), normalize(vec3(.8,.46,.9)))-r*.55; return max(body, tip); }",
    "float map(vec3 p, out float id){ float d = 1e3; id = 0.;",
    "  for (int i=0;i<9;i++){ float fi = float(i); vec3 h = vec3(h21(vec2(fi,1.)),h21(vec2(fi,2.)),h21(vec2(fi,3.)));",
    "    vec3 dir = normalize(vec3((h.x-.5)*1.3, .9, (h.y-.5)*1.1)); vec3 b = vec3((h.x-.5)*.7, -.75, (h.y-.5)*.5);",
    "    float c = xtal(p, b, dir, .1+.09*h.z, .7+1.*h.z*(i==0?1.6:1.)); if (c<d){ d = c; id = fi; } }",
    "  float rock = length(p-vec3(0.,-1.3,0.))-.8 + fbm3(p.xz*4.)*.12; if (rock<d){ d = rock; id = -1.; } return d; }",
    "vec3 nrm(vec3 p){ float id; vec2 e = vec2(.0015,0.); return normalize(vec3(map(p+e.xyy,id)-map(p-e.xyy,id), map(p+e.yxy,id)-map(p-e.yxy,id), map(p+e.yyx,id)-map(p-e.yyx,id))); }",
    "vec3 env(vec3 d, vec3 L){ vec3 c = mix(vec3(.02,.015,.04), vec3(.08,.05,.14), d.y*.5+.5); c += vec3(1.,.85,1.)*pow(max(dot(d,L),0.),40.)*1.2 + vec3(.5,.3,1.)*pow(max(dot(d,L),0.),6.)*.4; return c; }",
    "void main(){ vec3 A = aspectP(); vec2 uv = A.xy; float yaw = uDrag.x*3.+uT*.08, pit = clamp(.25+uDrag.y,-.1,1.);",
    "  vec3 ro = 3.4*vec3(sin(yaw)*cos(pit), sin(pit), -cos(yaw)*cos(pit)); vec3 fw = normalize(vec3(0.,-.05,0.)-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*1.8+rt*uv.x+up*uv.y);",
    "  vec3 L = normalize(vec3(cos(uT*.3), .7, sin(uT*.3))); if (uDown>.5) L = normalize(rt*(uP.x-.5)*3.+up*(uP.y-.2)*3.-fw*.6);",
    "  float pulse = uTap<0. ? 0. : exp(-uTap*.8);",
    "  float t = 0., id = 0.; bool hit = false; int N = int(50.+60.*uQ);",
    "  for (int i=0;i<120;i++){ if (i>=N) break; float d = map(ro+rd*t, id); if (d<.001){ hit = true; break; } t += d*.9; if (t>8.) break; }",
    "  vec3 c = env(rd, L)*.6;",
    "  if (hit){ vec3 p = ro+rd*t, n = nrm(p);",
    "    if (id < 0.){ float ao = clamp(map(p+n*.08,id)/.08,0.,1.); vec3 rc = vec3(.08,.07,.07)*(.4+fbm(p.xz*9.))*(max(dot(n,L),0.)+.15)*ao; c = rc + vec3(.5,.2,.9)*.08*ao; }",
    "    else { float F = .04+.96*pow(1.-max(dot(-rd,n),0.),5.); vec3 refl = env(reflect(rd,n), L);",
    "      vec3 tint = mix(vec3(.75,.45,1.), vec3(.9,.92,1.), h21(vec2(id,7.)));",
    "      vec3 tr3; for (int k=0;k<3;k++){ float ior = 1.53+float(k)*.025; vec3 rr = refract(rd, n, 1./ior); vec3 pin = p+rr*.35;",
    "        float veil = fbm(pin.xy*6.+pin.z*4.+id); vec3 e = env(refract(rr, -nrm(pin), ior+.0001)+rr*.0001, L)*(.6+veil*1.4);",
    "        tr3[k] = e[k]; }",
    "      float glow = pow(max(dot(normalize(L+-rd), n),0.),80.)*1.2;",
    "      float ring = exp(-pow((p.y+.8) - uTap*1.6, 2.)*30.)*pulse;",
    "      c = mix(tr3*tint*1.2, refl, F) + vec3(1.)*glow + tint*vec3(.8,.6,1.)*ring*3. + tint*.06; } }",
    "  c = min(c, vec3(1.5)); float lm = dot(c,vec3(.3,.59,.11)); c *= 1./(1.+max(lm-.9,0.)*.8); o = vec4(c, 1.); }"].join("\n");
  /* ---- MAGIC: arcane circle. A summoning sigil drawn procedurally (concentric rings, rotating rune bands, an inscribed heptagram and
     orbiting glyph seals), lit like burning gold leaf on a dark slate floor seen in perspective, with a volumetric light column and a
     swirling vortex of sparks (particles layer in the preset). Drag spins the outer ring; hold charges it; tap = a castF flash. */
  S.arcane = [
    "float ring(float r, float R, float w){ return smoothstep(w, 0., abs(r-R)); }",
    "float rune(vec2 p, float seed){ vec2 g = floor(p*vec2(5.,3.)); vec2 f = fract(p*vec2(5.,3.)); float h = h21(g+seed);",
    "  float v = step(.5,h)*(1.-smoothstep(.0,.12,abs(f.x-.5))) + step(.4,fract(h*7.))*(1.-smoothstep(.0,.12,abs(f.y-.5))) + step(.75,fract(h*13.))*(1.-smoothstep(.0,.1,abs(f.x-f.y)));",
    "  return clamp(v,0.,1.)*step(abs(p.y-.5),.42); }",
    "float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
    "float sigil(vec2 p, float ch){ float r = length(p), a = atan(p.y,p.x); float s = 0.; float w = .007+.003*ch;",
    "  s += ring(r,.92,w)+ring(r,.86,w)+ring(r,.62,w)+ring(r,.56,w)+ring(r,.22,w*1.4);",
    "  float a1 = a + uT*.15 + uDrag.x*3.; float u1 = fract(a1/6.2832*48.); s += rune(vec2(u1, (r-.865)/.055+.5), floor(a1/6.2832*48.))*step(.865,r)*step(r,.915);",
    "  float a2 = a - uT*.22; float u2 = fract(a2/6.2832*28.); s += rune(vec2(u2, (r-.565)/.055+.5), floor(a2/6.2832*28.)+50.)*step(.565,r)*step(r,.615);",
    "  vec2 q = p*rot(-uT*.08); float hs = 1e3; for (int i=0;i<7;i++){ float t0 = float(i)*6.2832/7., t1 = float(i+3)*6.2832/7.; hs = min(hs, seg(q, .56*vec2(cos(t0),sin(t0)), .56*vec2(cos(t1),sin(t1)))); }",
    "  s += smoothstep(w*1.2,0.,hs);",
    "  for (int i=0;i<7;i++){ float t0 = float(i)*6.2832/7. + uT*.08; vec2 c = .74*vec2(cos(t0),sin(t0)); float d = length(p-c); s += ring(d,.07,w)+ring(d,.045,w*.8)*step(.5,fract(uT*.5+float(i)*.3)+.3); }",
    "  s += ring(r,.11,w)*(.5+.5*sin(uT*3.)); return clamp(s,0.,1.); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 sp = (uv-.5)*vec2(A,1.);",
    "  float fl = uFl<0. ? 0. : exp(-uFl*6.); float ch = smoothstep(0.,1.5,uDown) + (uTap<0. ? 0. : exp(-uTap*1.2)); float castF = uTap<0. ? 0. : exp(-uTap*2.5);",
    "  vec3 ro = vec3(0.,1.35,-1.35), ta = vec3(0.,0.,.15); vec3 fw = normalize(ta-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt); vec3 rd = normalize(fw*1.7+rt*sp.x+up*sp.y);",
    "  vec3 c = mix(vec3(.01,.008,.02), vec3(.03,.02,.05), uv.y);",
    "  if (rd.y < 0.){ float t = -ro.y/rd.y; vec3 hp = ro+rd*t; vec2 p = hp.xz-vec2(0.,.15);",
    "    float slate = fbm(p*8.)*.5+fbm(p*30.)*.3; vec3 floorc = vec3(.025,.022,.03)*(.6+slate);",
    "    float sg = sigil(p, ch);",
    "    float pr = length(p); vec3 gold = mix(vec3(1.,.55,.15), vec3(1.,.85,.55), sg); vec3 arc = mix(vec3(.35,.6,1.), vec3(.8,.4,1.), .5+.5*sin(atan(p.y,p.x)*3.+uT));",
    "    vec3 em = mix(gold, arc, .35+.35*ch)*sg*(2.2+2.*ch+3.*castF+2.*fl);",
    "    floorc += mix(gold,arc,.5)*exp(-pr*2.2)*(.08+.25*ch) + arc*exp(-abs(pr-.9)*12.)*.04*(1.+ch);",
    "    c = floorc + em; c *= exp(-t*.08); }",
    "  float col = exp(-abs(sp.x)*(10.-4.*ch))*smoothstep(-.35,.6,sp.y)*(.08+.35*ch+1.2*castF); c += mix(vec3(.5,.7,1.),vec3(1.,.8,.5),.4)*col*(.7+.3*fbm3(vec2(sp.x*8., sp.y*2.-uT*1.5)));",
    "  c += vec3(1.,.9,.8)*castF*.6*exp(-dot(sp,sp)*3.);",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ===================== batch 3 (fx builder #2): waterfall, portal, glowforest, sun, plasmaglobe ===================== */
  /* ---- NATURE: waterfall. A gorge at golden hour: a curtain of water falls between mossy basalt walls, each sheet a stretched
     flow-noise column scrolling at its own speed (after the "flow map" streak technique widely used in game water), white aerated
     edges, a plunge pool with expanding ripples, billowing mist (fbm advected up/out) and a rainbow where the sun hits the spray.
     Drag moves the sun (rainbow follows), tap = a splash burst in the pool (sound: titan:fx splash). */
  S.waterfall = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float sx = clamp(.25+uDrag.x*.8,-.6,.9);",
    "  vec3 sky = mix(vec3(1.,.62,.32), mix(vec3(.55,.55,.75), vec3(.22,.32,.6), smoothstep(.35,.55,p.y)), smoothstep(.15,.45,p.y));",
    "  vec2 sun = vec2(-sx*.35, .36); float sd = length(p-sun); sky += vec3(1.,.85,.55)*(exp(-sd*40.)*2. + exp(-sd*6.)*.35);",
    "  { vec2 cq = p*vec2(1.2,4.) + vec2(uT*.01, 0.); float cl = fbm(cq*2.+fbm(cq*3.)*.6); float cm = smoothstep(.45,.75,cl)*smoothstep(.3,.42,p.y);",
    "    vec3 cc = mix(vec3(.55,.35,.4), vec3(1.,.7,.45), clamp((cl-.45)*2.+.3*exp(-sd*4.),0.,1.)); sky = mix(sky, cc, cm*.85);",
    "    for (int k=0;k<3;k++){ float fk = float(k); vec2 bq = p - vec2(fract(uT*.015+fk*.37)*1.6-.8, .44+fk*.025+.01*sin(uT+fk)); bq.y -= abs(bq.x)*.6*(1.+.4*sin(uT*6.+fk)); sky = mix(sky, vec3(.08,.06,.07), smoothstep(.003,.0,abs(bq.y))*step(abs(bq.x),.012)); } }",
    "  vec3 c = sky;",
    "  float wall = .26 + .05*fbm(vec2(p.y*4.,1.)) + .03*fbm(vec2(p.y*15.,7.));",            // half-width of the gorge opening
    "  float fallW = .17 + .02*sin(p.y*3.);",
    "  float lip = .32;",
    "  float rockN = fbm(p*vec2(6.,3.)+vec2(3.,0.)); float moss = smoothstep(.45,.7,fbm(p*9.+11.));",
    "  vec3 rock = mix(vec3(.06,.05,.05), vec3(.08,.13,.05), moss)*(.4+rockN*1.2);",
    "  rock += vec3(1.,.7,.4)*.25*smoothstep(.2,.0,abs(abs(p.x)-wall))*smoothstep(-.4,.4,p.y);",   // rim light
    "  float inGorge = smoothstep(.0,.01,wall-abs(p.x));",
    "  c = mix(rock, c, inGorge*step(lip,p.y)+ (1.-step(lip,p.y))*0.);",
    "  if (p.y < lip) { vec3 back = mix(vec3(.04,.06,.06), vec3(.12,.14,.12), fbm(p*5.)); c = mix(rock, back*(.6+.4*smoothstep(-.5,.3,p.y)), inGorge*.0+0.); c = rock; }",
    "  float fx = p.x/fallW; float inFall = smoothstep(1.,.9,abs(fx))*step(-.32,p.y)*step(p.y,lip+.01);",
    "  if (inFall > 0.) {",
    "    float col = floor(fx*9.); float spd = 1.6+.6*h21(vec2(col,3.));",
    "    float st = fbm(vec2(fx*14., (p.y+uT*spd)*1.2))*.7 + fbm(vec2(fx*40., (p.y+uT*spd*1.3)*2.5))*.5;",
    "    float edge = smoothstep(.55,1.,abs(fx)); float aer = smoothstep(.5,1.1,st+edge*.5+smoothstep(lip-.1,lip-.6,p.y)*.0);",
    "    vec3 wc = mix(vec3(.25,.38,.42)*(.5+st), vec3(.95,.97,1.)*(.8+st*.4), aer);",
    "    wc += vec3(1.,.8,.55)*.35*pow(st,3.)*smoothstep(-.1,.3,p.y);",
    "    float lipG = smoothstep(.04,.0,abs(p.y-lip+.01)); wc += vec3(1.,.95,.85)*lipG*.6;",
    "    c = mix(c, wc, inFall); }",
    "  float pool = -.32; if (p.y < pool) { float d = pool-p.y; vec2 w = vec2(p.x/(d*3.+.05), 1./(d+.02));",
    "    float rip = fbm(w*vec2(2.,.3)+vec2(0.,uT*.6))*.5 + .5*sin(length(vec2(p.x,(p.y-pool)*4.))*60.-uT*6.)*exp(-length(vec2(p.x,(p.y-pool)*4.))*3.);",
    "    vec3 refl = sky*.25 + vec3(.9,.95,1.)*.5*smoothstep(fallW*1.3,0.,abs(p.x+rip*.02))*exp(-d*3.);",
    "    c = mix(vec3(.02,.06,.06), refl, .5+.4*rip); }",
    "  float tap = uTap<0. ? 0. : exp(-uTap*1.2); vec2 tp = vec2((uTapP.x-.5)*A, pool+.02);",
    "  float mist = 0.; for (int k=0;k<3;k++){ float fk = float(k); vec2 m = p*vec2(1.5,2.)*(1.+fk*.6) - vec2(sin(uT*.1+fk)*.2, uT*(.12+fk*.05)) + fk*7.;",
    "    mist += fbm(m + .5*vec2(fbm(m*1.5+uT*.1), 0.))*.5; }",
    "  mist *= exp(-pow(max(p.y-pool+.05,0.),1.)*3.5)*smoothstep(fallW*3.5,fallW*.5,abs(p.x)) + tap*exp(-dot(p-tp,p-tp)*30.)*1.5;",
    "  c = mix(c, vec3(.95,.92,.9)*(.6+.5*sky), clamp(mist*.9,0.,.85));",
    "  vec2 sv = p - vec2(-sx*.5, -.9); float rr = length(sv); float bow = smoothstep(.06,.0,abs(rr-.95));",
    "  vec3 rb = .5+.5*cos(6.2832*((rr-.95)/.06*.5+.5)+vec3(0.,2.1,4.2)); c += rb*bow*mist*.55;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MAGIC: portal. A ring of molten-orange sparks tearing a hole in a dark stone hall; streaks race tangentially around it
     (polar streak noise), throw-off sparks fly out in spirals, and through the ring you see another world: a sunlit sea of clouds
     with a distant mountain (domain-warped fbm). Hold widens it, drag parallax-shifts the other side, tap = a surge (rides the
     plasma soundscape's arc event too). */
  S.portal = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float fl = uFl<0. ? 0. : exp(-uFl*5.); float surge = (uTap<0. ? 0. : exp(-uTap*1.5)) + fl*.6;",
    "  float R = .3 + .06*smoothstep(0.,1.,uDown) + .03*surge + .005*sin(uT*7.);",
    "  float r = length(p*vec2(1.,1.05)), a = atan(p.y,p.x);",
    "  vec3 hall = vec3(.025,.02,.022)*(.5+fbm(p*vec2(3.,8.)+vec2(0.,floor(p.x*6.)))*.8);",   // stone blocks
    "  hall += vec3(1.,.45,.12)*.35*exp(-max(r-R,0.)*5.);",                                      // portal light on the hall
    "  vec3 c = hall;",
    "  if (r < R) { vec2 q = p*1.4 + uDrag*.3; vec3 sky = mix(vec3(1.,.8,.55), vec3(.35,.6,.95), smoothstep(-.1,.4,q.y));",
    "    float mnt = .05 + .12*fbm(vec2(q.x*2.+4.,1.)) - .02*q.x; if (q.y < mnt) sky = mix(vec3(.3,.35,.5), sky, .45);",
    "    float cl = fbm(vec2(q.x*2.+uT*.03, q.y*6.)+fbm(q*3.)); float sea = smoothstep(-.02,-.25,q.y); sky = mix(sky, vec3(1.,.95,.9)*(.7+cl*.6), sea*smoothstep(.35,.65,cl+sea*.2));",
    "    sky += vec3(1.,.9,.7)*exp(-length(q-vec2(.25,.2))*6.)*.8;",
    "    c = sky*.55*(.85 + .15*sin(r*80.-uT*8.)*smoothstep(R*.8,R,r)); }",
    "  float d = r - R; float aS = a + uT*(2.2+surge*3.); float ring = 0.;",
    "  for (int k=0;k<3;k++){ float fk = float(k); float st = fbm(vec2(aS*(6.+fk*4.)*1.59, d*40.+fk*3.)); ring += pow(st,3.)*exp(-abs(d-fk*.006)*(140.-fk*30.))*1.6; }",
    "  float throwN = fbm(vec2(a*10.+ uT*3., r*12. - uT*5.)); ring += pow(throwN,6.)*smoothstep(.0,.02,d)*exp(-d*14.)*6.;",
    "  vec3 sc = mix(vec3(1.,.35,.05), vec3(1.,.8,.35), clamp(ring*.5,0.,1.)) * ring * (1.+surge*1.5);",
    "  c += sc + vec3(1.,.6,.2)*exp(-abs(d)*60.)*.6*(1.+surge);",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- NATURE: bioluminescent forest. Night forest in parallax layers (trunk silhouettes), a carpet of moss that glows cyan where
     you hold, mushrooms and fern-fronds that pulse in slow waves, drifting spores; a tap sends a glow wave rolling outward through the
     ground (the "Pandora" look). */
  S.glowforest = [
    "float trunks(float x, float seed, float dens){ float id = floor(x*dens); float f = fract(x*dens); float w = .08+.15*h21(vec2(id,seed)); return smoothstep(w,w*.6,abs(f-.5)) * step(.35,h21(vec2(id,seed+1.))); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.); float px = uDrag.x*.4;",
    "  vec3 c = mix(vec3(.005,.01,.02), vec3(.02,.04,.07), uv.y);",
    "  c += vec3(.1,.25,.35)*.15*fbm(p*2.+uT*.02);",
    "  float tap = uTap<0. ? 99. : uTap; vec2 tp = (uTapP-.5)*vec2(A,1.);",
    "  for (int L=0;L<4;L++){ float fl = float(L); float par = .2+fl*.35; float x = p.x + px*par + fl*1.7;",
    "    float gy = -.15 - fl*.06 + .03*fbm(vec2(x*3.,fl));",
    "    float tr = trunks(x*(1.+fl*.2), fl, 3.-fl*.4)*step(gy, p.y);",
    "    vec3 lc = vec3(.01,.015,.02)*(1.+fl*.3);",
    "    c = mix(c, lc, tr);",
    "    float vine = smoothstep(.006,.0,abs(fract(x*(3.-fl*.4))-.5 - .02*sin(p.y*30.+fl))) * tr * step(.6, fbm(vec2(x*20., p.y*5.)+fl));",
    "    c += vec3(.1,.9,1.)*vine*(.3+.3*sin(uT*1.5+p.y*8.+fl));",
    "    if (p.y < gy) c = mix(c, lc*.8, 1.); }",
    "  float gy0 = -.27 + .03*fbm(vec2(p.x*3.,0.));",
    "  if (p.y < gy0) { float depth = (gy0 - p.y); vec2 g = vec2(p.x/(depth*2.+.08), 1./(depth+.05));",
    "    float moss = fbm(g*vec2(4.,.5)) ; float spots = pow(fbm(g*vec2(14.,1.5)),3.)*3.;",
    "    vec2 fp = (uP-.5)*vec2(A,1.); float touch = exp(-dot(p-fp,p-fp)*14.)*uDown;",
    "    float wave = exp(-pow(length((p-tp)*vec2(1.,2.5)) - tap*.6, 2.)*60.)*exp(-tap*.5);",
    "    float pulse = .5+.5*sin(uT*.8 - p.x*3. + moss*6.);",
    "    vec3 glow = mix(vec3(.05,.9,.8), vec3(.4,.3,1.), smoothstep(.3,.7,fbm(g*2.)))*(spots*(.25+.5*pulse) + touch*2.*moss + wave*3.*moss);",
    "    c = vec3(.004,.01,.012)*(.5+moss) + glow*exp(-depth*1.5); }",
    "  for (int k=0;k<14;k++){ float fk = float(k); vec2 mp = vec2((h21(vec2(fk,5.))-.5)*A*1.1 + px*.5, -.25 - h21(vec2(fk,6.))*.12);",
    "    float hgt = .03+.05*h21(vec2(fk,7.)); vec2 q = p - mp; float stem = smoothstep(.006,.0,abs(q.x))*step(0.,q.y)*step(q.y,hgt);",
    "    vec2 cq = (q - vec2(0.,hgt))*vec2(1.,2.2); float cap = smoothstep(.04+.02*h21(vec2(fk,8.)),.0,length(cq))*step(-.005,cq.y);",
    "    float pu = .6+.4*sin(uT*(1.+h21(vec2(fk,9.)))+fk) + 2.*exp(-pow(length(mp-tp)-tap*.6,2.)*80.)*exp(-tap*.5);",
    "    vec3 mc = mix(vec3(.2,1.,.85), vec3(.7,.4,1.), h21(vec2(fk,10.)));",
    "    c += mc*(cap*1.2+stem*.4)*pu + mc*exp(-length(q-vec2(0.,hgt))*25.)*.15*pu; }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: the Sun up close. Convection granulation (animated Voronoi cells with bright centres and dark lanes), sunspot pairs,
     limb darkening (Eddington), a corona of fbm streamers and prominence loops arcing off the limb. Drag rotates the surface;
     tap = a flare: a white ribbon on the surface and a CME bloom off the limb. */
  S.sun = [
    "vec2 vorS(vec2 x){ vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.; for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 o2 = g+.5+.4*sin(uT*.4+6.28*h22(n+g))-f; float d = dot(o2,o2); if (d<d1){ d2 = d1; d1 = d; } else if (d<d2) d2 = d; } return vec2(sqrt(d1), sqrt(d2)-sqrt(d1)); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-vec2(.62,.5))*vec2(A,1.); float R = .42;",
    "  float r = length(p); vec3 c = vec3(0.); float fl = uTap<0. ? 0. : exp(-uTap*.5)*smoothstep(0.,.1,uTap);",
    "  float a = atan(p.y,p.x);",
    "  float cor = fbm(vec2(a*6., r*3.-uT*.08))*.7+fbm(vec2(a*18., r*6.-uT*.15))*.3; c += mix(vec3(1.,.45,.15), vec3(.9,.8,1.), smoothstep(R,R*2.,r))*pow(cor,2.)*exp(-(r-R)*5.)*step(R,r)*1.2;",
    "  c += vec3(1.,.6,.3)*exp(-(r-R)*12.)*step(R,r)*.5; c += vec3(1.,.15,.12)*exp(-(r-R)*90.)*step(R,r)*(.8+.6*fbm(vec2(a*80.,uT*.6)));",
    "  for (int k=0;k<4;k++){ float fk = float(k); float ca = fk*1.7+.6+uDrag.x*.5; vec2 cc = vec2(cos(ca),sin(ca))*R; vec2 tdir = vec2(-sin(ca),cos(ca));",
    "    vec2 q = p - cc; float along = dot(q,tdir), out_ = dot(q,cc/R); float loop = .06+.03*h21(vec2(fk,1.));",
    "    float lp = abs(length(vec2(along, out_*1.4)) - loop); float th = .008*(1.+fbm(vec2(along*30.,uT*.5+fk)));",
    "    c += vec3(1.,.35,.15)*smoothstep(th,.0,lp)*step(0.,out_)*1.5*(.7+.3*sin(uT+fk)); }",
    "  float cme = fl*exp(-pow((r-R) - (uTap*.12),2.)*80.)*smoothstep(.8,.0,abs(a-1.)) ; c += vec3(1.,.8,.6)*cme*2.;",
    "  if (r < R) { float z = sqrt(R*R-r*r)/R; vec3 n = vec3(p/R, z); float lon = atan(n.x,n.z)+uDrag.x+uT*.01, lat = asin(n.y);",
    "    vec2 sp = vec2(lon, lat)*9.; vec2 v = vorS(sp*1.3);",
    "    float gran = .35+.65*smoothstep(.0,.35,v.y)*(1.-v.x*.6) + .15*(fbm(sp*4.)-.5);",
    "    float spots = smoothstep(.62,.72,fbm(vec2(lon,lat)*3.+5.))*smoothstep(.5,.2,abs(lat));",
    "    float limb = .35+.65*pow(z,.6);",
    "    float pen = smoothstep(.5,.62,fbm(vec2(lon,lat)*3.+5.))*smoothstep(.5,.2,abs(lat)); float fac = smoothstep(.55,.8,fbm(vec2(lon,lat)*6.+2.))*pow(1.-z,2.); vec3 sc = mix(vec3(.9,.18,.02), mix(vec3(1.,.55,.12), vec3(1.,.85,.5), smoothstep(.6,1.,gran)), gran)*limb*(1.-pen*.45)*(1.-spots*.9) + vec3(1.,.8,.5)*fac*.6;",
    "    sc += vec3(1.,.95,.85)*fl*3.*smoothstep(.03,.0,abs(lat-.35+.02*sin(lon*20.)))*smoothstep(.3,.0,abs(lon-1.));",
    "    c = sc*.8; c.g *= .82; c.b *= .6; }",
    "  { vec3 q = vec3(gl_FragCoord.xy*.5,1.); vec3 id = floor(q); float h = h31(id); c += vec3(.8,.85,1.)*step(.9985,h)*step(R*1.4,r)*.6; }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MATERIAL & MAGIC: plasma globe. A glass sphere with a hot central electrode and wandering violet filaments (fbm-displaced
     radial rays, each with its own drift); hold anywhere and every filament bends to your finger and fuses into one bright arc
     (sound: titan:fx arc while held), tap = a discharge. Glass: Fresnel rim, reflection of a soft-box, inner glow. */
  S.plasmaglobe = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-vec2(.5,.52))*vec2(A,1.); float R = .36;",
    "  vec3 c = mix(vec3(.01,.008,.02), vec3(.03,.02,.05), uv.y); float r = length(p);",
    "  c += vec3(.02,.02,.03)*smoothstep(-.3,-.5,p.y)*(.5+fbm(p*20.)*.5);",
    "  vec2 fp = (uP-vec2(.5,.52))*vec2(A,1.); float hold = smoothstep(0.,.3,uDown); vec2 fdir = normalize(fp+1e-4);",
    "  float dis = uTap<0. ? 0. : exp(-uTap*3.); float fl = uFl<0. ? 0. : exp(-uFl*8.);",
    "  if (r < R) { float z = sqrt(R*R-r*r)/R; float F = pow(1.-z, 3.);",
    "    vec3 inner = vec3(.08,.02,.12)*(1.-r/R) + vec3(.6,.3,1.)*exp(-r*18.)*1.5;",
    "    float fil = 0.; int N = int(5.+5.*uQ);",
    "    for (int k=0;k<12;k++){ if (k>=N) break; float fk = float(k);",
    "      float ba = fk*6.2832/float(N) + uT*(.2+.1*sin(fk)) + 1.5*fbm(vec2(fk, uT*.15));",
    "      vec2 bd = vec2(cos(ba),sin(ba)); bd = normalize(mix(bd, fdir, hold*(.55+.3*h21(vec2(fk,4.))))); bd = normalize(bd + vec2(-fdir.y,fdir.x)*hold*(h21(vec2(fk,5.))-.5)*.5);",
    "      vec2 nd = vec2(-bd.y, bd.x); float along = dot(p,bd), side = dot(p,nd);",
    "      float wob = (fbm(vec2(along*9.-uT*2.5, fk*3.))-.5)*.12*smoothstep(0.,R,along);",
    "      float w = .004+.012*smoothstep(R,0.,along)*0.+.003*hold;",
    "      float line = smoothstep(w*3.,.0,abs(side-wob))*step(0.,along)*step(along,R*.98);",
    "      fil += line*(.7+.3*sin(uT*20.+fk*7.)) + exp(-abs(side-wob)*60.)*step(0.,along)*step(along,R)*.12;",
    "      fil += exp(-length(p-bd*R*.97)*80.)*1.5; }",
    "    vec3 fc = mix(vec3(.55,.25,1.), vec3(1.,.6,1.), clamp(fil*.3,0.,1.))*fil*(.8+.5*hold+dis*2.+fl)/(1.+hold*.6);",
    "    vec3 refl = vec3(.9,.9,1.)*smoothstep(.06,.0,length((p/R - vec2(-.35,.45))*vec2(1.,1.6)))*.5;",
    "    c = mix(c*.6 + inner*(1.+dis*2.) + fc, vec3(.4,.35,.6), F*.4) + refl + vec3(.7,.6,1.)*pow(1.-z,8.)*.6; }",
    "  c += vec3(.5,.3,1.)*exp(-(r-R)*25.)*step(R,r)*(.15+.2*hold+dis);",
    "  if (p.y < -R*.92 && abs(p.x) < .16+(-R*.92-p.y)*.6) { float b = -R*.92-p.y; c = mix(c, vec3(.03,.03,.035)*(1.+fbm(p*30.)*.5) + vec3(.4,.25,.7)*exp(-b*30.)*.2, step(b, .12)); }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ===================== batch 4 (fx builder #2): jellyfish, ringworld, wormhole, sakura, cathedral ===================== */
  /* ---- NATURE: deep-sea jellyfish. Translucent bells (pulsing hemispheres with rim-lit Fresnel, radial canals, frilled margin)
     trailing wavy tentacles, drifting through god-rays in the blue gloom with marine snow. Each bell contracts on its own rhythm and
     rises on the stroke. Hold to attract them (they glow brighter); tap = a bioluminescent flash ripple. */
  S.jellyfish = [
    "vec3 jelly(vec2 p, vec2 c, float s, float ph, vec3 tint, float glow){ vec2 q = (p-c)/s; float pulse = .5+.5*sin(ph); float bw = .85+.18*pulse, bh = .8-.18*pulse;",
    "  vec3 col = vec3(0.); if (abs(q.x) > 2.5 || q.y > 1.2 || q.y < -4.5) return col;",
    "  float top = bh*sqrt(max(1.-pow(q.x/bw,2.),0.)); float und = -.22*bh*(1.-pow(q.x/bw,2.)) + .05;",   // dome over a concave underside
    "  float inB = step(abs(q.x),bw)*step(und,q.y)*step(q.y,top);",
    "  if (inB > 0.) { float dEdge = min(top-q.y, q.y-und)/bh; float rim = exp(-dEdge*9.);",
    "    float ang = atan(q.x, q.y+.2); float can = smoothstep(.07,.0,abs(fract(ang/6.2832*16.)-.5))*smoothstep(.0,.4,top-q.y)*.25;",
    "    float gon = 0.; for (int g=0;g<4;g++){ float ga = (float(g)-1.5)*.32; gon += exp(-pow(length((q-vec2(sin(ga)*.35,.3+.1*cos(ga*3.)))*vec2(1.,1.6))-.09,2.)*900.); }",
    "    float spec = exp(-length((q-vec2(-.3*bw,top*.75))*vec2(2.,3.))*6.)*.4;",
    "    col += tint*(.06+rim*.75+can) + vec3(1.,.65,.85)*gon*.5 + vec3(.9,.95,1.)*spec; }",
    "  float mx = q.x/bw; float fr = exp(-pow((q.y-und+.02-.03*sin(mx*40.+ph*2.))*25.,2.))*step(abs(mx),1.); col += tint*fr*.7;",
    "  for (int k=0;k<12;k++){ float fk = float(k); float x0 = (fk/11.-.5)*bw*1.9; float y = q.y-und; if (y>0.) break;",
    "    float x = x0 + sin(y*4.+ph*.7+fk*1.3)*.09*(-y) + sin(y*11.-ph+fk*2.)*.02; float len = 2.2+1.4*h21(vec2(fk,c.x));",
    "    float a = smoothstep(-len,-len*.2,y); col += tint*smoothstep(.012,.0,abs(q.x-x))*a*(.25+.2*sin(y*30.-ph*3.)); }",
    "  for (int k=0;k<4;k++){ float fk = float(k); float y = q.y-und; if (y>0.) break; float x = (fk/3.-.5)*.35 + sin(y*3.+ph*.5+fk*2.)*.12*(-y);",
    "    float w = .07*smoothstep(-2.,0.,y)*(.6+.4*sin(y*25.+fk)); float frill = smoothstep(w,w*.4,abs(q.x-x))*smoothstep(-2.,-.3,y);",
    "    col += mix(tint, vec3(1.,.6,.85), .5)*frill*.35; }",
    "  float fade = smoothstep(.85,.6,abs(c.y)); return col*glow*fade; }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec3 c = mix(vec3(.0,.01,.03), vec3(.0,.08,.16), uv.y*uv.y);",
    "  float rays = 0.; for (int k=0;k<5;k++){ float fk = float(k); float x = p.x + p.y*.35 + fk*.37 - .6 + .05*sin(uT*.2+fk); rays += exp(-abs(x)*30.)*(.5+.5*sin(uT*.3+fk*2.)); }",
    "  c += vec3(.15,.35,.5)*rays*.25*smoothstep(-.5,.5,p.y);",
    "  vec2 fp = (uP-.5)*vec2(A,1.); float flash = uTap<0. ? 0. : exp(-uTap*.8); vec2 tp = (uTapP-.5)*vec2(A,1.);",
    "  int N = int(4.+4.*uQ);",
    "  for (int j=0;j<8;j++){ if (j>=N) break; float fj = float(j); float s = .13+.1*h21(vec2(fj,1.)); float sp = .6+.5*h21(vec2(fj,2.));",
    "    float ph = uT*sp*2.5+fj*2.; float rise = uT*.035*sp + (ph - sin(ph))*.012;",
    "    vec2 cpos = vec2((h21(vec2(fj,3.))-.5)*A*.9 + .08*sin(uT*.1+fj), fract(h21(vec2(fj,4.)) + rise)*1.6-.7);",
    "    cpos += (fp-cpos)*.25*uDown;",
    "    vec3 tint = mix(vec3(.4,.7,1.), vec3(1.,.45,.85), h21(vec2(fj,5.))); float depth = .55+.45*h21(vec2(fj,6.));",
    "    float rip = exp(-pow(length(cpos-tp)-uTap*.5,2.)*40.)*flash;",
    "    c += jelly(p, cpos, s, ph, tint, depth*(1.+uDown*.5+rip*4.)); }",
    "  c += vec3(.4,.8,1.)*exp(-pow(length(p-tp)-uTap*.5,2.)*200.)*flash*.3;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: ringed world. A gas giant with banded, turbulent atmosphere (latitude bands + fbm storms + one great oval), lit
     from the side with a terminator, casting its shadow across a ring system of thousands of ringlets with Cassini-style gaps;
     the rings shadow the planet and glow in forward scatter. A moon passes. Drag tilts/rotates the view; tap = aurora on the pole. */
  S.ringworld = [
    "float ringD(float r){ float d = smoothstep(1.35,1.45,r)*smoothstep(2.4,2.3,r); d *= .55+.45*sin(r*90.)*sin(r*37.+1.) ; d *= 1.-smoothstep(.0,.03,.03-abs(r-1.95))*.95; d *= 1.-.7*smoothstep(.0,.02,.02-abs(r-2.2)); return clamp(d,0.,1.); }",
    "void main(){ vec3 Ap = aspectP(); vec2 uv = Ap.xy; float yaw = uDrag.x*2.+.3, pit = clamp(.32+uDrag.y,.05,1.2);",
    "  vec3 ro = 7.*vec3(sin(yaw)*cos(pit), sin(pit), -cos(yaw)*cos(pit)); vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*2.2+rt*uv.x+up*uv.y); vec3 L = normalize(vec3(1.,.25,-.4));",
    "  vec3 c = vec3(0.); { vec3 q = rd*240.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5; c += vec3(.9,.9,1.)*step(.997,h)*exp(-dot(f,f)*30.); }",
    "  float b = dot(ro,rd), cc = dot(ro,ro)-1., disc = b*b-cc; float tp = disc>0. ? -b-sqrt(disc) : 1e9;",
    "  float tr = -ro.y/rd.y; vec3 rp = ro+rd*tr; float rr = length(rp.xz); float rden = tr>0. ? ringD(rr) : 0.;",
    "  float aur = uTap<0. ? 0. : exp(-uTap*.4)*smoothstep(0.,.3,uTap);",
    "  if (tp < 1e8) { vec3 p = ro+rd*tp, n = p; float lat = n.y; float lon = atan(n.z,n.x)+uT*.05;",
    "    vec2 w = vec2(lon*2., lat*9.); w.x += fbm(w*vec2(1.,3.))*.8 + sin(lat*25.)*.3;",
    "    float band = sin(lat*22.+fbm(w*2.)*2.); vec3 a1 = vec3(.85,.7,.5), a2 = vec3(.6,.42,.3), a3 = vec3(.95,.9,.8);",
    "    vec3 alb = mix(mix(a2,a1,.5+.5*band), a3, smoothstep(.6,.9,fbm(w*4.)));",
    "    vec2 gs = vec2(lon-1., (lat+.35)*3.); alb = mix(alb, vec3(.8,.35,.2), smoothstep(.3,.0,length(gs*vec2(1.,1.8)))*(.6+.4*fbm(gs*8.+uT*.1)));",
    "    float dif = max(dot(n,L),0.); float term = smoothstep(-.05,.2,dot(n,L));",
    "    vec3 sp = p + L*(-p.y/L.y); float sh = (L.y>0.&&p.y<0.)||(L.y<0.&&p.y>0.) ? ringD(length(sp.xz)) : 0.;",
    "    c = alb*(dif*term*(1.-sh*.7))*1.3 + alb*vec3(.15,.2,.35)*.04 + vec3(.3,.5,1.)*pow(1.-max(dot(n,-rd),0.),3.)*.15*term;",
    "    c += vec3(.3,1.,.6)*aur*exp(-(1.-abs(lat))*18.)*1.5;",
    "    if (tr>0. && tr<tp && rden>0.) { vec3 rc = vec3(.9,.82,.7)*rden; float psh = length(cross(rp, L)) < 1. && dot(rp,L) < 0. ? .1 : 1.; c = mix(c, rc*(.25+.9*psh)+vec3(1.,.9,.8)*pow(max(dot(rd,L),0.),6.)*rden*.6, rden*.85); } }",
    "  else if (tr>0. && rden>0.) { float psh = (length(cross(rp, L)) < 1. && dot(rp,L) < 0.) ? .08 : 1.; vec3 rc = vec3(.9,.82,.7)*rden*(.25+.9*psh) + vec3(1.,.9,.8)*pow(max(dot(rd,L),0.),6.)*rden*.6*psh; c = mix(c, rc, rden*.85); }",
    "  vec3 mc = vec3(cos(uT*.07)*3.2, .15, sin(uT*.07)*3.2); float mb = dot(ro-mc,rd), mcc = dot(ro-mc,ro-mc)-.0144, md = mb*mb-mcc;",
    "  if (md>0.) { float mt = -mb-sqrt(md); if (mt < tp) { vec3 mn = normalize(ro+rd*mt-mc); c = vec3(.6,.58,.55)*(.6+.4*fbm(mn.xy*10.))*max(dot(mn,L),0.); } }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: wormhole transit. Flying down a tunnel of folded spacetime: polar-mapped tube with streaming fbm plasma walls,
     gravitational-lensing ring of the destination galaxy at the far mouth, chromatic speed streaks. Drag steers the curve; hold
     to accelerate; tap = a jump flash where the walls snap past. */
  S.wormhole = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float boost = smoothstep(0.,1.,uDown) + (uTap<0. ? 0. : exp(-uTap*1.5)*2.); float spd = 1.+boost*2.5;",
    "  vec2 bend = vec2(sin(uT*.23)*.15, cos(uT*.17)*.1) + uDrag*.4; vec2 q = p - bend*(1.-length(p));",
    "  float r = length(q), a = atan(q.y,q.x);",
    "  float z = .35/max(r,.001); float zt = z + uT*spd;",
    "  vec3 c = vec3(0.);",
    "  for (int k=0;k<3;k++){ float fk = float(k); vec2 tw = vec2(abs(a)*3./3.1416 + zt*.05*fk + sin(zt*.3)*.3, zt*(.6+fk*.2));",
    "    float n = fbm(tw*vec2(1.,1.) + fbm(tw*2.)*.8); vec3 hue = .5+.5*cos(6.2832*(n*.6 + zt*.07 + fk*.25) + vec3(0.,2.,4.));",
    "    c += hue*pow(n,2.5)*1.2/(1.+fk); }",
    "  float streak = pow(fbm(vec2(abs(a)*40., zt*.2)),6.)*8.*boost; c += vec3(.8,.9,1.)*streak;",
    "  c *= smoothstep(.0,.25,r)*(.4+.6*smoothstep(1.2,.3,r));",
    "  vec2 g = q*4.; float gr = length(g); float lens = exp(-pow(gr-.55,2.)*60.)*(.8+.4*sin(a*8.+uT));",
    "  vec3 dest = vec3(.9,.8,1.)*exp(-gr*gr*8.)*1.5 + vec3(.5,.7,1.)*lens;",
    "  c = mix(c, dest, smoothstep(.12,.0,r)) + vec3(.6,.7,1.)*exp(-r*20.)*.4;",
    "  float jf = uTap<0. ? 0. : exp(-uTap*4.); c += vec3(.9,.95,1.)*jf*.8;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- NATURE: sakura grove. A sunlit cherry-blossom canopy in layers (petal clusters as soft fbm blobs, sun dappling through),
     dark branches, a path, light shafts and depth haze; petals fall from the particles layer. Drag sways the canopy; tap = a gust
     that shakes the near branches. */
  S.sakura = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float gust = uTap<0. ? 0. : exp(-uTap*.9)*sin(uTap*9.); float sway = sin(uT*.6)*.01 + gust*.03 + uDrag.x*.05;",
    "  vec3 sky = mix(vec3(1.,.93,.88), vec3(.75,.85,1.), smoothstep(-.1,.5,p.y));",
    "  vec2 sun = vec2(.35,.42); sky += vec3(1.,.95,.8)*exp(-length(p-sun)*5.)*.6;",
    "  vec3 c = sky; float hazeAcc = 0.;",
    "  for (int L=0;L<4;L++){ float fl = float(L); float par = 1.+fl*.5; vec2 q = p*(1.+fl*.25) + vec2(sway*par + fl*3.1, 0.);",
    "    float top = .02 + fl*.06; float tf = 1.1+fl*.25;",
    "    float id = floor(q.x*tf+.3); float x = (fract(q.x*tf+.3)-.5)/tf + .05*(h21(vec2(id,fl))-.5); float lean = (h21(vec2(id,fl+3.))-.5)*.25;",
    "    float xx = x - lean*(q.y+.35) - .02*sin(q.y*7.+id); float tw2 = (.03+.012*fl)*(1.-.45*smoothstep(-.35,top,q.y))*(1.+.4*smoothstep(-.25,-.38,q.y));",
    "    float trunk = smoothstep(tw2,tw2*.7,abs(xx))*step(q.y, top+.02);",
    "    for (int b=0;b<3;b++){ float fb = float(b); float by = top-.12+fb*.06; float dir = mod(fb+id,2.)*2.-1.; float bx = xx - dir*(q.y-by)*(.9+.4*fb);",
    "      trunk = max(trunk, smoothstep(tw2*.55,tw2*.3,abs(bx))*step(by,q.y)*step(q.y,by+.16)); }",
    "    vec3 bark = mix(vec3(.11,.07,.07)*(.7+.6*fbm(vec2(xx*80.,q.y*6.))), sky, .55-fl*.17);",
    "    vec2 cq = q*vec2(7.,8.)+fl*7.; vec2 cn = floor(cq), cf = fract(cq); float md = 9.; float cid = 0.;",
    "    for (int j2=-1;j2<=1;j2++) for (int i2=-1;i2<=1;i2++){ vec2 g = vec2(i2,j2); vec2 o2 = g+.2+.6*h22(cn+g)-cf; float hh = h21(cn+g+9.); float rr = (.25+.75*hh*hh)*step(.12,h21(cn+g+4.)); float d = length(o2)/rr; if (d<md){ md = d; cid = h21(cn+g); } }",
    "    float band = smoothstep(top-.2, top+.05, q.y) * (1.-smoothstep(.3+fl*.04,.55,q.y)) ;",
    "    float edge = fbm(q*40.+fl)*.35; float m = smoothstep(1.,.7,md+edge)*step(.25,band*(.6+.6*fbm(q*3.+fl)));",
    "    float blos = fbm(q*30.+cid*9.); vec3 tone = cid < .3 ? vec3(1.,.95,.96) : cid < .75 ? vec3(.97,.62,.74) : vec3(.86,.36,.52); float flo = smoothstep(.55,.75,fbm(q*120.+cid*20.)); vec3 pink = mix(tone*.82, mix(tone, vec3(1.), .45), blos*.8+.2*(1.-md)) + vec3(1.,.95,.9)*flo*.25;",
    "    pink *= (.45+.4*fract(cid*7.31))+.55*(1.-md)*(.6+.4*smoothstep(-.2,.4,q.y)) + .3*pow(fbm(q*5.+uT*.05),2.);",
    "    vec3 lc = mix(pink, sky, .55-fl*.17);",
    "    c = mix(c, bark, trunk); c = mix(c, lc, m); }",
    "  if (p.y < -.32) { float d = -.32-p.y; vec3 grd = mix(vec3(.55,.45,.42), vec3(.85,.65,.7), fbm(vec2(p.x/(d+.05),1./(d+.05))*.6)); float path = smoothstep(.12+d*.8,.0,abs(p.x+.05))*.4; c = mix(sky*.8, grd + path*vec3(.3,.25,.2), smoothstep(0.,.05,d)); }",
    "  float sh = 0.; for (int k=0;k<4;k++){ float fk = float(k); float x = (p.x-sun.x)*cos(.5)+(p.y-sun.y)*sin(.5) + fk*.17-.25; sh += exp(-abs(x)*35.)*(.5+.5*sin(uT*.4+fk)); }",
    "  c += vec3(1.,.95,.85)*sh*.12*smoothstep(.4,-.3,p.y);",
    "  o = vec4(c*.6, 1.); }"].join("\n");
  /* ---- MATERIAL & MAGIC: cathedral window. A rose window of stained glass (procedural tracery: 12-fold petals, rings of
     quatrefoils, lead came lines, per-pane hue and glass seeds/bubbles) with low sun streaming through, casting coloured light shafts
     through dusty air onto stone. Drag moves the sun (shafts swing, panes catch fire); tap = a choir swell of light. */
  S.cathedral = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-vec2(.5,.62))*vec2(A,1.);",
    "  vec2 sun = vec2(clamp(uDrag.x,-.5,.5), .1); float sw = uTap<0. ? 0. : exp(-uTap*.7);",
    "  float R = .3, r = length(p), a = atan(p.y,p.x); vec3 stone = vec3(.07,.06,.055)*(.6+fbm(p*vec2(6.,14.)+floor(p.y*14.))*.6);",
    "  vec3 c = stone; vec3 glass = vec3(0.); float lead = 0.; float inW = step(r,R);",
    "  float seg = 12.; float sa = mod(a+3.1416/seg, 6.2832/seg)-3.1416/seg; vec2 sp = r*vec2(cos(sa),sin(sa)); float sid = floor((a+3.1416/seg)/(6.2832/seg));",
    "  float ring = floor(r/R*4.); float pid = sid*4.+ring + (r<R*.18 ? 99. : 0.);",
    "  lead = max(lead, smoothstep(.006,.0,abs(r-R*.18))); lead = max(lead, smoothstep(.006,.0,abs(r-R*.55)));",
    "  lead = max(lead, smoothstep(.005,.0,abs(sp.y))*step(R*.18,r));",
    "  float petal = length(sp-vec2(R*.75,0.)) - R*.17; lead = max(lead, smoothstep(.006,.0,abs(petal)));",
    "  float qf = length(sp-vec2(R*.37,0.)) - R*.11; lead = max(lead, smoothstep(.005,.0,abs(qf)));",
    "  lead = max(lead, smoothstep(.008,.0,abs(r-R)));",
    "  float pane = petal<0. ? 1. : qf<0. ? 2. : r<R*.18 ? 3. : 0.;",
    "  vec3 hue = pane==3. ? vec3(1.,.8,.25) : pane==1. ? mix(vec3(.1,.25,.9), vec3(.8,.1,.2), step(.5,fract(sid*.5))) : pane==2. ? vec3(.15,.6,.3) : mix(vec3(.65,.12,.5), vec3(.15,.3,.85), h21(vec2(pid,2.)));",
    "  float seeds = pow(fbm(p*90.+pid),3.)*.8; float pr = (.6+.5*fbm(p*25.+pid)+seeds);",
    "  float lit = .55 + .9*exp(-length(p-sun*.3)*4.) + sw*.8;",
    "  hue = mix(hue, vec3(dot(hue,vec3(.33))), .25); float grime = .45+.8*fbm(p*12.+pid*1.7); float streak = fbm(vec2(p.x*40.+pid, p.y*4.)); float crack = smoothstep(.015,.0,abs(fbm(p*18.+pid*3.)-.5))*step(.6,h21(vec2(pid,9.))); float patina = smoothstep(.06,.0,abs(lead-1.)+0.) ; grime *= (.75+.5*streak)*(1.-crack*.7); hue = mix(hue, hue*vec3(1.,.85,.6), .35); glass = hue*pr*lit*grime*.9 + hue*exp(-length(p-sun*.3)*9.)*.8;",
    "  float nearL = 0.; c = mix(c, glass*(1.-.45*smoothstep(.0,1.,lead*3.)), inW*(1.-lead)); c = mix(c, vec3(.03,.028,.025)*(1.+fbm(p*60.)), inW*lead);",
    "  vec2 fl = p - vec2(0.,-.62); float dust = fbm(p*vec2(20.,6.)+vec2(uT*.03,uT*.02));",
    "  vec2 dir = normalize(vec2(-sun.x*.6, -1.)); vec2 rel = p; float along = dot(rel,dir); vec2 back = rel - dir*along;",
    "  if (along > 0. && r > R) { float spread = 1.+along*.4; vec2 src = back/spread; float sr = length(src);",
    "    if (sr < R) { float sa2 = atan(src.y,src.x); float sid2 = floor((sa2+3.1416/seg)/(6.2832/seg)); vec3 h2 = mix(vec3(.1,.25,.9), vec3(.8,.1,.2), step(.5,fract(sid2*.5))); if (sr < R*.18) h2 = vec3(1.,.8,.25);",
    "      c += h2*(.08+.12*dust)*exp(-along*1.2)*(1.+sw*1.5)*smoothstep(R,R*.9,sr); } }",
    "  if (p.y < -.55) { float d = -.55-p.y; vec2 fp = vec2(p.x/(d+.08), 1./(d+.04)); c = vec3(.05,.045,.04)*(.6+.5*fbm(fp*.8)) + vec3(.6,.3,.5)*.12*exp(-pow(p.x+sun.x*.3,2.)*10.)*(1.+sw); }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ===================== batch 5 (fx builder #2): comet, pulsar, dunes, frost, clockwork ===================== */
  /* ---- SPACE: comet. A bright coma and nucleus sweeping past the Sun's direction, with a curved white-gold dust tail and a straight
     ion tail in electric blue (both pointing away from the sun), jets flaring off the nucleus, over a Milky Way band. Drag swings the
     sun (tails swing with it); tap = an outburst. */
  S.comet = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec3 c = vec3(.004,.005,.012); float mw = exp(-pow(p.y*.8+p.x*.35-.05,2.)*14.); c += vec3(.12,.1,.14)*mw*fbm(p*4.)*1.4 - vec3(.05)*mw*smoothstep(.55,.75,fbm(p*9.+3.));",
    "  { vec3 q = vec3(gl_FragCoord.xy*.55,1.); vec3 id = floor(q); float h = h31(id); c += vec3(.85,.9,1.)*step(.9975-mw*.004,h)*(.4+h31(id+1.)); }",
    "  vec2 nuc = vec2(-.35*A*.5, .12) + vec2(sin(uT*.03),cos(uT*.04))*.02; float sa = -2.6 + uDrag.x*1.5; vec2 anti = -vec2(cos(sa),sin(sa));",
    "  float ob = uTap<0. ? 0. : exp(-uTap*.35)*smoothstep(0.,.2,uTap);",
    "  vec2 q = p-nuc; float al = dot(q,anti); vec2 perp = vec2(-anti.y,anti.x); float sd = dot(q,perp);",
    "  float ion = 0.; if (al>0.) { float w = .008+al*.05; ion = exp(-pow(sd/w,2.))*exp(-al*1.3)*(.6+.6*fbm(vec2(al*8.-uT*.8, sd*60.)));",
    "    ion += exp(-pow((sd-.012*sin(al*14.-uT*2.))/(w*.4),2.))*exp(-al*2.)*.5; }",
    "  float dust = 0.; if (al>0.) { float cur = sd + al*al*.35; float w = .02+al*.16; dust = exp(-pow(cur/w,2.))*exp(-al*1.)*(.7+.5*fbm(vec2(al*3., cur*20.)));",
    "    dust += exp(-pow((cur-w*.4)/(w*.25),2.))*exp(-al*1.6)*.35*smoothstep(0.,.1,al); }",
    "  float r = length(q); float coma = exp(-r*r*400.)*1.5 + exp(-r*28.)*.6 + exp(-r*8.)*.12;",
    "  float jets = 0.; for (int k=0;k<3;k++){ float fk = float(k); float ja = atan(q.y,q.x) - (sa+3.1416+.7*(fk-1.)+.3*sin(uT*.5+fk)); jets += exp(-pow(sin(ja)*r*80.,2.))*step(.0,cos(ja))*exp(-r*30.); }",
    "  c += vec3(.35,.6,1.)*ion*1.2 + vec3(1.,.9,.7)*dust*.9 + vec3(.85,1.,.95)*coma*(1.+ob*3.) + vec3(1.,.95,.85)*jets*.6*(1.+ob*4.);",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: pulsar. A neutron star with a blinding white core, twin relativistic jets sweeping like a lighthouse beam, a
     magnetic field-line cage and a glowing wind nebula (the Crab's look) whose wisps ripple outward with every pulse. Drag tilts the
     spin axis; tap = a starquake glitch (flash + field lines snap). */
  S.pulsar = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float tilt = .35 + uDrag.x*1.5; float spin = uT*2.4; float glt = uTap<0. ? 0. : exp(-uTap*1.5);",
    "  vec2 axis = vec2(sin(tilt), cos(tilt)); vec2 ax2 = vec2(-axis.y, axis.x);",
    "  float beamA = .45*sin(spin); vec2 bdir = normalize(axis*cos(beamA) + ax2*sin(beamA)*.6);",
    "  float r = length(p); vec3 c = vec3(.003,.004,.01);",
    "  float neb = fbm(p*3.+fbm(p*6.-uT*.05)) ; float wisp = pow(fbm(vec2(atan(p.y,p.x)*3., r*10.-uT*.3)),3.);",
    "  float ring = .5+.5*sin(r*30.-uT*2.4*1.5); c += (vec3(.9,.3,.25)*neb*.25 + vec3(.3,.6,1.)*wisp*.6*ring)*exp(-r*2.2);",
    "  float facing = pow(max(abs(dot(normalize(vec2(0.,1.)), bdir)),0.),40.);",
    "  for (int s=-1;s<=1;s+=2){ vec2 bd = bdir*float(s); float al = dot(p,bd); vec2 pr = p - bd*al; float w = .004+al*.06;",
    "    float beam = exp(-dot(pr,pr)/(w*w))*step(0.,al)*exp(-al*.9); c += vec3(.55,.75,1.)*beam*(1.4+glt*2.); }",
    "  vec2 pa = vec2(dot(p,ax2), dot(p,axis)); float fl = 0.;",
    "  for (int k=1;k<5;k++){ float L = float(k)*.08*(1.+glt*.3); float th = atan(abs(pa.x), pa.y); float rr = L*pow(sin(th),2.); fl += exp(-pow((length(pa)-rr)*90.,2.))*smoothstep(.0,.02,length(pa)); }",
    "  c += vec3(.4,.55,1.)*fl*.25*(1.+glt*2.);",
    "  c += vec3(.9,.95,1.)*(exp(-r*r*3000.)*3. + exp(-r*40.)*.5)*(1.+glt*3.) + vec3(.6,.8,1.)*exp(-r*12.)*.15;",
    "  { vec3 q = vec3(gl_FragCoord.xy*.5,1.); vec3 id = floor(q); c += vec3(.8,.85,1.)*step(.998,h31(id))*.6; }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- NATURE: desert dunes at dusk. Ridged dune field (sharp crests from |sin|-warped noise, wind ripples on the slopes) under
     a violet-to-amber sky with the first stars and a low moon; sand blows off the crests; long soft shadows. Drag moves along the
     dunes, tap = a gust plume. */
  S.dunes = [
    "float duneH(vec2 x){ float h = 0.; float a = .5; vec2 q = x; for (int i=0;i<4;i++){ float n = vn(q*vec2(.6,1.)); h += a*(1.-abs(sin((q.x+n*2.)*1.3+q.y*.4))); q = q*1.9+vec2(1.7,9.2); a *= .45; } return h; }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float hz = .05; vec3 sky = mix(vec3(1.,.55,.3), mix(vec3(.55,.35,.6), vec3(.08,.07,.2), smoothstep(.15,.5,p.y)), smoothstep(hz-.02,.25,p.y));",
    "  { vec3 q = vec3(gl_FragCoord.xy*.6,1.); vec3 id = floor(q); sky += vec3(.9,.9,1.)*step(.998,h31(id))*smoothstep(.2,.45,p.y); }",
    "  vec2 mo = vec2(-.45,.32); sky += vec3(1.,.97,.9)*smoothstep(.035,.03,length(p-mo)) + vec3(.6,.6,.8)*exp(-length(p-mo)*8.)*.2;",
    "  vec3 c = sky;",
    "  if (p.y < hz) { float d = hz-p.y; float z = .25/d; vec2 w = vec2(p.x*z + uDrag.x*4. + uT*.02, z);",
    "    float h = duneH(w*.35); float hx = duneH(w*.35+vec2(.02,0.)) - h; float hzz = duneH(w*.35+vec2(0.,.02)) - h;",
    "    vec3 n = normalize(vec3(-hx*30., 1., -hzz*30.)); vec3 L = normalize(vec3(.9,.25,.3));",
    "    float rip = sin((w.x*40.+w.y*25.) + vn(w*6.)*6.)*.5+.5; float dif = clamp(dot(n,L),0.,1.);",
    "    vec3 sand = mix(vec3(.72,.3,.1), vec3(1.,.62,.3), dif) * (.88+.12*rip); sand += vec3(1.,.85,.6)*step(.9975, h21(floor(gl_FragCoord.xy*.7)))*dif*.8; sand = mix(sand, vec3(.95,.45,.2), .25*smoothstep(.3,.8,fbm(w*.7)));",
    "    vec3 shade = mix(vec3(.2,.1,.2), vec3(.38,.2,.24), h)*(.7+.3*rip);",
    "    c = mix(shade, sand, smoothstep(.0,.25,dif)); c = mix(c, sky*.9, smoothstep(2.,10.,z)*.0 + exp(-d*12.)*.85);",
    "    float blow = smoothstep(.85,1.,h)*fbm(vec2(w.x*3.-uT*.8, w.y*2.))*.6; c += vec3(1.,.75,.5)*blow*exp(-d*3.)*.4; }",
    "  float gust = uTap<0. ? 0. : exp(-uTap*.6); vec2 tp = (uTapP-.5)*vec2(A,1.);",
    "  float plume = fbm(vec2((p.x-tp.x)*4.-uTap*1.5, (p.y-tp.y)*6.))*exp(-pow(max(p.y-tp.y,0.)*5.,2.))*smoothstep(.0,.1,p.x-tp.x+.05)*exp(-(p.x-tp.x)*2.)*gust;",
    "  c = mix(c, vec3(1.,.72,.48), clamp(plume*1.2,0.,.7));",
    "  o = vec4(c*.8, 1.); }"].join("\n");
  /* ---- MATERIAL: frost. Ice ferns crystallise across a dark window pane: diffusion-limited-aggregation look from branching dendrites
     (recursive angular fbm along growth rays, six-fold sub-branches), growth front advancing with time, sparkling where the light
     catches. Hold to melt a clear patch with your warmth (it refreezes slowly); tap = a frost snap that races across. */
  S.frost = [
    "float fern(vec2 p, float seed){ float v = 0.; float a = atan(p.y,p.x), r = length(p);",
    "  for (int k=0;k<3;k++){ float fk = float(k); float sc = pow(2.3,fk); float an = a*(5.+fk*4.)+seed+fbm(vec2(r*6.*sc, seed))*2.;",
    "    v += pow(abs(sin(an)),18.-fk*4.)*(.6/(1.+fk))*(.6+.6*fbm(vec2(r*30.*sc, a*8.+seed))); }",
    "  return v; }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec3 bg = mix(vec3(.02,.03,.06), vec3(.05,.08,.15), uv.y); for (int k=0;k<8;k++){ float fk = float(k); vec2 bp = vec2(fract(fk*.618)*2.-1., fract(fk*.37)-.5); bg += mix(vec3(1.,.7,.4),vec3(.5,.7,1.),fract(fk*.3))*exp(-length(p-bp)*14.)*.12; }",
    "  float snap = uTap<0. ? 99. : uTap; vec2 tp = (uTapP-.5)*vec2(A,1.);",
    "  float grow = clamp(uT*.04,0.,1.) + exp(-snap*.3)*0.; float ice = 0.;",
    "  for (int s=0;s<5;s++){ float fs = float(s); vec2 sc = vec2(fract(fs*.71)*A*.9-A*.45, fract(fs*.43)*.9-.45); vec2 q = p-sc; float r = length(q);",
    "    float reach = .15+.5*clamp(uT*.03+fs*.1,0.,1.) + smoothstep(0.,3.,snap)*.0; reach += (1.-step(snap,0.))*min(snap*.6,.5)*step(length(tp-sc),.8);",
    "    ice = max(ice, fern(q, fs*7.)*smoothstep(reach, reach*.6, r)); }",
    "  ice += fbm(p*40.)*.12 + pow(fbm(p*90.),3.)*.2;",
    "  vec2 fp = (uP-.5)*vec2(A,1.); float melt = exp(-dot(p-fp,p-fp)*30.)*uDown; ice *= 1.-melt*.95;",
    "  float front = exp(-pow(length(p-tp)-snap*.6,2.)*200.)*exp(-snap*.8); ice += front*.8;",
    "  float sparkle = step(.985, h21(floor(gl_FragCoord.xy*.5)+floor(uT*3.)))*ice;",
    "  vec3 c = bg*(1.-clamp(ice,0.,1.)*.6) + vec3(.75,.88,1.)*clamp(ice,0.,1.4)*.6 + vec3(1.)*sparkle*1.5 + vec3(.6,.8,1.)*melt*.05;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MAGIC: clockwork astrolabe. Brass gears (involute-ish tooth profile on SDF discs) meshing at correct ratios behind a
     filigree astrolabe face with rotating rete, zodiac ring and star pointers; warm lamplight, engraved shading. Drag turns the
     mechanism by hand; tap = a chime: all gears jump a tick and a golden pulse runs the rims. */
  S.clockwork = [
    "float gear(vec2 p, float R, float n, float ang){ float a = atan(p.y,p.x)+ang; float r = length(p); float nt = floor(R*110.); float seg = 6.2832/nt;",
    "  float la = mod(a+628.3185, seg) - seg*.5; float dT = max(r - R, abs(la)*r - seg*R*(.22 - .06*clamp((r-R*.88)/(R*.12),0.,1.)));",
    "  float d = min(r - R*.88, dT); d = max(d, R*.1 - r);",
    "  float sa = mod(a+628.3185, 1.25664) - .62832; float wd = max(abs(r-R*.5)-R*.22, R*.07-abs(sa)*r); d = max(d, -wd); return d; }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float tick = uTap<0. ? 0. : exp(-uTap*3.); float T = uT*.3 + uDrag.x*3. + floor(max(uTap,0.)*0.)*0.;",
    "  vec3 c = vec3(.025,.018,.012)*(.6+.6*fbm(p*5.));",
    "  vec3 G[5]; G[0] = vec3(-.5,.12,.26); G[1] = vec3(-.2,-.22,.17); G[2] = vec3(.42,.18,.22); G[3] = vec3(.12,.36,.12); G[4] = vec3(.6,-.27,.14);",
    "  float dir[5]; dir[0] = 1.; dir[1] = -1.; dir[2] = -1.; dir[3] = 1.; dir[4] = 1.;",
    "  for (int k=0;k<5;k++){ vec3 g = G[k]; float n = floor(g.z*90.); float ang = T*dir[k]*(.22/g.z) + tick*.1*dir[k];",
    "    float d = gear(p-g.xy, g.z, n, ang); float m = smoothstep(.003,-.003,d);",
    "    vec2 q = p-g.xy; float sh = clamp(dot(normalize(q+1e-4), normalize(vec2(-.6,.8))),-1.,1.);",
    "    vec3 brass = mix(vec3(.45,.3,.1), vec3(1.,.8,.45), .5+.5*sh)*(.7+.3*fbm(q*60.)) ; brass += vec3(1.,.9,.6)*smoothstep(.006,.0,abs(d+.004))*.6*(1.+tick*3.);",
    "    c = mix(c*(.55+.45*smoothstep(.0,.03,d)), brass*.5, m); }",
    "  vec2 q = p - vec2(.02,-.02); float r = length(q), a = atan(q.y,q.x); float R = .3;",
    "  float face = smoothstep(.004,.0,abs(r-R)) + smoothstep(.003,.0,abs(r-R*.88)) + smoothstep(.003,.0,abs(r-R*.62));",
    "  float ticks = smoothstep(.004,.0,abs(fract(a/6.2832*72.)-.5)*r*.09)*step(R*.88,r)*step(r,R);",
    "  float ra = a - uT*.05 - uDrag.x; float rete = smoothstep(.004,.0,abs(length(q-vec2(cos(uT*.05+uDrag.x),sin(uT*.05+uDrag.x))*.06)-R*.55));",
    "  float spokes = smoothstep(.003,.0,abs(sin(ra*6.))*r)*step(R*.15,r)*step(r,R*.88)*.8;",
    "  float hand = smoothstep(.005,.0,abs(dot(q, vec2(-sin(uT*.2),cos(uT*.2)))))*step(0.,dot(q,vec2(cos(uT*.2),sin(uT*.2))))*step(r,R*.85);",
    "  float fil = clamp(face+ticks+rete+spokes+hand,0.,1.); vec3 gold = vec3(1.,.78,.4)*(.65+tick*1.5);",
    "  c = mix(c, gold, fil*.9); c += vec3(1.,.8,.4)*exp(-pow((r-R) ,2.)*4000.)*tick*2.;",
    "  c += vec3(1.,.75,.4)*exp(-length(p-vec2(-.5,.45))*2.)*.12;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ===================== batch 6 (fx builder #2): orbit, eclipse, glowworms, opal, spellorb ===================== */
  /* ---- SPACE: sunrise from orbit. The planet's curved limb with a Rayleigh-style atmosphere shell (blue scattering fading to an
     orange terminator band), cloud decks in fbm, night-side city lights in clusters, the sun cresting the limb with a starburst.
     Drag shifts the dawn along the limb; tap = the sun breaks free (flare). */
  S.orbit = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec2 pc = vec2(0.,-2.35); float R = 2.; float r = length(p-pc); float h = r-R; float ang = atan(p.x-pc.x, p.y-pc.y);",
    "  float sunX = clamp(.15+uDrag.x*.8,-.8,.8); float flare = uTap<0. ? 0. : exp(-uTap*.6)*smoothstep(0.,.2,uTap);",
    "  vec2 sp = pc + vec2(sin(sunX*.4),cos(sunX*.4))*(R+.005+flare*.02); float dawn = exp(-pow((ang-sunX*.4)*2.2,2.));",
    "  vec3 c = vec3(0.); { vec3 q = vec3(gl_FragCoord.xy*.55,1.); vec3 id = floor(q); c += vec3(.85,.9,1.)*step(.998,h31(id))*(.4+h31(id+1.))*(1.-dawn*.8); }",
    "  if (h > 0.) { float atm = exp(-h*28.); c += mix(vec3(.15,.4,1.), vec3(1.,.45,.15), exp(-h*90.))*atm*(.15+1.4*dawn) + vec3(.3,.55,1.)*atm*.08; }",
    "  else { vec2 g = vec2(ang*R, -h)*vec2(2.,9.); float z = sqrt(max(-h*2.*R,0.)); vec2 gp = vec2(ang*6., z*4.);",
    "    float cl = fbm(gp*2.+fbm(gp*4.)*.5 + vec2(uT*.005,0.)); float land = smoothstep(.45,.55,fbm(gp*.8+7.));",
    "    vec3 ground = mix(vec3(.01,.03,.08), vec3(.06,.08,.04), land);",
    "    float lit = smoothstep(-.6,.25,dawn-.35+(-h)*.0) * dawn; vec3 day = mix(ground*4., vec3(.9,.85,.8), smoothstep(.5,.75,cl))*lit;",
    "    float cities = pow(fbm(gp*14.),6.)*land*30.*(1.-lit)*smoothstep(.75,.45,cl);",
    "    c = day + vec3(1.,.7,.35)*cities*.25 + ground*.15;",
    "    c += mix(vec3(.2,.45,1.), vec3(1.,.5,.2), dawn)*exp(h*40.)*(.25+.8*dawn); }",
    "  float sd = length(p-sp); vec2 sq = p-sp; float star = exp(-sd*60.)*3. + exp(-sd*9.)*.4*(1.+flare*2.);",
    "  float rays = pow(abs(sin(atan(sq.y,sq.x)*4.)),40.)*exp(-sd*5.)*.6 + pow(abs(sin(atan(sq.y,sq.x)*3.+.5)),60.)*exp(-sd*3.)*.4;",
    "  float vis = smoothstep(-.01,.01, length(p-pc)-R+.0) + .3; c += vec3(1.,.92,.8)*(star+rays*(1.+flare*2.))*vis;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: total solar eclipse. The black lunar disc over a pearly streamered corona (radial fbm, polar plumes), red
     prominences peeking at the limb, Baily's beads; a tap slides the Moon so the "diamond ring" flashes out. Drag nudges the Moon. */
  S.eclipse = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float R = .16; float ring = uTap<0. ? 0. : exp(-pow(uTap-1.2,2.)*1.5); vec2 mo = vec2(uDrag.x*.05 + ring*.012, uDrag.y*.05 + ring*.004);",
    "  float r = length(p), a = atan(p.y,p.x);",
    "  vec3 c = mix(vec3(.02,.03,.07), vec3(.05,.08,.16), uv.y); { vec3 q = vec3(gl_FragCoord.xy*.5,1.); vec3 id = floor(q); c += vec3(.9,.9,1.)*step(.9985,h31(id))*.6; }",
    "  float str = fbm(vec2(a*7., log(r)*1.5 - uT*.01))*.6 + fbm(vec2(a*21., log(r)*3.))*.4; float pol = pow(abs(sin(a)),6.);",
    "  float cor = pow(str,2.)*exp(-(r-R)*mix(6.,11.,pol)) + exp(-(r-R)*20.)*.6;",
    "  c += vec3(.85,.9,1.)*cor*step(R,r)*1.4 + vec3(.6,.7,1.)*exp(-(r-R)*4.)*.08;",
    "  for (int k=0;k<4;k++){ float fk = float(k); float pa = fk*1.9+.4; vec2 pp = vec2(cos(pa),sin(pa))*R; float pd = length((p-pp)*vec2(1.,1.)); c += vec3(1.,.15,.3)*exp(-pd*pd*8000.)*.8*smoothstep(R*.99,R*1.02,r); }",
    "  float mr = length(p-mo); float limb = smoothstep(R*1.003, R*.997, mr);",
    "  float edge = R - length(mo);", 
    "  vec2 dir = normalize(-mo+1e-5); float bead = exp(-length(p - dir*R)*80.)*smoothstep(.003,.012,length(mo));",
    "  float beads = 0.; for (int k=-2;k<=2;k++){ float ba = atan(dir.y,dir.x)+float(k)*.12; beads += exp(-length(p-vec2(cos(ba),sin(ba))*R)*300.)*smoothstep(.002,.008,length(mo)); }",
    "  c = mix(c, vec3(.0,.0,.004), limb);",
    "  c += vec3(1.,.97,.92)*(bead*3.*(1.+ring*4.) + beads*.8); vec2 bq = p-dir*R; float sp = pow(abs(sin(atan(bq.y,bq.x)*3.)),50.)*exp(-length(bq)*6.)*bead*0. + exp(-length(bq)*7.)*ring*.8; c += vec3(1.,.95,.9)*sp;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- NATURE: glowworm grotto. A dark limestone cave ceiling studded with thousands of blue-green glowworms whose silk threads hang
     down as beaded lines, reflected in a still black river; a boat-eye drift. Hold to shine a torch (they dim, threads glint); tap =
     a drip ripple across the reflection. */
  S.glowworms = [
    "vec3 cave(vec2 p, float t){ vec3 c = vec3(0.);",
    "  for (int L=0;L<3;L++){ float fl = float(L); vec2 q = p*(1.5+fl*1.3) + vec2(uT*.01*(1.+fl), 0.) + fl*7.;",
    "    float ceil_ = .05 + .25*fbm(vec2(q.x*.6, fl)) - fl*.05; vec2 g = floor(q*vec2(9.,4.)); vec2 f = fract(q*vec2(9.,4.));",
    "    float h = h21(g+fl*3.); vec2 o2 = vec2(.2+.6*h21(g+1.), .2+.6*h);",
    "    float worm = exp(-dot(f-o2,f-o2)*900.) * step(ceil_*4., q.y*0.+p.y*4.+.0)*0.;",
    "    float yy = p.y; float top = ceil_ - .02; if (yy < top) {",
    "      vec2 cell = floor(vec2(q.x*14., 0.)); float hx = h21(cell+fl*5.); float x = (fract(q.x*14.)-(.2+.6*hx));",
    "      float len = .02+.12*h21(cell+2.+fl); float thread = smoothstep(.012,.0,abs(x))*step(top-len, yy)*(.5+.5*sin(yy*400.+hx*30.));",
    "      float glow = exp(-x*x*180. - pow((yy-(top-len)),2.)*4000.);",
    "      float tw = .7+.3*sin(uT*(1.+hx)+hx*20.);",
    "      c += (vec3(.25,.9,.85)*glow*tw*1.4 + vec3(.3,.7,.8)*thread*.05*(1.+t*6.))*(1.-t*.7)/(1.+fl*.6); }",
    "    else c *= .4; }",
    "  return c; }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  float torch = smoothstep(0.,.5,uDown); vec2 fp = (uP-.5)*vec2(A,1.);",
    "  float water = -.22; vec3 c;",
    "  if (p.y > water) { c = cave(p, torch) + vec3(.02,.03,.03)*fbm(p*8.)*.3; c += vec3(.9,.8,.6)*exp(-dot(p-fp,p-fp)*12.)*torch*.15*fbm(p*20.); }",
    "  else { vec2 rp = vec2(p.x, 2.*water - p.y); float tap = uTap<0. ? 0. : exp(-uTap*.5); vec2 tp = (uTapP-.5)*vec2(A,1.);",
    "    float d = length((p-vec2(tp.x,water-.05))*vec2(1.,3.)); rp.y += sin(d*90.-uTap*10.)*.006*tap*exp(-d*4.) + (fbm(p*vec2(3.,30.)+uT*.1)-.5)*.004;",
    "    c = cave(rp, torch)*.55 + vec3(.0,.01,.012); }",
    "  c += vec3(.05,.15,.15)*exp(-abs(p.y-water)*60.)*.15;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MATERIAL: precious opal. A polished cabochon of black opal: play-of-colour patches (Voronoi grains with a diffraction
     hue that shifts with view angle), a glossy dome with Fresnel and soft-box reflections, on velvet. Drag tilts it so the fire
     rolls across the grains; tap = a light sweep. */
  S.opal = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec3 c = vec3(.04,.01,.03)*(.6+.6*fbm(p*30.))*(1.-length(p)*.6);",
    "  vec2 e = p*vec2(1.,1.35); float R = .34; float r = length(e);",
    "  if (r < R) { float z = sqrt(1.-pow(r/R,2.)); vec3 n = normalize(vec3(e/R, z)); vec2 tilt = vec2(sin(uT*.2), cos(uT*.17))*.25 + uDrag*1.5;",
    "    vec2 q = e*15. + n.xy*2. + vec2(fbm(e*6.),fbm(e*6.+4.))*1.5; vec2 cn = floor(q), cf = fract(q); float md = 9.; vec2 mid = vec2(0.);",
    "    for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 o2 = g+h22(cn+g)-cf; float d = dot(o2,o2); if (d<md){ md = d; mid = cn+g; } }",
    "    vec2 hd = h22(mid+3.)-.5; float ph = dot(normalize(hd), n.xy*2.+tilt) + h21(mid)*6.;",
    "    float on = pow(.5+.5*cos(ph*3.14159*1.2 + fbm(q*.6)*3.), 3.);",
    "    vec3 fire = .5+.5*cos(6.2832*(h21(mid)*.7 + ph*.3) + vec3(0.,2.1,4.2)); fire = pow(fire, vec3(1.5));",
    "    vec3 body = vec3(.02,.02,.04) + fire*on*on*(.5+.7*fbm(q*2.))*smoothstep(.0,.3,md+.1);",
    "    float F = .04+.96*pow(1.-z,5.); vec3 refl = vec3(1.)*smoothstep(.08,.0,length(n.xy-vec2(-.35,.45)))*1.2 + vec3(.6,.6,.7)*smoothstep(.2,.0,abs(n.x+.1))*smoothstep(.0,.3,n.y)*.1;",
    "    float sw = uTap<0. ? 0. : exp(-uTap*1.2); refl += vec3(1.)*exp(-pow(n.x+n.y - (uTap*1.5-1.2),2.)*30.)*sw*.8;",
    "    c = body*(1.-F) + refl + vec3(.8,.85,1.)*F*.25;",
    "    c *= smoothstep(R, R*.985, r); }",
    "  c += vec3(.0)*0.; float sh = smoothstep(R*1.15, R*.9, length(e-vec2(.03,-.04))) * step(R, r); c *= 1.-sh*.6;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MAGIC: spell orb. A seer's crystal ball on a bronze claw stand; inside, curl-warped arcane mist in teal and violet swirls
     around a slowly forming sigil, sparks orbit; the glass refracts the room (inverted) and carries a caustic on the cloth below.
     Hold to scry (mist parts, the sigil blazes); tap = a vision flash. */
  S.spellorb = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-vec2(.5,.55))*vec2(A,1.); float R = .3;",
    "  vec3 room = mix(vec3(.03,.02,.04), vec3(.08,.05,.06), uv.y) + vec3(1.,.6,.3)*exp(-length(p-vec2(-.55,.3))*3.)*.25;",
    "  vec3 c = room; float r = length(p); float scry = smoothstep(0.,1.,uDown); float vis = uTap<0. ? 0. : exp(-uTap*1.5);",
    "  if (p.y < -R*.85) { vec2 cq = p - vec2(0., -R*.85); c = vec3(.12,.03,.06)*(.6+.5*fbm(p*vec2(20.,60.))); c += vec3(.4,.6,1.)*exp(-dot(cq*vec2(1.,4.),cq*vec2(1.,4.))*30.)*(.15+.3*scry+vis); }",
    "  if (r < R) { float z = sqrt(1.-pow(r/R,2.)); vec2 q = p/R; vec2 rq = -q*.6;",
    "    vec3 inner = (mix(vec3(.03,.02,.04), vec3(.08,.05,.06), .5+rq.y*.5) + vec3(1.,.6,.3)*exp(-length(rq-vec2(.5,-.3))*4.)*.3)*.6;",
    "    vec2 m = q*2.; for (int k=0;k<3;k++){ m += .35*vec2(fbm(m*1.3+uT*.12+float(k)), fbm(m*1.3-uT*.1+7.+float(k))) - .175; }",
    "    float mist = fbm(m*1.5 + uT*.05); mist *= 1. - scry*.6*smoothstep(.6,.0,length(q));",
    "    vec3 mc = mix(vec3(.1,.8,.75), vec3(.6,.25,1.), smoothstep(.3,.7,fbm(m*.8)));",
    "    float rr = length(q), aa = atan(q.y,q.x); float sig = smoothstep(.02,.0,abs(rr-.35)) + smoothstep(.02,.0,abs(rr-.2)) + smoothstep(.015,.0,abs(sin(aa*3.+uT*.3))*rr)*step(rr,.35)*step(.2,rr);",
    "    sig *= (.25+.75*scry+vis)*smoothstep(0.,4.,uT);",
    "    vec3 col = inner + mc*pow(mist,2.)*1.2*(1.+vis*2.) + vec3(1.,.85,.5)*sig*1.5;",
    "    for (int k=0;k<6;k++){ float fk = float(k); float oa = uT*(.5+fk*.1)+fk*1.05; vec2 op = vec2(cos(oa), sin(oa)*.35)*(.55+.1*sin(fk)); col += vec3(.8,.9,1.)*exp(-length(q-op)*60.)*.8; }",
    "    float F = .04+.96*pow(1.-z,4.); col = col*(1.-F*.7) + vec3(.7,.75,.9)*F*.35 + vec3(1.)*smoothstep(.1,.0,length(q-vec2(-.4,.45)))*.9;",
    "    c = col; }",
    "  vec2 sq = p - vec2(0.,-R*1.0); if (abs(sq.x) < .14-sq.y*.0 && sq.y < .02 && sq.y > -.12 && r > R*.97) { c = vec3(.35,.22,.1)*(.5+.6*fbm(sq*40.))*(.6+.6*smoothstep(-.12,.02,sq.y)); }",
    "  o = vec4(c, 1.); }"].join("\n");

  K.scenes = S;
  /* Sound sync (audio/scape engine listens for window "titan:fx"): what a tap means in each scene. */
  var TAPFX = { shatter: "shatter", arcane: "arc", portal: "arc", plasmaglobe: "arc", waterfall: "splash", spellorb: "arc", glowworms: "splash", jellyfish: "touch", frost: "frost", lava: "touch", crystals: "touch", glowforest: "touch" };
  function fx(type, x, y, power) { try { dispatchEvent(new CustomEvent("titan:fx", { detail: { type: type, x: x, y: y, power: power, from: "scene" } })); } catch (e) {} }
  /* Scene id -> soundscape preset id (audio/scape/presets.js) for pages that start sound by scene. */
  K.sceneSound = { nebula: "space", galaxy: "space", sun: "space", blackhole: "blackhole", rainforest: "rainforest", aurora: "aurora", lava: "lava", waterfall: "waterfall",
    glowforest: "fireflies", jellyfish: "underwater", orbit: "space", eclipse: "space", glowworms: "underwater", opal: "crystal", spellorb: "plasma", comet: "space", pulsar: "space", dunes: "sandstorm", frost: "blizzard", clockwork: "crystal", ringworld: "space", wormhole: "space", sakura: "rainforest", cathedral: "crystal", bubbles: "bubbles", shatter: "glass", crystals: "crystal", arcane: "plasma", portal: "plasma", plasmaglobe: "plasma" };
  K.mod("scene", function (gl, s, K) {
    var src = S[s.kind]; if (!src) return null;
    // every read of the pixel position (the kinds and the shared helpers such as aspectP) goes through FC(); only FC() reads the raw one
    var pr = K.compile(K.FSQ, (HEAD.replace("NOISE", K.NOISE) + src).replace(/gl_FragCoord/g, "FC()").replace(/FC_RAW/g, "gl_FragCoord")); if (!pr) return null;
    var look = K.look || function (id, def) { return def; }, tOff = 0, lastView = {};   // an older cached kit has no world contract: the backdrop as before
    var flAt = -1, arcT = 0, onScape = function (e) { var d = e.detail || {}; if (d.type === "flash" || d.type === "arc" || d.type === "ripple") flAt = K.now ? K.now() : performance.now() / 1000; };
    addEventListener("titan:scape", onScape);
    var drag = [0, 0], lastX = null, lastY = null, tapAt = -1, tapP = [.5, .5], tapSeen = K.ptr.tap, bubbles = null, pops = null;
    if (s.kind === "bubbles") { bubbles = []; pops = new Float32Array(10); for (var i = 0; i < 10; i++) bubbles.push(newB(i, true)); }
    function newB(i, any) { var A = innerWidth / innerHeight; return { x: (Math.random() - .5) * A * .9, y: any ? Math.random() - .5 : -.75, vx: 0, vy: 0, r: .07 + Math.random() * .13 * (s.big || 1), seed: Math.random() * 9 }; }
    return { name: "scene", step: function (c) {
      var v = c.view || {}; lastView = v; if (v.mode === "backdrop") tOff = 0; else tOff += c.dt * (look("speed", 1) - 1);   // Speed (room): an offset on the clock
      var p = c.ptr; if (p.down) { if (lastX != null) { drag[0] += p.x - lastX; drag[1] += p.y - lastY; } lastX = p.x; lastY = p.y; } else lastX = lastY = null;
      if (p.tap !== tapSeen) { tapSeen = p.tap; tapAt = c.t; tapP = [p.tx, p.ty]; if (bubbles) popAt(p.tx, p.ty); else fx(TAPFX[s.kind] || "touch", p.tx, p.ty, 1); }
      if (s.kind === "plasmaglobe" && p.down && (arcT -= c.dt) <= 0) { arcT = .18 + Math.random() * .25; fx("arc", p.x, p.y, .6); }
      if (bubbles && !c.still) { var A = c.w / c.h, px = (p.x - .5) * A, py = p.y - .5;
        bubbles.forEach(function (b, i) { if (pops[i] > 0) { pops[i] += c.dt * 1.6; if (pops[i] >= 1) { pops[i] = 0; bubbles[i] = newB(i); } return; }
          b.vy += (.035 + Math.sin(c.t * .7 + b.seed) * .02) * c.dt; b.vx += Math.sin(c.t * .5 + b.seed * 3) * .02 * c.dt;
          var dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy) + 1e-3; if (p.down && d < .45) { var f = (.45 - d) * 3 * c.dt; b.vx += dx / d * f + p.vx * .02 * c.dt; b.vy += dy / d * f + p.vy * .02 * c.dt; }
          bubbles.forEach(function (o2, j) { if (j === i || pops[j] > 0) return; var ex = b.x - o2.x, ey = b.y - o2.y, ed = Math.hypot(ex, ey) + 1e-4, m = b.r + o2.r; if (ed < m) { b.vx += ex / ed * (m - ed) * 2 * c.dt; b.vy += ey / ed * (m - ed) * 2 * c.dt; } });
          b.vx *= .985; b.vy *= .985; b.x += b.vx * c.dt; b.y += b.vy * c.dt; if (b.y - b.r > .62) bubbles[i] = newB(i); if (Math.abs(b.x) > A * .5 + b.r) b.vx *= -1; }); }
      function popAt(tx, ty) { var A = c.w / c.h, X = (tx - .5) * A, Y = ty - .5, any = false; bubbles.forEach(function (b, i) { if (pops[i] === 0 && Math.hypot(b.x - X, b.y - Y) < b.r) { pops[i] = .001; any = true; fx("pop", b.x / A + .5, b.y + .5, b.r * 6); } }); if (!any) fx("touch", tx, ty, .5); }
    }, draw: function (c) {
      gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
      gl.uniform2f(u.uRes, c.w, c.h); gl.uniform2f(u.uP, c.ptr.x, c.ptr.y); gl.uniform2f(u.uTapP, tapP[0], tapP[1]); gl.uniform2f(u.uDrag, drag[0], drag[1]);
      gl.uniform1f(u.uT, c.t + tOff); gl.uniform4f(u.uView, lastView.yaw || 0, lastView.pitch || 0, lastView.move || 0, lastView.up || 0); gl.uniform1f(u.uDown, c.ptr.down); gl.uniform1f(u.uTap, tapAt < 0 ? -1 : c.t - tapAt); gl.uniform1f(u.uQ, K.tier() * Math.max(.5, c.q)); if (u.uFl) { var nw = K.now ? K.now() : performance.now() / 1000; gl.uniform1f(u.uFl, flAt < 0 ? -1 : nw - flAt); }
      if (bubbles) { var B = new Float32Array(40); bubbles.forEach(function (b, i) { B.set([b.x, b.y, 0, b.r], i * 4); }); gl.uniform4fv(u.uB, B); gl.uniform1fv(u.uPop, pops); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, debug: function () { return { kind: s.kind, cam: [lastView.yaw || 0, lastView.pitch || 0, lastView.move || 0, lastView.up || 0].map(function (x) { return +x.toFixed(3); }), look: { speed: look("speed", 1) } }; },
    dispose: function () { removeEventListener("titan:scape", onScape); gl.deleteProgram(pr.p); } };
  });
  /* Presets themes can pull in: K.preset("rainforest") returns a full stack (scene + companions + post). */
  var POST = function (o) { return Object.assign({ mod: "post", bloom: 1, threshold: .65, exposure: 1.15, aberr: .3, grain: .025, vig: .4 }, o || {}); };
  K.presets = K.presets || {};
  Object.assign(K.presets, {
    nebula: [{ mod: "scene", kind: "nebula" }, { mod: "particles", count: .008, shape: "mote", size: 2.5, curl: .3, speed: .01, life: .02, c1: [.8, .7, 1], c2: [.5, .8, 1], alpha: .5, blend: "add", glint: 1, rake: .6 }, POST({ bloom: 1.3, threshold: .55 })],
    blackhole: [{ mod: "scene", kind: "blackhole" }, POST({ bloom: 1.5, threshold: .7, exposure: 1.05, aberr: .45 })],
    rainforest: [{ mod: "scene", kind: "rainforest" },
      { mod: "particles", count: .00025, shape: "petal", size: 13, gravity: .05, drift: [.02, 0], curl: .8, scale: 1.2, speed: .05, life: .08, spawn: "top", c1: [.25, .45, .12], c2: [.55, .5, .15], alpha: .8, blend: "alpha", rake: 1 },
      { mod: "particles", count: .0006, shape: "mote", size: 8, curl: 1.4, scale: 2, speed: .04, life: .1, c1: [.75, 1, .3], c2: [1, .85, .3], alpha: .9, blend: "add", glint: 1, rake: .8 },
      { mod: "particles", count: .004, shape: "dot", size: 1.2, curl: .6, scale: 3, speed: .02, life: .05, drift: [.005, .003], c1: [1, .95, .7], c2: [.9, 1, .8], alpha: .18, blend: "add", rake: .5 },
      POST({ bloom: .9, threshold: .75, aberr: .15, dof: .25, focusY: .45 })],
    bubbles: [{ mod: "scene", kind: "bubbles" }, POST({ bloom: .8, threshold: .8, aberr: .2 })],
    aurora: [{ mod: "scene", kind: "aurora" }, { mod: "particles", count: .0015, shape: "dot", size: 1.4, gravity: .02, curl: .5, scale: 2, speed: .02, life: .06, spawn: "top", c1: [.9, .95, 1], c2: [.7, .9, 1], alpha: .5, blend: "add", rake: .4 }, POST({ bloom: 1.1, threshold: .5, aberr: .15 })],
    galaxy: [{ mod: "scene", kind: "galaxy" }, POST({ bloom: 1, threshold: .8, exposure: 1, aberr: .25 })],
    lava: [{ mod: "scene", kind: "lava" }, { mod: "particles", count: .0012, shape: "spark", size: 3, gravity: -.12, curl: 1.2, scale: 1.6, speed: .06, life: .12, spawn: "bottom", c1: [1, .5, .1], c2: [1, .85, .4], alpha: .8, blend: "add", glint: 1, rake: 1.5 }, POST({ bloom: 1, threshold: .85, exposure: 1, aberr: .3 })],
    crystals: [{ mod: "scene", kind: "crystals" }, { mod: "particles", count: .0008, shape: "mote", size: 3, curl: .6, scale: 2, speed: .015, life: .05, c1: [.85, .7, 1], c2: [.7, .9, 1], alpha: .5, blend: "add", glint: 1, rake: .5 }, POST({ bloom: .9, threshold: .85, aberr: .35 })],
    arcane: [{ mod: "scene", kind: "arcane" }, { mod: "particles", count: .003, shape: "spark", size: 2.6, gravity: -.06, curl: 2.2, scale: 1.4, speed: .09, life: .1, spawn: "bottom", c1: [.5, .7, 1], c2: [1, .8, .4], alpha: .8, blend: "add", glint: 1, rake: 1.6 }, { mod: "particles", count: .0005, shape: "mote", size: 7, curl: 1.5, scale: 1.2, speed: .04, life: .08, c1: [.8, .5, 1], c2: [.5, .8, 1], alpha: .7, blend: "add", rake: .8 }, POST({ bloom: 1.5, threshold: .5, aberr: .35 })],
    waterfall: [{ mod: "scene", kind: "waterfall" }, { mod: "particles", count: .0015, shape: "dot", size: 1.6, gravity: -.04, curl: 1, scale: 1.5, speed: .04, life: .06, spawn: "bottom", c1: [1, 1, 1], c2: [.9, .95, 1], alpha: .35, blend: "add", rake: .6 }, POST({ bloom: .8, threshold: .85, aberr: .1 })],
    portal: [{ mod: "scene", kind: "portal" }, { mod: "particles", count: .002, shape: "spark", size: 2.8, gravity: .06, curl: 1.6, scale: 1.2, speed: .1, life: .1, spawn: "ring", c1: [1, .55, .15], c2: [1, .85, .4], alpha: .85, blend: "add", glint: 1, rake: 1.8 }, POST({ bloom: 1, threshold: .85, aberr: .3 })],
    glowforest: [{ mod: "scene", kind: "glowforest" }, { mod: "particles", count: .0007, shape: "mote", size: 6, curl: 1.2, scale: 2, speed: .03, life: .1, c1: [.3, 1, .85], c2: [.6, .5, 1], alpha: .8, blend: "add", glint: 1, rake: .6 }, { mod: "particles", count: .003, shape: "dot", size: 1.2, gravity: -.01, curl: .5, scale: 3, speed: .01, life: .05, c1: [.4, 1, .9], c2: [.7, .6, 1], alpha: .4, blend: "add", rake: .3 }, POST({ bloom: 1.3, threshold: .45, aberr: .2, dof: .2, focusY: .3 })],
    sun: [{ mod: "scene", kind: "sun" }, POST({ bloom: .6, threshold: 1.1, exposure: .8, aberr: .2 })],
    plasmaglobe: [{ mod: "scene", kind: "plasmaglobe" }, POST({ bloom: 1, threshold: .8, aberr: .3 })],
    jellyfish: [{ mod: "scene", kind: "jellyfish" }, { mod: "particles", count: .003, shape: "dot", size: 1.5, gravity: .01, curl: .4, scale: 2, speed: .01, life: .05, c1: [.7, .85, 1], c2: [.9, .9, 1], alpha: .35, blend: "add", rake: .3 }, POST({ bloom: 1.2, threshold: .5, aberr: .25, dof: .2, focusY: .5 })],
    ringworld: [{ mod: "scene", kind: "ringworld" }, POST({ bloom: .8, threshold: .85, aberr: .15 })],
    wormhole: [{ mod: "scene", kind: "wormhole" }, { mod: "particles", count: .002, shape: "spark", size: 2, curl: .2, scale: 1, speed: .2, life: .05, spawn: "ring", c1: [.8, .9, 1], c2: [1, .8, 1], alpha: .7, blend: "add", rake: 3 }, POST({ bloom: 1.2, threshold: .6, aberr: .7 })],
    sakura: [{ mod: "scene", kind: "sakura" }, { mod: "particles", count: .0006, shape: "petal", size: 11, gravity: .04, drift: [.03, 0], curl: 1, scale: 1.2, speed: .05, life: .1, spawn: "top", c1: [1, .7, .8], c2: [1, .88, .92], alpha: .9, blend: "alpha", rake: 1 }, POST({ bloom: .7, threshold: .85, aberr: .1, dof: .3, focusY: .45 })],
    cathedral: [{ mod: "scene", kind: "cathedral" }, { mod: "particles", count: .0008, shape: "mote", size: 2.5, curl: .4, scale: 2, speed: .008, life: .04, c1: [1, .9, .7], c2: [.8, .8, 1], alpha: .3, blend: "add", glint: 1, rake: .4 }, POST({ bloom: .8, threshold: .85, aberr: .15 })],
    comet: [{ mod: "scene", kind: "comet" }, POST({ bloom: 1.2, threshold: .6, aberr: .2 })],
    pulsar: [{ mod: "scene", kind: "pulsar" }, { mod: "particles", count: .001, shape: "mote", size: 2, curl: .3, scale: 2, speed: .01, life: .04, c1: [.6, .8, 1], c2: [1, .6, .6], alpha: .4, blend: "add", rake: .4 }, POST({ bloom: 1.4, threshold: .5, aberr: .4 })],
    dunes: [{ mod: "scene", kind: "dunes" }, { mod: "particles", count: .002, shape: "dot", size: 1.3, drift: [.06, .005], curl: .8, scale: 2, speed: .05, life: .06, c1: [1, .75, .5], c2: [1, .85, .65], alpha: .35, blend: "add", rake: 1.5 }, POST({ bloom: .5, threshold: .95, exposure: .85, aberr: .1 })],
    frost: [{ mod: "scene", kind: "frost" }, POST({ bloom: 1, threshold: .7, aberr: .25 })],
    clockwork: [{ mod: "scene", kind: "clockwork" }, { mod: "particles", count: .0008, shape: "mote", size: 3, curl: .5, scale: 2, speed: .01, life: .05, c1: [1, .85, .5], c2: [1, .7, .4], alpha: .45, blend: "add", glint: 1, rake: .4 }, POST({ bloom: .9, threshold: .85, aberr: .2 })],
    orbit: [{ mod: "scene", kind: "orbit" }, POST({ bloom: 1.1, threshold: .7, aberr: .25 })],
    eclipse: [{ mod: "scene", kind: "eclipse" }, POST({ bloom: 1, threshold: .7, aberr: .2 })],
    glowworms: [{ mod: "scene", kind: "glowworms" }, POST({ bloom: 1.1, threshold: .6, aberr: .15 })],
    opal: [{ mod: "scene", kind: "opal" }, POST({ bloom: .8, threshold: .8, aberr: .15 })],
    spellorb: [{ mod: "scene", kind: "spellorb" }, { mod: "particles", count: .0006, shape: "mote", size: 4, curl: 1, scale: 2, speed: .02, life: .06, c1: [.4, 1, .9], c2: [.7, .4, 1], alpha: .6, blend: "add", glint: 1, rake: .5 }, POST({ bloom: 1.1, threshold: .65, aberr: .25 })],
    shatter: [{ mod: "scene", kind: "shatter" }, { mod: "particles", count: .0008, shape: "spark", size: 2.5, curl: .5, speed: .05, life: .3, c1: [.8, .9, 1], c2: [1, .9, .8], alpha: .35, blend: "add", rake: 2, glint: 1 }, POST({ bloom: 1.1, threshold: .7, aberr: .5 })]
  });
  K.preset = function (id) { return (K.presets[id] || []).map(function (x) { return Object.assign({}, x); }); };
})();
