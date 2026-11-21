import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dialValueFromPoint, clampWodDuration, wodFormatNeedsTime } from '../src/lib/wodTimeDial.js'

const code = readFileSync(new URL('../src/components/WodBuilder.jsx', import.meta.url), 'utf8')
const dial = readFileSync(new URL('../src/components/WodTimeDial.jsx', import.meta.url), 'utf8')

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
  assert.match(code, /setWizardStep\(wodFormatNeedsTime\(item\)\?1:2\)/)
  assert.match(code, /wizardStep===0&&<section className="gg-format-wizard"/)
  assert.match(code, /wizardStep===1&&<div className="wizard-stage-actions gg-time-next"/)
  assert.match(code, /wizardStep===2&&!libraryOpen&&<div className="wizard-selected-stage"/)
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

test('dose levels and three box heights remain directly editable', () => {
  assert.match(code, /\['rx','scaled','foundation'\]\.map\(level=>/)
  assert.match(code, /\[50,60,75\]\.map\(n=>/)
  assert.match(code, /updateLevel\(exercise\.key,level,patch\)/)
  assert.match(code, /loadMode:'kg',loadKgMen/)
  assert.match(code, /loadMode:'kg',loadKgWomen/)
  assert.match(dial, /onPointerDown/)
  assert.match(dial, /onKeyDown/)
})
