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
