import assert from 'node:assert/strict'
import {synchronObservationIssue,synchronPaceProfile} from '../src/lib/synchronPace.js'
import {createSynchronSession,synchronEstimate} from '../src/lib/synchron.js'
import {initializeSynchronReview,synchronReviewProjection} from '../src/lib/synchronReview.js'
const q={memberId:'a',exerciseId:'wall',variant:'standard',loadKg:9,unit:'reps',sessionId:'now',before:100000,duration:60,previousWorkSeconds:0,restSeconds:null}
const obs=(sessionId,amount,extra={})=>({version:1,source:'observed',evidence:'counted',observationId:'one',sessionId,memberId:'a',exerciseId:'wall',variant:'standard',loadKg:9,unit:'reps',observedAt:100,amount,assignedSeconds:60,previousWorkSeconds:0,restSeconds:null,...extra})
const rows=[obs('s1',18),obs('s2',22),obs('s3',20)]
assert.equal(synchronObservationIssue(rows[0]),null)
assert.equal(synchronPaceProfile(rows,q).pace,20)
assert.equal(synchronPaceProfile(rows,q).sessions,3)
assert.equal(synchronPaceProfile(rows,q).low,18)
assert.equal(synchronPaceProfile(rows,q).high,22)
assert.equal(synchronPaceProfile([...rows,rows[0]],q).sessions,3)
assert.equal(synchronPaceProfile([...rows,obs('s1',99)],q).sessions,2)
assert.equal(synchronPaceProfile([obs('s1',18),obs('s1',22,{observationId:'two'}),obs('s2',30)],q).pace,25)
for(const patch of [{source:'estimated'},{evidence:'allocated'},{amount:1.5},{assignedSeconds:0},{restSeconds:0},{evidence:'machine'}])assert.ok(synchronObservationIssue(obs('bad',20,patch)))
for(const patch of [{memberId:'b'},{variant:'scaled'},{unit:'meters'},{loadKg:10},{sessionId:'now'},{observedAt:100000},{assignedSeconds:20},{previousWorkSeconds:60,restSeconds:20}])assert.equal(synchronPaceProfile([obs('bad',20,patch)],q),null)
assert.equal(synchronPaceProfile([obs('s1',0)],q).pace,0)
assert.equal(synchronPaceProfile([obs('s1',18)],q).rangeAvailable,false)
const bracket=[...rows.map(r=>({...r,loadKg:8,amount:24})),...rows.map(r=>({...r,sessionId:r.sessionId+'hi',loadKg:12,amount:16}))]
assert.equal(synchronPaceProfile(bracket,{...q,loadKg:10}).pace,20)
assert.equal(synchronPaceProfile(bracket,{...q,loadKg:10}).method,'interpolated_load')
assert.equal(synchronPaceProfile(bracket,{...q,loadKg:13}),null)
assert.equal(synchronPaceProfile(bracket.slice(1),{...q,loadKg:10}),null)
assert.equal(synchronPaceProfile(bracket.map(r=>({...r,amount:r.loadKg===8?10:20})),{...q,loadKg:10}),null)
const legacy={memberId:'a',exerciseId:'wall',variant:'standard',loadKg:9,unit:'reps',source:'observed',perMinute:25}
assert.equal(synchronPaceProfile([legacy],q).method,'legacy_exact')
assert.equal(synchronPaceProfile([legacy],q).rangeAvailable,false)
assert.equal(synchronPaceProfile([{...legacy,version:1}],q),null)
const plan={id:'now',leaderId:'pt',members:['a','b'],movements:[{id:'wall',exerciseId:'wall',name:'Wall balls',unit:'reps',target:100,method:'estimate',collaboration:'relay',doses:{a:{variant:'standard',loadKg:9},b:{variant:'scaled',loadKg:4}}}]}
let state=createSynchronSession(plan)
state={...state,phase:'finished',startAt:100000,lastAt:250000,totals:{wall:{actual:100,unit:'reps'}},segments:[{movementId:'wall',memberId:'a',from:100000,to:160000,assignedMs:60000,dose:{variant:'standard',loadKg:9}},{movementId:'wall',memberId:'a',from:190000,to:250000,assignedMs:60000,dose:{variant:'standard',loadKg:9}}]}
const later=[obs('s4',12,{previousWorkSeconds:60,restSeconds:30}),obs('s5',14,{previousWorkSeconds:60,restSeconds:30})]
assert.equal(synchronEstimate(state,'wall','a',rows),null)
const estimate=synchronEstimate(state,'wall','a',[...rows,...later])
assert.equal(estimate.value,33)
assert.deepEqual(estimate.model.observedRange,{low:30,high:36})
assert.equal(estimate.model.minSessions,2)
assert.equal(estimate.prEligible,false)
const reviewed=initializeSynchronReview(state,[...rows,...later])
assert.deepEqual(synchronReviewProjection(reviewed,'a').rows[0].model,estimate.model)
assert.equal(synchronReviewProjection(reviewed,'b').rows[0].model,null)
assert.equal(initializeSynchronReview(reviewed,[]),reviewed)
