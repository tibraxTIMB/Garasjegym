import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nextManualActionDeadline } from '../src/lib/timerClock.js'

const source=file=>readFileSync(new URL(file,import.meta.url),'utf8')

test('all earlier rounds remain swipeable and individual laps show progression',()=>{
  const timer=source('../src/components/Training.jsx')
  const css=source('../src/components/timer-viewport.css')
  assert.match(timer,/stageLapHistory\.map\(lap=>/)
  assert.doesNotMatch(timer,/stageLapHistory\.slice\(-3\)/)
  assert.match(timer,/ref=\{portraitLapsRef\}/)
  assert.match(timer,/sek raskare/)
  assert.match(css,/\.gg-live-timer__lap-preview\s*\{[^}]*overflow-x: auto/s)
})

test('timer exercise details explain complex movement sequences on demand',()=>{
  const timer=source('../src/components/Training.jsx')
  assert.match(timer,/steps:Array\.isArray\(item\.complex_steps\)/)
  assert.match(timer,/className="gg-live-timer__exercise-detail"/)
  assert.match(timer,/Rørslesekvens/)
})

test('the post-workout review clearly separates WOD prescription and actual erg outcome',()=>{
  const timer=source('../src/components/Training.jsx')
  assert.match(timer,/Kontroller og lagre/)
  assert.match(timer,/PLANLAGT I WOD/)
  assert.match(timer,/\{resultItem\.prescription_label\}/)
  assert.match(timer,/isErgExercise\(resultItem\)\?<div className="workout-result-erg"/)
  assert.match(timer,/value:'cal',label:'Kaloriar \(cal\)'/)
  assert.match(timer,/GarageSelect label="Eining for ro-\/ergresultat"/)
  assert.match(timer,/Faktisk resultat/)
})

test('manual round registration blocks rapid repeated taps for five seconds',()=>{
 const first=nextManualActionDeadline(1000,0)
 assert.equal(first,6000)
 assert.equal(nextManualActionDeadline(1001,first),null)
 assert.equal(nextManualActionDeadline(5999,first),null)
 assert.equal(nextManualActionDeadline(6000,first),11000)
 assert.equal(nextManualActionDeadline(6000,first,2),8000)
 const timer=source('../src/components/Training.jsx')
 assert.match(timer,/!claimManualAction\('round'\)/)
 assert.match(timer,/manualActionDeadline\.current=next/)
 assert.match(timer,/setLaps\(value=>value\.slice\(0,-1\)\)/)
 assert.match(timer,/hasStarted&&\(isAmrap\|\|isLadder\|\|isDeathBy\|\|isStopwatch\|\|isForTime\)/)
 assert.match(timer,/gg-timer-secondary-actions/)
 const css=source('../src/components/timer-viewport.css')
 assert.match(css,/gg-manual-action[^\n]+min-height:84px/)
})

test('undo keeps a fixed target and is unavailable until a manual score exists',()=>{
 const timer=source('../src/components/Training.jsx')
 assert.match(timer,/const undoButton=manualButtonVisible/)
 assert.match(timer,/className="gg-manual-undo" disabled=\{!canUndoManual\}/)
 assert.match(timer,/lastRunningCueSecondRef\.current=-1;manualActionDeadline\.current=0/)
 const css=source('../src/components/timer-viewport.css')
 assert.match(css,/gg-live-timer__music-dock:empty\{display:block!important;height:0/)
})
