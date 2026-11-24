import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SOUND_PACK_PROFILES,SOUND_PACK_SIGNALS,soundPackUrl} from '../src/lib/trainingAudio.js'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('27 distinct local WAV paths and three sample-based profiles',()=>{
 const urls=SOUND_PACK_PROFILES.flatMap(p=>SOUND_PACK_SIGNALS.map(s=>soundPackUrl(p,s,'/Garasjegym/')))
 assert.equal(new Set(urls).size,27)
 assert.ok(urls.every(url=>url.startsWith('/Garasjegym/audio/gazelle-v1/')&&url.endsWith('.wav')))
 assert.equal(soundPackUrl('group','transition'),soundPackUrl('group','round'))
 const sample=JSON.parse(read('../audio-source/fluid-samples.json'))
 assert.ok(Object.keys(sample).length>=9)
 for(const s of Object.values(sample))assert.ok(Buffer.from(s.base64,'base64').length>1000)
 const script=read('./render-training-audio.mjs')
 assert.match(script,/distortion|guitar/)
 assert.match(script,/brass/)
 assert.match(script,/synth/)
 assert.match(script,/total!==27/)
 assert.match(read('../audio-source/CREDITS.txt'),/Creative Commons Attribution 3.0/)
})
test('live timer uses real files and explicit diagnostics rather than synthesized beeps',()=>{
 const timer=read('../src/components/Training.jsx')
 assert.match(timer,/playPackSignal\(context,signal,volumeRef\.current,prefs\.audioProfile\)/)
 assert.match(timer,/DISKOPANZER/)
 assert.match(timer,/playDirectPackSignal\(prefs\.audioProfile,testCue,volumeRef\.current\)/)
 assert.match(timer,/Lydfeil:/)
 assert.doesNotMatch(timer,/playTrainingTone\(/)
})
