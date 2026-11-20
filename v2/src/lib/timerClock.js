export function elapsedSecondsFromTimestamp(startedAt, baseElapsed = 0, now = Date.now()) {
  if (startedAt == null || !Number.isFinite(Number(startedAt))) return Math.max(0, Math.floor(Number(baseElapsed) || 0))
  const base = Math.max(0, Math.floor(Number(baseElapsed) || 0))
  return base + Math.max(0, Math.floor((Number(now) - Number(startedAt)) / 1000))
}

export function clampElapsedToTarget(elapsed, target) {
  const value = Math.max(0, Math.floor(Number(elapsed) || 0))
  const limit = Number(target)
  return Number.isFinite(limit) && limit > 0 ? Math.min(value, Math.floor(limit)) : value
}

export function splitDuration(elapsed, previousSplits = []) {
  const total = Math.max(0, Math.floor(Number(elapsed) || 0))
  const recorded = (Array.isArray(previousSplits) ? previousSplits : [])
    .reduce((sum, split) => sum + Math.max(0, Math.floor(Number(split) || 0)), 0)
  return Math.max(0, total - recorded)
}
