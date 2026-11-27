import assert from 'node:assert/strict'
import {createSynchronSession} from '../src/lib/synchron.js'
import {createSynchronGateway,synchronActionRequest} from '../src/lib/synchronTransport.js'
const plan={id:'four',title:'Four Fronts',leaderId:'a',members:['a','b'],movements:[{id:'m',exerciseId:'step',unit:'reps',target:100,method:'estimate',collaboration:'relay',doses:{a:{variant:'high',loadKg:9},b:{variant:'low',loadKg:4}}}]}
let state=createSynchronSession(plan),time=0
const duplicateState=x=>JSON.parse(JSON.stringify(x))
const gateway=createSynchronGateway({authenticate:async key=>({'key-a':'a','key-b':'b','other':'c'}[key]||null),read:async id=>id===state.plan.id?duplicateState(state):null,now:()=>time,compareAndSwap:async(id,rev,next)=>{if(id!==state.plan.id||rev!==state.revision)return false;state=duplicateState(next);return true}})
const req=(id,revision,type,fields={})=>({id,revision,type,...fields})
const cmd=(key,id,revision,type,fields={})=>gateway.command('four',key,req(id,revision,type,fields))
assert.ok((await gateway.snapshot('four','other')).issue)
assert.ok((await gateway.snapshot('missing','key-a')).issue)
const a0=(await gateway.snapshot('four','key-a')).snapshot,b0=(await gateway.snapshot('four','key-b')).snapshot
assert.equal(a0.leader,true)
assert.equal(a0.isMember,true)
assert.equal(b0.participants,undefined)
assert.equal(b0.ownDose.loadKg,4)
assert.equal(JSON.stringify(b0).includes('"high"'),false)
assert.equal(b0.view.canStart,false)
assert.equal(synchronActionRequest(b0,'start',{memberId:'b'},'bad'),null)
assert.ok((await gateway.command('four','key-b',{...req('bad',0,'join'),actorId:'a'})).issue)
const joins=await Promise.all([cmd('key-a','j1',0,'join'),cmd('key-b','j2',0,'join')])
assert.equal(joins.filter(r=>!r.issue).length,1)
assert.equal(joins.filter(r=>r.issue).length,1)
assert.equal(state.revision,1)
const missing=state.joined.includes('a')?'key-b':'key-a'
assert.ok(!(await cmd(missing,'j3',1,'join')).issue)
assert.equal(state.revision,2)
assert.ok((await cmd('key-b','bad-start',2,'start',{memberId:'b'})).issue)
const ready=(await gateway.snapshot('four','key-a')).snapshot
assert.equal(ready.view.canStart,true)
const start=synchronActionRequest(ready,'start',{memberId:'a'},'start')
time=1000
assert.equal((await gateway.command('four','key-a',start)).snapshot.view.countdown,10)
assert.equal((await cmd('key-a','start',2,'start',{memberId:'a'})).duplicate,true)
assert.ok((await cmd('key-a','start',2,'start',{memberId:'b'})).issue)
time=11000
assert.equal((await gateway.snapshot('four','key-b')).snapshot.view.canTakeover,false)
time=16000
const bs=(await gateway.snapshot('four','key-b')).snapshot
assert.equal(bs.view.canTakeover,true)
assert.equal(bs.view.active,1)
assert.equal(bs.view.elapsed,5)
assert.equal(synchronActionRequest(bs,'pause',{},'no'),null)
const takeover=synchronActionRequest(bs,'takeover',{},'swap')
assert.equal((await gateway.command('four','key-b',takeover)).snapshot.view.active,2)
assert.equal((await gateway.snapshot('four','key-a')).snapshot.ownAssignedSeconds,5)
time=22000
assert.equal((await gateway.snapshot('four','key-b')).snapshot.ownAssignedSeconds,6)
assert.ok((await cmd('key-b','bad-load',4,'load',{memberId:'a',loadKg:100})).issue)
assert.ok(!(await cmd('key-b','load',4,'load',{loadKg:12})).issue)
assert.equal(state.currentDoses[0].a.loadKg,9)
assert.equal(state.currentDoses[0].b.loadKg,12)
assert.ok((await cmd('key-b','bad-finish',5,'finish',{actual:100})).issue)
time=30000
const finished=await cmd('key-a','finish',5,'finish',{actual:80})
assert.equal(finished.snapshot.view.phase,'finished')
assert.equal(finished.snapshot.totals.m.actual,80)
assert.equal(finished.snapshot.totals.m.confirmedBy,undefined)
assert.equal((await gateway.snapshot('four','key-b')).snapshot.view.canTakeover,false)
assert.equal(state.revision,6)
assert.equal(state.events.filter(e=>e.type==='finish').length,1)
assert.ok((await gateway.command('four','other',req('finish',5,'finish',{actual:80}))).issue)
assert.ok((await cmd('key-a','finish',5,'finish',{actual:100})).issue)
