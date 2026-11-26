import assert from 'node:assert/strict'
import {anatomyForExercise,summarizeMuscleExposure,MUSCLES,documentedExerciseRows,muscleExerciseEvidence} from '../src/lib/anatomicalIntelligence.js'
assert.equal(MUSCLES.length,17)
assert.equal(anatomyForExercise(' BENKPRESS '),anatomyForExercise('bench press'))
assert.equal(anatomyForExercise('unknown'),null)
assert.notEqual(anatomyForExercise('deadlift'),anatomyForExercise('rdl'))
const result=summarizeMuscleExposure([{exerciseName:'bench press',completed:true},{exerciseName:'bench press',completed:false},{exerciseName:'unknown',completed:true}])
assert.equal(result.classifiedSets,1)
assert.equal(result.unclassifiedSets,1)
assert.equal(result.roles.chest.primary,1)
assert.equal(result.roles.front_deltoids.secondary,1)
assert.equal(result.roles.upper_back.stabilizing,1)
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
assert.equal(anatomyForExercise('Ankle rocks'),null)
assert.equal(anatomyForExercise('Band external rotation'),null)
console.log('Catalogue variant and isometric role assertions passed')
