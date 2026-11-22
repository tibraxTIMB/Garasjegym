import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {STANDARD_PR_LIFTS, buildPRDirectory, bestLoad, primaryPR, defaultPRUnit, isValidManualPR} from '../src/lib/prDirectory.js'
const source = path => readFileSync(new URL(path,import.meta.url),'utf8')

test('seven standard lifts exist even before the first workout', () => {
  assert.equal(STANDARD_PR_LIFTS.length, 7)
  const directory = buildPRDirectory()
  assert.equal(directory.length, 7)
  assert.ok(directory.some(item => item.name === 'Bench press'))
  assert.ok(directory.some(item => item.name === 'Clean and Jerk'))
})

test('manual and session-derived PRs share the same clickable exercise', () => {
  const directory = buildPRDirectory([{name:'Kettlebell Snatch'}],[{name:'Kettlebell Snatch',side:'right',type:'load',sessions:1,records:[{unit:'kg',value:24}]}],[{id:'manual',exercise_name:'Kettlebell Snatch · Høgre',result:'28',unit:'kg'}])
  const snatch = directory.find(item => item.name === 'Kettlebell Snatch')
  assert.equal(snatch.derived.length, 1)
  assert.equal(snatch.saved.length, 1)
  assert.equal(bestLoad(snatch), 28)
  assert.deepEqual(primaryPR(snatch), {value:28,unit:'kg'})
})

test('measurement defaults adapt to strength, height, holds and endurance', () => {
  assert.equal(defaultPRUnit('load'), 'kg')
  assert.equal(defaultPRUnit('height'), 'cm')
  assert.equal(defaultPRUnit('hold'), 'sek')
  assert.equal(defaultPRUnit('endurance'), 'meter')
  assert.equal(isValidManualPR({exerciseName:'Dead Hang',result:62,unit:'sek'}), true)
  assert.equal(isValidManualPR({exerciseName:'Dead Hang',result:0,unit:'sek'}), false)
  assert.equal(isValidManualPR({exerciseName:'Dead Hang',result:62,unit:'invalid'}), false)
})

test('manual PR save and deletion are authenticated and update the member screen', () => {
  const center = source('../src/components/ExercisePRCenter.jsx')
  const page = source('../src/components/MyPage.jsx')
  assert.match(center, /supabase\.auth\.getUser\(\)/)
  assert.match(center, /\.from\('personal_records'\)\.insert\(/)
  assert.match(center, /\.from\('personal_records'\)\.delete\(\)\.eq\('id', record\.id\)\.eq\('member_id', user\.id\)/)
  assert.match(center, /setSelectedKey\(key\)/)
  assert.match(page, /onRecordAdded=\{record=>setPrs\(/)
  assert.match(page, /onRecordDeleted=\{recordId=>setPrs\(/)
})

test('duplicate kettlebell deadlifts are hidden, never the kettlebell snatch', () => {
  const migration = source('../../supabase/migrations/20261122014000_hide_duplicate_kettlebell_deadlift.sql')
  assert.match(migration, /Kettlebell Deadlift \/ Markløft/)
  assert.match(migration, /Kettlebell markløft/)
  assert.doesNotMatch(migration, /WHERE name IN[^;]*'Kettlebell Snatch'/)
})
