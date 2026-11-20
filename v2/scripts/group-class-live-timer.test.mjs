import test from 'node:test'
import assert from 'node:assert/strict'
import { getGroupClassLiveTimer } from '../src/lib/groupClassLiveTimer.js'

test('E1MOM displays work and rest phases, not a generic minute marker', () => {
  const settings = { work_seconds: 45, rest_seconds: 15 }
  assert.deepEqual(
    (({kind,phase,phaseRemaining,round})=>({kind,phase,phaseRemaining,round}))(getGroupClassLiveTimer({format:'E1MOM',elapsed:48,settings})),
    {kind:'emom',phase:'KVILE',phaseRemaining:12,round:1}
  )
  assert.equal(getGroupClassLiveTimer({format:'E1MOM',elapsed:60,settings}).round,2)
})

test('fractional EMOM intervals use their configured cycle length', () => {
  const settings = { work_seconds: 45, rest_seconds: 15 }
  const state = getGroupClassLiveTimer({format:'E1.25MOM',elapsed:65,settings})
  assert.equal(state.cycleSeconds,75)
  assert.equal(state.phase,'VENTAR')
  assert.equal(state.phaseRemaining,10)
  assert.equal(state.round,1)
})

test('EMOM duration reports remaining class workout time when configured', () => {
  const state = getGroupClassLiveTimer({format:'E2MOM',elapsed:125,settings:{workout_schema:{duration_seconds:600}}})
  assert.equal(state.round,2)
  assert.equal(state.remainingTotal,475)
})

test('station circuit has no transition after the final station', () => {
  const state = getGroupClassLiveTimer({
    format:'Stasjonssirkel',elapsed:4*45+3*15,
    settings:{workout_schema:{station_circuit:{station_count:2,rounds:2,work_seconds:45,transition_seconds:15}}}
  })
  assert.equal(state.phase,'ARBEID')
  assert.equal(state.phaseRemaining,0)
  assert.equal(state.remainingTotal,0)
  assert.equal(state.round,2)
  assert.equal(state.station,2)
})

test('invalid timer settings safely fall back to sensible class defaults', () => {
  const state = getGroupClassLiveTimer({format:'E3MOM',elapsed:30,settings:{work_seconds:0,rest_seconds:-1}})
  assert.equal(state.cycleSeconds,180)
  assert.equal(state.phase,'ARBEID')
  assert.equal(state.phaseRemaining,150)
})
