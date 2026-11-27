import assert from 'node:assert/strict'
import {createSynchronSession} from '../src/lib/synchron.js'
import {createSynchronGateway} from '../src/lib/synchronTransport.js'
import {acceptSynchronSnapshot,synchronControls,submitSynchronAction,submitSynchronSave} from '../src/lib/synchronClient.js'
const plan={id:'demo',leaderId:'a',members:['a','b'],movements:[{id:'step',exerciseId:'step',unit:'reps',target:100,method:'estimate',collaboration:'relay',doses:{a:{variant:'50cm',loadKg:null},b:{variant:'40cm',loadKg:null}}}]}
let state=createSynchronSession(plan),ms=0,online=true,sent=0
const gateway=createSynchronGateway({authenticate:async key=>key,read:async()=>state,now:()=>ms,compareAndSwap:async(id,rev,next)=>{if(rev!==state.revision)return false;state=next;return true}})
const adapter=actor=>({read:()=>gateway.snapshot('demo',actor),command:cmd=>{sent++;return gateway.command('demo',actor,cmd)},now:()=>ms,online:()=>online})
const record=async actor=>acceptSynchronSnapshot(null,(await adapter(actor).read()).snapshot,ms)
let a=await record('a'),b=await record('b')
assert.equal(synchronControls(a,{now:ms}).canStart,false)
assert.equal(synchronControls(b,{now:ms}).canJoin,true)
assert.equal(synchronControls(b,{now:ms}).canStart,false)
assert.ok((await submitSynchronAction(b,'start',{},'x',adapter('b'))).issue)
assert.equal(sent,0)
a=(await submitSynchronAction(a,'join',{},'j1',adapter('a'))).record
const stale=await submitSynchronAction(b,'join',{},'j2',adapter('b'))
assert.ok(stale.issue);assert.equal(sent,1)
b=(await submitSynchronAction(stale.record,'join',{},'j3',adapter('b'))).record
a=await record('a')
assert.equal(synchronControls(a,{now:ms}).canStart,true)
a=(await submitSynchronAction(a,'start',{memberId:'a'},'start',adapter('a'))).record
assert.equal(a.snapshot.view.countdown,10)
ms=15000;b=await record('b');a=await record('a')
assert.equal(synchronControls(b,{now:ms}).role,'rest')
assert.equal(synchronControls(a,{now:ms}).role,'work')
assert.equal(synchronControls(b,{now:ms}).canTakeover,true)
online=false
assert.equal(synchronControls(b,{now:ms,online}).canTakeover,false)
assert.ok((await submitSynchronAction(b,'takeover',{},'offline',adapter('b'))).issue)
online=true
b=(await submitSynchronAction(b,'takeover',{},'swap',adapter('b'))).record
assert.equal(b.snapshot.view.active,2)
assert.equal(synchronControls(b,{now:ms}).role,'work')
assert.equal(acceptSynchronSnapshot(b,a.snapshot,ms),b)
const old=b.snapshot
assert.equal(acceptSynchronSnapshot(b,{...old,sessionId:'other'},ms),b)
assert.equal(acceptSynchronSnapshot(b,{...old,leader:true},ms),b)
assert.equal(synchronControls(b,{now:ms+6000}).actionsLocked,true)
assert.equal(synchronControls(b,{now:ms,busy:true}).canIdle,false)
assert.equal(synchronControls(b,{now:ms}).canPause,false)
assert.equal(synchronControls(b,{now:ms}).canIdle,true)
const slow=acceptSynchronSnapshot(null,old,ms,ms-6000)
assert.equal(synchronControls(slow,{now:ms}).actionsLocked,true)
const before=sent
const unsure=await submitSynchronAction(b,'idle',{},'uncertain',{...adapter('b'),command:async()=>{throw Error('network')}})
assert.equal(unsure.uncertain,true)
assert.equal(sent,before)

ms=30000;a=await record('a')
a=(await submitSynchronAction(a,'finish',{actual:80},'finish',adapter('a'))).record
assert.equal(a.snapshot.view.phase,'finished')
assert.equal(synchronControls(a,{now:ms}).canReview,true)
assert.equal(synchronControls(a,{now:ms}).canApprove,false)
a=(await submitSynchronAction(a,'review_update',{movementId:'step',quality:'estimated',value:40},'review-a',adapter('a'))).record
assert.equal(a.snapshot.review.rows[0].value,40)
b=await record('b')
b=(await submitSynchronAction(b,'review_update',{movementId:'step',quality:'confirmed',value:40},'review-b',adapter('b'))).record
assert.equal(b.snapshot.review.canApprove,true)
b=(await submitSynchronAction(b,'review_approve',{},'approve-b',adapter('b'))).record
assert.equal(b.snapshot.review.approved,true)
assert.equal(synchronControls(b,{now:ms}).canApprove,false)

// Invalid mutation responses cannot be accepted as successful actions.
for(const bad of [null,{...b.snapshot,sessionId:'other'},{...b.snapshot,revision:-1},{...b.snapshot,view:{...b.snapshot.view,phase:'invalid'}}]){
 const r=await submitSynchronAction(a,'review_update',{movementId:'step',quality:'estimated',value:40},'bad-response',{...adapter('a'),read:async()=>({snapshot:a.snapshot}),command:async()=>({snapshot:bad})})
 assert.ok(r.issue);assert.equal(r.uncertain,true);assert.equal(r.record.snapshot.sessionId,a.snapshot.sessionId)
}

const notApproved=await record('a')
let saves=0
const saveAdapter={...adapter('a'),saveResult:async revision=>{saves++;assert.equal(revision,ready.snapshot.revision);return {saved:true,workoutId:'log-a'}}}
assert.equal(synchronControls(notApproved,{now:ms}).canSave,false)
assert.ok((await submitSynchronSave(notApproved,saveAdapter)).issue)
assert.equal(saves,0)
a=(await submitSynchronAction(notApproved,'review_approve',{},'approve-a',adapter('a'))).record
const ready=await record('a')
assert.equal(synchronControls(ready,{now:ms}).canSave,true)
assert.equal(synchronControls(ready,{now:ms,online:false}).canSave,false)
assert.equal(synchronControls(ready,{now:ms,busy:true}).canSave,false)
const saved=await submitSynchronSave(ready,saveAdapter)
assert.equal(saved.receipt.workoutId,'log-a')
assert.equal(saves,1)
for(const response of [null,{saved:true},{saved:true,workoutId:''},{saved:false,workoutId:'fake'},{issue:'denied',saved:true,workoutId:'fake'}]){
 const r=await submitSynchronSave(ready,{...saveAdapter,saveResult:async()=>response})
 assert.ok(r.issue);assert.equal(r.uncertain,true);assert.equal(r.receipt,undefined)
}
const denied=await submitSynchronSave(ready,{...saveAdapter,read:async()=>({issue:'denied'})})
assert.equal(denied.uncertain,true);assert.equal(saves,1)
const changed=await submitSynchronSave(ready,{...saveAdapter,read:async()=>({snapshot:{...ready.snapshot,revision:ready.snapshot.revision+1}})})
assert.ok(changed.issue);assert.equal(saves,1)
const failed=await submitSynchronSave(ready,{...saveAdapter,saveResult:async()=>{throw Error('network')}})
assert.equal(failed.uncertain,true);assert.equal(failed.receipt,undefined)
