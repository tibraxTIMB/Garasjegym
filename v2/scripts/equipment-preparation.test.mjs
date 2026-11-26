import assert from 'node:assert/strict'
import {equipmentPreparation,preparationItems} from '../src/lib/equipmentPreparation.js'
const rows=[{name:'Squat',equipment:'Vektstong'},{name:'Clean',equipment:'vektstong'},{name:'Press',equipment:'Vektstong / Manualar'},{name:'Burpee',equipment:'Kroppsvekt'},{name:'Pause',is_rest:true},{name:'Unknown'},{name:'Unknown'}]
assert.deepEqual(equipmentPreparation(rows),{groups:[{equipment:'Vektstong',exercises:['Squat','Clean']},{equipment:'Vektstong / Manualar',exercises:['Press']}],unknown:['Unknown']})
assert.deepEqual(equipmentPreparation([]),{groups:[],unknown:[]})
assert.deepEqual(preparationItems({timer_settings:{workout_schema:{items:rows}},movements:'Other'}),rows)
assert.deepEqual(preparationItems({movements:'A\\nB'}),['A\\nB'])
assert.deepEqual(preparationItems({movements:'A\nB'}),['A','B'])
assert.deepEqual(preparationItems({exercises:['A'],movements:['B']}),['A'])
assert.deepEqual(equipmentPreparation(['A']),{groups:[],unknown:['A']})
console.log('7 equipment preparation checks passed')
