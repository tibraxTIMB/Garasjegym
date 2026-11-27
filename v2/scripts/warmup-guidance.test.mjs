import test from 'node:test'
import assert from 'node:assert/strict'
import {warmupGuidance,needsWarmupChoice} from '../src/lib/warmupGuidance.js'
test('warmup guidance adapts to known movement profiles without inventing dosage',()=>{
 const x=warmupGuidance({},[{name:'Back Squat'},{name:'Bench Press'},{name:'Unknown Movement'}])
 assert.equal(x.kind,'suggested')
 assert.ok(x.sections[1].names.some(x=>x.includes('hofte')))
 assert.ok(x.sections[1].names.some(x=>x.includes('skulder')))
 assert.equal(x.unknown,1)
 assert.deepEqual(x.sections[2].names,['Back Squat','Bench Press'])
 assert.equal(warmupGuidance({library_category:'rehab'},[]).kind,'none')
})
test('programmed warmup takes precedence over generic suggestions',()=>{
 const schema={composite_blocks:[{id:'a',title:'Oppvarming',flowPurpose:'prep'},{id:'b',title:'Styrke',flowPurpose:'perform'}]}
 const result=warmupGuidance(schema,[{blockId:'a',name:'Air Squat'},{blockId:'b',name:'Back Squat'}])
 assert.equal(result.kind,'planned')
 assert.deepEqual(result.sections[0].names,['Air Squat'])
 assert.equal(needsWarmupChoice({source:{timer_settings:{workout_schema:schema}}}),false)
})
test('warmup entry never interrupts active, retrospective, or shared class session',()=>{
 const source={timer_settings:{workout_schema:{items:[{exercise_name:'Back Squat'}]}}}
 assert.equal(needsWarmupChoice({source}),true)
 for(const patch of [{manualEntry:true},{classSessionId:'class'},{started:true},{accepted:true}])assert.equal(needsWarmupChoice({source,...patch}),false)
 assert.equal(needsWarmupChoice({}),false)
})
