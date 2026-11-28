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
 assert.match(timer,/hasStarted&&!guidedChipper&&\(isAmrap\|\|isLadder\|\|isDeathBy\|\|isStopwatch\|\|isForTime\)/)
 assert.match(timer,/onClick=\{confirmChipperTarget\}/)
 assert.match(timer,/locked:Date\.now\(\)<chipperLockRef\.current/)
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

import {canLeavePreparedWod} from '../src/lib/prestartExit.js'
test('only an unstarted WOD can leave without discarding; countdown can be cancelled before deadline',()=>{
 const now=1000
 assert.equal(canLeavePreparedWod({phase:'Klar',elapsed:0,roundsCompleted:1},now),true)
 assert.equal(canLeavePreparedWod({phase:'NEDTELJING',countdownDeadline:2000},now),true)
 assert.equal(canLeavePreparedWod({phase:'NEDTELJING',countdownDeadline:1000},now),false)
 for(const state of [{hasStarted:true},{running:true},{elapsed:1},{laps:[0]},{phase:'PAUSE'},{phase:'FERDIG'},{active_block_index:1},{block_results:{0:{hasStarted:true}}},{block_summary:[{completed:true}]},{composite_transition:{deadline:2000}}]){
  assert.equal(canLeavePreparedWod(state,now),false,JSON.stringify(state))
 }
 const timer=source('../src/components/Training.jsx')
 assert.match(timer,/onCancelBeforeStart=\{source&&!manualEntry&&canLeavePreparedWod\(timerSnapshot\)\?returnToWorkoutTypes:null\}/)
 assert.match(timer,/active===0&&canLeavePreparedWod/)
 assert.match(timer,/!untouchedWod && !window.confirm/)
 assert.match(timer,/clearWorkoutDraft\(memberId\);setLaunchLinkContext\(emptyTrainingLaunchContext\(\)\)/)
 assert.match(timer,/Tilbake utan å starta WOD/)
})

test('manual Finish and Next part are silent while automatic completion retains the finish cue',()=>{
 const timer=source('../src/components/Training.jsx')
 const finish=timer.match(/const finishCurrent=\([^)]*\)=>\{[^\n]+/)?.[0]
 assert.ok(finish,'Manual finish handler must be present')
 assert.match(finish,/onFinish\(/)
 assert.doesNotMatch(finish,/playSignal|playPackSignal/)
 const automatic=timer.slice(timer.indexOf('if (timerLimitReached) {'),timer.indexOf('const phaseChanged = elapsed > 0'))
 assert.match(automatic,/playSignal\('finish'\)/)
 assert.match(timer,/if\(next.finished\)\{setRunning\(false\);setPhase\('FERDIG'\);playSignal\('finish'\)\}/)
})
