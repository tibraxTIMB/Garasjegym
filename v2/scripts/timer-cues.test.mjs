import test from 'node:test'
import assert from 'node:assert/strict'
import { countdownSignal, secondsToTimerBoundary, runningTimerSignal, trainingSignalPattern, playTrainingTone } from '../src/lib/timerCues.js'

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

test('Death By warns before the configured interval deadline, not a Ladder minute',()=>{
 assert.equal(secondsToTimerBoundary({format:'Death By',elapsed:57,remainingTotal:1000,isDeathBy:true}),3)
 assert.equal(secondsToTimerBoundary({format:'Death By',elapsed:72,remainingTotal:1000,isDeathBy:true,deathByIntervalSeconds:75}),3)
 assert.equal(secondsToTimerBoundary({format:'Ladder',elapsed:57,remainingTotal:1000}),null)
})

test('EMOM warns for work/rest and final end; finish overrides transition',()=>{
  assert.equal(secondsToTimerBoundary({format:'E1MOM',elapsed:42,remainingTotal:318,emomPhaseRemaining:3,isEMOM:true}),3)
  assert.equal(secondsToTimerBoundary({format:'E1MOM',elapsed:358,remainingTotal:2,emomPhaseRemaining:62,isEMOM:true}),2)
  assert.equal(runningTimerSignal({secondsToBoundary:3}), 'tick-3')
  assert.equal(runningTimerSignal({secondsToBoundary:0,phaseChanged:true}), 'transition')
  assert.equal(runningTimerSignal({secondsToBoundary:0,phaseChanged:true,finished:true}), 'finish')
})

test('gym signals are distinct, sustained and have no overlapping notes',()=>{
 const signals=['start','round','rest','station','finish']
 assert.equal(new Set(signals.map(s=>JSON.stringify(trainingSignalPattern(s)))).size,signals.length)
 for(const signal of [...signals,'tick-3','tick-2','tick-1']){
  let end=0
  for(const [frequency,duration,delay] of trainingSignalPattern(signal)){
   assert.ok(frequency>=700&&frequency<=1500)
   assert.ok(duration>=.18&&delay+1e-8>=end)
   end=delay+duration
  }
 }
})
test('full-volume audio peaks are bounded and mute creates no oscillators',()=>{
 const peaks=[];let count=0
 const context={currentTime:0,destination:{},createOscillator(){count++;return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(v){if(v>0)peaks.push(v)}},connect(){},disconnect(){}}}}
 playTrainingTone(context,1000,.3,0,0)
 assert.equal(count,0)
 playTrainingTone(context,1000,.3,0,100)
 assert.equal(count,2)
 assert.ok(peaks.reduce((a,b)=>a+b,0)<=1)
})

test('group audio is longer and stronger while silent profile emits nothing',()=>{
 assert.deepEqual(trainingSignalPattern('start','silent'),[])
 assert.ok(trainingSignalPattern('start','group').at(-1)[1]>trainingSignalPattern('start','personal').at(-1)[1])
 assert.ok(trainingSignalPattern('station','group').length>trainingSignalPattern('station','personal').length)
 const peaks=[];let count=0
 const context={currentTime:0,destination:{},createOscillator(){count++;return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(v){if(v>0)peaks.push(v)}},connect(){},disconnect(){}}}}
 playTrainingTone(context,1200,.5,0,100,'group')
 assert.equal(count,1)
 assert.equal(peaks[0],.96)
 playTrainingTone(context,1200,.5,0,100,'silent')
 assert.equal(count,1)
})
