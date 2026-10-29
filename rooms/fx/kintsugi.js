/* fx/kintsugi.js: Kintsugi (kintsugi), theme #39, on the TitanFXK kit (Grok, 2026-10-20).
   The art of mending broken pottery with gold, as a living surface. Close up on a black raku-glazed vessel under a soft window
   light: crackle glaze, pooled glaze drips, pinholes, a slow sheen. Fracture lines (Voronoi seams, three scales) run across it and
   are filled with gold that is still settling: the gold flows along each seam from where it was poured, catches the light as a
   polished, slightly raised bead (anisotropic highlight along the seam, warm fresnel), and dusts the edges with gold powder.
   No particle layer: the surface reads cleaner without floating dust. Signature move: tap to crack the glaze where you touch (a star of new fractures radiates out), then watch gold run into the
   new seams and seal them over a few seconds. Up to 6 repairs live at once; the oldest fades into the mended surface.
   Quality tiers (Low/Medium/High/Max, user-chosen, never automatic): seam scales 2/3/3/4, glaze detail octaves 3/4/5/6. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var FS = function (sc, oct) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "uniform vec2 uRes, uPtr; uniform float uT, uGold, uGlow, uSpeed; uniform vec3 uView; uniform vec4 uC[6];",   // repairs: xy (aspect space), start time, seed
    "#define SC " + sc, "#define OCT " + oct,
    "float gf(vec2 p){ float s=0., a=.5; for(int i=0;i<OCT;i++){ s+=a*vn(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }",
    // Voronoi seam distance (F2-F1 style edge distance) with the id of the nearest cell
    "vec3 vor(vec2 x){ vec2 n=floor(x), f=fract(x); vec2 mg, mr; float md=8.;",
    "  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(i,j); vec2 o2=h22(n+g); vec2 r=g+o2-f; float d=dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }",
    "  md=8.; for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g=mg+vec2(i,j); vec2 o2=h22(n+g); vec2 r=g+o2-f; if(dot(mr-r,mr-r)>1e-5) md=min(md, dot(.5*(mr+r), normalize(r-mr))); }",
    "  return vec3(md, h21(n+mg), 0.); }",
    "void main(){ vec2 uv=gl_FragCoord.xy/uRes; float A=uRes.x/uRes.y; vec2 p=(uv-.5)*vec2(A,1.);",
    "  p += uView.xy; p *= (1. - uView.z);",
    "  vec2 lp=(uPtr-.5)*vec2(A,1.);",
    // glaze: black raku with crackle, drips, pinholes, a soft curved sheen as if the surface bulges toward us
    "  float g1=gf(p*3.+3.), g2=gf(p*vec2(2.,9.)+vec2(0.,uT*.002*uSpeed));",
    "  vec3 glaze=vec3(.018,.017,.02)+vec3(.02,.016,.012)*g1+vec3(.01,.012,.016)*smoothstep(.55,.8,g2);",
    "  float crq=vor(p*28.).x; glaze*=.85+.15*smoothstep(0.,.03,crq);",
    "  float pin=step(.9985,h21(floor(p*220.)))*.4; glaze*=1.-pin;",
    "  vec3 N=normalize(vec3((g1-.5)*.25+p.x*.25,(g2-.5)*.15+p.y*.25,1.));",
    "  vec3 L=normalize(vec3(-.5+lp.x*.4,.7+lp.y*.3,.6)); vec3 V=vec3(0.,0.,1.); vec3 Hh=normalize(L+V);",
    "  float spec=pow(max(dot(N,Hh),0.),60.)*.55+pow(max(dot(N,Hh),0.),8.)*.05;",
    "  vec3 col=glaze+vec3(.85,.88,.95)*spec*uGlow;",
    "  col+=vec3(.9,.8,.7)*.05*smoothstep(1.2,0.,length(p-vec2(-.6*A,.6)));",                // window light falloff
    // gold seams: three scales of fractures; each seam's gold has flowed in from a pour point at its own pace
    "  float gold=0., gd=9., gid=0.;",
    "  for(int k=0;k<SC;k++){ float fk=float(k); float s=1.1+fk*1.5; vec2 q=p*s+vec2(fk*7.3,fk*3.1); q+=.12*vec2(gf(q*.7),gf(q*.7+5.));",
    "    vec3 v=vor(q); float w=(.022-.004*fk)*(.6+.8*vn(q*3.)); float keep=smoothstep(.45,.53,gf(q*.3+fk*4.))*(1.-.3*fk);",
    "    float flow=smoothstep(0.,1., fract(uT*.012*uSpeed+v.y)*3.-length(fract(q*.25)-.5)*2.)+(1.-keep);",
    "    float d=v.x/s; float on=smoothstep(w/s, w/s*.4, d)*keep*min(1.,flow+.6);",
    "    if(on>gold){ gold=on; gd=d*s/w; gid=v.y; } }",
    // repairs: a star of fresh cracks around each tap, filling with gold as time passes
    "  for(int i=0;i<6;i++){ vec4 c=uC[i]; if(c.z<0.) continue; float age=uT-c.z; vec2 d=p-c.xy; float r=length(d), a=atan(d.y,d.x);",
    "    float arms=6.+floor(c.w*4.); float ang=abs(fract(a/6.2832*arms+c.w+gf(vec2(r*12.,c.w*9.))*.25)-.5)*6.2832/arms*r;",
    "    float reach=min(age*.35, .18+.14*c.w)*(1.-smoothstep(25.,40.,age)); float crack=smoothstep(.006,.0015,ang)*step(r,reach)*step(.003,r);",
    "    float filled=smoothstep(0.,1.,(age-.6)*.6 - r*4.);",
    "    col=mix(col, vec3(.004), crack*(1.-filled));",                            // the raw crack before the gold arrives
    "    float gg=crack*filled; if(gg>gold){ gold=gg; gd=ang/.006; gid=c.w; }",
    "    col+=vec3(1.,.75,.35)*exp(-r*30.)*exp(-age*2.)*.6; }",                   // the tap's glint
    // gold shading: raised bead normal across the seam, anisotropic highlight, warm fresnel, powder at the edges
    "  vec3 au=vec3(1.,.72,.3); float bead=sqrt(max(0.,1.-min(gd*gd,1.))); vec3 Ng=normalize(vec3(N.xy*.5+vec2(gd*.6,gd*.3)*(1.-bead),bead+.2));",
    "  float gs=pow(max(dot(Ng,Hh),0.),40.); float ga=pow(max(dot(Ng,Hh),0.),6.);",
    "  vec3 gc=au*(.18+.5*ga)+vec3(1.,.93,.75)*gs*3.+au*.3*pow(1.-Ng.z,2.);",
    "  gc*=.85+.3*vn(p*400.+gid*10.);",
    "  col=mix(col, gc, gold * uGold);",
    "  float dust=smoothstep(.0,.6,gold)*0.+step(.997,h21(floor(p*500.)))*smoothstep(3.,1.,gd)*(1.-gold); col+=au*dust*.6;",
    "  o=vec4(col,1.); }"].join("\n"); };
  K.mod("kintsugi", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FS({ low: 2, medium: 3, high: 3, max: 4 }[T], { low: 3, medium: 4, high: 5, max: 6 }[T])); if (!pr) return null;
    var C = new Float32Array(24), n = 0, seen = K.ptr.tap; for (var i = 0; i < 6; i++) C[i * 4 + 2] = -1;
    var lastView = {};   // the view the world last drew (for debug)
    return { name: "kintsugi",
      step: function (c) { var v = c.view || {}; var P = c.ptr; if (P.tap !== seen) { seen = P.tap; var k = (n++) % 6; C.set([(P.tx - .5) * c.w / c.h, P.ty - .5, c.t, Math.random()], k * 4); } },
      draw: function (c) {
        var v = c.view || {}; lastView = v;
        gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u; gl.uniform2f(u.uRes, c.w, c.h); gl.uniform2f(u.uPtr, c.ptr.x, c.ptr.y);
        gl.uniform1f(u.uT, c.t); gl.uniform3f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0);
        gl.uniform1f(u.uGold, look("gold", 1)); gl.uniform1f(u.uGlow, look("glow", 1)); gl.uniform1f(u.uSpeed, look("speed", 1));
        gl.uniform4fv(u.uC, C); gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () { return { tier: T, repairs: Math.min(n, 6),
        cam: [lastView.yaw || 0, lastView.pitch || 0, lastView.move || 0].map(function (x) { return +x.toFixed(3); }),
        look: { gold: look("gold", 1), glow: look("glow", 1), speed: look("speed", 1) } }; },
      dispose: function () { gl.deleteProgram(pr.p); } };
  });
  K.themes.kintsugi = { stack: [
    { mod: "kintsugi" },
    { mod: "post", bloom: .75, threshold: .85, knee: .4, exposure: 1.1, aberr: .1, grain: .03, vig: .55 }
  ],
    room: { name: "The raku vessel", yaw: [-.3, .3], pitch: [-.3, .3], move: [-.2, .3], up: [0, 0], unit: "screen", sound: "storm",
      look: [{ id: "gold", label: "Gold", min: 0.2, max: 2, def: 1 }, { id: "glow", label: "Glow", min: 0.2, max: 2, def: 1 }, { id: "speed", label: "Flow Speed", min: 0, max: 3, def: 1 }],
      touch: "Tap the vessel: a star of new fractures radiates out, then gold runs in to seal them.",
      opening: { dur: 5, from: { yaw: .15, pitch: -.12, move: -.15, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.5, at: [.5, .5] } } };
})();
