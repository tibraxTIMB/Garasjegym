import {COMPOSITE_FORMAT,COMPOSITE_BLOCK_FORMATS,compositeBlockForTimer,compositeBlockDuration,compositeTotalSeconds,compositeSamspelConfig} from './compositeWod.js'
import {prepareLibraryWodPart} from './compositeLibrary.js'
import {getWodSchemaItems,sortWodItems,addWodSortOrder} from './wodOrdering.js'
import {isEmomFormat,normalizeWodEngine,createWodEngineConfig} from './wodEngine.js'
import {samspelConfig,samspelPairedEmom,samspelChipper} from './samspel.js'
const clone=x=>JSON.parse(JSON.stringify(x))
const schemaOf=w=>w?.timer_settings?.workout_schema||{}
export const sessionWarmup=w=>w?.category==='warmup'||['warmup','flow_prep'].includes(schemaOf(w).library_category)
export function sessionWodSeconds(w){
 const s=schemaOf(w)
 return Number(s.duration_seconds)||Number(s.time_cap_seconds)||Number(w?.duration_minutes)*60||0
}
export function moveSessionWod(ids,index,delta){
 const next=index+delta
 if(index<0||index>=ids.length||next<0||next>=ids.length)return ids
 const result=[...ids];[result[index],result[next]]=[result[next],result[index]];return result
}
/** A session is an ephemeral execution snapshot. Never insert a WOD or mutate its source. */
export function buildTrainingSession(selected){
 if(!Array.isArray(selected)||!selected.length)throw Error('Vel minst éin WOD.')
 if(selected.some(w=>!w?.id||w.is_archived))throw Error('Ein vald WOD er ikkje tilgjengeleg.')
 if(selected.length===1)return selected[0]
 const blocks=[],items=[]
 selected.forEach((w,wi)=>{
  const s=schemaOf(w),warm=sessionWarmup(w),original=sortWodItems(getWodSchemaItems(s))
  if(!original.length)throw Error(w.name+': manglar lagra øvingar. Køyr denne WOD-en separat.')
  const composite=w.format===COMPOSITE_FORMAT
  const sourceBlocks=composite?(s.wod_engine?.blocks?.length?s.wod_engine.blocks:s.composite_blocks):null
  if(composite&&(!Array.isArray(sourceBlocks)||!sourceBlocks.length))throw Error(w.name+': manglar øktdelar.')
  const engine=normalizeWodEngine(s,{format:w.format})
  const fmt=isEmomFormat(w.format)?'EMOM':w.format
  if(!composite&&!COMPOSITE_BLOCK_FORMATS.includes(fmt))throw Error(w.name+': køyr denne WOD-en separat.')
  if(!composite&&(samspelPairedEmom(s.samspel)||s.samspel&&!samspelConfig(s)))throw Error(w.name+': dette oppsettet må førebels køyrast separat.')
  const entries=composite?sourceBlocks.map(b=>({block:clone(b),rows:original.filter(x=>(x.block_id||x.blockId)===b.id)})):[{block:prepareLibraryWodPart(w,{id:'temporary',title:w.name}).block,rows:original}]
  if(entries.some(e=>!e.rows.some(x=>!x.is_rest))||entries.reduce((n,e)=>n+e.rows.length,0)!==original.length)throw Error(w.name+': kontroller øvingskoplingane.')
  entries.forEach(({block,rows},bi)=>{
   const id='session-'+wi+'-'+bi
   const partItems=rows.map(x=>({...clone(x),block_id:id,blockId:id}))
   const grouped=warm?'warm-'+wi:block.warmup_group?'warm-'+wi+'-'+block.warmup_group:null
   const b={...block,id,items:partItems,title:composite?w.name+' · '+(block.title||block.format):w.name,session_wod_id:w.id,session_wod_name:w.name,session_wod_index:wi,session_preserve_items:true,
    transitionMode:bi===entries.length-1?'manual':block.transitionMode||'manual',transitionSeconds:bi===entries.length-1?0:block.transitionSeconds||0,
    ...(grouped?{warmup_group:grouped,flowPurpose:'prep',flowReporting:'done',scoreMode:'none'}:{})}
   if(!composite){
    const seconds=sessionWodSeconds(w)
    b.participation=engine.participation;b.participant_count=engine.participant_count;b.collaboration=engine.collaboration;b.scoring=engine.scoring
    if(!warm&&s.flowPurpose)b.flowPurpose=s.flowPurpose
    // Keep the real standalone timer contract, including no cap, slot order and interval timing.
    b.session_timer_settings={...clone(w.timer_settings||{}),workout_schema:{...clone(s),items:partItems}}
    b.session_duration_seconds=seconds
    if(samspelChipper(b.samspel)&&!seconds)throw Error(w.name+': legg inn ei tidsgrense før du kombinerer denne WOD-en.')
   }
   if(b.samspel&&!compositeSamspelConfig(b))throw Error(w.name+': dette samarbeidsoppsettet må førebels køyrast separat.')
   // One original composite can contain its own benchmark sources. Do not use
   // the entire composite WOD as the benchmark for an individual child block.
   if(grouped){delete b.source_wod_snapshot;delete b.source_wod_id;delete b.source_wod_name}
   blocks.push(compositeBlockForTimer(b,blocks.length));items.push(...partItems)
  })
 })
 if(blocks.length>8)throw Error('Vel færre WOD-ar: økta kan førebels ha høgst åtte timerdelar.')
 const ordered=addWodSortOrder(items),duration=compositeTotalSeconds(blocks)
 const hasPartner=blocks.some(b=>b.participation&&b.participation!=='individual'||b.samspel)
 const title=selected.filter(w=>!sessionWarmup(w)).map(w=>w.name).join(' + ')||selected.map(w=>w.name).join(' + ')
 return {name:title,format:COMPOSITE_FORMAT,category:'main',duration_minutes:Math.ceil(duration/60)||null,session_wod_ids:selected.map(w=>w.id),session_wod_names:selected.map(w=>w.name),timer_settings:{workout_schema:{format:COMPOSITE_FORMAT,library_category:'standard',prescription:'rx',duration_seconds:duration,items:ordered,composite_blocks:blocks,session_composed:true,session_contains_partner:hasPartner,wod_engine:{...createWodEngineConfig(),blocks}}}}
}
