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
 * This is intentionally a pure function so phase transitions can be regression-tested.
 */
export function getGroupClassLiveTimer({ format = '', elapsed = 0, settings = {} } = {}) {
  const seconds = Math.max(0, Math.floor(Number(elapsed) || 0))
  const schema = settings?.workout_schema || {}
  const station = schema?.station_circuit
  if (format === 'Stasjonssirkel' || schema?.structure === 'station_circuit') {
    const count = Math.max(2, Math.min(8, Number(station?.station_count) || station?.stations?.length || 2))
    const work = finitePositive(station?.work_seconds ?? settings?.work_seconds, 45)
    const transition = finiteNonNegative(station?.transition_seconds ?? settings?.rest_seconds, 15)
    const rounds = Math.max(1, Number(station?.rounds ?? settings?.rounds) || 3)
    const slots = rounds * count
    const slotLength = work + transition
    const slot = Math.min(slots - 1, Math.floor(seconds / slotLength))
    const within = seconds - slot * slotLength
    const isTransition = slot < slots - 1 && within >= work
    return {
      kind: 'station',
      phase: isTransition ? 'BYTE / ROTASJON' : 'ARBEID',
      phaseRemaining: Math.max(0, (isTransition ? slotLength : work) - within),
      remainingTotal: Math.max(0, work * slots + transition * Math.max(0, slots - 1) - seconds),
      round: Math.min(rounds, Math.floor(slot / count) + 1),
      rounds,
      station: slot % count + 1,
      stations: count,
    }
  }

  const emomMatch = String(format).trim().toUpperCase().match(/^E(\\d+(?:\\.\\d+)?)MOM$/)
  if (emomMatch || ['EMOM', 'EMOM 1', 'EMOM 2'].includes(format)) {
    const configuredEvery = Number(schema?.interval?.work_every_minutes)
    const everyMinutes = Math.max(0.25, Math.min(60,
      finitePositive(configuredEvery, Number(emomMatch?.[1]) || (format === 'EMOM 2' ? 2 : 1))))
    const cycle = Math.round(everyMinutes * 60)
    const work = Math.max(1, Math.min(cycle, finitePositive(
      settings?.work_seconds ?? schema?.interval?.work_seconds, cycle)))
    const rest = Math.max(0, Math.min(cycle - work, finiteNonNegative(
      settings?.rest_seconds ?? schema?.interval?.rest_seconds, 0)))
    const within = seconds % cycle
    const phase = within < work ? 'ARBEID' : within < work + rest ? 'KVILE' : 'VENTAR'
    const phaseRemaining = phase === 'ARBEID' ? work - within
      : phase === 'KVILE' ? work + rest - within : cycle - within
    const duration = Math.max(0, Number(schema?.duration_seconds) || Number(settings?.duration_seconds) || 0)
    return {
      kind: 'emom',
      phase,
      phaseRemaining: Math.max(0, phaseRemaining),
      remainingTotal: duration ? Math.max(0, duration - seconds) : null,
      round: Math.floor(seconds / cycle) + 1,
      rounds: duration ? Math.ceil(duration / cycle) : null,
      cycleSeconds: cycle,
    }
  }

  return { kind: 'elapsed', phase: 'PÅGÅR', phaseRemaining: null, remainingTotal: null, round: null, rounds: null }
}
