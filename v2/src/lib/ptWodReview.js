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

/** Distinguish an athlete's manual early transition from a completed time interval. */
export function ptPartCompletion(part) {
 const planned=Number(part?.duration_seconds)
 const elapsed=Number(part?.elapsed)
 const format=String(part?.format||'').toLowerCase()
 const fixedLength=/^(e\d+(?:\.\d+)?mom|emom|amrap|tabata|intervall|stasjonssirkel|row intervals)$/.test(format)
 if(part?.time_cap_reached)return {label:'Tidsramma nådd',kind:'timed'}
 if(!part?.completed)return {label:'Ikkje stadfesta fullført',kind:'unknown'}
 if(fixedLength&&Number.isFinite(planned)&&planned>0&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed+3<planned){
  const isEmom=/^(e\d+(?:\.\d+)?mom|emom)$/.test(format)
  // Timer phase FULLFØRT is emitted when the athlete explicitly presses finish/next.
  // It confirms the manual transition, not the exact number of reps done.
  if(isEmom&&part.phase==='FULLFØRT')
   return {label:'Manuelt vidare',kind:'manual',detail:`Klokka viste ${formatDuration(elapsed)} av ${formatDuration(planned)} då delen vart avslutta manuelt. Dette kan vera etter siste arbeidssett. Ingen avvik i øvingane er oppgjevne.`}
  return {label:'Avslutta før planlagt tid',kind:'early',detail:`Registrert ${formatDuration(elapsed)} av planlagde ${formatDuration(planned)}. Om siste arbeidssett var ferdig, kan dette vera ein manuell overgang.`}
 }
 return {label:'Registrert gjennomført',kind:'done'}
}

/** AMRAP scores and split times belong to their own part in a composite WOD. */
export function ptIsAmrapPart(part) {
 return String(part?.format||'').toLowerCase()==='amrap'
  || ['couplet','triplet'].includes(String(part?.format||'').toLowerCase())&&String(part?.combination_mode||'').toUpperCase()==='AMRAP'
}
export function ptPartScore(part) {
 if(!part)return null
 if(ptIsAmrapPart(part)){
  const rounds=Number(part.roundsCompleted)
  const extras=Number(part.extra_reps)
  if(!Number.isFinite(rounds)||rounds<0)return null
  return `${rounds} rundar${Number.isFinite(extras)&&extras>0?' + '+extras+' reps':''}`
 }
 if(part.format==='Death By'&&part.death_by_completed_rounds!=null)return String(part.death_by_completed_rounds)+' rundar'
 if(part.format==='Ladder'&&part.ladder_completed_rounds!=null)return String(part.ladder_completed_rounds)+' trinn'
 return null
}
export function ptRoundSplits(result,part=null) {
 const source=part?part.laps:result?.result_data?.split_seconds
 return Array.isArray(source)?source.filter(x=>x!==''&&x!=null&&Number.isFinite(Number(x))&&Number(x)>0).map(Number).slice(0,50):[]
}
export function ptReviewHighlights(result) {
 if(!result)return []
 const parts=Array.isArray(result.result_data?.block_summary)?result.result_data.block_summary:[]
 if(!parts.length)return ptResultSummary(result)
 const out=[]
 const elapsed=Number(result.result_data?.elapsed_seconds)
 if(Number.isFinite(elapsed)&&elapsed>0)out.push({label:'Medgått tid',value:formatDuration(elapsed)})
 const amrap=parts.filter(ptIsAmrapPart).slice(-1)[0]
 if(amrap&&ptPartScore(amrap))out.push({label:'AMRAP-resultat',value:ptPartScore(amrap)})
 if(result.result_data?.prescription_level)out.push({label:'Nivå',value:String(result.result_data.prescription_level).toUpperCase()})
 return out.slice(0,3)
}

/**
 * A completed AMRAP/EMOM follows its prescribed structure unless the athlete
 * records an exception. This is an interpretation, never a claim that every
 * prescribed rep was independently measured. Do not write it back to the log.
 */
export function ptPrescribedWorkContext(result,schema,exercise) {
 if(!result||!exercise)return null
 const blocks=Array.isArray(result.result_data?.block_summary)?result.result_data.block_summary:[]
 const part=exercise.block_id?blocks.find(block=>String(block.id)===String(exercise.block_id)):null
 const format=String(part?.format||result.format||'').toLowerCase()
 const isEmom=/^(e\d+(?:\.\d+)?mom|emom)$/.test(format)
 const isAmrap=ptIsAmrapPart(part||{format:result.format,combination_mode:result.result_data?.combination_mode})
 if(!isEmom&&!isAmrap)return null
 if(part?.completed===false||(!part&&result.result_data?.completed===false))
  return {kind:'unconfirmed',text:'Denne øktdelen er ikkje registrert fullført. Ikkje legg til grunn at alle planlagde repetisjonar vart utførte.'}
 const item=(Array.isArray(schema?.items)?schema.items:[]).find(x=>String(x.block_id||'')===String(exercise.block_id||'')&&String(x.exercise_name||'').trim().toLowerCase()===String(exercise.exercise_name||'').trim().toLowerCase())
 const hasSource=Boolean(item)
 if(!hasSource)return {kind:'reported',text:'Øktdelen er registrert gjennomført. Ingen avvik er oppgjevne, men detaljert dosering er ikkje verifisert.'}
 const explicit=Array.isArray(exercise.sets)?exercise.sets:[]
 const level=String(result.result_data?.prescription_level||'rx').toLowerCase()
 const prescribedReps=Number(item.levels?.[level]?.reps??item.reps)
 const measuredReps=explicit.filter(set=>set?.reps!=null&&set.reps!=='').map(set=>Number(set.reps))
 const mismatch=Number.isFinite(prescribedReps)&&prescribedReps>0&&measuredReps.some(reps=>Number.isFinite(reps)&&reps!==prescribedReps)
 if(mismatch)return {kind:'deviation',text:'Registrerte repetisjonar skil seg frå WOD-oppsettet. Bruk dei faktiske registreringane i vurderinga.'}
 if(isAmrap)return {kind:'assumed',text:'AMRAP: øvinga blir rekna som gjennomført etter WOD-oppsettet innanfor registrert skår, dersom ingen avvik er meldt. Detaljreps er ikkje målt automatisk.'}
 const origin=(Array.isArray(schema?.composite_blocks)?schema.composite_blocks:[]).find(block=>String(block.id)===String(exercise.block_id))
 const interval=Number(origin?.emomIntervalSeconds||schema?.interval?.work_every_seconds||0)
 const parsed=String(part?.format||result.format||'').match(/^e(\d+(?:\.\d+)?)mom$/i)
 const seconds=interval>0?interval:parsed?Math.round(Number(parsed[1])*60):60
 const duration=Number(part?.duration_seconds||origin?.duration_seconds||schema?.duration_seconds||0)
 const count=seconds>0&&duration>0?Math.floor(duration/seconds):0
 const prescribedSet=count>0&&Number.isInteger(prescribedReps)&&prescribedReps>0?`${count} planlagde intervall × ${prescribedReps} reps`:count>0?`${count} planlagde intervall`:null
 return {kind:'assumed',text:`EMOM: ${prescribedSet?prescribedSet+'. ':''}Øvinga blir rekna som gjennomført etter WOD-oppsettet når ingen avvik er meldt; det er ikkje ei måling av kvart sett.`}
}
