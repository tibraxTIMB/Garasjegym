import test from 'node:test'
import assert from 'node:assert/strict'
import {ACTIVE_WOD_LEVELS,resultPlan,fillResultPlan,editPlannedSet,refreshResultPlan,clearUnfinishedPlan} from '../src/lib/compactWorkout.js'
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
