/* fx/rift.js: Rift Garage (rift), theme #36, on the TitanFXK kit (Grok, 2026-10-20). Original "portal garage lab" world: no borrowed
   names, characters or marks. A suburban garage workshop at 2 a.m.: corrugated back wall, pegboard of tool silhouettes, a cluttered
   workbench, a hanging bulb, and in the middle of it all a swirling green rift torn in the air: a domain-warped spiral of plasma with
   a white-hot core, a crackling rim of arcs, and its light spilling across the wall, bench and concrete floor (with a wet sheen).
   One HDR fragment shader + kit GPU sparks + fx/post.js (bloom, aberration, ACES).
   Signature move: tap anywhere to pop a small pocket rift under your finger that flares and collapses; press and hold to charge the
   main rift: it widens, spins faster and pulls sparks in, and on release it pulses a shockwave of light across the room.
   Quality tiers (owner: Low / Medium / High / Max, user-chosen, never lowered automatically): warp octaves and arc count. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  K.riftTier = tier;
  var FS = function (oct, arcs) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "uniform vec2 uRes, uPtr; uniform float uT, uCharge, uPulse, uPop, uViewYaw, uViewPitch, uViewMove, uViewUp, uGlow, uHaze, uSpinScale, uWarmth; uniform vec3 uPopP;",
    "#define OCT " + oct, "#define ARCS " + arcs,
    "float wfbm(vec2 p){ float s=0., a=.5; for(int i=0;i<OCT;i++){ s+=a*vn(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }",
    "float box(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }",
    // the rift: polar domain-warped spiral; returns emission rgb, and alpha-ish mask in .w
    "vec4 rift(vec2 p, vec2 c, float R, float spin){",
    "  vec2 q=p-c; q.x*=.82; float r=length(q), a=atan(q.y,q.x);",
    "  float edgeN=wfbm(vec2(a*2.,uT*.6))*.18; float rr=r/(R*(1.+edgeN));",
    "  float sw=a+spin*uT*uSpinScale+3.2/(rr+.25);",
    "  vec2 w=vec2(cos(sw),sin(sw))*rr*3.; float f=wfbm(w+wfbm(w*1.7+uT*.4)*1.6);",
    "  float inside=smoothstep(1.02,.94,rr);",
    "  vec3 g1=vec3(.15,1.,.35)*uWarmth, g2=vec3(.55,1.,.15), core=vec3(.85,1.,.8);",
    "  vec3 col=mix(g1,g2,f)*(.35+1.1*f*f)*inside;",
    "  col+=core*exp(-rr*rr*9.)*1.4*inside;",
    "  float rim=exp(-pow((rr-1.)*16.,2.)); col+=vec3(.4,1.,.5)*rim*1.6;",
    "  float arcs=0.; for(int i=0;i<ARCS;i++){ float fi=float(i); float aa=fi*2.399+floor(uT*7.+fi)*1.7; float d=abs(sin(a-aa+(wfbm(vec2(r*14.,uT*9.+fi*3.))-.5)*.9))*r;",
    "    float L=(1.03+.22*h21(vec2(fi,floor(uT*7.+fi))))*R; float on=step(rr,L/R)*step(1.,rr); arcs+=exp(-d*uRes.y*.5)*on*(1.-(rr-1.)*4.)*step(.45,h21(vec2(fi,floor(uT*11.)))); }",
    "  col+=vec3(.6,1.,.7)*arcs*1.6;",
    "  return vec4(col, inside); }",
    "void main(){ vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y; vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    "  p += vec2(uViewYaw, uViewPitch); p *= (1.0 - uViewMove * 0.25); p.y -= uViewUp * 0.25;",
    "  vec2 par=(uPtr-.5)*vec2(.05,.03); vec2 pw=p+par*.4;",          // parallax: back wall moves less than the bench
    "  float R=.2*(1.+uCharge*.55+uPulse*.15)*min(1.,asp*1.2+.3); vec2 C=vec2(0.,.06)+par*.6;",
    "  float floorY=-.25;",
    // back wall: corrugated metal + pegboard + tool silhouettes
    "  float corr=.5+.5*sin(pw.x*90.); vec3 wall=vec3(.035,.04,.045)*(.75+.35*corr)+vec3(.02)*wfbm(pw*vec2(3.,30.));",
    "  vec2 pb=pw-vec2(-.55*asp*.5-.1,.18); float board=step(box(pb,vec2(.32,.17)),0.); vec2 hole=fract(pb*44.)-.5; wall=mix(wall,vec3(.06,.05,.04)*(1.-.6*step(length(hole),.18)),board);",
    "  float tools=0.; for(int i=0;i<6;i++){ float fi=float(i); vec2 tp=pb-vec2(-.26+fi*.105,.02); float hh=.07+.05*h21(vec2(fi,3.)); tools=max(tools,step(box(tp-vec2(0.,-hh*.4),vec2(.008,hh)),0.)); tools=max(tools,step(length(tp-vec2(0.,hh*.55)),.025+.012*h21(vec2(fi,9.)))); }",
    "  wall=mix(wall,vec3(.012),tools*board);",
    "  vec2 sh=pw-vec2(.5*asp*.5+.12,.1); float shelf=step(box(sh,vec2(.3,.006)),0.)+step(box(sh-vec2(0.,.17),vec2(.3,.006)),0.); float jars=0.; for(int i=0;i<7;i++){ float fi=float(i); vec2 jp=sh-vec2(-.25+fi*.085,.035+.17*step(3.5,fi)); jars=max(jars,step(box(jp,vec2(.018+.01*h21(vec2(fi,1.)),.03+.015*h21(vec2(fi,2.)))),0.)); }",
    "  wall=mix(wall,vec3(.01),clamp(shelf+jars,0.,1.));",
    "  vec3 col=wall;",
    // floor: concrete with a wet sheen that reflects the rift
    "  if(p.y<floorY){ float d=floorY-p.y; vec3 fl=vec3(.03,.032,.03)*(.7+.6*wfbm(vec2(p.x/(d+.05),1./(d+.05))*1.5)); col=fl;",
    "    vec4 rf=rift(vec2(p.x,2.*floorY-p.y+.01*sin(p.x*80.+uT)), C, R, 1.4+uCharge*3.); col+=rf.rgb*.22*uHaze*smoothstep(.0,.35,d)*(1.-smoothstep(.3,.7,d))*(.6+.4*vn(p*vec2(30.,90.))); }",
    // light from the rift + a warm hanging bulb
    "  float dl=length((p-C)*vec2(.8,1.)); vec3 rl=vec3(.25,1.,.4)*uGlow*(.05+.22*uCharge+.25*uPulse)/(1.+dl*dl*22.);",
    "  vec2 bp=vec2(-.25*asp,.42)+par*.3; float db=length(p-bp); vec3 bulb=vec3(1.,.72,.4)*(.04/(1.+db*db*30.)+exp(-db*90.)*2.);",
    "  col=col*(1.+rl*7.)+rl*.15+bulb+col*vec3(1.,.8,.6)*.6/(1.+db*db*12.);",
    "  col+=vec3(1.,.8,.5)*step(abs(p.x-bp.x),.0012)*step(bp.y,p.y)*.15;",               // the bulb's cord
    // the rift itself (with a heat-shimmer refraction of the wall behind it)
    "  vec4 rf=rift(p, C, R, 1.4+uCharge*3.); col=mix(col,vec3(0.),rf.w*.7)+rf.rgb*.6;",
    // pocket rift from a tap
    "  if(uPop>0.){ vec4 pr=rift(p, uPopP.xy, .07*uPop, 4.); col=mix(col,vec3(0.),pr.w*.5)+pr.rgb*uPop; }",
    // shockwave on release
    "  float ring=exp(-pow((dl-(1.-uPulse)*1.4)*14.,2.))*uPulse; col+=vec3(.4,1.,.5)*ring*1.5;",
    // foreground workbench silhouette catching rim light
    "  float bench=-.36+.008*sin(p.x*3.); float bm=step(p.y,bench); vec3 bc=vec3(.008,.009,.01)+vec3(.25,1.,.4)*exp(-max(bench-p.y,0.)*60.)*.25*(1.+uCharge);",
    "  float clut=0.; for(int i=0;i<5;i++){ float fi=float(i); float x0=(-.6+fi*.33)*asp*.55; clut=max(clut,step(box(p-vec2(x0,bench+.03+.025*h21(vec2(fi,5.))),vec2(.03+.04*h21(vec2(fi,7.)),.03+.03*h21(vec2(fi,8.)))),0.)); }",
    "  vec3 cc=vec3(.012,.014,.013)+vec3(.25,1.,.4)*.05*(1.+uCharge)*smoothstep(.6,0.,abs(p.x-C.x));",
    "  col=mix(col,cc,clut*step(p.y,bench+.12)*(1.-bm)); col=mix(col,bc,bm);",
    "  o=vec4(col,1.); }"].join("\n"); };
  K.mod("rift", function (gl, s, K) {
    var T = tier(), oct = { low: 3, medium: 4, high: 5, max: 6 }[T], arcs = { low: 3, medium: 5, high: 7, max: 11 }[T];
    var pr = K.compile(K.FSQ, FS(oct, arcs)); if (!pr) return null;
    var charge = 0, pulse = 0, pop = 0, popP = [0, 0], held = 0, wasDown = 0, lastTap = -9;
    return {
      name: "rift",
      step: function (c) {
        var v = c.view || {};
        var dt = c.still ? 0 : Math.min(c.dt, .05), P = c.ptr;
        if (P.down) held += dt; else { if (wasDown && held > .35) pulse = 1; held = 0; }
        wasDown = P.down;
        var tgt = held > .35 ? Math.min(1, (held - .35) / 1.6) : 0; charge += (tgt - charge) * Math.min(1, dt * (tgt > charge ? 2.5 : 4));
        pulse = Math.max(0, pulse - dt * .9);
        if (P.tap !== lastTap) { lastTap = P.tap; pop = 1; popP = [(P.tx - .5) * c.w / c.h, P.ty - .5]; }
        pop = Math.max(0, pop - dt * 1.1);
      },
      draw: function (c) {
        var v = c.view || {};
        gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform2f(u.uPtr, v.mode === "room" ? 0.5 : c.ptr.x, v.mode === "room" ? 0.5 : c.ptr.y); gl.uniform1f(u.uT, c.t);
        gl.uniform1f(u.uCharge, charge); gl.uniform1f(u.uPulse, pulse); gl.uniform1f(u.uPop, Math.sin(Math.min(1, pop) * Math.PI) * (pop > 0 ? 1 : 0));
        gl.uniform3f(u.uPopP, popP[0], popP[1], 0);
        gl.uniform1f(u.uViewYaw, v.yaw || 0);
        gl.uniform1f(u.uViewPitch, v.pitch || 0);
        gl.uniform1f(u.uViewMove, v.move || 0);
        gl.uniform1f(u.uViewUp, v.up || 0);
        gl.uniform1f(u.uGlow, look("glow", 1));
        gl.uniform1f(u.uHaze, look("haze", 1));
        gl.uniform1f(u.uSpinScale, look("spin", 1));
        gl.uniform1f(u.uWarmth, look("warmth", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      debug: function () {
        var v = K.view || {};
        return { tier: T, charge: charge,
          cam: [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)],
          look: { glow: look("glow", 1), haze: look("haze", 1), spin: look("spin", 1), warmth: look("warmth", 1) }
        };
      },
      dispose: function () { gl.deleteProgram(pr.p); }
    };
  });
  K.themes.rift = { stack: [
    { mod: "rift" },
    { mod: "particles", count: { low: .02, medium: .035, high: .05, max: .09 }[tier()], shape: "mote", size: 1.6, gravity: -.002, curl: 1.2, scale: 1.6, speed: .03, life: .05, c1: [.3, 1, .45], c2: [.8, 1, .4], alpha: .035, blend: "add", depth: .4, glint: .3, rake: .4 },
    { mod: "post", bloom: 1.05, threshold: .75, knee: .45, exposure: 1.0, aberr: .4, grain: .035, vig: .55, trails: .15 }
  ],
    room: { name: "The garage laboratory", yaw: [-.12, .12], pitch: [-.1, .1], move: [-.4, .6], up: [-.06, .06],
      unit: "m", sound: "plasma",
      look: [
        { id: "glow", label: "Glow", min: 0.2, max: 2, def: 1 },
        { id: "haze", label: "Haze", min: 0, max: 2, def: 1 },
        { id: "spin", label: "Spin", min: 0, max: 3, def: 1 },
        { id: "warmth", label: "Warmth", min: 0.5, max: 1.5, def: 1 }
      ],
      touch: "Tap anywhere to pop a small pocket rift under your finger; press and hold to charge the main rift.",
      opening: { dur: 5.0, from: { yaw: .096, pitch: -.08, move: -.32, up: .048 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.5, at: [.5, .5] } }
  };
})();
