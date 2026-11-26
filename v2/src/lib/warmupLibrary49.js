import {warmupDraft,WARMUP_PRESETS} from './warmupPresets49.js'
import {validateCompositeBlocks,compositeBlockDuration,compositeTotalSeconds,compositeBlockForTimer} from './compositeWod.js'
import {createWodEngineConfig,buildLegacyCompatibleBlock,scoreForWodFormat} from './wodEngine.js'
import {authorizeLibrary,stableJson,same} from './stacheldraht.js'
// Shared schema and engine contract, same as the normal WodBuilder.
// Never insert or update an existing WOD by name.
export function warmupLibraryPayload(name,catalog){
 const draft=warmupDraft(name,catalog)
 const problem=validateCompositeBlocks(draft.blocks,draft.items);if(problem)throw Error(problem)
 const items=draft.items.map((r,i)=>{
  const x=r.exercise,reps=r.reps===''?null:Number(r.reps),seconds=r.quantity?.unit==='s'?Number(r.quantity.value):null,row=x.equipment==='Romaskin'
  const dose={sets:'',reps:reps==null?'':String(reps),loadMode:'none',loadKg:'',loadKgMen:'',loadKgWomen:'',percent1rm:'',tempo:'',instruction:r.coachNote||'',variant:'',rir:'',rirRange:'',heightCm:'',durationSeconds:seconds==null?'':String(seconds),distanceMeters:'',calories:''}
  return {sort_order:i+1,block_id:r.block_id,warmup_phase:r.warmup_phase,exercise_id:x.id,exercise_name:x.name,category:x.category,body_area:x.body_area,equipment:x.equipment,side_mode:r.sideMode||'none',is_rest:false,is_complex:false,complex_steps:[],sets:null,reps,reps_mode:'fixed',load_mode:'none',load_kg:null,percent_1rm:null,rir:null,rpe:null,row_value:row?seconds:null,row_unit:row?'s':null,meters:null,calories:null,work_seconds:row?seconds:null,rest_seconds:null,tempo:null,coach_note:r.coachNote||null,minute_slot:r.minuteSlot||null,levels:Object.fromEntries(['rx','scaled','foundation'].map(k=>[k,{...dose}]))}
 })
 const blocks=draft.blocks.map(b=>({...b,itemsCount:items.filter(x=>x.block_id===b.id).length}))
 const composite_blocks=blocks.map(b=>({...b,duration_seconds:compositeBlockDuration(b,b.itemsCount)}))
 const duration_seconds=compositeTotalSeconds(blocks),engine=createWodEngineConfig({participation:'individual',collaboration:'solo',scoreType:'reps',scoreFields:['reps']})
 const schema={version:6,format:draft.format,composite_blocks,library_category:'warmup',intensity:1,structure:'custom',duration_minutes:Math.ceil(duration_seconds/60),duration_seconds,time_cap_minutes:null,time_cap_seconds:null,rounds:null,interval:null,stimulus:draft.stimulus,coach_notes:draft.notes,prescription:'rx',custom_instructions:'',rx_notes:'',scaled_notes:'',items,warmup_plan:{version:1,sections:[{id:'specific_prep',title:'Felles oppvarming',purpose:'Gradvis temperatur, mobilitet og aktivering',items:items.filter(x=>x.warmup_phase==='specific_prep').map(x=>x.exercise_name)},{id:'movement_rehearsal',title:'Fri teknisk innøving',purpose:'Individuell rørsleførebuing og lett arbeidsvekt',items:items.filter(x=>x.warmup_phase==='movement_rehearsal').map(x=>x.exercise_name)}],main_stimulus:draft.stimulus,coach_guidance:'Start lett. Del utstyr ved samspel; ingen konkurranse.'},wod_engine:{...engine,blocks:blocks.map((block,index)=>{const timerBlock=compositeBlockForTimer({...block,items:items.filter(i=>i.block_id===block.id)},index);const scoring=scoreForWodFormat(block.format,block.combinationMode||'For Time');return {...buildLegacyCompatibleBlock({format:block.format,items:timerBlock.items,durationSeconds:timerBlock.duration_seconds,engine:{...engine,scoring}}),...timerBlock,scoring}})}}
 const movements=items.map(x=>x.sort_order+'. '+x.exercise_name+' · '+(x.reps!=null?x.reps+' reps'+(x.side_mode==='both'?' per side':''):x.levels.rx.durationSeconds+' sek')+(x.coach_note?' · '+x.coach_note:'')).join('\n')
 return {name:draft.name,category:'warmup',format:draft.format,duration_minutes:Math.ceil(duration_seconds/60),movements,notes:draft.stimulus+'\n\n'+draft.notes,is_published:true,is_archived:false,timer_settings:{workout_schema:schema,work_seconds:null,rest_seconds:null,rounds:null,duration_seconds}}
}
const nameKey=s=>String(s??'').trim().normalize('NFC').toLowerCase()
export function warmupBatch(catalog,existing=[]){
 const names=new Set(existing.map(w=>nameKey(w.name)))
 return WARMUP_PRESETS.filter(p=>!names.has(nameKey(p.name))).map(p=>warmupLibraryPayload(p.name,catalog))
}
export async function publishWarmupBatch(client,profile,review,approval){
 if(!Array.isArray(review)||!review.length||approval!==stableJson(review))throw Error('Kontroller og godkjenn dei konkrete WOD-ane.')
 const actor=await authorizeLibrary(client,profile)
 const {data:catalog,error:e}=await client.from('exercises').select('id,name,category,equipment,body_area,is_active').eq('is_active',true).order('id').limit(1000)
 if(e||!catalog)throw e||Error('Øvingsbiblioteket er ikkje tilgjengeleg.')
 if(catalog.length>=1000)throw Error('For stort øvingsbibliotek. Kontroller manuelt.')
 const {data:existing,error:w}=await client.from('wods').select('name').order('id').limit(1000)
 if(w||!existing||existing.length>=1000)throw w||Error('Kunne ikkje kontrollera heile WOD-biblioteket.')
 const current=warmupBatch(catalog,existing)
 if(!same(current,review))throw Error('Biblioteket er endra sidan kontrollen. Hent ny arbeidskopi.')
 const {data:saved,error:failure}=await client.from('wods').insert(current.map(p=>({...p,created_by:actor}))).select('id,name,category,format,duration_minutes,movements,notes,is_published,is_archived,timer_settings')
 if(failure||saved?.length!==current.length)throw failure||Error('Lagringa er ikkje stadfesta. Hent biblioteket før nytt forsøk.')
 if(current.some(p=>!saved.some(s=>s.name===p.name&&s.id&&Object.entries(p).every(([k,v])=>same(s[k],v)))))throw Error('Etterkontrollen av WOD-ar avvik. Hent biblioteket.')
 return saved
}
