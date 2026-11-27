import assert from 'node:assert/strict'
import {synchronStrengthReferenceIssue,synchronRelativeLoad,validSynchronRelativeLoad} from '../src/lib/synchronStrength.js'
import {createSynchronSession,applySynchronCommand} from '../src/lib/synchron.js'
import {createSynchronGateway} from '../src/lib/synchronTransport.js'
import {initializeSynchronReview,synchronReviewProjection} from '../src/lib/synchronReview.js'
const ref={version:1,kind:'tested_1rm',source:'observed',reps:1,maximal:true,loadKind:'external_kg',referenceId:'r1',memberId:'a',exerciseId:'deadlift',variant:'standard',loadKg:100,observedAt:10}
const q={memberId:'a',exerciseId:'deadlift',variant:'standard',loadKg:60,before:100}
const relative=synchronRelativeLoad([ref],q)
assert.equal(synchronStrengthReferenceIssue(ref),null)
assert.equal(relative.percent,60)
assert.equal(relative.referenceKg,100)
assert.equal(relative.ageDays,0)
assert.equal(relative.aboveReference,false)
assert.deepEqual(validSynchronRelativeLoad(relative,60),relative)
assert.equal(validSynchronRelativeLoad(relative,61),null)
for(const patch of [{source:'estimated'},{kind:'best_load'},{reps:5},{maximal:false},{loadKind:'bodyweight'},{loadKg:0},{observedAt:-1}])assert.ok(synchronStrengthReferenceIssue({...ref,...patch}))
for(const patch of [{memberId:'b'},{exerciseId:'squat'},{variant:'sumo'},{loadKg:null},{loadKg:0},{before:10}])assert.equal(synchronRelativeLoad([ref],{...q,...patch}),null)
assert.equal(synchronRelativeLoad([ref],{...q,loadKg:110}).aboveReference,true)
assert.equal(synchronRelativeLoad([ref,{...ref,referenceId:'r2',observedAt:20,loadKg:120}],q).percent,50)
assert.equal(synchronRelativeLoad([ref,{...ref,loadKg:120}],q),null)
assert.equal(synchronRelativeLoad([ref,{...ref,referenceId:'r2',loadKg:120}],q),null)
assert.equal(synchronRelativeLoad([ref,ref],q).percent,60)
assert.equal(synchronRelativeLoad([ref],{...q,before:864000010}).ageDays,10)
const plan={id:'relative',leaderId:'pt',members:['a','b'],movements:[{id:'lift',exerciseId:'deadlift',name:'Deadlift',unit:'reps',target:20,method:'estimate',collaboration:'relay',doses:{a:{variant:'standard',loadKg:60},b:{variant:'standard',loadKg:40}}}]}
let s=createSynchronSession(plan),n=0
function act(type,actorId,at,fields={}){const r=applySynchronCommand(s,{id:'e'+(++n),revision:s.revision,type,...fields},{actorId,at});assert.equal(r.issue,null);s=r.state}
act('join','a',100);act('join','b',100);act('start','pt',100,{memberId:'a'});act('load','a',40100,{loadKg:80});act('takeover','b',70100)
const running=s
act('finish','pt',100100,{actual:20})
const result=initializeSynchronReview(s,[],[ref])
const a=synchronReviewProjection(result,'a'),b=synchronReviewProjection(result,'b')
assert.equal(a.rows[0].segments[0].relativeLoad.percent,60)
assert.equal(a.rows[0].segments[1].relativeLoad.percent,80)
assert.equal(b.rows[0].segments[0].relativeLoad,null)
assert.equal(a.rows[0].value,null)
assert.equal(a.rows[0].prEligible,false)
assert.equal(initializeSynchronReview(result,[],[{...ref,loadKg:200}]),result)
assert.equal(synchronReviewProjection(result,'pt'),null)
let stored=running
const host={authenticate:async x=>x,read:async()=>stored,now:()=>100100,compareAndSwap:async(id,revision,next)=>{if(revision!==stored.revision)return false;stored=next;return true}}
const gateway=createSynchronGateway({...host,readStrengthReferences:async()=>[ref]})
assert.equal((await gateway.command(plan.id,'pt',{id:'finish',type:'finish',revision:stored.revision,actual:20})).snapshot.view.phase,'finished')
assert.equal((await gateway.snapshot(plan.id,'a')).snapshot.review.rows[0].segments[1].relativeLoad.percent,80)
assert.equal((await gateway.snapshot(plan.id,'b')).snapshot.review.rows[0].segments[0].relativeLoad,null)
stored=running
const fallback=createSynchronGateway({...host,readStrengthReferences:async()=>{throw Error('offline')}})
assert.equal((await fallback.command(plan.id,'pt',{id:'finish',type:'finish',revision:stored.revision,actual:20})).snapshot.view.phase,'finished')
assert.equal((await fallback.snapshot(plan.id,'a')).snapshot.review.rows[0].segments[0].relativeLoad,null)
