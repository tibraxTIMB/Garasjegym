import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=fileURLToPath(new URL('..',import.meta.url))
const samples=JSON.parse(readFileSync(path.join(root,'audio-source','fluid-samples.json'),'utf8'))
const rate=32000
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
const n=(inst,t,d,p=0,g=1,pan=0)=>[inst,t,d,p,g,pan]
const gong=(t,d=4.8,g=.85)=>n('gong',t,d,0,g)
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
const danceBeat=(t,p=0,backbeat=false)=>[punch(t,1),kick(t,.20),hat(t+beat/2,.38),n('clubBass',t+beat*.18,beat*.29,p,.78),n('clubBass',t+beat*.53,beat*.37,p,.87),...(backbeat?[clap(t),n('snare',t,.17,0,.3)]:[])]
const rave=(t,p,d=.19,g=.85)=>[n('supersaw',t,d,p,g),n('supersaw',t+.006,d,p+12,.19*g,-.35),n('synth',t,d,p,.19*g,.35)]
const chord=(t,p,d=.35,major=false,g=.50)=>[n('supersaw',t,d,p,g,-.35),n('supersaw',t+.008,d,p+(major?4:3),g*.6,.35),n('supersaw',t,d,p+7,g*.65,.10)]
const arpeggio=(t,notes,step=beat/4)=>notes.flatMap((p,i)=>rave(t+i*step,p,step*.90,.78))
const danceBars=(t,roots)=>roots.flatMap((p,i)=>danceBeat(t+i*beat,p,i%2===1))
const riff=(t,p,d=.16,g=.95)=>[n('guitar',t,d,p-4,g*.8,-.64),n('guitar',t+.008,d,p-4,g*.76,.64),n('guitar',t+.003,d,p+3,g*.36,0),tuba(t,p,d,.38),punch(t,.63)]
const brassCall=(t,p,d=.16,g=.92)=>[n('brass',t,d,p,g,-.22),n('brass',t+.009,d,p-12,g*.43,.46),n('brass',t+.013,d,p+7,g*.20,-.54),tuba(t,p,d,.29)]
const horns=(t,notes,step=.105)=>notes.flatMap((p,i)=>brassCall(t+i*step,p,step*.94))
const oompa=(t,p=0)=>[tuba(t,p,.15,.92),drum(t,.48),n('snare',t+.12,.10,0,.33),brass(t+.12,p+7,.10,.66)]
const blast=(t,p,d=.38)=>[...riff(t,p,d),...brassCall(t,p+12,d),drum(t,.88),clap(t,.4)]
const oddGroove=(t,p=0)=>[...oompa(t,p),...riff(t+.20,p,.10),...oompa(t+.40,p+7),...riff(t+.60,p,.11),...riff(t+.75,p,.12),n('snare',t+.4,.13,0,.45)]
export const score={
 pt:{
  'tick-3':[bell(0,.83,-7,.70)],'tick-2':[bell(0,.83,-4,.78)],'tick-1':[bell(0,.87,0,.90)],
  start:[bell(0,3.8,5,1),gong(.045,3.2,.48)],
  round:[bell(0,1.8,5,.92),bell(.22,2.9,5,.82)],
  rest:[gong(0,4.2,.92),bell(0,1.3,-7,.28)],
  station:[bell(0,.85,-4),bell(.22,.85,-4),bell(.44,2.5,0)],
  finish:[bell(0,1.5,0),gong(.44,5.4,1)],
  registered:[bell(0,.42,7,.75)],
 },
 personal:{
  'tick-3':[punch(0,.72),...rave(.10,0,.20,.75),hat(.31)], 
  'tick-2':[punch(0,.82),...rave(.10,3,.20,.82),hat(.31)], 
  'tick-1':[punch(0),clap(0),...rave(.10,7,.30)],
  start:[...danceBars(0,[0,0,8,7,0]),...chord(0,0,.34),...rave(0,12,.32),...arpeggio(.40,[12,7,15,7,12,19,15,7]),...chord(.81,8,.36),...chord(1.22,7,.35),...rave(1.62,12,.35),n('crash',0,.55,0,.35)],
  round:[...danceBars(0,[0,0]),...rave(0,12,.16),...rave(.20,7,.15),...rave(.40,12,.30)],
  rest:[clap(0,.65),...rave(0,12,.20,.75),...rave(.23,7,.19,.68),...chord(.46,0,.42,false,.35),...rave(.46,0,.36,.60)],
  station:[clap(0),hat(.13),...rave(.03,7,.12),...rave(.20,7,.12),...rave(.39,10,.22),punch(.40,.65)],
  finish:[punch(0),clap(0),...rave(0,12,.26),...rave(.41,7,.26),...rave(.82,3,.28),...rave(1.24,0,.75,.72),bass(1.24,0,.65)],
  registered:[punch(0,.7),...rave(.10,12,.13),...rave(.25,19,.14)],
 },
 group:{
  'tick-3':[drum(0,.8),...brassCall(.10,0,.25,.76)],
  'tick-2':[drum(0,.9),...brassCall(.10,1,.25,.86)],
  'tick-1':[drum(0,1),...brassCall(.10,4,.30,1),...riff(.10,0,.23)],
  start:[...blast(0,5,.24),...oddGroove(.26,0),...horns(.30,[5,7,8,7,5,4],.115),...riff(1.25,1,.13),...riff(1.40,0,.13),...blast(1.58,0,.38),n('crash',0,.48,0,.3)],
  round:[...riff(0,0,.16),...horns(.12,[4,5,7,5],.10),...blast(.55,0,.24)],
  rest:[drum(0,.7),...brassCall(0,12,.20,.75),...brassCall(.24,7,.18,.70),...brassCall(.48,4,.18,.65),...brassCall(.70,0,.25,.58)],
  station:[...oompa(0),...brassCall(.06,0,.13),...oompa(.24),...brassCall(.29,1,.12),...brassCall(.48,4,.20),n('snare',.48,.16,0,.7)],
  finish:[...blast(0,7,.22),...brassCall(.30,5,.24),...riff(.62,1,.18),...brassCall(.62,4,.26),...blast(.96,0,.88),drum(1.05,.70)],
  registered:[...riff(0,0,.17),...brassCall(.19,7,.18),drum(.19,.55)],
 }
}
// Victory signals are separate from timer-finish cues. Original mini-fanfares.
score.pt.pr=[bell(0,1.8,7),bell(.62,2.0,7),bell(1.24,2.4,12),gong(2.1,5.3,1),bell(2.13,4.0,0,.45)]
// Victory is a separate major-key anthem, not a longer copy of finish or start.
score.personal.pr=[...danceBars(0,[5,5,10,10,0,0,7,7,5,5,0,0]),...chord(0,5,.65,true),...rave(0,17,.55),...rave(.61,19,.25),...rave(.91,21,.37),...rave(1.42,22,.28),...rave(1.72,17,.45),...rave(2.32,19,.28),...chord(2.64,0,.70,true),...rave(2.64,24,.72),...rave(3.48,21,.28),...rave(3.81,22,.28),...chord(4.14,0,.82,true),...rave(4.14,24,.80),clap(4.14,1),n('crash',4.14,.83,0,.42),n('sweep',4.12,.72,0,.5)]
// A triumphant offbeat brass call-and-response with heavy half-time ending.
score.group.pr=[...brassCall(0,12,.38),...oompa(.05,5),...brassCall(.47,10,.18),...brassCall(.69,12,.36),...riff(1.12,5,.26),...riff(1.46,5,.18),...riff(1.69,10,.22),...horns(1.96,[12,15,17,15,12],.13),...oompa(2.66,10),...horns(2.73,[10,12,15,17,19],.13),...riff(3.42,3,.25),...riff(3.75,5,.25),...brassCall(4.08,17,.42),...blast(4.64,5,.95),punch(4.86),punch(5.02),drum(5.08,1),n('crash',4.64,.94,0,.45)]
// A small offline studio: stereo arrangement, detuned band-limited leads,
// short room reflections, distorted double-track guitars, and modal gong decay.
// No streaming, third-party runtime, or copyrighted recordings.
const TAU=2*Math.PI
const synthetic=new Set(['punch','hat','clap','snare','crash','supersaw','clubBass','gong'])
function instrument(inst,t,p,d){
 const noise=Math.sin((Math.floor(t*rate)+1)*12.9898)*43758.5453
 const white=2*(noise-Math.floor(noise))-1
 if(inst==='punch')return Math.sin(TAU*(51*t+2.8*(1-Math.exp(-t*45))))*Math.exp(-t*17)+white*.22*Math.exp(-t*110)
 if(inst==='hat')return white*Math.exp(-t*48)
 if(inst==='clap'||inst==='snare')return white*(Math.exp(-t*30)+.42*Math.exp(-Math.abs(t-.022)*90))+.16*Math.sin(TAU*180*t)*Math.exp(-t*24)
 if(inst==='crash')return white*.45*Math.exp(-t*5)
 if(inst==='gong'){
  // Inharmonic metal modes ring at different rates, not a pitch-shifted bell.
  const modes=[[104,1,2.3],[167,.64,1.7],[241,.43,1.2],[379,.32,.9],[563,.24,.64],[842,.16,.38],[1247,.12,.24]]
  return modes.reduce((sum,[hz,g,decay])=>sum+g*Math.sin(TAU*hz*t+.23*Math.sin(TAU*2.1*t))*Math.exp(-t/decay),0)*.39+white*.14*Math.exp(-t*45)
 }
 if(inst==='supersaw'||inst==='clubBass'){
  const hz=(inst==='clubBass'?130.8128:523.2511)*2**(p/12)
  const detunes=inst==='clubBass'?[1,.997,1.003]:[.991,.996,1,1.004,1.009]
  let sum=0
  for(const detune of detunes)for(let h=1;h<=Math.min(inst==='clubBass'?11:9,Math.floor(rate*.43/(hz*detune)));h++)sum+=Math.sin(TAU*hz*detune*h*t+.13*h)/h*(inst==='clubBass'?Math.exp(-h*(.10+t*2)):.90**h)
  return Math.tanh(sum/detunes.length*1.2)*(inst==='clubBass'?Math.exp(-t*3):.92)
 }
 return 0
}
function mix(events,profile,signal){
 const naturalDuration=(inst,d,p)=>inst==='bell'?Math.min(d,(decoded[inst].length-1)/(rate*2**(p/12))):d
 const tail=signal.startsWith('tick-')||signal==='registered'? .025:profile==='pt'?.10:.13
 const length=Math.ceil((Math.max(...events.map(([inst,t,d,p])=>t+naturalDuration(inst,d,p)))+tail)*rate)
 const left=new Float32Array(length),right=new Float32Array(length)
 for(const [inst,t,d,p,g,pan=0] of events){
  const src=decoded[inst],ratio=2**(p/12),offset=Math.round(t*rate),count=Math.round(naturalDuration(inst,d,p)*rate)
  if(!src&&!synthetic.has(inst))throw Error('Unknown instrument: '+inst)
  const l=Math.sqrt((1-pan)/2)*g,r=Math.sqrt((1+pan)/2)*g
  for(let i=0;i<count&&offset+i<length;i++){
   const pos=i*ratio,k=Math.floor(pos),time=i/rate
   if(src&&k+1>=src.length)break
   const edge=Math.min(1,i/(rate*.005),Math.max(0,(count-i)/(rate*(inst==='bell'||inst==='gong'?.18:.026))))
   let wave=src?src[k]+(src[k+1]-src[k])*(pos-k):instrument(inst,time,p,d)
   if(inst==='guitar')wave=Math.tanh(wave*3.5)*.76
   left[offset+i]+=wave*edge*l;right[offset+i]+=wave*edge*r
  }
 }
 // A quiet stereo room rather than a dry General MIDI sound. Keep attacks
 // intelligible on small mono phone speakers; no long echoes on the 3-2-1.
 if(!signal.startsWith('tick-')&&signal!=='registered'){
  const dryL=left.slice(),dryR=right.slice()
  for(const [ms,g] of [[21,.10],[47,.075],[83,.043],[121,.025]]){
   const delay=Math.round(rate*ms/1000)
   for(let i=delay;i<length;i++){left[i]+=dryR[i-delay]*g;right[i]+=dryL[i-delay]*g}
  }
 }
 let peak=0
 for(let i=0;i<length;i++){left[i]=Math.tanh(left[i]*1.45);right[i]=Math.tanh(right[i]*1.45);peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]))}
 if(peak<.01)throw Error('Silent cue')
 const out=Buffer.alloc(44+length*4)
 out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*4,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(length*4,40)
 let energy=0,attack=0
 for(let i=0;i<length;i++){
  const l=left[i]*.89/peak,r=right[i]*.89/peak,m=(l+r)/2
  energy+=m*m;if(i<rate*.20)attack+=m*m
  out.writeInt16LE(Math.round(l*32767),44+i*4);out.writeInt16LE(Math.round(r*32767),46+i*4)
 }
 return {out,rms:Math.sqrt(energy/length),attack:Math.sqrt(attack/Math.min(length,rate*.20)),seconds:length/rate}
}
const dest=path.join(root,'public','audio','gazelle-v6')
mkdirSync(dest,{recursive:true})
let total=0
for(const [profile,signals] of Object.entries(score))for(const [signal,events] of Object.entries(signals)){
 const {out,rms,attack,seconds}=mix(events,profile,signal)
 if(rms<(profile==='pt'?.018:.035)||attack<.018)throw Error('Cue is too quiet: '+profile+'/'+signal)
 if(signal.startsWith('tick-')&&seconds>=1)throw Error('Countdown exceeds one second: '+profile+'/'+signal)
 if(signal==='pr'&&seconds<4)throw Error('Victory must be an independent extended phrase')
 console.log(profile+'/'+signal+' '+seconds.toFixed(2)+'s · mono RMS '+rms.toFixed(3)+' · attack '+attack.toFixed(3))
 writeFileSync(path.join(dest,profile+'-'+signal+'.wav'),out);total++
}
if(total!==30)throw Error('Expected 30 cue files, got '+total)
writeFileSync(path.join(dest,'credits.txt'),readFileSync(path.join(root,'audio-source','CREDITS.txt'),'utf8'))
console.log('Rendered '+total+' local instrument-sample WAV cues (EISEN, DISKOPANZER, BALKAN BERSERK).')
