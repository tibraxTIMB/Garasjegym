import assert from 'node:assert/strict'
import {createSynchronSession,applySynchronCommand} from '../src/lib/synchron.js'
import {initializeSynchronReview,applySynchronReview} from '../src/lib/synchronReview.js'
import {applySynchronCalibration,synchronCoachCalibration,synchronCalibrationExport} from '../src/lib/synchronCalibration.js'
import {sealSynchronResults} from '../src/lib/synchronSeal.js'
import {createSynchronGateway,synchronActionRequest} from '../src/lib/synchronTransport.js'
import {synchronControls,submitSynchronAction} from '../src/lib/synchronClient.js'
const plan={id:'cal-test',leaderId:'a',members:['a','b'],movements:[{id:'wall',exerciseId:'wall',unit:'reps',target:100,method:'estimate',collaboration:'relay',doses:{a:{variant:'standard',loadKg:9},b:{variant:'scaled',loadKg:4}}},{id:'row',exerciseId:'row',unit:'meters',target:1000,method:'hybrid',collaboration:'relay',doses:{a:{variant:'standard',loadKg:null},b:{variant:'standard',loadKg:null}}}]}
let state=createSynchronSession(plan),n=0
const act=(type,actorId,at,more={})=>{const r=applySynchronCommand(state,{id:'e'+(++n),revision:state.revision,type,...more},{actorId,at});assert.equal(r.issue,null);state=r.state}
act('join','a',0);act('join','b',0);act('start','a',0,{memberId:'a'});act('takeover','b',40000);act('idle','b',70000);act('takeover','b',100000);act('advance','a',130000,{actual:100});act('takeover','b',130000);act('finish','a',190000,{actual:1000})
state=initializeSynchronReview(state)
const rows=synchronCoachCalibration(state,'a').rows
assert.equal(rows.length,3);assert.equal(rows[0].segmentIndex,1);assert.equal(rows[1].previousWorkSeconds,30);assert.equal(rows[1].restSeconds,30);assert.equal(rows[2].unit,'meters')
assert.equal(synchronCoachCalibration(state,'b'),null)
const cmd=(fields={})=>({id:'c'+(++n),revision:state.revision,type:'calibration_record',segmentIndex:1,amount:20,attested:true,...fields})
const apply=(c,actorId='a')=>applySynchronCalibration(state,c,{actorId,at:200000})
for(const patch of [{segmentIndex:0},{segmentIndex:99},{amount:101},{amount:-1},{amount:1.5},{attested:false},{revision:0}])assert.ok(apply(cmd(patch)).issue)
assert.ok(apply(cmd(),'b').issue)
const first=cmd(),r=apply(first);assert.equal(r.issue,null);state=r.state
assert.equal(state.calibration[0].row.amount,20);assert.equal(state.calibration[0].row.loadKg,4);assert.equal(state.calibration[0].row.assignedSeconds,30)
assert.equal(apply(first).duplicate,true);assert.ok(apply({...first,amount:21}).issue)
assert.ok(apply(cmd({segmentIndex:2,amount:90})).issue)
state=apply(cmd({segmentIndex:2,amount:15})).state
state=apply(cmd({segmentIndex:3,amount:1000})).state
assert.equal(state.calibration[2].row.evidence,'machine')
assert.equal(synchronCalibrationExport(state).length,0)
assert.equal(state.review.movements[0].rows[1].input,null)
let clock=210000
const gateway=createSynchronGateway({authenticate:async x=>x,read:async()=>state,now:()=>clock,compareAndSwap:async(id,rev,next)=>{if(rev!==state.revision)return false;state=next;return true}})
const a=(await gateway.snapshot(plan.id,'a')).snapshot,b=(await gateway.snapshot(plan.id,'b')).snapshot
assert.equal(b.calibration,undefined)
assert.equal(synchronActionRequest(b,'calibration_record',{segmentIndex:1,amount:22,attested:true},'bad'),null)
assert.equal(synchronControls({snapshot:a,receivedAt:0},{now:0}).canCalibrate,true)
assert.equal(synchronControls({snapshot:a,receivedAt:0},{now:0,online:false}).canCalibrate,false)
const submitted=await submitSynchronAction({snapshot:a,receivedAt:0},'calibration_record',{segmentIndex:1,amount:22,attested:true},'new',{read:()=>gateway.snapshot(plan.id,'a'),command:c=>gateway.command(plan.id,'a',c),now:()=>0,online:()=>true})
assert.equal(submitted.issue,null);assert.equal(state.calibration.find(x=>x.segmentIndex===1).row.amount,22)
assert.ok((await gateway.command(plan.id,'b',{...cmd(),memberId:'a'})).issue)
function review(actorId,type,extra={}){const r=applySynchronReview(state,{id:'r'+(++n),revision:state.revision,type,...extra},{actorId,at:220000+n});assert.equal(r.issue,null);state=r.state}
review('a','review_update',{movementId:'wall',quality:'confirmed',value:63});review('b','review_update',{movementId:'wall',quality:'confirmed',value:37})
review('a','review_update',{movementId:'row',quality:'confirmed',value:0});review('b','review_update',{movementId:'row',quality:'confirmed',value:1000})
review('a','review_approve');review('b','review_approve')
const sealed=sealSynchronResults(state,{expectedRevision:state.revision,at:230000,workoutDate:'2026-11-27',tokenForMember:id=>id==='a'?'12345678-1234-4234-8234-123456789012':'22345678-1234-4234-8234-123456789012'})
assert.equal(sealed.issue,null);state=sealed.state
assert.equal(synchronCalibrationExport(state).length,3)
assert.ok(applySynchronCalibration(state,cmd(),{actorId:'a',at:240000}).issue)
const conflicting=JSON.parse(JSON.stringify(state));conflicting.review.movements[0].rows[1].input.value=38
assert.equal(synchronCalibrationExport(conflicting).length,1)
assert.equal(synchronCoachCalibration(state,'a').sealed,true)
