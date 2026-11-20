const finitePositive = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

const finiteNonNegative = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

/**
 * Derive the instructor-facing live class clock from the persisted timer snapshot.
 * Finite formats stop at their actual final work second; no final rest is added.
 */
export function getGroupClassLiveTimer({ format = '', elapsed = 0, settings = {} } = {}) {
  const seconds = Math.max(0, Math.floor(Number(elapsed) || 0))
  const schema = settings?.workout_schema || {}
  const station = schema?.station_circuit

  if (format === 'Stasjonssirkel' || schema?.structure === 'station_circuit') {
    const count = Math.max(2, Math.min(8, Math.floor(Number(station?.station_count) || station?.stations?.length || 2)))
    const work = Math.max(1, Math.floor(finitePositive(station?.work_seconds ?? settings?.work_seconds, 45)))
    const transition = Math.max(0, Math.floor(finiteNonNegative(station?.transition_seconds ?? settings?.rest_seconds, 15)))
    const rounds = Math.max(1, Math.floor(Number(station?.rounds ?? settings?.rounds) || 3))
    const slots = rounds * count
    const slotLength = work + transition
    const totalSeconds = work * slots + transition * Math.max(0, slots - 1)
    const isComplete = seconds >= totalSeconds
    const slot = isComplete ? slots - 1 : Math.min(slots - 1, Math.floor(seconds / slotLength))
    const within = isComplete ? work : seconds - slot * slotLength
    const isTransition = !isComplete && slot < slots - 1 && within >= work
    return {
      kind: 'station',
      phase: isComplete ? 'FERDIG' : isTransition ? 'BYTE / ROTASJON' : 'ARBEID',
      phaseRemaining: isComplete ? 0 : Math.max(0, (isTransition ? slotLength : work) - within),
      remainingTotal: Math.max(0, totalSeconds - seconds),
      round: isComplete ? rounds : Math.floor(slot / count) + 1,
      rounds,
      station: isComplete ? count : slot % count + 1,
      stations: count,
      isComplete,
    }
  }

  const emomMatch = String(format).trim().toUpperCase().match(/^E(\d+(?:\.\d+)?)MOM$/)
  if (emomMatch || ['EMOM', 'EMOM 1', 'EMOM 2'].includes(format)) {
    const configuredEvery = Number(schema?.interval?.work_every_minutes)
    const everyMinutes = Math.max(0.25, Math.min(60,
      finitePositive(configuredEvery, Number(emomMatch?.[1]) || (format === 'EMOM 2' ? 2 : 1))))
    const cycle = Math.round(everyMinutes * 60)
    const work = Math.max(1, Math.min(cycle, finitePositive(
      settings?.work_seconds ?? schema?.interval?.work_seconds, cycle)))
    const rest = Math.max(0, Math.min(cycle - work, finiteNonNegative(
      settings?.rest_seconds ?? schema?.interval?.rest_seconds, 0)))
    const duration = Math.max(0, Number(schema?.duration_seconds) || Number(schema?.time_cap_seconds) || Number(settings?.duration_seconds) || 0)
    const isComplete = duration > 0 && seconds >= duration
    const within = seconds % cycle
    const phase = isComplete ? 'FERDIG' : within < work ? 'ARBEID' : within < work + rest ? 'KVILE' : 'VENTAR'
    const phaseRemaining = isComplete ? 0 : phase === 'ARBEID' ? work - within
      : phase === 'KVILE' ? work + rest - within : cycle - within
    const rounds = duration ? Math.ceil(duration / cycle) : null
    return {
      kind: 'emom',
      phase,
      phaseRemaining: Math.max(0, phaseRemaining),
      remainingTotal: duration ? Math.max(0, duration - seconds) : null,
      round: rounds ? (isComplete ? rounds : Math.min(rounds, Math.floor(seconds / cycle) + 1)) : Math.floor(seconds / cycle) + 1,
      rounds,
      cycleSeconds: cycle,
      isComplete,
    }
  }

  const intervalFormat = ['Tabata', 'Intervall', 'Row Intervals', 'Intervall / Tabata'].includes(format)
    || schema?.structure === 'interval'
  if (intervalFormat) {
    const work = Math.max(1, Math.floor(finitePositive(schema?.interval?.work_seconds ?? settings?.work_seconds, 20)))
    const rest = Math.max(0, Math.floor(finiteNonNegative(schema?.interval?.rest_seconds ?? settings?.rest_seconds, 10)))
    const rounds = Math.max(1, Math.floor(Number(settings?.rounds ?? schema?.rounds) || 8))
    const slotsPerRound = Math.max(1, Math.floor(Number(schema?.interval_exercise_count)
      || (Array.isArray(schema?.items) ? schema.items.filter(item => !item?.is_rest).length : 0)
      || 1))
    const slots = rounds * slotsPerRound
    const cycle = work + rest
    const totalSeconds = work * slots + rest * Math.max(0, slots - 1)
    const isComplete = seconds >= totalSeconds
    const slot = isComplete ? slots - 1 : Math.min(slots - 1, Math.floor(seconds / cycle))
    const within = isComplete ? work : seconds - slot * cycle
    const isRest = !isComplete && slot < slots - 1 && within >= work
    return {
      kind: 'interval',
      phase: isComplete ? 'FERDIG' : isRest ? 'KVILE' : 'ARBEID',
      phaseRemaining: isComplete ? 0 : Math.max(0, (isRest ? cycle : work) - within),
      remainingTotal: Math.max(0, totalSeconds - seconds),
      round: isComplete ? rounds : Math.floor(slot / slotsPerRound) + 1,
      rounds,
      slot: slot % slotsPerRound + 1,
      slotsPerRound,
      isComplete,
    }
  }

  if (['AMRAP', 'Nedteljing'].includes(format)) {
    const duration = Math.max(0, Number(schema?.time_cap_seconds) || Number(schema?.duration_seconds) || Number(settings?.duration_seconds) || 0)
    const remaining = duration ? Math.max(0, duration - seconds) : null
    const isComplete = duration > 0 && seconds >= duration
    return {
      kind: 'countdown',
      phase: isComplete ? 'FERDIG' : 'TID ATT',
      phaseRemaining: remaining,
      remainingTotal: remaining,
      round: null,
      rounds: null,
      isComplete,
    }
  }

  return { kind: 'elapsed', phase: 'PÅGÅR', phaseRemaining: null, remainingTotal: null, round: null, rounds: null, isComplete: false }
}
