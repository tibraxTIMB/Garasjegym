import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {SOUND_PACK_PROFILES,SOUND_PACK_SIGNALS,soundPackUrl,playPackSignal,stopPackAudio,isKIAudioEnabled,setKIAudioEnabled,KI_AUDIO_KEY} from '../src/lib/trainingAudio.js'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('30 distinct local WAV paths and three sample-based profiles',()=>{
 const urls=SOUND_PACK_PROFILES.flatMap(p=>SOUND_PACK_SIGNALS.map(s=>soundPackUrl(p,s,'/Garasjegym/')))
 assert.equal(new Set(urls).size,30)
 assert.equal(urls.filter(url=>url.startsWith('/Garasjegym/audio/gazelle-v6/')).length,30)
 assert.equal(urls.filter(url=>url.startsWith('/Garasjegym/audio/gazelle-pr-ki-v1/')).length,0)
 assert.ok(urls.every(url=>url.endsWith('.wav')))
 assert.equal(soundPackUrl('group','transition'),soundPackUrl('group','round'))
 const sample=JSON.parse(read('../audio-source/fluid-samples.json'))
 assert.ok(Object.keys(sample).length>=9)
 for(const s of Object.values(sample))assert.ok(Buffer.from(s.base64,'base64').length>1000)
 const script=read('./render-training-audio.mjs')
 assert.match(script,/distortion|guitar/)
 assert.match(script,/brass/)
 assert.match(script,/synth/)
 assert.match(script,/total!==30/)
 assert.match(read('../audio-source/CREDITS.txt'),/Creative Commons Attribution 3.0/)
})
test('live timer uses real files and explicit diagnostics rather than synthesized beeps',()=>{
 const timer=read('../src/components/Training.jsx')
 assert.match(timer,/playPackSignal\(context,signal,volumeRef\.current,prefs\.audioProfile,\{preview:test\}\)/)
 assert.match(timer,/DISKOPANZER/)
 assert.match(timer,/playDirectPackSignal\(prefs\.audioProfile,testCue,volumeRef\.current\)/)
 assert.match(timer,/Lydfeil:/)
 assert.doesNotMatch(timer,/playTrainingTone\(/)
})

test('original dance and brass-metal cues have separate rhythmic structures and drum transients',()=>{
 const script=read('./render-training-audio.mjs')
 assert.match(script,/const beat=60\/148/)
 assert.match(script,/const arpeggio=/)
 assert.match(script,/const oddGroove=/)
 assert.match(script,/const horns=/)
 assert.match(script,/Unknown instrument:/)
})

test('victory and finish are independent arrangements and bell tails are retained',()=>{
 const script=read('./render-training-audio.mjs')
 const engine=read('../src/lib/trainingAudio.js')
 assert.match(script,/naturalDuration=/)
 assert.match(script,/score.personal.pr=\[\.\.\.danceBars\(0,\[5,5,10,10/)
 assert.match(script,/score.group.pr=\[\.\.\.brassCall\(0,12/)
 assert.match(engine,/keepTail=!preview&&profile==='pt'/)
 assert.match(engine,/generations.get\(context\)!==generation/)
})

test('bell tails overlap at reduced gain, while previews, PR and other profiles replace old sounds',async()=>{
 const originalFetch=globalThis.fetch
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)})
 const sources=[],gains=[]
 const context={state:'running',currentTime:1,destination:{},decodeAudioData:async()=>({}),createBufferSource(){const s={stopped:false,connect(){},disconnect(){},start(){},stop(){this.stopped=true}};sources.push(s);return s},createGain(){const gain={value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v}};gains.push(gain);return {gain,connect(){},disconnect(){}}}}
 try{
  await playPackSignal(context,'rest',100,'pt')
  await playPackSignal(context,'tick-3',100,'pt')
  assert.equal(sources[0].stopped,false);assert.equal(gains[0].value,.22)
  await playPackSignal(context,'tick-2',100,'pt')
  assert.equal(sources[0].stopped,true);assert.equal(sources[1].stopped,false)
  await playPackSignal(context,'pr',100,'pt')
  assert.equal(sources[1].stopped,true);assert.equal(sources[2].stopped,true)
  await playPackSignal(context,'finish',100,'personal',{preview:true})
  assert.equal(sources[3].stopped,true)
  stopPackAudio(context);assert.equal(sources[4].stopped,true)
 }finally{globalThis.fetch=originalFetch}
})

test('studio render includes detuned club leads, separate gong modes and stereo double tracking',()=>{
 const script=read('./render-training-audio.mjs')
 assert.match(script,/supersaw/)
 assert.match(script,/clubBass/)
 assert.match(script,/const modes=/)
 assert.match(script,/out.writeUInt16LE\(2,22\)/)
 assert.match(script,/Countdown exceeds one second/)
 assert.match(script,/attack<.018/)
})

test('three distinct MusicGen PR masters are committed, verified and separate from ordinary cues',()=>{
 const folder='../public/audio/gazelle-pr-ki-v1/'
 const meta=JSON.parse(read(folder+'provenance.json'))
 assert.equal(meta.model_weights_license,'CC BY-NC 4.0')
 assert.equal(meta.technical_checks_passed,true)
 assert.equal(meta.cues.length,3)
 const hashes=new Set()
 for(const profile of SOUND_PACK_PROFILES){
  const file=readFileSync(new URL(folder+profile+'-pr.wav',import.meta.url))
  const item=meta.cues.find(c=>c.profile===profile)
  assert.equal(createHash('sha256').update(file).digest('hex'),item.sha256)
  hashes.add(item.sha256)
  assert.equal(item.seconds,12);assert.equal(item.channels,2)
  assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WAVE')
  assert.equal(soundPackUrl(profile,'pr','/Garasjegym/',true),'/Garasjegym/audio/gazelle-pr-ki-v1/'+profile+'-pr.wav')
  assert.equal(soundPackUrl(profile,'finish','/Garasjegym/'),'/Garasjegym/audio/gazelle-v6/'+profile+'-finish.wav')
 }
 assert.equal(hashes.size,3)
})

test('KI lyd is a device-local opt-in and never changes the selected profile or other signals',()=>{
 const data=new Map([['garasjegym.timer.audio_profile','group'],['garasjegym.timer.sound_enabled','off']])
 const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}
 assert.equal(isKIAudioEnabled(storage),false)
 setKIAudioEnabled(true,storage);assert.equal(isKIAudioEnabled(storage),true)
 assert.equal(data.get(KI_AUDIO_KEY),'on')
 for(const profile of SOUND_PACK_PROFILES)for(const signal of SOUND_PACK_SIGNALS){
  const regular=soundPackUrl(profile,signal,'/',false)
  const experimental=soundPackUrl(profile,signal,'/',true)
  assert.equal(regular===experimental,signal!=='pr')
  assert.equal(regular,'/audio/gazelle-v6/'+profile+'-'+signal+'.wav')
 }
 setKIAudioEnabled(false,storage);assert.equal(isKIAudioEnabled(storage),false)
 assert.equal(data.get('garasjegym.timer.audio_profile'),'group')
 assert.equal(data.get('garasjegym.timer.sound_enabled'),'off')
 assert.match(read('../src/components/MyPage.jsx'),/KI lyd/)
 assert.match(read('../src/components/Training.jsx'),/KI lyd · eksperimentell/)
})
