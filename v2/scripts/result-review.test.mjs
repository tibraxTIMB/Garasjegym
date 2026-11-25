import test from 'node:test'
import assert from 'node:assert/strict'
import {exerciseResultReview} from '../src/lib/resultReview.js'
test('blank, partial, actual and prefilled review states are distinct',()=>{
 const exercise={exercise_name:'Deadlift',uses_load:true,sets:[{reps:'5',load_kg:''}]}
 assert.equal(exerciseResultReview(exercise,true).status,'partial')
 assert.equal(exerciseResultReview({...exercise,sets:[{reps:'',load_kg:''}]}).status,'missing')
 const full={...exercise,sets:[{reps:'5',load_kg:'60'},{reps:'5',load_kg:'60'}]}
 assert.equal(exerciseResultReview(full,true).summary,'2 × 5 reps · 60 kg')
 assert.equal(exerciseResultReview({...full,prescribed_sets_prefilled:true}).status,'unconfirmed')
 assert.equal(exerciseResultReview({...full,prescribed_sets_prefilled:true},true).status,'recorded')
 assert.equal(exerciseResultReview({exercise_name:'Row',rowValue:'',rowUnit:'m'}).status,'missing')
 assert.equal(exerciseResultReview({exercise_name:'Row',rowValue:'500',rowUnit:'m'}).summary,'500 m')
})


test('completion-only group and sets are not missing measurements',()=>{
 const item={exercise_name:'Clean',uses_load:true,sets:[{reps:'',load_kg:''}]}
 assert.equal(exerciseResultReview(item,false,false,'done').status,'completion')
 assert.equal(exerciseResultReview(item,false,false,'partial').label,'Delvis utført')
 assert.equal(exerciseResultReview(item,false,false,'skipped').label,'Ikkje utført')
 assert.equal(exerciseResultReview({...item,sets:[{flow_status:'done'}]}).status,'completion')
 const mixed=exerciseResultReview({...item,sets:[{flow_status:'done'},{reps:'5',load_kg:'42.5'}]},true)
 assert.equal(mixed.status,'recorded');assert.match(mixed.summary,/42\.5 kg/)
 const missing=exerciseResultReview({...item,sets:[{flow_status:'done'},{reps:'',load_kg:''}]},true)
 assert.equal(missing.status,'partial')
})

import {collectResultIssues,resultIssueLabel} from '../src/lib/resultValidation.js'
test('FLOW corrections identify the exact part, exercise and set without requiring optional results',()=>{
 const items=[{exercise_name:'Clean',block_id:'d',sets:[{reps:'5',load_kg:'40'},{reps:'2.5',load_kg:'-3'},{flow_status:'done'}]},{exercise_name:'Squat',sets:[{}]}]
 const schema={composite_blocks:[{id:'d',title:'Del D',format:'EMOM'}]}
 const issues=collectResultIssues({items,schema,format:'Samansett økt'})
 assert.equal(issues.length,2);assert.equal(issues[0].setIndex,1);assert.equal(issues[0].field,'reps');assert.equal(resultIssueLabel(issues[0]),'Del D · Clean · Sett 2');assert.equal(issues[1].field,'load_kg')
 assert.deepEqual(collectResultIssues({items:[{exercise_name:'Clean',sets:[{flow_status:'done'},{reps:'5',load_kg:''}]}]}),[])
})
test('FLOW corrections distinguish optional scores from invalid or incomplete entries',()=>{
 const blocks=[{id:'c',title:'Del C',format:'AMRAP'},{id:'d',title:'Del D',format:'For Time'}]
 const issues=collectResultIssues({blocks,manualLibraryEntry:true,blockScores:{c:{extraReps:'3'},d:{time:'02:99'}}})
 assert.deepEqual(issues.map(i=>[i.blockId,i.field]),[['c','rounds'],['d','time']])
 assert.deepEqual(collectResultIssues({blocks,blockScores:{}}),[])
})
