import {complexResultSummary} from './wodComplexes.js'
// Multi-part workouts reuse the existing WOD engine and Timer for each part.
// No separate timer is introduced. Blocks, pauses and outcomes live in the WOD schema.
import { emomIntervalSeconds, isEmomFormat } from './wodEngine.js'
export const COMPOSITE_FORMAT = 'Samansett økt'
export const COMPOSITE_BLOCK_FORMATS = [
 'AMRAP','For Time','Chipper','Couplet','Triplet','Ladder','Death By',
 'EMOM','E1MOM','E1.25MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM',
 'Intervall','Tabata','Row Intervals','Stasjonssirkel',
 'Strength','Superset','Complex','Eigen økt',
]
export const COMPOSITE_INTERVAL_FORMATS = ['Intervall','Tabata','Row Intervals']
export const COMPOSITE_STRENGTH_FORMATS = ['Strength','Superset','Complex']
export const COMPOSITE_FOR_TIME_FORMATS = ['For Time','Chipper','Couplet','Triplet','Ladder']

export const defaultCompositeBlocks = () => [
 {id:'a',title:'Del A',format:'EMOM',emomIntervalSeconds:180,minutes:9,transitionMode:'manual',transitionSeconds:0},
 {id:'b',title:'Del B',format:'AMRAP',minutes:8,transitionMode:'manual',transitionSeconds:0},
]

export function compositeIntervalMinutes(format,block=null) {
 return isEmomFormat(format)?emomIntervalSeconds(format,{work_every_seconds:block?.emomIntervalSeconds??block?.interval?.work_every_seconds,work_every_minutes:block?.interval?.work_every_minutes})/60:null
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
  if(block.scoreMode&&!BLOCK_SCORE_OPTIONS.some(option=>option.value===block.scoreMode))return title+': ugyldig resultatformat.'
  const minute=Number(block.minutes)
  if(!Number.isFinite(minute)||minute<=0||minute>180||Math.abs(Math.round(minute*60)-minute*60)>0.001)return title+': vel inntil 180 minutt (med sekundpresisjon).'
  const exercises=items.filter(item=>(item.blockId||item.block_id)===block.id&&!item.is_rest)
  if(!exercises.length)return title+': legg til minst éi øving.'
  const every=compositeIntervalMinutes(block.format,block)
  if(every && Math.round(minute*60)%Math.round(every*60)!==0)return title+': øktlengda må gå opp i intervalla på '+Math.round(every*60)+' sekund.'
  if(block.format==='Couplet'&&exercises.length!==2)return title+': Couplet krev to øvingar.'
  if(block.format==='Triplet'&&exercises.length!==3)return title+': Triplet krev tre øvingar.'
  if(block.format==='Stasjonssirkel'&&(exercises.length<2||exercises.length>8))return title+': stasjonssirkel krev 2–8 stasjonar.'
  if(block.format==='Death By'){
   const period=Number(block.deathByIntervalSeconds??60),start=Number(block.ladderStart??1),step=Number(block.ladderStep??1)
   if(!Number.isInteger(period)||period<5||period>3600||!Number.isInteger(start)||start<1||!Number.isInteger(step)||step<1)return title+': Death By krev intervall på 5–3600 sekund, startreps og auking over null.'
  }
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
 const every=compositeIntervalMinutes(block.format,block)
 const duration=compositeBlockDuration(block,items.filter(x=>!x.is_rest).length||items.length)
 const slots=every?Math.floor(duration/Math.round(every*60)):0
 return {
  ...block, title:block.title||'Del '+(index+1),
  duration_seconds:duration,
  items:every?items.map(item=>({...item,minute_slot:item.minute_slot||Array.from({length:slots},(_,i)=>i+1).join(',')})):items,
 }
}

/** Build the block settings consumed by the existing Timer, not a new timer. */
export function compositeTimerConfig(block) {
 const current=compositeBlockForTimer(block)
 const every=compositeIntervalMinutes(current.format,current)
 const interval=COMPOSITE_INTERVAL_FORMATS.includes(current.format)
 const station=current.format==='Stasjonssirkel'
 const deathBy=current.format==='Death By'
 const items=current.items||[]
 const rounds=Number(current.rounds)||(current.format==='Tabata'?8:3)
 const work=Number(current.workSeconds)||(current.format==='Tabata'?20:45)
 const rest=Number(current.restSeconds ?? (current.format==='Tabata'?10:15))
 const stationPlan=station?{
  station_count:items.length,rounds,work_seconds:work,transition_seconds:rest,
  rotation:'all_rotate_together',
  stations:items.map((item,i)=>({...item,station_number:i+1})),
 }:null
 const timedCap=current.format==='AMRAP'||deathBy||every!==null||(['Couplet','Triplet'].includes(current.format)?current.combinationMode!=='Open':COMPOSITE_FOR_TIME_FORMATS.includes(current.format))
 const schema={
  format:current.format,
  duration_seconds:current.duration_seconds,
  time_cap_seconds:timedCap ? current.duration_seconds:null,
  interval:{work_every_minutes:every,work_every_seconds:every?Math.round(every*60):null,work_seconds:every?Math.round(every*60):interval?work:null,rest_seconds:interval?rest:0},
  structure:station?'station_circuit':interval?'interval':COMPOSITE_STRENGTH_FORMATS.includes(current.format)?'strength':'metcon',
  station_circuit:stationPlan,
  rounds:interval||station?rounds:current.format==='Ladder'?Math.max(1,Number(current.rounds)||5):null,
  interval_exercise_count:interval?items.length:null,
  combination_mode:['Couplet','Triplet'].includes(current.format)?(current.combinationMode||'For Time'):null,
  ladder:['Ladder','Death By'].includes(current.format)?{type:current.format,start:Number(current.ladderStart)||(deathBy?1:2),step:Number(current.ladderStep)||(deathBy?1:2),direction:deathBy?'up':current.ladderDirection==='down'?'down':'up',...(deathBy?{interval_seconds:Number(current.deathByIntervalSeconds)||60}:{})}:null,
  items,
 }
 return {
  format:current.format,
  minutes:String(Math.floor(current.duration_seconds/60)),
  seconds:String(current.duration_seconds%60),
  timerSettings:{workout_schema:schema,work_seconds:interval||station?work:every?every*60:null,rest_seconds:interval||station?rest:0,rounds:interval||station?rounds:current.format==='Ladder'?Math.max(1,Number(current.rounds)||5):every?Math.round(current.duration_seconds/(every*60)):null,duration_seconds:current.duration_seconds}
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
  if(format==='Death By'||format==='Ladder'){
   const current=Number(format==='Death By'?block.death_by_completed_rounds??block.roundsCompleted:block.ladder_completed_rounds??block.roundsCompleted)
   const value=changed.rounds==null||changed.rounds===''?current:Number(changed.rounds)
   if(Number.isInteger(value)&&value>=0){next.roundsCompleted=value;if(format==='Death By')next.death_by_completed_rounds=value;else next.ladder_completed_rounds=value}
  }
  if(['For Time','Chipper','Couplet','Triplet','Ladder'].includes(format)){
   if(String(changed.time||'').trim())next.elapsed=parseCompositeScoreTime(changed.time)
  }
  return next
 })
}


/** Result entry for fixed E3MOM-style parts: scheduled reps are editable, not AMRAP scores. */
export function plannedFixedEmomSets(item, blocks=[], level='rx', manualEntry=false) {
 const block=(blocks||[]).find(part=>part.id===item?.block_id)
 const intervalSeconds=block&&isEmomFormat(block.format)?emomIntervalSeconds(block.format,{work_every_seconds:block.emomIntervalSeconds??block.interval?.work_every_seconds,work_every_minutes:block.interval?.work_every_minutes}):0
 const durationSeconds=Number(block?.duration_seconds)||Number(block?.minutes||0)*60
 const scheduledSets=intervalSeconds?Math.floor(durationSeconds/intervalSeconds):0
 const levelReps=item?.levels?.[level]?.reps
 const reps=Number(levelReps!==''&&levelReps!=null?levelReps:item?.reps)
 const configuredSets=Array.isArray(item?.sets)&&item.sets.length?item.sets:[]
 const autoFill=!manualEntry&&scheduledSets>0&&Number.isInteger(reps)&&reps>0&&item?.reps_mode!=='amrap'&&!item?.is_rest
 const sets=autoFill?Array.from({length:Math.max(scheduledSets,configuredSets.length)},(_,i)=>configuredSets[i]||configuredSets[0]||{}):configuredSets
 return {autoFill,reps,sets}
}

export const BLOCK_SCORE_OPTIONS=Object.freeze([
 {value:'auto',label:'Standard for formatet'},
 {value:'none',label:'Ingen score'},
 {value:'completion',label:'Gjennomføring'},
 {value:'load',label:'Tyngste godkjende kompleks (kg)'},
 {value:'reps',label:'Totale repetisjonar',unit:'reps'},
 {value:'calories',label:'Totale kaloriar',unit:'cal'},
 {value:'distance',label:'Total distanse',unit:'m'},
 {value:'time',label:'Registrert tid',unit:'sek'},
 {value:'slowest',label:'Seinaste rundetid',unit:'sek'},
 {value:'fastest',label:'Raskaste rundetid',unit:'sek'}
])
export function blockScoreDefinition(mode){
 return BLOCK_SCORE_OPTIONS.find(option=>option.value===mode)||BLOCK_SCORE_OPTIONS[0]
}
// A programmed score is independent of elapsed time and prescribed movements.
// Blank manual results remain null; a timed interval is not proof of completed work.
export function explicitBlockResults(blocks=[],overrides={},items=[]){
 return blocks.filter(block=>blockScoreDefinition(block.scoreMode).value!=='auto').map(block=>{
  const definition=blockScoreDefinition(block.scoreMode),raw=overrides?.[block.id]?.primary
  let value=null,unit=definition.unit||null
  if(definition.value==='completion'){
   if(raw!=null&&raw!==''&&!['complete','partial','failed'].includes(raw))throw Error('Ugyldig gjennomføring i '+block.title)
   value=raw||null
  }else if(definition.value==='load'){
   const loads=items.filter(item=>item.block_id===block.id&&item.is_complex&&item.complex_family==='custom').map(item=>complexResultSummary(item).best_load_kg).filter(v=>v!=null)
   value=loads.length?Math.max(...loads):null;unit='kg'
  }else if(definition.value!=='none'&&raw!=null&&String(raw).trim()!==''){
   value=Number(raw)
   if(!Number.isFinite(value)||value<0||(['reps','calories','time','slowest','fastest'].includes(definition.value)&&!Number.isInteger(value))||(['time','slowest','fastest'].includes(definition.value)&&value===0))throw Error('Ugyldig resultat i '+block.title)
  }
  return {block_id:block.id,title:block.title||'Øktdel',type:definition.value,label:definition.label,value,unit}
 })
}
