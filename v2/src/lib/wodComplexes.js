const complex = (id,name,equipment,complexFamily,description,steps) => ({
  id: `builtin-${id}`,
  name,
  category: 'Complex',
  stimulus: 'SAMANSETT KOMPLEKS',
  body_area: 'Heile kroppen',
  equipment,
  description,
  video_url: null,
  is_rehab: false,
  is_golf: false,
  is_complex: true,
  complex_family: complexFamily,
  complex_steps: steps.map(([name,reps]) => ({ name, reps })),
  default_complex_rounds: 5,
});

export const COMPLEX_EXERCISES = Object.freeze([
  complex('bear-complex','Bear Complex','Vektstong','barbell','Eitt samanhengande stongkompleks. Hald same belastning gjennom heile sekvensen og set stonga ned mellom rundane.',[['Power clean',1],['Front squat',1],['Push press',1],['Back squat',1],['Push press',1]]),
  complex('clean-jerk-complex','Clean & Jerk Complex','Vektstong','barbell','Teknisk stongkompleks for trekk, mottak og støyt. Bruk same belastning gjennom sekvensen.',[['Clean pull',1],['Hang power clean',1],['Front squat',1],['Split jerk',1]]),
  complex('snatch-complex','Snatch Complex','Vektstong','barbell','Snatch-teknikk med trekk, hengande snatch og stabil mottaksposisjon.',[['Snatch pull',1],['Hang power snatch',1],['Overhead squat',1]]),
  complex('barbell-cycling-complex','Barbell Cycling 3–2–1','Vektstong','barbell','Kort stongsekvens for kontrollert cycling. Fullfør alle rørsler før du set stonga frå deg.',[['Deadlift',3],['Hang power clean',2],['Push jerk',1]]),
  complex('dumbbell-full-body','Dumbbell Full Body Complex','To manualar','dumbbell','Kontinuerleg heil kropp-sekvens med to manualar. Byt side eller hald begge manualane gjennom heile komplekset.',[['DB Romanian deadlift',6],['DB hang clean',6],['DB front squat',6],['DB push press',6]]),
  complex('armor-building','Armor Building Complex','To kettlebells','kettlebell','Double kettlebell-kompleks: clean, press og front squat. Bruk same par kettlebells gjennom runden.',[['Double kettlebell clean',2],['Double kettlebell strict press',1],['Double kettlebell front squat',3]]),
  complex('landmine-flow','Landmine Flow Complex','Landmine','landmine','Heil kropp-sekvens med landmine. Fullfør alle repetisjonane på éi side før du byter side.',[['Landmine deadlift',6],['Landmine row',6],['Landmine squat',6],['Landmine press',6]]),
]);

export function formatComplexSequence(steps = []) {
  if (!Array.isArray(steps)) return '';
  return steps
    .filter(step => step && typeof step.name === 'string' && step.name.trim())
    .map((step, index) => `${index + 1}. ${Number(step.reps) || 1} × ${step.name.trim()}`)
    .join(' → ');
}

export function isValidComplexExercise(exercise) {
  return Boolean(
    exercise?.is_complex === true &&
    Array.isArray(exercise.complex_steps) &&
    exercise.complex_steps.length >= 2 &&
    exercise.complex_steps.every(step =>
      typeof step?.name === 'string' && step.name.trim() &&
      Number.isInteger(Number(step.reps)) && Number(step.reps) > 0
    )
  );
}

/** A WOD-local complex uses real movement IDs; never insert a synthetic library exercise. */
export function buildCustomComplex(steps){
 if(!Array.isArray(steps)||steps.length<2||steps.some(step=>!step.exercise_id||!step.name?.trim()||!Number.isInteger(Number(step.reps))||Number(step.reps)<1))throw Error('Vel minst to bibliotekøvingar med positive heile reps.')
 const normalized=steps.map(step=>({exercise_id:step.exercise_id,name:step.name.trim(),reps:Number(step.reps)}))
 return {id:null,name:normalized.map(step=>step.reps+' '+step.name).join(' + '),category:'Complex',body_area:'Heile kroppen',is_complex:true,complex_family:'custom',complex_steps:normalized}
}
export function complexResultSummary(item){
 const sets=(item?.sets||[]).filter(s=>['complete','partial','failed'].includes(s.complex_status))
 const successful=sets.filter(s=>s.complex_status==='complete'&&Number.isInteger(Number(s.reps))&&Number(s.reps)>0)
 const weights=successful.filter(s=>s.load_kg!=null&&String(s.load_kg).trim()!==''&&Number.isFinite(Number(s.load_kg))&&Number(s.load_kg)>=0).map(s=>Number(s.load_kg))
 return {attempts:sets.length,completed:successful.length,partial:sets.filter(s=>s.complex_status==='partial').length,failed:sets.filter(s=>s.complex_status==='failed').length,best_load_kg:weights.length?Math.max(...weights):null}
}

export function plannedComplexCycles(item,level='rx'){
 const raw=item?.prescription_levels?.[level]?.reps??item?.levels?.[level]?.reps??item?.complex_planned_cycles??item?.reps
 const count=Number(raw)
 return Number.isInteger(count)&&count>0?count:1
}
// The button is an explicit confirmation, never triggered by entering a weight.
// Preserve already classified attempts and all blank rows.
export function confirmWeightedComplexSets(sets=[],cycles=1){
 return sets.map(set=>!set.complex_status&&set.load_kg!=null&&String(set.load_kg).trim()!==''&&Number.isFinite(Number(set.load_kg))&&Number(set.load_kg)>=0?{...set,complex_status:'complete',reps:String(cycles)}:set)
}
