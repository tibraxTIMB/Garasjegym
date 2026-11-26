import {exerciseMuscleProfile,DETAILED_MUSCLE_LABELS} from './exerciseMuscleProfiles.js'
// One exercise classification catalogue; history adapts its group identifiers only.
const keyMap=Object.freeze({"chest":"chest","frontDelts":"front_deltoids","sideDelts":"side_deltoids","rearDelts":"rear_deltoids","triceps":"triceps","biceps":"biceps","forearms":"forearms","lats":"lats","upperBack":"upper_back","lowerBack":"spinal_erectors","abs":"abdominals","obliques":"obliques","glutes":"glutes","quads":"quadriceps","hamstrings":"hamstrings","adductors":"adductors","calves":"calves","abductors":"abductors","hipFlexors":"hip_flexors","rotatorCuff":"rotator_cuff"})
export const MUSCLES=Object.freeze(Object.values(keyMap))
const normalize=value=>String(value??'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
const cache=new WeakMap()
export function anatomyForExercise(name){
 const profile=exerciseMuscleProfile(name)
 if(!profile||!Array.isArray(profile.primary))return null
 if(cache.has(profile))return cache.get(profile)
 const used=new Set()
 const translate=keys=>Object.freeze((keys||[]).map(k=>keyMap[k]).filter(k=>k&&!used.has(k)&&(used.add(k),true)))
 const result=Object.freeze({primary:translate(profile.primary),secondary:translate(profile.secondary),stabilizing:translate(profile.stabilizers),mode:profile.mode,reviewStatus:'provisional'})
 cache.set(profile,result)
 return result
}
// Role counts are descriptive, not a physiological load or recovery score.
export function summarizeMuscleExposure(rows){
 const roles=Object.fromEntries(MUSCLES.map(m=>[m,{primary:0,secondary:0,stabilizing:0}]))
 const unclassified=new Set()
 let classifiedSets=0,unclassifiedSets=0
 for(const row of rows??[]){
  if(row?.completed!==true)continue
  const profile=anatomyForExercise(row.exerciseName)
  if(!profile){unclassified.add(String(row.exerciseName??'Ukjend'));unclassifiedSets++;continue}
  classifiedSets++
  for(const role of ['primary','secondary','stabilizing'])for(const muscle of profile[role])roles[muscle][role]++
 }
 return {roles,classifiedSets,unclassifiedSets,unclassified:[...unclassified],metric:'documented-sets-by-muscle-role',reviewStatus:'provisional'}
}

export const MUSCLE_LABELS=Object.freeze(Object.fromEntries(Object.entries(keyMap).map(([key,id])=>[id,DETAILED_MUSCLE_LABELS[key]])))
// Only explicit positive performed reps or duration constitute evidence here.
// A prescribed weight, empty set or aggregate WOD score does not establish exercise completion.
export function documentedExerciseRows(exercises){
 return (exercises??[]).flatMap(exercise=>{
  if(!exercise||exercise.is_rest)return []
  const name=exercise.exercise_name||exercise.name
  if(!name)return []
  const positive=v=>v!=null&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>0
  const sets=(exercise.workout_sets??exercise.sets??[]).filter(set=>set&&set.flow_status!=='skipped'&&!['partial','failed'].includes(set.complex_status)&&[set.reps,set.time_seconds].some(positive))
  if(sets.length)return sets.map(()=>({exerciseName:name,completed:true}))
  // Explicitly recorded erg measurements are evidence of movement, not strength sets.
  if([exercise.meters,exercise.calories,exercise.work_seconds].some(positive))return [{exerciseName:name,completed:true}]
  return []
 })
}
// Planned movement occurrences, not performed sets or estimated muscle load.
export function plannedAnatomyRows(items=[]){
 return items.flatMap(item=>{
  if(item?.is_rest)return []
  const name=typeof item==='string'?item:item?.exercise_name||item?.name
  if(!name||/^(pause|rest)$/i.test(name))return []
  const movements=Array.isArray(item?.complex_steps)&&item.complex_steps.length?item.complex_steps.map(s=>s.name||s.exercise_name):[name]
  return movements.filter(Boolean).map(exerciseName=>({exerciseName,completed:true}))
 })
}
export function muscleExerciseEvidence(rows){
 const groups=new Map()
 for(const row of rows??[]){
  if(row.completed!==true)continue
  const profile=anatomyForExercise(row.exerciseName)
  if(!profile)continue
  for(const role of ['primary','secondary','stabilizing'])for(const muscle of profile[role]){
   if(!groups.has(muscle))groups.set(muscle,{primary:new Set(),secondary:new Set(),stabilizing:new Set()})
   groups.get(muscle)[role].add(row.exerciseName)
  }
 }
 return groups
}

// Calendar-day window in the device's local time, not a UTC rolling interval.
// Team results cannot establish an individual member's muscle exposure.
export function historyAnatomyExercises(logs,days=7,now=new Date()){
 const end=new Date(now),start=new Date(now)
 if(![7,14,30].includes(days)||!Number.isFinite(end.getTime()))return []
 start.setDate(start.getDate()-days+1)
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
 const seen=new Set()
 return (logs||[]).flatMap(log=>{
  const date=log.workout_date
  if(!date||date<iso(start)||date>iso(end)||log.id&&seen.has(log.id))return []
  if(log.id)seen.add(log.id)
  return workoutAnatomyExercises(log)
 })
}

// Shared evidence selection for an individual completed report and its history.
export function workoutAnatomyExercises(log={}){
 const data=log.result_data||{}
 if(data.flow_completion_only||data.samspel?.team_score||data.wod_engine?.participation&&data.wod_engine.participation!=='individual')return []
 const recorded=log.workout_exercises||log.exercises||[],snapshots=Array.isArray(data.exercise_results)?data.exercise_results:[]
 if(!recorded.length)return snapshots
 return [...recorded].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)).map((ex,i)=>{
  const snapshot=snapshots[i],matches=snapshot&&normalize(snapshot.exercise_name)===normalize(ex.exercise_name)
  if(snapshot?.is_complex&&snapshot.complex_family==='custom'){
   if(!matches)return {...ex,workout_sets:[]}
   return {...ex,workout_sets:(snapshot.sets||[]).filter(s=>s.complex_status==='complete')}
  }
  return matches?{...ex,meters:ex.meters??snapshot.meters,calories:ex.calories??snapshot.calories,work_seconds:ex.work_seconds??snapshot.work_seconds}:ex
 })
}
