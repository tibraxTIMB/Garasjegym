import {samspelConfig,samspelParticipantResults,samspelStrengthComplete,doubleEmomComplete,samspelEmomComplete,teamChipperComplete,teamChipperProgress,relayTotal} from './samspel.js'
import {isIndividualPerformance} from './performanceEvidence.js'
import {sortWodItems,getWodSchemaItems} from './wodOrdering.js'
import {isEmomFormat,emomPrescribedSetCount} from './wodEngine.js'
import {plannedFixedEmomSets,compositeSamspelResults} from './compositeWod.js'

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
// Composite corrections use the saved part configuration, not the current WOD.
// Only supported Samspel parts with historical evidence are editable.
function correctableCompositeParts(data={}){
 if(data.samspel||!Array.isArray(data.samspel_blocks)||!Array.isArray(data.block_summary))return []
 const ids=data.samspel_blocks.map(p=>p?.block_id)
 if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)return []
 return data.samspel_blocks.filter(part=>{
  const config=samspelConfig({samspel:part.samspel})
  const matches=data.block_summary.filter(b=>b.id===part.block_id)
  const summary=matches[0],stored=summary?.samspel
  return ['emom','double_emom','strength','relay','chipper'].includes(config?.main_track)&&typeof part.completed==='boolean'&&matches.length===1&&summary.completed===part.completed&&stored?.main_track===config.main_track&&stored.participant_count===config.participant_count&&stored.duration_seconds===config.duration_seconds&&stored.switch_seconds===config.switch_seconds&&stored.switch_rule===config.switch_rule&&(config.main_track==='emom'?stored.task===config.task&&stored.metric===config.metric:config.main_track==='strength'?stored.exercise_name===config.exercise_name&&stored.planned_sets===config.planned_sets:config.main_track==='chipper'?JSON.stringify(stored.targets)===JSON.stringify(config.targets)&&Number.isSafeInteger(config.duration_seconds)&&config.duration_seconds>0&&Number.isSafeInteger(part.elapsed)&&part.elapsed>=0&&part.elapsed<=config.duration_seconds&&summary.elapsed===part.elapsed&&JSON.stringify(part.chipper_progress)===JSON.stringify(teamChipperProgress(config,config.participant_results))&&JSON.stringify(summary.chipper_progress)===JSON.stringify(part.chipper_progress)&&JSON.stringify(stored.participant_results)===JSON.stringify(config.participant_results)&&part.completed===(teamChipperComplete(config,config.participant_results)&&part.elapsed>0):config.main_track==='relay'?Number.isSafeInteger(config.duration_seconds)&&config.duration_seconds>0&&Number.isSafeInteger(part.relay_rounds)&&part.relay_rounds>=0&&summary.relay_rounds===part.relay_rounds&&relayTotal(config,config.participant_results)===part.relay_rounds&&JSON.stringify(stored.manual_swaps||[])===JSON.stringify(config.manual_swaps||[]):JSON.stringify(stored.tracks)===JSON.stringify(config.tracks))&&(data.manual_entry===true||Number.isFinite(part.elapsed)&&part.elapsed>=0&&summary.elapsed===part.elapsed)
 })
}
export function samspelCorrectionFields(workout){
 const data=workout?.result_data||{}
 if(!data.samspel&&Array.isArray(data.samspel_blocks)){
  return correctableCompositeParts(data).flatMap(part=>samspelCorrectionFields({result_data:{samspel:part.samspel}}).map(f=>({...f,slot:JSON.stringify([part.block_id,f.slot]),groupLabel:(part.title||'Øktdel')+' · Utøvar '+f.slot})))
 }
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
function compositeCorrectionPatch(data,draft){
 const parts=correctableCompositeParts(data)
 if(!parts.length)return {issue:'Ingen støtta Engine Swap-, Double EMOM-, Iron Twins- You Go I Go- eller Team Chipper-del med samsvarande lagra oppsett og gjennomføringsstatus kan korrigerast.'}
 const updated=new Map()
 for(const part of parts){
  const config=part.samspel
  const participants=Object.fromEntries(Array.from({length:config.participant_count},(_,i)=>[i+1,draft?.[JSON.stringify([part.block_id,i+1])]||{}]))
  const result=compositeSamspelResults([{id:part.block_id,title:part.title,format:config.main_track==='chipper'?'Chipper':config.main_track==='relay'?'AMRAP':config.main_track==='strength'?'Strength':'EMOM',duration_seconds:config.duration_seconds,emomIntervalSeconds:config.switch_seconds,samspel:config}],{['samspel:'+part.block_id]:{participants,completed:part.completed,timeSeconds:part.elapsed}},{0:{elapsed:part.elapsed,samspel_swaps:config.manual_swaps}},data.manual_entry===true)
  if(result.issue)return {issue:result.issue}
  const actual=result.rows[0]
  if(!actual||actual.completed!==part.completed)return {issue:(part.title||'Øktdel')+': korrigeringa ville endra gjennomføringsstatus. PT- og planlenkjer må rettast samordna.'}
  updated.set(part.block_id,{...part,samspel:{...part.samspel,participant_results:actual.samspel.participant_results},distance:actual.distance,calories:actual.calories,...(config.main_track==='relay'?{relay_rounds:actual.relay_rounds}:{}),...(config.main_track==='chipper'?{chipper_progress:actual.chipper_progress}:{})})
 }
 return {patch:{result_data:{...data,samspel_blocks:data.samspel_blocks.map(part=>updated.get(part.block_id)||part),block_summary:data.block_summary.map(block=>{
  const part=updated.get(block.id)
  return part?{...block,samspel:{...block.samspel,participant_results:part.samspel.participant_results},distance:part.distance,calories:part.calories,...(part.samspel.main_track==='relay'?{relay_rounds:part.relay_rounds}:{}),...(part.samspel.main_track==='chipper'?{chipper_progress:part.chipper_progress}:{})}:block
 })}}}
}
export function samspelCorrectionPatch(workout,draft){
 if(!workout?.result_data?.samspel&&Array.isArray(workout?.result_data?.samspel_blocks))return compositeCorrectionPatch(workout.result_data,draft)
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
