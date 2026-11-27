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


import {engineSwapConfig} from '../src/lib/samspel.js'
import {samspelCorrectionFields} from '../src/lib/workoutCorrections.js'
test('composite Engine Swap corrections preserve clock, other parts and linked completion',()=>{
 const config={...engineSwapConfig(60,600),metric:'calories',team_score:true,participant_results:[{slot:1,completed_intervals:5,erg_value:40},{slot:2,completed_intervals:5,erg_value:30}]}
 const engine={block_id:'engine',title:'Del B',samspel:config,elapsed:600,completed:true,distance:null,calories:70}
 const other={block_id:'quality',title:'Del 0',completed:true}
 const log={id:'w',score_rounds:9,result_data:{completed:true,elapsed_seconds:900,manual_entry:false,assignment_id:'pt',samspel_blocks:[other,engine],block_summary:[{id:'quality',completed:true},{id:'engine',format:'EMOM',elapsed:600,completed:true,samspel:config,calories:70}],block_results:{1:{elapsed:600}}}}
 const draft=samspelCorrectionDraft(log),key=JSON.stringify(['engine',1])
 assert.equal(samspelCorrectionFields(log).length,4)
 assert.equal(samspelCorrectionFields(log)[0].groupLabel,'Del B · Utøvar 1')
 assert.equal(draft[key].erg,'40')
 const changed={...draft,[key]:{...draft[key],erg:'50'}}
 const {patch}=samspelCorrectionPatch(log,changed)
 assert.equal(patch.result_data.samspel_blocks[1].calories,80)
 assert.equal(patch.result_data.block_summary[1].calories,80)
 assert.equal(patch.result_data.block_summary[1].samspel.participant_results[0].erg_value,50)
 assert.equal(patch.result_data.samspel_blocks[0],other)
 assert.equal(patch.result_data.block_results,log.result_data.block_results)
 assert.equal(patch.result_data.assignment_id,'pt')
 assert.equal(patch.result_data.elapsed_seconds,900)
 assert.equal(patch.result_data.completed,true)
 assert.equal(patch.score_rounds,undefined)
 assert.equal(log.result_data.samspel_blocks[1].calories,70)
 assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{...draft[key],intervals:'4'}}).issue)
 assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{...draft[key],erg:''}}).issue)
 assert.ok(samspelCorrectionPatch({...log,result_data:{...log.result_data,block_summary:[]}},draft).issue)
 const partialConfig={...config,participant_results:[{slot:1,completed_intervals:0,erg_value:20},{slot:2,completed_intervals:1,erg_value:0}]}
 const partial={...log,result_data:{...log.result_data,completed:false,samspel_blocks:[{...engine,elapsed:60,completed:false,samspel:partialConfig}],block_summary:[{id:'engine',completed:false,samspel:partialConfig,elapsed:60}]}}
 const pd=samspelCorrectionDraft(partial),k2=JSON.stringify(['engine',2])
 assert.ok(samspelCorrectionPatch(partial,pd).patch)
 assert.ok(samspelCorrectionPatch(partial,{...pd,[k2]:{...pd[k2],erg:'1'}}).issue)
})


import {doubleEmomConfig} from '../src/lib/samspel.js'
test('composite Double EMOM corrections keep separate tracks and historical clock',()=>{
 for(const rule of ['fixed','time']){
  const config={...doubleEmomConfig(60,600),switch_rule:rule,tracks:['Push-up','Air squat'],team_score:true,participant_results:[{slot:1,track_a_intervals:1,track_b_intervals:0},{slot:2,track_a_intervals:0,track_b_intervals:1}]}
  const part={block_id:'double',title:'Del B',samspel:config,elapsed:60,completed:false,distance:null,calories:null}
  const other={block_id:'quality',completed:true}
  const log={score_rounds:7,result_data:{completed:false,elapsed_seconds:300,manual_entry:false,assignment_id:'pt',samspel_blocks:[other,part],block_summary:[{id:'quality',completed:true},{id:'double',elapsed:60,completed:false,samspel:config}],block_results:{1:{elapsed:60}}}}
  const draft=samspelCorrectionDraft(log),key=JSON.stringify(['double',1])
  assert.equal(samspelCorrectionFields(log).length,4)
  assert.equal(samspelCorrectionFields(log)[0].label,'Spor A · Push-up')
  assert.equal(draft[key].trackA,'1')
  const changed={...draft,[key]:{...draft[key],trackA:'0'}}
  const {patch}=samspelCorrectionPatch(log,changed)
  assert.equal(patch.result_data.samspel_blocks[1].samspel.participant_results[0].track_a_intervals,0)
  assert.equal(patch.result_data.block_summary[1].samspel.participant_results[0].track_a_intervals,0)
  assert.equal(patch.result_data.samspel_blocks[0],other)
  assert.equal(patch.result_data.block_results,log.result_data.block_results)
  assert.equal(patch.result_data.assignment_id,'pt')
  assert.equal(patch.result_data.completed,false)
  assert.equal(patch.score_rounds,undefined)
  assert.equal(config.participant_results[0].track_a_intervals,1)
  assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{...draft[key],trackB:'1'}}).issue)
  assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{...draft[key],trackA:''}}).issue)
  for(const altered of [{elapsed:120},{samspel:{...config,tracks:['Air squat','Push-up']}},{samspel:{...config,switch_rule:rule==='fixed'?'time':'fixed'}}]){
   const conflict={...log,result_data:{...log.result_data,block_summary:[log.result_data.block_summary[0],{...log.result_data.block_summary[1],...altered}]}}
   assert.equal(samspelCorrectionFields(conflict).length,0)
   assert.ok(samspelCorrectionPatch(conflict,draft).issue)
  }
 }
})


import {ironTwinsConfig} from '../src/lib/samspel.js'
test('composite Iron Twins corrections retain separate sets and historical evidence',()=>{
 const config={...ironTwinsConfig(),exercise_name:'Bench press',planned_sets:2,duration_seconds:720,team_score:true,participant_results:[{slot:1,exercise_name:'Bench press',strength_sets:[{set_number:1,reps:5,load_kg:50,rir:2},{set_number:2,reps:5,load_kg:55,rir:null}]},{slot:2,exercise_name:'Bench press',strength_sets:[{set_number:1,reps:5,load_kg:40,rir:3}]}]}
 const part={block_id:'iron',title:'Del B',samspel:config,elapsed:300,completed:false,distance:null,calories:null}
 const other={block_id:'quality',completed:true}
 const log={score_load_kg:null,result_data:{completed:false,elapsed_seconds:400,assignment_id:'pt',samspel_blocks:[other,part],block_summary:[{id:'quality',completed:true},{id:'iron',format:'Strength',elapsed:300,completed:false,samspel:config}],block_results:{1:{elapsed:300}}}}
 const draft=samspelCorrectionDraft(log),key=JSON.stringify(['iron',1]),key2=JSON.stringify(['iron',2])
 assert.equal(samspelCorrectionFields(log).length,12)
 assert.equal(draft[key]['load-0'],'50')
 assert.equal(draft[key]['rir-1'],'')
 const changed={...draft,[key]:{...draft[key],'load-0':'52.5','rir-0':'1'}}
 const {patch}=samspelCorrectionPatch(log,changed)
 assert.equal(patch.result_data.samspel_blocks[1].samspel.participant_results[0].strength_sets[0].load_kg,52.5)
 assert.equal(patch.result_data.block_summary[1].samspel.participant_results[0].strength_sets[0].rir,1)
 assert.equal(patch.result_data.samspel_blocks[1].samspel.participant_results[1].strength_sets.length,1)
 assert.equal(patch.result_data.samspel_blocks[0],other)
 assert.equal(patch.result_data.block_results,log.result_data.block_results)
 assert.equal(patch.result_data.assignment_id,'pt')
 assert.equal(patch.result_data.completed,false)
 assert.equal(patch.score_load_kg,undefined)
 assert.equal(config.participant_results[0].strength_sets[0].load_kg,50)
 assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{...draft[key],'rir-0':'11'}}).issue)
 assert.ok(samspelCorrectionPatch(log,{...draft,[key2]:{...draft[key2],'reps-1':'5','load-1':'40'}}).issue)
 assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{...draft[key],'load-0':''}}).issue)
 for(const altered of [{elapsed:301},{samspel:{...config,exercise_name:'Squat'}},{samspel:{...config,planned_sets:3}}]){
  const conflict={...log,result_data:{...log.result_data,block_summary:[log.result_data.block_summary[0],{...log.result_data.block_summary[1],...altered}]}}
  assert.equal(samspelCorrectionFields(conflict).length,0)
  assert.ok(samspelCorrectionPatch(conflict,draft).issue)
 }
 const zero={...log,result_data:{...log.result_data,samspel_blocks:[{...part,elapsed:0}],block_summary:[{id:'iron',completed:false,elapsed:0,samspel:config}]}}
 assert.ok(samspelCorrectionPatch(zero,samspelCorrectionDraft(zero)).issue)
 const manual={...zero,result_data:{...zero.result_data,manual_entry:true}}
 assert.ok(samspelCorrectionPatch(manual,samspelCorrectionDraft(manual)).patch)
})


import {youGoIGoConfig} from '../src/lib/samspel.js'
test('composite relay correction preserves time, swaps and independent extra reps',()=>{
 for(let count=2;count<=8;count++){
  const config={...youGoIGoConfig(),participant_count:count,duration_seconds:600,team_score:true,manual_swaps:[20,60],participant_results:Array.from({length:count},(_,i)=>({slot:i+1,rounds:2,extra_reps:i}))}
  const part={block_id:'relay',title:'Del B',samspel:config,elapsed:200,completed:false,relay_rounds:count*2,distance:null,calories:null}
  const other={block_id:'quality',completed:true}
  const log={score_rounds:9,result_data:{completed:false,elapsed_seconds:300,assignment_id:'pt',samspel_blocks:[other,part],block_summary:[{id:'quality',completed:true},{id:'relay',format:'AMRAP',elapsed:200,completed:false,samspel:config,relay_rounds:count*2,roundsCompleted:null,extra_reps:null}],block_results:{1:{elapsed:200,samspel_swaps:[20,60]}}}}
  const draft=samspelCorrectionDraft(log),key=JSON.stringify(['relay',1])
  assert.equal(samspelCorrectionFields(log).length,count*2)
  assert.equal(draft[key].rounds,'2')
  const changed={...draft,[key]:{rounds:'3',reps:'7'}}
  const {patch}=samspelCorrectionPatch(log,changed)
  assert.equal(patch.result_data.samspel_blocks[1].relay_rounds,count*2+1)
  assert.equal(patch.result_data.block_summary[1].relay_rounds,count*2+1)
  assert.equal(patch.result_data.samspel_blocks[1].samspel.participant_results[0].extra_reps,7)
  assert.equal(patch.result_data.samspel_blocks[1].samspel.manual_swaps,config.manual_swaps)
  assert.equal(patch.result_data.samspel_blocks[0],other)
  assert.equal(patch.result_data.block_results,log.result_data.block_results)
  assert.equal(patch.result_data.assignment_id,'pt')
  assert.equal(patch.result_data.completed,false)
  assert.equal(patch.score_rounds,undefined)
  assert.equal(patch.result_data.block_summary[1].extra_reps,null)
  assert.equal(part.relay_rounds,count*2)
  assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{rounds:'',reps:'0'}}).issue)
  assert.ok(samspelCorrectionPatch(log,{...draft,[key]:{rounds:'9007199254740991',reps:'0'}}).issue)
  const conflict={...log,result_data:{...log.result_data,block_summary:[log.result_data.block_summary[0],{...log.result_data.block_summary[1],relay_rounds:99}]}}
  assert.equal(samspelCorrectionFields(conflict).length,0)
  assert.ok(samspelCorrectionPatch(conflict,draft).issue)
  const manual={...log,result_data:{...log.result_data,manual_entry:true,samspel_blocks:[{...part,completed:true,elapsed:null}],block_summary:[{id:'relay',completed:true,elapsed:null,samspel:config,relay_rounds:count*2}]}}
  assert.equal(samspelCorrectionPatch(manual,samspelCorrectionDraft(manual)).patch.result_data.samspel_blocks[0].completed,true)
 }
})
