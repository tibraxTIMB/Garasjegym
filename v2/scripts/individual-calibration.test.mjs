import assert from 'node:assert/strict'
import {createSynchronRuntime,createSynchronDispatcher} from '../src/lib/synchronRuntime.js'
import {individualCalibrationRequestIssue,prepareIndividualCalibration,createIndividualCalibrationGateway} from '../src/lib/individualCalibration.js'
import {synchronPaceProfile} from '../src/lib/synchronPace.js'
const req={requestId:'12345678-1234-4234-8234-123456789012',assignmentId:'assignment-1',programSessionId:null,exerciseIndex:0,exerciseName:'Box step-ups',variant:'40 cm',loadKg:null,unit:'reps',amount:24,seconds:60,attested:true}
const shared={memberId:'b',workoutId:'workout-1',finishedAt:1000,evidenceRevision:'revision-1',result:{result_data:{participation_verified:'individual',exercise_results:[{exercise_name:'Box step-ups',sets:[{reps:100,time_seconds:999}]}]}},exercises:[{index:0,exerciseId:'step',exerciseName:'Box step-ups',allowedUnits:['reps']}]}
const ctx={actorId:'pt',at:2000}
assert.equal(individualCalibrationRequestIssue(req),null)
const candidate=prepareIndividualCalibration(shared,req,ctx).candidate
assert.equal(candidate.row.amount,24)
assert.equal(candidate.row.assignedSeconds,60)
assert.equal(candidate.row.memberId,'b')
assert.equal(candidate.row.exerciseId,'step')
assert.equal(candidate.row.previousWorkSeconds,0)
assert.equal(candidate.row.restSeconds,null)
assert.equal(candidate.observerId,'pt')
assert.equal(candidate.row.sessionId,'workout-1')
assert.equal(synchronPaceProfile([candidate.row],{memberId:'b',exerciseId:'step',variant:'40 cm',loadKg:null,unit:'reps',sessionId:'future',before:3000,duration:60,previousWorkSeconds:0,restSeconds:null}).pace,24)
for(const patch of [{memberId:'x'},{attested:false},{seconds:0},{seconds:3601},{amount:1.5},{unit:'seconds'},{exerciseIndex:-1},{programSessionId:'other'},{loadKg:-1},{requestId:'bad'}])assert.ok(individualCalibrationRequestIssue({...req,...patch}))
for(const data of [{participation_verified:'team'},{participation_verified:null},{samspel:{enabled:true}},{synchron_result:{}},{flow_completion_only:true}])assert.ok(prepareIndividualCalibration({...shared,result:{result_data:{...shared.result.result_data,...data}}},req,ctx).issue)
assert.ok(prepareIndividualCalibration(shared,req,{...ctx,actorId:'b'}).issue)
assert.ok(prepareIndividualCalibration(shared,{...req,unit:'meters'},ctx).issue)
assert.ok(prepareIndividualCalibration({...shared,exercises:[]},req,ctx).issue)
assert.ok(prepareIndividualCalibration({...shared,exercises:[...shared.exercises,...shared.exercises]},req,ctx).issue)
assert.ok(prepareIndividualCalibration({...shared,exercises:[{...shared.exercises[0],exerciseName:'Wrong'}]},req,ctx).issue)
assert.ok(prepareIndividualCalibration(shared,req,{...ctx,at:999}).issue)
assert.equal(prepareIndividualCalibration(shared,{...req,assignmentId:null,programSessionId:'intro-1'},ctx).candidate.reference.programSessionId,'intro-1')
let stored=null,calls=0,allowed=true,clock=2000
const gateway=createIndividualCalibrationGateway({authenticate:async x=>x,readCoachContext:async actor=>({canCoach:actor==='pt'&&allowed,eligibleMemberIds:['b']}),readSharedCalibrationResult:async (actor,ref)=>ref.assignmentId==='assignment-1'?shared:null,now:()=>clock,saveCalibrationAtomic:async c=>{calls++;if(stored)return {accepted:stored.requestId===c.requestId&&stored.fingerprint===c.fingerprint,duplicate:true};stored=c;return {accepted:true}}})
assert.equal(createIndividualCalibrationGateway({}),null)
assert.ok((await gateway('b',req)).issue)
assert.ok((await gateway('pt',{...req,assignmentId:'unknown'})).issue)
assert.equal(calls,0)
assert.equal((await gateway('pt',req)).accepted,true)
clock=3000
assert.equal((await gateway('pt',req)).duplicate,true)
assert.equal(stored.row.observedAt,2000)
assert.ok(prepareIndividualCalibration(shared,{...req,exerciseName:'Other'},ctx).issue)
assert.ok((await gateway('pt',{...req,amount:25})).issue)
allowed=false
assert.ok((await gateway('pt',req)).issue)
assert.equal(stored.row.amount,24)

const serverHost={authenticate:async x=>x,readCoachContext:async actor=>({canCoach:actor==='pt',eligibleMemberIds:['b']}),readSharedCalibrationResult:async()=>shared,saveCalibrationAtomic:async()=>({accepted:true}),now:()=>3000,readWod:async()=>null,readCreation:async()=>null,createAtomic:async()=>false,read:async()=>null,compareAndSwap:async()=>false}
const dispatch=createSynchronDispatcher(serverHost)
const runtime=createSynchronRuntime({actorId:'pt',invoke:body=>dispatch('pt',body),individualCalibrationEnabled:true})
assert.equal((await runtime.recordIndividualCalibration(req)).accepted,true)
assert.equal(createSynchronRuntime({actorId:'pt',invoke:body=>dispatch('pt',body)}).recordIndividualCalibration,undefined)
assert.ok((await dispatch('b',{op:'individual_calibration',request:req})).issue)
assert.ok((await dispatch('b',{op:'individual_calibration',request:req,actorId:'pt'})).issue)
assert.ok((await createSynchronDispatcher({...serverHost,saveCalibrationAtomic:undefined})('pt',{op:'individual_calibration',request:req})).issue)
