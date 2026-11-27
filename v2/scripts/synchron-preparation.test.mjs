import assert from 'node:assert/strict'
import {synchronWodTargets,prepareSynchronLobby,parseSynchronInvitation} from '../src/lib/synchronPreparation.js'
const wod={id:'wod-1',name:'Four Fronts',format:'Chipper',is_published:true,timer_settings:{workout_schema:{items:[['step','Box step-ups',{reps:100}],['hang','Dead hang',{durationSeconds:180}],['wall','Wall ball shots',{reps:150}],['row','Row',{distanceMeters:2000}],['cal','Cal row',{calories:60}]].map(([exercise_id,exercise_name,rx])=>({exercise_id,exercise_name,levels:{rx}}))}}}
const rows=synchronWodTargets(wod).rows
assert.deepEqual(rows.map(r=>r.unit),['reps','seconds','reps','meters','calories'])
assert.deepEqual(rows.map(r=>r.target),[100,180,150,2000,60])
assert.ok(synchronWodTargets(wod,'scaled').issue)
assert.ok(synchronWodTargets({...wod,format:'AMRAP'}).issue)
const alter=patch=>({...wod,timer_settings:{workout_schema:{items:[{...wod.timer_settings.workout_schema.items[0],...patch}]}}})
for(const patch of [{is_rest:true},{is_complex:true},{side_mode:'per_side'},{exercise_id:null},{levels:{rx:{reps:10,durationSeconds:30}}},{levels:{rx:{reps:10,sets:2}}},{levels:{rx:{reps:1.5}}},{levels:{rx:{reps:-1}}}])assert.ok(synchronWodTargets(alter(patch)).issue)
const doses=Object.fromEntries(rows.map(r=>[r.id,{pt:{variant:'Standard',loadKg:9},b:{variant:'Tilpassa',loadKg:4},c:{variant:'Standard',loadKg:null}}]))
const args={wod,memberIds:['b'],leaderParticipates:true,doses,sessionId:'session-1'}
const ctx={actorId:'pt',canCoach:true,eligibleMemberIds:['b','c']}
const r=prepareSynchronLobby(args,ctx)
assert.equal(r.issue,undefined)
assert.deepEqual(r.state.plan.members,['pt','b'])
assert.equal(r.state.phase,'ready')
assert.equal(r.state.plan.movements[2].doses.b.loadKg,4)
assert.equal(r.invitations.length,1)
assert.equal(r.invitations[0].recipientId,'b')
assert.equal(parseSynchronInvitation(r.invitations[0].href),'session-1')
assert.equal(r.state.plan.sourceWodId,'wod-1')
assert.equal(r.state.joined.length,0)
assert.equal(prepareSynchronLobby({...args,memberIds:['b','c'],leaderParticipates:false},ctx).state.plan.leaderId,'pt')
assert.deepEqual(prepareSynchronLobby({...args,memberIds:['b','c'],leaderParticipates:false},ctx).state.plan.members,['b','c'])
for(const patch of [{memberIds:['b','b']},{memberIds:['outsider']},{memberIds:['pt']},{leaderParticipates:false},{doses:{}},{wod:{...wod,is_published:false}},{wod:{...wod,is_archived:true}}])assert.ok(prepareSynchronLobby({...args,...patch},ctx).issue)
assert.ok(prepareSynchronLobby(args,{...ctx,canCoach:false}).issue)
assert.ok(prepareSynchronLobby(args,{...ctx,eligibleMemberIds:[]}).issue)
for(const x of ['https://example.com','synchron-session:','synchron-session:../abc','synchron-session:__proto__'])assert.equal(parseSynchronInvitation(x),null)
