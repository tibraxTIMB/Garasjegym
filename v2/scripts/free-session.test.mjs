import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canSaveDurationOnlyWorkout} from '../src/lib/freeSession.js'

const src = file => readFileSync(new URL(file,import.meta.url),'utf8')

test('a real stopwatch-only session can be saved without exercise rows',()=>{
  assert.equal(canSaveDurationOnlyWorkout({format:'Fri trening',elapsedSeconds:125}),true)
  assert.equal(canSaveDurationOnlyWorkout({format:'Fri trening',elapsedSeconds:0}),false)
  assert.equal(canSaveDurationOnlyWorkout({format:'Fri trening',elapsedSeconds:-4}),false)
  assert.equal(canSaveDurationOnlyWorkout({format:'Fri trening',elapsedSeconds:NaN}),false)
  assert.equal(canSaveDurationOnlyWorkout({format:'Stoppeklokke',elapsedSeconds:60}),true)
  assert.equal(canSaveDurationOnlyWorkout({format:'Eigen økt',elapsedSeconds:30}),true)
})

test('empty WOD, group and manual entries still require exercises and results',()=>{
  for(const fields of [
    {sourceWodId:'wod-1'}, {classSessionId:'class-1'}, {manualEntry:true},
    {manualWodCount:1}, {format:'AMRAP'}
  ])assert.equal(canSaveDurationOnlyWorkout({format:'Fri trening',elapsedSeconds:100,...fields}),false)
})

test('free training opens the same full-screen timer immediately and can edit mid-session',()=>{
  const timer=src('../src/components/Training.jsx')
  const app=src('../src/App.jsx')
  assert.match(timer,/setSessionPrepared\(true\)/)
  assert.match(timer,/setTitle\(wod\?\.name \|\| 'Fri trening'\)/)
  assert.match(timer,/onEditWorkout=\{!source\?\(\)=>/)
  assert.match(timer,/visible=\{visible&&!freeEditorOpen\}/)
  assert.match(timer,/display:!source&&freeEditorOpen\?'none':undefined/)
  assert.match(timer,/<div className="training-session-workspace">\s*\{!source&&freeEditorOpen&&<section className="free-session-editor-head"/)
  assert.doesNotMatch(timer,/\{\(!sessionPrepared\|\|source\|\|manualEntry\|\|freeEditorOpen\)&&<div className="training-session-workspace">/)
  assert.match(timer,/gg-live-timer__empty-add/)
  assert.match(timer,/disabled=\{Boolean\(timerSnapshot\.hasStarted\)\}/)
  assert.match(timer,/setFreeEditorOpen\(false\)/)
  assert.match(timer,/manual-wod-picker/)
  assert.match(app,/if\(id===active\)\{if\(id==='admin'&&profile\.role==='admin'\)/)
  assert.match(app,/setAdminFocusToken\(value=>value\+1\)\}return\}/)
})

test('the atomic save migration only relaxes the guard for a real free stopwatch session',()=>{
  const sql=src('../supabase/migrations/20261122090925_allow_duration_only_free_training.sql')
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.save_workout_atomic/)
  assert.match(sql,/p_workout->>'format' in \('Fri trening', 'Stoppeklokke', 'Eigen økt'\)/)
  assert.match(sql,/p_workout->'result_data'->>'manual_entry','true'/)
  assert.match(sql,/jsonb_array_length\(coalesce\(p_workout->'result_data'->'wod_ids'/)
  assert.match(sql,/elapsed_seconds'\)::numeric,0\) >= 1/)
  assert.match(sql,/perform pg_advisory_xact_lock/)
  assert.match(sql,/height_cm/)
})
