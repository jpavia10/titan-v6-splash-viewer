/* fx/darkroom.js: Darkroom (darkroom), theme #42, on the TitanFXK kit (Claude, 2026-10-22; Grok's plan in notes/agents/themes-37-50.md:
   "red safelight, trays, prints developing; developer-bath caustics, images fade up from paper").
   Looking down into the developer tray under a red safelight. The prints are the collection: every cycle a sheet slides into the
   developer and one of your photographed coins (its phone cut-out, made black and white, on black velvet, with an archive caption)
   comes up out of the white paper, shadows first, a little unevenly where the developer flows; a luminous GraLab-style timer counts
   it; when the bell rings the print is pulled toward the stop bath and the next sheet goes in. Open a coin in the app and its
   print is the next one in the tray.
   One full-resolution pass: the developer is a real surface (the tray rocks: the first sloshing mode along the long side, a little
   across, plus rings from taps and from the paper going in); it refracts the print and the ribbed tray bottom, focuses the
   safelight into caustics (from the surface's curvature) and reflects the safelight bulb, which wobbles with the waves. Rim, wet
   counter, the stop-bath tray at the edge, dust in the red light.
   The cycle runs on the wall clock (26 s; Date), like Tourbillon's beats, so the soundscape (audio/scape "darkroom": recorded timer
   ticks, the bell, the slosh on every rock, the paper going in) agrees with the picture without messages. Tap = agitate: a ring
   where you tapped and a stronger rock (titan:fx {type:"splash"}).
   Quality tiers (user-chosen): Low drops the caustics and the dust; Medium and up draw everything. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  /* the print cycle (seconds into a 26 s cycle on the wall clock); audio/scape/presets.js "darkroom" uses the same numbers */
  var CYC = 26, IN_END = 1.4, DEV_END = 19, OUT_AT = 23.6, ROCK = 3.2;
  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define LITE " + (lite ? 1 : 0),
    "uniform vec2 uRes; uniform float uT, uW, uRock, uPort, uScale, uDev, uIn, uOut, uAmp, uTimer, uBell; uniform vec4 uRip[5];",
    "uniform sampler2D uPrint; uniform float uPA; uniform vec2 uTilt; uniform vec4 uView; uniform float uSafe, uDust, uGlow;",
    "const vec2 TC=vec2(.02,-.04), TH=vec2(.56,.38);",                       // the developer tray: centre, half size (outer)
    "const vec2 SC=vec2(-1.2,-.02);",                                         // the stop bath, mostly off the screen
    "const vec2 TM=vec2(.765,.12);",                                          // the timer
    "#define SAFE (vec3(1.,.13,.05)*uSafe)",                                  // safelight red, multiplied by look control
    "const vec3 LP=vec3(.6,-.35,1.0);",                                       // the safelight: low on the side wall, away from the title (top of the screen either way)
    "float sdRR(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }",
    "vec2 r2(vec2 v, float a){ float c=cos(a), s=sin(a); return vec2(c*v.x-s*v.y, s*v.x+c*v.y); }",
    // the developer's surface: rocking slosh (first mode along the tray, a little across), rings from taps and the paper, a little capillary noise
    "float height(vec2 w, vec2 c){ vec2 q=w-c; float s=uAmp*sin(uRock)*cos(3.1416*(q.x/(TH.x*2.)+.5))+uAmp*.3*sin(uRock*1.6+1.)*cos(3.1416*(q.y/(TH.y*2.)+.5));",
    "  for(int i=0;i<5;i++){ vec4 R=uRip[i]; if(R.w<=0.) continue; float r=length(w-R.xy), a=R.z, f=a*.42; s+=R.w*exp(-a*1.1)*sin((r-f)*80.)*exp(-pow((r-f)*8.,2.))*.0045/(1.+r*3.); }",
    // capillary wavelets crossing at four angles: smooth (their curvature feeds the caustics; value noise would draw its grid there)
    "  float cp=sin(dot(q,vec2(41.,17.))+uW*1.7)+sin(dot(q,vec2(-23.,37.))-uW*1.3)+sin(dot(q,vec2(31.,-29.))+uW*1.1+1.7)+sin(dot(q,vec2(-13.,-47.))-uW*1.9+.4);",
    "  return s+cp*.00006; }",
    "vec3 lampAt(vec3 P){ vec3 L=LP-P; float d=length(L); return SAFE*1.5/(1.+d*d*1.6); }",
    "vec3 lampDir(vec3 P){ return normalize(LP-P); }",
    // the print: B&W on fibre paper; density comes up from white, shadows first, a little unevenly where the developer flows
    "vec3 printAt(vec2 u, float dens0){ vec4 tx=texture(uPrint,vec2(u.x,1.-u.y)); float v=dot(tx.rgb,vec3(.3,.59,.11)); float den=1.-v;",
    "  float D=uDev+(fbm3(u*3.+vec2(0.,uW*.04))-.5)*.12*(1.-uDev)+(1.-smoothstep(0.,.08,min(min(u.x,1.-u.x),min(u.y,1.-u.y))))*.04;",
    "  float shown=den*smoothstep(.06+.3*(1.-den),.92,D); float paper=.92*(.96+.04*vn(u*vec2(220.,260.)));",
    "  return vec3(paper*(1.-shown)); }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 m=(uPort>.5?vec2(-p.y,p.x):p)/uScale; float px=1./(uRes.y*uScale)*(1.-uView.z*.6);",
    "  m=m*(1.-uView.z*.6)+vec2(uView.x,uView.y+uView.w);",
    "  m+=uTilt*.02;",
    // the counter: wet dark laminate, a few drops
    "  vec3 col=vec3(.05,.012,.008)*(.7+.5*fbm3(m*3.))*1.2; { vec3 P=vec3(m,0.); col*=lampAt(P).r*.9;",
    "    vec2 g=m*28.; vec2 id=floor(g); vec2 f=fract(g)-.5-(h22(id)-.5)*.6; float dr=length(f); float has=step(.955,h21(id+3.))*smoothstep(1.6,.4,length(m-LP.xy));",
    "    vec2 nn=f/.14; col+=SAFE*has*smoothstep(.14,.1,dr)*pow(max(dot(normalize(vec3(nn*.8,1.)),normalize(lampDir(P)+vec3(0,0,1))),0.),40.)*.9; }",
    // the stop bath at the edge (no print), then the developer tray with the print
    "  for(int k=0;k<2;k++){ vec2 c=k==0?SC:TC; vec2 q=m-c; float dO=sdRR(q,TH,.07); if(dO>px*2.) continue; float dI=sdRR(q,TH-.034,.045);",
    "    vec3 P=vec3(m,.02);",
    "    if(dI>-px){ float t=clamp(dI/.034,0.,1.); vec2 gr=normalize(vec2(sdRR(q+vec2(px,0.),TH-.034,.045)-dI, sdRR(q+vec2(0.,px),TH-.034,.045)-dI));",   // the rim: a rounded lip
    "      vec3 n=normalize(vec3(gr*(t*2.-1.)*1.3,1.)); vec3 Ld=lampDir(P), H=normalize(Ld+vec3(0,0,1));",
    "      vec3 rim=vec3(.07,.02,.016)*lampAt(P).r*(.4+.6*max(dot(n,Ld),0.))+SAFE*pow(max(dot(n,H),0.),60.)*.55;",
    "      rim*=1.-.5*smoothstep(.5,1.,t)*step(dO,0.); col=mix(col,rim,clamp(.5-dO/px,0.,1.)); }",
    "    if(dI<px){",
    "      float h=height(m,c), e=.004; float hx=height(m+vec2(e,0.),c), hy=height(m+vec2(0.,e),c);",
    "      vec2 gr=vec2(hx-h,hy-h)/e; vec3 n=normalize(vec3(-gr*1.,1.));",
    "      float cau=1.;",
    "      #if !LITE", "      float lap=(hx+height(m-vec2(e,0.),c)+hy+height(m-vec2(0.,e),c)-4.*h)/(e*e); cau=clamp(1.-lap*1.6,.3,2.6);", "      #endif",
    "      vec2 b=m-gr*.022;",                                                                                  // refraction through the developer
    "      vec2 bq=b-c; float rib=smoothstep(.0,.004,abs(fract(bq.y/.045)-.5)*.045-.003);",                    // the ribbed tray bottom
    "      vec3 bot=vec3(.085,.022,.016)*(.75+.25*rib)*(.8+.3*fbm3(bq*9.));",
    "      if(k==1){ float io=(1.-uIn), oo=uOut; vec2 pc=vec2(0.,-.01)+vec2(-oo*.95,-io*.7+oo*.05); float ang=-.1+io*.25-oo*.3;",       // the sheet: slides in from the near side, out toward the stop bath
    "        vec2 sq=r2(bq-pc,-ang-uPort*1.5708); vec2 hs=vec2(.25,.25/uPA); float dp=sdRR(sq,hs,.004);",
    "        if(dp<px*1.5){ vec2 u=sq/(hs*2.)+.5; vec3 pr=printAt(u,0.); float a=clamp(.5-dp/px,0.,1.)*(1.-smoothstep(.75,1.,oo));",
    "          bot=mix(bot*(1.-.5*smoothstep(.02,0.,abs(dp+.004))),pr,a); } }",
    "      vec3 lit=lampAt(vec3(b,0.))*cau;",
    "      vec3 liq=bot*lit*(.82)+vec3(.012,.002,.001);",                                                      // the developer absorbs a little
    "      vec3 V=normalize(vec3(.05,-.25,2.4)-P), Ld=lampDir(P), R=reflect(-V,n); float rl=max(dot(R,Ld),0.); float sp=pow(rl,700.)*1.6+pow(rl,90.)*.28+pow(rl,12.)*.04;",   // the safelight's reflection (seen from the eye above the bench), wobbling
    "      liq+=SAFE*sp*(k==0?.7:1.)+SAFE*.02*(1.-n.z)*30.;",
    "      col=mix(col,liq,clamp(.5-dI/px,0.,1.)); } }",
    // the timer: black face, bevelled bezel, luminous marks and sweep hand (the one green thing in the room: it glows)
    "  { vec2 q=m-TM; float r=length(q); if(r<.13){ float a=atan(q.x,q.y); vec3 P=vec3(m,.04);",
    "      float bez=abs(r-.112)-.01; vec3 Ld=lampDir(P); vec3 n=normalize(vec3(normalize(q)*clamp((r-.112)/.01,-1.,1.),1.));",
    "      vec3 c=vec3(.012,.004,.004)+SAFE*pow(max(dot(reflect(vec3(0,0,-1),n),Ld),0.),30.)*.7;",
    "      vec3 face=vec3(.008,.004,.004); float tk=abs(fract(a/6.2832*12.+.5)-.5)*6.2832/12.*r; float tick=smoothstep(.0035,.002,tk)*smoothstep(.07,.075,r)*smoothstep(.095,.09,r);",
    "      float ha=uTimer*6.2832; vec2 hd=vec2(sin(ha),cos(ha)); float hl=abs(dot(q,vec2(hd.y,-hd.x))); float hand=smoothstep(.003,.0015,hl)*step(0.,dot(q,hd))*step(r,.088);",
    "      vec3 lum=vec3(.25,1.,.42)*(tick+hand*1.3)*.75*(1.+uBell*1.5)*uGlow;",
    "      face=mix(face,c,smoothstep(px,0.,bez)); face+=lum; col=mix(col,face,smoothstep(.123,.12,r)); col+=vec3(.25,1.,.42)*.02*exp(-r*30.)*uGlow; } }",
    // dust drifting in the red light, the safelight's haze, a heavy darkroom vignette
    "  #if !LITE",
    "  for(int i=0;i<12;i++){ float fi=float(i); vec2 dp=vec2(h21(vec2(fi,1.)),h21(vec2(fi,7.)))*2.-1.; dp=dp*vec2(1.,.55)+vec2(sin(uW*.05+fi),cos(uW*.04+fi*1.3))*.1;",
    "    float rr=length(m-dp)/(.01+.02*h21(vec2(fi,3.))); col+=SAFE*.05*smoothstep(1.,.7,rr)*(.4+.6*h21(vec2(fi,9.)))*uDust; }",
    "  #endif",
    "  vec2 sl=(uPort>.5?vec2(LP.y,-LP.x):LP.xy)*uScale; col+=SAFE*.05*exp(-dot(p-sl,p-sl)*2.5);",
    "  col*=1.-.55*smoothstep(.35,1.05,length(p*vec2(uRes.y/uRes.x*1.15,1.))); col*=1.-.3*smoothstep(.1,.45,p.y);",   // calmer at the top, where the title sits
    "  o=vec4(col,1.); }"].join("\n"); };

  K.mod("darkroom", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var PW = 512, PH = 640, coins = [], queue = [], next = null, cycle = null, shown = null, dead = false, late = false;
    /* the print, made on a 2D canvas: white border, black velvet field, the coin's cut-out in black and white, an archive caption */
    function compose(e, img) {
      var c = document.createElement("canvas"); c.width = PW; c.height = PH; var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, PW, PH); g.fillStyle = "#070707"; g.fillRect(30, 30, PW - 60, PH - 128);
      var mono = "\"SFMono-Regular\", Menlo, Consolas, monospace";
      if (img) { var sz = 392; g.save(); g.filter = "grayscale(1) contrast(1.18) brightness(1.04)"; g.drawImage(img, (PW - sz) / 2, 30 + (PH - 128 - sz) / 2, sz, sz); g.restore();
        g.fillStyle = "#262626"; var cap = String(e.label || "").toUpperCase(), fs = 21; g.font = "600 " + fs + "px " + mono; while (fs > 12 && g.measureText(cap).width > PW - 68) { fs--; g.font = "600 " + fs + "px " + mono; } g.textAlign = "left"; g.fillText(cap, 34, PH - 58);
        g.textAlign = "right"; g.font = "500 18px " + mono; g.fillText("No. " + (e.scan || ""), PW - 34, PH - 30); }
      else { g.fillStyle = "#f2f2f2"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "600 76px \"Cormorant Garamond\", Georgia, serif"; g.fillText("TITAN", PW / 2, 228);
        g.font = "600 44px \"Cormorant Garamond\", Georgia, serif"; g.fillText("RELIQUARY", PW / 2, 312); g.fillStyle = "#262626"; g.font = "600 21px " + mono; g.textBaseline = "alphabetic"; g.fillText("THE COLLECTION, PRINT No. 1", PW / 2, PH - 58); }
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      shown = e ? e.scan : null; }
    function prepare(e) { if (!e) return; var img = new Image(); var nx = { e: e, img: img, ok: false }; img.onload = function () { nx.ok = true; }; img.src = e.thumb; next = nx; }
    function pick(ci) { if (queue.length) return queue.shift(); if (!coins.length) return null; var h = Math.abs(Math.sin(ci * 12.9898) * 43758.5453) % 1; return coins[Math.floor(h * coins.length)]; }
    try { fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) { if (dead) return;
      coins = (d.flips || []).filter(function (f) { return f.thumb; }).map(function (f) { return { scan: f.scan, thumb: f.thumb, label: f.label }; });
      if (!next && cycle != null) prepare(pick(cycle + 1)); }).catch(function () { /* no data: the name print stays */ }); } catch (e) { /* ignore */ }
    function onCoin(ev) { var id = ev.detail && ev.detail.id; var e = coins.filter(function (x) { return x.scan === id; })[0]; if (!e || shown === id) return; queue.unshift(e); prepare(queue.shift()); }
    addEventListener("titan:coin", onCoin);
    var seen = K.ptr.tap, rips = [], boost = 0, lastPh = 0, A = 1, camVals = [0, 0, 0, 0];
    function toM(ux, uy, sc, v) { var x = (ux - .5) * A, y = uy - .5, port = A < 1; var m = port ? [-y, x] : [x, y];
      m = [m[0] / sc, m[1] / sc]; if (!v) return m;
      var vz = 1. - (v.move || 0) * .6, vx = v.yaw || 0, vy = (v.pitch || 0) + (v.up || 0);
      return [m[0] * vz + vx, m[1] * vz + vy]; }
    function scaleFor(A) { var ax = A < 1 ? .5 : A * .5, ay = A < 1 ? A * .5 : .5; return Math.min(1.15, Math.min(ax / .9, ay / .46)); }
    var RIP = new Float32Array(20);
    return { name: "darkroom",
      step: function (c) { var P = c.ptr, t = c.t, v = c.view || {}; A = c.w / c.h; var sc = scaleFor(A), now = Date.now() / 1000, ci = Math.floor(now / CYC), ph = now % CYC;
        camVals = [+(v.yaw || 0).toFixed(3), +(v.pitch || 0).toFixed(3), +(v.move || 0).toFixed(3), +(v.up || 0).toFixed(3)];
        if (ci !== cycle) { if (cycle == null) compose(null, null); else if (next && next.ok) { compose(next.e, next.img); next = null; } else late = true; cycle = ci; if (!next && coins.length) prepare(pick(ci + 1)); }
        if (late && next && next.ok) { late = false; if (ph < IN_END + 1.2) { compose(next.e, next.img); next = null; prepare(pick(ci + 1)); } }   // still blank paper: the swap cannot be seen
        if (P.tap !== seen) { seen = P.tap; var mm = toM(P.tx, P.ty, sc, v); rips.unshift({ x: mm[0], y: mm[1], t: t, a: 1 }); boost = Math.min(1.5, boost + .6);
          try { dispatchEvent(new CustomEvent("titan:fx", { detail: { type: "splash", x: P.tx, y: 1 - P.ty, power: 1, from: "scene" } })); } catch (e) { /* ignore */ } }
        if (lastPh < .55 && ph >= .55) rips.unshift({ x: .02, y: -.3, t: t, a: .8 });                         // the paper goes in
        if (lastPh < OUT_AT + .4 && ph >= OUT_AT + .4) rips.unshift({ x: -.3, y: -.02, t: t, a: .6 });        // the print is lifted out
        lastPh = ph; rips = rips.filter(function (r) { return t - r.t < 4; }).slice(0, 5); boost *= Math.exp(-c.dt / 2.5); },
      draw: function (c) { var A2 = c.w / c.h, sc = scaleFor(A2), now = Date.now() / 1000, ph = now % CYC, t = c.t, v = c.view || {};
        var dev = Math.min(1, Math.max(0, (ph - IN_END) / (DEV_END - IN_END))), ein = Math.min(1, ph / IN_END), eo = Math.max(0, (ph - OUT_AT) / (CYC - OUT_AT));
        ein = 1 - Math.pow(1 - ein, 3); eo = eo * eo * (3 - 2 * eo);
        var tsec = Math.min(DEV_END - IN_END, Math.max(0, ph - IN_END)), bell = ph >= DEV_END && ph < DEV_END + 1.2 ? Math.exp(-(ph - DEV_END) * 3) : 0;
        RIP.fill(0); rips.forEach(function (r, i) { RIP.set([r.x, r.y, t - r.t, r.a], i * 4); });
        var room = v.mode === "room", tilt = room ? [0, 0] : [(c.ptr.x - .5), (c.ptr.y - .5)];
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uPrint, 0); gl.uniform1f(u.uPA, PW / PH);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, t); gl.uniform1f(u.uW, now % 1000); gl.uniform1f(u.uRock, (now % ROCK) / ROCK * 2 * Math.PI);
        gl.uniform1f(u.uPort, A2 < 1 ? 1 : 0); gl.uniform1f(u.uScale, sc); gl.uniform1f(u.uDev, dev); gl.uniform1f(u.uIn, ein); gl.uniform1f(u.uOut, eo);
        gl.uniform1f(u.uAmp, .0042 * (1 + boost) * look("agitation", 1)); gl.uniform1f(u.uTimer, tsec / 60); gl.uniform1f(u.uBell, bell); gl.uniform4fv(u.uRip, RIP);
        gl.uniform2f(u.uTilt, tilt[0], tilt[1]);
        gl.uniform4f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0);
        gl.uniform1f(u.uSafe, look("safelight", 1)); gl.uniform1f(u.uDust, look("dust", 1)); gl.uniform1f(u.uGlow, look("timer", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3); },
      debug: function () { return { tier: T, coins: coins.length, print: shown, queued: queue.length, nextReady: !!(next && next.ok), cam: camVals, look: { safelight: look("safelight", 1), agitation: look("agitation", 1), dust: look("dust", 1), timer: look("timer", 1) } }; },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tex); gl.deleteProgram(pr.p); } };
  });
  K.themes.darkroom = { stack: [
    { mod: "darkroom" },
    { mod: "post", bloom: .8, threshold: .7, knee: .5, exposure: 1.05, aberr: .05, grain: .04, vig: .3 }
  ],
    room: { name: "The tray under the safelight", yaw: [-.22, .22], pitch: [-.18, .18], move: [-.3, .5], up: [-.1, .1], unit: "m", sound: "darkroom",
      look: [
        { id: "safelight", label: "Safelight", min: .2, max: 2.5, def: 1 },
        { id: "agitation", label: "Agitation", min: 0, max: 3, def: 1 },
        { id: "dust", label: "Dust", min: 0, max: 3, def: 1 },
        { id: "timer", label: "Timer Glow", min: 0, max: 3, def: 1 }
      ],
      touch: "Tap the developer bath to agitate the fluid and ripple the safelight reflections.",
      opening: { dur: 5.0, from: { yaw: .35, pitch: -.2, move: -.25, up: .15 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.8, at: [.5, .45] } } };
})();
