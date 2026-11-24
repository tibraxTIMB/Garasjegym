import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'

const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')

test('offline worker leaves MP4, audio and byte ranges to the native player', () => {
  const handlers={}
  const self={
    location:{origin:'https://tibraxtimb.github.io'},
    addEventListener(name,callback){handlers[name]=callback},
  }
  const caches={match:async()=>null,open:async()=>({put:async()=>{}})}
  const fetch=async()=>({ok:true,clone(){return this}})
  runInNewContext(source,{self,URL,caches,fetch})
  const responds=(path,{range=false,destination=''}={})=>{
    let intercepted=false
    handlers.fetch({
      request:{method:'GET',url:'https://tibraxtimb.github.io/Garasjegym/'+path,
        mode:'cors',destination,headers:{has(name){return name==='range'&&range}}},
      respondWith(promise){intercepted=true;promise.catch(()=>{})},
    })
    return intercepted
  }
  assert.equal(responds('help/videos/kom-i-gang.mp4'),false)
  assert.equal(responds('help/videos/fri-trening.mp4',{range:true,destination:'video'}),false)
  assert.equal(responds('assets/audio.m4a',{destination:'audio'}),false)
  assert.equal(responds('assets/index.js',{range:true}),false)
  assert.equal(responds('assets/index.js'),true)
  assert.match(source,/v7-gazelle-distinct-sound-packs/)
  assert.equal(responds('audio/gazelle-v2/group-start.wav',{destination:'audio'}),false)
})
