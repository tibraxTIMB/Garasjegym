/** PT follow-up metrics derived solely from a workout explicitly linked to a PT assignment. */
export function validRoundSplits(result) {
 const values=result?.result_data?.split_seconds
 return Array.isArray(values)?values.filter(value=>Number.isFinite(Number(value))&&Number(value)>0).map(Number).slice(0,50):[]
}
export function pacingReview(result) {
 const splits=validRoundSplits(result)
 if(splits.length<3)return {kind:'insufficient',text:'For få registrerte rundetider til å vurdera tempo.',splits}
 const first=splits[0],last=splits[splits.length-1]
 const ratio=last/first
 if(ratio>=1.6&&splits[1]>=first*1.25)return {kind:'review',text:'Store skilnader mellom rundetidene. Det kan vera nyttig å spørja om opningstempo, pausar, teknikk og belastning før du justerer doseringa.',splits,ratio}
 if(ratio>=1.25)return {kind:'observe',text:'Rundetidene aukar gjennom økta. Sjekk gjerne opplevd intensitet og om det var planlagde pausar.',splits,ratio}
 if(ratio<=0.75)return {kind:'observe',text:'Siste runde er merkbart raskare enn den første. Spør om kunden opna kontrollert eller endra arbeidsmengda.',splits,ratio}
 return {kind:'steady',text:'Rundetidene ligg relativt jamt. Dette åleine er ikkje nok til å avgjera om belastninga var riktig.',splits,ratio}
}
export function formatDuration(seconds) {
 const n=Math.max(0,Math.round(Number(seconds)||0))
 return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`
}
export function ptResultSummary(result) {
 if(!result)return []
 const d=result.result_data||{}
 const f=String(result.format||'').toLowerCase()
 const metrics=[]
 const put=(label,value)=>{if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))metrics.push({label,value})}
 const number=(value)=>Number.isFinite(Number(value))?Number(value):null
 const hasRounds=f==='amrap'||f==='death by'||f==='ladder'||(f==='couplet'||f==='triplet')&&d.combination_mode==='AMRAP'
 if(hasRounds)put('Rundar',result.score_rounds)
 if((f==='amrap'||(f==='couplet'||f==='triplet')&&d.combination_mode==='AMRAP')&&result.score_reps!=null)put('Ekstra reps',result.score_reps)
 if(f==='death by'&&d.death_by?.failed_round!=null)put('Stoppa i runde',d.death_by.failed_round)
 if(result.score_time_seconds!=null)metrics.push({label:d.time_cap_reached?'Tidsgrense':'Sluttid',value:formatDuration(result.score_time_seconds)})
 else if(d.elapsed_seconds!=null&&number(d.elapsed_seconds)>0)metrics.push({label:'Medgått tid',value:formatDuration(d.elapsed_seconds)})
 if(result.score_load_kg!=null)metrics.push({label:'Tungaste løft',value:`${result.score_load_kg} kg`})
 if(result.score_distance!=null)metrics.push({label:'Distanse',value:`${result.score_distance} ${result.score_unit||'m'}`})
 return metrics.slice(0,5)
}
export const ptDosingOptions=[
 {value:'appropriate',label:'Passande dosering'},
 {value:'lighter',label:'Vurder lettare'},
 {value:'heavier',label:'Vurder tyngre'},
 {value:'pacing',label:'Juster disponering'},
 {value:'discuss',label:'Ta opp neste gong'}
]
export function dosageLabel(value){return ptDosingOptions.find(o=>o.value===value)?.label||'Oppfølging'}

/** The target is advisory; do not infer actual reps/loads from a prescription. */
export function plannedDoseForExercise(schema,exerciseName,level='rx') {
 const items=Array.isArray(schema?.items)?schema.items:[]
 const item=items.find(x=>String(x.exercise_name||'').trim().toLowerCase()===String(exerciseName||'').trim().toLowerCase())
 if(!item)return null
 const dose=item.levels?.[level]||item.levels?.rx||{}
 const reps=dose.reps??item.reps
 const count=Array.isArray(item.sets)?item.sets.length:0
 const parts=[]
 if(count>0)parts.push(count+' planlagde sett')
 if(reps!=null&&String(reps).trim()!=='')parts.push(String(reps)+' reps')
 const height=dose.heightCm??item.height_cm
 if(height!=null&&height!=='')parts.push(height+' cm')
 return parts.length?parts.join(' · '):null
}
