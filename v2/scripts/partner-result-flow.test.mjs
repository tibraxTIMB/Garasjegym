import test from 'node:test'
import assert from 'node:assert/strict'
import {collaborationOptions,emomActiveIndices,emomScheduledCount,emomPartnerInstruction,plannedResultDose,fillPlannedResult} from '../src/lib/partnerResultFlow.js'
const engine={participation:'partner',collaboration:'you_go_i_go'}
const movements=[{exercise_name:'Bench press'},{exercise_name:'Dips'},{exercise_name:'Row'}]
test('YGIG E1MOM 18: both athletes work each exercise before changing',()=>{
 const schedule=Array.from({length:18},(_,i)=>emomActiveIndices(movements,i+1,engine)[0])
 assert.deepEqual(schedule,[0,0,1,1,2,2,0,0,1,1,2,2,0,0,1,1,2,2])
 for(let i=0;i<3;i++)assert.equal(emomScheduledCount(movements,i,18,engine),6)
 assert.deepEqual(emomPartnerInstruction(engine,1),{work:'P1 · arbeid',rest:'P2 · kvile'})
 assert.deepEqual(emomPartnerInstruction(engine,2),{work:'P2 · arbeid',rest:'P1 · kvile'})
 assert.deepEqual(emomActiveIndices(movements,2,{participation:'individual'}),[1])
})
test('explicit slots are not rewritten, unsupported combinations are not offered',()=>{
 assert.deepEqual(emomActiveIndices([{minute_slot:'1,3'},{minute_slot:'2'}],2,engine),[1])
 assert.deepEqual(emomActiveIndices([{minute_slot:'1,3'},{minute_slot:'2'}],4,engine),[])
 assert.ok(collaborationOptions('EMOM','partner').some(x=>x.value==='you_go_i_go'))
 assert.ok(!collaborationOptions('EMOM','partner').some(x=>x.value==='free_split'))
 assert.ok(!collaborationOptions('Strength','partner').length)
 assert.ok(!collaborationOptions('EMOM','team').some(x=>x.value==='you_go_i_go'))
})
test('exact level and explicit load selection fill only empty measured fields',()=>{
 const item={uses_load:true,prescription_levels:{rx:{reps:10,loadMode:'kg',loadKgMen:50,loadKgWomen:35},scaled:{reps:6,loadMode:'kg',loadKgMen:30,loadKgWomen:30},foundation:{reps:4,loadMode:'rir',rir:3}},sets:[{reps:'5',load_kg:''},{reps:'',load_kg:'12.5'},{reps:'',load_kg:'',flow_status:'done'}]}
 assert.deepEqual(plannedResultDose(item,'rx'),{reps:'10'})
 assert.deepEqual(plannedResultDose(item,'rx','women'),{reps:'10',load_kg:'35'})
 assert.deepEqual(plannedResultDose(item,'foundation'),{reps:'4'})
 assert.deepEqual(plannedResultDose(item,'unknown'),{})
 assert.deepEqual(fillPlannedResult(item,'scaled').sets,[{reps:'5',load_kg:'30'},{reps:'6',load_kg:'12.5'},item.sets[2]])
 assert.deepEqual(item.sets[0],{reps:'5',load_kg:''})
 assert.deepEqual(plannedResultDose({...item,reps_mode:'amrap'},'rx'),{})
})
