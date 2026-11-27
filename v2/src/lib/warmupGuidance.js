import {exerciseMuscleProfile,normalizeExerciseMuscleName} from './exerciseMuscleProfiles.js'
import {flowPurpose} from './workoutFlow.js'

// Optional warm-up guidance, never an inferred injury assessment or a scored
// prescription. Explicit coach-programmed prep takes precedence.
export function warmupGuidance(schema={},items=[]){
 const blocks=Array.isArray(schema.wod_engine?.blocks)&&schema.wod_engine.blocks.length>1?schema.wod_engine.blocks:Array.isArray(schema.composite_blocks)?schema.composite_blocks:[]
 const explicit=Array.isArray(schema.warmup_plan?.sections)?schema.warmup_plan.sections:[]
 if(explicit.length)return {kind:'planned',sections:explicit.map(s=>({title:s.title||'Førebuing',names:(s.items||[]).filter(x=>typeof x==='string'),note:s.purpose||''}))}
 if(['warmup','flow_prep','flow_build','flow_recovery','recovery','rehab'].includes(schema.library_category))return {kind:'none',sections:[]}
 const main=blocks.findIndex(b=>flowPurpose(b,schema)==='perform')
 const before=blocks.slice(0,main<0?blocks.length:main).filter(b=>['prep','build'].includes(flowPurpose(b,schema)))
 if(before.length)return {kind:'planned',sections:before.map(b=>({title:b.title||'Førebuing',names:(b.items||items.filter(x=>(x.block_id||x.blockId)===b.id)).filter(x=>!x.is_rest).map(x=>x.exercise_name||x.name).filter(Boolean),note:flowPurpose(b,schema)==='build'?'Teknikk og gradvis belastning':'Følg programmert oppvarming'}))}
 const target=main>=0?(blocks[main].items||items.filter(x=>(x.block_id||x.blockId)===blocks[main].id)):items
 const names=[...new Set(target.filter(x=>x&&!x.is_rest).flatMap(x=>x.complex_steps?.length?x.complex_steps.map(s=>s.name||s.exercise_name):[x.exercise_name||x.name]).filter(Boolean))]
 const known=names.map(name=>({name,p:exerciseMuscleProfile(name)})).filter(x=>x.p)
 const muscles=new Set(known.flatMap(x=>[...x.p.primary,...x.p.secondary,...x.p.stabilizers]))
 const has=(...keys)=>keys.some(k=>muscles.has(k))
 const mobility=[]
 if(has('quads','glutes','hamstrings','hipFlexors','adductors','calves'))mobility.push('Kontrollerte ankel- og hofterørsler')
 if(has('chest','frontDelts','sideDelts','rearDelts','lats','upperBack','rotatorCuff'))mobility.push('Rolege skulder- og brystryggsrørsler')
 if(has('abs','obliques','lowerBack'))mobility.push('Kontrollert rotasjon og stabilitet i overkroppen')
 const rehearsal=known.filter(x=>['strength','power','mixed','technique','stability'].includes(x.p.mode)).slice(0,3).map(x=>x.name)
 return {kind:'suggested',sections:[
 {title:'1 · Bli varm',names:['2–3 min roleg gange, marsj eller anna lett aktivitet'],note:'Auk tempoet gradvis.'},
 {title:'2 · Dynamisk mobilitet',names:mobility.length?mobility:['Rolege rørsler i ledda du skal bruka'],note:'1–2 min i komfortabelt rørsleutslag.'},
 {title:'3 · Teknikk / arbeidsvekt',names:rehearsal.length?rehearsal:['Prøv dei første rørslemønstera roleg'],note:'Start lett. Auk gradvis etter behov; ingen fast prosent eller automatisk belastning.'}
 ],unknown:names.filter(name=>!known.some(x=>normalizeExerciseMuscleName(x.name)===normalizeExerciseMuscleName(name))).length}
}
export function needsWarmupChoice({source,manualEntry,classSessionId,started,accepted}={}){
 return !!source&&!manualEntry&&!classSessionId&&!started&&!accepted&&warmupGuidance(source.timer_settings?.workout_schema||{},source.timer_settings?.workout_schema?.items||[]).kind==='suggested'
}
