import test from 'node:test'
import assert from 'node:assert/strict'
import { classifySwipe } from '../src/lib/gesture.js'

test('classifies horizontal and vertical swipes', () => {
  assert.equal(classifySwipe(-90, 4), 'left')
  assert.equal(classifySwipe(90, 3), 'right')
  assert.equal(classifySwipe(2, -90), 'up')
  assert.equal(classifySwipe(1, 90), 'down')
})

test('ignores movement below threshold and ambiguous diagonals', () => {
  assert.equal(classifySwipe(20, 10), null)
  assert.equal(classifySwipe(60, 55), null)
})

test('enforces configured axis', () => {
  assert.equal(classifySwipe(90, 4, { axis: 'y' }), null)
  assert.equal(classifySwipe(4, -90, { axis: 'y' }), 'up')
  assert.equal(classifySwipe(-90, 4, { axis: 'x' }), 'left')
})


test('respects the exact movement threshold', () => {
  assert.equal(classifySwipe(54, 0, { axis: 'x', threshold: 55 }), null)
  assert.equal(classifySwipe(-55, 0, { axis: 'x', threshold: 55 }), 'left')
})

test('rejects gestures dominated by the wrong axis', () => {
  assert.equal(classifySwipe(80, 40, { axis: 'y', threshold: 48, axisRatio: 1.25 }), null)
  assert.equal(classifySwipe(40, -80, { axis: 'x', threshold: 48, axisRatio: 1.25 }), null)
  assert.equal(classifySwipe(0, -80, { axis: 'y', threshold: 48, axisRatio: 1.25 }), 'up')
})

test('ignores diagonal movement in the shared both-axis mode', () => {
  assert.equal(classifySwipe(70, 70, { axis: 'both', threshold: 48 }), null)
})
