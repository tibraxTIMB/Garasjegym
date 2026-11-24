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
