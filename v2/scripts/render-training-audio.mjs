import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=fileURLToPath(new URL('..',import.meta.url))
const samples=JSON.parse(readFileSync(path.join(root,'audio-source','fluid-samples.json'),'utf8'))
const rate=24000
const decoded={}
for(const [name,sample] of Object.entries(samples)){
 const run=spawnSync('ffmpeg',['-v','error','-i','pipe:0','-f','f32le','-ac','1','-ar',String(rate),'pipe:1'],{input:Buffer.from(sample.base64,'base64'),maxBuffer:16*1024*1024})
 if(run.status!==0||run.stdout.length<1000)throw new Error('Audio sample decode failed: '+name+' (install ffmpeg; '+String(run.stderr||run.error||'')+')')
 const data=new Float32Array(run.stdout.length/4)
 let peak=0
 for(let i=0;i<data.length;i++){data[i]=run.stdout.readFloatLE(i*4);peak=Math.max(peak,Math.abs(data[i]))}
 if(peak<.001)throw Error('Empty instrument: '+name)
 let start=0
 while(start<data.length-1&&Math.abs(data[start])<peak*.025)start++
 decoded[name]=data.slice(Math.max(0,start-48))
 for(let i=0;i<decoded[name].length;i++)decoded[name][i]/=peak
}
// Events: instrument, start time, duration, semitone offset, mix amplitude.
// Every phrase is original; these are signals, not clips from commercial songs.
const n=(inst,t,d,p=0,g=1)=>[inst,t,d,p,g]
const bell=(t,d=.5,p=0,g=1)=>n('bell',t,d,p,g)
const kick=(t,g=.8)=>n('kick',t,.18,-9,g)
const drum=(t,g=.7)=>n('drum',t,.22,0,g)
const synth=(t,p,d=.22,g=.9)=>n('synth',t,d,p,g)
const bass=(t,p=0,d=.18,g=.65)=>n('bass',t,d,p,g)
const brass=(t,p,d=.25,g=1)=>n('brass',t,d,p,g)
const guitar=(t,p,d=.24,g=.8)=>n('guitar',t,d,p,g)
const tuba=(t,p,d=.2,g=.6)=>n('tuba',t,d,p,g)
// Original genre-specific mini-arrangements. No borrowed melodies or recordings.
const beat=60/148
const hat=(t,g=.36)=>n('hat',t,.09,0,g)
const punch=(t,g=1)=>n('punch',t,.22,0,g)
const clap=(t,g=.65)=>n('clap',t,.15,0,g)
const danceBeat=(t,p=0,backbeat=false)=>[punch(t,1),kick(t,.35),hat(t+beat/2,.48),bass(t+beat/2,p,.18,.9),...(backbeat?[clap(t)]:[])]
const rave=(t,p,d=.19,g=.85)=>[synth(t,p,d,g),synth(t,p+12,d,.22*g),synth(t,p+7,d,.32*g)]
const arpeggio=(t,notes,step=beat/4)=>notes.flatMap((p,i)=>rave(t+i*step,p,step*.90,.78))
const danceBars=(t,roots)=>roots.flatMap((p,i)=>danceBeat(t+i*beat,p,i%2===1))
const riff=(t,p,d=.16,g=.95)=>[guitar(t,p-4,d,g),guitar(t,p+3,d,g*.64),tuba(t,p,d,.32),punch(t,.65)]
const brassCall=(t,p,d=.16,g=.92)=>[brass(t,p,d,g),brass(t,p+7,d,g*.28),tuba(t,p,d,.35)]
const horns=(t,notes,step=.105)=>notes.flatMap((p,i)=>brassCall(t+i*step,p,step*.94))
const oompa=(t,p=0)=>[tuba(t,p,.15,.92),drum(t,.6),brass(t+.12,p+7,.10,.66)]
const blast=(t,p,d=.38)=>[...riff(t,p,d),...brassCall(t,p+12,d),drum(t,.88),clap(t,.4)]
const oddGroove=(t,p=0)=>[...oompa(t,p),...riff(t+.20,p,.10),...oompa(t+.40,p+7),...riff(t+.60,p,.11),...riff(t+.75,p,.12)]
export const score={
 pt:{
  'tick-3':[bell(0,.83,-7,.70)],'tick-2':[bell(0,.83,-4,.78)],'tick-1':[bell(0,.87,0,.90)],
  start:[bell(0,3.8,5,1),bell(.045,4.5,-12,.38)],
  round:[bell(0,1.8,5,.92),bell(.22,2.9,5,.82)],
  rest:[bell(0,4.6,-12,1)],
  station:[bell(0,.85,-4),bell(.22,.85,-4),bell(.44,2.5,0)],
  finish:[bell(0,1.5,0),bell(.44,4.8,-12,1)],
  registered:[bell(0,.42,7,.75)],
 },
 personal:{
  'tick-3':[punch(0,.72),...rave(.10,0,.20,.75),hat(.31)], 
  'tick-2':[punch(0,.82),...rave(.10,3,.20,.82),hat(.31)], 
  'tick-1':[punch(0),clap(0),...rave(.10,7,.30)],
  start:[...danceBars(0,[0,0,0,0]),...rave(0,12,.30),...arpeggio(.38,[12,7,3,7,12,15,19,15]),...rave(1.25,12,.40)],
  round:[...danceBars(0,[0,0]),...rave(0,12,.16),...rave(.21,7,.15),...rave(.42,12,.35)],
  rest:[clap(0),...rave(0,12,.22,.75),...rave(.25,7,.20,.68),...rave(.48,0,.44,.60),bass(.48,0,.35,.65)],
  station:[...danceBars(0,[0,0,0]),...rave(.08,7,.15),...rave(.28,7,.15),...rave(.50,7,.15),...rave(.78,12,.34)],
  finish:[punch(0),clap(0),...rave(0,12,.26),...rave(.41,7,.26),...rave(.82,3,.28),...rave(1.24,0,.75,.72),bass(1.24,0,.65)],
  registered:[punch(0,.7),...rave(.10,12,.13),...rave(.25,19,.14)],
 },
 group:{
  'tick-3':[drum(0,.8),...brassCall(.10,0,.25,.76)],
  'tick-2':[drum(0,.9),...brassCall(.10,1,.25,.86)],
  'tick-1':[drum(0,1),...brassCall(.10,4,.30,1),...riff(.10,0,.23)],
  start:[...blast(0,5,.28),...riff(.30,0,.14),...riff(.45,0,.14),...horns(.62,[5,7,8,7,5,4]),...blast(1.30,0,.42),punch(1.45,.8)],
  round:[...oompa(0),...horns(.10,[0,1,4,5,4,1]),...riff(.76,0,.13),...blast(.92,7,.34)],
  rest:[...riff(0,0,.20),drum(0),...horns(.24,[12,11,8,7,5,4,1],.10),...riff(1.02,0,.29)],
  station:[...oompa(0),...brassCall(.08,0,.12),...oompa(.26),...brassCall(.34,0,.12),...riff(.52,1,.15),...horns(.70,[4,5,7]),...blast(1.05,0,.29)],
  finish:[...blast(0,7,.22),...brassCall(.30,5,.24),...riff(.62,1,.18),...brassCall(.62,4,.26),...blast(.96,0,.88),drum(1.05,.70)],
  registered:[...riff(0,0,.17),...brassCall(.19,7,.18),drum(.19,.55)],
 }
}
// Victory signals are separate from timer-finish cues. Original mini-fanfares.
score.pt.pr=[bell(0,1.8,7),bell(.62,2.0,7),bell(1.24,2.4,12),bell(2.1,5.2,-12,.95),bell(2.13,4.0,0,.45)]
// Victory is a separate major-key anthem, not a longer copy of finish or start.
score.personal.pr=[...danceBars(0,[5,5,10,10,0,0,7,7,5,5,0,0]),...rave(0,17,.55),...rave(.61,19,.25),...rave(.91,21,.37),...rave(1.42,22,.28),...rave(1.72,17,.45),...rave(2.32,19,.28),...rave(2.64,24,.72),...rave(3.48,21,.28),...rave(3.81,22,.28),...rave(4.14,24,.80),clap(4.14,1),n('sweep',4.12,.72,0,.5)]
// A triumphant offbeat brass call-and-response with heavy half-time ending.
score.group.pr=[...brassCall(0,12,.38),...oompa(.05,5),...brassCall(.47,10,.18),...brassCall(.69,12,.36),...riff(1.12,5,.26),...riff(1.46,5,.18),...riff(1.69,10,.22),...horns(1.96,[12,15,17,15,12],.13),...oompa(2.66,10),...horns(2.73,[10,12,15,17,19],.13),...riff(3.42,3,.25),...riff(3.75,5,.25),...brassCall(4.08,17,.42),...blast(4.64,5,.95),punch(4.86),drum(5.08,1)]
function mix(events){
 const naturalDuration=(inst,d,p)=>inst==='bell'?Math.min(d,(decoded[inst].length-1)/(rate*2**(p/12))):d
 const length=Math.ceil((Math.max(...events.map(([inst,t,d,p])=>t+naturalDuration(inst,d,p)))+.035)*rate)
 const pcm=new Float32Array(length)
 for(const [inst,t,d,p,g] of events){
  const src=decoded[inst],ratio=2**(p/12),offset=Math.round(t*rate),count=Math.round(naturalDuration(inst,d,p)*rate)
  if(!src&&!['punch','hat','clap'].includes(inst))throw Error('Unknown instrument: '+inst)
  for(let i=0;i<count&&offset+i<length;i++){
   const pos=i*ratio,k=Math.floor(pos)
   if(!src){
    const t0=i/rate, noise=Math.sin((i+1)*12.9898)*43758.5453
    const white=2*(noise-Math.floor(noise))-1
    const wave=inst==='punch'?(Math.sin(2*Math.PI*(52*t0+2.6*(1-Math.exp(-t0*42))))*Math.exp(-t0*18)+white*.22*Math.exp(-t0*110)):inst==='hat'?white*Math.exp(-t0*48):white*(Math.exp(-t0*34)+.45*Math.exp(-Math.abs(t0-.022)*90))
    pcm[offset+i]+=wave*g*Math.min(1,i/(rate*.002),Math.max(0,(count-i)/(rate*.018)))
    continue
   }
   if(k+1>=src.length)break
   const edge=Math.min(1,i/(rate*.004),Math.max(0,(count-i)/(rate*(inst==='bell'?.18:.035))))
   pcm[offset+i]+=(src[k]+(src[k+1]-src[k])*(pos-k))*edge*g
  }
 }
 let peak=0
 for(let i=0;i<pcm.length;i++){pcm[i]=Math.tanh(pcm[i]*1.7);peak=Math.max(peak,Math.abs(pcm[i]))}
 if(peak<.01)throw Error('Silent cue')
 const out=Buffer.alloc(44+pcm.length*2)
 out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(pcm.length*2,40)
 let energy=0
 for(let i=0;i<pcm.length;i++){const v=pcm[i]*.96/peak;energy+=v*v;out.writeInt16LE(Math.round(v*32767),44+i*2)}
 return {out,rms:Math.sqrt(energy/pcm.length)}
}
const dest=path.join(root,'public','audio','gazelle-v5')
mkdirSync(dest,{recursive:true})
let total=0
for(const [profile,signals] of Object.entries(score))for(const [signal,events] of Object.entries(signals)){
 const {out,rms}=mix(events)
 if(rms<(profile==='pt'?.025:.06))throw Error('Cue is too quiet: '+profile+'/'+signal)
 writeFileSync(path.join(dest,profile+'-'+signal+'.wav'),out);total++
}
if(total!==30)throw Error('Expected 30 cue files, got '+total)
writeFileSync(path.join(dest,'credits.txt'),readFileSync(path.join(root,'audio-source','CREDITS.txt'),'utf8'))
console.log('Rendered '+total+' local instrument-sample WAV cues (EISEN, DISKOPANZER, BALKAN BERSERK).')
