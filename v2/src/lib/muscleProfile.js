const groups={
 chest:'Bryst',shoulders:'Skuldrer',back:'Rygg',arms:'Armar',core:'Kjerne',glutes:'Sete',quads:'Framside lår',hamstrings:'Bakside lår',calves:'Leggar'
}
const rules=[
 [/bench press|benkpress|push[ -]?up|chest press|floor press|dips?/i,['chest'],['arms','shoulders']],
 [/pull[ -]?up|chin[ -]?up|lat pulldown|trx row|barbell row|dumbbell row|bent over row|ring row|seated row/i,['back'],['arms','shoulders']],
 [/deadlift|markløft|romanian|good morning|hip thrust|glute bridge|kettlebell swing/i,['glutes','hamstrings'],['back','core']],
 [/squat|knebøy|lunge|utfall|step[ -]?up|box jump|wall ball/i,['quads','glutes'],['hamstrings','core','calves']],
 [/clean|snatch|thruster|jerk/i,['quads','glutes','shoulders'],['hamstrings','back','core','arms']],
 [/overhead press|shoulder press|push press|military press|handstand push/i,['shoulders'],['arms','core']],
 [/biceps curl|hammer curl|triceps extension|skull crusher/i,['arms'],[]],
 [/sit[ -]?up|plank|dead bug|hollow hold|toes[ -]?to[ -]?bar|russian twist|crunch/i,['core'],[]],
 [/calf raise|tåhev|double unders|jump rope|hoppetau/i,['calves'],['core']],
 [/burpee/i,['chest','quads'],['arms','shoulders','core','glutes']],
 [/farmers? carry|farmer.s walk/i,['arms','core'],['back','shoulders']]
]
export function muscleProfile(items=[]){
 const primary=new Set(),secondary=new Set();let known=0,total=0
 for(const item of items){
  if(item?.is_rest)continue
  const name=typeof item==='string'?item:item?.exercise_name||item?.name||''
  if(!name||/^pause$|^rest$/i.test(name))continue
  const steps=Array.isArray(item?.complex_steps)&&item.complex_steps.length?item.complex_steps.map(s=>s.name||s.exercise_name||''):[name]
  for(const movement of steps){total++;const rule=rules.find(r=>r[0].test(movement));if(!rule)continue;known++;rule[1].forEach(g=>primary.add(g));rule[2].forEach(g=>secondary.add(g))}
 }
 primary.forEach(g=>secondary.delete(g))
 return {primary:[...primary],secondary:[...secondary],known,total}
}
export const MUSCLE_LABELS=groups
