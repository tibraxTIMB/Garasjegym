import assert from 'node:assert/strict'
import {equipmentPreparation,preparationItems,equipmentCapacity,equipmentPlanSnapshot,equipmentAlternatives} from '../src/lib/equipmentPreparation.js'
const rows=[{name:'Squat',equipment:'Vektstong'},{name:'Clean',equipment:'vektstong'},{name:'Press',equipment:'Vektstong / Manualar'},{name:'Burpee',equipment:'Kroppsvekt'},{name:'Pause',is_rest:true},{name:'Unknown'},{name:'Unknown'}]
assert.deepEqual(equipmentPreparation(rows),{groups:[{equipment:'Vektstong',exercises:['Squat','Clean']},{equipment:'Vektstong / Manualar',exercises:['Press']}],unknown:['Unknown']})
assert.deepEqual(equipmentPreparation([]),{groups:[],unknown:[]})
assert.deepEqual(preparationItems({timer_settings:{workout_schema:{items:rows}},movements:'Other'}),rows)
assert.deepEqual(preparationItems({movements:'A\\nB'}),['A\\nB'])
assert.deepEqual(preparationItems({movements:'A\nB'}),['A','B'])
assert.deepEqual(preparationItems({exercises:['A'],movements:['B']}),['A'])
assert.deepEqual(equipmentPreparation(['A']),{groups:[],unknown:['A']})
console.log('7 equipment preparation checks passed')

const gear=[{id:'s',name:'Back Squat',equipment:'Vektstong',category:'Styrke'},{id:'b',name:'Bench Press',equipment:'Benk',category:'Styrke'}]
assert.equal(equipmentCapacity(gear,{})[0].status,'unknown')
assert.equal(equipmentCapacity(gear,{vektstong:{required:'3',available:'2'}})[0].status,'shortage')
assert.equal(equipmentCapacity(gear,{vektstong:{required:'2',available:'2'}})[0].status,'ready')
assert.equal(equipmentCapacity(gear,{vektstong:{required:'0',available:'0'}})[0].status,'ready')
assert.equal(equipmentCapacity(gear,{vektstong:{required:'2.5',available:'2'}})[0].status,'invalid')
assert.equal(equipmentCapacity(gear,{vektstong:{required:'-1',available:'2'}})[0].status,'invalid')
assert.deepEqual(equipmentPlanSnapshot(gear,{vektstong:{required:'3',available:'2'},benk:{required:'',available:'0'},removed:{required:4,available:4}}),{vektstong:{required:3,available:2},benk:{required:null,available:0}})
const candidates=[{id:'g',name:'Goblet Squat',equipment:'Kettlebell',category:'Styrke'},{id:'f',name:'Front Squat',equipment:'Vektstong',category:'Styrke'},{id:'p',name:'Bench Press',equipment:'Manualar',category:'Styrke'},{id:'r',name:'Goblet Squat',equipment:'Kettlebell',category:'Styrke',is_rehab:true}]
const tags=x=>/squat/i.test(x.name)?['squat']:['push']
assert.deepEqual(equipmentAlternatives(gear[0],candidates,tags).map(x=>x.id),['g'])
assert.deepEqual(equipmentAlternatives({...gear[0],is_complex:true},candidates,tags),[])
assert.deepEqual(equipmentAlternatives(gear[0],candidates),[])
assert.deepEqual(equipmentAlternatives({...gear[0],name:'Unknown'},candidates,tags),[])
console.log('11 capacity and candidate checks passed')
