import {samspelConfig,samspelParticipantResults,samspelStrengthComplete,doubleEmomComplete,samspelEmomComplete,teamChipperComplete,relayTotal} from './samspel.js'
import {isIndividualPerformance} from './performanceEvidence.js'
import {sortWodItems,getWodSchemaItems} from './wodOrdering.js'
import {isEmomFormat,emomPrescribedSetCount} from './wodEngine.js'
import {plannedFixedEmomSets} from './compositeWod.js'

const sameMovement=(a,b)=>String(a||'').trim().toLocaleLowerCase('nn-NO')===String(b||'').trim().toLocaleLowerCase('nn-NO')
/** Proposed historical EMOM sets; NEVER update a training log without athlete approval. */
export function suggestedEmomSets(workout,schema,exercise,index){
 if(!schema||!isIndividualPerformance(workout))return null
 const items=sortWodItems(getWodSchemaItems(schema))
 const item=sameMovement(items[index]?.exercise_name,exercise.exercise_name)?items[index]:items.find(x=>sameMovement(x.exercise_name,exercise.exercise_name))
 if(!item)return null
 const level=workout.result_data?.prescription_level||schema.prescription||'rx'
 const prescribed=Number(item.levels?.[level]?.reps??item.reps)
 if(!Number.isInteger(prescribed)||prescribed<=0||item.is_rest||item.reps_mode==='amrap')return null
 if(workout.format==='Samansett økt'){
   const part=(schema.composite_blocks||[]).find(b=>b.id===item.block_id)
   if(!part||!(workout.result_data?.block_summary||[]).some(s=>s.id===part.id&&s.completed===true))return null
   const plan=plannedFixedEmomSets(item,schema.composite_blocks,level,false)
   return plan.autoFill?{count:plan.sets.length,reps:prescribed}:null
 }
 if(!isEmomFormat(workout.format)||workout.result_data?.completed===false)return null
 const count=emomPrescribedSetCount({format:workout.format,interval:schema.interval,durationSeconds:schema.duration_seconds,minuteSlot:item.minute_slot,exerciseIndex:items.indexOf(item),exerciseCount:items.length})
 return count>0?{count,reps:prescribed}:null
}

// Corrections are limited to the existing team-result row. Never silently change
// completion/linked plan state, elapsed clock, or personal exercise records.
export function samspelCorrectionFields(workout){
 const s=samspelConfig({samspel:workout?.result_data?.samspel})
 if(!s||!['quality','recovery','emom','double_emom','strength','relay','chipper'].includes(s.main_track))return []
 const rows=Array.isArray(s.participant_results)?s.participant_results:[]
 const fields=[]
 for(let slot=1;slot<=s.participant_count;slot++){
  const row=rows.find(r=>r.slot===slot)||{}
  const add=(key,label,value,kind='int',min=0,max)=>fields.push({slot,key,label,value:value??'',kind,min,max})
  if(s.main_track==='quality'||s.main_track==='recovery'){add('quality','Gjennomføring',row.quality_status,'status');if(s.main_track==='quality')add('erg','Meter',row.erg_value,'decimal')}
  if(s.main_track==='emom'){add('intervals','Fullførte intervall',row.completed_intervals);add('erg',s.metric==='distance'?'Meter':'Kaloriar',row.erg_value,'decimal')}
  if(s.main_track==='double_emom'){add('trackA','Spor A · '+s.tracks[0],row.track_a_intervals);add('trackB','Spor B · '+s.tracks[1],row.track_b_intervals)}
  if(s.main_track==='relay'){add('rounds','Rundar',row.rounds);add('reps','Ekstra reps',row.extra_reps)}
  if(s.main_track==='chipper')s.targets.forEach((target,i)=>add('chipper-'+i,target.exercise_name+' · reps',row.chipper_reps?.[i],'int',0,target.target_reps))
  if(s.main_track==='strength')for(let i=0;i<s.planned_sets;i++){
   const set=row.strength_sets?.find(x=>x.set_number===i+1)||{}
   add('reps-'+i,'Sett '+(i+1)+' · reps',set.reps);add('load-'+i,'Sett '+(i+1)+' · kg',set.load_kg,'decimal');add('rir-'+i,'Sett '+(i+1)+' · RIR',set.rir,'int',-1,10)
  }
 }
 return fields
}
export function samspelCorrectionDraft(workout){
 const draft={}
 for(const f of samspelCorrectionFields(workout))(draft[f.slot]??={})[f.key]=String(f.value)
 return draft
}
export function samspelCorrectionPatch(workout,draft){
 const data=workout?.result_data||{},s=samspelConfig({samspel:data.samspel})
 if(!s||!samspelCorrectionFields(workout).length)return {issue:'Dette lagoppsettet kan ikkje korrigerast her enno.'}
 const elapsed=data.manual_entry?undefined:typeof data.elapsed_seconds==='number'?data.elapsed_seconds:undefined
 if(!data.manual_entry&&['emom','double_emom'].includes(s.main_track)&&elapsed===undefined)return {issue:'Registrert timertid manglar. Kan ikkje kontrollera intervalla.'}
 const result=samspelParticipantResults(s,draft,{elapsed})
 if(result.issue)return {issue:result.issue,slot:result.slot,field:result.field}
 if(!result.rows.length)return {issue:'Registrer minst eitt faktisk utøvarbidrag.'}
 const rows=result.rows
 const complete=s.main_track==='strength'?samspelStrengthComplete(s,rows):s.main_track==='double_emom'?doubleEmomComplete(s,rows,{elapsed}):s.main_track==='emom'?samspelEmomComplete(s,rows,{elapsed}):s.main_track==='chipper'?teamChipperComplete(s,rows)&&Number(workout.score_time_seconds)>0:s.main_track==='relay'?relayTotal(s,rows)!==null:rows.length===s.participant_count&&rows.every(r=>r.quality_status==='done')
 if(typeof data.completed!=='boolean'||complete!==data.completed)return {issue:'Korrigeringa ville endra gjennomføringsstatus. Dette krev samordna retting av eventuelle PT- og planlenkjer og er ikkje tilgjengeleg her enno.'}
 const result_data={...data,samspel:{...s,participant_results:rows}}
 const patch={result_data}
 if(s.main_track==='relay'){const rounds=relayTotal(s,rows);patch.score_rounds=rounds;patch.score_reps=null;result_data.completed_rounds=rounds;result_data.extra_reps=null}
 return {patch}
}
