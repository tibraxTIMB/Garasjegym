// Multi-part workouts reuse the existing WOD engine and Timer for each part.
// No separate timer is introduced. Blocks, pauses and outcomes live in the WOD schema.
export const COMPOSITE_FORMAT = 'Samansett økt'
export const COMPOSITE_BLOCK_FORMATS = [
 'AMRAP','For Time','Chipper','Couplet','Triplet','Ladder','Death By',
 'E1MOM','E1.25MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM',
 'Intervall','Tabata','Row Intervals','Stasjonssirkel',
 'Strength','Superset','Complex','Eigen økt',
]
export const COMPOSITE_INTERVAL_FORMATS = ['Intervall','Tabata','Row Intervals']
export const COMPOSITE_STRENGTH_FORMATS = ['Strength','Superset','Complex']
export const COMPOSITE_FOR_TIME_FORMATS = ['For Time','Chipper','Couplet','Triplet','Ladder','Death By']

export const defaultCompositeBlocks = () => [
 {id:'a',title:'Del A',format:'E3MOM',minutes:9,transitionMode:'manual',transitionSeconds:0},
 {id:'b',title:'Del B',format:'AMRAP',minutes:8,transitionMode:'manual',transitionSeconds:0},
]

export function compositeIntervalMinutes(format) {
 const match = /^E(1(?:\.25)?|[2-7])MOM$/.exec(String(format||''))
 return match ? Number(match[1]) : null
}

export function compositeBlockDuration(block, itemsCount=1) {
 const format=String(block?.format||'')
 // Older saved block engines only carried duration_seconds, not minutes/round settings.
 if(block?.minutes==null && Number(block?.duration_seconds)>0)return Math.round(Number(block.duration_seconds))
 if(COMPOSITE_INTERVAL_FORMATS.includes(format) || format==='Stasjonssirkel'){
  const work=Math.max(1,Math.floor(Number(block?.workSeconds) || (format==='Tabata'?20:45)))
  const rest=Math.max(0,Math.floor(Number(block?.restSeconds ?? (format==='Tabata'?10:15))))
  const rounds=Math.max(1,Math.floor(Number(block?.rounds) || (format==='Tabata'?8:3)))
  const slots=Math.max(1,Math.floor(Number(itemsCount)||1))
  const total=rounds*slots
  return work*total+rest*Math.max(0,total-1)
 }
 return Math.max(0,Math.round(Number(block?.minutes || 0)*60))
}

export function compositeTransitionSeconds(block) {
 return block?.transitionMode==='timed' ? Math.max(0,Math.floor(Number(block?.transitionSeconds)||0)) : 0
}

export function compositeTotalSeconds(blocks) {
 return (blocks||[]).reduce((total,block,index)=>total+
  compositeBlockDuration(block,block?.itemsCount||block?.items?.length||block?.stationCount||1)+
  (index<(blocks.length-1)?compositeTransitionSeconds(block):0),0)
}

export function validateCompositeBlocks(blocks,items=[]) {
 if (!Array.isArray(blocks) || blocks.length<2 || blocks.length>8) return 'Ei samansett økt må ha 2–8 delar.'
 const ids=new Set()
 for (const [index,block] of blocks.entries()) {
  const title=block?.title||'Del '+(index+1)
  if(!block?.id||ids.has(block.id))return 'Kvar del må ha ein unik ID.'
  ids.add(block.id)
  if(!COMPOSITE_BLOCK_FORMATS.includes(block.format))return title+': vel eit støtta format.'
  const minute=Number(block.minutes)
  if(!Number.isInteger(minute)||minute<1||minute>180)return title+': vel 1–180 minutt.'
  const exercises=items.filter(item=>(item.blockId||item.block_id)===block.id&&!item.is_rest)
  if(!exercises.length)return title+': legg til minst éi øving.'
  const every=compositeIntervalMinutes(block.format)
  if(every && (minute*60)%(every*60)!==0)return title+': øktlengda må gå opp i '+every+' minutt.'
  if(block.format==='Couplet'&&exercises.length!==2)return title+': Couplet krev to øvingar.'
  if(block.format==='Triplet'&&exercises.length!==3)return title+': Triplet krev tre øvingar.'
  if(block.format==='Stasjonssirkel'&&(exercises.length<2||exercises.length>8))return title+': stasjonssirkel krev 2–8 stasjonar.'
  if(COMPOSITE_INTERVAL_FORMATS.includes(block.format)&&exercises.length>8)return title+': intervall støttar høgst åtte øvingar.'
  if((COMPOSITE_INTERVAL_FORMATS.includes(block.format)||block.format==='Stasjonssirkel')&&items.some(item=>(item.blockId||item.block_id)===block.id&&item.is_rest))return title+': bruk feltet for arbeid/kvile, ikkje Pause som ekstra stasjon.'
  if(COMPOSITE_INTERVAL_FORMATS.includes(block.format)||block.format==='Stasjonssirkel'){
   const rounds=Number(block.rounds ?? (block.format==='Tabata'?8:3))
   const work=Number(block.workSeconds ?? (block.format==='Tabata'?20:45))
   const rest=Number(block.restSeconds ?? (block.format==='Tabata'?10:15))
   if(!Number.isInteger(rounds)||rounds<1||rounds>30||!Number.isInteger(work)||work<1||work>600||!Number.isInteger(rest)||rest<0||rest>600)
    return title+': kontroller tal rundar og arbeid/kvile (sekund).'
  }
  if(!['manual','timed',undefined,null].includes(block.transitionMode))return title+': ugyldig overgang.'
  if(index<blocks.length-1&&block.transitionMode==='timed'){
   const seconds=Number(block.transitionSeconds)
   if(!Number.isInteger(seconds)||seconds<1||seconds>3600)return title+': pause mellom delane må vera 1–3600 sekund.'
  }
 }
 if(items.some(item=>!ids.has(item.blockId||item.block_id)))return 'Alle øvingar må høyra til ein gyldig øktdel.'
 return ''
}

export function compositeBlockForTimer(block,index=0){
 const items=Array.isArray(block?.items)?block.items:[]
 const every=compositeIntervalMinutes(block.format)
 const duration=compositeBlockDuration(block,items.filter(x=>!x.is_rest).length||items.length)
 const slots=every?Math.floor(duration/(every*60)):0
 return {
  ...block, title:block.title||'Del '+(index+1),
  duration_seconds:duration,
  items:every?items.map(item=>({...item,minute_slot:item.minute_slot||Array.from({length:slots},(_,i)=>i+1).join(',')})):items,
 }
}

/** Build the block settings consumed by the existing Timer, not a new timer. */
export function compositeTimerConfig(block) {
 const current=compositeBlockForTimer(block)
 const every=compositeIntervalMinutes(current.format)
 const interval=COMPOSITE_INTERVAL_FORMATS.includes(current.format)
 const station=current.format==='Stasjonssirkel'
 const items=current.items||[]
 const rounds=Number(current.rounds)||(current.format==='Tabata'?8:3)
 const work=Number(current.workSeconds)||(current.format==='Tabata'?20:45)
 const rest=Number(current.restSeconds ?? (current.format==='Tabata'?10:15))
 const stationPlan=station?{
  station_count:items.length,rounds,work_seconds:work,transition_seconds:rest,
  rotation:'all_rotate_together',
  stations:items.map((item,i)=>({...item,station_number:i+1})),
 }:null
 const timedCap=current.format==='AMRAP'||every!==null||(['Couplet','Triplet'].includes(current.format)?current.combinationMode!=='Open':COMPOSITE_FOR_TIME_FORMATS.includes(current.format))
 const schema={
  format:current.format,
  duration_seconds:current.duration_seconds,
  time_cap_seconds:timedCap ? current.duration_seconds:null,
  interval:{work_every_minutes:every,work_seconds:interval?work:null,rest_seconds:interval?rest:0},
  structure:station?'station_circuit':interval?'interval':COMPOSITE_STRENGTH_FORMATS.includes(current.format)?'strength':'metcon',
  station_circuit:stationPlan,
  rounds:interval||station?rounds:null,
  interval_exercise_count:interval?items.length:null,
  combination_mode:['Couplet','Triplet'].includes(current.format)?(current.combinationMode||'For Time'):null,
  ladder:['Ladder','Death By'].includes(current.format)?{type:current.format,start:Number(current.ladderStart)||2,step:Number(current.ladderStep)||2,direction:current.ladderDirection==='down'?'down':'up'}:null,
  items,
 }
 return {
  format:current.format,
  minutes:String(Math.floor(current.duration_seconds/60)),
  seconds:String(current.duration_seconds%60),
  timerSettings:{workout_schema:schema,work_seconds:interval||station?work:every?every*60:null,rest_seconds:interval||station?rest:0,rounds:interval||station?rounds:every?Math.round(current.duration_seconds/(every*60)):null,duration_seconds:current.duration_seconds}
 }
}

/** RIR 0 is failure; -1 is only an explicit PT-specific convention. */
export function isValidRirTarget(value){
 const normalized=String(value??'').trim().replace(/[–—]/g,'-')
 const parsed=normalized.match(/^(-1|10|[0-9])(?:\s*-\s*(10|[0-9]))?$/)
 if(!parsed)return false
 return !parsed[2]||(Number(parsed[1])>=0&&Number(parsed[1])<=Number(parsed[2]))
}

/** Keep WOD part results separate and never infer a result from prescribed work. */
export function parseCompositeScoreTime(value) {
 const raw=String(value??'').trim()
 const match=raw.match(/^(\d{1,3}):([0-5]\d)$/)
 return match?Number(match[1])*60+Number(match[2]):NaN
}

export function compositeScoredBlocks(blockSummary=[],overrides={}) {
 return (Array.isArray(blockSummary)?blockSummary:[]).map(block=>{
  const changed=overrides?.[block.id]||{}
  const format=String(block.format||'')
  const next={...block}
  if(format==='AMRAP'||(['Couplet','Triplet'].includes(format)&&block.combination_mode==='AMRAP')){
   next.roundsCompleted=changed.rounds===''||changed.rounds==null ? Number(block.roundsCompleted)||0 : Number(changed.rounds)
   next.extra_reps=changed.extraReps===''||changed.extraReps==null ? Number(block.extra_reps)||0 : Number(changed.extraReps)
  }
  if(['For Time','Chipper','Couplet','Triplet','Ladder','Death By'].includes(format)){
   if(String(changed.time||'').trim())next.elapsed=parseCompositeScoreTime(changed.time)
  }
  return next
 })
}
