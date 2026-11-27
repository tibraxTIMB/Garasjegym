import assert from 'node:assert/strict'
import {createSynchronInvitationGateway,openSynchronInvitation,synchronCreationIssue} from '../src/lib/synchronInvitations.js'
import {createSynchronGateway} from '../src/lib/synchronTransport.js'
const wod={id:'wod',name:'Four Fronts',format:'Chipper',is_published:true,timer_settings:{workout_schema:{items:[{exercise_id:'step',exercise_name:'Box step-ups',levels:{rx:{reps:100}}}]}}}
const request={wodId:'wod',level:'rx',memberIds:['b'],leaderParticipates:true,sessionId:'12345678-1234-4234-8234-123456789012',doses:{'movement-1':{a:{variant:'50cm',loadKg:null},b:{variant:'40cm',loadKg:null}}}}
let record=null,stored=null,insertions=0,allowed=true
const host={authenticate:async key=>key,readCoachContext:async actor=>({canCoach:actor==='a'&&allowed,eligibleMemberIds:['b']}),readWod:async id=>id==='wod'?wod:null,readCreation:async()=>record,createAtomic:async next=>{if(record)return false;record=next;stored=next.state;insertions++;return true}}
const creator=createSynchronInvitationGateway(host)
assert.equal(synchronCreationIssue(request),null)
for(const patch of [{actorId:'a'},{wod},{sessionId:'bad'},{memberIds:['b','b']},{level:'oops'},{leaderParticipates:1},{doses:{'movement-1':{a:{variant:'x',loadKg:-1}}}}])assert.ok(synchronCreationIssue({...request,...patch}))
assert.ok((await creator.create('b',request)).issue)
assert.ok((await creator.create('a',{...request,memberIds:['c']})).issue)
assert.equal(insertions,0)
const results=await Promise.all([creator.create('a',request),creator.create('a',request)])
assert.equal(insertions,1)
assert.equal(results.filter(r=>r.duplicate).length,1)
assert.ok(results.every(r=>r.sessionId===request.sessionId))
assert.equal(record.invitations.length,1)
assert.equal(record.invitations[0].recipientId,'b')
assert.equal(record.invitations[0].key,JSON.stringify([request.sessionId,'b']))
assert.equal((await creator.create('a',{...request,doses:{'movement-1':{b:{loadKg:null,variant:'40cm'},a:{loadKg:null,variant:'50cm'}}}})).duplicate,true)
assert.ok((await creator.create('a',{...request,doses:{'movement-1':{a:{variant:'50cm',loadKg:1},b:{variant:'40cm',loadKg:null}}}})).issue)
allowed=false
assert.ok((await creator.create('a',request)).issue)
allowed=true
const gateway=createSynchronGateway({authenticate:host.authenticate,read:async()=>stored,compareAndSwap:async(id,rev,next)=>{if(stored.revision!==rev)return false;stored=next;return true},now:()=>0})
const href=record.invitations[0].href,open=actor=>openSynchronInvitation(href,{readSnapshot:id=>gateway.snapshot(id,actor)})
assert.ok((await open('outsider')).issue)
assert.equal((await open('b')).snapshot.joined,false)
assert.equal((await open('b')).snapshot.view.canStart,false)
assert.equal((await open('a')).snapshot.leader,true)
assert.equal(stored.revision,0)
assert.ok((await openSynchronInvitation('https://example.com',{readSnapshot:()=>{throw Error('must not call')}})).issue)
assert.ok((await openSynchronInvitation(href,{readSnapshot:async()=>({snapshot:{sessionId:'wrong',isMember:true,view:{phase:'ready'}}})})).issue)
assert.ok((await openSynchronInvitation(href,{readSnapshot:async()=>{throw Error('offline')}})).issue)
assert.equal((await gateway.command(request.sessionId,'b',{id:'join',revision:0,type:'join'})).snapshot.joined,true)
assert.equal((await open('b')).snapshot.joined,true)
