const normalized=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
const present=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))
export function previousExerciseResult(logs,item){
 if(!item||item.is_rest)return null
 const id=item.exercise_id
 const name=normalized(item.exercise_name||item.name)
 if(!name)return null
 for(const log of logs||[]){
  const matches=(log.workout_exercises||[]).filter(e=>id&&e.exercise_id?String(id)===String(e.exercise_id):normalized(e.exercise_name)===name)
  const sets=matches.flatMap(e=>e.workout_sets||[]).filter(s=>[s.reps,s.load_kg,s.height_cm,s.time_seconds].some(present))
  if(!sets.length)continue
  const values=sets.map(s=>[present(s.reps)?s.reps+' reps':'',present(s.load_kg)?s.load_kg+' kg':'',present(s.height_cm)?s.height_cm+' cm':'',present(s.time_seconds)?s.time_seconds+' sek':''].filter(Boolean).join(' × '))
  return {date:log.workout_date,summary:values.slice(0,4).join(' · ')+(values.length>4?' · +'+(values.length-4)+' sett':'')}
 }
 return null
}
