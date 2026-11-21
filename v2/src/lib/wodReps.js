/** RX owns the default rep count. A level only diverges after an explicit override. */
export function hasIndependentReps(levels, level) {
  if (level === 'rx') return false
  const rx = String(levels?.rx?.reps ?? '')
  const dose = levels?.[level]
  if (!dose) return false
  if (dose.repsOverride === true) return true
  if (dose.repsOverride === false) return false
  // Old saved WODs had no flag; keep their deliberately different reps.
  return dose.reps != null && dose.reps !== '' && String(dose.reps) !== rx
}

export function applySharedReps(levels, reps) {
  const nextReps = String(reps)
  const source = levels || {}
  const result = { ...source, rx: { ...(source.rx || {}), reps: nextReps } }
  for (const level of ['intermediate', 'scaled', 'foundation']) {
    const dose = source[level]
    if (dose && !hasIndependentReps(source, level)) {
      result[level] = { ...dose, reps: nextReps }
    }
  }
  return result
}
