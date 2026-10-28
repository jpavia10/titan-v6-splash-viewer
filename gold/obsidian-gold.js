/* Titan Reliquary — Obsidian Sun · GOLD v2 (craft)
   One hero: a knapped obsidian blade, ray-marched as a true solid.
   Flake scars are carved as concave spherical scallops (how real knapping works),
   conchoidal ripple rings + polish scratches live in the normal, thin-film sheen at
   grazing angles, GGX speculars from a moving warm key. Raw WebGL1, no deps. */
(function(){
'use strict';
var Q=new URLSearchParams(location.search),cv=document.getElementById('gl');
var gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||Q.get('still')==='1';
var lock=function(){document.body.classList.add('lock')};
if(!gl){lock();document.getElementById('start').remove();return;}
var mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
var tier=Q.get('tier')||(mobile?((navigator.hardwareConcurrency||4)>=8?'mid':'low'):'high');
// tiers change DETAIL: march precision, reflection/shadow quality, atmosphere samples, render scale
var TT={high:{steps:110,shadow:1,haze:24,scale:1.0,dpr:2},mid:{steps:80,shadow:1,haze:14,scale:.8,dpr:1.5},low:{steps:56,shadow:0,haze:8,scale:.65,dpr:1.25}};
var T=TT[tier]||TT.mid,DPR=Math.min(devicePixelRatio||1,T.dpr)*T.scale;
function resize(){cv.width=Math.round(innerWidth*DPR);cv.height=Math.round(innerHeight*DPR);gl.viewport(0,0,cv.width,cv.height);}
addEventListener('resize',resize);resize();

var FS='precision highp float;\n#define STEPS '+T.steps+'\n#define SHADOW '+T.shadow+'\n#define HAZE '+T.haze+'\n'+`
uniform vec2 R;uniform float t;uniform vec3 ro,ta,kd;uniform float sunUp,crack,keyI;
float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.1+3.1;a*=.5;}return s;}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
// blade half-width / half-thickness profile along y (tip at top, gently waisted base)
float W(float y){return .40*sqrt(max(0.,1.-pow((y+.1)/1.05,2.)))*(1.-.35*smoothstep(-.2,1.,y));}
float scarR(float i,float side,float face){return .55+.35*h1(i*13.+side+face*5.);}
vec3 scarC(float i,float side,float face){
  float y=-.95+i*.135+.09*(h1(i*7.+side*3.+face)-.5);
  float r=scarR(i,side,face);float w=W(y);
  // large, shallow conchoidal scoops struck from the edge: overlap → ridged facets
  return vec3(side*w*(.15+.5*h1(i*3.1+side)),y,face*(r+w*.30-.018-.02*h1(i*9.+face)));}
float sdBlade(vec3 p,out float sid){
  // tilt the artefact slightly so it never reads as a flat icon
  p.xy=rot(.12)*p.xy;
  float w=max(W(p.y),.03),th=w*.30+.006;
  vec2 q=vec2(p.x/max(w,.001),p.z/max(th,.001));
  float d=(length(q)-1.)*min(w,th)*.9;
  d=max(d,abs(p.y+.07)-1.0);
  sid=-1.;float best=1e9;
  for(int i=0;i<15;i++){float fi=float(i);
    for(int s=0;s<2;s++){float sd=s==0?-1.:1.;
      float fc=mod(fi+float(s),2.)<1.?1.:-1.;          // alternate faces → bifacial knapping
      vec3 c=scarC(fi,sd,fc);float r=scarR(fi,sd,fc);
      float e=r-length(p-c);
      d=max(d,e);                                       // carve concave flake scar
      if(-e<best){best=-e;sid=fi+float(s)*20.;}}}
  // pressure-flake retouch along the edge: fine, irregular serration
  for(int j=0;j<22;j++){float fj=float(j);float y=-.95+fj*.088;float sd2=mod(fj,2.)<1.?1.:-1.;
    vec3 c=vec3(sd2*(W(y)+.035),y+.02*h1(fj*5.),(h1(fj*2.)-.5)*.03);d=max(d,.055+.02*h1(fj)-length(p-c));}
  return d;}
float map(vec3 p){float s;return sdBlade(p,s);}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
// studio environment: warm corona key behind, cool floor bounce, black void
uniform vec3 sunD;vec3 sunDir(){return sunD;}
vec3 env(vec3 d,float rf){
  vec3 s=sunDir();float sd=max(dot(d,s),0.);
  vec3 c=vec3(.002,.002,.003);
  float ang=acos(clamp(sd,-1.,1.));float rim=exp(-max(ang-.06,0.)*150.)*step(.059,ang);
  vec3 ax=normalize(cross(s,vec3(0,1,0)));float az=atan(dot(d,ax),dot(d,cross(ax,s)));
  c+=vec3(1.,.68,.34)*rim*(.6+.8*n2(vec2(az*6.,t*.2)))*(3.2-2.4*rf)*sunUp;
  c+=vec3(1.,.6,.3)*exp(-max(ang-.06,0.)*9.)*step(.059,ang)*.10*(1.-.8*rf)*sunUp;
  c+=vec3(.10,.13,.18)*smoothstep(.1,-.6,d.y)*(.04+.2*rf);       // cool bounce
  // softbox strip high camera-left: gives the long specular sweep across facets
  float strip=smoothstep(.06,.0,abs(d.x+.55-.25*sin(t*.07)))*smoothstep(-.1,.4,d.y)*smoothstep(.95,.5,d.y);
  c+=vec3(1.,.86,.66)*strip*1.6*keyI*rf;
  return c;}
float D_GGX(float nh,float a){float a2=a*a;float d=nh*nh*(a2-1.)+1.;return a2/(3.14159*d*d);}
vec3 film(float c){return .5+.5*cos(6.2831*(vec3(0.,.33,.67)+c*1.7));}  // thin-film sheen
float softShadow(vec3 p,vec3 l){float r=1.,s=.02;for(int i=0;i<24;i++){float h=map(p+l*s);r=min(r,10.*h/s);s+=clamp(h,.02,.15);if(r<.01||s>3.)break;}return clamp(r,0.,1.);}
vec3 aces(vec3 x){return clamp(x*(2.51*x+.03)/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 f=normalize(ta-ro),r=normalize(cross(f,vec3(0,1,0))),u=cross(r,f);
  vec3 rd=normalize(f*2.3+uv.x*r+uv.y*u);
  float d=0.,hitT=-1.;vec3 p;
  for(int i=0;i<STEPS;i++){p=ro+rd*d;float h=map(p);if(h<.0007*d){hitT=d;break;}d+=h*.6;if(d>16.)break;}
  vec3 col=env(rd,0.);
  float occl=1.;
  if(hitT>0.){
    float sid;sdBlade(p,sid);vec3 n=nrm(p);
    // locate this facet's scar centre to grow conchoidal ripple rings outward from the strike point
    float fi=mod(sid,20.),sd=sid>=20.?1.:-1.;float fc=mod(fi+(sid>=20.?1.:0.),2.)<1.?1.:-1.;
    vec3 pl=p;pl.xy=rot(.12)*pl.xy;vec3 c=scarC(fi,sd,fc);
    float rr=length(pl-c);vec3 g=normalize(pl-c);
    vec3 sk=vec3(sd*W(c.y),c.y,0.);float sl=length(pl-sk);vec3 sg=normalize(pl-sk);
    float ring=(sin(sl*150.+fi)*.02+sin(sl*410.+fi*3.)*.008)*exp(-sl*5.);
    n=normalize(n+sg*ring);
    // polish scratches: anisotropic hairlines
    vec2 sp=pl.xy*rot(.9);float sc=smoothstep(.993,1.,n2(vec2(sp.x*700.,sp.y*5.)))*.35;
    n=normalize(n+vec3(sc*.15,0.,0.));
    float ridge=smoothstep(.006,.0,abs(map(p+n*.004)-.004)); // unused gentle term
    vec3 v=-rd;float nv=max(dot(n,v),0.);
    float F=.04+.96*pow(1.-nv,5.);
    vec3 refl=env(reflect(rd,n),1.);
    // key: moving warm light; fill: cool low
    vec3 L=normalize(kd);vec3 H=normalize(L+v);float nl=max(dot(n,L),0.);
    float sh=1.;
    #if SHADOW
    sh=softShadow(p+n*.003,L);
    #endif
    float rough=.035+sc*.08+abs(ring)*.4;
    vec3 spec=vec3(1.,.82,.58)*D_GGX(max(dot(n,H),0.),rough)*nl*sh*keyI*(.05+.95*pow(1.-max(dot(H,v),0.),5.))*.3;
    vec3 L2=normalize(vec3(.6,-.4,.5));vec3 H2=normalize(L2+v);
    spec+=vec3(.45,.6,.85)*D_GGX(max(dot(n,H2),0.),.12)*max(dot(n,L2),0.)*.035;
    // dark smoky body: tiny subsurface glow where glass is thin (edges)
    float thin=1.-smoothstep(.0,.022,W(pl.y)-abs(pl.x));
    vec3 body=vec3(.006,.005,.007)+vec3(.7,.28,.07)*pow(thin,3.)*.14*sunUp+vec3(1.,.5,.15)*crack*thin*.5;
    col=body*(.3+nl*.4)+vec3(.35,.5,.7)*pow(1.-nv,4.)*.05+refl*F*.75*(1.+.6*film(nv+fi*.03)*pow(1.-nv,2.))+spec;
    // fracture beat: a hairline of light runs across the blade
    float cl=abs(pl.y-.18-.05*sin(pl.x*30.))*1.;col+=vec3(1.,.7,.35)*crack*smoothstep(.006,.0,cl)*3.;
    occl=0.;
  }
  // atmosphere: single-scatter beam from the corona, shadowed by the blade silhouette
  vec3 s=sunDir();float mu=dot(rd,s);float g=.86;
  float hg=(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5)/12.566;
  float acc=0.;float tmax=hitT>0.?hitT:11.;
  for(int i=0;i<HAZE;i++){float tt=(float(i)+h2(gl_FragCoord.xy+t))/float(HAZE)*tmax;vec3 q=ro+rd*tt;
    float dens=.08+.92*pow(n2(q.xy*1.2+vec2(0,t*.05)),2.);
    float shd=smoothstep(-.02,.15,map(q+s*1.2*clamp(1.-q.z*.2,.3,1.)));      // blade casts shafts
    acc+=dens*shd;}
  acc/=float(HAZE);
  col+=vec3(1.,.66,.36)*hg*acc*.012*sunUp;
  // motes in the beam: sparse, each one an object, lit only where light falls
  for(int k=0;k<3;k++){float z=1.+float(k)*.9;vec2 m=uv*(6.+float(k)*4.)+vec2(t*.03*(1.+float(k)),-t*.05);
    vec2 id=floor(m),fr=fract(m)-.5;float hh=h2(id+float(k)*17.);
    if(hh>.86){vec2 o=vec2(h2(id+1.),h2(id+2.))-.5;float dd=length(fr-o*.7);
      float tw=.5+.5*sin(t*(1.+hh*3.)+hh*30.);
      col+=vec3(1.,.8,.55)*smoothstep(.05,.0,dd)*.5*smoothstep(.02,.4,hg)*sunUp*tw*occl/z;}}
  col=max(col-.0025,0.);col*=1.-.6*dot(uv*vec2(1.3,.9),uv*vec2(1.3,.9));
  col=aces(col*1.1);col=pow(col,vec3(1./2.2));
  col+=(h2(gl_FragCoord.xy+fract(t)*91.)-.5)*.018;      // film grain
  gl_FragColor=vec4(col,1.);
}`;
function S(ty,src){var s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function P(v,f){var p=gl.createProgram();gl.attachShader(p,S(gl.VERTEX_SHADER,v));gl.attachShader(p,S(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);return p;}
var prog=P('attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}',FS);
var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
var aL=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(aL);gl.vertexAttribPointer(aL,2,gl.FLOAT,false,0,0);
var U={};['sunD','R','t','ro','ta','kd','sunUp','crack','keyI'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});

/* Sparks at the fracture: a small hand-placed volley of chips, rendered as streaks. */
var spP=P('attribute vec4 s;uniform float t,asp;varying float vA;void main(){float te=t-6.2;float a=s.x*6.28;vec2 v=vec2(cos(a),sin(a)*.7+.5)*(.15+.5*s.y);vec2 p=vec2(.03,.30)+v*te+vec2(0,-.35)*te*te;vA=te>0.?exp(-te*(1.2+s.z))*step(te,3.):0.;gl_Position=vec4(p.x/asp*2.,p.y*2.,0,1);gl_PointSize=1.5+3.*s.w;}',
 'precision mediump float;varying float vA;void main(){vec2 q=gl_PointCoord*2.-1.;float d=dot(q,q);gl_FragColor=vec4(vec3(1.,.72,.4)*exp(-d*4.)*vA,0.);}');
var NS=tier==='low'?40:90,sa=new Float32Array(NS*4);for(var i=0;i<sa.length;i++)sa[i]=Math.random();
var sb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.bufferData(gl.ARRAY_BUFFER,sa,gl.STATIC_DRAW);
var sL=gl.getAttribLocation(spP,'s'),sT=gl.getUniformLocation(spP,'t'),sA=gl.getUniformLocation(spP,'asp');

function sm(a,b,x){x=Math.min(Math.max((x-a)/(b-a),0),1);return x*x*(3-2*x);}
/* Timeline — 13 s, five unhurried beats
   0–2.5   darkness; only a rim of corona finds the blade's edge
   2.5–6   the obsidian sun rises behind; slow push; softbox sweep crawls across the flake scars
   6.2     fracture: hairline of light, a few chips spark off
   7.2     title lands once, below the hero
   8–13    hold, near-still; let the glass be looked at */
var LOCK=7.2,END=13,t0=0,run=false,locked=false;
function frame(tt){
  var ang=-.55+.75*sm(0,12,tt), dist=10.5-1.8*sm(1,10,tt), ht=.12+.1*Math.sin(tt*.13);
  var ro=[Math.sin(ang)*dist,ht+.05,Math.cos(ang)*dist];
  gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(aL,2,gl.FLOAT,false,0,0);
  gl.uniform2f(U.R,cv.width,cv.height);gl.uniform1f(U.t,tt);
  gl.uniform3f(U.ro,ro[0],ro[1],ro[2]);gl.uniform3f(U.ta,0,-.5,0);
  var ka=-1.2+1.6*sm(2,10,tt);gl.uniform3f(U.kd,Math.sin(ka)*.8,.55,Math.cos(ka)*.8+.2);
  var fx=-ro[0],fy=-.5-ro[1],fz=-ro[2],fl=Math.hypot(fx,fy,fz),lift=.02+.06*sm(1.5,6.5,tt),sd=[fx/fl,fy/fl+lift,fz/fl],sl=Math.hypot(sd[0],sd[1],sd[2]);gl.uniform3f(U.sunD,sd[0]/sl,sd[1]/sl,sd[2]/sl);
  gl.uniform1f(U.sunUp,.08+.92*sm(1.5,6,tt));gl.uniform1f(U.keyI,sm(2.5,5.5,tt));
  gl.uniform1f(U.crack,tt>6.2?Math.exp(-(tt-6.2)*1.6):0);
  gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,3);
  if(tt>6.1&&tt<10){gl.useProgram(spP);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
    gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.enableVertexAttribArray(sL);gl.vertexAttribPointer(sL,4,gl.FLOAT,false,0,0);
    gl.uniform1f(sT,tt);gl.uniform1f(sA,cv.width/cv.height);gl.drawArrays(gl.POINTS,0,NS);gl.disableVertexAttribArray(sL);
    gl.enableVertexAttribArray(aL);}
  if(tt>=LOCK&&!locked){locked=true;lock();}
}
var slow=0,last=0;
function loop(now){if(!run)return;var tt=(now-t0)/1000;
  if(last&&now-last>40&&tt>1)slow++;last=now;
  if(slow>40&&DPR>.6){DPR*=.8;resize();slow=0;}   // adaptive: reduce render scale, never the design
  frame(Math.min(tt,90));requestAnimationFrame(loop);}
cv.addEventListener('webglcontextlost',function(e){e.preventDefault();run=false;lock();});

/* Sound — sparse, airy, expensive. Fixed pitches only (no glide, no converging chord:
   the opposite of Deep Note). Long hall, real silence between events. */
var AC,M,muted=false;
function audio(){var C=window.AudioContext||window.webkitAudioContext;if(!C)return;AC=new C();var o=AC.currentTime+.05;
  M=AC.createGain();M.gain.value=.8;M.connect(AC.destination);
  var L=AC.sampleRate*7|0,ir=AC.createBuffer(2,L,AC.sampleRate);
  for(var c=0;c<2;c++){var dd=ir.getChannelData(c),lp=0;for(var i=0;i<L;i++){var x=i/L;lp+=(Math.random()*2-1-lp)*(.5-.42*x);dd[i]=lp*Math.pow(1-x,2.6)*(i<AC.sampleRate*.03?0:1);}}
  var V=AC.createConvolver();V.buffer=ir;var vg=AC.createGain();vg.gain.value=.9;V.connect(vg);vg.connect(M);
  function out(n,dry,wet,pan){var p=AC.createStereoPanner?AC.createStereoPanner():AC.createGain();if(p.pan)p.pan.value=pan||0;n.connect(p);var a=AC.createGain();a.gain.value=dry;var w=AC.createGain();w.gain.value=wet;p.connect(a);p.connect(w);a.connect(M);w.connect(V);}
  var nb=AC.createBuffer(1,AC.sampleRate*3,AC.sampleRate),nd=nb.getChannelData(0);for(i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  function noise(){var s=AC.createBufferSource();s.buffer=nb;s.loop=true;return s;}
  function env(g,t,a,pk,rel){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.00001,t+a+rel);}
  // air: very low, breathing room tone
  var air=noise(),af=AC.createBiquadFilter();af.type='lowpass';af.frequency.value=520;var ag=AC.createGain();ag.gain.setValueAtTime(0,o);ag.gain.linearRampToValueAtTime(.035,o+3);ag.gain.setValueAtTime(.035,o+END-3);ag.gain.linearRampToValueAtTime(0,o+END+2);
  air.connect(af);af.connect(ag);out(ag,.6,.4);air.start(o);air.stop(o+END+3);
  // struck obsidian: few, clean, slightly detuned modal partials with long tails
  function glass(t,f0,amp,pan,len){[[1,1],[2.32,.5],[4.25,.22],[6.63,.1]].forEach(function(m,j){var fq=f0*m[0];if(fq>15000)return;
    [0,.7].forEach(function(det){var os=AC.createOscillator();os.frequency.value=fq+det*(j+1);var g=AC.createGain();env(g,t,.002,amp*m[1]*.5,len/(1+j*.6));os.connect(g);out(g,.35,.9,pan);os.start(t);os.stop(t+len+1);});});}
  glass(o+1.6,392,.05,-.3,7);                 // first sound: one distant tone in the dark
  // the corona rising: soft filtered swell (no pitch movement)
  var sw=noise(),sf=AC.createBiquadFilter();sf.type='bandpass';sf.Q.value=.6;sf.frequency.setValueAtTime(200,o+2.5);sf.frequency.exponentialRampToValueAtTime(1400,o+6.1);
  var sg=AC.createGain();sg.gain.setValueAtTime(0,o+2.5);sg.gain.linearRampToValueAtTime(.06,o+6.05);sg.gain.linearRampToValueAtTime(0,o+6.25);sw.connect(sf);sf.connect(sg);out(sg,.5,.8);sw.start(o+2.5);sw.stop(o+6.4);
  // fracture: crisp crack + a handful of chip ticks
  var F=o+6.2,ck=noise(),cf=AC.createBiquadFilter();cf.type='highpass';cf.frequency.value=2500;var cg=AC.createGain();env(cg,F,.0008,.35,.09);ck.connect(cf);cf.connect(cg);out(cg,.8,.6,.1);ck.start(F);ck.stop(F+.3);
  glass(F+.005,1318.5,.07,.15,3.5);
  [0.18,0.41,0.62,0.95,1.3,1.7].forEach(function(dt,k){glass(F+dt,2400+k*517,.018,(k%2?.5:-.5)*(1-k*.1),.7);});
  // title: one weighted landing — soft low body, warm fixed fifth, the opening tone returns an octave up
  var Tl=o+LOCK,bo=AC.createOscillator();bo.frequency.setValueAtTime(52,Tl);bo.frequency.exponentialRampToValueAtTime(38,Tl+1.2);var bg=AC.createGain();env(bg,Tl,.01,.32,2.6);bo.connect(bg);out(bg,1,.3);bo.start(Tl);bo.stop(Tl+4);
  [[98,-.25],[146.83,.25],[196,0]].forEach(function(p){var os=AC.createOscillator();os.type='triangle';os.frequency.value=p[0];var lf=AC.createBiquadFilter();lf.type='lowpass';lf.frequency.value=700;
    var g=AC.createGain();g.gain.setValueAtTime(0,Tl);g.gain.linearRampToValueAtTime(.028,Tl+1.6);g.gain.exponentialRampToValueAtTime(.00001,Tl+8);os.connect(lf);lf.connect(g);out(g,.5,.9,p[1]);os.start(Tl);os.stop(Tl+8.5);});
  glass(Tl+.02,784,.045,.2,8);
}
var mb=document.getElementById('mute');
mb.onclick=function(e){e.stopPropagation();muted=!muted;if(M)M.gain.setTargetAtTime(muted?0:.8,AC.currentTime,.05);mb.textContent=muted?'Sound off':'Sound on';};
function start(){document.getElementById('start').style.display='none';document.body.classList.remove('lock');locked=false;
  if(AC){try{AC.close()}catch(e){}AC=null;}
  if(reduce){frame(10);lock();return;}
  if(!muted)audio();t0=performance.now();last=0;run=true;requestAnimationFrame(loop);}
document.getElementById('go').onclick=start;
document.getElementById('replay').onclick=function(e){e.stopPropagation();start();};
document.getElementById('tap').onclick=function(){if(!run)return;var tt=(performance.now()-t0)/1000;
  if(tt<LOCK){t0=performance.now()-(LOCK+.4)*1000;if(M)M.gain.setTargetAtTime(0,AC.currentTime,.1);lock();locked=true;}};
if(reduce){frame(10);lock();document.getElementById('start').style.display='none';}else frame(.1);
})();
