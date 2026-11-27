import test from 'node:test'
import assert from 'node:assert/strict'
import {isUsablePerformedSet,recordedSetsWithStatus} from '../src/lib/performanceEvidence.js'
import {labWod,labPlan,tabletDockGeometry} from '../src/lib/tabletLabProtocol.js'
test('unrecognized or contradictory execution status cannot be personal performance',()=>{
 for(const v of [null,undefined,''])assert.equal(isUsablePerformedSet({flow_status:v}),true)
 for(const v of ['done','skipped','partial','unknown',false])assert.equal(isUsablePerformedSet({flow_status:v}),false)
 for(const v of ['partial','failed','unknown',false])assert.equal(isUsablePerformedSet({complex_status:v}),false)
 assert.equal(isUsablePerformedSet({complex_status:'complete'}),true)
 for(const [stored,metadata] of [[{complex_status:'failed'},{complex_status:'complete'}],[{flow_status:'done'},{flow_status:''}],[{}, {flow_status:'skipped'}],[{complex_status:'complete'},{complex_status:'partial'}]]){
 const rows=recordedSetsWithStatus({exercise_name:'Squat',workout_sets:[stored]},{exercise_name:'Squat',sets:[metadata]})
 assert.equal(isUsablePerformedSet(rows[0]),false)
 }
})
const wod={name:'Squat',format:'AMRAP',timer_settings:{workout_schema:{items:[{exercise_id:'squat',exercise_name:'Squat',reps:10}]}}}
test('lab rejects nested private data, preserves valid planning schema',()=>{
 assert.deepEqual(labWod(wod).timer_settings,wod.timer_settings)
 for(const key of ['member_id','memberId','result_data','saveToken','participantscores','email','workout_log_id','access_token']){
 const invalid={...wod,timer_settings:{...wod.timer_settings,workout_schema:{items:[{exercise_name:'Squat',[key]:'private'}]}}}
 assert.throws(()=>labWod(invalid),/planleggingsdata/)
 assert.throws(()=>labPlan({title:'Plan',sessions:[{week_no:1,day_no:1,title:'Squat',estimated_minutes:20,wod_id:'w',workout_snapshot:{...invalid,wod_title:'Squat'}}]}),/planleggingsdata/)
 }
})
test('dock remains positive and reachable after shrinking viewport',()=>{
 const g=tabletDockGeometry({width:800,height:1280,scale:.55,viewportWidth:320,viewportHeight:120,position:{left:1000,top:800}})
 assert.ok(g.fit>0);assert.deepEqual(g.position,{left:200,top:72})
 assert.ok(g.fit*1280<=1)
 const desktop=tabletDockGeometry({width:800,height:1280,scale:.55,viewportWidth:1920,viewportHeight:1080})
 assert.equal(desktop.fit,.55);assert.equal(desktop.position,null)
})
