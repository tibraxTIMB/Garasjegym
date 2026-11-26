import assert from 'node:assert/strict'
import {anatomyForExercise,summarizeMuscleExposure,MUSCLES,documentedExerciseRows,muscleExerciseEvidence,historyAnatomyExercises} from '../src/lib/anatomicalIntelligence.js'
assert.equal(MUSCLES.length,20)
assert.equal(anatomyForExercise(' BENKPRESS '),anatomyForExercise('bench press'))
assert.equal(anatomyForExercise('unknown'),null)
assert.notEqual(anatomyForExercise('deadlift'),anatomyForExercise('rdl'))
const result=summarizeMuscleExposure([{exerciseName:'bench press',completed:true},{exerciseName:'bench press',completed:false},{exerciseName:'unknown',completed:true}])
assert.equal(result.classifiedSets,1)
assert.equal(result.unclassifiedSets,1)
assert.equal(result.roles.chest.primary,1)
assert.equal(result.roles.front_deltoids.secondary,1)
assert.equal(result.roles.rotator_cuff.stabilizing,1)
assert.equal(result.roles.calves.primary,0)
assert.deepEqual(result.unclassified,['unknown'])
assert.equal(summarizeMuscleExposure([]).classifiedSets,0)
console.log('Anatomical intelligence assertions passed')

const rows=documentedExerciseRows([
 {exercise_name:'bench press',workout_sets:[{reps:8,load_kg:50},{load_kg:50},{reps:0},{time_seconds:30}]},
 {exercise_name:'deadlift',sets:[{reps:5}]},
 {exercise_name:'plank',sets:[{time_seconds:20}]}
])
assert.equal(rows.length,4)
assert.equal(summarizeMuscleExposure(rows).classifiedSets,4)
assert.deepEqual([...muscleExerciseEvidence(rows).get('chest').primary],['bench press'])
assert.deepEqual([...muscleExerciseEvidence(rows).get('spinal_erectors').stabilizing],['deadlift'])
assert.deepEqual(documentedExerciseRows([{exercise_name:'bench press',sets:[{load_kg:50},{time_seconds:0},{reps:null}]}]),[])
console.log('Documented exercise evidence assertions passed')

assert.ok(anatomyForExercise('Row').primary.includes('quadriceps'))
assert.ok(anatomyForExercise('Barbell Row').primary.includes('lats'))
assert.ok(!anatomyForExercise('Barbell Row').primary.includes('quadriceps'))
assert.ok(anatomyForExercise('Wall Sit').primary.includes('quadriceps'))
assert.ok(anatomyForExercise('Plank').primary.includes('abdominals'))
assert.equal(anatomyForExercise('Ankle rocks').mode,'mobility')
assert.ok(anatomyForExercise('Band external rotation').primary.includes('rotator_cuff'))
console.log('Catalogue variant and isometric role assertions passed')

import {BODY_REGIONS,muscleMapRole} from '../src/lib/anatomyMap.js'
const mapKeys=Object.values(BODY_REGIONS).flat().map(([muscle])=>muscle)
assert.deepEqual([...new Set(mapKeys)].sort(),MUSCLES.filter(k=>!['abductors','hip_flexors','rotator_cuff'].includes(k)).sort())
for(const side of Object.values(BODY_REGIONS)){
 assert.equal(new Set(side.map(([muscle])=>muscle)).size,side.length)
 assert.ok(side.every(([,d])=>d.startsWith('M')))
}
assert.equal(muscleMapRole({primary:1,secondary:2,stabilizing:3}),'primary')
assert.equal(muscleMapRole({primary:0,secondary:2,stabilizing:3}),'secondary')
assert.equal(muscleMapRole({stabilizing:3}),'stabilizing')
assert.equal(muscleMapRole(undefined),'none')
console.log('Muscle map coverage and role assertions passed')

const today=new Date(2026,10,26,12)
const ex={exercise_name:'Bench Press',workout_sets:[{reps:5}]}
const recent={id:'a',workout_date:'2026-11-20',workout_exercises:[ex]}
const older={id:'b',workout_date:'2026-11-13',workout_exercises:[ex]}
const old={id:'c',workout_date:'2026-10-28',workout_exercises:[ex]}
const teamLog={...recent,id:'d',result_data:{samspel:{team_score:true}}}
const future={...recent,id:'e',workout_date:'2026-11-27'}
const input=[recent,recent,older,old,teamLog,future]
assert.equal(historyAnatomyExercises(input,7,today).length,1)
assert.equal(historyAnatomyExercises(input,14,today).length,2)
assert.equal(historyAnatomyExercises(input,30,today).length,3)
assert.deepEqual(historyAnatomyExercises(input,3,today),[])
assert.deepEqual(historyAnatomyExercises([{...recent,result_data:{wod_engine:{participation:'partner'}}}],7,today),[])
assert.deepEqual(historyAnatomyExercises([{...recent,result_data:{flow_completion_only:true}}],7,today),[])
assert.deepEqual(documentedExerciseRows([{exercise_name:'Bench Press',sets:[{reps:2,complex_status:'partial'},{reps:1,complex_status:'failed'},{reps:Infinity}]}]),[])
console.log('Personal anatomy window and completed evidence checks passed')

import {EXERCISE_MUSCLE_PROFILES} from '../src/lib/exerciseMuscleProfiles.js'
for(const name of Object.keys(EXERCISE_MUSCLE_PROFILES)){
 const profile=anatomyForExercise(name)
 assert.ok(profile)
 const groups=[...profile.primary,...profile.secondary,...profile.stabilizing]
 assert.equal(new Set(groups).size,groups.length)
 assert.ok(groups.every(k=>MUSCLES.includes(k)))
}
console.log('Canonical catalogue coverage checks passed')
