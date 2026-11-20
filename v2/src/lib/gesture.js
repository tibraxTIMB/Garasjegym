export function classifySwipe(deltaX, deltaY, { axis = 'both', threshold = 48, axisRatio = 1.25 } = {}) {
  const x = Number(deltaX) || 0
  const y = Number(deltaY) || 0
  const absX = Math.abs(x)
  const absY = Math.abs(y)
  if (Math.max(absX, absY) < threshold) return null
  if (axis === 'x' && absX < absY * axisRatio) return null
  if (axis === 'y' && absY < absX * axisRatio) return null
  if (axis === 'both' && absX > absY * axisRatio) return x < 0 ? 'left' : 'right'
  if (axis === 'both' && absY > absX * axisRatio) return y < 0 ? 'up' : 'down'
  if (axis !== 'both') return axis === 'x' ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down')
  return null
}
