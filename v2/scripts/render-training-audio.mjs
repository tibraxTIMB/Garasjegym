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
  'tick-3':[bell(0,.2,-5)],'tick-2':[bell(0,.2,-2)],'tick-1':[bell(0,.28,2)],
  start:[bell(0,.75,0),bell(.08,.67,-12,.55)],
  round:[bell(0,.22),bell(.26,.42)],
  rest:[bell(0,.75,-7)],
  station:[bell(0,.19),bell(.23,.19),bell(.46,.44)],
  finish:[bell(0,.28),bell(.34,.28),bell(.68,.85,-5)],
  registered:[bell(0,.18,7)],
 },
 personal:{
  'tick-3':[punch(0),hat(.18),bass(.18,0,.14,.75)],
  'tick-2':[punch(0),hat(.18),bass(.18,0,.14,.75)],
  'tick-1':[punch(0),clap(0),...rave(.14,12,.27)],
  start:[n('sweep',0,.30,0,.45),...danceBars(0,[0,0,8,7,0,0]),...arpeggio(.10,[0,7,12,7,3,10,15,10,8,15,20,15,7,14,19,14,12,15,19,24]),...rave(2.10,12,.39)],
  round:[...danceBars(0,[0,0,7]),...arpeggio(.10,[7,12,15,12,10,14,19,14]),...rave(.91,12,.26)],
  rest:[clap(0),punch(0,.8),...rave(.10,15,.18),...rave(.32,10,.18),...rave(.55,3,.42),bass(.55,0,.42,.8)],
  station:[...danceBars(0,[0,0,0]),...rave(.08,7,.15),...rave(.28,7,.15),...rave(.50,7,.15),...rave(.78,12,.34)],
  finish:[...danceBars(0,[0,0,8,8,3,7,0,0]),...arpeggio(.08,[0,3,7,12,7,12,15,19,8,12,15,20,12,15,20,24,3,7,10,15,7,10,14,19,12,15,19,24]),...rave(2.84,12,.56),n('sweep',2.65,.55,0,.40)],
  registered:[punch(0,.7),...rave(.10,12,.13),...rave(.25,19,.14)],
 },
 group:{
  'tick-3':[drum(0,1),...riff(.12,0,.18)],
  'tick-2':[drum(0,1),...brassCall(.12,3,.19)],
  'tick-1':[drum(0,1),...blast(.12,0,.31)],
  start:[...oddGroove(0,0),...horns(.08,[0,1,4,5,4,1,0]),...riff(.89,0,.13),...riff(1.04,0,.13),...riff(1.19,1,.15),...horns(1.38,[7,8,11,12,11,8,7]),...blast(2.16,0,.53),punch(2.28,.85),punch(2.43,.85)],
  round:[...oompa(0),...horns(.10,[0,1,4,5,4,1]),...riff(.76,0,.13),...blast(.92,7,.34)],
  rest:[...riff(0,0,.20),drum(0),...horns(.24,[12,11,8,7,5,4,1],.10),...riff(1.02,0,.29)],
  station:[...oompa(0),...brassCall(.08,0,.12),...oompa(.26),...brassCall(.34,0,.12),...riff(.52,1,.15),...horns(.70,[4,5,7]),...blast(1.05,0,.29)],
  finish:[...oddGroove(0,0),...horns(.08,[0,1,4,5,7,5,4]),...riff(.90,0,.14),...riff(1.06,0,.14),...riff(1.22,1,.14),...riff(1.38,0,.14),...oddGroove(1.54,0),...horns(1.62,[7,8,11,12,11,8,7]),...horns(2.40,[12,13,16,17,19,17,16]),...blast(3.16,0,.62),punch(3.31,.95),punch(3.48,.95),drum(3.63,.70)],
  registered:[...riff(0,0,.17),...brassCall(.19,7,.18),drum(.19,.55)],
 }
}
// Victory signals are separate from timer-finish cues. Original mini-fanfares.
score.pt.pr=[bell(0,.68,-4),bell(.82,.68,-4),bell(1.64,.90,0),bell(2.58,1.70,-12),bell(2.61,1.45,0,.42)]
score.personal.pr=[...danceBars(0,[0,0,8,8,3,7,0,0,8,7,0,0]),...arpeggio(.08,[0,3,7,12,7,12,15,19,8,12,15,20,12,15,20,24,3,7,10,15,7,10,14,19,12,15,19,24,7,12,15,19,8,12,15,20,7,10,14,19,12,15,19,24]),...rave(4.52,12,.78),n('sweep',4.30,.70,0,.45)]
score.group.pr=[...oddGroove(0,0),...horns(.08,[0,1,4,5,7,5,4]),...riff(.90,0,.14),...riff(1.06,0,.14),...riff(1.22,1,.14),...riff(1.38,0,.14),...oddGroove(1.54,0),...horns(1.62,[7,8,11,12,11,8,7]),...horns(2.40,[12,13,16,17,19,17,16]),...riff(3.16,0,.15),...riff(3.34,0,.15),...riff(3.52,1,.15),...horns(3.72,[7,8,11,12,16,19]),...blast(4.45,0,.88),punch(4.61,.95),punch(4.78,.95),drum(5.03,.8)]
function mix(events){
 const length=Math.ceil((Math.max(...events.map(([,t,d])=>t+d))+.035)*rate)
 const pcm=new Float32Array(length)
 for(const [inst,t,d,p,g] of events){
  const src=decoded[inst],ratio=2**(p/12),offset=Math.round(t*rate),count=Math.round(d*rate)
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
   const edge=Math.min(1,i/(rate*.004),Math.max(0,(count-i)/(rate*.035)))
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
const dest=path.join(root,'public','audio','gazelle-v4')
mkdirSync(dest,{recursive:true})
let total=0
for(const [profile,signals] of Object.entries(score))for(const [signal,events] of Object.entries(signals)){
 const {out,rms}=mix(events)
 if(rms<.06)throw Error('Cue is too quiet: '+profile+'/'+signal)
 writeFileSync(path.join(dest,profile+'-'+signal+'.wav'),out);total++
}
if(total!==30)throw Error('Expected 30 cue files, got '+total)
writeFileSync(path.join(dest,'credits.txt'),readFileSync(path.join(root,'audio-source','CREDITS.txt'),'utf8'))
console.log('Rendered '+total+' local instrument-sample WAV cues (EISEN, DISKOPANZER, BALKAN BERSERK).')
