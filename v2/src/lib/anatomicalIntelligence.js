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
// Counts documented completed sets only; never treats missing results as completed.
export function summarizeMuscleExposure(rows){
 const exposure=Object.fromEntries(MUSCLES.map(m=>[m,0])), unclassified=new Set()
 let classifiedSets=0,unclassifiedSets=0
 for(const row of rows??[]){
  if(row?.completed!==true)continue
  const profile=anatomyForExercise(row.exerciseName)
  if(!profile){unclassified.add(String(row.exerciseName??'Ukjend'));unclassifiedSets++;continue}
  classifiedSets++
  for(const [role,weight] of [['primary',1],['secondary',0.5],['stabilizing',0.25]])for(const muscle of profile[role])exposure[muscle]+=weight
 }
 return {exposure,classifiedSets,unclassifiedSets,unclassified:[...unclassified],metric:'weighted-completed-set-exposure',reviewStatus:'provisional'}
}
