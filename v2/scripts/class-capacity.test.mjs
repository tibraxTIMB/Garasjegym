import test from 'node:test'
import assert from 'node:assert/strict'
import { validateClassCapacity } from '../src/lib/classCapacity.js'

test('valid class capacities accept whole values within limits', () => {
  assert.deepEqual(validateClassCapacity(8, 0), {ok:true, value:8})
  assert.deepEqual(validateClassCapacity('12', 8), {ok:true, value:12})
  assert.deepEqual(validateClassCapacity(100, 100), {ok:true, value:100})
})

test('class capacity rejects non-integer and out-of-range values', () => {
  assert.equal(validateClassCapacity(1.5, 0).ok, false)
  assert.equal(validateClassCapacity(0, 0).ok, false)
  assert.equal(validateClassCapacity(101, 0).ok, false)
  assert.equal(validateClassCapacity('not-a-number', 0).ok, false)
})

test('class capacity cannot be reduced below confirmed and pending bookings', () => {
  const result = validateClassCapacity(7, 8)
  assert.equal(result.ok, false)
  assert.match(result.error, /8 har aktiv påmelding/)
})

test('class capacity rejects invalid active booking counts safely', () => {
  assert.equal(validateClassCapacity(8, -1).ok, false)
  assert.equal(validateClassCapacity(8, 1.5).ok, false)
})
