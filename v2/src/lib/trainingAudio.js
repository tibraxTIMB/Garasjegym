// Locally bundled sample-based cues. No runtime network dependency outside the app.
export const SOUND_PACK_VERSION='gazelle-v2'
export const SOUND_PACK_PROFILES=['pt','personal','group']
export const SOUND_PACK_SIGNALS=['tick-3','tick-2','tick-1','start','round','rest','station','finish','registered']
export const SOUND_PACK_NAMES={pt:'EISEN',personal:'DISKOPANZER',group:'BALKAN BERSERK'}
export function soundPackUrl(profile,signal,base=import.meta.env?.BASE_URL||'/'){
 const p=SOUND_PACK_PROFILES.includes(profile)?profile:'personal'
 const s=signal==='transition'?'round':signal
 if(!SOUND_PACK_SIGNALS.includes(s))throw Error('Ukjent lydsignal')
 return base+'audio/'+SOUND_PACK_VERSION+'/'+p+'-'+s+'.wav'
}
const files=new Map(), decoded=new WeakMap(), active=new WeakMap()
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
export async function playPackSignal(context,signal,volume,profile){
 if(!level(volume)||profile==='silent')return false
 if(!context)throw Error('Web Audio er ikkje tilgjengeleg')
 const requested=Date.now()
 if(context.state==='suspended')await context.resume()
 if(context.state!=='running')throw Error('Lydmotoren er '+context.state)
 const buffer=await getBuffer(context,soundPackUrl(profile,signal))
 if(Date.now()-requested>1500)throw Error('Lydfila vart ikkje klar i tide')
 const old=active.get(context)
 if(old)try{old.stop()}catch{}
 const source=context.createBufferSource(),gain=context.createGain()
 source.buffer=buffer;gain.gain.value=level(volume)
 source.connect(gain);gain.connect(context.destination)
 active.set(context,source)
 source.onended=()=>{if(active.get(context)===source)active.delete(context);source.disconnect();gain.disconnect()}
 source.start()
 return true
}
let directAudio=null
export function stopDirectAudio(){if(directAudio){directAudio.pause();directAudio=null}}
export function stopPackAudio(context){const old=context&&active.get(context);if(old)try{old.stop()}catch{}}
export async function playDirectPackSignal(profile,signal,volume){
 stopDirectAudio()
 const audio=new Audio(soundPackUrl(profile,signal));directAudio=audio
 audio.volume=level(volume)
 await audio.play()
 return true
}
