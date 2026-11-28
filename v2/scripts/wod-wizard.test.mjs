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

test('mobile setup combines format, participation and time with an explicit build action', () => {
  assert.match(code, /setWizardStep\(wodFormatNeedsTime\(item\)&&item!==COMPOSITE_FORMAT\?1:2\)/)
  assert.match(code, /\(wizardStep===0\|\|mobileSetup\)&&<section className="gg-format-wizard"/)
  assert.match(code, /\(mobileSetup\|\|!mobileFlow&&wizardStep===1\)&&<div className="wizard-stage-actions gg-time-next"/)
  assert.match(code, /onClick=\{\(\)=>goToStep\(2\)\}>\{mobileFlow\?"Bygg økta →"/)
  assert.match(code, /\(mobileBuild\|\|!mobileFlow&&\(wizardStep===2\|\|wizardStep===3\)\)&&!libraryOpen&&<div className="wizard-selected-stage/)
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

test('PT plan edits start in the workspace; other edits retain stored order and desktop flow', () => {
  assert.match(code, /setScaledNotes\(schema\.scaled_notes\|\|''\);setWizardStep\(planContext&&!officeMode\?2:0\)/)
  assert.match(code, /sortWodItems\(getWodSchemaItems\(schema\)\)/)
  assert.match(code, /if\(editWodId\)setWizardStep\(wodFormatNeedsTime\(item\)&&item!==COMPOSITE_FORMAT\?1:2\)/)
  assert.match(code, /onClick=\{\(\)=>chooseFormat\(format\)\}>Behald/)
})

test('RX, Scaled and Foundation are directly editable; legacy intermediate is not overwritten', () => {
  const quick = code.slice(code.indexOf('function QuickDoseLevels'), code.indexOf('function WodReviewOrder'))
  assert.match(quick, /renderDose\('rx'\)/)
  assert.match(quick, /renderDose\('scaled'\)/)
  assert.match(quick, /renderDose\('foundation'\)/)
  assert.doesNotMatch(quick, /Intermediate|renderDose\('intermediate'\)/)
  assert.match(quick, /loadMode:'kg',loadKgMen/)
  assert.match(quick, /loadMode:'kg',loadKgWomen/)
  assert.match(quick, /<option value="percent">% av 1RM<\/option>/)
  assert.match(quick, /<option value="rir">RIR<\/option>/)
  assert.match(quick, /\[50,60,75\]\.map\(n=>/)
  assert.match(quick, /updateLevel\(exercise\.key,level,patch\)/)
  assert.match(code, /levels:\{\.\.\.levels,scaled:\{\.\.\.rx,repsOverride:false\},foundation:\{\.\.\.rx,repsOverride:false\}\}/)
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


test('mobile wizard has three stages, one exercise list and preserved engine',()=>{
 assert.match(code,/const MOBILE_WOD_STEPS=\[0,2,4\]/)
 assert.match(code,/chooseFormat\(item,false\)/)
 assert.match(code,/if\(mobileFlow\)\{setMobileTimeOpen\(true\);setWizardStep\(0\);return\}/)
 assert.match(code,/onClick=\{\(\)=>mobileFlow\?navigateMobileStage\(4\):goToStep\(4\)\}/)
 assert.match(code,/disabled=\{busy\} className=\{i<=mobileStageIndex/)
 assert.match(code,/onClick=\{\(\)=>navigateMobileStage\(step\)\}/)
 assert.match(code,/gg-preview-empty/)
 assert.match(code,/if\(!selected.length\)\{setError\('Legg minst ei øving til WOD-en\.'\);return\}/)
 assert.match(code,/!mobileFlow&&wizardStep===2&&<div className="wod-selected-list"/)
 assert.match(code,/unified=\{mobileFlow\}/)
 assert.doesNotMatch(code,/mobileFlow&&wizardStep===5&&<section className="gg-sixstep-extras"/)
 assert.match(code,/save\(e,\{publishOverride:false,launchAfterSave:true\}\)/)
 assert.match(code,/if\(launchAfterSave&&savedWodId\)onLaunchWod\(savedWodId\)/)
 assert.match(code,/mobileFlow\?<section className="gg-sixstep-review"/)
 assert.match(code,/prepareLibraryWarmup\(wod\)/)
 assert.match(code,/const freshCompositeDraft=\(\)=>\[newDraftPart\(\)\]/)
 assert.match(code,/save\(e,\{publishOverride:false\}\)/)
 assert.match(code,/save\(e,\{publishOverride:true\}\)/)
 assert.match(code,/is_published:canPublishWod&&shouldPublish/)
 assert.match(code,/validateCompositeBlocks\(compositeBlocksWithItems,selected\)/)
 assert.match(code,/compositeBlockForTimer\(/)
 assert.match(code,/setParticipation\(item.value\)/)
})
test('mobile visual controls are scoped separately from Werkstatt',()=>{
 const mobileCss=readFileSync(new URL('../src/components/wod-architect.css',import.meta.url),'utf8')
 assert.match(mobileCss,/\.gg-sixstep-mobile \.gg-sixstep-formats\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.match(mobileCss,/\.gg-sixstep-mobile \.wizard-stage-actions\{position:static!important/)
 assert.match(code,/officeMode\?' gg-desktop-wod-production':' gg-sixstep-mobile'/)
})
