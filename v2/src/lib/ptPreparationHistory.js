// Only explicitly linked, completed PT tasks for the currently selected customer.
// No direct workout_logs read. Never infer personal metrics from combined results.
export function priorPtReferences({clientId,wodId,assignments=[],programs=[],sessions=[],excludeId}={}){
 if(!clientId||!wodId)return []
 const allowed=new Set(programs.filter(p=>p.client_id===clientId).map(p=>p.id))
 const rows=[
  ...assignments.filter(a=>a.member_id===clientId&&a.wod_id===wodId&&a.status==='completed'&&a.workout_log_id).map(a=>({kind:'assignment',id:a.id,log:a.workout_log_id,date:a.completed_at||''})),
  ...sessions.filter(s=>allowed.has(s.program_id)&&s.wod_id===wodId&&s.id!==excludeId&&s.status==='completed'&&s.workout_log_id).map(s=>({kind:'program',id:s.id,log:s.workout_log_id,date:s.completed_at||''}))
 ].sort((a,b)=>b.date.localeCompare(a.date))
 const seen=new Set()
 return rows.filter(r=>!seen.has(r.log)&&(seen.add(r.log),true)).slice(0,3)
}
export function priorPtSummary(result){
 if(!result||!result.id)return null
 const d=result.result_data||{}
 if(d.samspel?.team_score||d.wod_engine?.participation&&d.wod_engine.participation!=='individual')return {date:result.workout_date,team:true,rows:[]}
 // No effort inference; show exactly saved values. Partial complexes do not supply a load reference.
 const present=v=>v!=null&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0
 const rows=(Array.isArray(d.exercise_results)?d.exercise_results:[]).flatMap(e=>{
  const sets=(e.sets||[]).filter(s=>s.flow_status!=='done'&&s.flow_status!=='skipped'&&(!e.is_complex||e.complex_family!=='custom'||s.complex_status==='complete'))
  const entries=sets.filter(s=>[s.reps,s.load_kg,s.time_seconds].some(present)).map(s=>[present(s.reps)?s.reps+' reps':'',present(s.load_kg)?s.load_kg+' kg':'',present(s.time_seconds)?s.time_seconds+' sek':''].filter(Boolean).join(' · '))
  return entries.length?[{name:e.exercise_name,entries:entries.slice(0,4),more:Math.max(0,entries.length-4)}]:[]
 })
 return {date:result.workout_date,team:false,rows}
}
