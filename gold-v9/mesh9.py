import numpy as np,time
from skimage import measure
import scipy.sparse as sp
rng=np.random.default_rng(23);L,W,T=1.5,.74,.17;h=.0042
def prof(u):
    u=np.clip(u,-1,1);a=np.maximum((1-u)/2,0);b=np.maximum((1+u)/2,0)
    return np.maximum(2.15*np.power(a,.95)*np.power(b,.42),1e-3)   # leaf/biface: widest ~1/3 up from a rounded base, long tapering tip
xs=np.arange(-W-.04,W+.04,h).astype(np.float32);ys=np.arange(-L-.04,L+.04,h).astype(np.float32);zs=np.arange(-T-.04,T+.04,h).astype(np.float32)
X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij')
u=Y/L;p=prof(u);pw=W*p;pt=T*np.minimum(p,1.0)**.8
d=((np.sqrt((X/pw)**2+(Z/pt)**2)-1)*np.minimum(pw,pt)).astype(np.float32)
d=np.maximum(d,(np.abs(u)-1)*L);del u,p,pw,pt
def sp_(uu,vv,sd):
    pr=float(prof(np.array(uu)));pw=W*pr;pt=T*min(pr,1)**.8
    return np.array([vv*pw,uu*L,sd*pt*np.sqrt(max(0,1-vv*vv))]),pr
def carve(c,R,ax,depth):
    # ellipsoidal flake scar; ax = 3 orthonormal axes (inward, along-edge, normal), R = radii
    rmax=max(R);i0,i1=np.searchsorted(xs,[c[0]-rmax,c[0]+rmax]);j0,j1=np.searchsorted(ys,[c[1]-rmax,c[1]+rmax]);k0,k1=np.searchsorted(zs,[c[2]-rmax,c[2]+rmax])
    if i1<=i0 or j1<=j0 or k1<=k0:return
    s_=(slice(i0,i1),slice(j0,j1),slice(k0,k1));dx=X[s_]-c[0];dy=Y[s_]-c[1];dz=Z[s_]-c[2]
    q=0
    for a,r in zip(ax,R):q=q+((dx*a[0]+dy*a[1]+dz*a[2])/r)**2
    s=(1-np.sqrt(q))*min(R)
    d[s_]=np.maximum(d[s_],s)
def frame(uu,vv,sd,tilt):
    e=1e-3;p0,_=sp_(uu,vv,sd);pu,_=sp_(min(uu+e,.999),vv,sd);pv,_=sp_(uu,np.clip(vv+e*np.sign(-vv+1e-9),-1,1),sd)
    n=np.cross(pu-p0,pv-p0);n/=np.linalg.norm(n)+1e-12
    if n[2]*sd<0:n=-n
    inward=np.array([-np.sign(vv),0,0.]);inward-=n*inward.dot(n);inward/=np.linalg.norm(inward)+1e-12
    n=n+np.sign(vv)*np.array([1,0,0])*tilt;n/=np.linalg.norm(n);inward-=n*inward.dot(n);inward/=np.linalg.norm(inward)
    along=np.cross(n,inward);return p0,n,inward,along
t0=time.time()
# generation 1: large invasive thinning flakes struck from both margins, alternating faces; elongated toward the midline
for k in range(170):
    uu=rng.uniform(-.9,.86);sd=1 if k%2 else -1;vv=rng.choice([-1,1])*rng.uniform(.88,.99)
    p0,n,inw,al=frame(uu,vv,sd,.35);r=rng.uniform(.16,.34);dep=rng.uniform(.012,.03)
    R=(r*rng.uniform(1.6,2.3),r*rng.uniform(.7,1.0),r*1.6);carve(p0+n*(R[2]-dep),R,(inw,al,n),dep)
# generation 2: medium flakes, shallower, overlapping gen 1 (creates crisp arrises between scars)
for k in range(320):
    uu=rng.uniform(-.95,.93);sd=rng.choice([-1,1]);vv=rng.choice([-1,1])*rng.uniform(.9,.995)
    p0,n,inw,al=frame(uu,vv,sd,.5);r=rng.uniform(.07,.15);dep=rng.uniform(.006,.014)
    R=(r*rng.uniform(1.5,2.2),r*rng.uniform(.65,.95),r*1.5);carve(p0+n*(R[2]-dep),R,(inw,al,n),dep)
# generation 3: pressure retouch — tiny, steep, dense along the edge (serration)
for k in range(1100):
    uu=rng.uniform(-.985,.975);sd=rng.choice([-1,1]);vv=rng.choice([-1,1])*.995
    p0,n,inw,al=frame(uu,vv,sd,.9);r=rng.uniform(.018,.04);dep=rng.uniform(.003,.007)
    R=(r*1.6,r*.8,r*1.3);carve(p0+n*(R[2]-dep),R,(inw,al,n),dep)
print('carve',time.time()-t0)
v,f,_,_=measure.marching_cubes(d,0,spacing=(h,h,h));v=v+np.array([xs[0],ys[0],zs[0]]);del d,X,Y,Z
nv=len(v);ii=np.concatenate([f[:,0],f[:,1],f[:,2],f[:,1],f[:,2],f[:,0]]);jj=np.concatenate([f[:,1],f[:,2],f[:,0],f[:,0],f[:,1],f[:,2]])
A=sp.coo_matrix((np.ones(len(ii),np.float32),(ii,jj)),shape=(nv,nv)).tocsr();A.data[:]=1;Lm=sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(),1))@A
for it in range(5):v=v+0.5*(Lm@v-v);v=v-0.53*(Lm@v-v)
v=v.astype(np.float32);f=f.astype(np.int32)
a,b,c=v[f[:,0]],v[f[:,1]],v[f[:,2]]
if (np.einsum('ij,ij->i',a,np.cross(b,c))).sum()<0:f=f[:,[0,2,1]]
with open('/workspace/obs8/hero9.ply','wb') as o:
    o.write(f"ply\nformat binary_little_endian 1.0\nelement vertex {len(v)}\nproperty float x\nproperty float y\nproperty float z\nelement face {len(f)}\nproperty list uchar int vertex_indices\nend_header\n".encode())
    o.write(v.tobytes());fa=np.zeros(len(f),dtype=[('n','u1'),('i','<i4',3)]);fa['n']=3;fa['i']=f;o.write(fa.tobytes())
print('verts',len(v),'tris',len(f),time.time()-t0)
