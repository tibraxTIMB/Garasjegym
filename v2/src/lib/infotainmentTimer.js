const clampInteger = (value, min, max, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback
}

/**
 * Pure timer calculation for the shared-screen demo clock.
 * Finite interval rounds end at the last work slot; there is no trailing rest.
 */
export function getDemoTimerState({
  format = 'stopwatch',
  elapsed = 0,
  minutes = 5,
  workSeconds = 20,
  restSeconds = 10,
  rounds = 8,
} = {}) {
  const safeElapsed = Math.max(0, Math.floor(Number(elapsed) || 0))
  const safeRounds = clampInteger(rounds, 1, 50, 1)
  const safeMinutes = clampInteger(minutes, 1, 120, 5)
  const intervalMinutes = format === 'e2mom' ? 2 : 1
  const intervalSeconds = intervalMinutes * 60
  const isCountdown = format === 'countdown' || format === 'amrap'
  const isEmom = format === 'emom' || format === 'e2mom'
  const isIntervals = format === 'tabata' || format === 'interval'
  const safeWork = clampInteger(
    workSeconds,
    1,
    isEmom ? intervalSeconds : 600,
    format === 'tabata' ? 20 : 45,
  )
  const safeRest = clampInteger(restSeconds, 0, isEmom ? intervalSeconds - safeWork : 600, format === 'tabata' ? 10 : 15)
  const cycleSeconds = isEmom ? intervalSeconds : safeWork + safeRest
  const totalSeconds = isCountdown
    ? safeMinutes * 60
    : isEmom
      ? intervalSeconds * safeRounds
      : isIntervals
        ? safeWork * safeRounds + safeRest * (safeRounds - 1)
        : 0
  const limited = isCountdown || isEmom || isIntervals
  const finished = limited && safeElapsed >= totalSeconds
  const remaining = Math.max(0, totalSeconds - safeElapsed)
  const intervalElapsed = safeElapsed % Math.max(1, cycleSeconds)
  const intervalWork = intervalElapsed < safeWork
  const emomElapsed = safeElapsed % intervalSeconds
  const emomWork = emomElapsed < safeWork
  const emomRest = !emomWork && emomElapsed - safeWork < safeRest
  const emomRound = Math.min(Math.floor(safeElapsed / intervalSeconds) + 1, safeRounds)
  const intervalRound = Math.min(Math.floor(safeElapsed / Math.max(1, cycleSeconds)) + 1, safeRounds)

  const phase = finished
    ? 'FERDIG'
    : isEmom
      ? emomWork ? 'ARBEID' : emomRest ? 'PAUSE' : 'VENTETID'
      : isIntervals
        ? intervalWork ? 'ARBEID' : 'PAUSE'
        : format === 'amrap'
          ? 'AMRAP · TID ATT'
          : format === 'countdown'
            ? 'NEDTELJING'
            : format === 'fortime'
              ? 'MEDGÅTT TID'
              : 'STOPPEKLOKKE'

  const displayTime = finished
    ? 0
    : isCountdown
      ? remaining
      : isEmom
        ? Math.max(0, emomWork ? safeWork - emomElapsed : emomRest ? safeRest - (emomElapsed - safeWork) : intervalSeconds - emomElapsed)
        : isIntervals
          ? Math.max(0, intervalWork ? safeWork - intervalElapsed : cycleSeconds - intervalElapsed)
          : safeElapsed

  const roundLabel = isEmom
    ? 'RUNDE ' + emomRound + ' / ' + safeRounds
    : isIntervals
      ? 'RUNDE ' + intervalRound + ' / ' + safeRounds
      : ''

  return {
    finished,
    limited,
    totalSeconds,
    remaining,
    phase,
    displayTime,
    roundLabel,
    safeWork,
    safeRest,
    safeRounds,
    intervalSeconds,
  }
}
