import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SOUND_PACK_PROFILES,SOUND_PACK_SIGNALS,soundPackUrl,playPackSignal,stopPackAudio} from '../src/lib/trainingAudio.js'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('30 distinct local WAV paths and three sample-based profiles',()=>{
 const urls=SOUND_PACK_PROFILES.flatMap(p=>SOUND_PACK_SIGNALS.map(s=>soundPackUrl(p,s,'/Garasjegym/')))
 assert.equal(new Set(urls).size,30)
 assert.ok(urls.every(url=>url.startsWith('/Garasjegym/audio/gazelle-v6/')&&url.endsWith('.wav')))
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
