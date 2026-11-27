import test from 'node:test'
import assert from 'node:assert/strict'
import {ACTIVE_WOD_LEVELS,resultPlan,fillResultPlan,editPlannedSet,refreshResultPlan,clearUnfinishedPlan,collaborationChoices,partnerExecutionIssue,partnerEmomSlot,partnerEmomCount,emomExerciseIndices} from '../src/lib/compactWorkout.js'
const blank=()=>({reps:'',load_kg:'',height_cm:'',flow_status:''})
const item=()=>({uses_load:true,prescription_levels:{rx:{reps:10,loadMode:'kg',loadKgMen:50,loadKgWomen:35},scaled:{reps:8,loadMode:'kg',loadKgMen:30,loadKgWomen:30},foundation:{reps:6,loadMode:'rir',rir:3}},sets:[blank(),blank(),blank()]})
test('three levels, explicit sex-specific weight choice, no guessed percentages/RIR',()=>{
 assert.deepEqual(ACTIVE_WOD_LEVELS.map(x=>x.id),['rx','scaled','foundation'])
 assert.deepEqual(resultPlan(item(),'rx').loads.map(x=>x.value),['50','35'])
 assert.equal(fillResultPlan(item(),'rx').sets[0].load_kg,'')
 assert.equal(fillResultPlan(item(),'rx','women').sets[0].load_kg,'35')
 assert.equal(fillResultPlan(item(),'scaled').sets[0].load_kg,'30')
 assert.equal(fillResultPlan(item(),'foundation').sets[0].load_kg,'')
 assert.equal(resultPlan(item(),'missing'),null)
})
test('plan fill respects edited values, completed set limit, completion-only rows and level changes',()=>{
 const filled=fillResultPlan(item(),'scaled',null,{count:2})
 assert.equal(filled.sets[2].reps,'')
 filled.sets[0]=editPlannedSet(filled.sets[0],{reps:'4',load_kg:'27.5'})
 const updated=refreshResultPlan(filled,'foundation')
 assert.equal(updated.sets[0].reps,'4')
 assert.equal(updated.sets[0].load_kg,'27.5')
 assert.equal(updated.sets[1].reps,'6')
 assert.equal(updated.sets[1].load_kg,'')
 assert.equal(clearUnfinishedPlan(updated,1).sets[1].reps,'')
 assert.equal(clearUnfinishedPlan(updated,0).sets[0].reps,'4')
 updated.sets[2].flow_status='done'
 assert.equal(fillResultPlan(updated,'rx','men').sets[2].reps,'')
})
test('18 minute three exercise YGIG: same exercise per pair, six physical rounds per exercise, three per participant',()=>{
 const rows=[{exercise_name:'Bench press'},{exercise_name:'Dips'},{exercise_name:'Third movement'}]
 const slots=Array.from({length:18},(_,i)=>partnerEmomSlot(i+1,3))
 assert.deepEqual(slots.slice(0,6),[{exerciseIndex:0,worker:1,resting:2},{exerciseIndex:0,worker:2,resting:1},{exerciseIndex:1,worker:1,resting:2},{exerciseIndex:1,worker:2,resting:1},{exerciseIndex:2,worker:1,resting:2},{exerciseIndex:2,worker:2,resting:1}])
 assert.deepEqual(emomExerciseIndices(rows,2,{partner:true}),[0])
 assert.deepEqual(emomExerciseIndices(rows,3,{partner:true}),[1])
 for(let exerciseIndex=0;exerciseIndex<3;exerciseIndex++)for(const worker of [1,2])assert.equal(partnerEmomCount({slots:18,exerciseIndex,exerciseCount:3,worker}),3)
 assert.equal(partnerEmomCount({slots:1,exerciseIndex:0,exerciseCount:3,worker:1}),1)
 assert.equal(partnerEmomCount({slots:1,exerciseIndex:0,exerciseCount:3,worker:2}),0)
 assert.equal(partnerEmomCount({slots:8,exerciseIndex:1,exerciseCount:3,worker:1}),1)
 assert.deepEqual(emomExerciseIndices([{minute_slot:'2'},{minute_slot:'2'}],2),[0,1])
})
test('only timer-supported partner modes; reject unmatched pairs and ambiguous custom slot schedule',()=>{
 assert.deepEqual(collaborationChoices('EMOM','partner'),['you_go_i_go','synchronized'])
 assert.deepEqual(collaborationChoices('Strength','partner'),[])
 assert.deepEqual(collaborationChoices('EMOM','team'),['synchronized'])
 assert.ok(!collaborationChoices('AMRAP','partner').includes('you_go_i_go'))
 const plan={format:'EMOM',participation:'partner',collaboration:'you_go_i_go',durationSeconds:1080,intervalSeconds:60,items:[{},{},{}]}
 assert.equal(partnerExecutionIssue(plan),null)
 assert.ok(partnerExecutionIssue({...plan,durationSeconds:1020}))
 assert.ok(partnerExecutionIssue({...plan,items:[{minuteSlot:'1'}]}))
 assert.ok(partnerExecutionIssue({...plan,items:[{is_rest:true}]}))
 assert.ok(partnerExecutionIssue({...plan,format:'Strength'}))
 assert.equal(partnerExecutionIssue({...plan,format:'AMRAP',samspel:{mode:'parallel_round_swap'}}),null)
})
