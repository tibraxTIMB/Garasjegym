import {samspelConfig,samspelNoncompetitive,samspelClockedEmom,samspelStrength,samspelRelay,samspelChipper} from './samspel.js'
import {getWodSchemaItems,sortWodItems} from './wodOrdering.js'
import {isEmomFormat,emomIntervalSeconds} from './wodEngine.js'
import {COMPOSITE_FORMAT} from './compositeWod.js'
import {flowPurpose} from './workoutFlow.js'

/** Snapshot a library WOD into one composite part; future source edits do not mutate it. */
export function prepareLibraryWodPart(wod,oldBlock){
 if(!wod?.id||!oldBlock?.id)throw new Error('Vel ein gyldig WOD og øktdel.')
 if(wod.format===COMPOSITE_FORMAT)throw new Error('Vel ein enkelt-WOD. Ei samansett økt kan ikkje leggjast inni ei anna.')
 const schema=wod.timer_settings?.workout_schema||{}
 const samspel=samspelConfig(schema)
 if(schema.samspel&&(!samspel||!(samspelNoncompetitive(samspel)||samspelClockedEmom(samspel)||samspelStrength(samspel)||samspelRelay(samspel)||samspelChipper(samspel))))throw Error('Samspel-oppsettet kan ikkje brukast som øktdel.')
 const items=sortWodItems(getWodSchemaItems(schema))
 if(!items.length)throw new Error('WOD-en manglar øvingar i det lagra oppsettet.')
 const format=isEmomFormat(wod.format)?'EMOM':wod.format
 const interval=samspelClockedEmom(samspel)?samspel.switch_seconds:emomIntervalSeconds(wod.format,schema.interval)
 const seconds=samspelClockedEmom(samspel)?samspel.duration_seconds:Math.max(60,Number(schema.duration_seconds)||Number(schema.time_cap_seconds)||Number(wod.duration_minutes)*60||1200)
 const block={
  ...oldBlock,format,samspel:samspel?JSON.parse(JSON.stringify(samspel)):null,...(samspel?{scoreMode:'none'}:{}),
  flowPurpose:schema.flowPurpose||flowPurpose({title:wod.name},schema),flowReporting:schema.flowReporting||'auto',
  title:oldBlock.title||wod.name,
  minutes:seconds/60,
  source_wod_id:wod.id,source_wod_name:wod.name,
  source_wod_snapshot:{
   id:wod.id,name:wod.name,format:wod.format,library_category:schema.library_category||wod.category||'standard',
   version:schema.version??null,duration_seconds:seconds,
   items:items.map(item=>JSON.parse(JSON.stringify(item))),
   interval:schema.interval?{...schema.interval}:null,
   samspel:samspel?JSON.parse(JSON.stringify(samspel)):null,
   rounds:schema.rounds??null,ladder:schema.ladder?{...schema.ladder}:null
  },
  ...(isEmomFormat(format)?{emomIntervalSeconds:interval}:{}),
  ...(['Intervall','Tabata','Row Intervals','Stasjonssirkel'].includes(format)?{
   workSeconds:Number(schema.station_circuit?.work_seconds??schema.interval?.work_seconds??wod.timer_settings?.work_seconds)||(format==='Tabata'?20:45),
   restSeconds:Number.isFinite(Number(schema.station_circuit?.transition_seconds??schema.interval?.rest_seconds??wod.timer_settings?.rest_seconds))?Number(schema.station_circuit?.transition_seconds??schema.interval?.rest_seconds??wod.timer_settings?.rest_seconds):(format==='Tabata'?10:15),
   rounds:Number(schema.station_circuit?.rounds??schema.rounds??wod.timer_settings?.rounds)||(format==='Tabata'?8:3)
  }:{}),
  ...(['Couplet','Triplet'].includes(format)?{combinationMode:schema.combination_mode||'For Time'}:{}),
  ...(['Ladder','Death By'].includes(format)?{
   ladderStart:Number(schema.ladder?.start)||(format==='Death By'?1:2),
   ladderStep:Number(schema.ladder?.step)||(format==='Death By'?1:2),
   ladderDirection:schema.ladder?.direction||'up',
   ...(format==='Death By'?{deathByIntervalSeconds:Number(schema.ladder?.interval_seconds)||60}:{}),
   ...(format==='Ladder'?{rounds:Number(schema.rounds)||5}:{})
  }:{})
 }
 return {block,items}
}

/** A linked block only inherits a library WOD's benchmark identity while unchanged. */
export function equivalentLibraryWodSource(part){
 if(part?.samspel||part?.source_wod_snapshot?.samspel)return null // no personal benchmark identity for team work
 const source=part?.source_wod_snapshot
 if(!source||!part?.source_wod_id||source.id!==part.source_wod_id)return null
 const normalizedFormat=isEmomFormat(source.format)?'EMOM':source.format
 if(part.format!==normalizedFormat)return null
 const sourceSeconds=Number(source.duration_seconds)
 const partSeconds=Number(part.duration_seconds)||Math.round(Number(part.minutes)*60)
 if(!Number.isFinite(sourceSeconds)||Math.abs(partSeconds-sourceSeconds)>1)return null
 const stored=source.items||[],current=part.items||[]
 if(!stored.length||current.length!==stored.length)return null
 for(let i=0;i<stored.length;i++){
  const a=stored[i],b=current[i]
  if(String(a.exercise_name||'').trim().toLowerCase()!==String(b.exercise_name||'').trim().toLowerCase())return null
  if(Boolean(a.is_rest)!==Boolean(b.is_rest))return null
  if(String(a.reps??'')!==String(b.reps??''))return null
  if(JSON.stringify(a.levels||{})!==JSON.stringify(b.levels||{}))return null
 }
 if(isEmomFormat(part.format)){
  const original=emomIntervalSeconds(source.format,source.interval)
  if(original!==Number(part.emomIntervalSeconds||original))return null
 }
 if(part.format==='Ladder'||part.format==='Death By'){
  if(Number(source.ladder?.start||0)!==Number(part.ladderStart||0))return null
  if(Number(source.ladder?.step||0)!==Number(part.ladderStep||0))return null
  if(part.format==='Ladder'&&Number(source.rounds||0)!==Number(part.rounds||0))return null
  if(part.format==='Death By'&&Number(source.ladder?.interval_seconds||60)!==Number(part.deathByIntervalSeconds||60))return null
 }
 if(['Intervall','Tabata','Row Intervals','Stasjonssirkel'].includes(part.format)){
  const originalRounds=Number(source.rounds||0)
  if(originalRounds>0&&originalRounds!==Number(part.rounds||0))return null
  const originalWork=Number(source.interval?.work_seconds)
  if(originalWork>0&&originalWork!==Number(part.workSeconds||0))return null
  const originalRest=Number(source.interval?.rest_seconds)
  if(Number.isFinite(originalRest)&&originalRest!==Number(part.restSeconds||0))return null
 }
 return source.id
}
