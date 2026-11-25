import numpy as np, os, json, subprocess
from scipy.signal import butter,sosfilt
from scipy.io.wavfile import write
from pathlib import Path
SR=44100
rng=np.random.default_rng(4926)
root=str(Path(__file__).resolve().parents[1]/'public'/'audio'/'gazelle-generative-v1')
def hz(m): return 440*2**((m-69)/12)
def time(d): return np.arange(int(d*SR))/SR
def filt(x,f,typ='lowpass'): return sosfilt(butter(2,f,fs=SR,btype=typ,output='sos'),x)
def env(t,a=.008,r=.07): return np.minimum(1,t/a)*np.minimum(1,np.maximum(0,(t[-1]-t)/r))
def tone(m,d,kind):
 t=time(d); f=hz(m); ph=2*np.pi*f*t
 if kind=='gong':
  x=sum(a*np.sin(ph*r+0.3*np.sin(2*np.pi*1.8*t))*np.exp(-t*k) for a,r,k in [(1,1,1.2),(.65,2.01,2.3),(.48,2.76,3.2),(.31,4.12,4),(.22,5.47,5),(.12,8.12,9)])
  x+=.16*filt(rng.normal(size=len(t)),2200)*np.exp(-t*35); return x*env(t,.002,.10)/2
 if kind=='synth':
  x=sum(np.sin(ph*h+0.1*np.sin(2*np.pi*5*t))/h for h in range(1,9)); x+=.35*sum(np.sin(ph*h*1.005)/h for h in range(1,6)); return filt(x,5200)*env(t,.008,.055)*.55
 if kind=='bass': return np.tanh(1.9*(np.sin(ph)+.36*np.sin(2*ph)+.15*np.sin(3*ph)))*env(t,.004,.045)
 if kind=='brass':
  p=ph+.12*np.sin(2*np.pi*5.3*t); x=sum(np.sin(p*h)/h**.72 for h in range(1,9)); return filt(np.tanh(x*.8),4400)*env(t,.027,.065)*(.8+.2*np.sin(2*np.pi*4.7*t))
 if kind=='guitar':
  x=sum(np.sin(ph*h)/h for h in range(1,13)); x=np.tanh(3*x*np.exp(-t*2.4)); return filt(filt(x,5200),105,'highpass')*env(t,.003,.045)
 if kind=='choir': return (np.sin(ph)+.4*np.sin(2*ph)+.2*np.sin(3*ph))*env(t,.09,.15)*.55
def drum(d,kind):
 t=time(d); n=rng.normal(size=len(t))
 if kind=='kick': return np.sin(2*np.pi*(48*t+95*(1-np.exp(-t*35))/35))*np.exp(-t*12)*env(t,.001,.02)
 if kind=='snare': return (.8*filt(n,1400,'highpass')+.25*np.sin(2*np.pi*185*t))*np.exp(-t*14)*env(t,.001,.025)
 if kind=='hat': return filt(n,6500,'highpass')*np.exp(-t*35)*env(t,.001,.012)
 if kind=='tom': return np.sin(2*np.pi*(75*t+130*(1-np.exp(-t*18))/18))*np.exp(-t*8)*env(t,.002,.03)
 if kind=='crash': return filt(n,2800,'highpass')*np.exp(-t*3.1)*env(t,.002,.08)
def blank(d): return np.zeros((int(d*SR),2))
def add(y,x,start,gain=1,pan=0):
 i=int(start*SR); l=min(len(x),len(y)-i)
 if l>0: y[i:i+l,0]+=x[:l]*gain*np.sqrt((1-pan)/2); y[i:i+l,1]+=x[:l]*gain*np.sqrt((1+pan)/2)
def note(y,m,d,kind,s,g=.5,p=0): add(y,tone(m,d,kind),s,g,p)
def beat(y,s,kind,g=.6,d=.22,p=0): add(y,drum(d,kind),s,g,p)
def chord(y,notes,d,kind,s,g=.35):
 for j,m in enumerate(notes): note(y,m,d,kind,s,g,[-.5,.5,0,-.25,.25][j%5])
def master(y):
 x=y.copy()
 for sec,g in [(.035,.11),(.071,.07),(.113,.045)]:
  n=int(sec*SR); y[n:]+=x[:-n,::-1]*g
 y=np.tanh(y*1.1); peak=np.max(np.abs(y)); y*=.89/max(peak,1e-8)
 n=min(int(.018*SR),len(y)); y[-n:]*=np.linspace(1,0,n)[:,None]
 return np.int16(y*32767)
profiles=['eisen','diskopanzer','balkan-berserk']
shorts={'countdown-3':(.32,[0]),'countdown-2':(.32,[2]),'countdown-1':(.36,[5]),'start':(1.25,[0,7,12]),'work':(.85,[0,7]),'rest':(.85,[7,0]),'round':(.85,[0,4,7]),'minute':(.48,[0]),'warning':(.72,[0,0,5])}
finishes={'finish-amrap':(4.5,[0,3,5,7,12]),'finish-emom':(4.4,[0,0,5,7,12]),'finish-for-time':(4.6,[0,5,7,10,12]),'finish-tabata':(4.3,[0,3,7,7,12]),'finish-death-by':(4.7,[0,5,3,7,12]),'finish-general':(4.4,[0,4,5,7,12])}
manifest=[]
def save(y,profile,name,description):
 folder=os.path.join(root,profile); os.makedirs(folder,exist_ok=True); wav=os.path.join(folder,name+'.wav'); mp3=os.path.join(folder,name+'.mp3'); write(wav,SR,master(y)); subprocess.run(['ffmpeg','-v','error','-y','-i',wav,'-codec:a','libmp3lame','-b:a','160k',mp3],check=True); os.remove(wav)
 manifest.append({'profile':profile,'event':name,'file':f'{profile}/{name}.mp3','duration_seconds':round(len(y)/SR,2),'description':description})
for p in profiles:
 for name,(d,seq) in shorts.items():
  y=blank(d); count=len(seq); spacing=(d-.24)/max(count,1); base=45 if p=='eisen' else 60 if p=='diskopanzer' else 58
  for j,k in enumerate(seq):
   s=j*spacing; dur=min(d-s-.025,max(.18,spacing+.10))
   if p=='eisen': note(y,base+k,dur,'gong',s,1)
   elif p=='diskopanzer':
    note(y,base+k,dur,'synth',s,.65,(-1)**j*.22); note(y,base+k-24,dur,'bass',s,.40); beat(y,s,'kick',.5,.16)
   else:
    note(y,base+k,dur,'brass',s,.62, -.25); note(y,base+k+12,dur,'brass',s,.30,.35); note(y,base+k-24,dur,'guitar',s,.32); beat(y,s,'tom',.43,.19)
  save(y,p,name,'Kort, sjølvstendig timersignal')
 for name,(d,seq) in finishes.items():
  y=blank(d); base=43 if p=='eisen' else 57 if p=='diskopanzer' else 55; climax=d-.87
  for j,k in enumerate(seq):
   s=climax*j/len(seq); dur=min(.7,d-s-.05); gain=.25+.14*j
   if p=='eisen':
    note(y,base+k,dur,'gong',s,gain*1.3); beat(y,s,'tom',gain*.65,.28)
   elif p=='diskopanzer':
    chord(y,[base+k,base+k+12,base+k+19],dur,'synth',s,gain*.48); note(y,base+k-12,dur,'bass',s,gain*.6); beat(y,s,'kick',gain,.26)
   else:
    chord(y,[base+k,base+k+7,base+k+12],dur,'brass',s,gain*.48); chord(y,[base+k-12,base+k-5],dur,'guitar',s,gain*.52); beat(y,s,'tom',gain,.27)
  for j,s in enumerate(np.arange(.12,climax,.25 if p=='diskopanzer' else .36)):
   beat(y,s,'hat' if p=='diskopanzer' else 'snare' if p=='balkan-berserk' else 'tom',.07+.25*s/climax,.12)
  for s in np.arange(climax-.65,climax,.11): beat(y,s,'snare',.18+.25*(s-(climax-.65))/.65,.12)
  if p=='eisen': chord(y,[base,base+7,base+12],.84,'gong',climax,.7)
  elif p=='diskopanzer': chord(y,[base,base+4,base+7,base+12,base+19],.78,'synth',climax,.35); note(y,base-24,.78,'bass',climax,.8)
  else: chord(y,[base,base+4,base+7,base+12,base+19],.78,'brass',climax,.36); chord(y,[base-12,base-5,base],.78,'guitar',climax,.44)
  beat(y,climax,'kick',.9,.36); beat(y,climax,'crash',.44,.82)
  save(y,p,name,'Crescendo til markert finaletreff; original komposisjon')
D=11.6; y=blank(D); base=50
mel=[(0,0),(.42,7),(.84,12),(1.45,10),(1.85,12),(2.45,15),(3.05,14),(3.55,12),(4.15,7),(4.65,12),(5.15,15),(5.65,17),(6.2,19),(6.7,17),(7.25,19),(7.72,22),(8.15,24),(8.6,22),(9.0,24),(9.35,26)]
for s,k in mel:
 g=.22+.27*s/10; note(y,base+k,.47,'brass',s,g,-.3); note(y,base+k+12,.45,'brass',s,g*.62,.35)
for j,s in enumerate(np.arange(0,10.05,.46)):
 k=[0,0,5,5,3,3,7,7][(j//2)%8]; g=.18+.28*s/10
 chord(y,[base+k-12,base+k-5,base+k],.44,'guitar',s,g*.58); note(y,base+k-24,.42,'bass',s,g*.6); beat(y,s,'kick' if j%2==0 else 'snare',g*1.2,.24)
 if j%4==0: chord(y,[base+k,base+k+7,base+k+12],1.55,'choir',s,g*.25)
for s in np.arange(8.4,10.1,.14): beat(y,s,'snare',.13+.31*(s-8.4)/1.7,.13)
for s,k in [(9.65,19),(9.87,24),(10.12,24)]: note(y,base+k,.30,'brass',s,.55)
climax=10.35
chord(y,[38,45,50,54,57,62,69,74],1.18,'brass',climax,.26); chord(y,[38,45,50,57],1.18,'guitar',climax,.38); chord(y,[50,57,62,66,69],1.17,'choir',climax,.32); note(y,38,1.18,'gong',climax,.6); beat(y,climax,'kick',1,.4); beat(y,climax,'crash',.65,1.18)
save(y,'pr-victory','pr-victory','Episk original fanfare med oppbygging og avslutta finaletreff')
assert len(manifest)==46
with open(root+'/manifest.json','w') as f: json.dump({'version':'1.0','module':'Generativ lyd (prosedyresyntese)','default_enabled':False,'manual_finish_button_sound':False,'format':'MP3 stereo 44.1 kHz 160 kbps','sounds':manifest},f,indent=2,ensure_ascii=False)
print('Rendered 46 original alternative MP3 cues')
