import {complexResultSummary} from './wodComplexes.js'
import {isErgExercise} from './exerciseMeasurements.js'
import {exerciseRecordType} from './prMetrics.js'
const filled=v=>v!==null&&v!==undefined&&String(v).trim()!==''
export function exerciseResultReview(item,reviewed=false,confirmedPlanned=false){
 if(item.is_rest)return {status:'rest',label:'Pause',summary:'Ingen registrering nødvendig'}
 if(item.is_complex&&item.complex_family==='custom'){
  const result=complexResultSummary(item)
  if(!result.attempts)return {status:'missing',label:'Ikkje registrert',summary:'Ingen stadfesta kompleks'}
  return {status:result.attempts<(item.sets||[]).length?'partial':'recorded',label:result.attempts<(item.sets||[]).length?'Delvis registrert':'Registrert',summary:result.completed+' fullførte · '+result.partial+' delvise · '+result.failed+' mislukka'+(result.best_load_kg==null?'':' · Beste '+result.best_load_kg+' kg')}
 }
 if(isErgExercise(item))return filled(item.rowValue)?{status:'recorded',label:'Registrert',summary:item.rowValue+' '+(item.rowUnit||'m')}:{status:'missing',label:'Ikkje registrert',summary:'Resultat manglar'}
 const sets=item.sets||[],hold=exerciseRecordType(item.exercise_name,sets)==='hold'
 const rows=sets.map(s=>{
  const values=[!hold&&filled(s.reps)?s.reps+' reps':'',item.uses_load&&filled(s.load_kg)?s.load_kg+' kg':'',item.uses_height&&filled(s.height_cm)?s.height_cm+' cm':'',hold&&filled(s.time_seconds)?s.time_seconds+' sek':''].filter(Boolean)
  const complete=hold?filled(s.time_seconds):filled(s.reps)&&(!item.uses_load||filled(s.load_kg))&&(!item.uses_height||filled(s.height_cm))
  return {values,complete}
 })
 const count=rows.filter(r=>r.values.length).length,complete=rows.filter(r=>r.complete).length
 const groups=[]
 for(const row of rows){if(!row.values.length)continue;const label=row.values.join(' · '),last=groups[groups.length-1];if(last?.label===label)last.count++;else groups.push({label,count:1})}
 const summary=groups.map(g=>(g.count>1?g.count+' × ':'')+g.label).join(' / ')
 if(!count)return {status:'missing',label:'Ikkje registrert',summary:'Ingen resultat oppgitt'}
 if(item.prescribed_sets_prefilled&&!reviewed&&!confirmedPlanned)return {status:'unconfirmed',label:'Ikkje stadfesta',summary:'Førehandsutfylt: '+summary}
 if(complete<sets.length)return {status:'partial',label:'Delvis registrert',summary:summary+' · '+complete+' av '+sets.length+' sett komplette'}
 if(item.prescribed_sets_prefilled&&!item.uses_load&&!item.uses_height&&!hold&&confirmedPlanned)return {status:'planned',label:'Stadfesta',summary}
 if(item.prescription_label&&!reviewed&&!confirmedPlanned)return {status:'unconfirmed',label:'Ikkje gjennomgått',summary}
 return {status:'recorded',label:'Registrert',summary}
}
