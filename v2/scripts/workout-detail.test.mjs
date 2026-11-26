import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeWorkoutNote,splitWorkoutNote,formatWorkoutSeconds,formatWorkoutSet,optionalNumber,buildWorkoutReport,reportRepTotals} from '../src/lib/workoutDetail.js'

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

test('ACTA assigns AMRAP to its saved part and calculates only fixed ordered repetitions',()=>{
 const parts=[{id:'a',title:'Oppvarming',warm:true,items:[]},{id:'e',title:'AMRAP',format:'AMRAP',items:[{exercise_name:'Double DB Hang Squat Clean',levels:{rx:{reps:4}}},{exercise_name:'Broad Jump',levels:{rx:{reps:2}}}]}]
 const workout={score_rounds:4,score_reps:3,exercises:[{id:'x',exercise_name:'Double DB Hang Squat Clean',workout_sets:[]}],result_data:{prescription_level:'rx',flow_completion:[{id:'a',status:'done'}],block_summary:[{id:'e',format:'AMRAP',roundsCompleted:4,extra_reps:3}],exercise_results:[{block_id:'e',exercise_name:'Double DB Hang Squat Clean'}]}}
 const report=buildWorkoutReport(workout,parts)
 assert.equal(report.showOverall,false)
 assert.equal(report.sections[0].status.status,'done')
 assert.equal(report.sections[1].rows[0].id,'x')
 assert.deepEqual(reportRepTotals(report.sections[1],report.sections[1].score,'rx').map(x=>x.reps),[19,8])
 assert.equal(reportRepTotals(report.sections[1],{roundsCompleted:4,extra_reps:6},'rx'),null)
 assert.equal(reportRepTotals(report.sections[1],report.sections[1].score,null),null)
 assert.equal(reportRepTotals({items:[{reps:4,is_complex:true}]},report.sections[1].score,'rx'),null)
 const ambiguous=buildWorkoutReport({...workout,result_data:{...workout.result_data,block_summary:[]}},[...parts,{id:'f',format:'AMRAP',items:[]}])
 assert.equal(ambiguous.showOverall,true)
 assert.equal(ambiguous.sections[1].score,null)
})
test('Android Back stays within the app; quick menu has a visible and long-press entry',()=>{
 const app=read('../src/App.jsx'), nav=read('../src/components/AppMobileNavigation.jsx'),detail=read('../src/components/WorkoutDetail.jsx')
 assert.match(app,/ggBackGuard/)
 assert.match(app,/addEventListener\('popstate',onPop\)/)
 assert.match(app,/gg:workout-back/)
 assert.match(app,/Opna hurtigmeny/)
 assert.match(app,/timerSnapshot.sessionOpen/)
 assert.match(nav,/onPointerDown=/)
 assert.match(nav,/550/)
 assert.match(nav,/long.current=false;return/)
 assert.match(detail,/gg:workout-back/)
})

import {suggestedEmomSets} from '../src/lib/workoutCorrections.js'
test('Samspel never receives inferred individual EMOM correction sets',()=>{
 const schema={duration_seconds:600,interval:{work_every_seconds:60},items:[{exercise_name:'Squat',reps:5}]}
 const log={format:'EMOM',result_data:{completed:true,samspel:{main_track:'double_emom'}}}
 assert.equal(suggestedEmomSets(log,schema,{exercise_name:'Squat'},0),null)
 assert.match(read('../src/components/WorkoutDetail.jsx'),/Lagresultat krev eiga korrigering av utøvarbidrag/)
 assert.match(read('../src/components/WorkoutDetail.jsx'),/const report=isSamspel\?null:/)
})

import {samspelCorrectionDraft,samspelCorrectionPatch} from '../src/lib/workoutCorrections.js'
test('team corrections preserve identity, clock and completion and refuse inconsistent plan state',()=>{
 const original={id:'w',score_rounds:3,result_data:{completed:true,elapsed_seconds:600,samspel:{version:2,mode:'parallel_round_swap',main_track:'relay',participant_count:2,switch_rule:'manual',individual_scores:true,participant_results:[{slot:1,rounds:1,extra_reps:0},{slot:2,rounds:2,extra_reps:0}]}}}
 const draft=samspelCorrectionDraft(original)
 assert.equal(draft[1].rounds,'1')
 draft[1].rounds='3'
 const {patch}=samspelCorrectionPatch(original,draft)
 assert.equal(patch.score_rounds,5)
 assert.equal(patch.result_data.completed_rounds,5)
 assert.equal(patch.result_data.elapsed_seconds,600)
 assert.equal(original.score_rounds,3)
 assert.equal(patch.result_data.samspel.participant_results[0].rounds,3)
 assert.ok(samspelCorrectionPatch(original,{...draft,2:{rounds:'',reps:'0'}}).issue)
 const recovery={result_data:{completed:true,samspel:{version:2,mode:'parallel_round_swap',main_track:'recovery',participant_count:2,switch_rule:'fixed',duration_seconds:600,individual_scores:true,participant_results:[{slot:1,quality_status:'done'},{slot:2,quality_status:'done'}]}}}
 assert.ok(samspelCorrectionPatch(recovery,{1:{quality:'partial'},2:{quality:'done'}}).issue)
 assert.ok(samspelCorrectionPatch(recovery,samspelCorrectionDraft(recovery)).patch)
 assert.match(read('../src/components/WorkoutDetail.jsx'),/\.eq\('result_data',JSON\.stringify\(workout\.result_data\)\)/)
})
