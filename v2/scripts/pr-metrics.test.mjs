import test from 'node:test'
import assert from 'node:assert/strict'
import {deriveBenchmarkRecords,deriveExerciseRecords,exerciseRecordType} from '../src/lib/prMetrics.js'

const workout = (id,name,sets,more = {}) => ({
  id, title:'Testøkt '+id, workout_date:`2026-11-${String(10+id).padStart(2,'0')}`,
  result_data:{prescription_level:'rx',exercise_results:[{side_mode:'right'}]},
  workout_exercises:[{exercise_id:'kb-snatch',exercise_name:name,sort_order:1,workout_sets:sets}],
  ...more
})

test('kettlebell snatch keeps load, heavy sets and training volume separate',()=>{
 const logs=[
  workout(1,'Kettlebell Snatch',[{reps:4,load_kg:20},{reps:4,load_kg:20},{reps:10,load_kg:12}]),
  workout(2,'Kettlebell Snatch',[{reps:3,load_kg:24},{reps:2,load_kg:24},{reps:10,load_kg:10}])
 ]
 const [exercise]=deriveExerciseRecords(logs)
 assert.equal(exercise.label,'Kettlebell Snatch · Høgre')
 assert.deepEqual(exercise.records.map(r=>[r.key,r.value]),[['load',24],['heavy_sets',2],['volume',280],['best_2rep',24],['best_3rep',24]])
 assert.equal(exercise.records[0].logId,2)
})

test('box jump uses height without inventing a weight PR',()=>{
 const logs=[workout(1,'Box Jump Over',[{reps:5,height_cm:50},{reps:4,height_cm:60}],{result_data:{exercise_results:[{}]}})]
 const [exercise]=deriveExerciseRecords(logs)
 assert.deepEqual(exercise.records.map(r=>r.key),['height','height_reps'])
 assert.equal(exercise.records[1].value,4)
})

test('bodyweight, holds and cardio expose different relevant measurements',()=>{
 assert.equal(exerciseRecordType('Pull-up',[{reps:10}],{}),'reps')
 assert.equal(exerciseRecordType('Plank hold',[{time_seconds:120}],{}),'hold')
 assert.equal(exerciseRecordType('Romaskin',[],{meters:500}),'endurance')
 assert.equal(exerciseRecordType('Row',[],{row_value:12,row_unit:'cal'}),'endurance')
 assert.equal(exerciseRecordType('Bent Over Row',[{reps:8,load_kg:40}],{}),'load')
})

test('hang olympic lifting stays loaded while dead hang and wall sit measure seconds',()=>{
 assert.equal(exerciseRecordType('Hang Power Clean',[{reps:3,load_kg:60}]),'load')
 assert.equal(exerciseRecordType('Hang Squat Snatch',[{reps:2,load_kg:40}]),'load')
 assert.equal(exerciseRecordType('Dead Hang',[{time_seconds:64}]),'hold')
 assert.equal(exerciseRecordType('Wall Sit',[{time_seconds:90}]),'hold')
 assert.equal(exerciseRecordType('TRX Row',[{reps:12}]),'reps')
 assert.equal(exerciseRecordType('TRX Biceps Curl',[{reps:8}]),'reps')
 assert.equal(exerciseRecordType('TRX Plank',[{time_seconds:48}]),'hold')
 const [exercise]=deriveExerciseRecords([workout(1,'Dead Hang',[{time_seconds:64}],{result_data:{exercise_results:[{}]}})])
 assert.deepEqual(exercise.records.map(r=>[r.key,r.value]),[['hold',64]])
})

test('recorded load without reps is visible but does not invent volume or heavy sets',()=>{
 const [exercise]=deriveExerciseRecords([workout(1,'Kettlebell Snatch',[{reps:null,load_kg:36}])])
 assert.deepEqual(exercise.records.map(r=>[r.key,r.value]),[['load',36]])
 assert.match(exercise.records[0].detail,/repetisjonstal manglar/)
})

test('benchmark AMRAP compares rounds then reps and separates scaled',()=>{
 const base={source_wod_id:'per-aspera',format:'AMRAP',title:'Per Aspera',result_data:{prescription_level:'rx',wod_names:['Per Aspera']}}
 const logs=[{...base,id:1,score_rounds:4,score_reps:10},{...base,id:2,score_rounds:5,score_reps:0},{...base,id:3,score_rounds:6,score_reps:2,result_data:{prescription_level:'scaled'}}]
 assert.equal(deriveBenchmarkRecords(logs).length,0) // Ordinary WODs are never automatic benchmarks
 const result=deriveBenchmarkRecords(logs,['per-aspera'])
 assert.equal(result.length,2)
 assert.equal(result.find(r=>r.level==='rx').logId,2)
 assert.equal(result.find(r=>r.level==='scaled').logId,3)
})

test('For Time ignores time-cap results and chooses fastest completed time',()=>{
 const base={source_wod_id:'wod-1',format:'For Time',title:'Baseline'}
 const logs=[{...base,id:1,score_time_seconds:200,result_data:{time_cap_reached:true}},{...base,id:2,score_time_seconds:320,result_data:{}},{...base,id:3,score_time_seconds:260,result_data:{}}]
 assert.equal(deriveBenchmarkRecords(logs,['wod-1'])[0].logId,3)
})

test('exact repetition bests exclude partner data and do not estimate missing single',()=>{const logs=[workout(1,'Back Squat',[{reps:3,load_kg:90},{reps:5,load_kg:80}]),workout(2,'Back Squat',[{reps:1,load_kg:120}],{result_data:{wod_engine:{participation:'partner'}}})];const records=deriveExerciseRecords(logs)[0].records;assert.equal(records.find(r=>r.key==='best_3rep').value,90);assert.equal(records.find(r=>r.key==='best_5rep').value,80);assert.equal(records.some(r=>r.key==='best_1rep'),false)})


const complexLog=(sets,overrides={})=>({
 id:'complex-log',title:'AMPUTATIO',workout_date:'2026-11-25',
 result_data:{exercise_results:[{exercise_name:'2 Power Clean + 1 Push Jerk',is_complex:true,complex_family:'custom',complex_steps:[{exercise_id:'pc',name:'Power Clean',reps:2},{exercise_id:'pj',name:'Push Jerk',reps:1}],sets}],...overrides},
 workout_exercises:[{exercise_name:'2 Power Clean + 1 Push Jerk',sort_order:1,workout_sets:sets.map(s=>({reps:s.reps,load_kg:s.complex_status==='complete'?s.load_kg:null}))}]
})
test('completed custom complex yields separate actual movement and sequence PRs',()=>{
 const log=complexLog([{complex_status:'complete',reps:1,load_kg:35},{complex_status:'partial',reps:null,load_kg:80},{complex_status:'failed',reps:null,load_kg:90}])
 const groups=deriveExerciseRecords([log])
 assert.equal(groups.length,3)
 const byName=name=>groups.find(g=>g.name===name).records.map(r=>[r.key,r.value])
 assert.deepEqual(byName('Power Clean'),[['load',35],['best_2rep',35]])
 assert.deepEqual(byName('Push Jerk'),[['load',35],['best_1rep',35]])
 assert.deepEqual(byName('2 Power Clean + 1 Push Jerk'),[['load',35]])
 assert.equal(groups.find(g=>g.name==='Power Clean').records[0].logId,'complex-log')
})
test('complex PR merges by catalogue ID, never turns multiple cycles into an RM',()=>{
 const log=complexLog([{complex_status:'complete',reps:3,load_kg:35}])
 const standalone=workout(2,'Power Clean',[{reps:2,load_kg:40}],{result_data:{exercise_results:[{}]},workout_exercises:[{exercise_id:'pc',exercise_name:'Power Clean',workout_sets:[{reps:2,load_kg:40}]}]})
 const groups=deriveExerciseRecords([log,standalone])
 assert.equal(groups.filter(g=>g.name==='Power Clean').length,1)
 const pc=groups.find(g=>g.name==='Power Clean').records
 assert.equal(pc.find(r=>r.key==='best_2rep').value,40)
 assert.equal(pc.some(r=>r.key==='best_5rep'||r.key==='best_1rep'),false)
 const pj=groups.find(g=>g.name==='Push Jerk').records
 assert.equal(pj.some(r=>r.key==='best_3rep'),false)
})
test('unconfirmed, completion-only, partner and stale corrected complex results fail closed',()=>{
 const sets=[{complex_status:'complete',reps:1,load_kg:35}]
 assert.equal(deriveExerciseRecords([complexLog([{reps:1,load_kg:35}])]).length,0)
 assert.equal(deriveExerciseRecords([complexLog(sets,{flow_completion_only:true})]).length,0)
 assert.equal(deriveExerciseRecords([complexLog(sets,{wod_engine:{participation:'partner'}})]).length,0)
 const corrected=complexLog(sets)
 corrected.workout_exercises[0].workout_sets[0].load_kg=30
 assert.equal(deriveExerciseRecords([corrected]).length,0)
})

test('team and completion-only records never influence personal lift metrics',()=>{
 const personal=workout(1,'Back Squat',[{reps:5,load_kg:50}],{result_data:{}})
 const team=workout(2,'Back Squat',[{reps:20,load_kg:100}],{result_data:{samspel:{team_score:true}}})
 const completed=workout(3,'Back Squat',[{reps:10,load_kg:200}],{result_data:{flow_completion_only:true}})
 assert.deepEqual(deriveExerciseRecords([personal,team,completed]),deriveExerciseRecords([personal]))
 assert.deepEqual(deriveExerciseRecords([team,completed]),[])
})
test('benchmark excludes non-Samspel team results as well',()=>{
 const base={source_wod_id:'w',format:'AMRAP',score_rounds:8,score_reps:5}
 assert.deepEqual(deriveBenchmarkRecords([{...base,result_data:{wod_engine:{participation:'team'}}}],['w']),[])
})
test('combination WOD separates AMRAP and For Time and omits unknown scoring',()=>{
 const base={source_wod_id:'w',format:'Couplet',title:'Test'}
 const logs=[{...base,id:'a',score_rounds:4,score_reps:2,result_data:{combination_mode:'AMRAP'}},{...base,id:'b',score_time_seconds:180,result_data:{combination_mode:'For Time'}},{...base,id:'c',score_time_seconds:10,result_data:{}}]
 const records=deriveBenchmarkRecords(logs,['w'])
 assert.equal(records.length,2)
 assert.equal(records.find(x=>x.key.endsWith('|amrap')).logId,'a')
 assert.equal(records.find(x=>x.key.endsWith('|for time')).logId,'b')
})

test('explicitly skipped and unknown-provenance results do not contribute to records',()=>{
 const individual=workout(1,'Back Squat',[{reps:5,load_kg:50}],{result_data:{}})
 const skipped=workout(2,'Back Squat',[{reps:5,load_kg:200}],{result_data:{exercise_results:[{exercise_name:'Back Squat',sets:[{reps:5,flow_status:'skipped'}]}]}})
 const unknown=workout(3,'Back Squat',[{reps:5,load_kg:300}],{result_data:{participation_verified:'unknown'}})
 assert.equal(deriveExerciseRecords([individual,skipped,unknown])[0].records.find(r=>r.key==='load').value,50)
})

test('unloaded movements and Pilates Swimming use actual result metrics',()=>{
 assert.equal(exerciseRecordType('Air squat',[{reps:20}]),'reps')
 assert.equal(exerciseRecordType('Pallof press',[{reps:10}]),'reps')
 assert.equal(exerciseRecordType('Single-leg glute bridge',[{reps:12}]),'reps')
 assert.equal(exerciseRecordType('Pilates Swimming',[{reps:10}]),'reps')
 assert.equal(exerciseRecordType('Pilates Swimming',[{time_seconds:30}]),'hold')
 assert.equal(exerciseRecordType('Glute bridge',[{reps:8,load_kg:20}]),'load')
 assert.equal(deriveExerciseRecords([workout(1,'Back squat',[{reps:5,load_kg:100,flow_status:'done'}])]).flatMap(x=>x.records).length,0)
 assert.deepEqual(deriveExerciseRecords([workout(1,'I-T-Y-W',[{reps:10}])]),[])
})
