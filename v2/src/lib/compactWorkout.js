import {isEmomFormat} from './wodEngine.js'
export const ACTIVE_WOD_LEVELS=Object.freeze([{id:'rx',label:'RX'},{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}])
const entered=v=>v!=null&&String(v).trim()!==''
const positive=v=>entered(v)&&Number.isFinite(Number(v))&&Number(v)>0
const nonnegative=v=>entered(v)&&Number.isFinite(Number(v))&&Number(v)>=0
// Missing levels remain missing. Never convert a percent or RIR to guessed kg.
export function resultPlan(item,level){
 const dose=item?.prescription_levels?.[level]||item?.levels?.[level]
 if(!dose||item?.is_rest||item?.is_complex)return null
 const values={}
 if(item.reps_mode!=='amrap'&&positive(dose.reps)&&Number.isInteger(Number(dose.reps)))values.reps=String(Number(dose.reps))
 if(item.uses_height&&positive(dose.heightCm))values.height_cm=String(Number(dose.heightCm))
 const loads=[]
 if(item.uses_load&&dose.loadMode==='kg'){
  const m=nonnegative(dose.loadKgMen)?String(Number(dose.loadKgMen)):null
  const k=nonnegative(dose.loadKgWomen)?String(Number(dose.loadKgWomen)):null
  if(m!==null&&k!==null&&m===k)loads.push({id:'common',label:m+' kg',value:m})
  else {
   if(m!==null)loads.push({id:'men',label:'M '+m+' kg',value:m})
   if(k!==null)loads.push({id:'women',label:'K '+k+' kg',value:k})
  }
  if(!loads.length&&nonnegative(dose.loadKg))loads.push({id:'common',label:Number(dose.loadKg)+' kg',value:String(Number(dose.loadKg))})
 }
 return Object.keys(values).length||loads.length?{values,loads}:null
}
export function fillResultPlan(item,level,choice=null,{count=Infinity,replace=false}={}){
 const plan=resultPlan(item,level)
 if(!plan||!Array.isArray(item.sets))return item
 const fields={...plan.values}
 const load=plan.loads.find(x=>x.id===choice)||plan.loads.find(x=>x.id==='common')
 if(load)fields.load_kg=load.value
 let changed=false
 const sets=item.sets.map((set,index)=>{
  if(index>=count||set.flow_status==='done')return set
  const patch={}
  for(const [field,value] of Object.entries(fields))if(replace||!entered(set[field])||set.planned_fields?.includes(field))patch[field]=value
  if(!Object.keys(patch).length)return set
  changed=true
  return {...set,...patch,planned_fields:[...new Set([...(set.planned_fields||[]),...Object.keys(patch)])]}
 })
 return changed?{...item,sets,prescribed_sets_prefilled:true}:item
}
export function editPlannedSet(set,patch){
 const planned=(set.planned_fields||[]).filter(field=>!Object.hasOwn(patch,field))
 return {...set,flow_status:'',...patch,planned_fields:planned}
}
export function refreshResultPlan(item,level){
 // A level change affects suggested values only, never manually entered values.
 const plan=resultPlan(item,level)
 return {...item,sets:(item.sets||[]).map(set=>{
  if(set.flow_status==='done')return set
  const patch={}
  for(const field of set.planned_fields||[])patch[field]=plan?.values[field]??(field==='load_kg'?plan?.loads.find(x=>x.id==='common')?.value??'':'')
  return {...set,...patch}
 })}
}
// New shared-clock formats must have a concrete interpretation in the timer.
export function collaborationChoices(format,participation,combinationMode='For Time'){
 if(participation==='individual')return ['solo']
 if(isEmomFormat(format))return participation==='partner'?['you_go_i_go','synchronized']:['synchronized']
 if(['AMRAP','For Time','Chipper'].includes(format)||['Couplet','Triplet'].includes(format)&&['AMRAP','For Time'].includes(combinationMode))return ['free_split','synchronized']
 if(['Intervall','Tabata','Row Intervals'].includes(format))return ['synchronized']
 return []
}
export const isPartnerEmom=(format,engine)=>isEmomFormat(format)&&engine?.participation==='partner'&&engine?.collaboration==='you_go_i_go'
export function partnerExecutionIssue({format,participation,collaboration,combinationMode,items=[],durationSeconds,intervalSeconds,samspel}={}){
 if(participation==='individual'||samspel)return null
 if(!collaborationChoices(format,participation,combinationMode).includes(collaboration))return 'Vel eit format og ei samarbeidsform som timeren støttar.'
 if(!isPartnerEmom(format,{participation,collaboration}))return null
 if(items.some(x=>x.is_rest||String(x.minute_slot??x.minuteSlot??'').trim()))return 'YGIG EMOM brukar automatisk rotasjon utan eigne intervallnummer eller pauseøvingar.'
 const slots=Number(durationSeconds)/Number(intervalSeconds)
 if(!Number.isInteger(slots)||slots<2||slots%2)return 'YGIG EMOM krev heile par med to intervall: eitt til kvar partnar.'
 if(items.length&&slots<items.length*2)return 'Set av minst to intervall til kvar øving.'
 return null
}
// Each exercise occupies two consecutive slots, one for each partner.
// Slot numbering is one-based and the clock remains at the programmed interval.
export function partnerEmomSlot(slot,exerciseCount){
 if(!Number.isInteger(slot)||slot<1||!Number.isInteger(exerciseCount)||exerciseCount<1)return null
 return {exerciseIndex:Math.floor((slot-1)/2)%exerciseCount,worker:(slot-1)%2+1,resting:slot%2+1}
}
export function partnerEmomCount({slots,exerciseIndex,exerciseCount,worker=1}){
 if(!Number.isInteger(slots)||slots<0||![1,2].includes(worker)||!Number.isInteger(exerciseIndex)||exerciseIndex<0||exerciseIndex>=exerciseCount||!Number.isInteger(exerciseCount)||exerciseCount<1)return 0
 const first=2*exerciseIndex+worker
 return slots<first?0:Math.floor((slots-first)/(2*exerciseCount))+1
}
export function emomExerciseIndices(items,slot,{partner=false}={}){
 if(!items.length)return []
 if(partner){const role=partnerEmomSlot(slot,items.length);return role?[role.exerciseIndex]:[]}
 const explicit=items.some(item=>String(item.minute_slot??item.minuteSlot??'').trim())
 return explicit?items.flatMap((item,index)=>String(item.minute_slot??item.minuteSlot??'').split(/[,;\s/]+/).some(n=>Number(n)===slot)?[index]:[]):[(slot-1)%items.length]
}

export function clearUnfinishedPlan(item,count){return {...item,sets:(item.sets||[]).map((set,index)=>{if(index<count||!set.planned_fields?.length)return set;return {...set,...Object.fromEntries(set.planned_fields.map(field=>[field,''])),planned_fields:[]}})}}
