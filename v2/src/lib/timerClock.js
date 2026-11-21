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


export function normalizeEmomIntervalMinutes(value, fallback = 1) {
  const candidate = Number(value);
  const defaultValue = Number(fallback);
  const selected = Number.isFinite(candidate) && candidate > 0
    ? candidate
    : Number.isFinite(defaultValue) && defaultValue > 0 ? defaultValue : 1;
  return Math.max(0.25, Math.min(7, selected));
}

export function splitDuration(elapsed, previousSplits = []) {
  const total = Math.max(0, Math.floor(Number(elapsed) || 0))
  const recorded = (Array.isArray(previousSplits) ? previousSplits : [])
    .reduce((sum, split) => sum + Math.max(0, Math.floor(Number(split) || 0)), 0)
  return Math.max(0, total - recorded)
}

export function summarizeLapSplits(splits = []) {
  let elapsed = 0
  return (Array.isArray(splits) ? splits : []).map((value, index) => {
    const duration = Math.max(0, Math.floor(Number(value) || 0))
    elapsed += duration
    return { round: index + 1, duration, at: elapsed }
  })
}

/**
 * Derive a finite work/rest timer made of repeated slots.
 * There is no rest period after the final work slot.
 */
export function getFixedSlotTimerState({
  elapsed = 0,
  workSeconds = 45,
  restSeconds = 15,
  rounds = 1,
  slotsPerRound = 1,
  transitionLabel = 'KVILE',
} = {}) {
  const seconds = Math.max(0, Math.floor(Number(elapsed) || 0));
  const work = Math.max(1, Math.floor(Number(workSeconds) || 45));
  const rest = Math.max(0, Math.floor(Number(restSeconds) || 0));
  const safeRounds = Math.max(1, Math.floor(Number(rounds) || 1));
  const safeSlotsPerRound = Math.max(1, Math.floor(Number(slotsPerRound) || 1));
  const totalSlots = safeRounds * safeSlotsPerRound;
  const cycleSeconds = work + rest;
  const totalSeconds = work * totalSlots + rest * Math.max(0, totalSlots - 1);
  const isComplete = seconds >= totalSeconds;
  const currentSlotIndex = isComplete
    ? totalSlots - 1
    : Math.min(totalSlots - 1, Math.floor(seconds / cycleSeconds));
  const withinSlot = isComplete ? work : seconds - currentSlotIndex * cycleSeconds;
  const isTransition = !isComplete && currentSlotIndex < totalSlots - 1 && withinSlot >= work;
  const phaseRemaining = isComplete
    ? 0
    : Math.max(0, isTransition ? cycleSeconds - withinSlot : work - withinSlot);
  const completedWorkSlots = isComplete
    ? totalSlots
    : Math.min(totalSlots, Math.floor((seconds + rest) / cycleSeconds));

  return {
    totalSlots,
    cycleSeconds,
    totalSeconds,
    remainingSeconds: Math.max(0, totalSeconds - seconds),
    currentSlotIndex,
    currentSlot: (currentSlotIndex % safeSlotsPerRound) + 1,
    currentRound: Math.floor(currentSlotIndex / safeSlotsPerRound) + 1,
    roundsCompleted: Math.floor(completedWorkSlots / safeSlotsPerRound),
    isTransition,
    isComplete,
    phase: isComplete ? 'FERDIG' : isTransition ? transitionLabel : 'ARBEID',
    phaseRemaining,
  };
}
