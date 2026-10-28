// v4 timed intro. three.js r160 (MIT): MeshPhysicalMaterial, RGBELoader+PMREM (Poly Haven CC0 HDRI), ConvexGeometry, UnrealBloomPass.
import * as THREE from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const Q=new URLSearchParams(location.search),FREEZE=Q.has('t')?+Q.get('t'):null;
const R=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(2024);
const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);},mix=(a,b,k)=>a+(b-a)*k;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0);
const cam=new THREE.PerspectiveCamera(36,1,.05,100);
const pm=new THREE.PMREMGenerator(renderer);
new RGBELoader().load('studio.hdr',t=>{t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=pm.fromEquirectangular(t).texture;t.dispose();ready=true;});
let ready=false;

// imperfection map: polish scratches, pits, conchoidal ripple rings
const scratch=(()=>{const N=1024,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');g.fillStyle='#202020';g.fillRect(0,0,N,N);
  for(let i=0;i<40;i++){const x=R()*N,y=R()*N;for(let k=1;k<10;k++){g.strokeStyle=`rgba(70,70,70,${.3/k})`;g.lineWidth=1.2;g.beginPath();g.arc(x,y,k*9+R()*4,0,6.3);g.stroke();}}
  const a0=R()*3;for(let i=0;i<600;i++){const x=R()*N,y=R()*N,a=a0+(R()-.5)*.5,l=15+R()*R()*320;g.strokeStyle=`rgba(220,220,220,${.12+R()*.45})`;g.lineWidth=R()<.9?.5:1.2;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  for(let i=0;i<1500;i++){g.fillStyle=`rgba(210,210,210,${R()*.5})`;g.fillRect(R()*N,R()*N,1+R()*1.5,1+R()*1.5);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;})();

function fixWind(geo){const a=geo.attributes.position.array;for(let i=0;i<a.length;i+=9){const A=new THREE.Vector3(a[i],a[i+1],a[i+2]),B=new THREE.Vector3(a[i+3],a[i+4],a[i+5]),C=new THREE.Vector3(a[i+6],a[i+7],a[i+8]);
  const n=B.clone().sub(A).cross(C.clone().sub(A)),c=A.clone().add(B).add(C);if(n.dot(c)<0)for(let k=0;k<3;k++){const t=a[i+3+k];a[i+3+k]=a[i+6+k];a[i+6+k]=t;}}}
const L=1.5,W=.7,T=.34;
const surf=(u,v,sd)=>{const prof=Math.pow(Math.max(0,1-Math.abs(u)),.6)*(u>0?Math.pow(1-u,.3):1);return new THREE.Vector3(v*W*prof,u*L,sd*T*prof*Math.sqrt(Math.max(0,1-v*v)));};
const nrm=(u,v,sd)=>{const e=.01,p=surf(u,v,sd),a=surf(Math.min(u+e,.99),v,sd).sub(p),b=surf(u,Math.max(-1,Math.min(1,v+e)),sd).sub(p);const n=a.cross(b).normalize();if(n.z*sd<0)n.negate();return n;};
function knapped(){
  const pts=[];for(let i=0;i<140;i++)for(let j=0;j<=44;j++)for(const sd of[-1,1])pts.push(surf((-1+2*i/139)*.995,-1+2*j/44,sd));
  const clip=(c,n)=>{for(const p of pts){const d=p.clone().sub(c).dot(n);if(d>0)p.addScaledVector(n,-d);}};
  // primary flakes: struck from the margin, scar runs toward the midline (tilt outward), many small, layered
  for(let k=0;k<420;k++){const u=(R()*2-1)*.93,sd=k%2?1:-1,v=(R()<.5?-1:1)*(.25+R()*.72);
    const c=surf(u,v,sd),n=nrm(u,Math.max(-.97,Math.min(.97,v)),sd);n.x+=Math.sign(v)*(.15+.5*R());n.y+=(R()-.5)*.6;n.normalize();
    c.addScaledVector(n,-(.003+R()*R()*.014));clip(c,n);}
  for(let k=0;k<500;k++){const u=(R()*2-1)*.96,v=R()<.5?-1:1,sd=R()<.5?-1:1;const c=surf(u,v*.97,sd),n=nrm(u,v*.9,sd);n.x+=v*(.5+R()*.6);n.y+=(R()-.5)*.6;n.normalize();c.addScaledVector(n,-(.002+R()*.006));clip(c,n);}
  let g=new ConvexGeometry(pts);g=g.index?g.toNonIndexed():g;fixWind(g);g.computeVertexNormals();
  const p=g.attributes.position,uv=new Float32Array(p.count*2),thin=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);uv[i*2]=x*.6+.5+z*.3;uv[i*2+1]=y*.3+.5;
    const u=y/L,prof=Math.pow(Math.max(0,1-Math.abs(u)),.6)*(u>0?Math.pow(1-u,.3):1)+1e-3;thin[i]=Math.pow(Math.min(1,Math.abs(x)/(W*prof)),6)*.85+Math.pow(Math.max(0,u),8)*.6;}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('thin',new THREE.BufferAttribute(thin,1));return g;}
const geo=knapped();
const mat=new THREE.MeshPhysicalMaterial({color:0x050406,roughness:.16,roughnessMap:scratch,bumpMap:scratch,bumpScale:1.1,ior:1.49,
  clearcoat:1,clearcoatRoughness:.09,specularIntensity:.7,clearcoatRoughnessMap:scratch,iridescence:.55,iridescenceIOR:1.7,iridescenceThicknessRange:[180,520],
  sheen:.15,sheenRoughness:.4,sheenColor:new THREE.Color(0x6a4a7a),envMapIntensity:1,flatShading:true,emissive:0xff7a2a,emissiveIntensity:0});
// thin-edge glow: per-vertex thinness mask drives emissive (backlit amber where the glass is thin), no transmission (avoids v3 bloom NaN squares)
mat.onBeforeCompile=s=>{s.uniforms.glow={value:0};mat.userData.s=s;
  s.vertexShader='attribute float thin;varying float vThin;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvThin=thin;');
  s.fragmentShader='uniform float glow;varying float vThin;\n'+s.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nif(any(isnan(gl_FragColor))||any(isinf(gl_FragColor)))gl_FragColor=vec4(0,0,0,1);gl_FragColor.rgb=min(gl_FragColor.rgb,vec3(6.));').replace('vec3 totalEmissiveRadiance = emissive;',
   'vec3 totalEmissiveRadiance = vec3(1.,.42,.12)*glow*vThin*(0.6+0.4*pow(1.-abs(dot(normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition))),normalize(vViewPosition))),2.));');};
const hero=new THREE.Mesh(geo,mat);hero.castShadow=true;const rig=new THREE.Group();rig.add(hero);scene.add(rig);
// floor + chips
const floor=new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshStandardMaterial({color:0x0a0a0b,roughness:.55,envMapIntensity:.06}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.9;floor.receiveShadow=true;scene.add(floor);
const chipMat=mat.clone();chipMat.onBeforeCompile=()=>{};chipMat.iridescence=0;chipMat.sheen=0;chipMat.envMapIntensity=.35;
for(let i=0;i<9;i++){const ps=[];for(let k=0;k<14;k++)ps.push(new THREE.Vector3((R()-.5)*.13,(R()-.5)*.03,(R()-.5)*.09));let g=new ConvexGeometry(ps);g=g.index?g.toNonIndexed():g;fixWind(g);g.computeVertexNormals();
  const m=new THREE.Mesh(g,chipMat);m.position.set((R()-.5)*1.5,-1.88,-R()*1);m.rotation.y=R()*6;m.castShadow=true;scene.add(m);}
// lights
const key=new THREE.SpotLight(0xffb070,0,14,.4,.6,2);key.position.set(2.6,3.2,2.4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;scene.add(key,key.target);
const rim=new THREE.SpotLight(0x8fb4ff,0,14,.5,.8,2);rim.position.set(-2.4,1.6,-3.2);scene.add(rim,rim.target);
const back=new THREE.PointLight(0xff6a20,0,5,2);back.position.set(0,.2,-1.1);scene.add(back);
// dust accent
const dN=36,dp=new Float32Array(dN*3);for(let i=0;i<dN;i++){dp[i*3]=(R()-.5)*1.6+.9;dp[i*3+1]=(R()-.3)*3;dp[i*3+2]=(R()-.5)*1.5+.8;}
const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
const dmat=new THREE.PointsMaterial({color:0xffd2a0,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});scene.add(new THREE.Points(dg,dmat));
const comp=new EffectComposer(renderer);comp.addPass(new RenderPass(scene,cam));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.22,.35,1.6);comp.addPass(bloom);comp.addPass(new OutputPass());
let land=false;function size(){const w=innerWidth,h=innerHeight;land=w>h;renderer.setSize(w,h);comp.setSize(w,h);cam.aspect=w/h;cam.fov=land?34:38;cam.updateProjectionMatrix();}addEventListener('resize',size);size();

// ---- original WebAudio SFX (synth only, no music)
let ac=null,muted=false,master=null;const fired={};
function audio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=muted?0:.7;master.connect(ac.destination);}
function noise(d){const b=ac.createBuffer(1,ac.sampleRate*d,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1;const s=ac.createBufferSource();s.buffer=b;return s;}
const SFX={
 swell(){const t=ac.currentTime,o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();o.type='sawtooth';o2.type='sawtooth';o.frequency.value=48.9;o2.frequency.value=49.4;f.type='lowpass';f.frequency.setValueAtTime(80,t);f.frequency.exponentialRampToValueAtTime(900,t+4.5);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22,t+4);g.gain.exponentialRampToValueAtTime(.001,t+11);o.connect(f);o2.connect(f);f.connect(g).connect(master);o.start(t);o2.start(t);o.stop(t+11);o2.stop(t+11);},
 glass(){const t=ac.currentTime;[2637,3951,5274,6643].forEach((fq,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=fq*(1+(Math.random()-.5)*.004);g.gain.setValueAtTime(.06/(i+1),t);g.gain.exponentialRampToValueAtTime(1e-4,t+2.4-i*.4);o.connect(g).connect(master);o.start(t);o.stop(t+2.5);});},
 crack(){const t=ac.currentTime,n=noise(.4),f=ac.createBiquadFilter(),g=ac.createGain();f.type='bandpass';f.frequency.value=3200;f.Q.value=1.5;g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(1e-3,t+.35);n.connect(f).connect(g).connect(master);n.start(t);
  const o=ac.createOscillator(),g2=ac.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.5);g2.gain.setValueAtTime(.35,t);g2.gain.exponentialRampToValueAtTime(1e-3,t+.6);o.connect(g2).connect(master);o.start(t);o.stop(t+.7);},
 land(){const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(32,t+1.8);g.gain.setValueAtTime(.45,t);g.gain.exponentialRampToValueAtTime(1e-3,t+2.4);o.connect(g).connect(master);o.start(t);o.stop(t+2.5);
  const n=noise(2),f=ac.createBiquadFilter(),g2=ac.createGain();f.type='highpass';f.frequency.value=6000;g2.gain.setValueAtTime(.05,t);g2.gain.exponentialRampToValueAtTime(1e-4,t+2);n.connect(f).connect(g2).connect(master);n.start(t);}};
const CUES=[[1.2,'swell'],[4.6,'glass'],[8.2,'crack'],[10.2,'land'],[12.4,'glass']];

// ---- timeline (14.5s): 0-1.5 dark · 1.5-5 reveal (rim sweep then key) · 5-8 craft hold · 8.2 edge-glow crack · 10.2 title · 12-14.5 hold/fade
const DUR=14.5,title=document.getElementById('title'),veil=document.getElementById('veil');
let t0=null,offset=0,playing=false;
function pose(t){
  const rev=ss(1.5,5,t),hold=ss(5,9,t);
  rim.intensity=mix(0,90,ss(1.2,3.2,t));key.intensity=mix(0,260,ss(2.6,5,t));
  scene.environmentIntensity=mix(0,.9,ss(2.8,6,t));
  rim.position.x=mix(-4,-2.4,ss(1.2,4,t));key.position.x=2.6+Math.sin(t*.35)*.6;
  const g=ss(7.9,8.5,t)*(1-.55*ss(8.6,10.5,t));back.intensity=g*10;if(mat.userData.s)mat.userData.s.uniforms.glow.value=g*5.0;
  dmat.opacity=.5*ss(5,8,t);
  // camera: start tight macro on the tip, pull out & arc to hero 3/4, slow push-in during hold; title beat lifts camera slightly
  const a=mix(.9,-.35,ss(1.2,7,t))+(t-7)*.015,r=mix(2.6,land?7.4:6.2,ss(1.2,6.5,t))-ss(7,14.5,t)*.5,y=mix(1.1,.3,ss(1.2,6.5,t))-ss(10,14.5,t)*.15;
  cam.position.set(Math.sin(a)*r,y,Math.cos(a)*r);cam.lookAt(0,mix(.8,-.1,ss(1.2,6.5,t))-ss(10,13,t)*.35,0);
  rig.rotation.set(.1,mix(1.4,-.2,ss(1,9,t))+(t-9)*.03,-.07);
  title.style.opacity=ss(10.2,11.4,t);title.style.transform=`translateY(${(1-ss(10.2,11.6,t))*14}px)`;title.style.letterSpacing=mix(.9,.6,ss(10.2,12,t))+'em';
  veil.style.opacity=Math.max(1-ss(.2,2,t),ss(13.6,14.5,t)*.0);
}
function now(){return FREEZE!=null?FREEZE:playing?(performance.now()-t0)/1000+offset:offset;}
function frame(){const t=Math.min(now(),DUR);pose(t);
  const d=dg.attributes.position;for(let i=0;i<dN;i++)d.array[i*3+1]+=.0007*Math.sin(i+t*.3);d.needsUpdate=true;
  if(playing&&ac)for(const [ct,n] of CUES)if(t>=ct&&!fired[ct]){fired[ct]=1;if(t-ct<.3)SFX[n]();}
  if(t>=DUR&&playing){playing=false;offset=DUR;document.getElementById('replay').style.display='';document.getElementById('skip').style.display='none';}
  comp.render();requestAnimationFrame(frame);}
function play(){audio();ac.resume();for(const k in fired)delete fired[k];offset=0;t0=performance.now();playing=true;document.getElementById('start').style.display='none';document.getElementById('replay').style.display='none';document.getElementById('skip').style.display='';}
document.getElementById('start').onclick=play;document.getElementById('replay').onclick=play;
document.getElementById('skip').onclick=e=>{e.stopPropagation();if(playing){offset=11.6;t0=performance.now();for(const [ct] of CUES)if(ct<11.6)fired[ct]=1;}};
document.getElementById('mute').onclick=e=>{muted=!muted;e.target.textContent=muted?'sound off':'sound on';if(master)master.gain.value=muted?0:.7;};
if(FREEZE!=null)document.getElementById('start').style.display='none';
frame();
