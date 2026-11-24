// Locally bundled sample-based cues. No runtime network dependency outside the app.
export const SOUND_PACK_VERSION='gazelle-v6'
export const PR_SOUND_PACK_VERSION='gazelle-pr-ki-v1'
export const SOUND_PACK_PROFILES=['pt','personal','group']
export const SOUND_PACK_SIGNALS=['tick-3','tick-2','tick-1','start','round','rest','station','finish','registered','pr']
export const SOUND_PACK_NAMES={pt:'EISEN',personal:'DISKOPANZER',group:'BALKAN BERSERK'}
// Device-local, opt-in experimental extension. Existing profiles remain authoritative.
export const KI_AUDIO_KEY='garasjegym.timer.ki_audio'
export const KI_AUDIO_EVENT='gg-ki-audio-change'
export const KI_AUDIO_SIGNALS=Object.freeze({pt:['pr'],personal:['pr'],group:['pr']})
export function isKIAudioEnabled(storage){
 try{return (storage??globalThis.localStorage)?.getItem(KI_AUDIO_KEY)==='on'}catch{return false}
}
export function setKIAudioEnabled(enabled,storage){
 try{(storage??globalThis.localStorage)?.setItem(KI_AUDIO_KEY,enabled?'on':'off')}catch{}
 if(typeof window!=='undefined')window.dispatchEvent(new Event(KI_AUDIO_EVENT))
}
export function soundPackUrl(profile,signal,base=import.meta.env?.BASE_URL||'/',kiEnabled=isKIAudioEnabled()){

 const p=SOUND_PACK_PROFILES.includes(profile)?profile:'personal'
 const s=signal==='transition'?'round':signal
 if(!SOUND_PACK_SIGNALS.includes(s))throw Error('Ukjent lydsignal')
 return base+'audio/'+(kiEnabled&&KI_AUDIO_SIGNALS[p]?.includes(s)?PR_SOUND_PACK_VERSION:SOUND_PACK_VERSION)+'/'+p+'-'+s+'.wav'
}
const files=new Map(), decoded=new WeakMap(), active=new WeakMap(), generations=new WeakMap()
function bytes(url){
 if(!files.has(url))files.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Lydfil manglar ('+r.status+')');return r.arrayBuffer()}).catch(e=>{files.delete(url);throw e}))
 return files.get(url)
}
export async function preloadSoundPack(profile){
 if(profile==='silent')return
 await Promise.all(SOUND_PACK_SIGNALS.map(s=>bytes(soundPackUrl(profile,s))))
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
 await Promise.all(SOUND_PACK_SIGNALS.map(s=>getBuffer(context,soundPackUrl(profile,s))))
}
const level=v=>Math.min(1,Math.max(0,Number(v)/100||0))
export async function playPackSignal(context,signal,volume,profile,{preview=false}={}){
 if(!level(volume)||profile==='silent')return false
 if(!context)throw Error('Web Audio er ikkje tilgjengeleg')
 const requested=Date.now(),generation=(generations.get(context)||0)+1
 generations.set(context,generation)
 if(context.state==='suspended')await context.resume()
 if(context.state!=='running')throw Error('Lydmotoren er '+context.state)
 const buffer=await getBuffer(context,soundPackUrl(profile,signal))
 if(Date.now()-requested>1500)throw Error('Lydfila vart ikkje klar i tide')
 if(generations.get(context)!==generation)return false
 const voices=active.get(context)||[]
 const keepTail=!preview&&profile==='pt'&&signal!=='pr'
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
export async function playDirectPackSignal(profile,signal,volume){
 stopDirectAudio()
 const audio=new Audio(soundPackUrl(profile,signal));directAudio=audio
 audio.volume=level(volume)
 await audio.play()
 return true
}
