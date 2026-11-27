import assert from 'node:assert/strict'
import {equipmentPreparation,preparationItems,equipmentCapacity,equipmentPlanSnapshot,equipmentAlternatives,readEquipmentInventory,saveEquipmentInventory,applyEquipmentInventory} from '../src/lib/equipmentPreparation.js'
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


const stockMap=new Map(),stockStorage={getItem:k=>stockMap.get(k),setItem:(k,v)=>stockMap.set(k,v)}
assert.deepEqual(readEquipmentInventory('coach',stockStorage),{})
assert.equal(saveEquipmentInventory('coach',gear,{vektstong:{available:'2'},benk:{available:'0'}},stockStorage),true)
assert.deepEqual(readEquipmentInventory('coach',stockStorage),{vektstong:2,benk:0})
assert.deepEqual(readEquipmentInventory('other',stockStorage),{})
assert.deepEqual(applyEquipmentInventory(gear,{vektstong:{required:'3'}},readEquipmentInventory('coach',stockStorage)),{vektstong:{required:'3',available:2},benk:{available:0}})
assert.equal(saveEquipmentInventory('coach',gear,{vektstong:{available:'-1'}},stockStorage),false)
assert.equal(saveEquipmentInventory(null,gear,{},stockStorage),false)

import {INITIAL_INVENTORY,inventoryFromRows,inventoryDraft,missingInitialInventory,inventoryNotes} from '../src/lib/garageInventory.js'
assert.equal(new Set(INITIAL_INVENTORY.map(r=>r.equipment_key)).size,INITIAL_INVENTORY.length)
assert.equal(INITIAL_INVENTORY.filter(r=>r.group_key==='vektskiver').reduce((sum,r)=>sum+r.available,0),16)
assert.equal(INITIAL_INVENTORY.filter(r=>r.group_key==='vektskiver').reduce((sum,r)=>sum+r.available*r.weight_kg,0),128.5)
const shared=inventoryFromRows([{equipment_key:'vektstong',available:99},...INITIAL_INVENTORY])
assert.equal(shared.vektstong,3);assert.equal(shared.stong,3);assert.equal(shared.manualar,10);assert.equal(shared.kettlebell,4);assert.equal(shared.romaskin,1);assert.equal(shared['pull-up-stong'],1)
assert.equal(shared.strikk,null);assert.equal(shared['vektstong / benk'],undefined)
assert.ok(INITIAL_INVENTORY.find(r=>r.equipment_key==='item:safety').notes.includes('IKKJE'))
assert.equal(missingInitialInventory([INITIAL_INVENTORY[0]]).length,INITIAL_INVENTORY.length-1)
assert.equal(inventoryDraft({equipment_label:'Ny stong',group_key:'stong',available:'2',weight_kg:'7,5'}).weight_kg,7.5)
assert.equal(inventoryDraft({equipment_label:'Strikk',group_key:'strikk',available:''}).available,null)
assert.throws(()=>inventoryDraft({equipment_label:'Ny stong',group_key:'stong',available:'2.5'}))
assert.throws(()=>inventoryDraft({equipment_label:'Ny stong',group_key:'stong',available:'1',weight_kg:'-4'}))
console.log('Detailed inventory and non-overwrite checks passed')

assert.equal(applyEquipmentInventory([{name:'Band Pull Apart',equipment:'Strikk'}],{strikk:{available:4,required:1}},shared).strikk.available,null)
assert.ok(inventoryNotes([{equipment:'Vektstong / benk'}],INITIAL_INVENTORY).some(r=>r.equipment_key==='item:barbell-20'))
assert.ok(inventoryNotes([{equipment:'Vektstong'}],INITIAL_INVENTORY).some(r=>r.equipment_key==='item:safety'))

import {plateAllocation} from '../src/lib/garageInventory.js'
const load=(barKey,targetKg)=>({barKey,targetKg,compatible:true})
const a=load('item:cf-bar-20',80),b=load('item:cf-bar-15',65)
const allocation=plateAllocation(INITIAL_INVENTORY,[a,b])
assert.equal(allocation.status,'exact')
assert.deepEqual(allocation.loads.map(x=>x.totalKg),[80,65])
for(const plate of INITIAL_INVENTORY.filter(x=>x.group_key==='vektskiver')){
 assert.ok(allocation.loads.flatMap(x=>x.perSide).filter(x=>x.key===plate.equipment_key).reduce((n,x)=>n+2*x.count,0)<=plate.available)
}
assert.equal(plateAllocation(INITIAL_INVENTORY,[a,a]).status,'shortage')
assert.equal(plateAllocation(INITIAL_INVENTORY,[{...a,compatible:false}]).status,'unknown')
assert.equal(plateAllocation(INITIAL_INVENTORY,[load(a.barKey,19)]).status,'invalid')
assert.equal(plateAllocation(INITIAL_INVENTORY,[load(a.barKey,20)]).status,'exact')
const nearest=plateAllocation(INITIAL_INVENTORY,[load(a.barKey,20.25)])
assert.equal(nearest.alternatives[0].below.totalKg,20)
assert.equal(nearest.alternatives[0].above.totalKg,21)
assert.equal(plateAllocation(INITIAL_INVENTORY.map(r=>r.group_key==='vektskiver'?{...r,available:1}:r),[a]).status,'shortage')
assert.equal(plateAllocation(INITIAL_INVENTORY.map(r=>r.group_key==='vektskiver'?{...r,available:null}:r),[a]).status,'unknown')
// Backtracking: first job can use 2x5 or 1x10 per side; second needs the 5 kg pair.
const custom=[{inventory_kind:'item',equipment_key:'bar',group_key:'stong',available:2,weight_kg:20},{inventory_kind:'item',equipment_key:'p5',group_key:'vektskiver',available:4,weight_kg:5},{inventory_kind:'item',equipment_key:'p10',group_key:'vektskiver',available:2,weight_kg:10}]
assert.equal(plateAllocation(custom,[load('bar',40),load('bar',30)]).status,'exact')
assert.equal(plateAllocation(custom,[load('bar',50),load('bar',50)]).status,'shortage')
console.log('Lastmeister allocation checks passed')

// A greedy choice consumes the only 6 kg pair; search must backtrack.
const backtrack=[{inventory_kind:'item',equipment_key:'bar',group_key:'stong',available:2,weight_kg:20},...[[6,2],[4,6],[2,2]].map(([weight_kg,available])=>({inventory_kind:'item',equipment_key:'p'+weight_kg,group_key:'vektskiver',weight_kg,available}))]
const bt=plateAllocation(backtrack,[load('bar',44),load('bar',32)])
assert.equal(bt.status,'exact')
assert.deepEqual(bt.loads[0].perSide.map(p=>[p.kg,p.count]),[[4,3]])
assert.deepEqual(bt.loads[1].perSide.map(p=>[p.kg,p.count]),[[6,1]])

import {equipmentItemsForSamspel} from '../src/lib/equipmentPreparation.js'
const main=[{name:'Air squat',equipment:'Kroppsvekt'}]
const rotating={version:2,mode:'parallel_round_swap',participant_count:2,task:'row',metric:'distance'}
assert.equal(equipmentItemsForSamspel(main,null),main)
assert.equal(equipmentItemsForSamspel(main,{...rotating,participant_count:1}),main)
const parallel=equipmentItemsForSamspel(main,rotating)
assert.deepEqual(equipmentPreparation(parallel).groups.map(x=>x.equipment),['Romaskin'])
assert.equal(equipmentCapacity(parallel,{})[0].status,'unknown')
assert.equal(equipmentCapacity(parallel,{romaskin:{required:1,available:0}})[0].status,'shortage')
const mixed={...rotating,participant_count:3,erg_slots:2,station_tasks:[{task:'row',metric:'distance'},{task:'strength',metric:'reps',exercise_id:'p',exercise_name:'Press',instruction:'5 reps',equipment:'Vektstong'}]}
const mixedItems=equipmentItemsForSamspel(main,mixed)
assert.deepEqual(equipmentPreparation(mixedItems).groups.map(x=>x.equipment),['Romaskin','Vektstong'])
assert.equal(main.length,1)
assert.equal(equipmentAlternatives(mixedItems[2],candidates,tags).length,0)

import {prescribedBarbellLoads} from '../src/lib/garageInventory.js'
const doseItem={name:'Squat',equipment:'Vektstong',levels:{rx:{loadMode:'kg',loadKgMen:'80',loadKgWomen:'65'},scaled:{loadMode:'rir',loadKgMen:'50'}}}
assert.deepEqual(prescribedBarbellLoads([doseItem]).map(x=>x.kg),[80,65])
assert.deepEqual(prescribedBarbellLoads([doseItem],'scaled'),[])
assert.deepEqual(prescribedBarbellLoads([{...doseItem,equipment:'Vektstong / Manualar'}]),[])
assert.deepEqual(prescribedBarbellLoads([{...doseItem,levels:{rx:{loadMode:'kg',loadKgMen:'',loadKgWomen:'0'}}}]),[])
assert.deepEqual(prescribedBarbellLoads([{...doseItem,is_rest:true}]),[])
assert.deepEqual(prescribedBarbellLoads([{...doseItem,levels:{rx:{load_mode:'kg',load_kg:40}}}]).map(x=>x.kg),[40])


import {doubleEmomStationCapacity} from '../src/lib/garageInventory.js'
const doublePart={id:'d',title:'Del B',samspel:{main_track:'double_emom'}}
const doubleItems=[{blockId:'d',name:'Row',equipment:'Romaskin'},{blockId:'d',name:'Row sprint',equipment:'roing'}]
const doubleStock=doubleEmomStationCapacity([doublePart],doubleItems,{romaskin:1})[0]
assert.deepEqual(doubleStock.rows,[{key:'romaskin',required:2,available:1,status:'shortage'}])
assert.equal(doubleStock.validTrackCount,true)
assert.equal(doubleEmomStationCapacity([doublePart],doubleItems,{romaskin:2})[0].rows[0].status,'minimum_met')
assert.equal(doubleEmomStationCapacity([doublePart],doubleItems,{romaskin:null})[0].rows[0].status,'unknown')
const serial=doubleEmomStationCapacity([doublePart,{...doublePart,id:'e'}],[...doubleItems,...doubleItems.map(x=>({...x,blockId:'e'}))],{romaskin:2})
assert.equal(serial.length,2)
assert.equal(serial[1].rows[0].required,2)
const ambiguous=doubleEmomStationCapacity([doublePart],[{blockId:'d',name:'Press',equipment:'Vektstong / Benk'},{blockId:'d',name:'Push-up',equipment:'Kroppsvekt'}],{})[0]
assert.deepEqual(ambiguous.unknown,['Press'])
assert.deepEqual(ambiguous.rows,[])
assert.equal(doubleEmomStationCapacity([doublePart],doubleItems.slice(0,1),{})[0].validTrackCount,false)
assert.deepEqual(doubleEmomStationCapacity([{id:'d',samspel:{main_track:'emom'}}],doubleItems,{}),[])
assert.equal(doubleEmomStationCapacity([doublePart],[{block_id:'d',name:'Press',equipment:'Barbell'},{block_id:'d',name:'Squat',equipment:'Vektstong'}],{stong:1})[0].rows[0].status,'shortage')


import {ironTwinsPlateAllocation} from '../src/lib/garageInventory.js'
const ironStock=[{inventory_kind:'item',equipment_key:'bar',group_key:'stong',available:1,weight_kg:20},{inventory_kind:'item',equipment_key:'p10',group_key:'vektskiver',available:2,weight_kg:10}]
const ironRequests=[{barKey:'bar',targetKg:40,compatible:true},{barKey:'bar',targetKg:40,compatible:true}]
assert.equal(ironTwinsPlateAllocation(ironStock,ironRequests,'').status,'unknown')
assert.equal(ironTwinsPlateAllocation(ironStock,ironRequests.slice(0,1),'sequential').status,'invalid')
assert.equal(ironTwinsPlateAllocation(ironStock,ironRequests,'simultaneous').status,'shortage')
const ironSequential=ironTwinsPlateAllocation(ironStock,ironRequests,'sequential')
assert.equal(ironSequential.status,'exact')
assert.equal(ironSequential.sequential,true)
assert.deepEqual(ironSequential.loads.map(load=>load.totalKg),[40,40])
const ironTwoBars=ironStock.map(r=>r.equipment_key==='bar'?{...r,available:2}:r)
assert.equal(ironTwinsPlateAllocation(ironTwoBars,ironRequests,'simultaneous').status,'shortage')
const ironEnough=ironTwoBars.map(r=>r.equipment_key==='p10'?{...r,available:4}:r)
assert.equal(ironTwinsPlateAllocation(ironEnough,ironRequests,'simultaneous').status,'exact')
assert.equal(ironTwinsPlateAllocation(ironStock,[ironRequests[0],{...ironRequests[1],compatible:false}],'sequential').status,'unknown')
assert.equal(ironTwinsPlateAllocation(ironStock,[ironRequests[0],{...ironRequests[1],targetKg:10}],'sequential').status,'invalid')
assert.equal(ironTwinsPlateAllocation(ironStock,[ironRequests[0],{...ironRequests[1],targetKg:60}],'sequential').status,'shortage')
assert.equal(ironStock[1].available,2)
