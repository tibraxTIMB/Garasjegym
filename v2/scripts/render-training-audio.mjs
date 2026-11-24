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
const euro=(t,p,d=.24)=>[kick(t),bass(t,p-12,d),synth(t,p,d),synth(t,p+7,d,.45)]
const metal=(t,p,d=.26)=>[brass(t,p,d),brass(t,p+3,d,.36),guitar(t,p,d),guitar(t,p+7,d,.65),tuba(t,p,d),kick(t),drum(t+.08,.5)]
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
  'tick-3':[kick(0),synth(0,-5,.16)],'tick-2':[kick(0),synth(0,-2,.16)],'tick-1':[kick(0),synth(0,2,.2)],
  start:[n('sweep',0,.32,0,.5),...euro(.12,0,.26),...euro(.43,5,.23),...euro(.71,7,.48)],
  round:[...euro(0,7,.17),...euro(.23,12,.28)],
  rest:[kick(0),synth(0,7,.19),synth(.21,2,.2),synth(.43,-5,.34),bass(.43,-5,.3)],
  station:[...euro(0,0,.12),...euro(.18,0,.12),...euro(.36,5,.21)],
  finish:[...euro(0,0),...euro(.28,5),...euro(.56,7),...euro(.84,12,.58),n('sweep',.82,.6,0,.4)],
  registered:[synth(0,12,.12),kick(0,.45)],
 },
 group:{
  'tick-3':[drum(0),brass(0,-5,.15)],'tick-2':[drum(0),brass(0,-2,.16)],'tick-1':[drum(0),brass(0,2,.2),guitar(0,2,.2,.45)],
  start:[drum(0),...metal(.09,0,.17),...metal(.30,3,.17),...metal(.51,4,.17),...metal(.72,7,.58)],
  round:[...metal(0,7,.18),...metal(.24,12,.33)],
  rest:[drum(0),guitar(0,-5,.45),tuba(0,-5,.45),brass(0,7,.18),brass(.23,3,.19),brass(.46,-2,.36)],
  station:[brass(0,0,.13),drum(0),brass(.18,3,.13),drum(.18),...metal(.36,7,.32)],
  finish:[...metal(0,0,.15),...metal(.19,3,.15),...metal(.38,4,.15),...metal(.57,7,.15),...metal(.76,5,.15),...metal(.95,7,.18),...metal(1.17,12,.68)],
  registered:[guitar(0,0,.15),guitar(0,7,.15,.55),drum(0,.35)],
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
const dest=path.join(root,'public','audio','gazelle-v1')
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
