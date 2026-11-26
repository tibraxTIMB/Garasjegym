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
[['rowing','row ergometer','romaskin','roing','Row'],['quadriceps','glutes','upper_back'],['hamstrings','lats','biceps'],['abdominals','spinal_erectors']],
[['calf raise','calf raises'],['calves'],[],[]],
[['plank','planke'],['abdominals','obliques'],[],['glutes','front_deltoids']],
[["Air Squat","Medicine Ball Squat","Medicine Ball Bear-hug Squat","TRX Assisted Squat","Dumbbell Front Squat","Kettlebell Front Rack Squat"],["quadriceps","glutes"],["adductors"],["abdominals","spinal_erectors"]],
[["Box Step-up","Step-up","Dumbbell Step-up","Dumbbell Box Step-over","Walking Lunge","Dumbbell Reverse Lunge","Kettlebell Reverse Lunge","Medicine Ball Reverse Lunge","TRX Reverse Lunge","Bulgarian Split Squat"],["quadriceps","glutes"],["adductors","hamstrings"],["abdominals","calves"]],
[["Leg Press"],["quadriceps","glutes"],["adductors","hamstrings"],[]],
[["Glute bridge","Hip Thrust","Pilates Shoulder Bridge"],["glutes"],["hamstrings"],["abdominals"]],
[["Kettlebell markløft","Kettlebell Deadlift / Markløft","Markløft med manualar","Markløft med medisinball"],["glutes","hamstrings"],["quadriceps","adductors"],["spinal_erectors","upper_back","forearms","abdominals"]],
[["Kettlebell Suitcase Deadlift"],["glutes","hamstrings"],["quadriceps","adductors"],["obliques","spinal_erectors","forearms"]],
[["Dumbbell Romanian Deadlift"],["hamstrings","glutes"],["adductors"],["spinal_erectors","forearms","abdominals"]],
[["Barbell Row","Bent-over row"],["lats","upper_back"],["biceps","rear_deltoids"],["spinal_erectors","forearms","abdominals"]],
[["One-arm Dumbbell Row","Dumbbell row","Kettlebell Single-arm Row"],["lats","upper_back"],["biceps","rear_deltoids"],["forearms","obliques"]],
[["Chest-supported Dumbbell Row","TRX Row","Ring row"],["lats","upper_back"],["biceps","rear_deltoids"],["forearms"]],
[["TRX High Row","TRX Face Pull","TRX Reverse Fly","Dumbbell Rear Delt Fly","Band pull-apart"],["rear_deltoids","upper_back"],[],["forearms"]],
[["Lat Pulldown","Strict pull-up","Chest-to-Bar Pull-up"],["lats","biceps"],["upper_back","rear_deltoids"],["forearms","abdominals"]],
[["Bench press – manualar, flat","Dumbbell Floor Press","TRX Chest Press","TRX Push-up"],["chest","triceps"],["front_deltoids"],["upper_back"]],
[["Incline bench press – manualar","Incline bench press – stong","Incline Dumbbell Press"],["chest","front_deltoids"],["triceps"],["upper_back"]],
[["Dips"],["triceps","chest"],["front_deltoids"],["upper_back"]],
[["Strict press","Dumbbell Shoulder Press","Dumbbell Arnold Press","Handstand Push-up"],["front_deltoids","side_deltoids","triceps"],["upper_back"],["abdominals"]],
[["Dumbbell Lateral Raise","Cable Lateral Raise"],["side_deltoids"],["upper_back"],[]],
[["Dumbbell Front Raise"],["front_deltoids"],["chest"],[]],
[["Biceps Curl","Dumbbell Biceps Curl","EZ Bar Biceps Curl","Barbell Biceps Curl","Incline Dumbbell Biceps Curl","Alternating Dumbbell Biceps Curl","Preacher EZ Bar Curl","TRX Biceps Curl","Hammer Curl"],["biceps"],["forearms"],[]],
[["Triceps Pushdown","EZ Bar Skull Crusher","Dumbbell Skull Crusher","Dumbbell Overhead Triceps Extension","Dumbbell Triceps Kickback","Overhead Cable Triceps Extension","TRX Triceps Extension"],["triceps"],[],[]],
[["Farmer Carry","Farmers Carry","Farmer's Carry"],["forearms"],[],["upper_back","abdominals","obliques","glutes"]],
[["Dead Hang"],["forearms"],[],[]],
[["Active Hang"],["upper_back","lats"],[],["forearms"]],
[["Flexed-arm Hang"],["biceps","lats"],["forearms","upper_back"],[]],
[["Wall Sit"],["quadriceps","glutes"],[],[]],
[["Ab Wheel Rollout","Standing Ab Wheel Rollout","Barbell Rollout","TRX Fallout","TRX Body Saw"],["abdominals"],["lats"],["obliques","glutes","front_deltoids"]],
[["Side plank","Pilates Side Plank"],["obliques"],["glutes"],["front_deltoids"]],
[["TRX Plank","Hollow hold"],["abdominals","obliques"],[],[]],
[["Sit-up","Pilates Roll Up","Pilates Hundred","Pilates Double Leg Stretch","Pilates Single Leg Stretch"],["abdominals"],["obliques"],[]],
[["Russian twist","Pilates Criss Cross"],["obliques"],["abdominals"],[]],
[["Dead bug","Bird dog"],[],[],["abdominals","obliques","spinal_erectors"]],
[["TRX Hamstring Curl"],["hamstrings"],["glutes"],["abdominals"]],
[["TRX Pike","Toes-to-Bar","Mountain climber","TRX Mountain Climber"],["abdominals"],["obliques"],["front_deltoids"]],
[["Box Jump","Box Jump Over","Burpee Broad Jump"],["quadriceps","glutes","calves"],["hamstrings"],["abdominals"]],
[["Double Under","Single Under","Jump rope"],["calves"],["quadriceps"],["forearms","abdominals"]],
[["Bike Erg"],["quadriceps","glutes"],["hamstrings","calves"],[]],
[["Jogging"],["quadriceps","glutes","calves"],["hamstrings"],["abdominals"]],
[["SkiErg"],["lats","triceps","abdominals"],["glutes","hamstrings"],["forearms"]],
[["Burpee","Burpee Box Jump Over","Bar-facing Burpee Over Barbell","Lateral Burpee Over Barbell","Burpee Over Dumbbell","Burpee to Target"],["quadriceps","glutes","chest","triceps"],["calves","front_deltoids"],["abdominals"]],
[["Push Press","Dumbbell Push Press","Kettlebell Push Press","Push Jerk","Power Jerk","Split Jerk"],["quadriceps","glutes","front_deltoids","triceps"],["side_deltoids","calves"],["abdominals","upper_back"]],
[["Thruster","Dumbbell Thruster","Kettlebell Thruster","Wall Ball Shot"],["quadriceps","glutes","front_deltoids","triceps"],["calves"],["abdominals","upper_back"]],
[["Power Clean","Hang Power Clean","High Hang Clean","Hang Clean","Dumbbell Hang Clean","Kettlebell Clean","Medicine Ball Clean","Squat Clean","Hang Squat Clean"],["quadriceps","glutes","hamstrings"],["upper_back","calves"],["abdominals","spinal_erectors","forearms"]],
[["Power Snatch","Hang Power Snatch","High Hang Snatch","Snatch","Hang Squat Snatch","Dumbbell Snatch","Kettlebell Snatch"],["quadriceps","glutes","hamstrings"],["upper_back","calves"],["abdominals","spinal_erectors","forearms","side_deltoids"]],
[["Clean Pull","Clean High Pull","Snatch Pull","Kettlebell High Pull"],["glutes","hamstrings","quadriceps"],["upper_back","calves"],["forearms","spinal_erectors"]],
[["Overhead Squat","Snatch Balance","Squat Jerk"],["quadriceps","glutes"],["adductors"],["upper_back","side_deltoids","abdominals"]],
[["Kettlebell Dead-stop Swing"],["glutes","hamstrings"],["quadriceps"],["abdominals","spinal_erectors","forearms"]],
[["Medicine Ball Slam"],["lats","abdominals"],["triceps","glutes"],["forearms"]],
[["Dumbbell Pullover"],["lats","chest"],["triceps"],["abdominals"]],
[["Pilates Clam","Pilates Side Kick"],["glutes"],[],["obliques"]],
[["Pilates Swan Prep","Pilates Swimming"],["spinal_erectors"],["glutes","upper_back"],["abdominals"]],
[["Quad set"],["quadriceps"],[],[]],
[["Scapular retraction","TRX Y-Fly"],["upper_back"],["rear_deltoids"],[]],
[["Sit-to-stand","TRX Assisted Pistol Squat"],["quadriceps","glutes"],["adductors"],["abdominals"]],
[["TRX Atomic Push-up"],["chest","triceps","abdominals"],["front_deltoids"],["obliques"]],
[["Clean and Jerk","Kettlebell Clean and Press"],["quadriceps","glutes","front_deltoids","triceps"],["hamstrings","upper_back"],["abdominals","forearms"]],
[["Burpee Pull-up"],["quadriceps","glutes","chest","triceps","lats","biceps"],["front_deltoids","calves"],["abdominals","forearms"]],
[["Dumbbell Upright Row"],["side_deltoids","upper_back"],["biceps"],["forearms"]],
[["Muscle Clean","Tall Clean"],["upper_back"],["biceps","front_deltoids"],["abdominals","forearms"]],
[["Muscle Snatch","Tall Snatch"],["upper_back","side_deltoids"],["triceps"],["abdominals","forearms"]]
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
 return (exercises??[]).flatMap(exercise=>(exercise.workout_sets??exercise.sets??[]).filter(set=>!['partial','failed'].includes(set.complex_status)&&[set.reps,set.time_seconds].some(v=>Number.isFinite(Number(v))&&Number(v)>0)).map(()=>({exerciseName:exercise.exercise_name,completed:true})))
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
  const data=log.result_data||{},date=log.workout_date
  if(!date||date<iso(start)||date>iso(end)||log.id&&seen.has(log.id)||data.flow_completion_only||data.samspel?.team_score||data.wod_engine?.participation&&data.wod_engine.participation!=='individual')return []
  if(log.id)seen.add(log.id)
  const recorded=log.workout_exercises||[],snapshots=data.exercise_results||[]
  return recorded.map((ex,i)=>{
   const snapshot=snapshots[i]
   // For complexes, only use explicitly completed cycles; unmatched evidence is unknown.
   if(snapshot?.is_complex&&snapshot.complex_family==='custom'){
    if(normalize(snapshot.exercise_name)!==normalize(ex.exercise_name))return {...ex,workout_sets:[]}
    return {...ex,workout_sets:(snapshot.sets||[]).filter(s=>s.complex_status==='complete')}
   }
   return ex
  })
 })
}
