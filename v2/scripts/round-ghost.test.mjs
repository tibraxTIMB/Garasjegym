import assert from 'node:assert/strict'
import {ghostSignature,findRoundGhost,ghostPace} from '../src/lib/roundGhost.js'
const items=[{exercise_id:'a',levels:{rx:{reps:10,loadKg:20},scaled:{reps:5}}},{exercise_id:'b',levels:{rx:{reps:8}}}]
const config={wodId:'w',format:'AMRAP',level:'rx',seconds:600,parts:[{format:'AMRAP',seconds:600,items}]}
const sig=ghostSignature(config)
assert.ok(sig)
assert.equal(ghostSignature({...config,level:'scaled'}),null)
assert.equal(ghostSignature({...config,seconds:601}),null)
assert.equal(ghostSignature({...config,schema:{samspel:{}}}),null)
assert.equal(ghostSignature({...config,schema:{wod_engine:{participation:'partner'}}}),null)
assert.equal(ghostSignature({...config,parts:[{...config.parts[0],items:[...items].reverse()}]})===sig,false)
assert.equal(ghostSignature({...config,parts:[{...config.parts[0],items:[{...items[0],levels:{rx:{reps:11}}},items[1]]}]})===sig,false)
const log={id:'prior',workout_date:'2026-11-25',score_rounds:3,result_data:{ghost_signature:sig,completed:true,elapsed_seconds:600,split_seconds:[120,140,160]}}
assert.deepEqual(findRoundGhost([log],sig),{id:'prior',date:'2026-11-25',splits:[120,140,160]})
assert.equal(findRoundGhost([{...log,score_rounds:4}],sig),null)
assert.equal(findRoundGhost([{...log,result_data:{...log.result_data,manual_entry:true}}],sig),null)
assert.equal(findRoundGhost([{...log,result_data:{...log.result_data,elapsed_seconds:400}}],sig),null)
assert.equal(findRoundGhost([{...log,result_data:{...log.result_data,split_seconds:[120,-1,160]}}],sig),null)
assert.equal(findRoundGhost([{...log,result_data:{...log.result_data,ghost_signature:null}}],sig),null)
const ghost=findRoundGhost([log],sig)
assert.deepEqual(ghostPace(ghost,[110],130),{ghostRounds:1,ownRounds:1,delta:-10})
assert.deepEqual(ghostPace(ghost,[130,150],280),{ghostRounds:2,ownRounds:2,delta:20})
assert.deepEqual(ghostPace(ghost,[100,100,100,100],400),{ghostRounds:2,ownRounds:4,delta:null})
assert.deepEqual(ghostPace(ghost,[],0),{ghostRounds:0,ownRounds:0,delta:null})
assert.equal(ghostPace(null,[],0),null)
console.log('18 round ghost checks passed')
