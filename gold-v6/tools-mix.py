import numpy as np, scipy.io.wavfile as w, scipy.signal as sg
SR=48000;D=15.5;N=int(SR*D);rng=np.random.default_rng(7)
L=lambda n:w.read(f'/tmp/k/{n}.wav')[1].astype(np.float32)/32768
def pitch(x,r):  # resample: r<1 lowers pitch & lengthens
    return sg.resample(x,int(len(x)/r)).astype(np.float32)
dry=np.zeros((N,2),np.float32);wet_send=np.zeros((N,2),np.float32)
def put(x,t,g=1,pan=0,send=.5):
    i=int(t*SR);x=x[:N-i]*g;l,r=np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)
    dry[i:i+len(x),0]+=x*l;dry[i:i+len(x),1]+=x*r;wet_send[i:i+len(x),0]+=x*l*send;wet_send[i:i+len(x),1]+=x*r*send
def bp(x,lo,hi):return sg.sosfilt(sg.butter(2,[lo,hi],'band',fs=SR,output='sos'),x).astype(np.float32)
def lp(x,f):return sg.sosfilt(sg.butter(2,f,'low',fs=SR,output='sos'),x).astype(np.float32)
t=np.arange(N)/SR
# 1) dark bed: pink-ish noise through slowly opening lowpass + sub rumble, 1.0s -> long fade
pink=lp(rng.standard_normal(N).astype(np.float32),600)
env=np.clip((t-1.0)/4,0,1)**2*np.clip((15.2-t)/3,0,1)
bed=np.zeros(N,np.float32)
for k,(lo,hi) in enumerate([(40,120),(120,400),(400,1600)]):
    m=0.5+0.5*np.sin(2*np.pi*(0.07+0.03*k)*t+k)
    bed+=bp(rng.standard_normal(N).astype(np.float32),lo,hi)*m*[0.9,0.35,0.08][k]
sub=np.sin(2*np.pi*np.cumsum(38+4*np.clip((t-1)/6,0,1))/SR).astype(np.float32)*0.25
# riser into the crack (filtered noise sweep 5.5->8.2)
rise_env=np.clip((t-5.5)/2.7,0,1)**3*(t<8.2)
fc=300+6000*np.clip((t-5.5)/2.7,0,1)**2
bands=[(200,600),(600,1800),(1800,5000),(5000,14000)];p=np.clip((t-5.5)/2.7,0,1)
riser=np.zeros(N,np.float32)
for k,(lo,hi) in enumerate(bands):
    wgt=np.clip(1-np.abs(p*3-k),0,1);riser+=bp(rng.standard_normal(N).astype(np.float32),lo,hi)*wgt
bedmix=(bed+sub)*env*0.55+riser*rise_env*0.18
dry[:,0]+=bedmix;dry[:,1]+=np.roll(bedmix,240);wet_send[:,0]+=bedmix*.3;wet_send[:,1]+=bedmix*.3
# 2) glass ping at reveal (4.6): light glass + bell pitched up a fifth, long tail via reverb
put(L('impactGlass_light_001'),4.6,.6,-.3,.9);put(pitch(L('impactBell_heavy_001'),1.5),4.62,.18,.3,1.0)
# 3) fracture at 8.2: heavy glass x2 + medium, low thump, pitched-down heavy for body
put(L('impactGlass_heavy_001'),8.2,.8,-.15,.6);put(L('impactGlass_heavy_004'),8.23,.7,.2,.6);put(L('impactGlass_medium_002'),8.27,.5,0,.7)
put(pitch(L('impactGlass_heavy_001'),.5),8.2,.55,0,.5)
th=np.exp(-np.arange(int(.7*SR))/SR*7)*np.sin(2*np.pi*np.cumsum(np.linspace(90,38,int(.7*SR)))/SR);put(th.astype(np.float32),8.2,.7,0,.3)
# 3b) impact boom: pressure-wave sub drop + lowpassed noise blast, then debris settling (scattered recorded glass ticks)
nb=int(1.6*SR);tb=np.arange(nb)/SR
boom=np.sin(2*np.pi*np.cumsum(28+50*np.exp(-tb*6))/SR)*np.exp(-tb*2.6)*(1-np.exp(-tb*200));put(boom.astype(np.float32),8.2,.85,0,.25)
blast=lp(rng.standard_normal(nb).astype(np.float32),900)*np.exp(-tb*5);put(blast,8.2,.5,0,.6)
deb=['impactGlass_light_000','impactGlass_light_002','impactGlass_light_004','impactGlass_light_001','impactGlass_medium_000','impactGlass_medium_003','impactGlass_heavy_002']
tt=8.45
for k in range(16):
    x=pitch(L(deb[k%len(deb)]),rng.uniform(.85,1.35));put(x,tt,.32*np.exp(-k*.16),rng.uniform(-.8,.8),.7);tt+=rng.uniform(.05,.16)*(1+k*.08)
# 4) title land 10.2: bell pitched down two octaves (dark gong body) + soft sub + air
put(pitch(L('impactBell_heavy_000'),.25),10.2,.45,0,.8);put(pitch(L('impactBell_heavy_000'),.5),10.21,.15,.2,.9)
thl=np.exp(-np.arange(int(2.2*SR))/SR*2.2)*np.sin(2*np.pi*np.cumsum(np.linspace(62,34,int(2.2*SR)))/SR);put(thl.astype(np.float32),10.2,.5,0,.2)
air=bp(rng.standard_normal(int(2*SR)).astype(np.float32),5000,14000)*np.exp(-np.arange(int(2*SR))/SR*2.5);put(air,10.2,.05,0,.8)
# 5) final shimmer 12.4
put(L('impactGlass_light_003'),12.4,.35,.4,1.0)
# reverb: stereo exponential-decay noise IR (3.8s), darkening tail, predelay 25ms
n=int(3.8*SR);ti=np.arange(n)/SR;ir=np.zeros((n,2),np.float32)
for c in range(2):
    x=rng.standard_normal(n).astype(np.float32)*np.exp(-ti*1.9)
    lo=lp(x,2500);ir[:,c]=x*np.exp(-ti*2.5)+lo*(1-np.exp(-ti*2.5))
ir=np.vstack([np.zeros((int(.025*SR),2),np.float32),ir]);ir/=np.sqrt((ir**2).sum(0))
wet=np.stack([sg.fftconvolve(wet_send[:,c],ir[:,c])[:N] for c in range(2)],1)
mix=dry+wet*0.9
mix=sg.sosfilt(sg.butter(2,25,'high',fs=SR,output='sos'),mix,axis=0)
# gentle bus compression (soft knee via tanh) and -1 dBFS ceiling
pk=np.abs(mix).max();mix=mix/pk*1.2;mix=np.tanh(mix)/np.tanh(1.2)*10**(-1.5/20)
fade=np.clip((D-t)/0.6,0,1)[:,None];mix*=fade
print('peak dBFS',20*np.log10(np.abs(mix).max()),'rms dB',20*np.log10(np.sqrt((mix**2).mean())))
w.write('/tmp/k/intro.wav',SR,(mix*32767).astype(np.int16))
