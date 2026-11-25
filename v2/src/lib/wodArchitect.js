import {cardDose,cardTone,formatCardTime} from './wodCard.js'
import {flowPurpose,flowReporting} from './workoutFlow.js'
import {compositeBlockDuration,COMPOSITE_INTERVAL_FORMATS,isValidRirTarget} from './compositeWod.js'
import {isEmomFormat,emomDisplayLabel} from './wodEngine.js'

// Adapt editable rows to the same presentation contract as persisted WOD cards.
export function architectCardItem(item){
 const levels=item.levels||{}
 const rx=levels.rx||{}
 return {...item,exercise_name:item.name,block_id:item.blockId,is_complex:!!item.is_complex&&!!item.complex_steps?.length,rest_duration_seconds:item.is_rest?Number(item.pauseSeconds):null,side_mode:item.sideMode||'none',reps_mode:item.repsMode,coach_note:item.coachNote,levels:{...levels,rx:{...rx,...(item.equipment==='Romaskin'&&Number(item.rowValue)>0?{reps:'',...(item.rowUnit==='m'?{distanceMeters:item.rowValue}:item.rowUnit==='cal'?{calories:item.rowValue}:{durationSeconds:Number(item.rowValue)*(item.rowUnit==='min'?60:1)})}:{})}}}
}
export function architectDose(item,level='rx'){
 return cardDose(architectCardItem(item),level,true)
}
export function architectSections(blocks,items,{composite=false,format='',seconds=0,category='standard'}={}){
 const rows=composite?blocks:[{id:'main',title:format,format}]
 return rows.map((b,index)=>{
  const group=composite?items.filter(x=>x.blockId===b.id):items
  const duration=composite?compositeBlockDuration(b,group.filter(x=>!x.is_rest).length):seconds
  const purpose=flowPurpose(b,{library_category:category})
  return {...b,index,group,seconds:duration,purpose,reporting:flowReporting(b,{library_category:category}),tone:cardTone({...b,warm:purpose==='prep'}),label:COMPOSITE_INTERVAL_FORMATS.includes(b.format)||b.format==='Stasjonssirkel'?`${b.workSeconds??45}/${b.restSeconds??15} × ${b.rounds??3}`:isEmomFormat(b.format)?emomDisplayLabel(Number(b.emomIntervalSeconds)||60):b.format,time:duration>0?formatCardTime(duration):'Open'}
 })
}
// Validate the actual prescribed metric; never require load for bodyweight or
// duplicate time/reps when the interval supplies the work target.
export function architectDoseIssue(item,{metric,format='',timed=false,level='rx',strength=false}={}){
 if(item.is_rest)return Number(item.pauseSeconds)>=1&&Number(item.pauseSeconds)<=3600?null:'Pause må vera 1–3600 sekund.'
 const d=item.levels?.[level]||{}, reps=String(d.reps??item.reps??'').trim()
 for(const [key,value] of Object.entries(item.levels||{})){
  if(value.loadMode==='rir'&&!isValidRirTarget(value.rirRange||value.rir))return key.toUpperCase()+': RIR må vera 0–10, -1 eller eit intervall.'
 }
 const validReps=Number(reps)>0||/^\d+(?:[-–/]\d+)+$/.test(reps)
 const quantity=validReps||['durationSeconds','distanceMeters','calories'].some(k=>Number(d[k])>0)
 if(format==='Death By')return null
 if(timed&&item.repsMode==='amrap')return null
 if(metric==='rowing')return Number(item.rowValue)>0?null:timed?'Vel roing som arbeid i intervallet eller skriv mengd.':'Skriv distanse, tid eller kaloriar.'
 if(metric==='height'&&(!validReps&&!timed))return 'Skriv repetisjonar eller vel maks reps i intervallet.'
 if(!quantity&&!timed)return metric==='time'?'Skriv varigheit i sekund.':metric==='distance'?'Skriv distanse eller repetisjonar.':metric==='calories'?'Skriv kaloriar eller repetisjonar.':'Skriv reps, tid eller annan gyldig mengd.'
 if(strength&&d.sets!==''&&d.sets!=null&&(!Number.isInteger(Number(d.sets))||Number(d.sets)<1||Number(d.sets)>30))return 'Sett må vera 1–30.'
 return null
}
export function hydrateArchitectLevels(item,defaults){
 const stored=item.levels||{},set=Array.isArray(item.sets)?item.sets[0]:null
 const old={...defaults.rx,reps:String(item.reps??set?.reps??''),sets:Array.isArray(item.sets)&&item.sets.length?String(item.sets.length):'',loadMode:set?.load_mode||item.load_mode||'none',loadKg:String(set?.load_kg??item.load_kg??''),percent1rm:String(set?.percent_1rm??item.percent_1rm??''),rir:String(set?.rir??item.rir??''),durationSeconds:String(item.work_seconds??''),distanceMeters:String(item.meters??''),calories:String(item.calories??'')}
 return {...defaults,...stored,rx:{...old,...stored.rx}}
}
