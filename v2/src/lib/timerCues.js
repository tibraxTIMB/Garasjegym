/** Audible milestones shared by WOD countdowns and interval timers. */
export function countdownSignal(secondsLeft) {
  if ([3, 2, 1].includes(secondsLeft)) return `tick-${secondsLeft}`
  return secondsLeft === 0 ? 'start' : null
}

/** Find the next meaningful phase or workout boundary, not just the next minute. */
export function secondsToTimerBoundary({
  format, elapsed, remainingTotal, phaseRemaining, emomPhaseRemaining,
  isTimedInterval = false, isStationCircuit = false, isEMOM = false,
  isCountdown = false, hasTimeCap = false, isDeathBy = false, deathByIntervalSeconds = 60,
}) {
  if (!Number.isFinite(elapsed) || elapsed < 0) return null
  const finiteWorkout = isTimedInterval || isStationCircuit || isEMOM || isCountdown || hasTimeCap
  let remaining = finiteWorkout && Number.isFinite(remainingTotal) ? remainingTotal : Infinity
  if ((isTimedInterval || isStationCircuit) && Number.isFinite(phaseRemaining)) {
    remaining = Math.min(remaining, phaseRemaining)
  } else if (isEMOM && Number.isFinite(emomPhaseRemaining)) {
    remaining = Math.min(remaining, emomPhaseRemaining)
  } else if (isDeathBy) {
    const seconds=Number(deathByIntervalSeconds)>0?Number(deathByIntervalSeconds):60
    remaining = Math.min(remaining, seconds - elapsed % seconds)
  }
  return Number.isFinite(remaining) && remaining >= 0 ? remaining : null
}

export function runningTimerSignal({secondsToBoundary, phaseChanged = false, finished = false}) {
  if (finished) return 'finish'
  if (phaseChanged) return 'transition'
  return countdownSignal(secondsToBoundary) === 'start' ? null : countdownSignal(secondsToBoundary)
}

// Original studio-style PCM cues. The three profiles have distinct timbres and rhythms.
// Keep historical preference IDs so existing local settings survive the release.
export const TRAINING_AUDIO_PROFILES=['personal','pt','group','silent']
const EISEN={
 'tick-3':[[880,.20,0]],'tick-2':[[1040,.20,0]],'tick-1':[[1320,.25,0]],
 start:[[1100,.62,0]],round:[[990,.20,0],[990,.20,.25]],rest:[[770,.48,0]],
 station:[[1120,.17,0],[1120,.17,.23],[1120,.17,.46]],transition:[[990,.20,0],[990,.20,.25]],
 finish:[[880,.26,0],[1320,.64,.30]],registered:[[1250,.13,0]],
}
const STURM={
 'tick-3':[[760,.24,0]],'tick-2':[[980,.24,0]],'tick-1':[[1260,.30,0]],
 start:[[930,.26,0],[1210,.64,.30]],round:[[950,.25,0],[1320,.38,.29]],
 rest:[[1040,.58,0]],station:[[1050,.21,0],[1050,.21,.27],[1050,.21,.54]],
 transition:[[950,.25,0],[1320,.38,.29]],finish:[[820,.25,0],[1100,.25,.30],[1380,.75,.60]],registered:[[1200,.15,0]],
}
const BALKAN={
 'tick-3':[[587,.23,0]],'tick-2':[[659,.23,0]],'tick-1':[[784,.29,0]],
 start:[[698,.17,0],[831,.17,.20],[1047,.57,.40]],round:[[784,.15,0],[988,.33,.19]],
 rest:[[932,.17,0],[740,.17,.20],[587,.41,.40]],
 station:[[784,.14,0],[784,.14,.19],[1047,.28,.38]],transition:[[784,.15,0],[988,.33,.19]],
 finish:[[587,.17,0],[698,.17,.20],[831,.17,.40],[784,.17,.60],[1047,.62,.80]],registered:[[988,.16,0]],
}
export function trainingSignalPattern(signal,profile='personal'){
 const notes=(profile==='silent'?{}:profile==='pt'?EISEN:profile==='group'?BALKAN:STURM)[signal]||[]
 return notes.map(note=>[...note])
}
// Sound samples are rendered once per context/sample rate and peak-normalised.
// Soft saturation increases average signal energy without digital clipping.
const TAU=2*Math.PI
export function synthesizeTrainingCue(signal,profile='personal',sampleRate=24000,notes=trainingSignalPattern(signal,profile)){
 if(!notes.length)return new Float32Array(0)
 const length=Math.ceil((Math.max(...notes.map(n=>n[1]+n[2]))+.02)*sampleRate)
 const pcm=new Float32Array(length)
 for(const [frequency,duration,delay] of notes){
  const offset=Math.round(delay*sampleRate),count=Math.round(duration*sampleRate)
  for(let i=0;i<count&&offset+i<length;i++){
   const t=i/sampleRate,p=TAU*frequency*t
   const edge=Math.min(1,t/.008,Math.max(0,(duration-t)/.028))
   let wave
   if(profile==='pt'){
    // Metallic bell: inharmonic partials and an audible, sustained fundamental.
    wave=(Math.sin(p)+.52*Math.sin(p*2.37)*Math.exp(-t*9)+.35*Math.sin(p*3.12)*Math.exp(-t*13))* (.65+.35*Math.exp(-t*5))
   }else if(profile==='group'){
    // Original Balkan brass-style phrase: bright harmonics, reed-like vibrato,
    // and a short deterministic drum accent at each note attack.
    const phase=p+.21*Math.sin(TAU*6.7*t)
    const brass=Math.sin(phase)+.65*Math.sin(2*phase)+.43*Math.sin(3*phase)+.25*Math.sin(4*phase)+.14*Math.sin(5*phase)
    const drum=.55*Math.sin(TAU*(150*t-45*t*t))*Math.exp(-t*38)
    wave=brass+drum
   }else{
    // Arena horn: dense harmonics and two slightly detuned resonances.
    wave=Math.sin(p)+.64*Math.sin(2*p)+.42*Math.sin(3*p)+.24*Math.sin(p*1.012)+.13*Math.sin(5*p)
   }
   pcm[offset+i]+=edge*Math.tanh(wave*(profile==='pt'?2.1:3.1))
  }
 }
 let peak=0
 for(const v of pcm)peak=Math.max(peak,Math.abs(v))
 if(peak>0)for(let i=0;i<pcm.length;i++)pcm[i]*=.985/peak
 return pcm
}
const buffers=new WeakMap()
function playSample(context,signal,profile,volume,notes=null,delay=0){
 const level=Math.max(0,Math.min(1,Number(volume)/100||0))
 if(!context||level===0||profile==='silent')return
 try{
  let cache=buffers.get(context)
  if(!cache){cache=new Map();buffers.set(context,cache)}
  const key=profile+':'+signal
  let buffer=!notes&&cache.get(key)
  if(!buffer){
   const pcm=synthesizeTrainingCue(signal,profile,context.sampleRate||24000,notes||trainingSignalPattern(signal,profile))
   if(!pcm.length)return
   buffer=context.createBuffer(1,pcm.length,context.sampleRate||24000)
   buffer.getChannelData(0).set(pcm)
   if(!notes)cache.set(key,buffer)
  }
  const source=context.createBufferSource(),gain=context.createGain()
  source.buffer=buffer;gain.gain.value=level
  source.connect(gain);gain.connect(context.destination)
  source.onended=()=>{source.disconnect();gain.disconnect()}
  source.start(context.currentTime+Math.max(0,delay))
 }catch{/* Browser/device controls the audio output. */}
}
export function playTrainingTone(context,frequency,duration,delay=0,volume=100,profile='personal'){
 if(duration>0)playSample(context,'custom',profile,volume,[[frequency,duration,0]],delay)
}
export function playTrainingSignal(context,signal,volume=100,profile='personal'){
 playSample(context,signal,profile,volume)
}
