import test from 'node:test'
import assert from 'node:assert/strict'
import {COMPOSITE_BLOCK_FORMATS,compositeBlockForTimer,compositeTimerConfig,validateCompositeBlocks,compositeTotalSeconds} from '../src/lib/compositeWod.js'
import {buildLegacyCompatibleBlock,createWodEngineConfig,normalizeWodEngine,scoreForWodFormat,emomIntervalSeconds,isEmomFormat,PARTICIPATION_MODES,COLLABORATION_MODES} from '../src/lib/wodEngine.js'
import {compactDoseRows} from '../src/lib/compactDoseRows.js'
import {cardDose,cardParts} from '../src/lib/wodCard.js'
import {fillResultPlan} from '../src/lib/compactWorkout.js'
import {samspelTemplateOptions,samspelTemplateChoice,samspelIssue,samspelScoring,samspelDedicatedResults} from '../src/lib/samspel.js'
import {synchronWodTargets} from '../src/lib/synchronPreparation.js'
const levels=['rx','scaled','foundation']
const modes=['individual','partner','team']
const item=(id,block_id=null)=>({exercise_id:'e-'+id,exercise_name:'Test '+id,block_id,reps:10,levels:Object.fromEntries(levels.map((l,i)=>[l,{reps:String(10-i*2),loadMode:'kg',loadKgMen:String(20-i*5),loadKgWomen:String(15-i*5)}]))})
const formatCount=f=>f==='Triplet'?3:['Couplet','Stasjonssirkel'].includes(f)?2:1
const block=(f,id)=>({id,title:id,format:f,minutes:isEmomFormat(f)?emomIntervalSeconds(f)/60*4:8,workSeconds:20,restSeconds:10,rounds:3,transitionMode:'manual',items:Array.from({length:formatCount(f)},(_,i)=>item(id+i,id))})
test('every supported part format × every supported part format × manual/timed transition',()=>{
 let count=0
 for(const left of COMPOSITE_BLOCK_FORMATS)for(const right of COMPOSITE_BLOCK_FORMATS)for(const transitionMode of ['manual','timed']){
  const a={...block(left,'a'),transitionMode,transitionSeconds:30},b=block(right,'b'),all=[...a.items,...b.items]
  assert.equal(validateCompositeBlocks([a,b],all),'',left+' + '+right)
  const blocks=[a,b].map(compositeBlockForTimer)
  const wod={format:'Samansett økt',timer_settings:{workout_schema:{items:all,wod_engine:{version:2,blocks}}}}
  assert.deepEqual(cardParts(wod).map(p=>p.format),[left,right])
  for(const part of blocks){
   const config=compositeTimerConfig(part),s=config.timerSettings.workout_schema
   assert.equal(s.format,part.format)
   assert.equal(s.items.length,part.items.length)
   assert.ok(Number.isFinite(s.duration_seconds)&&s.duration_seconds>=0)
   if(isEmomFormat(part.format))assert.equal(s.interval.work_every_seconds,emomIntervalSeconds(part.format))
  }
  assert.equal(compositeTotalSeconds([a,b]),blocks[0].duration_seconds+blocks[1].duration_seconds+(transitionMode==='timed'?30:0))
  assert.ok(synchronWodTargets(wod).issue)
  count++
 }
 console.log('PART PAIRS:',count)
})
test('format × participant mode × collaboration × level × voluntary weight variant preserves engine, library and result contract',()=>{
 let count=0
 for(const format of COMPOSITE_BLOCK_FORMATS)for(const participation of modes)for(const {value:collaboration} of COLLABORATION_MODES)for(const level of levels)for(const variant of ['men','women','common']){
  const score=scoreForWodFormat(format),engine=createWodEngineConfig({participation,collaboration,partnerCount:4,scoreType:score.type,scoreFields:score.fields})
  const ex=item('a'),d=ex.levels[level],r=compactDoseRows([{ex:{key:'a',name:ex.exercise_name},dose:d,fields:{load:true}}],level)[0]
  assert.deepEqual(r.cells.map(x=>x.id),['reps','men','women'])
  const patch=r.cells.find(x=>x.id==='women').patch('12.5')
  const updated={...ex,levels:{...ex.levels,[level]:{...d,...patch}}}
  const items=[updated],saved=JSON.parse(JSON.stringify({format,items,wod_engine:{...engine,blocks:[buildLegacyCompatibleBlock({format,items,engine})]}}))
  const normalized=normalizeWodEngine(saved)
  assert.equal(normalized.participation,participation);assert.equal(normalized.collaboration,participation==='individual'?'solo':collaboration==='solo'?'free_split':collaboration)
  assert.equal(normalized.blocks[0].items[0].levels[level].loadKgWomen,'12.5')
  const card=cardDose(updated,level,true,variant);assert.match(card,new RegExp(String(d.reps)+' reps'))
  const result=fillResultPlan({...updated,uses_load:true,sets:[{reps:'',load_kg:''}]},level,variant)
  assert.equal(result.sets[0].reps,d.reps)
  assert.equal(result.sets[0].load_kg,variant==='men'?d.loadKgMen:variant==='women'?'12.5':'')
  for(const other of levels.filter(l=>l!==level))assert.deepEqual(updated.levels[other],ex.levels[other])
  count++
 }
 console.log('SERIALIZATION/DOSE CASES (not execution certification of arbitrary collaboration):',count)
})
test('SAMSPEL template eligibility, validation, and scoring at every format boundary',()=>{
 let checked=0
 for(const format of COMPOSITE_BLOCK_FORMATS){
  const offered=samspelTemplateOptions(format)
  for(const [id] of offered){
   const choice=samspelTemplateChoice(id,{format,interval:60,duration:720})
   assert.ok(choice)
   const items=[{name:'Air squat'},{name:'Push-up'}],cfg={...choice.config}
   if(id==='chipper')cfg.targets=items.map(x=>({exercise_name:x.name,target_reps:20}))
   if(['paired_emom','double_emom'].includes(id))cfg.tracks=items.map(x=>x.name)
   if(id==='strength'){items.pop();cfg.exercise_name=items[0].name}
   const ctx={format:choice.format,participation:'partner',collaboration:choice.collaboration,participantCount:2,items}
   assert.equal(samspelIssue(cfg,ctx),null,format+' '+id)
   assert.ok(samspelIssue(cfg,{...ctx,participation:'individual'}),id)
   assert.ok(samspelIssue(cfg,{...ctx,format:'Invalid'}),id)
   const scoring=samspelScoring(cfg,scoreForWodFormat(choice.format))
   if(id==='recovery')assert.deepEqual(scoring.fields,[]) // completion only, no competitive metric
   else assert.ok(scoring.fields.length)
   if(id!=='legacy')assert.equal(samspelDedicatedResults(cfg),true)
   checked++
  }
  for(const id of ['legacy','relay','emom','double_emom','paired_emom','strength','chipper','quality','recovery'])if(!offered.some(x=>x[0]===id))assert.equal(samspelTemplateChoice(id,{format}),null)
 }
 console.log('SAMSPEL VALID TEMPLATE CASES:',checked)
})
test('SYNCHRON admits only executable single-block Chipper and rejects ambiguity, caps and other formats',()=>{
 for(const format of COMPOSITE_BLOCK_FORMATS)for(const level of levels)for(const cap of [null,600]){
  const schema={items:[item('a')],time_cap_seconds:cap}
  const w={format,timer_settings:{workout_schema:schema}}
  const res=synchronWodTargets(w,level)
  assert.equal(!res.issue,format==='Chipper'&&cap===null,format+' '+level+' '+cap)
 }
 for(const patch of [{is_rest:true},{is_complex:true},{side_mode:'per_side'},{levels:{rx:{reps:5,durationSeconds:30}}},{levels:{rx:{reps:'21-15-9'}}},{levels:{rx:{reps:5,sets:2}}}]){
  assert.ok(synchronWodTargets({format:'Chipper',timer_settings:{workout_schema:{items:[{...item('x'),...patch}]}}}).issue)
 }
})

import {readFileSync} from 'node:fs'
test('equipment plan collection cannot shadow the callable catalogue equipment label helper',()=>{
 const code=readFileSync(new URL('../src/components/WodBuilder.jsx',import.meta.url),'utf8')
 assert.match(code,/const equipmentItems=value=>/)
 assert.match(code,/const plannedEquipmentItems=equipmentItemsForSamspel/)
 assert.doesNotMatch(code,/const equipmentItems=equipmentItemsForSamspel/)
 assert.match(code,/equipmentItems\(ex\.equipment\)\.map/)
 assert.match(code,/equipmentPlanSnapshot\(plannedEquipmentItems,equipmentPlan\)/)
})
