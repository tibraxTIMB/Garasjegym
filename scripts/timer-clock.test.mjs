import test from 'node:test'
import assert from 'node:assert/strict'
import { clampElapsedToTarget, elapsedSecondsFromTimestamp, splitDuration } from '../v2/src/lib/timerClock.js'

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
