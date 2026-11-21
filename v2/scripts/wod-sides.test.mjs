import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getWodSideLabel,getWodSideMode,isSideSelectableExercise} from '../src/lib/wodSides.js'

const source = path => readFileSync(new URL(path,import.meta.url),'utf8')

test('previously saved right and left KB snatches remain distinguishable',()=>{
 const right={exercise_name:'Kettlebell Snatch',levels:{rx:{reps:'4',instruction:'Høgre'}}}
 const left={exercise_name:'Kettlebell Snatch',levels:{rx:{reps:'4',instruction:'Venstr'}}}
 assert.equal(getWodSideLabel(right),'Høgre')
 assert.equal(getWodSideLabel(left),'Venstre')
 assert.equal(getWodSideMode(left),'left')
 assert.equal(getWodSideLabel({...left,side_mode:'none'}),'')
})

test('single-arm and alternating prescriptions use different labels',()=>{
 assert.equal(getWodSideLabel({side_mode:'right'}),'Høgre')
 assert.equal(getWodSideLabel({side_mode:'left'}),'Venstre')
 assert.equal(getWodSideLabel({side_mode:'both'}),'per side')
 assert.equal(getWodSideLabel({side_mode:'alternating'}),'vekslande')
 assert.ok(isSideSelectableExercise({name:'Dumbbell Snatch',equipment:'Manual'}))
 assert.ok(!isSideSelectableExercise({name:'Box Jump Over',equipment:'Plyoboks'}))
})

test('timer does not cut off later WOD movements in portrait or landscape',()=>{
 const timer=source('../src/components/Training.jsx')
 const styles=source('../src/components/timer-viewport.css')
 assert.match(timer,/const stageRows = \(isStationCircuit \? stationList : exerciseList\)\.map/)
 assert.match(timer,/\{stageRows\.map\(\(item,index\)=>/)
 assert.doesNotMatch(timer,/stageRows\.slice\(0,stageExercisePreviewLimit\)/)
 assert.doesNotMatch(styles,/gg-live-timer__exercise li:nth-child\(n\+4\)/)
 assert.match(styles,/\.gg-live-timer__context\s*\{[^}]*overflow-y:\s*auto/s)
 assert.match(timer,/getWodSideLabel\(item,prescriptionLevel\)/)
})

test('expanded WOD library card reveals every exercise and side',()=>{
 const library=source('../src/components/WodLibrary.jsx')
 const builder=source('../src/components/WodBuilder.jsx')
 assert.match(library,/expanded===w\.id\?items:items\.slice\(0,3\)/)
 assert.match(library,/getWodSideLabel\(item,level\)/)
 assert.match(builder,/side_mode:x\.sideMode===''\?'none':x\.sideMode\|\|null/)
 assert.match(builder,/isSideSelectableExercise\(exercise\)/)
})
