import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeartRateMeasurement } from '../src/lib/heartRate.js'

test('parses an 8-bit heart-rate measurement', () => {
  const value = new DataView(Uint8Array.from([0x00, 142]).buffer)
  assert.equal(parseHeartRateMeasurement(value), 142)
})

test('parses a 16-bit heart-rate measurement', () => {
  const value = new DataView(Uint8Array.from([0x01, 0xc8, 0x00]).buffer)
  assert.equal(parseHeartRateMeasurement(value), 200)
})

test('rejects malformed and implausible heart-rate measurements', () => {
  assert.equal(parseHeartRateMeasurement(new DataView(new ArrayBuffer(1))), null)
  assert.equal(parseHeartRateMeasurement(new DataView(Uint8Array.from([0x01, 0xc8]).buffer)), null)
  assert.equal(parseHeartRateMeasurement(new Uint8Array([0, 100])), null)
  assert.equal(parseHeartRateMeasurement(new DataView(Uint8Array.from([0x00, 10]).buffer)), null)
  assert.equal(parseHeartRateMeasurement(new DataView(Uint8Array.from([0x00, 301]).buffer)), null)
  assert.equal(parseHeartRateMeasurement(null), null)
})
