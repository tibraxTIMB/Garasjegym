import assert from 'node:assert/strict'
import {createSynchronSession,applySynchronCommand} from '../src/lib/synchron.js'
import {initializeSynchronReview,applySynchronReview} from '../src/lib/synchronReview.js'
import {prepareSynchronLog,synchronHistoryRows} from '../src/lib/synchronLog.js'
import {isIndividualPerformance} from '../src/lib/performanceEvidence.js'
const plan={id:'test-four',title:'Four Fronts',leaderId:'pt',members:['a','b'],movements:[{id:'step',exerciseId:'step',name:'Box step-ups',unit:'reps',target:100,method:'estimate',collaboration:'relay',doses:{a:{variant:'50 cm',loadKg:9},b:{variant:'40 cm',loadKg:4}}}]}
let s=createSynchronSession(plan),n=0
const action=(type,actorId,at,fields={})=>{const r=applySynchronCommand(s,{id:'e'+(++n),revision:s.revision,type,...fields},{actorId,at});assert.equal(r.issue,null);s=r.state}
const opts=()=>({expectedRevision:s.revision,saveToken:'12345678-1234-4234-8234-123456789012',workoutDate:'2026-11-27'})
assert.ok(prepareSynchronLog(s,'a',opts()).issue)
action('join','a',0);action('join','b',0);action('start','pt',0,{memberId:'a'});action('takeover','b',70000);action('finish','pt',130000,{actual:100})
s=initializeSynchronReview(s,[{memberId:'a',exerciseId:'step',variant:'50 cm',loadKg:9,unit:'reps',source:'observed',perMinute:30},{memberId:'b',exerciseId:'step',variant:'40 cm',loadKg:4,unit:'reps',source:'observed',perMinute:20}])
assert.ok(prepareSynchronLog(s,'a',opts()).issue)
const review=(type,actorId,fields={})=>{const r=applySynchronReview(s,{id:'r'+(++n),revision:s.revision,type,...fields},{actorId,at:140000+n});assert.equal(r.issue,null);s=r.state}
review('review_approve','a')
assert.ok(prepareSynchronLog(s,'a',opts()).issue)
review('review_approve','b')
const old=opts(),a=prepareSynchronLog(s,'a',old),b=prepareSynchronLog(s,'b',{...old,saveToken:'22345678-1234-4234-8234-123456789012'})
assert.equal(a.issue,undefined)
assert.equal(a.payload.member_id,'a')
assert.equal(a.payload.result_data.synchron_result.rows[0].amount,60)
assert.equal(b.payload.result_data.synchron_result.rows[0].amount,40)
assert.equal(a.payload.result_data.synchron_result.rows[0].quality,'estimated')
assert.equal(a.payload.result_data.completed,true)
assert.equal(a.payload.result_data.elapsed_seconds,120)
assert.equal(a.payload.score_reps,null)
assert.equal(a.payload.score_time_seconds,null)
assert.equal(a.payload.exercises.length,0)
assert.equal(isIndividualPerformance(a.payload),false)
assert.equal(isIndividualPerformance({result_data:{synchron_result:{version:1}}}),false)
assert.equal(JSON.stringify(a.payload).includes('40 cm'),false)
assert.equal(JSON.stringify(a.payload).includes('"member_id":"b"'),false)
assert.equal(synchronHistoryRows(a.payload)[0].amount,60)
assert.equal(synchronHistoryRows(a.payload)[0].segments[0].loadKg,9)
assert.deepEqual(prepareSynchronLog(s,'a',old),a)
assert.ok(prepareSynchronLog(s,'pt',old).issue)
assert.ok(prepareSynchronLog(s,'a',{...old,saveToken:'bad'}).issue)
assert.ok(prepareSynchronLog(s,'a',{...old,workoutDate:'2026-02-30'}).issue)
assert.equal(synchronHistoryRows({result_data:{synchron_result:{version:2,rows:[]}}}).length,0)
review('review_update','a',{movementId:'step',quality:'confirmed',value:55})
assert.ok(prepareSynchronLog(s,'a',old).issue)
assert.ok(prepareSynchronLog(s,'a',opts()).issue)
review('review_approve','a');review('review_approve','b')
assert.equal(prepareSynchronLog(s,'a',opts()).payload.result_data.synchron_result.rows[0].quality,'confirmed')
assert.equal(prepareSynchronLog(s,'b',opts()).payload.result_data.synchron_result.rows[0].amount,45)
assert.equal(isIndividualPerformance(prepareSynchronLog(s,'a',opts()).payload),false)
