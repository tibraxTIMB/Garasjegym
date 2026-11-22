import test from 'node:test'
import assert from 'node:assert/strict'
import { countdownSignal, secondsToTimerBoundary, runningTimerSignal } from '../src/lib/timerCues.js'

test('ten-second start only sounds on three, two, one and start',()=>{
  assert.deepEqual(Array.from({length:11},(_,i)=>countdownSignal(10-i)).filter(Boolean),['tick-3','tick-2','tick-1','start'])
})

test('AMRAP end and capped For Time give a final three-second warning',()=>{
  assert.equal(secondsToTimerBoundary({format:'AMRAP',elapsed:597,remainingTotal:3,isCountdown:true}),3)
  assert.equal(secondsToTimerBoundary({format:'For Time',elapsed:100,remainingTotal:300,hasTimeCap:false}),null)
  assert.equal(secondsToTimerBoundary({format:'For Time',elapsed:297,remainingTotal:3,hasTimeCap:true}),3)
})

test('Tabata and stations announce the nearest work/rest phase boundary',()=>{
  assert.equal(secondsToTimerBoundary({format:'Tabata',elapsed:17,remainingTotal:103,phaseRemaining:3,isTimedInterval:true}),3)
  assert.equal(secondsToTimerBoundary({format:'Stasjonssirkel',elapsed:43,remainingTotal:317,phaseRemaining:2,isStationCircuit:true}),2)
  assert.equal(secondsToTimerBoundary({format:'Tabata',elapsed:119,remainingTotal:1,phaseRemaining:10,isTimedInterval:true}),1)
})

test('EMOM warns for work/rest and final end; finish overrides transition',()=>{
  assert.equal(secondsToTimerBoundary({format:'E1MOM',elapsed:42,remainingTotal:318,emomPhaseRemaining:3,isEMOM:true}),3)
  assert.equal(secondsToTimerBoundary({format:'E1MOM',elapsed:358,remainingTotal:2,emomPhaseRemaining:62,isEMOM:true}),2)
  assert.equal(runningTimerSignal({secondsToBoundary:3}), 'tick-3')
  assert.equal(runningTimerSignal({secondsToBoundary:0,phaseChanged:true}), 'transition')
  assert.equal(runningTimerSignal({secondsToBoundary:0,phaseChanged:true,finished:true}), 'finish')
})
