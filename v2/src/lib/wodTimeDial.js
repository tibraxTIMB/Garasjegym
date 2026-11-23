export function dialValueFromPoint(x, y, maximum = 60) {
  // Noon is the maximum, and clockwise movement advances from 1 to maximum.
  const angle = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2)
  const value = Math.round(angle / (Math.PI * 2) * maximum)
  return value === 0 ? maximum : Math.max(1, Math.min(maximum, value))
}

export function clampWodDuration(value, maximum = 600) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(1, Math.min(maximum, Math.round(n))) : 1
}

export function wodFormatNeedsTime(format) {
  return !['Strength', 'Superset', 'Complex', 'Eigen økt', 'Samansett økt'].includes(format)
}
