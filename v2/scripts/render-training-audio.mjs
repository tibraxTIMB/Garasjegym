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
const danceBeat=(t,p=0)=>[kick(t,1),bass(t+.12,p,.18,.9)]
const danceLead=(t,p,d=.18)=>[synth(t,p,d,1),synth(t,p+12,d,.32)]
const riff=(t,p,d=.19,g=.9)=>[guitar(t,p,d,g),guitar(t,p+7,d,g*.65),tuba(t,p+4,d,.46)]
const brassCall=(t,p,d=.24)=>[brass(t,p,d,1),brass(t,p+3,d,.45),tuba(t,p,d,.45)]
const blast=(t,p,d=.3)=>[...brassCall(t,p,d),...riff(t,p-4,d),kick(t,1),drum(t+.07,.7)]
export const score={
 pt:{
  'tick-3':[bell(0,.30,-4)],'tick-2':[bell(0,.30,-4)],'tick-1':[bell(0,.40,0)],
  start:[bell(0,1.05,-5,1),bell(.035,.90,7,.35)],
  round:[bell(0,.38,-3),bell(.43,.69,-3)],
  rest:[bell(0,1.06,-12)],
  station:[bell(0,.26),bell(.31,.26),bell(.62,.65)],
  finish:[bell(0,.4,-4),bell(.45,.4,-4),bell(.90,1.05,-7)],
  registered:[bell(0,.33,3)],
 },
 personal:{
  'tick-3':[kick(0,1),bass(.13,0,.20,.85)],
  'tick-2':[kick(0,1),bass(.13,0,.20,.85)],
  'tick-1':[kick(0,1),...danceLead(.13,7,.25)],
  start:[n('sweep',0,.35,0,.65),...danceBeat(.18),...danceLead(.36,0),...danceBeat(.60),...danceLead(.78,7),...danceBeat(1.02),...danceLead(1.20,12,.36),...danceBeat(1.44),...danceLead(1.62,7,.24)],
  round:[...danceBeat(0),...danceLead(.20,7),...danceBeat(.42),...danceLead(.62,12,.28)],
  rest:[kick(0),...danceLead(.18,12),...danceLead(.39,7),...danceLead(.60,0,.42),bass(.60,0,.42)],
  station:[...danceBeat(0),...danceLead(.18,0,.14),...danceLead(.38,0,.14),...danceBeat(.56),...danceLead(.73,7,.28)],
  finish:[n('sweep',0,.3,0,.55),...danceBeat(0),...danceLead(.18,0),...danceBeat(.42),...danceLead(.60,7),...danceBeat(.84),...danceLead(1.02,12),...danceBeat(1.26),...danceLead(1.44,10,.16),...danceBeat(1.68),...danceLead(1.86,12,.55)],
  registered:[kick(0,.75),...danceLead(.12,12,.25)],
 },
 group:{
  'tick-3':[drum(0,1),...riff(.11,-4,.22)],
  'tick-2':[drum(0,1),...brassCall(.11,-5,.22)],
  'tick-1':[drum(0,1),...blast(.11,0,.32)],
  start:[...riff(0,-4,.20),kick(0),...riff(.22,-4,.20),kick(.22),...brassCall(.45,0,.18),...brassCall(.66,3,.18),...brassCall(.87,1,.19),drum(.87),...blast(1.10,7,.65),kick(1.30),kick(1.46)],
  round:[...brassCall(0,0,.25),drum(0),...brassCall(.28,3,.22),...blast(.55,7,.43)],
  rest:[...riff(0,-4,.26),drum(0),...brassCall(.31,7,.21),...brassCall(.56,3,.21),...blast(.80,-2,.42)],
  station:[...brassCall(0,0,.18),drum(0),...brassCall(.23,3,.18),drum(.23),...riff(.46,-4,.18),kick(.46),...blast(.69,7,.40)],
  finish:[...riff(0,-4,.20),kick(0),...riff(.23,-4,.20),kick(.23),...brassCall(.47,0,.19),...brassCall(.69,3,.19),...brassCall(.91,1,.19),drum(.91),...riff(1.13,0,.20),kick(1.13),...riff(1.36,-4,.20),kick(1.36),...brassCall(1.59,7,.22),...blast(1.86,12,.95),kick(2.05),kick(2.23),drum(2.48)],
  registered:[...riff(0,-4,.24),drum(0,.8),...brassCall(.25,7,.20)],
 }
}
function mix(events){
 const length=Math.ceil((Math.max(...events.map(([,t,d])=>t+d))+.035)*rate)
 const pcm=new Float32Array(length)
 for(const [inst,t,d,p,g] of events){
  const src=decoded[inst],ratio=2**(p/12),offset=Math.round(t*rate),count=Math.round(d*rate)
  for(let i=0;i<count&&offset+i<length;i++){
   const pos=i*ratio,k=Math.floor(pos)
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
const dest=path.join(root,'public','audio','gazelle-v2')
mkdirSync(dest,{recursive:true})
let total=0
for(const [profile,signals] of Object.entries(score))for(const [signal,events] of Object.entries(signals)){
 const {out,rms}=mix(events)
 if(rms<.06)throw Error('Cue is too quiet: '+profile+'/'+signal)
 writeFileSync(path.join(dest,profile+'-'+signal+'.wav'),out);total++
}
if(total!==27)throw Error('Expected 27 cue files, got '+total)
writeFileSync(path.join(dest,'credits.txt'),readFileSync(path.join(root,'audio-source','CREDITS.txt'),'utf8'))
console.log('Rendered '+total+' local instrument-sample WAV cues (EISEN, DISKOPANZER, BALKAN BERSERK).')
