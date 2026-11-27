import assert from 'node:assert/strict'
import {createSynchronDispatcher,createSynchronRuntime,synchronRouteIssue} from '../src/lib/synchronRuntime.js'
const wod={id:'wod',name:'Four Fronts',format:'Chipper',is_published:true,timer_settings:{workout_schema:{items:[{exercise_id:'step',exercise_name:'Box step-ups',levels:{rx:{reps:100}}}]}}}
const request={wodId:'wod',level:'rx',memberIds:['b'],leaderParticipates:true,sessionId:'12345678-1234-4234-8234-123456789012',doses:{'movement-1':{a:{variant:'50cm',loadKg:null},b:{variant:'40cm',loadKg:null}}}}
let record=null,stored=null,t=0,revoked=false
const accessChecks=[]
const host={authorizeSession:async input=>{accessChecks.push(input);return input.actorId==='a'||input.actorId==='b'&&!revoked},authenticate:async credential=>({'auth-a':'a','auth-b':'b'}[credential]??null),readCoachContext:async actor=>({canCoach:actor==='a',eligibleMemberIds:['b']}),readWod:async id=>id==='wod'?wod:null,readCreation:async()=>record,createAtomic:async next=>{if(record)return false;record=next;stored=next.state;return true},read:async id=>stored?.plan.id===id?stored:null,compareAndSwap:async(id,rev,next)=>{if(stored?.revision!==rev||stored.plan.id!==id)return false;stored=next;return true},now:()=>t}
const dispatch=createSynchronDispatcher(host)
const runtime=(actor,credential)=>createSynchronRuntime({actorId:actor,invoke:body=>dispatch(credential,body)})
const a=runtime('a','auth-a'),b=runtime('b','auth-b'),x=runtime('x','bad')
assert.equal(createSynchronRuntime({actorId:'a'}),null)
assert.equal(synchronRouteIssue(a,'a'),null)
assert.ok(synchronRouteIssue(a,'b'))
assert.ok(synchronRouteIssue(a,'a',{localSessionOpen:true}))
assert.ok(synchronRouteIssue(null,'a'))
assert.ok((await b.create(request)).issue)
assert.ok((await dispatch('auth-b',{op:'create',request,actorId:'a'})).issue)
assert.equal(stored,null)
assert.equal((await a.create(request)).sessionId,request.sessionId)
assert.equal((await a.create(request)).duplicate,true)
assert.ok((await x.open(record.invitations[0].href)).issue)
assert.equal((await b.open(record.invitations[0].href)).snapshot.joined,false)
const ad=a.adapter(request.sessionId),bd=b.adapter(request.sessionId)
assert.equal(a.adapter('../foo'),null)
assert.equal((await bd.read()).snapshot.view.canStart,false)
assert.ok((await bd.command({type:'start',id:'bad',revision:0,memberId:'b'})).issue)
assert.ok((await dispatch('auth-b',{op:'snapshot',sessionId:request.sessionId,credential:'auth-a'})).issue)
assert.ok((await dispatch('auth-a',{op:'reserve',sessionId:request.sessionId})).issue)
assert.equal((await ad.command({type:'join',id:'j1',revision:0})).snapshot.joined,true)
assert.equal((await bd.command({type:'join',id:'j2',revision:1})).snapshot.joined,true)
assert.equal((await ad.command({type:'start',id:'start',revision:2,memberId:'a'})).snapshot.view.countdown,10)
t=15000
assert.equal((await bd.read()).snapshot.view.canTakeover,true)
assert.equal((await bd.command({type:'takeover',id:'swap',revision:3})).snapshot.view.active,2)
assert.equal((await ad.read()).snapshot.view.active,2)
assert.ok((await createSynchronRuntime({actorId:'a',invoke:async()=>({snapshot:{sessionId:'wrong'}})}).readSnapshot(request.sessionId)).issue)
assert.ok((await createSynchronRuntime({actorId:'a',invoke:async()=>({sessionId:'wrong'})}).create(request)).issue)
assert.ok((await dispatch('auth-a',{op:'snapshot',sessionId:'missing'})).issue)
assert.ok((await dispatch('auth-a',null)).issue)
assert.ok((await dispatch('auth-a',{op:'unknown',sessionId:request.sessionId})).issue)

// Fresh access is checked on every read and command, even for a joined member.
revoked=true
const rev=stored.revision
assert.ok((await bd.read()).issue)
assert.ok((await bd.command({type:'idle',id:'revoked',revision:rev})).issue)
assert.equal(stored.revision,rev)
assert.ok((await ad.read()).snapshot)
assert.ok(accessChecks.some(x=>x.actorId==='b'&&x.operation==='command'))
assert.ok(accessChecks.some(x=>x.actorId==='b'&&x.operation==='snapshot'))
const incomplete=createSynchronDispatcher({...host,authorizeSession:undefined})
assert.ok((await incomplete('auth-a',{op:'snapshot',sessionId:request.sessionId})).issue)
assert.ok((await incomplete('auth-a',{op:'create',request})).issue)
const deniedHost=createSynchronDispatcher({...host,authorizeSession:async()=>({allowed:true})})
assert.ok((await deniedHost('auth-a',{op:'snapshot',sessionId:request.sessionId})).issue)

// Server-side discovery is explicit, scoped and fail-closed. No session ID is supplied by the browser.
const discoveryHost={...host,authorizeDiscovery:async actor=>actor==='a'||actor==='b'&&!revoked,readActiveSession:async actor=>stored&&(stored.plan.leaderId===actor||stored.joined.includes(actor))?stored.plan.id:null}
const discoverDispatch=createSynchronDispatcher(discoveryHost)
const discoveryRuntime=(actor,credential,invoke=body=>discoverDispatch(credential,body))=>createSynchronRuntime({actorId:actor,invoke,discoveryEnabled:true})
assert.equal(a.discover,undefined)
assert.ok((await discoveryRuntime('b','auth-b').discover()).issue)
assert.ok((await discoveryRuntime('x','bad').discover()).issue)
assert.equal((await discoveryRuntime('a','auth-a').discover()).active.sessionId,request.sessionId)
revoked=false
assert.equal((await discoveryRuntime('b','auth-b').discover()).active.participantSlot,2)
assert.ok((await discoverDispatch('auth-b',{op:'discover',actorId:'a'})).issue)
assert.ok((await discoverDispatch('auth-b',{op:'discover',sessionId:request.sessionId})).issue)
assert.ok((await dispatch('auth-a',{op:'discover'})).issue)
for(const value of [undefined,'wrong-id',[],{sessionId:request.sessionId}])assert.ok((await createSynchronDispatcher({...discoveryHost,readActiveSession:async()=>value})('auth-a',{op:'discover'})).issue)
assert.deepEqual(await createSynchronDispatcher({...discoveryHost,readActiveSession:async()=>null})('auth-a',{op:'discover'}),{active:null})
assert.ok((await createSynchronDispatcher({...discoveryHost,readActiveSession:async()=>{throw Error('network')}})('auth-a',{op:'discover'})).issue)
assert.ok((await createSynchronDispatcher({...discoveryHost,authorizeDiscovery:async()=>false})('auth-a',{op:'discover'})).issue)
assert.ok((await discoveryRuntime('a','auth-a',async()=>({active:undefined})).discover()).issue)
assert.ok((await discoveryRuntime('a','auth-a',async()=>({active:{sessionId:request.sessionId,view:{phase:'finished'}}})).discover()).issue)
assert.ok((await discoveryRuntime('a','auth-a',async()=>{throw Error('network')}).discover()).issue)
assert.deepEqual(await discoveryRuntime('a','auth-a',async()=>({active:null})).discover(),{active:null})
const beforeDiscovery=stored
assert.equal((await discoveryRuntime('a','auth-a').discover()).active.revision,stored.revision)
assert.equal(stored,beforeDiscovery)
