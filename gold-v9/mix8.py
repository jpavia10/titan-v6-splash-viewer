import numpy as np,scipy.io.wavfile as w,scipy.signal as sg
SR=48000;D=15.0;N=int(SR*D);rng=np.random.default_rng(8);t=np.arange(N)/SR
def L(n,a=None,b=None):
    sr,x=w.read(f'/workspace/obs8/fs/{n}.wav');x=x.astype(np.float32)/32768
    if x.ndim==1:x=np.stack([x,x],1)
    if a is not None:x=x[int(a*SR):int(b*SR)]
    return x
def sos(kind,f,o=2):return sg.butter(o,f,kind,fs=SR,output='sos')
def filt(x,kind,f,o=2):return sg.sosfilt(sos(kind,f,o),x,axis=0).astype(np.float32)
def fade(x,fi,fo):
    n=len(x);e=np.ones(n,np.float32);a=int(fi*SR);b=int(fo*SR)
    if a:e[:a]=np.linspace(0,1,a)**2
    if b:e[-b:]=np.linspace(1,0,b)**2
    return x*e[:,None]
def pitch(x,r):return sg.resample(x,int(len(x)/r),axis=0).astype(np.float32)
dry=np.zeros((N,2),np.float32);send=np.zeros((N,2),np.float32)
def db(g):return 10**(g/20)
def put(x,at,g=0,pan=0,rv=.3):
    i=int(at*SR);x=x[:max(0,N-i)]*db(g);l,r=np.sqrt((1-pan)/2)*1.414,np.sqrt((1+pan)/2)*1.414
    x=x*np.array([l,r],np.float32);dry[i:i+len(x)]+=x;send[i:i+len(x)]+=x*rv
# ---- bed: dark analog drone (CC0) — dark EQ, slow swell into the boom, sidechain-ish dip at hit, settles after
bed=L('658648',20,35.5);bed=filt(filt(bed,'low',1800,4),'high',35);bed=fade(bed,2.5,2.0)
tb_=np.arange(len(bed))/SR+0.5;env=np.interp(tb_,[0,3,7.8,8.2,8.25,9.5,13,15],[0,.55,1.0,1.0,.25,.6,.5,0])[:,None].astype(np.float32)
put(bed*env,0.5,-17,0,.25)
# ---- reveal transition: whoosh (CC0) as the light sweep crosses (1.3s) + glass shimmer
put(filt(fade(L('256911',0,1.4),.02,.3),'high',120),1.15,-13,-.4,.45)
put(L('k_impactGlass_light_001'),2.35,-16,.35,.8);put(pitch(L('k_impactBell_heavy_001'),1.5),2.36,-24,-.3,1.0)
put(filt(fade(L('256911',6.2,7.8),.02,.4),'low',6000),4.4,-17,.4,.5)
# ---- pre-boom: reversed slow-motion glass shatter sucks into the hit (trailer reverse-riser)
rs=L('349905')[::-1].copy();rs=filt(rs,'high',200);put(fade(rs,1.5,0),8.205-len(rs)/SR,-14,0,.5)
# ---- BOOM 8.205s: layered deep cinematic impacts (CC0) + recorded glass break + Kenney heavy glass + slow shatter tail
B=8.205
put(L('754420'),B,-3.5,0,.25);put(filt(L('754423'),'low',400),B+.004,-6,0,.15)
put(L('221528',.28,1.9),B-.005,-5,-.1,.35);put(L('k_impactGlass_heavy_001'),B+.01,-8,.3,.4);put(L('k_impactGlass_heavy_004'),B+.03,-9,-.35,.4)
put(filt(L('349905',.6,5.1),'high',300),B+.08,-15,.2,.6)
# ---- debris settle: tumbling stones + shards (CC0) + scattered Kenney glass ticks, panned wide
put(filt(L('184383',3.9,6.0),'high',180),B+.45,-15,-.5,.35);put(filt(L('184383',11.9*0+2.95,3.6),'high',180),B+1.1,-18,.6,.35)
put(L('156579',.35,1.7),B+.9,-6,.45,.45);put(L('156579',.35,1.7)[::1],B+1.75,-11,-.6,.5)
ticks=['k_impactGlass_light_000','k_impactGlass_light_002','k_impactGlass_light_003','k_impactGlass_medium_000','k_impactGlass_medium_003']
tt=B+.5
for k in range(14):put(pitch(L(ticks[k%5]),rng.uniform(.9,1.3)),tt,-14-k*.9,rng.uniform(-.9,.9),.6);tt+=rng.uniform(.07,.2)*(1+k*.1)
# ---- title land (10.2s): soft cinematic impact (CC0), low-passed, + bell body two octaves down
put(filt(L('719831'),'low',900),10.2,-14,0,.4);put(pitch(L('k_impactBell_heavy_000'),.25),10.21,-17,0,.8)
put(filt(fade(L('256911',6.2,7.8),.02,.4),'low',3000)[::-1].copy(),10.2-1.5,-22,0,.5)
# ---- reverb: stereo 3.2 s hall-ish IR (decorrelated, darkening), 22 ms predelay
n=int(3.2*SR);ti=np.arange(n)/SR;ir=np.zeros((n,2),np.float32)
for c in range(2):
    x=rng.standard_normal(n).astype(np.float32);hi=x*np.exp(-ti*3.2);lo=filt(x,'low',1800)*np.exp(-ti*1.7);ir[:,c]=.6*hi+lo
ir=np.vstack([np.zeros((int(.022*SR),2),np.float32),ir]);ir/=np.sqrt((ir**2).sum(0))
wet=np.stack([sg.fftconvolve(send[:,c],ir[:,c])[:N] for c in range(2)],1);wet=filt(filt(wet,'high',120),'low',9000)
mix=dry+wet*.55
# ---- master: HPF 28 Hz, gentle tilt, glue compressor (RMS, 3:1, slow release), then limiter
mix=filt(mix,'high',28)
lvl=np.sqrt(filt((mix**2).mean(1),'low',8,1).clip(1e-12));ldb=20*np.log10(lvl);th=-20;gr=np.minimum(0,(th-ldb)*(1-1/3))
g=db(gr);mix=mix*g[:,None]*db(9)
pk=np.abs(mix).max(1);la=sg.maxfilter1d if False else None
from scipy.ndimage import maximum_filter1d,uniform_filter1d
look=maximum_filter1d(pk,int(.005*SR));need=np.minimum(1,db(-1.2)/np.maximum(look,1e-9));need=uniform_filter1d(np.minimum.accumulate(need[::-1])[::-1]*0+need,int(.004*SR))
need=np.minimum(need,1);mix=mix*need[:,None]
mix*=np.clip((D-t)/.4,0,1)[:,None]
print('peak',20*np.log10(np.abs(mix).max()),'clip',(np.abs(mix)>.999).sum())
w.write('/workspace/obs8/intro8.wav',SR,(np.clip(mix,-1,1)*32767).astype(np.int16))
