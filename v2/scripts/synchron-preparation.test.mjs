import assert from 'node:assert/strict'
import {synchronWodTargets,prepareSynchronLobby,parseSynchronInvitation} from '../src/lib/synchronPreparation.js'
const wod={id:'wod-1',name:'Four Fronts',format:'Chipper',is_published:true,timer_settings:{workout_schema:{items:[['step','Box step-ups',{reps:100}],['hang','Dead hang',{durationSeconds:180}],['wall','Wall ball shots',{reps:150}],['row','Row',{distanceMeters:2000}],['cal','Cal row',{calories:60}]].map(([exercise_id,exercise_name,rx])=>({exercise_id,exercise_name,levels:{rx}}))}}}
const rows=synchronWodTargets(wod).rows
assert.deepEqual(rows.map(r=>r.unit),['reps','seconds','reps','meters','calories'])
assert.deepEqual(rows.map(r=>r.target),[100,180,150,2000,60])
assert.ok(synchronWodTargets(wod,'scaled').issue)
assert.ok(synchronWodTargets({...wod,format:'AMRAP'}).issue)
const alter=patch=>({...wod,timer_settings:{workout_schema:{items:[{...wod.timer_settings.workout_schema.items[0],...patch}]}}})
for(const patch of [{is_rest:true},{is_complex:true},{side_mode:'per_side'},{exercise_id:null},{levels:{rx:{reps:10,durationSeconds:30}}},{levels:{rx:{reps:10,sets:2}}},{levels:{rx:{reps:1.5}}},{levels:{rx:{reps:-1}}},{levels:{rx:{reps:true}}},{levels:{rx:{reps:10,sets:1.5}}}])assert.ok(synchronWodTargets(alter(patch)).issue)
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
for(const patch of [{memberIds:['b','b']},{memberIds:['outsider']},{memberIds:['pt']},{leaderParticipates:false},{doses:{}},{sessionId:'bad/id'},{wod:{...wod,is_published:false}},{wod:{...wod,is_archived:true}}])assert.ok(prepareSynchronLobby({...args,...patch},ctx).issue)
assert.ok(prepareSynchronLobby(args,{...ctx,canCoach:false}).issue)
assert.ok(prepareSynchronLobby(args,{...ctx,eligibleMemberIds:[]}).issue)
for(const x of ['https://example.com','synchron-session:','synchron-session:../abc','synchron-session:__proto__'])assert.equal(parseSynchronInvitation(x),null)

assert.ok(synchronWodTargets({...wod,timer_settings:{workout_schema:{...wod.timer_settings.workout_schema,time_cap_seconds:1200}}}).issue)

import {prepareSynchronPairedPlan} from '../src/lib/synchronPreparation.js'
import {synchronPlanIssue} from '../src/lib/synchron.js'
const pairedItems=['Bench press','Dips','Air squat'].map((exercise_name,i)=>({exercise_id:'exercise-'+i,exercise_name,levels:{rx:{reps:6,loadMode:'kg'},scaled:{reps:4,loadMode:'bodyweight'},foundation:{reps:2,loadMode:'bodyweight'}}}))
const pairedSchema={format:'EMOM',duration_seconds:1080,interval:{work_every_seconds:60},items:pairedItems,samspel:{version:2,mode:'parallel_round_swap',main_track:'paired_emom',participant_count:2,individual_scores:true,switch_rule:'time',switch_seconds:60,duration_seconds:1080,tracks:pairedItems.map(x=>x.exercise_name)},wod_engine:{participation:'partner',collaboration:'you_go_i_go',participant_count:2}}
const pairedWod={id:'paired-wod',name:'Front Kommandant',format:'EMOM',is_published:true,timer_settings:{workout_schema:pairedSchema}}
const pairedDoses=Object.fromEntries(pairedItems.map((_,i)=>['movement-'+(i+1),{pt:{variant:'Standard',loadKg:30},b:{variant:'Tilpassa',loadKg:null}}]))
const pairedArgs={wod:pairedWod,memberIds:['b'],leaderParticipates:true,sessionId:'paired-session',levelsByMember:{pt:'rx',b:'scaled'},doses:pairedDoses}
const paired=prepareSynchronPairedPlan(pairedArgs,ctx)
assert.equal(paired.issue,undefined)
assert.deepEqual(paired.plan.members,['pt','b'])
assert.equal(paired.plan.mode,'paired_emom')
assert.equal(paired.plan.movements[0].doses.pt.plannedReps,18)
assert.equal(paired.plan.movements[0].doses.b.plannedReps,12)
assert.equal(paired.plan.movements[0].doses.b.plannedIntervals,3)
assert.equal(paired.plan.movements[0].doses.b.loadKg,null)
assert.ok(synchronPlanIssue(paired.plan)) // Never interpreted as Chipper.
assert.ok(prepareSynchronLobby(pairedArgs,ctx).issue) // Transport remains closed.
for(const patch of [{memberIds:['outsider']},{memberIds:['b','c']},{leaderParticipates:false},{levelsByMember:{pt:'rx',b:'intermediate'}},{doses:{}},{wod:{...pairedWod,is_published:false}}])assert.ok(prepareSynchronPairedPlan({...pairedArgs,...patch},ctx).issue)
assert.ok(prepareSynchronPairedPlan(pairedArgs,{...ctx,canCoach:false}).issue)
const changePaired=patch=>({...pairedWod,timer_settings:{workout_schema:{...pairedSchema,...patch}}})
for(const patch of [{duration_seconds:1020},{interval:{work_every_seconds:30}},{items:[{...pairedItems[0],minute_slot:'1'},...pairedItems.slice(1)]},{items:[{...pairedItems[0],levels:{rx:{reps:6},scaled:{reps:4,durationSeconds:30}}},...pairedItems.slice(1)]},{samspel:{...pairedSchema.samspel,tracks:['Dips','Bench press','Air squat']}}])assert.ok(prepareSynchronPairedPlan({...pairedArgs,wod:changePaired(patch)},ctx).issue)
console.log('SYNCHRON paired-plan preflight: trusted WOD, two approved participants, separate fixed doses and Chipper rejection passed')
