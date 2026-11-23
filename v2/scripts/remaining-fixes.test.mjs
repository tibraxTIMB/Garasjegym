import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {prepareLibraryWodPart,equivalentLibraryWodSource} from '../src/lib/compositeLibrary.js'
import {suggestedEmomSets} from '../src/lib/workoutCorrections.js'
import {deriveBenchmarkRecords} from '../src/lib/prMetrics.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('a source WOD can be reused as a part without modifying its library prescription',()=>{
 const original={
  id:'original',name:'Press E3MOM',format:'E3MOM',duration_minutes:9,
  timer_settings:{workout_schema:{version:6,duration_seconds:540,library_category:'benchmark',
   interval:{work_every_seconds:180},items:[
    {exercise_name:'Strict press',reps:5,levels:{rx:{reps:'5',loadMode:'kg',loadKgMen:'20'}}},
    {exercise_name:'Push Press',reps:3,levels:{rx:{reps:'3',loadMode:'kg',loadKgMen:'30'}}}
   ]}}
 }
 const before=JSON.stringify(original)
 const {block,items}=prepareLibraryWodPart(original,{id:'a',title:'Del A',format:'AMRAP',minutes:10})
 assert.equal(block.format,'EMOM')
 assert.equal(block.emomIntervalSeconds,180)
 assert.equal(block.source_wod_id,'original')
 assert.equal(items.length,2)
 assert.equal(block.source_wod_snapshot.version,6)
 assert.equal(equivalentLibraryWodSource({...block,duration_seconds:540,items}),original.id)
 assert.equal(JSON.stringify(original),before)
 assert.equal(equivalentLibraryWodSource({...block,duration_seconds:540,items:[{...items[0],levels:{rx:{reps:'7'}}},items[1]]}),null)
 assert.equal(equivalentLibraryWodSource({...block,format:'AMRAP',duration_seconds:540,items}),null)
 assert.equal(equivalentLibraryWodSource({...block,duration_seconds:600,items}),null)
})

test('old Mancave E3MOM proposes three prescribed sets only if this part was completed',()=>{
 const schema={prescription:'rx',composite_blocks:[
  {id:'a',format:'E3MOM',duration_seconds:540},{id:'b',format:'AMRAP',duration_seconds:480}
 ],items:[
  {exercise_name:'Strict press',block_id:'a',reps:5,levels:{rx:{reps:'5'}}},
  {exercise_name:'Push Press',block_id:'a',reps:3,levels:{rx:{reps:'3'}}},
  {exercise_name:'Burpee',block_id:'b',reps:8,levels:{rx:{reps:'8'}}},
 ]}
 const workout={format:'Samansett økt',result_data:{prescription_level:'rx',block_summary:[{id:'a',completed:true},{id:'b',completed:true}]}}
 assert.deepEqual(suggestedEmomSets(workout,schema,{exercise_name:'Strict press'},0),{count:3,reps:5})
 assert.deepEqual(suggestedEmomSets(workout,schema,{exercise_name:'Push Press'},1),{count:3,reps:3})
 assert.equal(suggestedEmomSets(workout,schema,{exercise_name:'Burpee'},2),null)
 const incomplete={...workout,result_data:{...workout.result_data,block_summary:[{id:'a',completed:false}]}}
 assert.equal(suggestedEmomSets(incomplete,schema,{exercise_name:'Strict press'},0),null)
})

test('independent EMOMs with rotating work use actual slot counts',()=>{
 const schema={duration_seconds:600,interval:{work_every_seconds:60},items:[
  {exercise_name:'Strict press',reps:5,levels:{rx:{reps:'5'}}},
  {exercise_name:'Push Press',reps:3,levels:{rx:{reps:'3'}}},
 ]}
 const workout={format:'EMOM',result_data:{completed:true,prescription_level:'rx'}}
 assert.deepEqual(suggestedEmomSets(workout,schema,{exercise_name:'Strict press'},0),{count:5,reps:5})
 assert.deepEqual(suggestedEmomSets(workout,schema,{exercise_name:'Push Press'},1),{count:5,reps:3})
})

test('benchmark sub-WOD contributes only if source is eligible and unchanged',()=>{
 const logs=[
  {id:'composite-1',source_wod_id:'standard',format:'Samansett økt',workout_date:'2026-11-23',
   result_data:{prescription_level:'rx',block_summary:[{
    id:'b',title:'Del B',format:'AMRAP',completed:true,roundsCompleted:6,extra_reps:1,elapsed:480,
    benchmark_source_wod_id:'benchmark-a',source_wod_name:'Klassisk AMRAP'
   }]}},
  {id:'single',source_wod_id:'benchmark-a',format:'AMRAP',score_rounds:5,score_reps:9,workout_date:'2026-11-22',result_data:{prescription_level:'rx'}}
 ]
 assert.equal(deriveBenchmarkRecords(logs).length,0)
 const results=deriveBenchmarkRecords(logs,['benchmark-a'])
 assert.equal(results.length,1)
 assert.equal(results[0].score.rounds,6)
 assert.equal(results[0].count,2)
 assert.equal(deriveBenchmarkRecords([{...logs[0],result_data:{...logs[0].result_data,block_summary:[{...logs[0].result_data.block_summary[0],benchmark_source_wod_id:null}]}}],['benchmark-a']).length,0)
})

test('WOD removal never needs cross-table checks to archive',()=>{
 const src=read('../src/components/WodLibrary.jsx')
 const action=src.slice(src.indexOf('async function removeWod'),src.indexOf('function toggleSession'))
 assert.match(action,/if\(permanent\)\{/)
 assert.match(action,/update\(\{is_archived:true,is_published:false\}\)/)
 assert.match(action,/select\('id'\)\.maybeSingle\(\)/)
 assert.match(src,/Slett permanent \(ubrukt\)/)
 assert.match(src,/Fjern frå biblioteket/)
})

test('log editing exposes new sets for every movement; historical log updates are opt-in',()=>{
 const src=read('../src/components/WorkoutDetail.jsx')
 assert.match(src,/addedSets\[exercise.id\]/)
 assert.match(src,/Legg til sett/)
 assert.match(src,/from\('workout_sets'\)\.insert\(newValues\)/)
 assert.match(src,/Hent planlagde EMOM-sett og reps/)
 assert.match(src,/window\.confirm\('Leggja inn planlagde sett/)
})

test('timer cues are independently adjustable without muting Spotify',()=>{
 const src=read('../src/components/Training.jsx')
 assert.match(src,/garasjegym\.timer\.sound_volume/)
 assert.match(src,/raw!=null/)
 assert.match(src,/oscillator\.type = 'triangle'/)
 assert.match(src,/Test lydsignal/)
 assert.match(src,/0\.65\*volumeRef\.current\/100/)
})
