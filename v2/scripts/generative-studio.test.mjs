import test from 'node:test'
import assert from 'node:assert/strict'
import {generationRequest} from './generate-studio-music.mjs'
import {checkCut} from './compile-studio-cues.mjs'
import {readFileSync} from 'node:fs'
const spec=JSON.parse(readFileSync(new URL('../audio-source/generative-studio.json',import.meta.url)))
test('three distinct original themes and independent victory prompts',()=>{
 assert.equal(spec.profiles.length,3)
 assert.equal(Object.keys(spec.signals).length,10)
 for(const p of spec.profiles){const a=generationRequest(p,'theme'),b=generationRequest(p,'victory');assert.equal(a.instrumental,true);assert.equal(a.lyrics,'[Instrumental]');assert.notEqual(a.caption,b.caption);assert.ok(a.caption.length<512);assert.ok(b.caption.length<512)}
})
test('short countdown, independent victory duration, no unsafe paths',()=>{
 const cut={source:'take.wav',sha256:'a'.repeat(64),start:0,duration:.8}
 assert.equal(checkCut('personal','tick-3',cut),cut)
 assert.throws(()=>checkCut('personal','tick-3',{...cut,duration:1}))
 assert.throws(()=>checkCut('group','pr',cut))
 assert.throws(()=>checkCut('pt','round',{...cut,source:'../outside.wav'}))
 assert.equal(checkCut('pt','rest',{...cut,duration:4}).duration,4)
})
