import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,rmSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=fileURLToPath(new URL('..',import.meta.url))
const spec=JSON.parse(readFileSync(path.join(root,'audio-source','generative-studio.json'),'utf8'))
export function checkCut(profile,signal,cut){
 if(!cut||typeof cut.source!=='string'||!/^[-a-zA-Z0-9_]+\.(wav|mp3|flac)$/i.test(cut.source)||!/^[0-9a-f]{64}$/.test(cut.sha256||''))throw Error('Invalid source or provenance')
 if(!Number.isFinite(cut.start)||cut.start<0||!Number.isFinite(cut.duration))throw Error('Invalid cut time')
 const [min,ordinaryMax]=spec.signals[signal]
 const max=profile==='pt'&&['start','round','rest','station','finish'].includes(signal)?6:ordinaryMax
 if(cut.duration<min||cut.duration>max)throw Error('Cue timing out of range: '+profile+'/'+signal)
 return cut
}
function run(args){const r=spawnSync('ffmpeg',['-v','error',...args],{maxBuffer:32*1024*1024});if(r.status!==0)throw Error(String(r.stderr||r.error));return r.stdout}
export function renderCut(source,cut){
 const fade=Math.min(.035,cut.duration/8)
 // Decode once; remove DC and subsonic energy, retain stereo, no MIDI synthesis.
 const pcm=run(['-ss',String(cut.start),'-i',source,'-t',String(cut.duration),'-af','highpass=f=35,afade=t=in:st=0:d=0.003,afade=t=out:st='+String(cut.duration-fade)+':d='+fade,'-ac','2','-ar','48000','-f','f32le','pipe:1'])
 const frames=pcm.length/8
 if(frames<48000*(cut.duration-.025))throw Error('Source ends before requested cut')
 let peak=0,energy=0,attack=0
 for(let i=0;i<frames;i++){const l=pcm.readFloatLE(i*8),r=pcm.readFloatLE(i*8+4),m=(l+r)/2;peak=Math.max(peak,Math.abs(l),Math.abs(r));energy+=m*m;if(i<9600)attack+=m*m}
 if(!Number.isFinite(peak)||peak<.005)throw Error('Silent or invalid cue')
 const gain=Math.min(.86/peak,.20/Math.sqrt(energy/frames))
 if(Math.sqrt(attack/Math.min(frames,9600))*gain<.025)throw Error('Slow or weak opening attack: choose a better cut')
 if(Math.sqrt(energy/frames)*gain<.035)throw Error('Poor mono audibility')
 const wav=Buffer.alloc(44+frames*4);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(192000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*4,40)
 for(let i=0;i<frames*2;i++)wav.writeInt16LE(Math.round(pcm.readFloatLE(i*4)*gain*32767),44+i*2)
 return wav
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const config=process.argv[2];if(!config)throw Error('Supply a reviewed cuts.json')
 const m=JSON.parse(readFileSync(config,'utf8'))
 if(m.ownerListeningApproved!==true||m.originalityReviewed!==true||m.usageRightsConfirmed!==true)throw Error('Listen to all cues and confirm usage rights before building a candidate pack')
 const output=path.join(path.dirname(path.resolve(config)),'review-pack')
 if(existsSync(output))throw Error('Review pack exists; keep previous takes and use a new folder')
 const staged=output+'.incomplete';mkdirSync(staged)
 try{
  const hashes=new Set(),report=[]
  for(const p of spec.profiles)for(const s of Object.keys(spec.signals)){
   const cut=checkCut(p.id,s,m.cuts?.[p.id]?.[s]);const source=path.join(path.dirname(path.resolve(config)),cut.source)
   const sha=createHash('sha256').update(readFileSync(source)).digest('hex');if(sha!==cut.sha256)throw Error('Source changed: '+cut.source)
   const wav=renderCut(source,cut),hash=createHash('sha256').update(wav).digest('hex')
   if(hashes.has(hash))throw Error('Identical cues: '+p.id+'/'+s);hashes.add(hash)
   writeFileSync(path.join(staged,p.id+'-'+s+'.wav'),wav)
   report.push({profile:p.id,signal:s,source:cut.source,source_sha256:sha,start:cut.start,duration:cut.duration,sha256:hash})
  }
  writeFileSync(path.join(staged,'provenance.json'),JSON.stringify({generator:m.generator,reviewed:true,cues:report},null,2))
  renameSync(staged,output);console.log('30 checked candidate cues. Review pack only; no production changes.')
 }catch(e){rmSync(staged,{recursive:true,force:true});throw e}
}
