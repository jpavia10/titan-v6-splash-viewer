import numpy as np,time
from skimage import measure
rng=np.random.default_rng(11);L,W,T=1.5,.62,.2;h=.005
def prof(u):
    u=np.clip(u,-1,1);return np.maximum(np.power(np.maximum(1-np.abs(u),0),.55)*np.where(u>0,np.power(np.maximum(1-u,0),.35),1)*(1-.12*np.maximum(-u-.8,0)/.2),1e-3)
xs=np.arange(-W-.05,W+.05,h);ys=np.arange(-L-.05,L+.05,h);zs=np.arange(-T-.05,T+.05,h)
X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij');X=X.astype(np.float32);Y=Y.astype(np.float32);Z=Z.astype(np.float32)
u=Y/L;pw=W*prof(u);pt=T*prof(u)
rad=np.sqrt((X/pw)**2+(Z/pt)**2);d=((rad-1)*np.minimum(pw,pt)).astype(np.float32)
d=np.maximum(d,(np.abs(u)-1)*L).astype(np.float32)
def surfpt(uu,vv,sd):
    p=prof(np.array(uu));return np.array([vv*W*p,uu*L,sd*T*p*np.sqrt(max(0,1-vv*vv))]),p
t0=time.time();n=0
def carve(c,r,strike=None,amp=0):
    global d,n
    # bbox restrict for speed
    i0=np.searchsorted(xs,c[0]-r);i1=np.searchsorted(xs,c[0]+r);j0=np.searchsorted(ys,c[1]-r);j1=np.searchsorted(ys,c[1]+r);k0=np.searchsorted(zs,c[2]-r);k1=np.searchsorted(zs,c[2]+r)
    if i1<=i0 or j1<=j0 or k1<=k0:return
    sub=(slice(i0,i1),slice(j0,j1),slice(k0,k1))
    s=r-np.sqrt((X[sub]-c[0])**2+(Y[sub]-c[1])**2+(Z[sub]-c[2])**2)
    if strike is not None:  # conchoidal ripples radiating from the strike point
        ds=np.sqrt((X[sub]-strike[0])**2+(Y[sub]-strike[1])**2+(Z[sub]-strike[2])**2)
        s=s+amp*np.sin(ds*95)*np.exp(-ds*3)
    d[sub]=np.maximum(d[sub],s);n+=1
# primary bifacial flake scars: large shallow spherical scoops struck from the margin, alternating faces, layered (older first = larger)
for k in range(340):
    uu=rng.uniform(-.92,.9);side=1 if k%2 else -1;vv=rng.choice([-1,1])*rng.uniform(.35,1.0)
    p,pr=surfpt(uu,vv,side);r=rng.uniform(.3,.85)*(0.6+0.4*pr)*(1.25 if k<140 else .7);depth=rng.uniform(.012,.04)*(0.4+pr)
    nrm=np.array([np.sign(vv)*.55,rng.uniform(-.25,.25),side*1.0]);nrm/=np.linalg.norm(nrm)
    carve(p+nrm*(r-depth),r)
# mid-face scars: broad shallow-to-deep scoops so face centres catch light at varied angles
for k in range(110):
    uu=rng.uniform(-.85,.8);side=1 if k%2 else -1;vv=rng.uniform(-.5,.5);p,pr=surfpt(uu,vv,side)
    r=rng.uniform(.35,.9)*(0.5+0.5*pr);depth=rng.uniform(.004,.03)*(0.5+pr)
    nrm=np.array([rng.uniform(-.5,.5),rng.uniform(-.4,.4),side*1.0]);nrm/=np.linalg.norm(nrm);carve(p+nrm*(r-depth),r)
# pressure retouch: small scoops right on the edge, both faces
for k in range(520):
    uu=rng.uniform(-.97,.97);vv=rng.choice([-1,1]);side=rng.choice([-1,1]);p,pr=surfpt(uu,vv*.985,side)
    r=rng.uniform(.025,.07)*(0.5+0.5*pr);depth=rng.uniform(.004,.012)
    nrm=np.array([vv*.9,rng.uniform(-.3,.3),side*.6]);nrm/=np.linalg.norm(nrm);carve(p+nrm*(r-depth),r)
print('carves',n,time.time()-t0)
v,f,nn,_=measure.marching_cubes(d,0,spacing=(h,h,h),step_size=1)
v=v+np.array([xs[0],ys[0],zs[0]]);print('verts',len(v),'tris',len(f))
# Taubin smoothing (lambda/mu) removes marching-cubes stair noise without shrinking ridges much
import scipy.sparse as sp
nv=len(v);ii=np.concatenate([f[:,0],f[:,1],f[:,2],f[:,1],f[:,2],f[:,0]]);jj=np.concatenate([f[:,1],f[:,2],f[:,0],f[:,0],f[:,1],f[:,2]])
A=sp.coo_matrix((np.ones(len(ii)),(ii,jj)),shape=(nv,nv)).tocsr();A.data[:]=1;deg=np.asarray(A.sum(1)).ravel();Dinv=sp.diags(1/np.maximum(deg,1))
Lm=Dinv@A
for it in range(6):
    v=v+0.5*(Lm@v-v);v=v-0.53*(Lm@v-v)
q=np.round(v/1.6*32767).astype(np.int16)
np.save('/workspace/obs8/v.npy',v);np.save('/workspace/obs8/f.npy',f)
if 0:
    fo.write(np.array([len(v),len(f)],np.uint32).tobytes());fo.write(q.tobytes());fo.write(f.astype(np.uint32).tobytes())
