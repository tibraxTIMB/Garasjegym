import assert from 'node:assert/strict'
import {claimWorkoutAction,releaseWorkoutAction} from '../src/lib/workoutDraft.js'
const lock={current:false}
assert.equal(claimWorkoutAction(lock),true)
assert.equal(claimWorkoutAction(lock),false)
assert.equal(lock.current,true)
releaseWorkoutAction(lock)
assert.equal(lock.current,false)
assert.equal(claimWorkoutAction(lock),true)
try{throw Error('cancel or fail')}catch{}finally{releaseWorkoutAction(lock)}
assert.equal(claimWorkoutAction(lock),true)
releaseWorkoutAction(lock)
assert.equal(claimWorkoutAction(null),false)
releaseWorkoutAction(null)
const attempts=[]
let resolve
const gate=new Promise(r=>{resolve=r})
async function action(name){
 if(!claimWorkoutAction(lock))return false
 try{await gate;attempts.push(name);return true}
 finally{releaseWorkoutAction(lock)}
}
const save=action('save')
assert.equal(await action('retry'),false)
assert.equal(await action('discard'),false)
resolve()
assert.equal(await save,true)
assert.deepEqual(attempts,['save'])
assert.equal(await action('discard'),true)
assert.deepEqual(attempts,['save','discard'])
console.log('13 workout action guard checks passed')
