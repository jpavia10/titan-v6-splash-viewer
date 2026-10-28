/* Titan Reliquary — Obsidian Sun · GOLD STANDARD intro engine
   Raw WebGL1, zero dependencies. All motion is computed on the GPU per-particle
   (closed-form drag-ballistics + curl-style swirl + shockwave), all sound is
   original Web Audio synthesis. No THX, no Deep Note, no Droste. */
(function(){
'use strict';
var Q=new URLSearchParams(location.search);
var cv=document.getElementById('gl');
var gl=cv.getContext('webgl',{antialias:false,alpha:false,premultipliedAlpha:false,powerPreference:'high-performance'});
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||Q.get('still')==='1';
if(!gl){document.body.classList.add('lock');document.getElementById('start').remove();return;}

/* ---------- quality tiers ---------- */
var mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
var tier=Q.get('tier')||(mobile?((navigator.hardwareConcurrency||4)>=8?'mid':'low'):'high');
var T={high:{sh:42000,em:22000,as:14000,dpr:2.0},mid:{sh:20000,em:10000,as:7000,dpr:1.5},low:{sh:7000,em:4000,as:2500,dpr:1.0}}[tier]||{sh:20000,em:10000,as:7000,dpr:1.5};
var DPR=Math.min(devicePixelRatio||1,T.dpr);

function resize(){var w=innerWidth,h=innerHeight;cv.width=Math.round(w*DPR);cv.height=Math.round(h*DPR);gl.viewport(0,0,cv.width,cv.height);}
addEventListener('resize',resize);resize();

function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s;}
function prog(vs,fs){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw gl.getProgramInfoLog(p);return p;}
var hp='precision highp float;\n';

/* ---------- background: obsidian sun eclipse, volumetric haze, god-rays ---------- */
var bgFS=hp+`
uniform vec2 R;uniform float t,bloom,lock,shock;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float haze(vec2 p){return fbm(p*1.6+vec2(t*.03,-t*.05))*fbm(p*.7-vec2(t*.02,0.));}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;           // portrait-safe: scaled by height
 vec2 sun=vec2(0.,.06);
 vec2 d=uv-sun;float r=length(d);
 float disk=.155+.0012*sin(atan(d.y,d.x)*7.+t);
 // corona: hot rim + fbm filaments
 float ang=atan(d.y,d.x);
 float fil=fbm(vec2(ang*3.,r*6.-t*.4));
 float corona=exp(-max(r-disk,0.)*14.)*smoothstep(disk-.004,disk+.002,r);
 corona*=.55+.9*fil;
 // god rays: march toward the sun through occluding haze
 vec2 p=uv;vec2 st=(sun-uv)/28.;float acc=0.,w=1.;
 for(int i=0;i<28;i++){p+=st;float q=length(p-sun);float occ=step(disk,q);acc+=w*occ*exp(-q*5.)*(.35+haze(p*2.));w*=.955;}
 acc/=17.;
 float on=smoothstep(.2,2.6,bloom);
 vec3 hot=vec3(1.,.55,.18),gold=vec3(1.,.82,.5);
 vec3 col=vec3(.004,.003,.006);
 col+=hot*acc*on*(1.1+.6*lock);
 col+=mix(hot,gold,.5)*corona*on*(1.4+lock);
 col+=vec3(.035,.022,.018)*haze(uv*1.3)*(.25+.6*on);       // drifting smoke volume
 col*=1.-smoothstep(disk+.002,disk-.002,r)*.98;      // the black sun itself
 col+=gold*.9*exp(-abs(r-shock)*60.)*step(.001,shock)*(1.-smoothstep(.2,1.6,shock)); // impact ring
 col*=1.-.55*dot(uv*vec2(1.2,.8),uv*vec2(1.2,.8)); // vignette
 col=col/(1.+col);col=pow(col,vec3(.85));
 col+=(h(gl_FragCoord.xy+t)-.5)/255.;               // dither, kills banding
 gl_FragColor=vec4(col,1.);
}`;
var bgP=prog('attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}',bgFS);
var quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);

/* ---------- particles: one program, three species ---------- */
var pVS=hp+`
attribute vec4 s;   // random seeds
attribute float k;  // 0 shard, 1 ember, 2 ash
uniform mat4 P,V;uniform float t,bloom,shock,lock,H;
varying vec4 vC;varying float vK,vRot,vGl;
vec3 dir(vec4 r){float z=r.x*2.-1.,a=r.y*6.2831853;float q=sqrt(1.-z*z);return vec3(q*cos(a),z,q*sin(a));}
vec3 swirl(vec3 p,float tt){ // divergence-free-ish analytic swirl field
 return vec3(sin(p.y*.7+tt*.5)+cos(p.z*.6-tt*.3),sin(p.z*.5+tt*.4)+cos(p.x*.8+tt*.2),sin(p.x*.6-tt*.35)+cos(p.y*.5+tt*.45))*.5;}
void main(){
 vec3 p;float size,a=1.;vK=k;vGl=0.;vRot=s.w*6.28+t*(s.z-.5)*2.;
 if(k<.5){
  vec3 d=dir(s);d.z*=1.6;                         // elongate along camera axis → fly-through depth
  float te=max(t-bloom,0.);float sp=2.+9.*pow(s.z,1.6);float kd=.9+s.w*.8;
  float rad=.15+sp*(1.-exp(-kd*te))/kd;             // closed-form drag ballistics
  p=d*rad;
  float ang=te*.12/(.4+rad*.15);float c=cos(ang),sn=sin(ang);p.xz=mat2(c,-sn,sn,c)*p.xz; // orbital shear
  p+=swirl(p,t)*.18*min(te,1.);
  float sw=exp(-pow((length(p)-shock*11.)*1.4,2.));p+=normalize(p+1e-4)*sw*.6; // title-impact shockwave
  size=(.014+.065*pow(s.x*s.y,.5))*(1.+.6*sw);
  a=smoothstep(0.,.35,te);
  vec3 L=normalize(vec3(0.,.15,-1.));             // backlight from the black sun
  float fl=fract(s.y*91.7+s.z*13.1);
  vGl=pow(max(0.,sin(vRot*3.+t*(1.+fl*3.)+fl*40.)),24.)+sw*.8; // conchoidal glints
  vC=vec4(.02,.015,.02,a);
 } else if(k<1.5){
  float life=fract(s.x+t*(.08+.12*s.y));
  vec3 o=vec3((s.y-.5)*9.,-6.5,(s.z-.5)*9.-1.);
  p=o+vec3(0.,life*13.,0.);
  p+=swirl(p*.8,t*1.3+s.w*6.)*(.6+life*1.4);
  float burst=smoothstep(0.,.6,t-bloom)*exp(-(t-bloom)*.35);
  size=.018+.03*s.w*(1.-life);
  float ign=smoothstep(.0,.08,life)*(1.-smoothstep(.6,1.,life));
  a=ign*(.25+.75*smoothstep(.3,2.,t))*(1.+2.5*burst+1.2*lock);
  vec3 hot=mix(vec3(1.,.35,.06),vec3(1.,.8,.45),pow(1.-life,3.));
  vC=vec4(hot,a);
 } else {
  vec3 o=(s.xyz-.5)*vec3(16.,22.,18.);
  o.y=mod(o.y-t*(.15+.2*s.w),22.)-11.;
  p=o+swirl(o*.4,t*.4)*.8;
  size=.012+.02*s.w;a=.18*smoothstep(0.,3.,t);
  vC=vec4(vec3(.55,.5,.47),a);
 }
 vec4 v=V*vec4(p,1.);
 gl_Position=P*v;
 gl_PointSize=clamp(size*H/max(-v.z,.1),1.,k<.5?72.:40.);
 vC.a*=smoothstep(.2,1.2,-v.z);                  // fade when too close to lens
}`;
var pFS=hp+`
varying vec4 vC;varying float vK,vRot,vGl;
void main(){
 vec2 q=gl_PointCoord*2.-1.;
 if(vK<.5){
  float c=cos(vRot),s=sin(vRot);q=mat2(c,-s,s,c)*q;
  float shard=abs(q.x)*1.9+abs(q.y)*.75+.25*q.x*q.y;   // asymmetric knapped flake
  if(shard>1.)discard;
  vec3 nrm=normalize(vec3(q*vec2(1.6,.6),.6));
  float fres=pow(1.-nrm.z,3.);
  float spec=pow(max(dot(nrm,normalize(vec3(.2,.6,.8))),0.),30.);
  vec3 col=vC.rgb+vec3(1.,.62,.28)*fres*.9+vec3(1.,.9,.7)*(spec*.6+vGl*2.2);
  gl_FragColor=vec4(col,vC.a*(.85+.15*fres));
 } else {
  float d=dot(q,q);if(d>1.)discard;
  float g=exp(-d*4.)+.35*exp(-d*14.)*float(vK<1.5);
  gl_FragColor=vec4(vC.rgb*g*vC.a,0.);          // additive (premult, alpha 0)
 }
}`;
var pP=prog(pVS,pFS);
function species(n,kind){var a=new Float32Array(n*5);for(var i=0;i<n;i++){a[i*5]=Math.random();a[i*5+1]=Math.random();a[i*5+2]=Math.random();a[i*5+3]=Math.random();a[i*5+4]=kind;}var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);return{b:b,n:n};}
var S=[species(T.as,2),species(T.sh,0),species(T.em,1)];
var U={};['P','V','t','bloom','shock','lock','H'].forEach(function(u){U[u]=gl.getUniformLocation(pP,u)});
var B={};['R','t','bloom','lock','shock'].forEach(function(u){B[u]=gl.getUniformLocation(bgP,u)});
var aS=gl.getAttribLocation(pP,'s'),aK=gl.getAttribLocation(pP,'k'),aQ=gl.getAttribLocation(bgP,'a');

/* ---------- camera ---------- */
function persp(f,asp,n,fa){var y=1/Math.tan(f/2);return[y/asp,0,0,0,0,y,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0];}
function look(e,c){var z=norm([e[0]-c[0],e[1]-c[1],e[2]-c[2]]),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1];}
function norm(v){var l=Math.hypot(v[0],v[1],v[2]);return[v[0]/l,v[1]/l,v[2]/l];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function ease(x){x=Math.min(Math.max(x,0),1);return x*x*(3-2*x);}

/* ---------- timeline (seconds) ----------
   0.0 void · embers breathe · sub swell
   2.4 BLOOM: obsidian core fractures, shard volume detonates outward, camera dollies INTO it
   5.6 TITLE LOCK: impact, shockwave rides through the shards
   6.0–11 hold: slow orbit, glints, ash fall  */
var BLOOM=2.4,LOCK=5.6,END=11;
var t0=0,running=false,locked=false;

function frame(tt){
 var asp=cv.width/cv.height;
 var dol=ease((tt-1)/7.5);
 var orb=Math.sin(tt*.18)*.35*ease((tt-BLOOM)/3);
 var r=15-9.5*dol;
 var eye=[Math.sin(orb)*r,.6-.4*dol+Math.sin(tt*.31)*.12,Math.cos(orb)*r];
 var fov=asp<1?1.05:.8;  // portrait gets taller FOV: the scene fills 9:16, no letterbox
 var shock=tt>LOCK?(tt-LOCK)*.9:0;
 gl.disable(gl.BLEND);gl.useProgram(bgP);
 gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(aQ);gl.vertexAttribPointer(aQ,2,gl.FLOAT,false,0,0);
 gl.uniform2f(B.R,cv.width,cv.height);gl.uniform1f(B.t,tt);gl.uniform1f(B.bloom,Math.max(tt-BLOOM+1,0));gl.uniform1f(B.lock,ease((tt-LOCK)/1.5));gl.uniform1f(B.shock,shock*.5);
 gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(aQ);
 gl.useProgram(pP);
 gl.uniformMatrix4fv(U.P,false,persp(fov,asp,.05,80));gl.uniformMatrix4fv(U.V,false,look(eye,[0,.3,0]));
 gl.uniform1f(U.t,tt);gl.uniform1f(U.bloom,BLOOM);gl.uniform1f(U.shock,shock);gl.uniform1f(U.lock,ease((tt-LOCK)/2));gl.uniform1f(U.H,cv.height*.9);
 gl.enable(gl.BLEND);
 gl.enableVertexAttribArray(aS);gl.enableVertexAttribArray(aK);
 for(var i=0;i<3;i++){var sp=S[i];
  if(i===1)gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);else gl.blendFunc(gl.ONE,gl.ONE);
  gl.bindBuffer(gl.ARRAY_BUFFER,sp.b);gl.vertexAttribPointer(aS,4,gl.FLOAT,false,20,0);gl.vertexAttribPointer(aK,1,gl.FLOAT,false,20,16);
  gl.drawArrays(gl.POINTS,0,sp.n);}
 if(tt>=LOCK&&!locked){locked=true;document.body.classList.add('lock');}
}

/* adaptive perf: if frames run long, drop resolution once, then particle count */
var acc=0,cnt=0,lastNow=0,downgrades=0;
function loop(now){
 if(!running)return;
 var tt=(now-t0)/1000;
 if(lastNow){acc+=now-lastNow;cnt++;if(cnt===45){if(acc/cnt>22&&downgrades<2){downgrades++;if(downgrades===1){DPR=Math.max(1,DPR*.7);resize();}else S.forEach(function(s){s.n=Math.floor(s.n*.55)});}acc=0;cnt=0;}}
 lastNow=now;
 frame(Math.min(tt,60));
 requestAnimationFrame(loop);
}
cv.addEventListener('webglcontextlost',function(e){e.preventDefault();running=false;document.body.classList.add('lock');});

/* ---------- sound: original Web Audio score ----------
   Design rule: NO Deep Note. No converging glissando chord, no resolve-to-D,
   no 18-voice swarm. Instead: fixed-pitch tension cluster that only OPENS
   (filter) and swells (gain); inharmonic glass impacts; sub drop; whoosh; hall. */
var AC=null,master=null,muted=false;
function audio(){
 var C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 AC=new C();var now=AC.currentTime+.05;
 master=AC.createGain();master.gain.value=.9;
 var comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
 master.connect(comp);comp.connect(AC.destination);
 // procedural hall IR (4.5 s, stereo decorrelated)
 var len=AC.sampleRate*4.5|0,ir=AC.createBuffer(2,len,AC.sampleRate);
 for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var i=0;i<len;i++){var x=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-x,3.2)*(i<200?i/200:1);}}
 var verb=AC.createConvolver();verb.buffer=ir;var vg=AC.createGain();vg.gain.value=.55;verb.connect(vg);vg.connect(master);
 function out(node,dry,wet,pan){var p=AC.createStereoPanner?AC.createStereoPanner():null;var g=AC.createGain();g.gain.value=dry;var w=AC.createGain();w.gain.value=wet;
  if(p){p.pan.value=pan||0;node.connect(p);p.connect(g);p.connect(w);}else{node.connect(g);node.connect(w);}g.connect(master);w.connect(verb);}
 var nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),nd=nb.getChannelData(0);for(i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 function noise(){var s=AC.createBufferSource();s.buffer=nb;s.loop=true;return s;}
 function env(g,t,a,peak,hold,rel){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setValueAtTime(peak,t+a+hold);g.gain.exponentialRampToValueAtTime(.0001,t+a+hold+rel);}

 // 1) sub bed: 36 Hz sine + 2nd harmonic, slow swell (fixed pitch)
 var sub=AC.createOscillator();sub.frequency.value=36;var sg=AC.createGain();env(sg,now,2.2,.35,LOCK-2,4);sub.connect(sg);out(sg,1,.1);sub.start(now);sub.stop(now+END+2);
 // 2) volcanic air bed: lowpassed noise, breathing
 var air=noise(),af=AC.createBiquadFilter();af.type='bandpass';af.frequency.value=380;af.Q.value=.7;var ag=AC.createGain();env(ag,now,1.5,.05,END-4,3);
 var lfo=AC.createOscillator();lfo.frequency.value=.13;var lg=AC.createGain();lg.gain.value=180;lfo.connect(lg);lg.connect(af.frequency);lfo.start(now);
 air.connect(af);af.connect(ag);out(ag,.8,.6);air.start(now);air.stop(now+END+2);
 // 3) tension cluster riser — FIXED pitches (A1,E2,Bb2,F3,C4 : stacked fifths + tritone), opens via filter, never glides
 [55,82.41,116.54,174.61,261.63].forEach(function(f,j){[-7,7].forEach(function(dt){
  var o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt+j*1.3;
  var lp=AC.createBiquadFilter();lp.type='lowpass';lp.Q.value=4;lp.frequency.setValueAtTime(120,now);lp.frequency.exponentialRampToValueAtTime(3800,now+BLOOM+.02);lp.frequency.exponentialRampToValueAtTime(500,now+BLOOM+1.6);
  var g=AC.createGain();g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.022,now+BLOOM);g.gain.exponentialRampToValueAtTime(.0001,now+BLOOM+2.4);
  o.connect(lp);lp.connect(g);out(g,.7,.7,(j-2)*.3*(dt>0?1:-1));o.start(now);o.stop(now+BLOOM+3);});});
 // 4) reverse-swell noise riser into the fracture
 var rs=noise(),rf=AC.createBiquadFilter();rf.type='highpass';rf.frequency.setValueAtTime(300,now+.4);rf.frequency.exponentialRampToValueAtTime(6000,now+BLOOM);
 var rg=AC.createGain();rg.gain.setValueAtTime(0,now+.4);rg.gain.exponentialRampToValueAtTime(.12,now+BLOOM-.01);rg.gain.linearRampToValueAtTime(0,now+BLOOM+.02);
 rs.connect(rf);rf.connect(rg);out(rg,.6,.5);rs.start(now+.4);rs.stop(now+BLOOM+.1);
 // 5) FRACTURE: obsidian glass — inharmonic modal partials, scattered grains, panned
 function glass(t,amp,base,pan){[1,2.76,5.40,8.93,13.34].forEach(function(r,j){var fq=base*r*(1+(Math.random()-.5)*.01);if(fq>16000)return;var o=AC.createOscillator();o.frequency.value=fq;
  var g=AC.createGain();env(g,t,.001,amp/(j+1),0,.25+1.4/(j+1));o.connect(g);out(g,.5,.8,pan);o.start(t);o.stop(t+2);});
  var tick=noise(),hf=AC.createBiquadFilter();hf.type='highpass';hf.frequency.value=5000;var tg=AC.createGain();env(tg,t,.0005,amp*.8,0,.04);tick.connect(hf);hf.connect(tg);out(tg,.6,.4,pan);tick.start(t);tick.stop(t+.1);}
 glass(now+BLOOM,.22,880,0);
 for(i=0;i<46;i++){var tg_=now+BLOOM+Math.pow(Math.random(),2.2)*2.2;glass(tg_,.05+Math.random()*.06,1200+Math.random()*3800,Math.random()*2-1);}
 // 6) fracture body: low thud + crack noise
 var th=AC.createOscillator();th.frequency.setValueAtTime(110,now+BLOOM);th.frequency.exponentialRampToValueAtTime(40,now+BLOOM+.5);var thg=AC.createGain();env(thg,now+BLOOM,.003,.6,0,1.2);th.connect(thg);out(thg,1,.3);th.start(now+BLOOM);th.stop(now+BLOOM+2);
 // 7) whoosh — band-passed noise sweeping L→R as camera dives through the shard volume
 var wh=noise(),wf=AC.createBiquadFilter();wf.type='bandpass';wf.Q.value=1.4;wf.frequency.setValueAtTime(400,now+BLOOM+.3);wf.frequency.exponentialRampToValueAtTime(2600,now+BLOOM+1.6);wf.frequency.exponentialRampToValueAtTime(300,now+LOCK-.2);
 var wg=AC.createGain();env(wg,now+BLOOM+.3,1.2,.16,.4,1.6);var wp=AC.createStereoPanner?AC.createStereoPanner():null;
 if(wp){wp.pan.setValueAtTime(-.8,now+BLOOM+.3);wp.pan.linearRampToValueAtTime(.8,now+LOCK);wh.connect(wf);wf.connect(wp);wp.connect(wg);}else{wh.connect(wf);wf.connect(wg);}
 out(wg,.8,.5);wh.start(now+BLOOM+.3);wh.stop(now+LOCK+1);
 // 8) TITLE LOCK impact: pre-suck, sub drop 70→26 Hz, braam-ish fixed low fifth, metallic strike, long hall tail
 var L=now+LOCK;
 var boom=AC.createOscillator();boom.frequency.setValueAtTime(70,L);boom.frequency.exponentialRampToValueAtTime(26,L+1.8);var bg=AC.createGain();env(bg,L,.004,.9,.1,3);boom.connect(bg);out(bg,1,.25);boom.start(L);boom.stop(L+5);
 var hit=noise(),hlp=AC.createBiquadFilter();hlp.type='lowpass';hlp.frequency.setValueAtTime(5000,L);hlp.frequency.exponentialRampToValueAtTime(200,L+.6);var hg=AC.createGain();env(hg,L,.001,.5,0,.7);hit.connect(hlp);hlp.connect(hg);out(hg,.8,.9);hit.start(L);hit.stop(L+1);
 [[73.42,0],[110,0],[146.83,.3]].forEach(function(p){var o=AC.createOscillator();o.type='sawtooth';o.frequency.value=p[0];var f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(1800,L);f.frequency.exponentialRampToValueAtTime(160,L+3.5);
  var g=AC.createGain();env(g,L,.02,.07,.3,3.6);o.connect(f);f.connect(g);out(g,.7,.9,p[1]);o.start(L);o.stop(L+5);});
 glass(L+.01,.18,523,-.2);glass(L+.03,.14,784,.2);
 // 9) hold shimmer: high glassy partials, fixed, fading
 [1567.98,2349.32,3135.96].forEach(function(f,j){var o=AC.createOscillator();o.frequency.value=f;var g=AC.createGain();env(g,L+.8,2.,.012,1.5,3.5);
  var tr=AC.createOscillator();tr.frequency.value=4.5+j;var tg2=AC.createGain();tg2.gain.value=.006;tr.connect(tg2);tg2.connect(g.gain);tr.start(L+.8);tr.stop(L+9);
  o.connect(g);out(g,.3,1,(j-1)*.6);o.start(L+.8);o.stop(L+9);});
}

var muteB=document.getElementById('mute');
muteB.onclick=function(e){e.stopPropagation();muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.9,AC.currentTime,.05);muteB.textContent=muted?'🔇 Muted':'🔊 Sound';};
function start(withSound){
 document.getElementById('start').style.display='none';
 document.body.classList.remove('lock');locked=false;
 if(AC){try{AC.close()}catch(e){}AC=null;}
 if(reduce){frame(8);document.body.classList.add('lock');return;}
 if(withSound&&!muted)audio();
 t0=performance.now();lastNow=0;running=true;requestAnimationFrame(loop);
}
document.getElementById('go').onclick=function(){start(true)};
document.getElementById('replay').onclick=function(e){e.stopPropagation();start(true)};
document.getElementById('tap').onclick=function(){ // tap-to-skip → jump to held title
 if(!running)return;var tt=(performance.now()-t0)/1000;
 if(tt<LOCK){t0=performance.now()-(LOCK+.5)*1000;if(AC){master.gain.setTargetAtTime(0,AC.currentTime,.08);}document.body.classList.add('lock');locked=true;}
};
frame(reduce?8:0.5);
if(reduce){document.body.classList.add('lock');document.getElementById('start').style.display='none';}
})();
