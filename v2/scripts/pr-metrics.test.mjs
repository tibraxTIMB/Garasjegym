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
 assert.deepEqual(exercise.records.map(r=>[r.key,r.value]),[['load',24],['heavy_sets',2],['volume',280]])
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
