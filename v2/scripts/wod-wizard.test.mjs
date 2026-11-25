import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dialValueFromPoint, clampWodDuration, wodFormatNeedsTime } from '../src/lib/wodTimeDial.js'
import { applySharedReps, hasIndependentReps } from '../src/lib/wodReps.js'

const code = readFileSync(new URL('../src/components/WodBuilder.jsx', import.meta.url), 'utf8')
const dial = readFileSync(new URL('../src/components/WodTimeDial.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/components/wod-wizard-refine.css', import.meta.url), 'utf8')
const training = readFileSync(new URL('../src/components/Training.jsx', import.meta.url), 'utf8')

test('analog time selector uses a full clockwise 60-minute/second dial', () => {
  assert.equal(dialValueFromPoint(1, 0), 15)
  assert.equal(dialValueFromPoint(0, 1), 30)
  assert.equal(dialValueFromPoint(-1, 0), 45)
  assert.equal(dialValueFromPoint(0, -1), 60)
  assert.equal(clampWodDuration(''), 1)
  assert.equal(clampWodDuration(700), 600)
  assert.equal(clampWodDuration(0), 1)
})

test('only formats requiring a timing decision get the time screen', () => {
  for (const format of ['AMRAP', 'For Time', 'Tabata', 'E2MOM', 'Stasjonssirkel', 'Ladder']) assert.equal(wodFormatNeedsTime(format), true)
  for (const format of ['Strength', 'Superset', 'Complex', 'Eigen økt']) assert.equal(wodFormatNeedsTime(format), false)
})

test('format tap advances while multi-choice screens keep an explicit next action', () => {
  assert.match(code, /setWizardStep\(wodFormatNeedsTime\(item\)&&item!==COMPOSITE_FORMAT\?1:3\)/)
  assert.match(code, /wizardStep===0&&<section className="gg-format-wizard"/)
  assert.match(code, /wizardStep===1&&<div className="wizard-stage-actions gg-time-next"/)
  assert.match(code, /\(wizardStep===2\|\|wizardStep===3\)&&!libraryOpen&&<div className="wizard-selected-stage/ )
  assert.match(code, /wizardStep===4&&<section className="gg-review-before"/)
})

test('dosage and review both reorder by stable exercise occurrence keys', () => {
  assert.match(code, /function WodReviewOrder/)
  assert.match(code, /onMove\(ex\.key,-1\)/)
  assert.match(code, /onMove\(ex\.key,1\)/)
  assert.match(code, /moveByKey\(ex\.key,-1\)/)
  assert.match(code, /moveByKey\(ex\.key,1\)/)
  assert.match(code, /WodReviewOrder selected=\{selected\} onMove=\{moveByKey\}/)
})

test('RX is the simple default, and intermediate/scaled live in an expandable area', () => {
  assert.match(code, /RX · hovuddosering/)
  assert.match(code, /<details className="gg-secondary-dosage"/)
  assert.match(code, /renderDose\('intermediate'\)/)
  assert.match(code, /renderDose\('scaled'\)/)
  assert.match(code, /\[50,60,75\]\.map\(n=>/)
  assert.match(code, /updateLevel\(exercise\.key,level,patch\)/)
  assert.match(code, /loadMode:'kg',loadKgMen/)
  assert.match(code, /loadMode:'kg',loadKgWomen/)
  assert.match(training, /id:'intermediate',label:'Intermediate'/)
})

test('the dial has no preset buttons, and five progress stages fit in one row', () => {
  assert.match(dial, /onPointerDown/)
  assert.match(dial, /onKeyDown/)
  assert.doesNotMatch(dial, /gg-time-presets|presets\.map/)
  assert.match(css, /\.gg-wizard-progress\s*\{\s*display:grid!important/)
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/)
  assert.match(css, /\.wizard-dose-stage \.wizard-stage-actions,/) 
  assert.match(css, /position:static!important/)
})

test('the same exercise can be chosen repeatedly with count and explicit feedback', () => {
  assert.match(code, /pickerFeedback\.count>1/)
  assert.match(code, /role="status" aria-live="polite"/)
  assert.match(code, /Vald \{pickedCount\}/)
  assert.match(code, /Legg til igjen/)
})

test('metric-sensitive RX input and saving handle reps, distance, calories and time', () => {
  assert.match(code, /quickDoseMetricFor=ex=>/)
  assert.match(code, /metric==='distance'/)
  assert.match(code, /metric==='calories'/)
  assert.match(code, /metric==='time'/)
  assert.match(code, /architectDoseIssue\(x,\{/ )
  assert.match(code, /const invalidItem=selected\.find\(x=>issueFor\(x\)\)/)
  assert.match(code, /setEditingSelectedKey\(invalidItem\.key\)/)
})

test('five reps shortcuts and plus/minus use a single editable RX value', () => {
  assert.match(code, /const quickReps=\[5,8,10,12,15\]/)
  assert.match(code, /function RepsPicker/)
  assert.match(code, /className="gg-reps-controls"/)
  assert.match(code, /className="gg-reps-quick-values"/)
  assert.match(code, /<RepsPicker value=\{dose\.reps\?\?''\}/)
  assert.doesNotMatch(code, /Same reps som førre/)
})

test('RX changes update inherited reps without overwriting deliberate scaling', () => {
  const original={rx:{reps:'10'},intermediate:{reps:'10'},scaled:{reps:'8'},foundation:{reps:'10',repsOverride:true}}
  const updated=applySharedReps(original,'12')
  assert.equal(updated.rx.reps,'12')
  assert.equal(updated.intermediate.reps,'12')
  assert.equal(updated.scaled.reps,'8')
  assert.equal(updated.foundation.reps,'10')
  assert.equal(original.rx.reps,'10')
  assert.equal(hasIndependentReps(original,'scaled'),true)
  assert.equal(hasIndependentReps(original,'intermediate'),false)
})

test('an explicit reset to RX resumes automatic inheritance', () => {
  const levels={rx:{reps:'10'},scaled:{reps:'8',repsOverride:false}}
  assert.equal(hasIndependentReps(levels,'scaled'),false)
  assert.equal(applySharedReps(levels,'15').scaled.reps,'15')
  assert.equal(applySharedReps({},'5').rx.reps,'5')
})
