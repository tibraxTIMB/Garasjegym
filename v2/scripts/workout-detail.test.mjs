import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeWorkoutNote,splitWorkoutNote,formatWorkoutSeconds,formatWorkoutSet,optionalNumber} from '../src/lib/workoutDetail.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('saved literal newline sequences display as real note paragraphs',()=>{
 const raw='Jamn intensitet · teknisk kvalitet\\nTimer: AMRAP · 04:00 · FERDIG\\nMellomtider: 1: 00:02, 2: 00:03'
 assert.equal(normalizeWorkoutNote(raw).split('\n').length,3)
 assert.deepEqual(splitWorkoutNote(raw),{
  personal:'Jamn intensitet · teknisk kvalitet',
  system:['Timer: AMRAP · 04:00 · FERDIG','Mellomtider: 1: 00:02, 2: 00:03']
 })
})

test('exercise result formatting includes height and keeps missing measurements hidden',()=>{
 assert.equal(formatWorkoutSet({reps:4,load_kg:24,height_cm:null,time_text:null,time_seconds:null}),'4 reps · 24 kg')
 assert.equal(formatWorkoutSet({reps:4,load_kg:null,height_cm:60,time_text:null,time_seconds:null}),'4 reps · 60 cm')
 assert.equal(formatWorkoutSet({reps:null,load_kg:null,height_cm:null,time_text:null,time_seconds:125}),'02:05')
 assert.equal(formatWorkoutSeconds(13),'00:13')
})

test('optional result fields accept empty input and refuse negative or invalid numbers',()=>{
 assert.equal(optionalNumber(''),null)
 assert.equal(optionalNumber('12,5'),12.5)
 assert.throws(()=>optionalNumber('-1'))
 assert.throws(()=>optionalNumber('abc'))
})

test('workout dialog keeps history read-only, with notes and corrections behind a menu',()=>{
 const component=read('../src/components/WorkoutDetail.jsx')
 const app=read('../src/App.jsx')
 const styles=read('../src/components/workout-detail.css')
 assert.match(component,/> Tilbake<\/button>/)
 assert.match(component,/Fleire val for økta/)
 assert.match(component,/Rediger notat/)
 assert.match(component,/Korriger feil i resultat/)
 assert.match(component,/editMode==='note'\?\[\]:exercises\.flatMap/)
 assert.match(component,/Lagre endringar/)
 assert.match(component,/\.eq\('member_id',memberId\)/)
 assert.match(component,/from\('workout_sets'\)\.update/)
 assert.match(app,/workout_sets\(id,set_number,reps,load_kg,height_cm,time_text,time_seconds\)/)
 assert.match(app,/<WorkoutDetail workout=\{selectedWorkout\}/)
 assert.match(app,/navigateTo\('mi-historikk'\)/)
 assert.match(styles, /@media\(max-width:660px\)/)
})
