import assert from 'node:assert/strict'
import {previousExerciseResult,previousExerciseReferences,ownPreviousLogs} from '../src/lib/previousResult.js'
const logs=[{workout_date:'2026-11-24',workout_exercises:[{exercise_id:'bench',exercise_name:'Bench Press',workout_sets:[{reps:6,load_kg:50}]},{exercise_id:'row',exercise_name:'Row',workout_sets:[{time_seconds:30}]}]}]
const item={exercise_id:'bench',exercise_name:'Bench Press'}
assert.deepEqual(previousExerciseResult(logs,item),{date:'2026-11-24',summary:'6 reps × 50 kg'})
assert.equal(previousExerciseResult(logs,{exercise_id:'other',exercise_name:'Bench Press'}),null)
assert.equal(previousExerciseResult(logs,{exercise_name:' bench press '}).summary,'6 reps × 50 kg')
assert.deepEqual(previousExerciseReferences(logs,[item,item,{exercise_name:'Pause',is_rest:true},{exercise_id:'row',name:'Row'}]).map(x=>x.key),['id:bench','id:row'])
assert.equal(previousExerciseReferences(logs,[{exercise_name:'Unknown'}]).length,0)
assert.deepEqual(ownPreviousLogs({memberId:'a',logs},'b'),[])
assert.deepEqual(ownPreviousLogs({memberId:'a',logs},'a'),logs)
assert.deepEqual(ownPreviousLogs(null,'a'),[])
assert.deepEqual(ownPreviousLogs({memberId:'a',logs},''),[])
console.log('9 previous result preparation checks passed')

const contaminated=[{...logs[0],result_data:{samspel:{team_score:true}},workout_date:'2026-11-25'},{...logs[0],result_data:{participation_verified:'unknown'}},{...logs[0],result_data:{exercise_results:[{exercise_name:'Bench Press',sets:[{flow_status:'skipped'}]}]}},...logs]
assert.deepEqual(previousExerciseResult(contaminated,item),previousExerciseResult(logs,item))
assert.equal(previousExerciseResult([{workout_exercises:[{exercise_id:'bench',exercise_name:'Bench Press',workout_sets:[{load_kg:200}]}]}],item),null)

const sided=(side,kg,date)=>({workout_date:date,workout_exercises:[{exercise_id:'snatch',exercise_name:'Kettlebell Snatch',sort_order:1,workout_sets:[{reps:4,load_kg:kg}]}],result_data:{exercise_results:[{exercise_name:'Kettlebell Snatch',side_mode:side}]}})
const sideLogs=[sided('left',12,'2026-11-26'),sided('right',16,'2026-11-25')]
const right={exercise_id:'snatch',exercise_name:'Kettlebell Snatch',side_mode:'right'}
const left={...right,side_mode:'left'}
assert.equal(previousExerciseResult(sideLogs,right).summary,'4 reps × 16 kg')
assert.equal(previousExerciseResult(sideLogs,left).summary,'4 reps × 12 kg')
assert.equal(previousExerciseResult(sideLogs,{...right,side_mode:'both'}),null)
assert.equal(previousExerciseResult(sideLogs,{...right,side_mode:'none'}),null)
assert.deepEqual(previousExerciseReferences(sideLogs,[right,left]).map(x=>x.key),['id:snatch|right','id:snatch|left'])
assert.equal(previousExerciseResult([{workout_exercises:[{exercise_id:'bench',exercise_name:'Bench Press',workout_sets:[{reps:5,load_kg:80,flow_status:'done'}]}]}],item),null)
console.log('6 side-aware and completion-only checks passed')
