import assert from 'node:assert/strict'
import {createSynchronSession,applySynchronCommand} from '../src/lib/synchron.js'
import {initializeSynchronReview,applySynchronReview} from '../src/lib/synchronReview.js'
import {sealSynchronResults,synchronOwnReservation,recordSynchronReceipt} from '../src/lib/synchronSeal.js'
import {synchronControls} from '../src/lib/synchronClient.js'
import {createSynchronGateway,synchronActionRequest} from '../src/lib/synchronTransport.js'
const plan={id:'four',leaderId:'pt',members:['a','b'],movements:[{id:'step',exerciseId:'step',unit:'reps',target:100,method:'direct',collaboration:'relay',doses:{a:{variant:'50cm',loadKg:null},b:{variant:'40cm',loadKg:null}}}]}
let s=createSynchronSession(plan),n=0
function act(type,actorId,at,extra={}){const fn=type.startsWith('review_')?applySynchronReview:applySynchronCommand;const r=fn(s,{type,id:'e'+(++n),revision:s.revision,...extra},{actorId,at});assert.equal(r.issue,null);s=r.state}
act('join','a',0);act('join','b',0);act('start','pt',0,{memberId:'a'});act('takeover','b',70000);act('finish','pt',130000,{actual:100})
s=initializeSynchronReview(s)
act('review_update','a',140000,{movementId:'step',quality:'confirmed',value:60})
act('review_update','b',140001,{movementId:'step',quality:'estimated',value:40})
const tokens={a:'12345678-1234-4234-8234-123456789012',b:'22345678-1234-4234-8234-123456789012'}
const options=()=>({expectedRevision:s.revision,workoutDate:'2026-11-27',at:150000,tokenForMember:id=>tokens[id]})
assert.ok(sealSynchronResults(s,options()).issue)
act('review_approve','a',140002);act('review_approve','b',140003)
assert.ok(sealSynchronResults(s,{...options(),expectedRevision:0}).issue)
assert.ok(sealSynchronResults(s,{...options(),tokenForMember:()=>tokens.a}).issue)
const initial=s,revision=s.revision
const result=sealSynchronResults(s,options())
assert.equal(result.issue,null);s=result.state
assert.equal(s.revision,revision+1)
assert.equal(s.seal.reviewRevision,revision)
assert.equal(s.seal.entries.length,2)
assert.equal(initial.seal,undefined)
assert.equal(synchronOwnReservation(s,'a').payload.result_data.synchron_result.rows[0].amount,60)
assert.equal(synchronOwnReservation(s,'b').payload.result_data.synchron_result.rows[0].amount,40)
assert.equal(synchronOwnReservation(s,'pt'),null)
assert.equal(JSON.stringify(synchronOwnReservation(s,'a')).includes('40cm'),false)
assert.equal(sealSynchronResults(s,{...options(),tokenForMember:()=>{throw Error('must not regenerate')}}).duplicate,true)
assert.ok(applySynchronReview(s,{id:'change',type:'review_update',revision:s.revision,movementId:'step',quality:'confirmed',value:55},{actorId:'a',at:160000}).issue)
assert.ok(recordSynchronReceipt(s,{memberId:'a',saveToken:tokens.b,workoutId:'log-a',expectedRevision:s.revision}).issue)
const receipt={memberId:'a',saveToken:tokens.a,workoutId:'log-a',expectedRevision:s.revision}
s=recordSynchronReceipt(s,receipt).state
assert.equal(synchronOwnReservation(s,'a').receipt.workoutId,'log-a')
assert.equal(recordSynchronReceipt(s,receipt).duplicate,true)
assert.ok(recordSynchronReceipt(s,{...receipt,workoutId:'other'}).issue)
assert.ok(recordSynchronReceipt(s,{memberId:'b',saveToken:tokens.b,workoutId:'log-a',expectedRevision:s.revision}).issue)
assert.equal(synchronOwnReservation(s,'b').receipt,null)
let stored=initial
const adapter={authenticate:async x=>x,read:async()=>stored,now:()=>150000,compareAndSwap:async(id,rev,next)=>{if(rev!==stored.revision)return false;stored=next;return true}}
assert.ok((await createSynchronGateway(adapter).reserve('four','a',revision)).issue)
const gateway=createSynchronGateway({...adapter,reservation:{workoutDate:()=> '2026-11-27',tokenForMember:(_,id)=>tokens[id]}})
assert.ok((await gateway.reserve('four','pt',revision)).issue)
const responses=await Promise.all([gateway.reserve('four','a',revision),gateway.reserve('four','b',revision)])
assert.equal(responses[0].reservation.saveToken,tokens.a)
assert.equal(responses[1].reservation.saveToken,tokens.b)
assert.equal(stored.revision,revision+1)
assert.equal((await gateway.reserve('four','a',revision)).reservation.saveToken,tokens.a)
const snapshot=(await gateway.snapshot('four','a')).snapshot
assert.equal(snapshot.review.sealed,true)
assert.equal(snapshot.seal,undefined)
assert.equal(JSON.stringify(snapshot).includes(tokens.a),false)
assert.equal(synchronActionRequest(snapshot,'review_update',{movementId:'step',quality:'estimated',value:60},'change'),null)

const controls=synchronControls({snapshot,receivedAt:0},{now:0})
assert.equal(controls.canReview,false)
assert.equal(controls.canApprove,false)
