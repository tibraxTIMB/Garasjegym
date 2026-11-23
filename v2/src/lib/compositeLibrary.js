import {getWodSchemaItems,sortWodItems} from './wodOrdering.js'
import {isEmomFormat,emomIntervalSeconds} from './wodEngine.js'
import {COMPOSITE_FORMAT} from './compositeWod.js'

/** Snapshot a library WOD into one composite part; future source edits do not mutate it. */
export function prepareLibraryWodPart(wod,oldBlock){
 if(!wod?.id||!oldBlock?.id)throw new Error('Vel ein gyldig WOD og øktdel.')
 if(wod.format===COMPOSITE_FORMAT)throw new Error('Vel ein enkelt-WOD. Ei samansett økt kan ikkje leggjast inni ei anna.')
 const schema=wod.timer_settings?.workout_schema||{}
 const items=sortWodItems(getWodSchemaItems(schema))
 if(!items.length)throw new Error('WOD-en manglar øvingar i det lagra oppsettet.')
 const format=isEmomFormat(wod.format)?'EMOM':wod.format
 const interval=emomIntervalSeconds(wod.format,schema.interval)
 const seconds=Math.max(60,Number(schema.duration_seconds)||Number(schema.time_cap_seconds)||Number(wod.duration_minutes)*60||1200)
 const block={
  ...oldBlock,format,
  title:oldBlock.title||wod.name,
  minutes:seconds/60,
  source_wod_id:wod.id,source_wod_name:wod.name,
  source_wod_snapshot:{
   id:wod.id,name:wod.name,format:wod.format,library_category:schema.library_category||wod.category||'standard',
   version:schema.version??null,duration_seconds:seconds,
   items:items.map(item=>({...item})),
   interval:schema.interval?{...schema.interval}:null,
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
