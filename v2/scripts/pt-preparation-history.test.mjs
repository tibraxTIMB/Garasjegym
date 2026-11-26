import assert from 'node:assert/strict'
import {priorPtReferences,priorPtSummary,clientWodUsage} from '../src/lib/ptPreparationHistory.js'
const programs=[{id:'p',client_id:'c'},{id:'other',client_id:'x'}]
const assignments=[{id:'a',member_id:'c',wod_id:'w',status:'completed',workout_log_id:'l',completed_at:'2026-11-25'},{id:'b',member_id:'x',wod_id:'w',status:'completed',workout_log_id:'other'},{id:'open',member_id:'c',wod_id:'w',status:'assigned'}]
const sessions=[{id:'s',program_id:'p',wod_id:'w',status:'completed',workout_log_id:'l',completed_at:'2026-11-24'},{id:'future',program_id:'p',wod_id:'w',status:'planned'},{id:'secret',program_id:'other',wod_id:'w',status:'completed',workout_log_id:'secret'}]
const args={clientId:'c',wodId:'w',programs,assignments,sessions}
assert.deepEqual(priorPtReferences(args).map(r=>r.id),['a'])
assert.deepEqual(priorPtReferences({...args,clientId:'none'}),[])
assert.deepEqual(priorPtReferences({...args,wodId:'other'}),[])
assert.deepEqual(clientWodUsage(args),{w:{planned:1,assigned:1,completed:2}})
const result={id:'l',workout_date:'2026-11-25',result_data:{exercise_results:[{exercise_name:'Squat',sets:[{reps:5,load_kg:30}]}]}}
assert.equal(priorPtSummary(result).unverified,true)
assert.deepEqual(priorPtSummary(result).rows,[])
assert.equal(priorPtSummary({...result,result_data:{...result.result_data,participation_verified:'team'}}).team,true)
assert.deepEqual(priorPtSummary({...result,result_data:{...result.result_data,participation_verified:'individual'}}).rows[0].entries,['5 reps · 30 kg'])
assert.equal(priorPtSummary(null),null)
console.log('PT preparation: 9 privacy, provenance and usage checks passed')

assert.deepEqual(priorPtSummary({...result,result_data:{...result.result_data,participation_verified:'individual',samspel:{main_track:'quality'}}}).rows,[])
assert.equal(priorPtSummary({...result,result_data:{...result.result_data,participation_verified:'individual',wod_engine:{participation:'partner'}}}).team,true)
