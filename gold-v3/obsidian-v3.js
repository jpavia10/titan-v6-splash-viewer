// v3: built on stock three.js r160 physical pipeline (MIT) — MeshPhysicalMaterial transmission/clearcoat/iridescence,
// RoomEnvironment PMREM reflections, ConvexGeometry faceting, UnrealBloomPass, ACES tone mapping.
import * as THREE from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const R=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(1337);
const dpr=Math.min(devicePixelRatio,2);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(dpr);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x030304);scene.fog=new THREE.FogExp2(0x030304,0.06);
const cam=new THREE.PerspectiveCamera(32,1,0.1,100);

// Environment: studio reflections, dimmed so the glass reads black with bright edge reflections
const pm=new THREE.PMREMGenerator(renderer);
// custom softbox studio (pattern of RoomEnvironment): big warm strip key, cool rim strips, black void
const envS=new THREE.Scene();const box=(c,i,w,h,x,y,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);envS.add(m);};
box(0xffb478,6,3,9,6,2,5);box(0xffd0a0,3,8,1.2,0,7,2);box(0x7fa8ff,5,1.2,9,-7,1,-4);box(0x9fc0ff,2.5,1,6,4,0,-7);box(0xff8040,1.5,10,1,0,-4,-6);box(0x8a8078,.5,14,14,0,9,0);box(0x50586a,1.1,5,9,-3,2,9);box(0xffc090,2,.6,7,3,1,8);
scene.environment=pm.fromScene(envS,0.02).texture;scene.environmentIntensity=1.1;

// ---- Surface imperfection maps (canvas): polish scratches, micro pits, conchoidal ripples
function makeMaps(){
  const N=1024,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');
  g.fillStyle='#262626';g.fillRect(0,0,N,N);                          // base roughness ~0.15
  for(let i=0;i<14;i++){const x=R()*N,y=R()*N;for(let k=1;k<9;k++){g.strokeStyle=`rgba(60,60,60,${.25/k})`;g.lineWidth=1.5;g.beginPath();g.arc(x,y,k*18+R()*6,0,6.3);g.stroke();}}
  const a0=R()*3;for(let i=0;i<420;i++){const x=R()*N,y=R()*N,a=a0+(R()-.5)*.5,l=20+R()*R()*380;
    g.strokeStyle=`rgba(${150+R()*100|0},${150+R()*100|0},${150+R()*100|0},${.15+R()*.5})`;g.lineWidth=R()<.9?.6:1.4;
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*l*.5+(R()-.5)*8,y+Math.sin(a)*l*.5+(R()-.5)*8,x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  for(let i=0;i<70;i++){const a=R()*6.3,l=40+R()*200,x=R()*N,y=R()*N;g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  for(let i=0;i<900;i++){g.fillStyle=`rgba(200,200,200,${R()*.5})`;g.fillRect(R()*N,R()*N,1+R()*1.5,1+R()*1.5);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
const scratch=makeMaps();

// ---- Knapped point: convex hull of a leaf-shaped lens with flake scars (random inward facets)
function fixWind(geo){const a=geo.attributes.position.array,c=new THREE.Vector3();for(let i=0;i<a.length;i+=9){const A=new THREE.Vector3(a[i],a[i+1],a[i+2]),B=new THREE.Vector3(a[i+3],a[i+4],a[i+5]),C=new THREE.Vector3(a[i+6],a[i+7],a[i+8]);
   const n=B.clone().sub(A).cross(C.clone().sub(A));c.copy(A).add(B).add(C).divideScalar(3);if(n.dot(c)<0){for(let k=0;k<3;k++){const t=a[i+3+k];a[i+3+k]=a[i+6+k];a[i+6+k]=t;}}}}
function knapped(){
  // dense smooth leaf-shaped lens, then ~46 planar flake removals (each plane clips a convex cap) = real knapping scars
  const L=1.5,W=.7,T=.34,pts=[];
  const surf=(u,v,side)=>{const prof=Math.pow(Math.max(0,1-Math.abs(u)),.6)*(u>0?Math.pow(1-u,.3):1);
    const x=v*W*prof,z=side*T*prof*Math.sqrt(Math.max(0,1-v*v));return new THREE.Vector3(x,u*L,z);};
  for(let i=0;i<70;i++)for(let j=0;j<=24;j++)for(const sd of[-1,1]){const u=-1+2*i/69,v=-1+2*j/24;pts.push(surf(u*.995,v,sd));}
  const clip=(c,n)=>{for(const p of pts){const d=p.clone().sub(c).dot(n);if(d>0)p.addScaledVector(n,-d);}};
  const nrm=(u,v,sd)=>{const e=.01,p=surf(u,v,sd),a=surf(Math.min(u+e,.99),v,sd).sub(p),b=surf(u,Math.max(-1,Math.min(1,v+e)),sd).sub(p);
    const n=a.cross(b).normalize();if(n.z*sd<0)n.negate();return n;};
  for(let k=0;k<120;k++){const u=(R()*2-1)*.9,sd=k%2?1:-1,v=(R()<.5?-1:1)*(.35+R()*.55);   // primary flake scars
    const c=surf(u,v,sd),n=nrm(u,Math.max(-.97,Math.min(.97,v)),sd);n.x+=Math.sign(v)*(.1+.45*R());n.y+=(R()-.5)*.5;n.z+=(R()-.5)*.2;n.normalize();
    c.addScaledVector(n,-(.008+R()*R()*.03));clip(c,n);}
  for(let k=0;k<160;k++){const u=(R()*2-1)*.95,v=R()<.5?-1:1,sd=R()<.5?-1:1;   // pressure-retouch nicks along the edge
    const c=surf(u,v*.96,sd),n=nrm(u,v*.9,sd);n.x+=v*.6;n.normalize();c.addScaledVector(n,-(.004+R()*.008));clip(c,n);}
  let geo=new ConvexGeometry(pts);
  geo=geo.index?geo.toNonIndexed():geo;
  fixWind(geo);
  geo.computeVertexNormals();
  const p=geo.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)*.6+.5+p.getZ(i)*.3;uv[i*2+1]=p.getY(i)*.3+.5;}
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  return geo;
}
const geo=knapped();
const mat=new THREE.MeshPhysicalMaterial({
  color:0x060507,metalness:0,roughness:.12,roughnessMap:scratch,bumpMap:scratch,bumpScale:1.2,
  ior:1.49,
  clearcoat:1,clearcoatRoughness:.04,clearcoatRoughnessMap:scratch,
  iridescence:.25,iridescenceIOR:1.6,iridescenceThicknessRange:[200,500],
  specularIntensity:1,sheen:.15,sheenColor:new THREE.Color(0x553322),envMapIntensity:1.0,flatShading:true});
const chipMat=mat.clone();chipMat.transmission=0;chipMat.iridescence=0;
const hero=new THREE.Mesh(geo,location.search.includes('debug')?new THREE.MeshNormalMaterial({flatShading:true}):mat);hero.castShadow=true;
// Fractured edge highlight: thin bright lines on facet edges (chips read as sharp)
const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:0xffc890,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false}));
const rig=new THREE.Group();rig.add(hero,edges);scene.add(rig);

// small detached chips/flakes resting on the plinth
for(let i=0;i<7;i++){const ps=[];for(let k=0;k<12;k++)ps.push(new THREE.Vector3((R()-.5)*.14,(R()-.5)*.03,(R()-.5)*.1));
  const m=new THREE.Mesh((()=>{let g=new ConvexGeometry(ps);g=g.index?g.toNonIndexed():g;fixWind(g);g.computeVertexNormals();return g;})(),chipMat);m.position.set((R()-.5)*1.4,-1.84,-R()*.9);m.rotation.y=R()*6;m.castShadow=true;scene.add(m);}

// plinth: wet slate catching reflections
const floor=new THREE.Mesh(new THREE.CircleGeometry(6,64),new THREE.MeshPhysicalMaterial({color:0x0c0c0d,roughness:.6,metalness:0}));
floor.rotation.x=-Math.PI/2;floor.position.y=-1.86;floor.receiveShadow=true;scene.add(floor);

// ---- Cinema lighting: warm key (spot, shadows), cool rim (behind), faint fill
const key=new THREE.SpotLight(0xffb070,260,14,.38,.6,2);key.position.set(2.6,3.2,2.4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;scene.add(key,key.target);
const rim=new THREE.SpotLight(0x8fb4ff,320,14,.5,.8,2);rim.position.set(-2.2,1.8,-3.2);scene.add(rim,rim.target);
const rim2=new THREE.PointLight(0xff7a3a,6,6,2);rim2.position.set(1.6,-1.2,-1.6);scene.add(rim2);
scene.add(new THREE.HemisphereLight(0x223040,0x080604,.15));

// volumetric key shaft (additive cone, soft falloff shader) — accent, not the show
const shaftMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{t:{value:0}},
  vertexShader:'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 w=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-w.xyz);gl_Position=projectionMatrix*w;}',
  fragmentShader:'uniform float t;varying vec2 vUv;varying vec3 vN,vV;float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}void main(){float e=pow(abs(dot(vN,vV)),2.5);float a=e*smoothstep(1.,.15,vUv.y)*smoothstep(0.,.25,vUv.y);a*=.55+.45*n(vec2(vUv.x*10.,vUv.y*3.-t*.15));gl_FragColor=vec4(vec3(1.,.72,.45)*a*.055,1.);}'});
const shaft=new THREE.Mesh(new THREE.ConeGeometry(1.5,7,48,1,true),shaftMat);
shaft.position.copy(key.position).lerp(new THREE.Vector3(0,-1.8,0),.5);shaft.lookAt(0,-1.8,0);shaft.rotateX(-Math.PI/2);/* cone shaft removed: produced blown-out artifact */

// sparse dust motes (60) lit only inside the shaft region
const dN=40,dp=new Float32Array(dN*3);for(let i=0;i<dN;i++){dp[i*3]=(R()-.5)*1.6+.9;dp[i*3+1]=(R()-.3)*3.5;dp[i*3+2]=(R()-.5)*1.5+.8;}
const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xffd2a0,size:.012,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(dust);

// ---- Post: restrained bloom only on hot speculars
const comp=new EffectComposer(renderer);comp.addPass(new RenderPass(scene,cam));
const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.35,.6,1.1);if(!location.search.includes('nobloom'))comp.addPass(bloom);comp.addPass(new OutputPass());

function size(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);comp.setSize(w,h);cam.aspect=w/h;
  cam.fov=w<h?38:34;window.__land=w>h;cam.updateProjectionMatrix();rig.position.y=w<h?.05:-.05;}
addEventListener('resize',size);size();

// ---- Audio: synthesized only (no music claimed): low drone + glass tick on facet glints
let ac=null;document.getElementById('snd').onclick=e=>{if(ac){ac.close();ac=null;e.target.textContent='sound: off';return;}
  ac=new AudioContext();const g=ac.createGain();g.gain.value=.05;g.connect(ac.destination);
  [55,82.4,110.3].forEach((f,i)=>{const o=ac.createOscillator();o.type=i?'sine':'triangle';o.frequency.value=f;const lf=ac.createOscillator(),lg=ac.createGain();lf.frequency.value=.05+i*.03;lg.gain.value=1.5;lf.connect(lg).connect(o.frequency);o.connect(g);o.start();lf.start();});
  const tick=()=>{if(!ac)return;const o=ac.createOscillator(),a=ac.createGain();o.frequency.value=2400+Math.random()*1800;a.gain.setValueAtTime(.05,ac.currentTime);a.gain.exponentialRampToValueAtTime(1e-4,ac.currentTime+.6);o.connect(a).connect(ac.destination);o.start();o.stop(ac.currentTime+.7);setTimeout(tick,2500+Math.random()*4000);};tick();
  e.target.textContent='sound: on';};

// ---- Slow cinematic camera: dolly-in + orbit, hero turns so speculars crawl facet to facet
const clock=new THREE.Clock();const freeze=new URLSearchParams(location.search).get('t');
function frame(){const t=freeze?+freeze:clock.getElapsedTime();
  const a=-.55+Math.sin(t*.07)*.45,r=(window.__land?7.6:6.4)-Math.min(t,20)*.04;
  cam.position.set(Math.sin(a)*r,.35+Math.sin(t*.05)*.25,Math.cos(a)*r);cam.lookAt(0,-.15,0);
  rig.rotation.set(.12+Math.sin(t*.11)*.06,-.35+Math.sin(t*.12)*.6,-.08+Math.sin(t*.09)*.05);
  key.position.x=2.6+Math.sin(t*.13)*.8;shaftMat.uniforms.t.value=t;
  const d=dg.attributes.position;for(let i=0;i<dN;i++){d.array[i*3+1]+=.0008*Math.sin(i+t*.3);d.array[i*3]+=.0005*Math.cos(i*1.7+t*.2);}d.needsUpdate=true;
  comp.render();if(!freeze||!window.__done){window.__done=1;requestAnimationFrame(frame);}}
frame();
