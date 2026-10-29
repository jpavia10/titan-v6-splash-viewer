/* fx/tourbillon.js: Tourbillon (tourbillon), theme #41, on the TitanFXK kit (Claude, 2026-10-21; Grok's plan in notes/agents/themes-37-50.md).
   Inside a watch movement, seen through the sapphire caseback under a watchmaker's lamp. One full-resolution fragment pass draws the
   movement as layered parts with real heights (parallax, shadows from the lamp):
     plate     dark ruthenium main plate with perlage (overlapping circular graining, each spot a bow-tie highlight)
     train     gilt wheels with crossings, steel pinions; the teeth mesh exactly (phases solved from the tooth counts, see mesh())
     bridges   rhodium bridges with Cotes de Geneve (one stripe pass across the whole movement), mirror-polished bevels (anglage),
               blued screws, rubies in gold chatons
     barrel    sunburst ratchet wheel, crown wheel and click, above the barrel bridge; winding turns them tooth by tooth
     tourbillon a flying cage of black-polished steel that turns once a minute ON THE REAL SECONDS (its arrow reads the seconds
               ring), stepping 1 degree per beat; inside it a club-tooth escape wheel rolling round the fixed seconds wheel (72/8,
               so 9 turns per cage turn: half a tooth per beat), the pallet fork with ruby stones, a screw balance at 21,600 vph
               (3 Hz, 6 beats a second, motion-blurred) and a blued hairspring that breathes
     repeater  two steel gongs along the edge with their hammers
   The lamp is the pointer (it follows your finger or mouse; idle, it drifts), so every finish moves: stripes ripple, perlage
   flickers, bevels flash, black polish turns from black to white. Tap = wind the crown (ratchet clicks, the balance swings wider
   for a while); press and hold = the minute repeater strikes the current time (hours low gong, quarters ding-dong, minutes high).
   Beats follow the wall clock (Date), so the soundscape's escapement (audio/scape "movement") ticks with the picture without
   messages; taps and the repeater send titan:fx {type:"wind"|"repeater"} so their sounds land with the hammers.
   The balance, its screws and the inner hairspring coils get exact analytic motion blur (a 10 ms shutter), so they smear the way a
   camera sees a 3 Hz balance instead of strobing. Quality tiers (user-chosen): Low draws single perlage spots and skips the wheels'
   shadows on the plate; Medium, High and Max draw everything. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var SHUTTER = .6 / 60;                     // the balance is motion-blurred over a 10 ms shutter, like a camera at 60 fps
  var PI = Math.PI, TAU = 2 * PI;
  function dir(deg, r) { var a = deg * PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  /* ---- the train, in movement space (x -1..1, y about -.56..56; portrait screens see it turned a quarter) ----
     module (tooth size) is shared by each wheel and the pinion it drives: barrel 96 / centre pinion 12, centre wheel 80 / third
     pinion 10, third wheel 80 / cage pinion 10 (under the cage), fixed wheel 72 / escape pinion 8, ratchet 60 / crown wheel 24 */
  var KC = [.46, -.06];                       // the tourbillon
  var TW = add(KC, dir(150, .225));           // third wheel (R .2) drives the cage pinion (r .025)
  var W2 = add(TW, dir(175, .3375));          // centre wheel (R .3) drives the third pinion (r .0375)
  var BR = add(W2, dir(160, .36));            // barrel (R .32) drives the centre pinion (r .04)
  var CR = add(BR, dir(120, .322));           // crown wheel (R .092) on the ratchet wheel (R .23)
  var DE = .19 + .19 / 9;                     // escape pinion centre from the cage axis: fixed wheel R + pinion r
  var GEAR = [                                // centre, R, teeth, kind (0 gilt wheel, 1 steel pinion, 2 gilt barrel, 3 steel wheel), spokes, height
    { c: TW, R: .20, n: 80, k: 0, s: 5, z: .008 },             // listed by height: the shader draws them in this order
    { c: BR, R: .32, n: 96, k: 2, s: 0, z: .010 },
    { c: KC, R: .19, n: 72, k: 3, s: 5, z: .012 },             // the fixed seconds wheel: steel, so the gilt balance stands out
    { c: W2, R: .30, n: 80, k: 0, s: 6, z: .020 },
    { c: TW, R: .0375, n: 10, k: 1, s: 0, z: .025 },
    { c: W2, R: .04, n: 12, k: 1, s: 0, z: .026 }
  ];
  /* screws (x, y, slot angle) and jewels (x, y, ruby radius) on the bridges and plates */
  var SCREWS = [add(BR, dir(170, .4)), add(BR, dir(158, .62)), [W2[0] - .36 * .55, W2[1] - .78 * .55], [(W2[0] + TW[0]) / 2, (W2[1] + TW[1]) / 2], add(KC, dir(-28, .418)), add(KC, dir(64, .418)), add(KC, dir(232, .418))];
  var JEWELS = [[W2[0], W2[1], .019], [TW[0], TW[1], .016]];
  function f(v) { return (+v).toFixed(5); }
  function v2(a) { return "vec2(" + f(a[0]) + "," + f(a[1]) + ")"; }
  /* phase of a wheel meshing with another: the tooth fractions at the contact point add up to a half (a tooth meets a gap) */
  function mesh(psi1, n1, n2, phi) { var s1 = TAU / n1, s2 = TAU / n2; return phi + PI - s2 * (.5 - (phi - psi1) / s1); }
  function ang(a, b) { return Math.atan2(b[1] - a[1], b[0] - a[0]); }

  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define PI 3.14159265", "#define LITE " + (lite ? 1 : 0),
    "const vec2 KC=" + v2(KC) + ", TW=" + v2(TW) + ", W2=" + v2(W2) + ", BR=" + v2(BR) + ", CR=" + v2(CR) + ";",
    "const float DE=" + f(DE) + ";",
    "const int NS=" + SCREWS.length + "; const vec3 SCR[NS]=vec3[NS](" + SCREWS.map(function (s, i) { return "vec3(" + f(s[0]) + "," + f(s[1]) + "," + f((i * 1.37) % 3.1) + ")"; }).join(",") + ");",
    "const int NJ=" + JEWELS.length + "; const vec3 JWL[NJ]=vec3[NJ](" + JEWELS.map(function (j) { return "vec3(" + f(j[0]) + "," + f(j[1]) + "," + f(j[2]) + ")"; }).join(",") + ");",
    "uniform vec2 uRes; uniform float uT, uScale, uPort, uZ0;",
    "uniform vec4 uG[6]; uniform vec4 uGs[6];",                // wheel (cx, cy, R, angle), (teeth, kind, spokes, height)
    "uniform vec3 uL; uniform vec2 uTilt;",                     // the lamp (movement space + height), viewer offset for parallax
    "uniform float uCage, uEsc, uFork, uRat, uCrown, uClick; uniform vec2 uBal, uHam, uGong;",
    "uniform vec4 uView; uniform vec3 uLook;",
    "vec2 r2(vec2 v, float a){ float c=cos(a), s=sin(a); return vec2(c*v.x-s*v.y, s*v.x+c*v.y); }",
    "float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }",
    "float smax(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return max(a,b)+h*h*k*.25; }",
    "float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }",
    "float sdBox(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }",
    // a wheel: cycloid-like teeth (tooth half the pitch, rounded tips), rim, hub and crossings with rounded corners
    "float sdGear(vec2 q, float R, float n, float sp, float win){ float r=length(q), a=atan(q.y,q.x);",
    "  float mo=2.*R/n, ra=R+mo*.95, rd=R-mo*1.2, seg=2.*PI/n, la=mod(a,seg)-seg*.5;",
    "  float tip=clamp((r-R+mo*.3)/(ra-R+mo*.3),0.,1.); float w=mo*PI*.24*(1.-.55*tip*tip);",
    "  float d=min(r-rd, max(abs(la)*r-w, r-ra));",
    "  if(win>.5){ float rim=rd-max(.011,R*.1), hub=max(.026,R*.17), ss=2.*PI/sp, sa=mod(a+ss*.5,ss)-ss*.5, sw=max(.0065,R*.045);",
    "    float wd=smax(smax(hub-r, r-rim, .014), sw-abs(sa)*r, .014); d=max(d,-wd); }",
    "  return d; }",
    // sawtooth teeth (ratchet click teeth, club-shaped escape teeth): ro rises along the tooth then drops at a radial wall
    "float sdSaw(vec2 q, float R, float n, float h, float pw){ float r=length(q), a=atan(q.y,q.x), seg=2.*PI/n; float u=fract(a/seg);",
    "  float ro=R-h+h*pow(u,pw), sl=h*pw*pow(max(u,1e-3),pw-1.)/(seg*r); float d=(r-ro)/sqrt(1.+sl*sl);",
    "  if(d<0.) d=max(d,-(1.-u)*seg*r); else if(r<R&&r>R-h) d=min(d,u*seg*r); return d; }",
    /* finishes and light */
    "const vec3 LF=vec3(-.52,.62,.59);",
    "vec3 env(vec3 R, vec3 Ld){ vec2 rh=normalize(R.xy+vec2(1e-5)), lh=normalize(Ld.xy+vec2(1e-5)); float hor=1.-abs(R.z);",
    "  vec3 c=vec3(.010,.011,.014)+vec3(.045,.048,.055)*max(R.z,0.)*.6;",
    "  c+=vec3(1.,.9,.78)*pow(max(dot(rh,lh),0.),10.)*hor*hor*1.5;",                         // the lamp's softbox on the horizon
    "  c+=vec3(.75,.8,.95)*pow(max(dot(rh,normalize(LF.xy)),0.),6.)*hor*hor*.5; return c; }",      // a cool window behind the bench
    // P surface point (z = height), n normal, base albedo, sc metal colour, T groove direction (brushed when an=1), gloss, shadow
    "float brush(vec2 T, vec3 H, float w){ vec2 Bt=vec2(-T.y,T.x); float a=dot(T,H.xy)/w, b=dot(Bt,H.xy)/(H.z*.5); return exp(-a*a-b*b); }",
    "vec3 shade(vec3 P, vec3 n, vec3 base, vec3 sc, vec2 T, float an, float gl, float sh){",
    "  vec3 Ld=uL-P; float dl=length(Ld); Ld/=dl; float att=1.25/(1.+dl*dl*1.4)*uLook.x; vec3 H=normalize(Ld+vec3(0.,0.,1.)); float ndl=max(dot(n,Ld),0.);",
    "  vec3 HF=normalize(LF+vec3(0.,0.,1.)); float ndf=max(dot(n,LF),0.);",
    "  vec3 c=base*(.07+ndl*att*sh*.9+ndf*.45*(.6+.4*sh)); float sp, sf;",
    "  if(an>0.){ sp=brush(T,H,an)*1.1; sf=brush(T,HF,an*1.3)*.12; }",
    "  else { sp=pow(max(dot(n,H),0.),gl)*(.25+gl*.01); sf=pow(max(dot(n,HF),0.),gl*.5)*(.25+gl*.005)*.22; }",
    "  c+=sc*(sp*att*sh*(.3+.7*ndl)*1.25+sf*(.6+.4*sh))*uLook.y; c+=sc*env(reflect(vec3(0.,0.,-1.),n),Ld)*(an>0.?.4:1.)*uLook.y; return c; }",
    "vec3 bevN(vec2 g, float t){ return normalize(vec3(g*mix(.55,1.5,t),1.)); }",               // a polished chamfer: steeper toward the edge
    "float cov(float d, float px){ return clamp(.5-d/px,0.,1.); }",
    /* layer shapes */
    "float sdBridges(vec2 q){",
    "  float b1=smin(length(q-BR)-.27, sdCap(q,BR,BR+vec2(-.95,.3),.17), .07);",
    "  float b2=smin(smin(length(q-W2)-.068, length(q-TW)-.058, .05), sdCap(q,W2,TW,.036), .05); b2=smin(b2, sdCap(q,W2,W2+vec2(-.36,-.78),.048), .06);",
    "  float up=smax(smin(length(q-KC)-.47, sdCap(q,KC,KC+vec2(.75,-.6),.3), .08), -(length(q-KC)-.366), .012);",   // upper plate with the cage aperture
    "  return min(min(b1,b2),up); }",
    "float sdRatchet(vec2 q){ return min(length(q-BR)-.236, length(q-CR)-.1); }",                 // bound of the ratchet group (shadows)
    "float yGong(float x, float R){ return 1.62-sqrt(R*R-(x+.45)*(x+.45)); }",
    "float sdGongs(vec2 q, out float lr, out float which){ float r=length(q-vec2(-.45,1.62)); float d1=abs(r-2.03), d2=abs(r-2.012);",
    "  which=d1<d2?0.:1.; lr=(which<.5?r-2.03:r-2.012); float d=min(d1,d2)-.0032; return max(d, abs(q.x+.455)-.595); }",
    "vec2 hamPiv(float i){ return i<.5?vec2(-.95,-.27):vec2(-.86,-.25); }",
    "float sdHammer(vec2 q, float i, float lift){ vec2 pv=hamPiv(i); float xh=i<.5?-.915:-.83; vec2 hd=vec2(xh, (i<.5?yGong(xh,2.012):yGong(xh,2.03))+.016);",
    "  vec2 qq=r2(q-pv,-lift*.32)+pv; vec2 ax=normalize(hd-pv); float d=sdCap(qq,pv,hd,.0068);",
    "  vec2 hq=qq-hd; hq=vec2(dot(hq,ax),dot(hq,vec2(-ax.y,ax.x))); d=min(d, sdBox(hq,vec2(.014,.021),.005)); return min(d, length(q-pv)-.014); }",
    "float sdCageFrame(vec2 c){ float r=length(c); float d=abs(r-.287)-.008;",
    "  for(int i=0;i<3;i++){ float a=1.0472+float(i)*2.0944; vec2 dv=vec2(cos(a),sin(a)); float arm=sdCap(c,dv*.04,dv*.282,.0048);",
    "    float eye=abs(length(c-dv*.165)-.019)-.0045; d=min(d,smin(arm,eye,.012)); }",
    "  vec2 dv=vec2(-1.,0.); float ar=sdCap(c,dv*.04,dv*.33,.0045);",                                     // the seconds arrow
    "  vec2 t=c-dv*.338; t=vec2(dot(t,dv),dot(t,vec2(-dv.y,dv.x))); float tri=max(abs(t.y)*1.6+t.x-.013,-t.x-.013);",
    "  d=min(d,min(ar,tri)); return min(d, length(c)-.043); }",
    "float sdFork(vec2 f, out float stone){ float d=sdCap(f,vec2(0.),vec2(.034,.047),.0068); d=min(d,sdCap(f,vec2(0.),vec2(.034,-.047),.0068));",
    "  d=min(d,sdCap(f,vec2(0.),vec2(-.092,0.),.005)); d=min(d,length(f-vec2(-.094,.009))-.0045); d=min(d,length(f-vec2(-.094,-.009))-.0045); d=min(d,length(f)-.012);",
    "  vec2 E=vec2(DE-.12,0.); stone=1e3; for(int s=0;s<2;s++){ vec2 S=E+.072*vec2(-.643,s==0?.766:-.766); vec2 ax=normalize(S-E); vec2 t=f-S-ax*.004; t=vec2(dot(t,ax),dot(t,vec2(-ax.y,ax.x)));",
    "    stone=min(stone,sdBox(t,vec2(.011,.0034),.0012)); } return d; }",
    "float sdEsc(vec2 qe){ float re=length(qe); float d=max(sdSaw(qe,.072,20.,.016,1.7),.024-re);",
    "  float aa=atan(qe.y,qe.x), ss=1.5708, sa=mod(aa+ss*.5,ss)-ss*.5; float wd=smax(smax(.017-re,re-.046,.008),.004-abs(sa)*re,.008); return min(max(d,-wd),re-.016); }",
    /* exact motion blur for parts that repeat round the balance: the share of the shutter time a periodic band (half-width hw, in
       periods) covers this point while the phase sweeps by L; the pixel's own width is added to the sweep, which anti-aliases it */
    "float cumB(float x, float hw){ float fl=floor(x), u=x-fl; return fl*2.*hw+min(u,hw)+max(0.,u-(1.-hw)); }",
    "float sweep(float u0, float L, float hw, float pxu){ float l=sqrt(L*L+pxu*pxu); return clamp((cumB(u0+l*.5,hw)-cumB(u0-l*.5,hw))/l,0.,1.); }",
    /* shadow from everything above height zr, along the ray to the lamp */
    "float shadowAt(vec2 q, float zr, float wheels){ vec3 Ld=normalize(uL-vec3(q,zr)); vec2 dv=Ld.xy/max(Ld.z,.25); float s=1.;",
    "  if(wheels>.5){ float dz=.025-zr+.02, dd=1e3; vec2 qq=q+dv*dz; for(int i=0;i<6;i++){ vec4 G=uG[i]; if(uGs[i].w<=zr+.003) continue; vec2 g=qq-G.xy; if(dot(g,g)>G.z*G.z*1.1) continue;",
    "      dd=min(dd, sdGear(r2(g,-G.w),G.z,uGs[i].x,uGs[i].z,(uGs[i].y<.5||uGs[i].y>2.5)?1.:0.)); } s*=1.-.55*(1.-smoothstep(-.003,.004+dz*.3,dd)); }",
    "  float dz=.08-zr; if(dz>.004){ vec2 qq=q+dv*dz; s*=1.-.6*(1.-smoothstep(-.004,.005+dz*.3,sdBridges(qq))); }",
    "  dz=.11-zr; if(dz>.004){ vec2 qq=q+dv*dz; s*=1.-.6*(1.-smoothstep(-.004,.005+dz*.3,sdRatchet(qq))); }",
    "  dz=.135-zr; if(dz>.004){ vec2 qq=q+dv*dz; if(dot(qq-KC,qq-KC)<.13){ vec2 c=r2(qq-KC,-uCage); float d=min(sdCageFrame(c), abs(length(c)-.14)-.008); s*=1.-.55*(1.-smoothstep(-.003,.004+dz*.3,d)); } }",
    "  return s; }",
    /* ruby in a gold chaton, blued screw */
    "vec3 ruby(vec2 q, float rr, vec3 col, float px, float z){ float r=length(q); float ch=r-rr*1.6; if(ch>px) return col;",
    "  vec3 Ld=normalize(uL-vec3(q,z)); vec3 P=vec3(q,z);",
    "  vec3 gold=shade(P,bevN(q/max(r,1e-4),clamp((r-rr)/(rr*.6),0.,1.)),vec3(.12,.08,.03),vec3(1.,.76,.42),vec2(0.),0.,90.,1.);",
    "  col=mix(col,gold,cov(ch,px)); float rd=r-rr; if(rd>px) return col;",
    "  vec2 nq=q/rr; vec3 n=normalize(vec3(nq*.85,sqrt(max(1.-dot(nq,nq)*.72,.05))));",
    "  float glow=pow(1.-clamp(r/rr,0.,1.),.7); vec3 c=vec3(.22,.0,.02)+vec3(.95,.06,.12)*glow*(.25+.75*max(dot(Ld.xy,-nq)*.5+.5,0.))*.9;",
    "  c+=vec3(1.,.85,.85)*pow(max(dot(n,normalize(Ld+vec3(0,0,1))),0.),160.)*2.2;",                        // the polished dome catches the lamp
    "  c=mix(c,vec3(.02,0.,.005),smoothstep(rr*.32,rr*.22,r)); c+=vec3(.9)*smoothstep(rr*.12,0.,r)*.35;",     // the hole with the pivot in it
    "  return mix(col,c,cov(rd,px)); }",
    "vec3 screw(vec2 q, float rs, float sa, vec3 col, float px, float z, float sh){ float r=length(q); float cs=r-rs*1.35; if(cs>px) return col;",
    "  col=mix(col, col*.55+shade(vec3(q,z),bevN(-q/max(r,1e-4),.5),vec3(.03),vec3(.8,.82,.86),vec2(0.),0.,200.,sh)*.6, cov(cs,px)*smoothstep(rs*.95,rs*1.2,r));",   // countersink
    "  float d=r-rs; if(d>px) return col; vec2 nq=q/rs; vec3 n=normalize(vec3(nq*.6,1.));",
    "  vec3 c=shade(vec3(q,z+.004),n,vec3(.015,.03,.12),vec3(.25,.42,1.),vec2(0.),0.,70.,sh); c+=vec3(.08,.12,.35)*.4;",
    "  vec2 sl=r2(q,-sa); float slot=sdBox(sl,vec2(rs*1.1,rs*.13),.0005); c=mix(c,vec3(.003,.005,.02),cov(slot,px));",
    "  return mix(col,c,cov(d,px)); }",
    /* ---------------- main ---------------- */
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y; p-=vec2(uView.x,uView.y); float zFactor=exp(-uView.z); p*=zFactor; vec2 m=(uPort>.5?vec2(-p.y,p.x):p)*uScale; float px=uScale/uRes.y*zFactor;",
    "  vec2 e=vec2(px*.7,0.);",
    // bridges first: where they cover the pixel completely, nothing under them needs shading
    "  vec2 qb=m+uTilt*.08; float dB=sdBridges(qb); vec3 col=vec3(0.);",
    "  if(dB>-px){",
    "    float rr; vec2 Tp; { float g=.034; vec2 cell=floor(m/g); float bo=-1e9; vec2 bc=vec2(0.); rr=0.;",                      // perlage
    "      #if LITE", "      bc=(cell+.5)*g; rr=length(m-bc)/(g*.9);", "      #else",
    "      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 id=cell+vec2(float(i),float(j)); vec2 c=(id+.5)*g+(h22(id)-.5)*g*.18; float r=length(m-c);",
    "        if(r<g*.9){ float ord=id.y*977.+id.x+h21(id)*.5; if(ord>bo){ bo=ord; bc=c; rr=r/(g*.9); } } }", "      #endif",
    "      vec2 d=m-bc; Tp=normalize(vec2(-d.y,d.x)+1e-6); }",
    "    float sh=shadowAt(m,0.,LITE>0?0.:1.);",
    "    col=shade(vec3(m,0.),vec3(0.,0.,1.),vec3(.026,.027,.032)*(.85+.3*vn(m*45.)),vec3(.42,.44,.5)*(.82+.18*sin(rr*42.)),Tp,.15,0.,sh);",
    "    col*=.9+.1*smoothstep(1.,.85,rr);",                                                                               // the rim of each spot
    // gongs and hammers (z .04-.05)
    "    { float lr, wh; float dg=sdGongs(m+uTilt*.04,lr,wh); if(dg<px){ vec2 gr=normalize(m-vec2(-.45,1.62)); float t=clamp(lr/.0032,-1.,1.);",
    "        vec3 n=normalize(vec3(gr*t,sqrt(1.-t*t))); float gi=wh<.5?uGong.x:uGong.y; float wv=1.+gi*2.5*(.5+.5*sin(m.x*140.-uT*90.));",
    "        vec3 c=shade(vec3(m,.04),n,vec3(.02),vec3(.85,.87,.9)*wv,vec2(0.),0.,220.,shadowAt(m,.04,0.)); col=mix(col,c,cov(dg,px)); }",
    "      vec2 ft=vec2(.15,yGong(.15,2.021)); float dft=sdBox(r2(m+uTilt*.045-ft,.25),vec2(.03,.026),.006); if(dft<px){ vec2 g=normalize(vec2(sdBox(r2(m+e-ft,.25),vec2(.03,.026),.006)-dft, sdBox(r2(m+e.yx-ft,.25),vec2(.03,.026),.006)-dft));",
    "        vec3 c=shade(vec3(m,.045),dft>-.006?bevN(g,1.+dft/.006):vec3(0,0,1),vec3(.03),vec3(.8,.82,.86),vec2(normalize(vec2(1.,.3))),dft>-.006?0.:.06,240.,1.); col=mix(col,c,cov(dft,px)); col=screw(m-ft-vec2(-.006,.004),.011,1.1,col,px,.05,1.); }",
    "      for(int i=0;i<2;i++){ float fi=float(i); vec2 qh=m+uTilt*.05; float dh=sdHammer(qh,fi,fi<.5?uHam.x:uHam.y); if(dh<px){",
    "        vec2 g=normalize(vec2(sdHammer(qh+e,fi,fi<.5?uHam.x:uHam.y)-dh, sdHammer(qh+e.yx,fi,fi<.5?uHam.x:uHam.y)-dh)); float bt=clamp(-dh/.004,0.,1.);",
    "        vec3 c=shade(vec3(m,.05),bt<1.?bevN(g,1.-bt):vec3(0,0,1),vec3(.02),vec3(.85,.87,.9),vec2(1.,0.),0.,140.,shadowAt(m,.05,0.)); col=mix(col,c,cov(dh,px)); }",
    "        col=screw(qh-hamPiv(fi),.0085,fi*1.7+.4,col,px,.055,1.); } }",
    // the train
    "    for(int i=0;i<6;i++){ vec4 G=uG[i], S=uGs[i]; vec2 q=m+uTilt*S.w-G.xy; float bR=G.z*1.08+.008; if(dot(q,q)>bR*bR) continue;",
    "      q=r2(q,-G.w); float win=(S.y<.5||S.y>2.5)?1.:0.; float d=sdGear(q,G.z,S.x,S.z,win); if(d>px) continue;",
    "      float bw=S.y>.5&&S.y<1.5?.007:.0034; vec3 n=vec3(0.,0.,1.); float bt=clamp(-d/bw,0.,1.);",
    "      if(bt<1.){ vec2 g=normalize(vec2(sdGear(q+e,G.z,S.x,S.z,win)-d, sdGear(q+e.yx,G.z,S.x,S.z,win)-d)); g=r2(g,G.w); n=bevN(g,1.-bt); }",
    "      vec2 qw=m+uTilt*S.w-G.xy; float r=length(qw); vec2 T=normalize(vec2(-qw.y,qw.x)+1e-6); vec3 c; float sh=shadowAt(m,S.w,1.);",
    "      if(S.y>.5&&S.y<1.5) c=shade(vec3(m,S.w),n,vec3(.03),vec3(.86,.88,.92),vec2(0.),0.,300.,sh);",                 // steel pinion, polished leaves
    "      else { vec3 gilt=S.y>2.5?vec3(.74,.76,.8):vec3(1.,.74,.38); if(S.y>1.5&&S.y<2.5){ T=normalize(qw+1e-6); gilt*=.92; }",                            // barrel: sunburst; wheels: circular graining
    "        vec3 alb=S.y>2.5?vec3(.05,.052,.056):vec3(.1,.068,.03);",
    "        c=bt<1.?shade(vec3(m,S.w),n,alb,gilt,vec2(0.),0.,260.,sh):shade(vec3(m,S.w),n,alb*(.9+.2*vn(qw*60.)),gilt*(.88+.12*sin(r*260.)),T,.06,0.,sh); }",
    "      col=mix(col,c,cov(d,px)); }",
    "  }",
    // bridges: rhodium, Cotes de Geneve, polished anglage
    "  if(dB<px){ vec2 D=vec2(.906,-.423), N=vec2(-D.y,D.x); float W=.062, s=dot(qb,N)/W, u=fract(s)-.5; vec2 T=r2(D,u*1.7);",
    "    float bw=.011; float bt=clamp(-dB/bw,0.,1.); vec3 n=vec3(0.,0.,1.);",
    "    if(bt<1.){ vec2 g=normalize(vec2(sdBridges(qb+e)-dB, sdBridges(qb+e.yx)-dB)); n=bevN(g,1.-bt); }",
    "    float sh=shadowAt(m,.08,0.); vec3 base=vec3(.085,.088,.095)*(.9+.2*vn(qb*30.));",
    "    vec3 c=bt<1.?shade(vec3(m,.08),n,base*.6,vec3(.86,.88,.92),vec2(0.),0.,420.,sh):shade(vec3(m,.08),n,base,vec3(.7,.72,.77)*(.9+.1*vn(vec2(dot(qb,T)*4.,dot(qb,vec2(-T.y,T.x))*180.))),T,.05,0.,sh);",
    "    c*=1.-.35*smoothstep(.5-px*1.5/W,.5,abs(u))*step(1.,bt);",                                                        // where one stripe overlaps the next
    "    col=mix(col,c,cov(dB,px));",
    "    for(int i=0;i<NS;i++){ vec2 q=qb-SCR[i].xy; if(dot(q,q)<.0012) col=screw(q,.019,SCR[i].z,col,px,.085,sh); }",
    "    for(int i=0;i<NJ;i++){ vec2 q=qb-JWL[i].xy; if(dot(q,q)<.0016) col=ruby(q,JWL[i].z,col,px,.085); } }",
    // the seconds ring in the cage aperture (z .07): grained silver, engraved and blackened marks, five-second marks longer
    "  { vec2 q=m+uTilt*.07-KC; float r=length(q); float d=abs(r-.334)-.028; if(d<px){ float a=atan(q.y,q.x); float sh=shadowAt(m,.07,0.);",
    "      vec3 c=shade(vec3(m,.07),vec3(0,0,1),vec3(.17,.17,.18)*(.9+.2*vn(q*300.)),vec3(.6,.61,.65),normalize(vec2(-q.y,q.x)),.25,0.,sh);",
    "      float k=(uZ0-a)/(2.*PI)*60.; float fk=abs(fract(k+.5)-.5)*2.*PI/60.*r; float big=step(abs(mod(floor(k+.5),5.)),.5);",
    "      float tick=fk-mix(.0011,.0022,big); float lenR=r-(.362-mix(.012,.024,big)); c=mix(c,vec3(.006),cov(max(tick,-lenR),px));",
    "      float ed=abs(r-.306)-.0016; c=mix(c,c*.4,cov(ed,px)); col=mix(col,c,cov(d,px)); } }",
    // ratchet wheel (sunburst steel), crown wheel, click, ratchet screw (z .11)
    "  { vec2 q=m+uTilt*.11-BR; if(dot(q,q)<.06){ vec2 ql=r2(q,-uRat); float d=sdGear(ql,.23,60.,1.,0.); if(d<px){ float bt=clamp(-d/.006,0.,1.); vec3 n=vec3(0,0,1);",
    "        if(bt<1.){ vec2 g=normalize(vec2(sdGear(ql+e,.23,60.,1.,0.)-d, sdGear(ql+e.yx,.23,60.,1.,0.)-d)); n=bevN(r2(g,uRat),1.-bt); }",
    "        float sh=shadowAt(m,.11,0.); vec2 T=normalize(q+1e-6);",
    "        vec3 c=bt<1.?shade(vec3(m,.11),n,vec3(.02),vec3(.85,.87,.92),vec2(0.),0.,380.,sh):shade(vec3(m,.11),n,vec3(.06,.062,.068),vec3(.72,.74,.8)*(.92+.08*sin(atan(q.y,q.x)*300.)),T,.07,0.,sh);",
    "        col=mix(col,c,cov(d,px)); col=screw(r2(q,-uRat),.046,.5,col,px,.115,sh); } }",
    "    vec2 qc=m+uTilt*.11-CR; if(dot(qc,qc)<.0121){ vec2 ql=r2(qc,-uCrown); float d=sdGear(ql,.092,24.,4.,1.); if(d<px){ float bt=clamp(-d/.005,0.,1.); vec3 n=vec3(0,0,1);",
    "        if(bt<1.){ vec2 g=normalize(vec2(sdGear(ql+e,.092,24.,4.,1.)-d, sdGear(ql+e.yx,.092,24.,4.,1.)-d)); n=bevN(r2(g,uCrown),1.-bt); }",
    "        vec3 c=bt<1.?shade(vec3(m,.11),n,vec3(.02),vec3(.85,.87,.92),vec2(0.),0.,380.,1.):shade(vec3(m,.11),n,vec3(.06),vec3(.72,.74,.8),normalize(qc+1e-6),.07,0.,1.);",
    "        col=mix(col,c,cov(d,px)); col=screw(qc,.022,2.2,col,px,.115,1.); } }",
    "    vec2 pk=BR+vec2(-.31,-.07), tk=BR+.238*vec2(cos(3.75),sin(3.75)); vec2 qk=r2(m+uTilt*.105-pk,-uClick*.12)+pk; float dk=smin(sdCap(qk,pk,tk,.0075),length(qk-pk)-.016,.02);",
    "    if(dk<px){ vec2 g=normalize(vec2(smin(sdCap(qk+e,pk,tk,.0075),length(qk+e-pk)-.016,.02)-dk, smin(sdCap(qk+e.yx,pk,tk,.0075),length(qk+e.yx-pk)-.016,.02)-dk));",
    "      vec3 c=shade(vec3(m,.105),dk>-.005?bevN(g,1.+dk/.005):vec3(0,0,1),vec3(.02),vec3(.85,.87,.92),vec2(0.),0.,200.,1.); col=mix(col,c,cov(dk,px)); col=screw(m+uTilt*.105-pk,.009,.9,col,px,.11,1.); } }",
    // ---- the tourbillon ----
    "  { vec2 w=m+uTilt*.1-KC; if(dot(w,w)<.135){",
    "    vec2 cw=r2(w,-uCage); float sh=shadowAt(m,.1,0.);",
    // escape wheel: polished steel, 20 club teeth, four crossings; a ruby at its pivot
    "    vec2 qe=r2(cw-vec2(DE,0.),-uEsc); float re=length(qe); if(re<.08){ float d=sdEsc(qe);",
    "      if(d<px){ float bt=clamp(-d/.0035,0.,1.); vec3 n=vec3(0,0,1); if(bt<1.){ vec2 g=normalize(vec2(sdEsc(qe+e)-d, sdEsc(qe+e.yx)-d)); n=bevN(r2(g,uEsc+uCage),1.-bt); }",
    "        vec3 c=bt<1.?shade(vec3(m,.1),n,vec3(.03),vec3(.86,.88,.92),vec2(0.),0.,300.,sh):shade(vec3(m,.1),n,vec3(.07,.072,.078),vec3(.78,.8,.86),normalize(vec2(-qe.y,qe.x)+1e-6),.08,0.,sh); col=mix(col,c,cov(d,px)); }",
    "      col=ruby(qe,.008,col,px,.104); }",
    // pallet fork: steel lever, two ruby pallet stones, the horns at the balance roller
    "    vec2 qf=r2(cw-vec2(.12,0.),-uFork); if(dot(qf,qf)<.016){ float st; float d=sdFork(qf,st);",
    "      if(d<px){ float bt=clamp(-d/.003,0.,1.); vec3 n=vec3(0,0,1); if(bt<1.){ float st2; vec2 g=normalize(vec2(sdFork(qf+e,st2)-d, sdFork(qf+e.yx,st2)-d)); n=bevN(r2(g,uFork+uCage),1.-bt); }",
    "        col=mix(col,shade(vec3(m,.105),n,vec3(.03),vec3(.86,.88,.92),vec2(0.),0.,bt<1.?300.:80.,sh),cov(d,px)); }",
    "      if(st<px){ vec3 c=vec3(.5,.02,.06)+vec3(1.,.15,.2)*.6*smoothstep(.0,-.003,st); c+=vec3(1.,.8,.8)*pow(max(dot(normalize(uL.xy-m),vec2(1,0)),0.),8.)*.5; col=mix(col,c,cov(st,px)); }",
    "      col=ruby(qf,.006,col,px,.108); }",
    // balance: gilt rim drawn once, arms and timing screws motion-blurred over the frame time; the hairspring breathes with it
    "    float rb=length(cw); if(rb<.16){",
    "      float dr=abs(rb-.139)-.008; vec3 gilt=vec3(1.,.74,.42);",
    "      float a=atan(cw.y,cw.x), ba=uBal.x, L=uBal.y;",                                       // angle now, sweep during the shutter
    "      if(dr<px){ float t=clamp((rb-.139)/.008,-1.,1.); vec3 n=normalize(vec3(normalize(cw)*t*.5,1.));",
    "        vec3 c=shade(vec3(m,.12),n,vec3(.14,.1,.045),gilt*1.1,normalize(vec2(-cw.y,cw.x)),abs(t)<.75?.06:0.,180.,sh); col=mix(col,c,cov(dr,px)); }",
    "      float P3=2.0944, P12=.5236;",
    "      if(rb>.016&&rb<.137){ float ca=sweep((a-ba-1.5708)/P3,L/P3,.0043/rb/P3,px/rb/P3)*smoothstep(.016,.019,rb);",           // three arms
    "        if(ca>0.) col=mix(col,shade(vec3(m,.12),vec3(0,0,1),vec3(.14,.1,.045),gilt*1.1,normalize(cw),.08,0.,sh),ca); }",
    "      float dsr=abs(rb-.1515); if(dsr<.0066){ float w=sqrt(max(.0062*.0062-dsr*dsr,0.))/rb; float cs=sweep((a-ba)/P12,L/P12,w/P12,px/rb/P12);",   // twelve timing screws
    "        vec3 n=normalize(vec3(normalize(cw)*(rb-.1515)/.0062*.7,1.)); if(cs>0.) col=mix(col,shade(vec3(m,.122),n,vec3(.16,.11,.05),gilt*1.1,normalize(vec2(-cw.y,cw.x)),.12,0.,sh)+gilt*pow(max(dot(n,normalize(uL-vec3(m,.12))),0.),24.)*.25,cs); }",
    "      if(rb>.028&&rb<.115){ float wr=1.-(rb-.03)/.082; float v=(rb-.03)/.0063-(a-ba*wr*.9)/(2.*PI);",                 // the hairspring breathes: inner coils turn with the balance
    "        float hv=sweep(v+.5,L*wr*.9/(2.*PI),.00065/.0063,px/.0063); if(hv>0.){ float tq=clamp((fract(v+.5)-.5)/.103,-1.,1.);",
    "          col=mix(col,shade(vec3(m,.125),normalize(vec3(normalize(cw)*tq*.8,1.)),vec3(.01,.02,.08),vec3(.3,.48,1.),vec2(0.),0.,90.,sh),hv); } }",
    "      vec2 stud=r2(vec2(.117,0.),3.5); float ds=sdBox(r2(cw-stud,-3.5),vec2(.007,.004),.001); col=mix(col,shade(vec3(m,.125),vec3(0,0,1),vec3(.03),vec3(.8,.82,.86),vec2(0.),0.,90.,sh),cov(ds,px)); }",
    // the cage frame: black-polished steel (black until it faces the lamp, then white), bevelled; blued screws; a ruby cap jewel
    "    vec2 cf=r2(m+uTilt*.14-KC,-uCage); float d=sdCageFrame(cf); if(d<px){ float bt=clamp(-d/.0042,0.,1.); vec3 n=vec3(0,0,1);",
    "      if(bt<1.){ vec2 g=normalize(vec2(sdCageFrame(cf+e)-d, sdCageFrame(cf+e.yx)-d)); n=bevN(r2(g,uCage),1.-bt); }",
    "      vec3 c=shade(vec3(m,.14),n,vec3(.006),vec3(.95,.96,1.),vec2(0.),0.,bt<1.?500.:46.,1.); col=mix(col,c,cov(d,px)); }",
    "    for(int i=0;i<3;i++){ float a=1.0472+float(i)*2.0944; col=screw(cf-vec2(cos(a),sin(a))*.287,.0092,a,col,px,.145,1.); }",
    "    col=ruby(cf,.015,col,px,.15);",
    "  } }",
    // the sapphire: an anti-reflection violet sheen sliding with the viewer, a soft lamp reflection, the edge of the loupe
    "  float k=dot(p,normalize(vec2(1.,.62)))+uTilt.x*.6-uTilt.y*.3; col+=vec3(.42,.36,.85)*exp(-pow((k-.42)/.11,2.))*.03+vec3(.5,.45,.95)*exp(-pow((k-.62)/.05,2.))*.012;",
    "  vec2 lp=(uPort>.5?vec2(uL.y,-uL.x):uL.xy)/uScale; col+=vec3(1.,.92,.8)*exp(-dot(p-lp,p-lp)*30.)*.018;",
    "  col*=1.-.42*smoothstep(.45,1.05,length(p*vec2(uRes.y/uRes.x*1.2,1.))); col*=1.-.4*smoothstep(.05,.42,p.y);",   // calmer at the top, where the title sits
    "  o=vec4(col,1.); }"].join("\n"); };

  K.mod("tourbillon", function (gl, s, K) {
    var T = tier();
    var pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    var seen = K.ptr.tap, pend = null, held = false, lastMove = -99, px0 = K.ptr.x, py0 = K.ptr.y;
    var L = [.1, .1, .6], tilt = [0, 0], lastView = null;
    var rat = 0, clicks = [], boost = 0, lastT = 0, rep = null, wOff = 0;
    var G = new Float32Array(24), GS = new Float32Array(24);
    GEAR.forEach(function (g, i) { GS.set([g.n, g.k, g.s, g.z], i * 4); });
    function wall() { return (Date.now() % 600000) / 1000; }          // 10 min wraps on whole beats and whole balance swings
    function ease(f) { return 1 - Math.exp(-f * 45) * Math.cos(f * 40); }   // a beat: a quick jump with a little recoil
    function fx(type, extra) { var d = { type: type, from: "scene" }; for (var k in extra) d[k] = extra[k]; try { dispatchEvent(new CustomEvent("titan:fx", { detail: d })); } catch (e) { /* ignore */ } }
    function wind(t) { var n = 5, at = []; for (var i = 0; i < n; i++) { var tc = t + .05 + i * .11; clicks.push(tc); at.push(+(tc - t).toFixed(3)); }
      boost = Math.min(1, boost + .22); fx("wind", { at: at }); }
    /* the minute repeater: hours on the low gong, quarters as ding-dong pairs, minutes on the high gong */
    function repeater(t) { var d = new Date(), h = d.getHours() % 12 || 12, mi = d.getMinutes(), q = Math.floor(mi / 15), mm = mi % 15, seq = [], x = .5;
      for (var i = 0; i < h; i++) { seq.push([x, 0]); x += .5; } x += .45;
      for (i = 0; i < q; i++) { seq.push([x, 1]); seq.push([x + .2, 0]); x += .62; } if (q) x += .4;
      for (i = 0; i < mm; i++) { seq.push([x, 1]); x += .34; }
      rep = { t: t, seq: seq, end: t + x + 2.5 }; fx("repeater", { seq: seq.map(function (s) { return [+s[0].toFixed(3), s[1]]; }) }); }
    function onCoin() { /* a coin opened: a single soft strike on the high gong */ if (!rep) rep = { t: lastT, seq: [[.12, 1]], end: lastT + 2.6, quiet: 1 }; }
    addEventListener("titan:coin", onCoin);
    function lift(t, ts) { return Math.min(1, Math.max(0, (t - (ts - .2)) / .17)) * (t < ts ? 1 : Math.max(0, 1 - (t - ts) / .025)); }
    return { name: "tourbillon",
      step: function (c) { var P = c.ptr, t = c.t, v = c.view || {}; lastView = v; lastT = t;
        // Tempo (room only): an offset on the wall clock, so at 1 the movement still turns on the real seconds with its ticking sound
        if (v.mode === "backdrop") wOff = 0; else wOff += (c.dt || .016) * (look("speed", 1) - 1);
        if (P.tap !== seen) { seen = P.tap; pend = { t: P.tap, x: P.tx, y: P.ty }; held = false; }
        if (pend) { var moved = Math.hypot(P.x - pend.x, P.y - pend.y) > .02;
          if (moved) pend = null;
          else if (P.down && !held && t - pend.t > .6) { held = true; if (!rep || t > rep.end) repeater(t); pend = null; }
          else if (!P.down) { if (!held) wind(t); pend = null; } }
        if (Math.abs(P.x - px0) + Math.abs(P.y - py0) > .002 || P.down) { lastMove = t; px0 = P.x; py0 = P.y; }
        var A = c.w / c.h, port = A < 1, sc = 2 / Math.max(A, 1);
        function toM(ux, uy) { var x = (ux - .5) * A, y = uy - .5; return port ? [-y * sc, x * sc] : [x * sc, y * sc]; }
        var tgt, live = t - lastMove < 6;
        if (live) { var pm = toM(P.x, P.y); tgt = [pm[0], pm[1], .55]; }
        else tgt = [.2 + .6 * Math.cos(t * .09), -.16 + .24 * Math.sin(t * .13), .6];   // idle: the lamp drifts over the lower half, away from the title
        var k = live ? .16 : .02; for (var i = 0; i < 3; i++) L[i] += (tgt[i] - L[i]) * k;
        var room = v.mode === "room";
        var tp = toM(P.x, P.y), tx = room ? 0 : (live ? -tp[0] * .05 : .02 * Math.sin(t * .07)), ty = room ? 0 : (live ? -tp[1] * .05 : .015 * Math.cos(t * .05));
        tilt[0] += (tx - tilt[0]) * .06; tilt[1] += (ty - tilt[1]) * .06;
        boost *= Math.exp(-c.dt / 22);
        clicks = clicks.filter(function (tc) { if (t - tc > .3) { rat -= TAU / 60; return false; } return true; });
        if (rep && t > rep.end) rep = null; },
      draw: function (c) {
        var v = c.view || {}; lastView = v;
        var A = c.w / c.h, port = A < 1, sc = 2 / Math.max(A, 1), t = c.t, w = wall() + wOff;
        var z0 = port ? PI : PI / 2;                                   // the seconds ring's 60 points up the screen
        var beats = Math.floor(w * 6) + ease(w * 6 % 1);
        var cage = z0 - PI - TAU * beats / 360;                        // the arrow (cage-local angle 180 deg) reads the real seconds
        var esc = mesh(0, 72, 8, cage) - cage;                         // relative to the cage: 9 x the cage angle
        var n6 = Math.floor(w * 6), f6 = w * 6 % 1, side = n6 % 2 ? -1 : 1, fsw = Math.min(1, f6 / .1);
        var fork = .11 * side * (fsw * fsw * (3 - 2 * fsw) * 2 - 1);
        var amp = (4.36 + .9 * boost) * look("amplitude", 1);          // 250 deg, wound up to about 300 deg
        var ph = TAU * 3 * w, bal = amp * Math.sin(ph), sweepA = amp * TAU * 3 * Math.cos(ph) * SHUTTER;   // the swing during the shutter
        var third = -cage * 10 / 80, centre = mesh(third, 10, 80, ang(TW, W2)), barrel = mesh(centre, 12, 96, ang(W2, BR));
        var ratA = rat, clk = 0; clicks.forEach(function (tc) { var u = Math.min(1, Math.max(0, (t - tc) / .07)); ratA -= TAU / 60 * u * u * (3 - 2 * u); if (t > tc - .05 && t < tc + .1) clk = Math.max(clk, Math.sin(Math.min(1, (t - tc + .05) / .12) * PI)); });
        var crown = mesh(ratA, 60, 24, ang(BR, CR));
        var A0 = [third, barrel, 0, centre, third, centre];
        GEAR.forEach(function (g, i) { G.set([g.c[0], g.c[1], g.R, A0[i]], i * 4); });
        var hm = [0, 0], gg = [0, 0];
        if (rep) rep.seq.forEach(function (s2) { var ts = rep.t + s2[0], g = s2[1]; hm[g] = Math.max(hm[g], lift(t, ts)); if (t >= ts) gg[g] = Math.max(gg[g], Math.exp(-(t - ts) * 2.2) * (rep.quiet ? .5 : 1)); });
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, t); gl.uniform1f(u.uScale, sc); gl.uniform1f(u.uPort, port ? 1 : 0); gl.uniform1f(u.uZ0, z0);
        gl.uniform4fv(u.uG, G); gl.uniform4fv(u.uGs, GS); gl.uniform3f(u.uL, L[0], L[1], L[2]); gl.uniform2f(u.uTilt, tilt[0], tilt[1]);
        gl.uniform1f(u.uCage, cage); gl.uniform1f(u.uEsc, esc); gl.uniform1f(u.uFork, fork); gl.uniform1f(u.uRat, ratA); gl.uniform1f(u.uCrown, crown); gl.uniform1f(u.uClick, clk);
        gl.uniform2f(u.uBal, bal, sweepA); gl.uniform2f(u.uHam, hm[0], hm[1]); gl.uniform2f(u.uGong, gg[0], gg[1]);
        gl.uniform4f(u.uView, v.yaw || 0, (v.pitch || 0) + (v.up || 0), v.move || 0, 0);
        gl.uniform3f(u.uLook, look("lamp", 1), look("finish", 1), 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () { var v = lastView || {}; return { tier: T, light: L.map(function (v) { return +v.toFixed(3); }), boost: +boost.toFixed(2), repeating: !!rep, cam: [(v.yaw || 0), (v.pitch || 0), (v.move || 0), (v.up || 0)].map(function (x) { return +x.toFixed(3); }), look: { lamp: look("lamp", 1), speed: look("speed", 1), amplitude: look("amplitude", 1), finish: look("finish", 1) } }; },
      wind: function () { wind(lastT); }, repeat: function () { repeater(lastT); },          // for tests and the intro hand-over
      dispose: function () { removeEventListener("titan:coin", onCoin); gl.deleteProgram(pr.p); } };
  });
  K.themes.tourbillon = { stack: [
    { mod: "tourbillon" },
    { mod: "post", bloom: .9, threshold: .8, knee: .45, exposure: 1, aberr: .06, grain: .025, vig: .35 }
  ],
    // a flat world: yaw and pitch pan in screen heights (a phone is only ~.46 wide); up adds to pitch
    room: { name: "Inside the caliber", yaw: [-.18, .18], pitch: [-.2, .2], move: [-.4, .9], up: [-.1, .1], unit: "screen", sound: "movement",
      look: [{ id: "lamp", label: "Lamp light", min: 0, max: 2.5, def: 1 }, { id: "speed", label: "Tempo", min: .2, max: 3, def: 1 },
        { id: "amplitude", label: "Amplitude", min: .5, max: 2, def: 1 }, { id: "finish", label: "Polish", min: 0, max: 2.5, def: 1 }],
      touch: "Tap to wind the movement; press and hold to sound the minute repeater.",
      opening: { dur: 5.0, from: { yaw: .12, pitch: -.12, move: -.4, up: .05 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.5, at: [.5, .5] } } };
})();
