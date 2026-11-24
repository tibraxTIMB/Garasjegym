import test from 'node:test'
import assert from 'node:assert/strict'
import {deleteWorkoutAndLinkedRecords} from '../src/lib/deleteWorkout.js'
function db({logError=null,cleanupError=null,linked=['a']}={}){
 const calls=[]
 const client={from(table){const q={table,op:'select',filters:[]};const chain={select(){return chain},delete(){q.op='delete';return chain},eq(k,v){q.filters.push([k,v]);return chain},in(k,v){q.filters.push([k,v]);return chain},is(k,v){q.filters.push([k,v]);return chain},maybeSingle(){return chain},then(resolve){calls.push(q);return Promise.resolve(q.table==='workout_logs'?{data:logError?null:{id:'log'},error:logError}:q.op==='delete'?{data:linked.map(id=>({id})),error:cleanupError}:{data:linked.map(id=>({id})),error:null}).then(resolve)}};return chain}}
 return {client,calls}
}
test('delete only selected member log and the previously linked PR IDs',async()=>{
 const {client,calls}=db()
 const result=await deleteWorkoutAndLinkedRecords(client,'log','me')
 assert.equal(result.cleanupError,null)
 assert.deepEqual(result.linkedIds,['a'])
 assert.deepEqual(calls[0].filters,[['member_id','me'],['workout_log_id','log']])
 assert.deepEqual(calls[1].filters,[['id','log'],['member_id','me']])
 assert.deepEqual(calls[2].filters,[['member_id','me'],['id',['a']],['workout_log_id',null]])
})
test('if the log deletion fails no PR is removed',async()=>{
 const {client,calls}=db({logError:Error('blocked')})
 await assert.rejects(deleteWorkoutAndLinkedRecords(client,'log','me'),/blocked/)
 assert.equal(calls.length,2)
})
test('a cleanup failure is reported, rather than claiming all records were deleted',async()=>{
 const {client}=db({cleanupError:Error('blocked')})
 const result=await deleteWorkoutAndLinkedRecords(client,'log','me')
 assert.equal(result.deleted,true);assert.equal(result.cleanupError,'blocked')
})
