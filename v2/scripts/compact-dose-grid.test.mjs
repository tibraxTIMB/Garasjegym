import test from 'node:test'
import assert from 'node:assert/strict'
import {compactDoseRows,doseKeyAllowed} from '../src/lib/compactDoseRows.js'
import {flowKeyValue} from '../src/lib/flowKeypad.js'
const row=(ex,dose,metric=null,fields={})=>({ex:{key:'a',name:'Test',...ex},dose,metric,fields})
test('shared reps and independent male/female weight, decimal input',()=>{
 const [r]=compactDoseRows([row({}, {reps:'12',loadMode:'kg',loadKgMen:'20',loadKgWomen:'15'},null,{load:true})],'rx')
 assert.deepEqual(r.cells.map(x=>x.id),['reps','men','women'])
 assert.deepEqual(r.cells[1].patch('22.5'),{loadMode:'kg',loadKgMen:'22.5',loadKg:''})
 assert.deepEqual(r.cells[2].patch('12.5'),{loadMode:'kg',loadKgWomen:'12.5',loadKg:''})
 assert.equal(flowKeyValue('20','1',{decimal:true,fresh:true}),'1')
 assert.equal(flowKeyValue('12',',',{decimal:true}),'12.')
 assert.equal(doseKeyAllowed('2001',r.cells[1]),false)
})
test('metric and load semantics are unchanged',()=>{
 assert.deepEqual(compactDoseRows([row({}, {durationSeconds:'30'},'time')],'rx')[0].cells.map(x=>x.id),['time'])
 assert.deepEqual(compactDoseRows([row({}, {reps:'8',loadMode:'rir',rirRange:'2–4'},null,{load:true})],'rx')[0].cells.map(x=>x.id),['reps'])
 const [r]=compactDoseRows([row({rowUnit:'min',rowValue:'2'}, {},'rowing')],'rx')
 assert.equal(r.cells[0].kind,'row');assert.equal(r.cells[0].patch('2.5').durationSeconds,'150')
 const [s]=compactDoseRows([row({rowUnit:'min'}, {durationSeconds:'90'},'rowing')],'scaled')
 assert.equal(s.cells[0].value,'1.5');assert.deepEqual(s.cells[0].patch('2'),{durationSeconds:'120'})
})
test('AMRAP intervals, pauses and repeated occurrences preserve structure',()=>{
 const i=row({repsMode:'amrap'}, {reps:''});i.timed=true
 assert.equal(compactDoseRows([i],'rx')[0].cells.length,0)
 assert.equal(compactDoseRows([row({is_rest:true,pauseSeconds:'40'},{})],'rx')[0].cells[0].kind,'item')
 assert.deepEqual(compactDoseRows([row({key:'first'},{reps:'10'}),row({key:'second'},{reps:'15'})],'rx').map(x=>x.key),['first','second'])
})
