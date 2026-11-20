import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeartRateMeasurement } from '../src/lib/heartRate.js'

test('parses an 8-bit heart-rate measurement', () => {
  const value = new DataView(Uint8Array.from([0x00, 142]).buffer)
  assert.equal(parseHeartRateMeasurement(value), 142)
})

test('parses a 16-bit heart-rate measurement', () => {
  const value = new DataView(Uint8Array.from([0x01, 0x2c, 0x01]).buffer)
  assert.equal(parseHeartRateMeasurement(value), 300)
})

test('rejects malformed and implausible heart-rate measurements', () => {
  assert.equal(parseHeartRateMeasurement(new DataView(new ArrayBuffer(1))), null)
  assert.equal(parseHeartRateMeasurement(new DataView(Uint8Array.from([0x00, 10]).buffer)), null)
  assert.equal(parseHeartRateMeasurement(new DataView(Uint8Array.from([0x00, 251]).buffer)), null)
  assert.equal(parseHeartRateMeasurement(null), null)
})
