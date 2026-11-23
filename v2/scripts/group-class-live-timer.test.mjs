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
  assert.equal(state.phase,'FERDIG')
  assert.equal(state.phaseRemaining,0)
  assert.equal(state.remainingTotal,0)
  assert.equal(state.round,2)
  assert.equal(state.station,2)
  assert.equal(state.isComplete,true)
})

test('invalid timer settings safely fall back to sensible class defaults', () => {
  const state = getGroupClassLiveTimer({format:'E3MOM',elapsed:30,settings:{work_seconds:0,rest_seconds:-1}})
  assert.equal(state.cycleSeconds,180)
  assert.equal(state.phase,'ARBEID')
  assert.equal(state.phaseRemaining,150)
})


test('EMOM stops and does not begin another round after its configured duration', () => {
  const state = getGroupClassLiveTimer({
    format:'E1.25MOM',
    elapsed:150,
    settings:{work_seconds:45,rest_seconds:15,workout_schema:{duration_seconds:150}}
  })
  assert.equal(state.phase,'FERDIG')
  assert.equal(state.phaseRemaining,0)
  assert.equal(state.remainingTotal,0)
  assert.equal(state.round,2)
  assert.equal(state.rounds,2)
  assert.equal(state.isComplete,true)
})

test('Tabata ends after the final work block without an extra rest period', () => {
  const state = getGroupClassLiveTimer({
    format:'Tabata',
    elapsed:230,
    settings:{work_seconds:20,rest_seconds:10,rounds:8,workout_schema:{structure:'interval',interval_exercise_count:1}}
  })
  assert.equal(state.phase,'FERDIG')
  assert.equal(state.phaseRemaining,0)
  assert.equal(state.remainingTotal,0)
  assert.equal(state.round,8)
  assert.equal(state.isComplete,true)
})

test('multi-exercise intervals report rounds by complete exercise slots', () => {
  const state = getGroupClassLiveTimer({
    format:'Intervall',
    elapsed:170,
    settings:{work_seconds:20,rest_seconds:10,rounds:2,workout_schema:{structure:'interval',interval_exercise_count:3}}
  })
  assert.equal(state.phase,'FERDIG')
  assert.equal(state.round,2)
  assert.equal(state.rounds,2)
  assert.equal(state.slot,3)
  assert.equal(state.remainingTotal,0)
})

test('AMRAP and countdown show zero and FERDIG after their time cap', () => {
  const state = getGroupClassLiveTimer({
    format:'AMRAP',
    elapsed:600,
    settings:{workout_schema:{time_cap_seconds:600}}
  })
  assert.equal(state.phase,'FERDIG')
  assert.equal(state.phaseRemaining,0)
  assert.equal(state.remainingTotal,0)
  assert.equal(state.isComplete,true)
})


test('group class result action keeps class context and bypasses timer for completed workouts', async () => {
  const {readFileSync}=await import('node:fs')
  const training=readFileSync(new URL('../src/components/Training.jsx',import.meta.url),'utf8')
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')
  const booking=readFileSync(new URL('../src/components/Booking.jsx',import.meta.url),'utf8')
  assert.match(training,/forResult:launchClassResult/)
  assert.match(training,/setManualEntry\(forResult\)/)
  assert.match(training,/reps: forResult \? ''/)
  assert.match(app,/setLaunchClassResult\(true\)/)
  assert.match(app,/else\{setScheduleTab\('booking'\);navigateTo\('timeplan'\)\}/)
  assert.match(booking,/focusedClassMissing/)
})
