import assert from 'node:assert/strict'
import {startupDeadline} from '../src/lib/startupDeadline.js'
let trigger,cleared=0
const opts={ms:10000,schedule:(fn,ms)=>{assert.equal(ms,10000);trigger=fn;return 1},cancel:id=>{assert.equal(id,1);cleared++}}
assert.equal(await startupDeadline(()=>Promise.resolve('session'),opts),'session')
assert.equal(cleared,1)
await assert.rejects(startupDeadline(()=>{throw Error('network')},opts),/network/)
let finish
const late=startupDeadline(()=>new Promise(resolve=>{finish=resolve}),opts)
await Promise.resolve()
trigger()
await assert.rejects(late,/svarar ikkje/)
finish('late')
await Promise.resolve()
await Promise.resolve()
assert.equal(cleared,3)
console.log('Startup deadline regression passed')
