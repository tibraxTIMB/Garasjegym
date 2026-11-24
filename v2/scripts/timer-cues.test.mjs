import test from 'node:test'
import assert from 'node:assert/strict'
import { countdownSignal, secondsToTimerBoundary, runningTimerSignal, trainingSignalPattern, playTrainingTone, synthesizeTrainingCue } from '../src/lib/timerCues.js'

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
test('three original audio profiles have distinct patterns and waveforms, normalized safe digital peaks',()=>{
 for(const signal of ['start','round','rest','station','finish','registered']){
  const profiles=['pt','personal','group']
  const fingerprints=profiles.map(profile=>{
   const samples=synthesizeTrainingCue(signal,profile)
   let peak=0,sum=0
   for(const s of samples){peak=Math.max(peak,Math.abs(s));sum+=s*s}
   assert.ok(peak>.97&&peak<=1)
   assert.ok(Math.sqrt(sum/samples.length)>.3)
   return Array.from(samples.slice(200,220)).join(',')
  })
  assert.equal(new Set(fingerprints).size,3)
 }
 assert.equal(synthesizeTrainingCue('start','silent').length,0)
 assert.ok(trainingSignalPattern('finish','group').length>trainingSignalPattern('finish','personal').length)
})
test('audio buffers respect volume, are cached, and never play in silent mode',()=>{
 let created=0,started=0;const gains=[]
 const context={sampleRate:24000,currentTime:0,destination:{},createBuffer(c,n){created++;const data=new Float32Array(n);return {getChannelData:()=>data}},createBufferSource(){return {connect(){},disconnect(){},start(){started++}}},createGain(){const gain={value:0};gains.push(gain);return {gain,connect(){},disconnect(){}}}}
 playTrainingSignal(context,'start',0,'group')
 playTrainingSignal(context,'start',100,'silent')
 assert.equal(created,0)
 playTrainingSignal(context,'start',100,'group')
 playTrainingSignal(context,'start',50,'group')
 assert.equal(created,1)
 assert.equal(started,2)
 assert.deepEqual(gains.map(g=>g.value),[1,.5])
})
