import {isEmomFormat,COLLABORATION_MODES} from './wodEngine.js'
// Only advertise rules with an actual execution contract. Samspel has its own
// validated role-swap setup; do not pretend metadata alone drives a timer.
export function collaborationOptions(format,participation){
 if(participation==='individual')return COLLABORATION_MODES.filter(x=>x.value==='solo')
 if(isEmomFormat(format))return COLLABORATION_MODES.filter(x=>participation==='partner'?['you_go_i_go','alternate','synchronized'].includes(x.value):x.value==='synchronized')
 if(['AMRAP','For Time','Chipper','Couplet','Triplet'].includes(format))return COLLABORATION_MODES.filter(x=>['free_split','you_go_i_go','synchronized'].includes(x.value))
 return []
}
export function emomPartnerInstruction(engine,round){
 if(engine?.participation==='individual'||!engine?.participation)return null
 if(engine.collaboration==='synchronized')return {work:'Alle · arbeid',rest:'Samtidig'}
 if(engine.participation!=='partner'||!['you_go_i_go','alternate'].includes(engine.collaboration))return {work:'Uavklart samarbeidsregel',rest:'Kontroller WOD-oppsettet'}
 const active=(Math.max(1,Math.floor(Number(round)||1))-1)%2+1
 return {work:'P'+active+' · arbeid',rest:'P'+(3-active)+' · kvile'}
}
export function emomActiveIndices(items,round,engine){
 if(!Array.isArray(items)||!items.length)return []
 const n=Math.max(1,Math.floor(Number(round)||1))
 const slots=item=>String(item.minute_slot??item.minuteSlot??'').trim()
 if(items.some(item=>slots(item)!==''))return items.flatMap((item,i)=>slots(item).split(/[,\s;/]+/).some(x=>Number(x)===n)?[i]:[])
 const alternating=engine?.participation==='partner'&&['you_go_i_go','alternate'].includes(engine.collaboration)
 return [Math.floor((n-1)/(alternating?2:1))%items.length]
}
const entered=v=>v!==null&&v!==undefined&&String(v).trim()!==''
const positive=v=>entered(v)&&Number.isFinite(Number(v))&&Number(v)>0
export function plannedResultDose(item,level,variant='common'){
 const dose=item?.prescription_levels?.[level]
 if(!dose||item.is_rest||item.is_complex)return {}
 const values={}
 if(positive(dose.reps)&&Number.isInteger(Number(dose.reps))&&item.reps_mode!=='amrap')values.reps=String(dose.reps)
 if(item.uses_height&&positive(dose.heightCm))values.height_cm=String(dose.heightCm)
 if(item.uses_load&&dose.loadMode==='kg'){
  const m=dose.loadKgMen,k=dose.loadKgWomen
  const kg=variant==='men'?m:variant==='women'?k:entered(m)&&entered(k)&&Number(m)===Number(k)?m:!entered(m)&&!entered(k)?dose.loadKg:undefined
  if(entered(kg)&&Number.isFinite(Number(kg))&&Number(kg)>=0)values.load_kg=String(kg)
 }
 return values
}
export function fillPlannedResult(item,level,variant='common'){
 const dose=plannedResultDose(item,level,variant)
 return {...item,sets:(item.sets||[]).map(set=>set.flow_status==='done'?set:{...set,...Object.fromEntries(Object.entries(dose).filter(([key])=>!entered(set[key])))})}
}
