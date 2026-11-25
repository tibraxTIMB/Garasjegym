// Locally bundled sample-based cues. No runtime network dependency outside the app.
export const SOUND_PACK_VERSION='gazelle-v6'
export const SOUND_PACK_PROFILES=['pt','personal','group']
export const SOUND_PACK_SIGNALS=['tick-3','tick-2','tick-1','start','round','rest','station','finish','registered','pr']
export const SOUND_PACK_NAMES={pt:'EISEN',personal:'DISKOPANZER',group:'BALKAN BERSERK'}
// Retire the former device-local experiment without touching ordinary sound preferences.
try{globalThis.localStorage?.removeItem('garasjegym.timer.ki_audio')}catch{}
export const GENERATIVE_PACK_VERSION='gazelle-generative-v1'
export const AUDIO_PACK_KEY='garasjegym.timer.audio_pack'
export function readAudioPack(storage=globalThis.localStorage){try{return storage?.getItem(AUDIO_PACK_KEY)==='generative'?'generative':'standard'}catch{return 'standard'}}
export function setAudioPack(pack,storage=globalThis.localStorage){try{storage?.setItem(AUDIO_PACK_KEY,pack==='generative'?'generative':'standard')}catch{}}
const GENERATIVE_PROFILES={pt:'eisen',personal:'diskopanzer',group:'balkan-berserk'}
const GENERATIVE_EVENTS=['countdown-3','countdown-2','countdown-1','start','work','rest','round','minute','warning','finish-amrap','finish-emom','finish-for-time','finish-tabata','finish-death-by','finish-general']
function finishEvent(format){
 const f=String(format||'').toLowerCase().replace(/[^a-z0-9]/g,'')
 return 'finish-'+(f.includes('amrap')?'amrap':f.includes('mom')?'emom':f==='fortime'?'for-time':f==='tabata'?'tabata':f==='deathby'?'death-by':'general')
}
export function generativePackUrls(profile,base=import.meta.env?.BASE_URL||'/'){
 const p=GENERATIVE_PROFILES[profile]||GENERATIVE_PROFILES.personal
 return [...GENERATIVE_EVENTS.map(e=>base+'audio/'+GENERATIVE_PACK_VERSION+'/'+p+'/'+e+'.mp3'),base+'audio/'+GENERATIVE_PACK_VERSION+'/pr-victory/pr-victory.mp3']
}
export function soundPackUrl(profile,signal,base=import.meta.env?.BASE_URL||'/',{pack=readAudioPack(),format=''}={}){
 if(pack==='generative'){
  const p=GENERATIVE_PROFILES[profile]||GENERATIVE_PROFILES.personal
  if(signal==='pr')return base+'audio/'+GENERATIVE_PACK_VERSION+'/pr-victory/pr-victory.mp3'
  const event=signal==='finish'?finishEvent(format):({'tick-3':'countdown-3','tick-2':'countdown-2','tick-1':'countdown-1',start:'start',round:'work',rest:'rest',station:'minute',transition:'work',registered:'round',warning:'warning'})[signal]
  if(!event)throw Error('Ukjent lydsignal')
  return base+'audio/'+GENERATIVE_PACK_VERSION+'/'+p+'/'+event+'.mp3'
 }

 const p=SOUND_PACK_PROFILES.includes(profile)?profile:'personal'
 const s=signal==='transition'?'round':signal
 if(!SOUND_PACK_SIGNALS.includes(s))throw Error('Ukjent lydsignal')
 return base+'audio/'+SOUND_PACK_VERSION+'/'+p+'-'+s+'.wav'
}
const OFFLINE_AUDIO_CACHE='garasjegym-training-audio-v1'
export async function prepareOfflineAudio(){
 if(!globalThis.caches)throw Error('Lydlagring er ikkje tilgjengeleg')
 const cache=await caches.open(OFFLINE_AUDIO_CACHE)
 const urls=[...new Set(SOUND_PACK_PROFILES.flatMap(p=>[...SOUND_PACK_SIGNALS.map(s=>soundPackUrl(p,s,undefined,{pack:'standard'})),...(readAudioPack()==='generative'?generativePackUrls(p):[])]))]
 for(const url of urls){if(!await cache.match(url)){const response=await fetch(url);if(!response.ok)throw Error('Lydfil manglar: '+url);await cache.put(url,response)}}
 return urls.length
}
async function fetchAudioBytes(url){
 if(globalThis.caches){try{const cache=await caches.open(OFFLINE_AUDIO_CACHE);const local=await cache.match(url);if(local)return local.arrayBuffer()}catch{}}
 const r=await fetch(url);if(!r.ok)throw Error('Lydfil manglar ('+r.status+')');if(globalThis.caches){try{const cache=await caches.open(OFFLINE_AUDIO_CACHE);await cache.put(url,r.clone())}catch{}}
 return r.arrayBuffer()
}
const files=new Map(), decoded=new WeakMap(), active=new WeakMap(), generations=new WeakMap()
function bytes(url){
 if(!files.has(url))files.set(url,fetchAudioBytes(url).catch(e=>{files.delete(url);throw e}))
 return files.get(url)
}
export async function preloadSoundPack(profile){
 if(profile==='silent')return
 await Promise.all((readAudioPack()==='generative'?generativePackUrls(profile):SOUND_PACK_SIGNALS.map(s=>soundPackUrl(profile,s))).map(bytes))
}
async function getBuffer(context,url){
 let cache=decoded.get(context)
 if(!cache){cache=new Map();decoded.set(context,cache)}
 if(!cache.has(url))cache.set(url,bytes(url).then(b=>context.decodeAudioData(b.slice(0))).catch(e=>{cache.delete(url);throw e}))
 return cache.get(url)
}
export async function unlockSoundPack(context,profile){
 if(!context)throw Error('Web Audio er ikkje tilgjengeleg')
 if(context.state==='suspended')await context.resume()
 if(context.state!=='running')throw Error('Lydmotoren er '+context.state)
 await Promise.all((readAudioPack()==='generative'?generativePackUrls(profile):SOUND_PACK_SIGNALS.map(s=>soundPackUrl(profile,s))).map(url=>getBuffer(context,url)))
}
const level=v=>Math.min(1,Math.max(0,Number(v)/100||0))
export async function playPackSignal(context,signal,volume,profile,{preview=false,format=''}={}){
 if(!level(volume)||profile==='silent')return false
 if(!context)throw Error('Web Audio er ikkje tilgjengeleg')
 const requested=Date.now(),generation=(generations.get(context)||0)+1
 generations.set(context,generation)
 if(context.state==='suspended')await context.resume()
 if(context.state!=='running')throw Error('Lydmotoren er '+context.state)
 const pack=readAudioPack()
 let buffer
 try{buffer=await getBuffer(context,soundPackUrl(profile,signal,undefined,{pack,format}))}
 catch(e){if(pack!=='generative'||preview)throw e;buffer=await getBuffer(context,soundPackUrl(profile,signal,undefined,{pack:'standard'}))}
 if(Date.now()-requested>1500)throw Error('Lydfila vart ikkje klar i tide')
 if(generations.get(context)!==generation)return false
 const voices=active.get(context)||[]
 const keepTail=!preview&&profile==='pt'&&signal!=='pr'&&pack==='standard'
 const now=context.currentTime
 for(const voice of [...voices]){
  if(keepTail&&voice.profile==='pt'&&!voice.preview&&voice.signal!=='pr'&&voices.length===1){
   // Keep a little bell resonance underneath the next precisely timed attack.
   const parameter=voice.gain.gain
   parameter.cancelScheduledValues(now);parameter.setValueAtTime(Math.min(parameter.value,level(volume)*.22),now)
   continue
  }
  try{voice.source.stop()}catch{}
  const index=voices.indexOf(voice);if(index>=0)voices.splice(index,1)
 }
 const source=context.createBufferSource(),gain=context.createGain()
 source.buffer=buffer;gain.gain.value=level(volume)*(keepTail&&voices.length?.77:1)
 source.connect(gain);gain.connect(context.destination)
 const voice={source,gain,profile,signal,preview}
 voices.push(voice);active.set(context,voices)
 source.onended=()=>{const list=active.get(context);if(list){const index=list.indexOf(voice);if(index>=0)list.splice(index,1);if(!list.length)active.delete(context)}source.disconnect();gain.disconnect()}
 source.start()
 return true
}
let directAudio=null
export function stopDirectAudio(){if(directAudio){directAudio.pause();directAudio=null}}
export function stopPackAudio(context){if(!context)return;generations.set(context,(generations.get(context)||0)+1);for(const voice of [...(active.get(context)||[])])try{voice.source.stop()}catch{};active.delete(context)}
export async function playDirectPackSignal(profile,signal,volume,format=''){
 stopDirectAudio()
 const audio=new Audio(soundPackUrl(profile,signal,undefined,{format}));directAudio=audio
 audio.volume=level(volume)
 await audio.play()
 return true
}
