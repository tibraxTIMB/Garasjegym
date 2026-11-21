import test from 'node:test'
import assert from 'node:assert/strict'
import { clampElapsedToTarget, elapsedSecondsFromTimestamp, getFixedSlotTimerState, normalizeEmomIntervalMinutes, splitDuration, summarizeLapSplits } from '../v2/src/lib/timerClock.js'

test('timer clock is derived from timestamps rather than refresh count', () => {
  assert.equal(elapsedSecondsFromTimestamp(10_000, 12, 15_450), 17)
  assert.equal(elapsedSecondsFromTimestamp(10_000, 12, 10_000), 12)
})

test('paused timer retains its base and ignores negative clock movement', () => {
  assert.equal(elapsedSecondsFromTimestamp(null, 23, 1), 23)
  assert.equal(elapsedSecondsFromTimestamp(20_000, 8, 19_000), 8)
})

test('countdown completion is clamped to its configured target', () => {
  assert.equal(clampElapsedToTarget(61, 60), 60)
  assert.equal(clampElapsedToTarget(59, 60), 59)
  assert.equal(clampElapsedToTarget(61, 0), 61)
})

test('lap split records only the time since the previous split', () => {
  assert.equal(splitDuration(35, [12, 10]), 13)
  assert.equal(splitDuration(12, []), 12)
})

test('round overview shows per-round splits and cumulative elapsed times', () => {
  const splits = [splitDuration(37), splitDuration(89, [37]), splitDuration(130, [37, 52])]
  assert.deepEqual(splits, [37, 52, 41])
  assert.deepEqual(summarizeLapSplits(splits), [
    { round: 1, duration: 37, at: 37 },
    { round: 2, duration: 52, at: 89 },
    { round: 3, duration: 41, at: 130 },
  ])
  assert.deepEqual(summarizeLapSplits(null), [])
})


test('finite interval workouts omit the rest period after the final work block', () => {
  const total = (work, rest, rounds, exercises) => {
    const slots = Math.max(1, rounds) * Math.max(1, exercises)
    return work * slots + rest * Math.max(0, slots - 1)
  }
  assert.equal(total(45, 15, 2, 4), 465)
  assert.equal(total(20, 10, 8, 1), 230)
  assert.equal(total(60, 0, 3, 2), 360)
})

test('station circuits already use the same no-final-transition rule', () => {
  const stationTotal = (work, transition, rounds, stations) => {
    const slots = Math.max(1, rounds) * Math.max(1, stations)
    return work * slots + transition * Math.max(0, slots - 1)
  }
  assert.equal(stationTotal(45, 15, 6, 4), 1425)
  assert.equal(stationTotal(45, 0, 1, 2), 90)
})


test('station circuit completes every round and has zero time at the finish', () => {
  const state = getFixedSlotTimerState({
    elapsed: 465,
    workSeconds: 45,
    restSeconds: 15,
    rounds: 2,
    slotsPerRound: 4,
    transitionLabel: 'BYTE STASJON',
  })
  assert.equal(state.totalSeconds, 465)
  assert.equal(state.isComplete, true)
  assert.equal(state.phase, 'FERDIG')
  assert.equal(state.phaseRemaining, 0)
  assert.equal(state.remainingSeconds, 0)
  assert.equal(state.roundsCompleted, 2)
  assert.equal(state.currentRound, 2)
  assert.equal(state.currentSlot, 4)
})

test('a completed circuit round is counted when its final work block ends', () => {
  const state = getFixedSlotTimerState({
    elapsed: 225,
    workSeconds: 45,
    restSeconds: 15,
    rounds: 2,
    slotsPerRound: 4,
    transitionLabel: 'BYTE STASJON',
  })
  assert.equal(state.isComplete, false)
  assert.equal(state.phase, 'BYTE STASJON')
  assert.equal(state.phaseRemaining, 15)
  assert.equal(state.roundsCompleted, 1)
  assert.equal(state.currentRound, 1)
  assert.equal(state.currentSlot, 4)
})

test('interval slots keep the correct exercise slot and omit the final rest', () => {
  const state = getFixedSlotTimerState({
    elapsed: 170,
    workSeconds: 20,
    restSeconds: 10,
    rounds: 2,
    slotsPerRound: 3,
  })
  assert.equal(state.totalSeconds, 170)
  assert.equal(state.isComplete, true)
  assert.equal(state.phaseRemaining, 0)
  assert.equal(state.roundsCompleted, 2)
  assert.equal(state.currentRound, 2)
  assert.equal(state.currentSlot, 3)
})

test('zero-rest work slots advance and count rounds without an extra delay', () => {
  const state = getFixedSlotTimerState({
    elapsed: 135,
    workSeconds: 45,
    restSeconds: 0,
    rounds: 2,
    slotsPerRound: 3,
  })
  assert.equal(state.totalSeconds, 270)
  assert.equal(state.phase, 'ARBEID')
  assert.equal(state.currentRound, 2)
  assert.equal(state.currentSlot, 1)
  assert.equal(state.roundsCompleted, 1)
})


test('fractional EMOM intervals are preserved and bounded', () => {
  assert.equal(normalizeEmomIntervalMinutes(1.25, 1), 1.25)
  assert.equal(normalizeEmomIntervalMinutes(0.25, 1), 0.25)
  assert.equal(normalizeEmomIntervalMinutes(0.1, 1), 0.25)
  assert.equal(normalizeEmomIntervalMinutes(12, 1), 7)
  assert.equal(normalizeEmomIntervalMinutes(null, 1.5), 1.5)
})
