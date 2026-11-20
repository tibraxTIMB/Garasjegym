import test from 'node:test'
import assert from 'node:assert/strict'
import { getDemoTimerState } from '../src/lib/infotainmentTimer.js'

test('Tabata 8 x 20/10 ends after the final work interval without an extra rest', () => {
  const beforeFinish = getDemoTimerState({ format: 'tabata', elapsed: 229, workSeconds: 20, restSeconds: 10, rounds: 8 })
  const finished = getDemoTimerState({ format: 'tabata', elapsed: 230, workSeconds: 20, restSeconds: 10, rounds: 8 })
  assert.equal(beforeFinish.totalSeconds, 230)
  assert.equal(beforeFinish.phase, 'ARBEID')
  assert.equal(beforeFinish.displayTime, 1)
  assert.equal(finished.finished, true)
  assert.equal(finished.phase, 'FERDIG')
  assert.equal(finished.displayTime, 0)
})

test('custom intervals remove only the final transition', () => {
  const state = getDemoTimerState({ format: 'interval', elapsed: 224, workSeconds: 45, restSeconds: 15, rounds: 4 })
  assert.equal(state.totalSeconds, 225)
  assert.equal(state.phase, 'ARBEID')
  assert.equal(state.displayTime, 1)
  const finished = getDemoTimerState({ format: 'interval', elapsed: 225, workSeconds: 45, restSeconds: 15, rounds: 4 })
  assert.equal(finished.phase, 'FERDIG')
  assert.equal(finished.displayTime, 0)
})

test('EMOM keeps the configured minute count and finishes at zero', () => {
  const active = getDemoTimerState({ format: 'emom', elapsed: 299, workSeconds: 45, restSeconds: 15, rounds: 5 })
  assert.equal(active.totalSeconds, 300)
  assert.equal(active.phase, 'VENTETID')
  assert.equal(active.displayTime, 1)
  const finished = getDemoTimerState({ format: 'emom', elapsed: 300, workSeconds: 45, restSeconds: 15, rounds: 5 })
  assert.equal(finished.phase, 'FERDIG')
  assert.equal(finished.displayTime, 0)
})

test('countdown and AMRAP remain bounded by their duration', () => {
  const countdown = getDemoTimerState({ format: 'countdown', minutes: 5, elapsed: 300 })
  const amrap = getDemoTimerState({ format: 'amrap', minutes: 10, elapsed: 601 })
  assert.equal(countdown.phase, 'FERDIG')
  assert.equal(countdown.displayTime, 0)
  assert.equal(amrap.phase, 'FERDIG')
  assert.equal(amrap.displayTime, 0)
})

test('unlimited stopwatch and For Time continue counting up', () => {
  const stopwatch = getDemoTimerState({ format: 'stopwatch', elapsed: 3601 })
  const forTime = getDemoTimerState({ format: 'fortime', elapsed: 721 })
  assert.equal(stopwatch.totalSeconds, 0)
  assert.equal(stopwatch.displayTime, 3601)
  assert.equal(forTime.phase, 'MEDGÅTT TID')
  assert.equal(forTime.displayTime, 721)
})

console.log('Infotainment demo timer tests passed.')
