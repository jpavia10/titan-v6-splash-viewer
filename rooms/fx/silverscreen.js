/* fx/silverscreen.js: Silver Screen (silverscreen), theme #43, on the TitanFXK kit (Claude, 2026-10-22; Grok's plan in
   notes/agents/themes-37-50.md: "picture palace: nitrate flicker, velvet, beam; volumetric projector beam through haze, gate weave, grain").
   A 1920s picture palace from the stalls. The film on the screen is a silent newsreel of the collection: an intertitle card in an
   art deco frame names the coin (country, year, denomination, its C number), then the coin's own shot (its phone cut-out in silver
   black and white, a slow push-in), closing on an iris; then the next. Open a coin in the app and it is the next shot.
   The film is real projection: 18 frames a second, each frame with its own gate weave, flicker, grain, dust and the odd scratch;
   the screen's light falls on the velvet drapes, the gilded proscenium and the seat rows. The projector beam comes over the stalls
   from the booth (top right) and carries the film itself: every ray is as bright as the part of the picture it lands on, so the
   streaks change with each shot, through drifting haze and dust; tap the beam and the dust swirls where you tapped.
   The reel runs on the wall clock (12 s a subject: card, shot, iris). Sound: audio/scape "picturehouse" (the projector's rattle and
   motor, the hall) and the scene's recorded piano (silent-film accompaniment).
   Quality tiers (user-chosen): Low drops the dust and one haze octave; Medium and up draw everything. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
  function tier() {
    try { if (window.TitanQuality && TitanQuality.tier) { var q = String(TitanQuality.tier()).toLowerCase(); if (q === "ultra") q = "max"; if (/^(low|medium|high|max)$/.test(q)) return q; } } catch (e) { /* ignore */ }
    try { var v = (localStorage.getItem("tr_quality") || "").toLowerCase(); if (v === "ultra") v = "max"; if (/^(low|medium|high|max)$/.test(v)) return v; if (localStorage.getItem("tr_lite_v1") === "1") return "low"; } catch (e) { /* ignore */ }
    return "high";
  }
  var SEG = 12, CARD = 3.4, IRIS = .7, FPS = 18;
  var FRAG = function (lite) { return "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + [
    "#define LITE " + (lite ? 1 : 0),
    "uniform vec2 uRes; uniform float uT, uFr, uPh, uPort; uniform vec4 uScr; uniform vec2 uSrc; uniform vec3 uTap; uniform vec3 uLay; uniform float uNoShot;",
    "uniform vec4 uView; uniform vec4 uLook;",
    "uniform sampler2D uCard, uShot;",
    "float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "float rel(vec2 v, float b){ return mod(atan(v.y,v.x)-b+3.14159265,6.2831853)-3.14159265; }",          // an angle measured from the beam's axis (no wrap at 180 degrees)
    // the film: the frame on the screen at uv (0..1), with this frame's weave, flicker, grain, dust, scratches and the iris
    "vec3 film(vec2 uv, float lod){ float f=uFr; vec2 wv=(vec2(h1(f),h1(f+7.))-.5)*vec2(.004,.006); uv+=wv;",
    "  bool card=uPh<" + CARD.toFixed(2) + "||uNoShot>.5; vec3 c;",                                                     // no coin yet: the title card holds
    "  if(card){ c=textureLod(uCard,vec2(uv.x,1.-uv.y),lod).rgb*vec3(1.,.86,.62); }",                                  // intertitles were tinted amber
    "  else { float s=(uPh-" + CARD.toFixed(2) + ")/" + (SEG - CARD).toFixed(2) + "; float z=1.+.07*s; vec2 su=(uv-.5)/z+.5; c=textureLod(uShot,vec2(su.x,1.-su.y),lod).rgb*vec3(.92,.95,1.); }",
    "  float fl=1.+(.12*h1(f*1.37)-.12)*uLook.z; c*=fl;",                                                                            // flicker
    "  if(lod<1.) c+=(h21(floor(gl_FragCoord.xy/1.5)+f*3.1)-.5)*.13*(.4+.6*smoothstep(0.,.5,dot(c,vec3(.33))))*uLook.z;",   // grain (on the screen; the beam is blurred)
    "  for(int i=0;i<2;i++){ float fi=float(i); float sx=h1(floor(f/5.)*3.+fi); float on=step(.62,h1(floor(f/5.)*7.+fi)); c=mix(c,c*.35+.25*h1(f+fi),on*smoothstep(.0016,.0,abs(uv.x-sx-sin(uv.y*3.+fi)*.003))*uLook.z); }",   // scratches, a few frames each
    "  vec2 dp=vec2(h1(f*2.1),h1(f*3.7)); float dd=length((uv-dp)*vec2(1.33,1.)); c=mix(c,vec3(step(.5,h1(f*5.3))*.9),smoothstep(.006,.002,dd)*uLook.z);",   // a speck of dust
    "  c*=1.-.45*pow(length((uv-.5)*vec2(1.1,1.2)),2.2);",                                                              // the projector's hot spot
    "  float ir=1.; float io=" + (SEG - IRIS).toFixed(2) + "; if(uPh>io){ float k=(uPh-io)/" + IRIS.toFixed(2) + "; ir=smoothstep(0.,.012,(1.-k)*.72-length((uv-.5)*vec2(1.333,1.))); }",   // iris out
    "  if(card&&uPh<.5){ ir=smoothstep(0.,.012,uPh/.5*.9-length((uv-.5)*vec2(1.333,1.))); }",                          // iris in on the card
    "  return max(c,0.)*ir*.62; }",                                                                 // a projected picture, not a lamp: keeps the house dark
    "void main(){"].join("\n") + "\n" + MAIN; };
  var MAIN = [
    "  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y; float A=uRes.x/uRes.y, px=1./uRes.y*exp(-uView.z); vec2 sc=uScr.xy, hs=uScr.zw;",
    "  p=(p-vec2(uView.x,uView.y+uView.w))*exp(-uView.z);",
    "  vec2 sq=p-sc; vec2 suv=sq/(hs*2.)+.5;",
    // how much light the screen throws this frame (a few taps of the film, blurred)
    "  vec3 avg=(film(vec2(.3,.4),6.)+film(vec2(.7,.6),6.)+film(vec2(.5,.5),6.))/3.; float L=dot(avg,vec3(.33))+.04;",
    // the house: dark, a little warm haze, the screen's light falling off
    "  vec3 col=(vec3(.012,.008,.008)+vec3(.05,.045,.05)*L*exp(-length(sq*vec2(.8,1.))*2.6))*uLook.w;",
    // the proscenium: gilded arch and fluted pillars around the stage; deco rays above the arch
    "  float D=uLay.x; vec2 inr=hs+vec2(D,.07); float frame=max(sdBox(sq,inr+vec2(.035,.03)),-sdBox(sq,inr));",
    "  if(frame<.0){ float fl=.5+.5*sin(sq.x*140.); vec3 gold=vec3(.42,.3,.12)*(.55+.45*fl)*(.25+3.*L*exp(-abs(sq.x)*1.2))+vec3(.9,.7,.35)*pow(fl,8.)*L*.6;",
    "    float rays=step(.5,fract(atan(sq.x,sq.y-hs.y+.02)*7.))*step(hs.y+.03,sq.y); gold*=.75+.35*rays; col=mix(col,gold*.6,clamp(-frame/px,0.,1.)); }",
    // velvet drapes, gathered at the sides of the stage, and the swag valance across the top
    "  float inner=sdBox(sq,inr); if(inner<0.){",
    "    float side=abs(sq.x)-hs.x-.012; float dr=smoothstep(-.002,.002,side); float tq=clamp(side/(D-.01),0.,1.);",
    "    float fold=.5+.5*sin(sq.x*95.+sin(sq.y*6.)*1.4+tq*2.); fold=pow(fold,1.6);",
    "    vec3 vel=vec3(.34,.02,.04)*(.18+.82*fold)*(.25+2.4*L*(1.-tq*.6))+vec3(.5,.12,.08)*smoothstep(-hs.y,-hs.y-.08,sq.y)*.35;",    // lit by the screen and the footlights
    "    float val=sq.y-hs.y-.005-.035*(1.-pow(abs(sin(sq.x/(hs.x*2.)*3.1416*3.)),.7)); float dv=smoothstep(-.002,.002,val);",
    "    float vf=.5+.5*sin(sq.y*160.+sin(sq.x*20.)*2.); vec3 swag=vec3(.32,.02,.04)*(.2+.8*vf)*(.3+2.*L)+vec3(.7,.5,.2)*smoothstep(.004,0.,abs(val))*L;",
    "    col=mix(col,vel,dr*step(sq.y,hs.y+.06)); col=mix(col,swag,dv*step(abs(sq.x),inr.x)); }",
    // deco wall sconces on the side walls (when there is wall to see): a fluted shell of light and its glow on the plaster
    "  float wx=.5*(.5*A+inr.x+.035); if(.5*A-inr.x-.035>.12){ vec2 q=vec2(abs(p.x)-wx,p.y-.1); float sh=length(q*vec2(1.,1.4));",
    "    float shell=step(sh,.032)*step(-.004,q.y)*(.55+.45*pow(.5+.5*cos(atan(q.x,q.y)*9.),.6)); col+=(vec3(1.,.72,.42)*(.2*exp(-length(q*vec2(1.,.45))*9.)+.022*exp(-length(q)*3.))+vec3(1.,.78,.5)*shell*.6)*uLook.w; }",
    // the screen: black masking, then the film
    "  float sd=sdBox(sq,hs); col=mix(col,vec3(.006),smoothstep(px,0.,sdBox(sq,hs+vec2(.012))));",
    "  if(sd<px){ vec3 fc=film(clamp(suv,0.,1.),0.)*1.05+.012; col=mix(col,fc,smoothstep(px,-px,sd)); }",
    // footlights along the stage edge
    "  float fy=sq.y+hs.y+.1; col+=vec3(1.,.62,.3)*.16*exp(-fy*fy*900.)*step(abs(sq.x),inr.x-.03)*(.6+.4*sin(sq.x*60.))*uLook.w;",
    // the stalls: rows of seat backs in silhouette going back toward the stage (perspective), their tops catching the screen's light
    "  float dz=sc.y-hs.y-.1-p.y; float rows=uLay.y/uLay.z-uLay.y/max(dz,.001); if(dz>uLay.z){ float ri=floor(rows), rf=fract(rows); float sw=.05+.35*dz; float sx=fract(p.x/sw+ri*.37)-.5;",
    "    float e=.3+.32*pow(abs(sx)*2.,2.6); float seat=step(e,rf)*step(abs(sx),.47); float rim=smoothstep(.09,0.,rf-e)*seat;",
    "    vec3 sc2=mix(vec3(.004,.002,.002),vec3(.02,.006,.006)+vec3(.8,.1,.1)*rim*(.03+1.5*L)*exp(-ri*.25),seat); col=mix(col,sc2,smoothstep(0.,.004,dz-uLay.z)); }",
    // the projector beam: the booth is behind and above you, so every ray rises out of the picture where it lands and widens toward you;
    // in the image the rays meet at uSrc (the booth seen through the back of your head: below the screen). Each ray is as bright as the picture along it.
    "  vec2 S=uSrc; vec2 d=p-S; float r=length(d); vec2 dn=d/max(r,1e-4); vec2 iv=1./(abs(dn)+1e-5)*sign(dn+1e-7);",
    "  vec2 t0=(sc-hs-S)*iv, t1=(sc+hs-S)*iv, tn=min(t0,t1), tf=max(t0,t1); float tin=max(tn.x,tn.y), tou=min(tf.x,tf.y);",   // where this line crosses the screen
    "  float inb=smoothstep(0.,.03,tou-tin)*smoothstep(tou-.004,tou+.03,r)*step(0.,tin)*smoothstep(0.,.02,sd);",   // past the picture (toward you), not on it
    "  if(inb>0.){ vec2 ea=(S+dn*tin-sc)/(hs*2.)+.5, eb=(S+dn*tou-sc)/(hs*2.)+.5;",
    "    vec3 ray=(film(clamp(ea,0.,1.),4.)+film(clamp(mix(ea,eb,.5),0.,1.),4.)+film(clamp(eb,0.,1.),4.))/3.+.035;",   // all the light that lands along this line of the screen (film black still passes a little)
    "    vec2 tp=(uTap.xy-vec2(uView.x,uView.y+uView.w))*exp(-uView.z);",
    "    vec2 hz=p*vec2(2.2,3.)+vec2(uT*.03,-uT*.015); float tw=length(p-tp), ta=uTap.z; vec2 sw=ta<4.?vec2(-(p-tp).y,(p-tp).x)*exp(-tw*9.)*exp(-ta*.8)*3.:vec2(0.);",
    "    #if LITE", "    float haze=fbm3(hz+sw);", "    #else", "    float haze=fbm(hz+sw)*.7+fbm3(hz*3.1-sw)*.3;", "    #endif",
    "    float near=(.25+.75*exp(-(r-tou)*2.2))*(.35+.65*smoothstep(0.,.14,r-tou)); vec3 b=ray*(.08+2.6*haze*haze*haze)*.3*uLook.x*(1.-.45*uPort)*near*inb*(1.+(ta<1.5?(1.-ta/1.5)*.8:0.));",
    "    #if !LITE",
    "    vec2 g=p*vec2(55.,55.)+vec2(uT*.6,uT*.3)+sw*8.; vec2 id=floor(g), fg=fract(g)-.5-(h22(id)-.5)*.7; float mote=smoothstep(.06,.0,length(fg))*step(.93,h21(id));",
    "    b+=vec3(1.,.95,.88)*mote*inb*.7*dot(ray,vec3(.33))*uLook.y;",
    "    #endif",
    "    col+=b; }",
    "  col*=1.-.4*smoothstep(.4,1.05,length(p*vec2(1./A*1.15,1.))); col*=1.-.25*smoothstep(.3,.5,p.y)*smoothstep(hs.y+.1,hs.y+.16,p.y-sc.y);",
    "  o=vec4(col,1.); }"].join("\n");
  // a deco intertitle and the coin's shot, made on 2D canvases
  function deco(g, W, H) { g.strokeStyle = "#e8e2d0"; g.lineWidth = 3; g.strokeRect(26, 26, W - 52, H - 52); g.lineWidth = 1.5; g.strokeRect(38, 38, W - 76, H - 76);
    [[38, 38, 1, 1], [W - 38, 38, -1, 1], [38, H - 38, 1, -1], [W - 38, H - 38, -1, -1]].forEach(function (c) { g.beginPath();
      for (var i = 0; i < 4; i++) { g.moveTo(c[0], c[1]); g.lineTo(c[0] + c[2] * (34 - i * 7), c[1] + c[3] * (10 + i * 8)); } g.stroke(); }); }
  function cardFor(e) {
    var W = 640, H = 480, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    g.fillStyle = "#050505"; g.fillRect(0, 0, W, H); deco(g, W, H); g.fillStyle = "#efe9d8"; g.textAlign = "center"; g.textBaseline = "middle";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    if (!e) { g.font = "italic 500 30px " + serif; g.fillText("the collection presents", W / 2, 150); g.font = "600 74px " + serif; g.fillText("TITAN", W / 2, 228); g.font = "600 46px " + serif; g.fillText("RELIQUARY", W / 2, 292); g.font = "italic 26px " + serif; g.fillText("a picture in many reels", W / 2, 360); return c; }
    var parts = String(e.label || "").split(" · "); g.font = "500 30px " + serif; g.fillText("— from the collection —", W / 2, 120);
    var t = (parts[0] || "").toUpperCase(), fs = 64; g.font = "600 " + fs + "px " + serif; while (fs > 30 && g.measureText(t).width > W - 120) { fs -= 2; g.font = "600 " + fs + "px " + serif; } g.fillText(t, W / 2, 210);
    g.font = "500 44px " + serif; g.fillText((parts[1] || "") + (parts[2] ? "  ·  " + parts[2] : ""), W / 2, 285); g.font = "italic 24px " + serif; g.fillText("No. " + (e.scan || ""), W / 2, 370); return c;
  }
  function shotFor(img) {
    var W = 640, H = 480, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    var gr = g.createRadialGradient(W * .5, H * .45, 20, W * .5, H * .5, W * .6); gr.addColorStop(0, "#3a3a3a"); gr.addColorStop(.6, "#121212"); gr.addColorStop(1, "#050505");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (img) { g.save(); g.shadowColor = "rgba(0,0,0,.85)"; g.shadowBlur = 30; g.shadowOffsetY = 12; g.filter = "grayscale(1) contrast(1.08) brightness(.86)"; var s = 360; g.drawImage(img, (W - s) / 2, (H - s) / 2 - 6, s, s); g.restore(); }
    return c;
  }
  K.mod("silverscreen", function (gl, s, K) {
    var T = tier(), pr = K.compile(K.FSQ, FRAG(T === "low")); if (!pr) return null;
    function mkTex() { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); }); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); return t; }
    var tCard = mkTex(), tShot = mkTex();
    function up(t, c) { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    var coins = [], queue = [], next = null, seg = null, shown = null, dead = false, late = false;
    function prepare(e) { if (!e) return; var img = new Image(), nx = { e: e, img: img, ok: false }; img.onload = function () { nx.ok = true; }; img.src = e.thumb; next = nx; }
    function pick(si) { if (queue.length) return queue.shift(); if (!coins.length) return null; var h = Math.abs(Math.sin(si * 78.233) * 43758.5453) % 1; return coins[Math.floor(h * coins.length)]; }
    function show(nx) { up(tCard, cardFor(nx ? nx.e : null)); up(tShot, shotFor(nx ? nx.img : null)); shown = nx ? nx.e.scan : null; }
    try { fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) { if (dead) return;
      coins = (d.flips || []).filter(function (f) { return f.thumb; }).map(function (f) { return { scan: f.scan, thumb: f.thumb, label: f.label }; });
      if (!next && seg != null) prepare(pick(seg + 1)); }).catch(function () { /* the title card stays */ }); } catch (e) { /* ignore */ }
    function onCoin(ev) { var id = ev.detail && ev.detail.id; var e = coins.filter(function (x) { return x.scan === id; })[0]; if (!e || shown === id) return; prepare(e); }
    addEventListener("titan:coin", onCoin);
    var seen = K.ptr.tap, tap = [9, 9, 99], lastView = {};
    function layout(A) { var port = A < 1, w = port ? A * .74 : Math.min(.86, A * .48), h = w * .75;   // the screen (4:3), the drapes, the stalls' perspective
      return port ? { scr: [0, .17, w / 2, h / 2], src: [-.14, -.6], lay: [.045, .35, .06] } : { scr: [0, .03, w / 2, h / 2], src: [-.34, -1.05], lay: [.13, .08, .02] }; }
    return { name: "silverscreen",
      step: function (c) { var P = c.ptr, now = Date.now() / 1000, si = Math.floor(now / SEG), ph = now % SEG; lastView = c.view || {};
        if (si !== seg) { if (seg == null) show(null); else if (next && next.ok) { show(next); next = null; } else late = true; seg = si; if (!next && coins.length) prepare(pick(si + 1)); }
        if (late && next && next.ok) { late = false; if (ph < .45) { show(next); next = null; prepare(pick(si + 1)); } }   // still in the iris-in: the change cannot be seen
        if (P.tap !== seen) { seen = P.tap; var A = c.w / c.h; tap = [(P.tx - .5) * A, P.ty - .5, c.t]; } },
      draw: function (c) { var A = c.w / c.h, L = layout(A), now = Date.now() / 1000; lastView = c.view || {};
        K.bindTarget(); gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCard); gl.uniform1i(u.uCard, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tShot); gl.uniform1i(u.uShot, 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(u.uRes, c.w, c.h); gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uFr, Math.floor(now * FPS) % 100000); gl.uniform1f(u.uPh, now % SEG); gl.uniform1f(u.uPort, A < 1 ? 1 : 0);
        gl.uniform4f(u.uScr, L.scr[0], L.scr[1], L.scr[2], L.scr[3]); gl.uniform2f(u.uSrc, L.src[0], L.src[1]); gl.uniform3f(u.uLay, L.lay[0], L.lay[1], L.lay[2]); gl.uniform1f(u.uNoShot, shown ? 0 : 1); gl.uniform3f(u.uTap, tap[0], tap[1], c.t - tap[2]);
        gl.uniform4f(u.uView, lastView.yaw || 0, lastView.pitch || 0, lastView.move || 0, lastView.up || 0);
        gl.uniform4f(u.uLook, look("haze", 1), look("dust", 1), look("flicker", 1), look("glow", 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3); },
      debug: function () { return { tier: T, coins: coins.length, shot: shown, nextReady: !!(next && next.ok),
        cam: [lastView.yaw || 0, lastView.pitch || 0, lastView.move || 0, lastView.up || 0].map(function (x) { return +x.toFixed(3); }),
        look: { haze: look("haze", 1), dust: look("dust", 1), flicker: look("flicker", 1), glow: look("glow", 1) } }; },
      dispose: function () { dead = true; removeEventListener("titan:coin", onCoin); gl.deleteTexture(tCard); gl.deleteTexture(tShot); gl.deleteProgram(pr.p); } };
  });
  K.themes.silverscreen = { stack: [
    { mod: "silverscreen" },
    { mod: "post", bloom: .9, threshold: .7, knee: .5, exposure: 1.05, aberr: .08, grain: .05, vig: .35 }
  ],
    // a flat world: yaw and pitch pan in screen heights (a phone is only ~.46 wide), so the limits keep the screen in view on a phone
    room: { name: "The picture palace stalls", yaw: [-.12, .12], pitch: [-.1, .12], move: [-.3, .4], up: [-.08, .08], unit: "screen", sound: "picturehouse",
      look: [{ id: "haze", label: "Beam haze", min: 0, max: 3, def: 1 }, { id: "dust", label: "Dust motes", min: 0, max: 3, def: 1 },
        { id: "flicker", label: "Film flicker", min: 0, max: 3, def: 1 }, { id: "glow", label: "House lights", min: 0, max: 3, def: 1 }],
      touch: "Tap the projector beam to swirl dust motes in the haze.",
      opening: { dur: 5.0, from: { yaw: -.07, pitch: .06, move: -.3, up: -.04 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 2.8, at: [.35, .45] } } };
})();
