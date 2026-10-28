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
const scratch=(()=>{const N=1024,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');g.fillStyle='#0a0a0a';g.fillRect(0,0,N,N);
  const a0=R()*3;for(let i=0;i<55;i++){const x=R()*N,y=R()*N,a=a0+(R()-.5)*.35,l=60+R()*420;g.strokeStyle=`rgba(255,255,255,${.25+R()*.45})`;g.lineWidth=.6+R()*.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  for(let i=0;i<12;i++){const x=R()*N,y=R()*N,a=R()*6.3,l=30+R()*120;g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
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
const mat=new THREE.MeshPhysicalMaterial({color:0x0b0809,roughness:.05,ior:1.49,
  clearcoat:1,clearcoatRoughness:.02,specularIntensity:.7,clearcoatRoughnessMap:scratch,iridescence:.25,iridescenceIOR:1.7,iridescenceThicknessRange:[180,520],
  sheen:.25,sheenRoughness:.4,sheenColor:new THREE.Color(0x3a3640),envMapIntensity:1,emissive:0xff7a2a,emissiveIntensity:0});
// thin-edge glow: per-vertex thinness mask drives emissive (backlit amber where the glass is thin), no transmission (avoids v3 bloom NaN squares)
mat.onBeforeCompile=s=>{s.uniforms.glow={value:0};mat.userData.s=s;
  s.vertexShader='attribute float thin;varying float vThin;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvThin=thin;');
  s.fragmentShader='uniform float glow;varying float vThin;\n'+s.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nif(any(isnan(gl_FragColor))||any(isinf(gl_FragColor)))gl_FragColor=vec4(0,0,0,1);gl_FragColor.rgb=min(gl_FragColor.rgb,vec3(6.));').replace('vec3 totalEmissiveRadiance = emissive;',
   'vec3 totalEmissiveRadiance = vec3(1.,.42,.12)*glow*vThin*(0.6+0.4*pow(1.-abs(dot(normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition))),normalize(vViewPosition))),2.));');};
const hero=new THREE.Mesh(new THREE.BufferGeometry(),mat);hero.castShadow=true;
fetch('obsidian-point.bin').then(r=>r.arrayBuffer()).then(buf=>{const hd=new Uint32Array(buf,0,2),nv=hd[0],nf=hd[1];
  const q=new Int16Array(buf,8,nv*3),pos=new Float32Array(nv*3);for(let i=0;i<nv*3;i++)pos[i]=q[i]/32767*1.6;
  const off=8+nv*6,pad=off%4?4-off%4:0;const idx=new Uint32Array(buf.slice(off,off+nf*12));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(new THREE.BufferAttribute(idx,1));
  if(Q.has('flip')){for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}}
  g.computeVertexNormals();const uv=new Float32Array(nv*2),thin=new Float32Array(nv);
  for(let i=0;i<nv;i++){const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];uv[i*2]=x*.7+.5+z*.4;uv[i*2+1]=y*.33+.5;
    const u=y/1.5,pr=Math.max(Math.pow(Math.max(0,1-Math.abs(u)),.55)*(u>0?Math.pow(Math.max(0,1-u),.35):1),1e-3);
    thin[i]=Math.min(1,Math.max(0,.013-Math.abs(z))*77*Math.min(1,Math.abs(x)/(.62*pr)+.3));}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('thin',new THREE.BufferAttribute(thin,1));hero.geometry=g;meshReady=true;});
let meshReady=false;
const rig=new THREE.Group();rig.add(hero);scene.add(rig);
// floor + chips
const FY=-1.47;
const slate=(()=>{const N=1024,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');g.fillStyle='#7a7a7a';g.fillRect(0,0,N,N);
  for(let i=0;i<9000;i++){const v=90+R()*120|0;g.fillStyle=`rgba(${v},${v},${v},${R()*.25})`;const r=1+R()*R()*14;g.beginPath();g.arc(R()*N,R()*N,r,0,6.3);g.fill();}
  for(let i=0;i<0;i++){g.strokeStyle=`rgba(40,40,40,${.2+R()*.3})`;g.lineWidth=.6+R();g.beginPath();let x=R()*N,y=R()*N;g.moveTo(x,y);for(let k=0;k<8;k++){x+=(R()-.5)*60;y+=(R()-.5)*60;g.lineTo(x,y);}g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;})();
const floor=new THREE.Mesh(new THREE.CircleGeometry(9,96),new THREE.MeshPhysicalMaterial({color:0x17171a,roughness:.82,roughnessMap:slate,bumpMap:slate,bumpScale:2.5,clearcoat:.25,clearcoatRoughness:.35,envMapIntensity:.15}));
floor.rotation.x=-Math.PI/2;floor.position.y=FY;floor.receiveShadow=true;scene.add(floor);
// ash drift ring around the base (dark soft disc)
const ashT=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');const gr=g.createRadialGradient(128,128,10,128,128,128);gr.addColorStop(0,'rgba(0,0,0,.85)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);})();
const ash=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),new THREE.MeshBasicMaterial({map:ashT,transparent:true,depthWrite:false}));ash.rotation.x=-Math.PI/2;ash.position.y=FY+.002;scene.add(ash);
const chipMat=mat.clone();chipMat.onBeforeCompile=()=>{};chipMat.iridescence=0;chipMat.sheen=0;chipMat.envMapIntensity=.6;
// ---- debris: instanced chips/micro-flakes (rest on slate before the boom), simple Euler physics after it
const NC=90,chipGeo=(()=>{const ps=[];for(let k=0;k<12;k++)ps.push(new THREE.Vector3((R()-.5)*1,(R()-.5)*.25,(R()-.5)*.7));let g=new ConvexGeometry(ps);g=g.index?g.toNonIndexed():g;fixWind(g);g.computeVertexNormals();return g;})();
const chips=new THREE.InstancedMesh(chipGeo,chipMat,NC);chips.castShadow=true;scene.add(chips);
const C=[];for(let i=0;i<NC;i++){const big=i<14,sc=big?.08+R()*.07:.03+R()*.05;let p;
  if(big){const a=(R()<.5?-1:1)*(.5+R()*1.2),zz=-R()*1.3-.15;p=new THREE.Vector3(a,FY+sc*.12,zz);} // resting chips, sides/behind: clear of the title band
  else{const u=R()*2-1;p=new THREE.Vector3((R()-.5)*.3,u*1.2,(R()-.5)*.08);}                 // micro-flakes: break off the hero at the crack
  C.push({p0:p.clone(),p:p.clone(),v:new THREE.Vector3(),r0:new THREE.Euler(R()*6,R()*6,R()*6),w:new THREE.Vector3(),sc,big,live:big});}
const dN=260,dp=new Float32Array(dN*3),D=[];for(let i=0;i<dN;i++){const amb=i<30;const p=amb?new THREE.Vector3((R()-.5)*2.2+.5,FY+R()*3.2,(R()-.5)*1.8+.6):new THREE.Vector3((R()-.5)*1.6,FY+.01+R()*.03,(R()-.5)*1.6);D.push({p0:p.clone(),p:p.clone(),v:new THREE.Vector3(),amb});}
const flash=new THREE.PointLight(0xffc890,0,7,2);flash.position.set(.05,.15,.35);scene.add(flash);
const BOOM=8.2,O=new THREE.Vector3(.05,.1,0),M=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),sv=new THREE.Vector3();
let simT=-1,Rb;
function resetSim(){simT=0;Rb=(z=>()=>(z=(z*16807)%2147483647)/2147483647)(99);for(const c of C){c.p.copy(c.p0);c.v.set(0,0,0);c.w.set(0,0,0);c.e=c.r0.clone();c.live=c.big;}for(const d of D){d.p.copy(d.p0);d.v.set(0,0,0);}}
function boom(){for(const c of C){const dir=c.p.clone().sub(O);const r=Math.max(.25,dir.length());dir.normalize();
    const k=(c.big?2.2:5.5)/(r*r)*(0.6+Rb()*.8);c.v.addScaledVector(dir,k);c.v.y+=c.big?1.2+Rb():1+Rb()*2.5;if(!c.big){c.live=true;c.v.z+=(Rb()<.5?-1:1)*(1+Rb()*2);}c.w.set((Rb()-.5)*30,(Rb()-.5)*30,(Rb()-.5)*30);}
  for(const d of D){const dir=d.p.clone().sub(O);const r=Math.max(.2,dir.length());dir.normalize();d.v.addScaledVector(dir,(d.amb?1.2:3)/(r*r)*(0.5+Rb()));if(!d.amb)d.v.y+=.8+Rb()*1.6;}}
function step(dt,t){const tb=t-BOOM;
  for(const c of C){if(!c.live||tb<0)continue;c.v.y-=9.8*dt*.55;c.v.multiplyScalar(1-1.4*dt);c.p.addScaledVector(c.v,dt);
    c.e.x+=c.w.x*dt;c.e.y+=c.w.y*dt;c.e.z+=c.w.z*dt;
    if(c.p.y<FY+c.sc*.12){c.p.y=FY+c.sc*.12;if(c.v.y<0)c.v.y*=-.28;c.v.x*=.7;c.v.z*=.7;c.w.multiplyScalar(.6);}}
  for(const d of D){if(tb<0){d.p.y=d.p0.y+.03*Math.sin(t*.4+d.p0.x*7)*(d.amb?1:0);continue;}
    d.v.y-=(d.amb?.15:2.2)*dt;d.v.multiplyScalar(1-(d.amb?1.1:2.4)*dt);d.p.addScaledVector(d.v,dt);if(d.p.y<FY+.005){d.p.y=FY+.005;d.v.y*=-.2;d.v.x*=.5;d.v.z*=.5;}}}

function sim(t){if(t<simT||simT<0)resetSim();const dt=1/120;while(simT<t){const n=simT+dt;if(simT<BOOM&&n>=BOOM)boom();step(dt,n);simT=n;}
  for(let i=0;i<NC;i++){const c=C[i];const vis=c.live||c.big;q.setFromEuler(c.e);sv.setScalar(vis?c.sc:0);M.compose(c.p,q,sv);chips.setMatrixAt(i,M);}chips.instanceMatrix.needsUpdate=true;
  const a=dg.attributes.position.array;for(let i=0;i<dN;i++){a[i*3]=D[i].p.x;a[i*3+1]=D[i].p.y;a[i*3+2]=D[i].p.z;}dg.attributes.position.needsUpdate=true;}
// lights
const key=new THREE.SpotLight(0xffb070,0,14,.4,.6,2);key.position.set(2.6,3.2,2.4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;scene.add(key,key.target);
const rim=new THREE.SpotLight(0x8fb4ff,0,14,.5,.8,2);rim.position.set(-2.4,1.6,-3.2);scene.add(rim,rim.target);
const back=new THREE.PointLight(0xff6a20,0,5,2);back.position.set(0,.2,-1.1);scene.add(back);
// dust accent
const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
const dmat=new THREE.PointsMaterial({color:0xffd2a0,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});scene.add(new THREE.Points(dg,dmat));
const comp=new EffectComposer(renderer);comp.addPass(new RenderPass(scene,cam));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.22,.35,1.6);comp.addPass(bloom);comp.addPass(new OutputPass());
let land=false;function size(){const w=innerWidth,h=innerHeight;land=w>h;renderer.setSize(w,h);comp.setSize(w,h);cam.aspect=w/h;cam.fov=land?34:38;cam.updateProjectionMatrix();}addEventListener('resize',size);size();

// ---- audio: pre-mixed intro track (Kenney CC0 recorded glass/bell + layered noise bed, convolution reverb) — see NOTES.md
let ac=null,muted=false,master=null,buf=null,src=null;window.__dbg=()=>({state:ac&&ac.state,buf:buf&&buf.duration,src:!!src,t:now()});
function audio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=muted?0:1;master.connect(ac.destination);
  const f=new Audio().canPlayType('audio/ogg; codecs=opus')?'sfx/intro-mix.ogg':'sfx/intro-mix.m4a';
  fetch(f).then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(b=>{buf=b;if(playing)startAudio(now());});}
function startAudio(at){if(!buf)return;if(src)try{src.stop()}catch(e){};src=ac.createBufferSource();src.buffer=buf;src.connect(master);src.start(0,Math.max(0,at));}
const CUES=[];const fired={};
// ---- timeline (14.5s): 0-1.5 dark · 1.5-5 reveal (rim sweep then key) · 5-8 craft hold · 8.2 edge-glow crack · 10.2 title · 12-14.5 hold/fade
const DUR=14.5,title=document.getElementById('title'),veil=document.getElementById('veil');
let t0=null,offset=0,playing=false;
function pose(t){
  const rev=ss(1.5,5,t),hold=ss(5,9,t);
  rim.intensity=mix(0,90,ss(1.2,3.2,t));key.intensity=mix(0,260,ss(2.6,5,t));
  scene.environmentIntensity=mix(0,.9,ss(2.8,6,t));
  rim.position.x=mix(-4,-2.4,ss(1.2,4,t));key.position.x=2.6+Math.sin(t*.35)*.6;
  const g=ss(8.15,8.3,t)*(1-.75*ss(8.4,10.5,t)),base=.28*ss(3,6,t);back.intensity=4*base+g*14;if(mat.userData.s)mat.userData.s.uniforms.glow.value=base+g*2.4;
  const fl=Math.exp(-Math.max(0,t-8.2)*9)*(t>=8.2);flash.intensity=fl*60;bloom.strength=.22+fl*.5;
  dmat.opacity=.55*ss(4,7,t);
  // camera: start tight macro on the tip, pull out & arc to hero 3/4, slow push-in during hold; title beat lifts camera slightly
  const a=mix(.9,-.35,ss(1.2,7,t))+(t-7)*.015,r=mix(2.6,land?7.4:6.2,ss(1.2,6.5,t))-ss(7,14.5,t)*.5,y=mix(1.1,.3,ss(1.2,6.5,t))-ss(10,14.5,t)*.15;
  const pk=Math.exp(-Math.max(0,t-BOOM)*6)*(t>=BOOM),sh=pk*.05;cam.position.set(Math.sin(a)*(r+pk*.25)+Math.sin(t*93)*sh,y+Math.sin(t*71)*sh,Math.cos(a)*(r+pk*.25));cam.lookAt(0,mix(.8,-.1,ss(1.2,6.5,t))-ss(10,13,t)*.35,0);
  rig.rotation.set(.03,mix(1.4,-.2,ss(1,9,t))+(t-9)*.03,-.02);
  title.style.opacity=ss(10.2,11.4,t);title.style.transform=`translateY(${(1-ss(10.2,11.6,t))*14}px)`;title.style.letterSpacing=mix(.9,.6,ss(10.2,12,t))+'em';
  veil.style.opacity=Math.max(1-ss(.2,2,t),ss(13.6,14.5,t)*.0);
}
function now(){return FREEZE!=null?FREEZE:playing?(performance.now()-t0)/1000+offset:offset;}
function frame(){const t=Math.min(now(),DUR);pose(t);
  sim(t);
  
  if(t>=DUR&&playing){playing=false;offset=DUR;document.getElementById('replay').style.display='';document.getElementById('skip').style.display='none';}
  comp.render();requestAnimationFrame(frame);}
function play(){audio();ac.resume();for(const k in fired)delete fired[k];offset=0;t0=performance.now();playing=true;document.getElementById('start').style.display='none';document.getElementById('replay').style.display='none';document.getElementById('skip').style.display='';startAudio(0);}
document.getElementById('start').onclick=play;document.getElementById('replay').onclick=play;
document.getElementById('skip').onclick=e=>{e.stopPropagation();if(playing){offset=10.0;t0=performance.now();startAudio(10.0);}};
document.getElementById('mute').onclick=e=>{muted=!muted;e.target.textContent=muted?'sound off':'sound on';if(master)master.gain.value=muted?0:1;};
if(FREEZE!=null)document.getElementById('start').style.display='none';
frame();
