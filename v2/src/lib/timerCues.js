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

// STURMKOPF Training Audio: distinct, sustained, non-overlapping gym signals.
const TRAINING_PATTERNS = {
  'tick-3': [[760,.19,0]], 'tick-2': [[900,.19,0]], 'tick-1': [[1120,.24,0]],
  start: [[980,.19,0],[1480,.46,.23]],
  round: [[960,.18,0],[1320,.36,.22]],
  rest: [[1160,.20,0],[760,.32,.24]],
  station: [[1120,.20,0],[1120,.22,.25]],
  transition: [[960,.18,0],[1320,.36,.22]],
  finish: [[820,.22,0],[1050,.22,.26],[1400,.52,.52]],
}
export const TRAINING_AUDIO_PROFILES = ['personal','pt','group','silent']
const GROUP_PATTERNS = {
 'tick-3':[[1050,.23,0]], 'tick-2':[[1250,.23,0]], 'tick-1':[[1500,.30,0]],
 start:[[1050,.25,0],[1550,.65,.30]],
 round:[[1100,.24,0],[1450,.50,.29]],
 rest:[[1350,.25,0],[850,.50,.30]],
 station:[[1250,.24,0],[1250,.24,.29],[1250,.24,.58]],
 transition:[[1100,.24,0],[1450,.50,.29]],
 finish:[[950,.25,0],[1250,.25,.30],[1550,.75,.60]],
}
export function trainingSignalPattern(signal,profile='personal') {
 if(profile==='silent')return []
 const notes=(profile==='group'?GROUP_PATTERNS:TRAINING_PATTERNS)[signal]||[]
 return notes.map(([frequency,duration,delay])=>profile==='pt'?[frequency*.9,duration*.8,delay]:[frequency,duration,delay])
}
export function playTrainingTone(context, frequency, duration, delay=0, volume=100, profile='personal') {
  const level=Math.max(0,Math.min(1,Number(volume)/100||0))
  if (!context || level===0 || duration<=0 || profile==='silent') return
  try {
    const start=context.currentTime+Math.max(0,delay)
    const end=start+duration
    const attack=Math.min(.012,duration/4)
    const release=Math.min(.035,duration/3)
    const voices=profile==='group'?[['square',1,.96]]:profile==='pt'?[['square',1,.75],['triangle',1.5,.18]]:[['square',1,.86],['triangle',1.5,.12]]
    for (const [type,ratio,weight] of voices) {
      const oscillator=context.createOscillator()
      const gain=context.createGain()
      const peak=level*weight
      oscillator.type=type
      oscillator.frequency.setValueAtTime(frequency*ratio,start)
      gain.gain.setValueAtTime(0,start)
      gain.gain.linearRampToValueAtTime(peak,start+attack)
      gain.gain.setValueAtTime(peak,end-release)
      gain.gain.linearRampToValueAtTime(0,end)
      oscillator.connect(gain);gain.connect(context.destination)
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}
      oscillator.start(start);oscillator.stop(end)
    }
  } catch { /* Audio availability is controlled by the browser and device. */ }
}
export function playTrainingSignal(context,signal,volume=100,profile='personal') {
  for (const [frequency,duration,delay] of trainingSignalPattern(signal,profile))
    playTrainingTone(context,frequency,duration,delay,volume,profile)
}
