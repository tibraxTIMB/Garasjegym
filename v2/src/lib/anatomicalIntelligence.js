// Shared anatomical classification. Estimates, not measured activation.
export const MUSCLES = Object.freeze(['chest','front_deltoids','side_deltoids','rear_deltoids','triceps','biceps','forearms','lats','upper_back','spinal_erectors','abdominals','obliques','glutes','quadriceps','hamstrings','adductors','calves'])
const entries = [
[['back squat','barbell back squat'],['quadriceps','glutes'],['adductors'],['abdominals','spinal_erectors']],
[['front squat'],['quadriceps','glutes'],['adductors'],['upper_back','abdominals','spinal_erectors']],
[['deadlift','markløft','conventional deadlift'],['glutes','hamstrings'],['quadriceps','adductors'],['spinal_erectors','upper_back','forearms','abdominals']],
[['romanian deadlift','rdl','rumensk markløft'],['hamstrings','glutes'],['adductors'],['spinal_erectors','forearms','abdominals']],
[['bench press','barbell bench press','benkpress'],['chest','triceps'],['front_deltoids'],['upper_back']],
[['push-up','push-ups','push up','push ups'],['chest','triceps'],['front_deltoids'],['abdominals']],
[['pull-up','pull-ups','pull up','pull ups'],['lats','biceps'],['upper_back','forearms'],['abdominals']],
[['goblet squat'],['quadriceps','glutes'],['adductors'],['abdominals','upper_back']],
[['kettlebell swing','kettlebell swings'],['glutes','hamstrings'],['quadriceps'],['abdominals','spinal_erectors','forearms']],
[['rowing','row ergometer','romaskin','roing'],['quadriceps','glutes','upper_back'],['hamstrings','lats','biceps'],['abdominals','spinal_erectors']],
[['calf raise','calf raises'],['calves'],[],[]],
[['plank','planke'],['abdominals','obliques'],[],['glutes','front_deltoids']]
]
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
const profiles = new Map()
for (const [aliases,primary,secondary,stabilizing] of entries) {
 const all=[...primary,...secondary,...stabilizing]
 if(new Set(all).size!==all.length || all.some(m=>!MUSCLES.includes(m))) throw new Error('Invalid anatomy profile')
 const profile=Object.freeze({primary:Object.freeze(primary),secondary:Object.freeze(secondary),stabilizing:Object.freeze(stabilizing),reviewStatus:'provisional'})
 for(const alias of aliases){const key=normalize(alias);if(profiles.has(key))throw new Error('Duplicate anatomy alias');profiles.set(key,profile)}
}
export function anatomyForExercise(name){return profiles.get(normalize(name))??null}
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

export const MUSCLE_LABELS=Object.freeze({chest:'Bryst',front_deltoids:'Framside skulder',side_deltoids:'Side skulder',rear_deltoids:'Bakside skulder',triceps:'Triceps',biceps:'Biceps',forearms:'Underarmar',lats:'Breie ryggmuskel',upper_back:'Øvre rygg',spinal_erectors:'Ryggstrekkjarar',abdominals:'Mage',obliques:'Skrå magemusklar',glutes:'Sete',quadriceps:'Framside lår',hamstrings:'Bakside lår',adductors:'Innside lår',calves:'Leggar'})
// Only explicit positive performed reps or duration constitute evidence here.
// A prescribed weight, empty set or aggregate WOD score does not establish exercise completion.
export function documentedExerciseRows(exercises){
 return (exercises??[]).flatMap(exercise=>(exercise.workout_sets??exercise.sets??[]).filter(set=>Number(set.reps)>0||Number(set.time_seconds)>0).map(()=>({exerciseName:exercise.exercise_name,completed:true})))
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
