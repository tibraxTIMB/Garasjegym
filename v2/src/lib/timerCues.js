/** Audible milestones shared by WOD countdowns and interval timers. */
export function countdownSignal(secondsLeft) {
  if ([3, 2, 1].includes(secondsLeft)) return `tick-${secondsLeft}`
  return secondsLeft === 0 ? 'start' : null
}

/** Find the next meaningful phase or workout boundary, not just the next minute. */
export function secondsToTimerBoundary({
  format, elapsed, remainingTotal, phaseRemaining, emomPhaseRemaining,
  isTimedInterval = false, isStationCircuit = false, isEMOM = false,
  isCountdown = false, hasTimeCap = false, isDeathBy = false,
}) {
  if (!Number.isFinite(elapsed) || elapsed < 0) return null
  const finiteWorkout = isTimedInterval || isStationCircuit || isEMOM || isCountdown || hasTimeCap
  let remaining = finiteWorkout && Number.isFinite(remainingTotal) ? remainingTotal : Infinity
  if ((isTimedInterval || isStationCircuit) && Number.isFinite(phaseRemaining)) {
    remaining = Math.min(remaining, phaseRemaining)
  } else if (isEMOM && Number.isFinite(emomPhaseRemaining)) {
    remaining = Math.min(remaining, emomPhaseRemaining)
  } else if (isDeathBy || format === 'Ladder') {
    remaining = Math.min(remaining, 60 - elapsed % 60)
  }
  return Number.isFinite(remaining) && remaining >= 0 ? remaining : null
}

export function runningTimerSignal({secondsToBoundary, phaseChanged = false, finished = false}) {
  if (finished) return 'finish'
  if (phaseChanged) return 'transition'
  return countdownSignal(secondsToBoundary) === 'start' ? null : countdownSignal(secondsToBoundary)
}
