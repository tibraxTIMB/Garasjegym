import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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
  assert.match(timer,/Siste kontroll før lagring/)
  assert.match(timer,/Planlagt: \{items\[activeExerciseIndex\]\.prescription_label\}/)
  assert.match(timer,/isErgExercise\(items\[activeExerciseIndex\]\)\?<div className="workout-result-erg"/)
  assert.match(timer,/\<option value="cal"\>Kaloriar/)
  assert.match(timer,/Talet ovanfor er WOD-målet, ikkje registrert resultat/)
})
