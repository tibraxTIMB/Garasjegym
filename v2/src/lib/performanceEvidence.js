// Shared evidence boundary for personal result consumers. Legacy own logs may
// have no participation marker; explicitly unknown/redacted or team data cannot
// serve as individual evidence. This does not authorize access to another user.
export function isIndividualPerformance(log){
 const data=log?.result_data||{}
 if(data.synchron_result!=null||data.samspel_blocks?.length||data.wod_engine?.blocks?.some?.(block=>!!block.samspel)||data.flow_completion_only===true||(data.samspel!=null&&data.samspel!==false)||data.wod_engine?.participation&&data.wod_engine.participation!=='individual')return false
 if(data.participation_verified!=null&&data.participation_verified!=='individual')return false
 return true
}
export function isUsablePerformedSet(set){
 return !!set&&set.flow_status!=='skipped'&&!['partial','failed'].includes(set.complex_status)
}
// Match metadata to the actual stored set identity; do not use old prescribed
// numbers as the recorded result. A correction does not undo explicit skipping.
export function recordedSetsWithStatus(exercise,snapshot){
 const rows=exercise?.workout_sets??exercise?.sets??[]
 const matching=String(exercise?.exercise_name||'').trim().toLowerCase()===String(snapshot?.exercise_name||'').trim().toLowerCase()
 const old=matching&&Array.isArray(snapshot?.sets)?snapshot.sets:[]
 return rows.map((set,i)=>{
  const prev=old[(Number(set.set_number)||i+1)-1]
  return prev?{...set,flow_status:prev.flow_status??set.flow_status,complex_status:prev.complex_status??set.complex_status}:set
 })
}
export function performanceSnapshot(log,exercise,index){
 const snapshots=log?.result_data?.exercise_results||[]
 const pos=Number.isInteger(exercise?.sort_order)&&exercise.sort_order>0?exercise.sort_order-1:index
 return snapshots[pos]
}
