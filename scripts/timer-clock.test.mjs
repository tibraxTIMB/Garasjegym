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
