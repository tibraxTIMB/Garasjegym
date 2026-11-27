import assert from 'node:assert/strict'
import {createSynchronSession,applySynchronCommand,synchronClock} from '../src/lib/synchron.js'
import {createSynchronGateway} from '../src/lib/synchronTransport.js'
import {initializeSynchronReview,synchronReviewProjection,applySynchronReview} from '../src/lib/synchronReview.js'
const plan={id:'four',leaderId:'pt',members:['a','b'],movements:[['step','reps',100,'estimate'],['hang','seconds',180,'clock'],['wall','reps',150,'estimate'],['row','meters',2000,'hybrid'],['cal','calories',60,'machine']].map(([id,unit,target,method])=>({id,exerciseId:id,unit,target,method,collaboration:'relay',doses:{a:{variant:'standard',loadKg:9},b:{variant:'scaled',loadKg:4}}}))}
let s=createSynchronSession(plan),n=0
const act=(type,actorId,at,more={})=>{const r=applySynchronCommand(s,{id:'e'+(++n),revision:s.revision,type,...more},{actorId,at});assert.equal(r.issue,null);s=r.state}
act('join','a',0);act('join','b',0);act('start','pt',0,{memberId:'a'})
act('takeover','b',70000);act('advance','pt',130000,{actual:100})
act('takeover','a',130000);act('takeover','b',190000);act('advance','pt',250000,{actual:120})
act('takeover','a',250000);act('load','a',280000,{loadKg:12});act('takeover','b',310000);act('advance','pt',370000,{actual:90})
act('takeover','a',370000);act('takeover','b',430000);act('finish','pt',490000,{actual:null,abort:true})
const elapsed=synchronClock(s,999999)
const cal=[{memberId:'a',exerciseId:'step',variant:'standard',loadKg:9,unit:'reps',source:'observed',perMinute:30},{memberId:'b',exerciseId:'step',variant:'scaled',loadKg:4,unit:'reps',source:'observed',perMinute:20}]
s=initializeSynchronReview(s,cal)
const a=()=>synchronReviewProjection(s,'a'),b=()=>synchronReviewProjection(s,'b')
assert.equal(a().rows.length,4)
assert.equal(a().rows[0].value,60);assert.equal(b().rows[0].value,40)
assert.equal(a().rows[0].quality,'estimated');assert.equal(a().rows[0].basis,'team_adjusted')
assert.equal(a().rows[1].value,60);assert.equal(a().rows[1].quality,'estimated')
assert.equal(a().rows[2].value,null);assert.equal(a().rows[2].segments.length,2)
assert.equal(a().rows[2].segments[1].loadKg,12)
assert.equal(a().rows[3].value,null);assert.equal(a().rows[3].teamActual,null)
assert.equal(a().canApprove,false);assert.equal(synchronReviewProjection(s,'pt'),null)
assert.equal(JSON.stringify(a()).includes('scaled'),false)
const update=(actorId,type,fields={},reject=false)=>{const r=applySynchronReview(s,{id:'r'+(++n),revision:s.revision,type,...fields},{actorId,at:500000+n});if(reject){assert.ok(r.issue);assert.equal(r.state,s)}else{assert.equal(r.issue,null);s=r.state}}
update('a','review_update',{movementId:'step',quality:'confirmed',value:55})
assert.equal(a().rows[0].value,55);assert.equal(b().rows[0].value,45);assert.equal(b().rows[0].quality,'estimated')
update('b','review_update',{movementId:'step',quality:'confirmed',value:60},true)
update('a','review_update',{movementId:'wall',quality:'estimated',value:40})
update('b','review_update',{movementId:'wall',quality:'confirmed',value:50})
update('a','review_update',{movementId:'row',quality:'unknown',value:null})
update('b','review_update',{movementId:'row',quality:'unknown',value:null})
assert.equal(a().canApprove,true);assert.equal(b().canApprove,true)
update('a','review_approve');update('b','review_approve')
assert.equal(a().approvedCount,2);assert.equal(a().rows[0].prEligible,false)
assert.equal(synchronClock(s,999999),elapsed)
update('a','review_update',{movementId:'step',quality:'estimated',value:50})
assert.equal(a().approvedCount,0);assert.equal(b().rows[0].value,50)
assert.equal(a().rows[0].quality,'estimated')
update('a','review_update',{movementId:'cal',quality:'confirmed',value:0},true)
update('pt','review_approve',{},true)
assert.equal(initializeSynchronReview(s,[]),s)

// Gateway integration with authenticated participants and atomically frozen proposals.
let saved=s,clockNow=600000
const gateway=createSynchronGateway({authenticate:async key=>key,read:async()=>saved,now:()=>clockNow,compareAndSwap:async(id,rev,next)=>{if(rev!==saved.revision)return false;saved=next;return true}})
const snapshot=(await gateway.snapshot('four','a')).snapshot
assert.equal(snapshot.review.rows.length,4)
assert.equal(snapshot.review.rows[0].value,50)
assert.equal((await gateway.snapshot('four','pt')).snapshot.review,null)
assert.ok((await gateway.snapshot('four','outsider')).issue)
const cmd={id:'gateway-review',type:'review_update',revision:saved.revision,movementId:'step',quality:'confirmed',value:52}
assert.ok((await gateway.command('four','a',{...cmd,memberId:'b'})).issue)
const updated=await gateway.command('four','a',cmd)
assert.equal(updated.snapshot.review.rows[0].value,52)
assert.equal((await gateway.snapshot('four','b')).snapshot.review.rows[0].value,48)
assert.equal((await gateway.command('four','a',cmd)).duplicate,true)
assert.ok((await gateway.command('four','a',{...cmd,value:53})).issue)
assert.ok((await gateway.command('four','b',{id:'oldrev',type:'review_approve',revision:cmd.revision})).issue)
