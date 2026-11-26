import {samspelChipper,samspelRelay,samspelRecovery,samspelDouble,samspelStrength,samspelConfig,samspelMixed,samspelStationRows,SAMSPEL_TASKS} from './samspel.js'
import {exerciseMuscleProfile} from './exerciseMuscleProfiles.js'
// A preparation checklist, not an inventory count. Equipment descriptions are
// explicit catalogue text; alternatives and sharing must be confirmed by the coach.
export function equipmentPreparation(items=[]){
 const groups=new Map(),unknown=[]
 for(const item of items){
  if(item?.is_rest)continue
  const name=typeof item==='string'?item:item?.exercise_name||item?.name
  if(!name)continue
  const raw=typeof item==='object'?String(item.equipment||'').trim():''
  if(!raw){unknown.push(name);continue}
  if(/^(ingen|kroppsvekt|bodyweight)$/i.test(raw))continue
  // Do not split slash/or expressions into assumed simultaneous requirements.
  const key=raw.toLowerCase().replace(/\s+/g,' ')
  if(!groups.has(key))groups.set(key,{equipment:raw,exercises:new Set()})
  groups.get(key).exercises.add(name)
 }
 return {groups:[...groups.values()].map(x=>({...x,exercises:[...x.exercises]})),unknown:[...new Set(unknown)]}
}
export function preparationItems(snapshot={}){
 const schema=snapshot.timer_settings?.workout_schema
 if(Array.isArray(schema?.items)&&schema.items.length)return schema.items
 if(Array.isArray(snapshot.exercises)&&snapshot.exercises.length)return snapshot.exercises
 if(Array.isArray(snapshot.movements))return snapshot.movements
 if(typeof snapshot.movements==='string')return snapshot.movements.split('\n').map(s=>s.trim()).filter(Boolean)
 return []
}

const equipmentKey=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ')
const count=value=>value==null||String(value).trim()===''?null:Number.isSafeInteger(Number(value))&&Number(value)>=0&&Number(value)<=999?Number(value):NaN
// Counts are deliberately entered by the coach, never derived from exercise names.
export function equipmentCapacity(items,values={}){
 return equipmentPreparation(items).groups.map(group=>{
  const key=equipmentKey(group.equipment),row=values[key]||{}
  const required=count(row.required),available=count(row.available)
  const status=Number.isNaN(required)||Number.isNaN(available)?'invalid':required===null||available===null?'unknown':available<required?'shortage':'ready'
  return {...group,key,required,available,status}
 })
}
export function equipmentPlanSnapshot(items,values={}){
 return Object.fromEntries(equipmentCapacity(items,values).filter(r=>r.status!=='invalid'&&(r.required!==null||r.available!==null)).map(r=>[r.key,{required:r.required,available:r.available}]))
}
// Same mode, exact primary role set and overlapping explicit movement tags. These are
// candidates for coach review, not equivalent dosage, rehab or automatic substitutions.
export function equipmentAlternatives(item,catalogue=[],tagsFor=()=>[]){
 if(!item||item.is_rest||item.is_complex||item.is_rehab||item.is_samspel_station)return []
 const name=item.exercise_name||item.name,profile=exerciseMuscleProfile(name)
 const tags=tagsFor({...item,name})||[]
 if(!profile||!profile.primary.length||profile.mode==='mobility'||!tags.length)return []
 const prim=p=>[...new Set(p.primary)].sort().join('|')
 return catalogue.filter(ex=>{
  if(!ex?.id||ex.id===item.id||ex.id===item.exercise_id||ex.is_rehab||ex.is_complex||ex.category!==item.category||equipmentKey(ex.name)===equipmentKey(name)||!ex.equipment||equipmentKey(ex.equipment)===equipmentKey(item.equipment))return false
  const p=exerciseMuscleProfile(ex.name)
  return p&&p.mode===profile.mode&&prim(p)===prim(profile)&&(tagsFor(ex)||[]).some(t=>tags.includes(t))
 }).slice(0,5)
}

const inventoryKey=owner=>'garasjegym.equipment.v1.'+owner
export function readEquipmentInventory(owner,storage){
 if(!owner)return {}
 try{const raw=JSON.parse((storage??globalThis.localStorage).getItem(inventoryKey(owner))||'{}')
 return Object.fromEntries(Object.entries(raw||{}).filter(([k,v])=>k&&Number.isSafeInteger(v)&&v>=0&&v<=999))
 }catch{return {}}
}
export function saveEquipmentInventory(owner,items,values,storage){
 if(!owner)return false
 const rows=equipmentCapacity(items,values)
 if(rows.some(r=>r.status==='invalid'))return false
 const next={...readEquipmentInventory(owner,storage)}
 for(const row of rows)if(row.available!==null)next[row.key]=row.available
 try{(storage??globalThis.localStorage).setItem(inventoryKey(owner),JSON.stringify(next));return true}catch{return false}
}
export function applyEquipmentInventory(items,values,inventory){
 const next={...values}
 for(const row of equipmentCapacity(items,values))if(Object.hasOwn(inventory,row.key)&&(inventory[row.key]===null||Number.isSafeInteger(inventory[row.key])&&inventory[row.key]>=0&&inventory[row.key]<=999))next[row.key]={...next[row.key],available:inventory[row.key]}
 return next
}

// Include explicit parallel stations in the same preparation checklist; never
// infer quantities or alter exercise prescriptions from participant count.
export function equipmentItemsForSamspel(items=[],samspel){
 const s=samspelConfig({samspel})
 if(!s||samspelStrength(s)||samspelDouble(s)||samspelRecovery(s)||samspelRelay(s)||samspelChipper(s))return items
 const ergEquipment={row:'Romaskin',bike:'Sykkel',ski:'SkiErg'}
 const stations=samspelMixed(s)?samspelStationRows(s):[{task:s.task,label:SAMSPEL_TASKS.find(([id])=>id===s.task)?.[1]}]
 return [...items,...stations.map((station,i)=>({
  key:'samspel-equipment-'+i,
  name:'Samspel · '+(station.label||'Uavklart stasjon'),
  equipment:station.task==='strength'?station.equipment:ergEquipment[station.task],
  is_samspel_station:true
 }))]
}
