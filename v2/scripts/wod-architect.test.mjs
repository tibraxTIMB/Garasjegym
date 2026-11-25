import test from 'node:test'
import assert from 'node:assert/strict'
import {architectCardItem,architectDose,architectSections,architectDoseIssue,hydrateArchitectLevels} from '../src/lib/wodArchitect.js'
import {cardDose,cardParts} from '../src/lib/wodCard.js'
import {flowReporting} from '../src/lib/workoutFlow.js'
import {readFileSync} from 'node:fs'
test('builder dose and persisted card use the same format for strength',()=>{
 const row={key:'x',name:'Markløft',blockId:'b',levels:{rx:{sets:'3',reps:'5',loadMode:'rir',rirRange:'4–6'}}}
 assert.equal(architectDose(row),'3 × 5 · RIR 4–6')
 assert.equal(architectDose(row),cardDose(architectCardItem(row),'rx',true))
})
test('ordinary movements with empty complex steps remain ordinary and can use time instead of reps',()=>{
 const row={name:'Dead bug',is_complex:false,complex_steps:[],levels:{rx:{reps:'8'}}}
 assert.equal(architectCardItem(row).is_complex,false)
 assert.equal(architectDoseIssue(row),null)
 assert.equal(architectDoseIssue({name:'Hold',levels:{rx:{reps:'',durationSeconds:'45'}}},{metric:'time'}),null)
 assert.match(architectDoseIssue({name:'Hold',levels:{rx:{reps:''}}},{metric:'time'}),/varigheit/)
})
test('interval max reps does not require a prescribed fixed rep target',()=>{
 const row={name:'Thruster',repsMode:'amrap',levels:{rx:{reps:''}}}
 assert.equal(architectDoseIssue(row,{timed:true}),null)
 assert.match(architectDose(row),/Maks reps/)
})
test('section ordering and reporting follow shared Flow and card semantics',()=>{
 const blocks=[{id:'a',title:'Oppvarming',format:'Eigen økt',minutes:8,flowPurpose:'prep'},{id:'b',title:'AMRAP',format:'AMRAP',minutes:8,flowPurpose:'perform'}]
 const items=[{name:'Bird dog',blockId:'a'},{name:'Thruster',blockId:'b'}]
 const live=architectSections(blocks,items,{composite:true})
 const saved=cardParts({format:'Samansett økt',timer_settings:{workout_schema:{composite_blocks:blocks,items:items.map(architectCardItem)}}})
 assert.deepEqual(live.map(p=>p.id),saved.map(p=>p.id))
 assert.deepEqual(live.map(p=>p.reporting),saved.map(p=>p.reporting))
 assert.equal(live[0].reporting,'done')
 assert.equal(live[1].reporting,flowReporting(blocks[1]))
})
test('legacy set prescription hydrates without guessing a complex or losing load',()=>{
 const d=hydrateArchitectLevels({sets:[{reps:5,load_mode:'kg',load_kg:30},{reps:5,load_mode:'kg',load_kg:30}]},{rx:{reps:'',sets:'',loadMode:'none'}})
 assert.equal(d.rx.reps,'5');assert.equal(d.rx.sets,'2');assert.equal(d.rx.loadKg,'30')
})
test('PT copy is private, scoped and preserves original WOD and program title',()=>{
 const studio=readFileSync(new URL('../src/components/PTStudio.jsx',import.meta.url),'utf8')
 assert.match(studio,/copyMode planContext=\{planEditor\}/)
 assert.match(studio,/ctx\.clientId!==clientId/)
 assert.match(studio,/eq\('wod_id',ctx\.wodId\)\.eq\('status','planned'\)/)
 assert.match(studio,/is_published:false/)
 assert.match(studio,/update\(\{wod_id:draftId,workout_snapshot:snapshot\}\)/)
})
