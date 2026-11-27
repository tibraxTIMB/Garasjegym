import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getWodSideLabel,getWodSideMode,isSideSelectableExercise} from '../src/lib/wodSides.js'
import {cardParts,cardDose} from '../src/lib/wodCard.js'

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
 assert.match(timer,/const activePrescription=pairedSlot&&ACTIVE_WOD_LEVELS\.some/)
 assert.match(timer,/getWodSideLabel\(item,activePrescription\)/)
 const item={exercise_name:'Kettlebell Snatch',levels:{rx:{instruction:'Høgre'},scaled:{instruction:'Venstre'},foundation:{instruction:'vekslande'}}}
 assert.equal(getWodSideLabel(item,'rx'),'Høgre')
 assert.equal(getWodSideLabel(item,'scaled'),'Venstre')
 assert.equal(getWodSideLabel(item,'foundation'),'vekslande')
})

test('standalone WOD card reveals every exercise and side',()=>{
 const library=source('../src/components/WodLibrary.jsx')
 const builder=source('../src/components/WodBuilder.jsx')
 assert.match(library,/<WodCard key=\{expanded\}/)
 assert.match(source('../src/components/WodCard.jsx'),/part\.items\.map/)
 const items=Array.from({length:6},(_,i)=>({exercise_name:'Kettlebell Snatch',side_mode:i===5?'left':'right',reps:4}))
 const card=cardParts({format:'AMRAP',timer_settings:{workout_schema:{items}}})
 assert.equal(card[0].items.length,6)
 assert.match(cardDose(card[0].items[5]),/Venstre/)
 assert.match(library,/getWodSideLabel\(item,level\)/)
 assert.match(builder,/side_mode:x\.sideMode===''\?'none':x\.sideMode\|\|null/)
 assert.match(builder,/isSideSelectableExercise\(exercise\)/)
})

test('alternating dumbbell push jerk allows side-aware total repetitions',()=>{
 assert.ok(isSideSelectableExercise({name:'Alternating Dumbbell Push Jerk',equipment:'Manualar'}))
 const builder=source('../src/components/WodBuilder.jsx')
 assert.match(builder,/sideMode:\/\\balternating\\b\/i\.test\(ex\.name/)
 assert.match(builder,/carry\|walk\|run\|crawl/)
})
