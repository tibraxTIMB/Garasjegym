import assert from 'node:assert/strict'
import {samspelConfig,samspelIssue,samspelRoles,samspelResultIssue,samspelScoring,samspelWithCount,samspelRoundInstruction} from '../src/lib/samspel.js'
const legacy={version:1,mode:'parallel_round_swap',task:'row',metric:'distance'}
const context={format:'AMRAP',participation:'partner',collaboration:'parallel',items:[{name:'Push-up'}]}
assert.equal(samspelConfig({samspel:legacy}),legacy)
assert.deepEqual(samspelRoles(legacy,0),['Romaskin','AMRAP'])
assert.deepEqual(samspelRoles(legacy,1),['AMRAP','Romaskin'])
assert.equal(samspelIssue(legacy,context),null)
assert.equal(samspelConfig(null),null)
assert.equal(samspelWithCount(legacy,9),null)
for(let count=2;count<=8;count++){
 const config=samspelWithCount(legacy,count)
 assert.equal(samspelConfig({samspel:config}),config)
 assert.equal(samspelIssue(config,{...context,participation:count===2?'partner':'team',participantCount:count}),null)
 const sequence=Array.from({length:count},(_,i)=>samspelRoles(config,i))
 assert.deepEqual(sequence.map(roles=>roles.indexOf('Romaskin')),Array.from({length:count},(_,i)=>i))
 assert.equal(sequence.every(roles=>roles.length===count&&roles.filter(x=>x==='AMRAP').length===count-1),true)
 assert.deepEqual(samspelRoles(config,count),sequence[0])
 assert.deepEqual(samspelRoles(config,Infinity),sequence[0])
}
const team=samspelWithCount(legacy,4)
assert.ok(samspelIssue(team,context))
assert.ok(samspelIssue(team,{...context,participation:'team',participantCount:3}))
assert.ok(samspelIssue(team,{...context,participation:'team',participantCount:4,format:'EMOM'}))
assert.ok(samspelIssue(team,{...context,participation:'team',participantCount:4,items:[]}))
assert.ok(samspelRoundInstruction(team).includes('Alle'))
assert.equal(samspelResultIssue(team,0),null)
assert.ok(samspelResultIssue(team,''))
assert.deepEqual(samspelScoring(team,{}),{type:'multi',fields:['rounds_reps','distance']})
console.log('Samspel rotation checks passed')
