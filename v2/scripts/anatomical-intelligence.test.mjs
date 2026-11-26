import assert from 'node:assert/strict'
import {anatomyForExercise,summarizeMuscleExposure,MUSCLES,documentedExerciseRows,muscleExerciseEvidence,historyAnatomyExercises,plannedAnatomyRows,workoutAnatomyExercises} from '../src/lib/anatomicalIntelligence.js'
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

const planned=plannedAnatomyRows([{name:'Bench Press'},{is_rest:true,name:'Pause'},{name:'Complex',complex_steps:[{name:'Power Clean',reps:2},{name:'Push Jerk',reps:1}]},'Unknown'])
assert.deepEqual(planned.map(x=>x.exerciseName),['Bench Press','Power Clean','Push Jerk','Unknown'])
assert.equal(summarizeMuscleExposure(planned).classifiedSets,3)
assert.equal(summarizeMuscleExposure(planned).unclassifiedSets,1)
const onlySnapshot={id:'snap',workout_date:'2026-11-25',result_data:{exercise_results:[{exercise_name:'Bench Press',sets:[{reps:5},{reps:0}]}]}}
assert.equal(documentedExerciseRows(historyAnatomyExercises([onlySnapshot],7,today)).length,1)
assert.deepEqual(historyAnatomyExercises([{...onlySnapshot,result_data:{...onlySnapshot.result_data,samspel:{team_score:true}}}],7,today),[])
assert.deepEqual(plannedAnatomyRows([{name:'Rest'},null,{is_rest:true,name:'Push Jerk'}]),[])
console.log('Shared planned and historical role checks passed')

const loggedErg={exercise_name:'Row',meters:1200,sets:[{reps:null,time_seconds:null}]}
assert.equal(documentedExerciseRows([loggedErg]).length,1)
assert.equal(documentedExerciseRows([{...loggedErg,sets:[{time_seconds:60}]}]).length,1)
assert.deepEqual(documentedExerciseRows([{exercise_name:'Row',meters:0,sets:[]}]),[])
assert.deepEqual(documentedExerciseRows([{exercise_name:'Back Squat',sets:[{reps:4,flow_status:'skipped'}]}]),[])
assert.equal(documentedExerciseRows(workoutAnatomyExercises({exercises:[ex]})).length,1)
const ergLog={workout_exercises:[{exercise_name:'Row',workout_sets:[]}],result_data:{exercise_results:[loggedErg]}}
assert.equal(documentedExerciseRows(workoutAnatomyExercises(ergLog)).length,1)
assert.deepEqual(documentedExerciseRows(workoutAnatomyExercises({...ergLog,result_data:{exercise_results:[{...loggedErg,exercise_name:'Bike'}]}})),[])
assert.deepEqual(workoutAnatomyExercises({...ergLog,result_data:{...ergLog.result_data,samspel:{team_score:true}}}),[])
assert.equal(anatomyForExercise('constructor'),null)
console.log('Nine performed-report and measured erg evidence checks passed')

const custom={exercise_name:'Mitt kompleks',is_complex:true,complex_family:'custom',complex_steps:[{name:'Power Clean'},{name:'Push Jerk'}],sets:[{reps:2,complex_status:'complete'},{reps:1,complex_status:'partial'}]}
assert.deepEqual(documentedExerciseRows([custom]).map(r=>r.exerciseName),['Power Clean','Push Jerk'])
assert.equal(documentedExerciseRows([{exercise_name:'Plank',sets:[{flow_status:'done'}]}])[0].evidenceKind,'confirmed')
const complexLog={workout_exercises:[{exercise_name:'Mitt kompleks',sort_order:1,workout_sets:[{set_number:1,reps:2},{set_number:2,reps:1}]}],result_data:{exercise_results:[custom]}}
assert.equal(documentedExerciseRows(workoutAnatomyExercises(complexLog)).length,2)
assert.deepEqual(documentedExerciseRows(workoutAnatomyExercises({...complexLog,workout_exercises:[{exercise_name:'Mitt kompleks',sort_order:1,workout_sets:[{set_number:1,reps:0}]}]})),[])
assert.equal(documentedExerciseRows(workoutAnatomyExercises({workout_exercises:[{exercise_name:'Bench Press',sort_order:2,workout_sets:[{reps:5}]}],result_data:{exercise_results:[custom,{exercise_name:'Bench Press',sets:[{reps:5}]}]}})).length,1)
console.log('Completed complex and corrected evidence assertions passed')

assert.deepEqual(workoutAnatomyExercises({...recent,result_data:{participation_verified:'unknown'}}),[])
const correctedSkipped={workout_exercises:[{exercise_name:'Bench Press',workout_sets:[{reps:8}]}],result_data:{exercise_results:[{exercise_name:'Bench Press',sets:[{reps:5,flow_status:'skipped'}]}]}}
assert.deepEqual(documentedExerciseRows(workoutAnatomyExercises(correctedSkipped)),[])

assert.deepEqual(workoutAnatomyExercises({...ergLog,result_data:{...ergLog.result_data,samspel:{main_track:'quality',participant_results:[{slot:1,quality_status:'done',erg_value:500}]}}}),[])
