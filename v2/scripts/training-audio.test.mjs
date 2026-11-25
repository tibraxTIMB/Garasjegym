import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SOUND_PACK_PROFILES,SOUND_PACK_SIGNALS,soundPackUrl,playPackSignal,stopPackAudio,generativePackUrls,readAudioPack,setAudioPack} from '../src/lib/trainingAudio.js'
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
 assert.match(timer,/playPackSignal\(context,signal,volumeRef\.current,prefs\.audioProfile,\{preview:test,format\}\)/)
 assert.match(timer,/DISKOPANZER/)
 assert.match(timer,/playDirectPackSignal\(prefs\.audioProfile,testCue,volumeRef\.current,format\)/)
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

test('standard remains default and old experimental key does not change selection',()=>{
 for(const p of SOUND_PACK_PROFILES)for(const s of SOUND_PACK_SIGNALS)assert.equal(soundPackUrl(p,s,'/',true),'/audio/gazelle-v6/'+p+'-'+s+'.wav')
 assert.doesNotMatch(read('../src/components/MyPage.jsx'),/KI lyd/)
 assert.match(read('../src/components/Training.jsx'),/KI lyd · generativ prototype/)
 assert.match(read('../src/lib/trainingAudio.js'),/removeItem\('garasjegym.timer.ki_audio'\)/)
})

test('optional generative sound pack maps all formats and preserves standard',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}
 assert.equal(readAudioPack(storage),'standard')
 setAudioPack('generative',storage);assert.equal(readAudioPack(storage),'generative')
 setAudioPack('standard',storage);assert.equal(readAudioPack(storage),'standard')
 const urls=new Set(SOUND_PACK_PROFILES.flatMap(p=>generativePackUrls(p,'/Garasjegym/')))
 assert.equal(urls.size,46)
 for(const [format,file] of [['AMRAP','amrap'],['E2MOM','emom'],['For Time','for-time'],['Tabata','tabata'],['Death By','death-by'],['Intervall','general']]){
  const url=soundPackUrl('pt','finish','/Garasjegym/',{pack:'generative',format})
  assert.equal(url,'/Garasjegym/audio/gazelle-generative-v1/eisen/finish-'+file+'.mp3')
  assert.ok(urls.has(url))
 }
 assert.equal(soundPackUrl('group','pr','/',{pack:'generative'}),'/audio/gazelle-generative-v1/pr-victory/pr-victory.mp3')
 assert.equal(soundPackUrl('group','finish','/',{pack:'standard',format:'AMRAP'}),'/audio/gazelle-v6/group-finish.wav')
})

import {flowKeyValue,flowStepValue,flowAcceptValue} from '../src/lib/flowKeypad.js'
test('FLOW keypad replaces selection, handles decimals and preserves empty result',()=>{
 assert.equal(flowKeyValue('45','5',{fresh:true}),'5')
 assert.equal(flowKeyValue('5','0',{}),'50')
 assert.equal(flowKeyValue('50',',',{decimal:true}),'50.')
 assert.equal(flowKeyValue('50.','5',{decimal:true}),'50.5')
 assert.equal(flowKeyValue('50','clear',{}),'')
 assert.equal(flowKeyValue('','-',{negative:true}),'-')
 assert.equal(flowKeyValue('4',':',{time:true}),'4:')
 assert.equal(flowStepValue('',2.5),'')
 assert.equal(flowStepValue('40',2.5),'42.5')
 assert.equal(flowAcceptValue('42,5',{decimal:true}),'42.5')
 assert.equal(flowAcceptValue('4.5',{}),null)
 assert.equal(flowAcceptValue('2:30',{time:true}),'2:30')
 const src=read('../src/components/Training.jsx')
 assert.match(src,/<FlowKeypad\/>/)
 assert.match(src,/<FlowConfirmDialog/)
 assert.match(src,/field=\{field\} data-result-field=\{field\}/)
 assert.doesNotMatch(src,/window\.confirm\('Desse setta manglar vekt/)
 const keypad=read('../src/components/FlowEntry.jsx')
 assert.match(keypad,/inputMode="none"/)
 assert.match(keypad,/aria-label="Neste talfelt"/)
})
