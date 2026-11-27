import test from 'node:test'
import assert from 'node:assert/strict'
import {warmupBatch,warmupLibraryPayload,publishWarmupBatch} from '../src/lib/warmupLibrary49.js'
import {flowItemGroup,flowReporting} from '../src/lib/workoutFlow.js'
import {compositeTimerConfig,validateCompositeBlocks} from '../src/lib/compositeWod.js'
import {normalizeWodEngine} from '../src/lib/wodEngine.js'
const names=['Bird dog','Dead bug','ITYW + rygghev','Thread the needle','Thoracic rotation','Row','Jump rope','Shoulder pass-through','Overhead Squat','Wall slides','Ankle rocks','Air squat','Glute bridge','Romanian deadlift','Scapular push-ups','Push-up','Strict press','Dead Hang','Scapular pull-ups','TRX Row','Walking lunge']
const catalogue=names.map((name,i)=>({id:'e'+i,name,is_active:true,category:'Styrke',equipment:name==='Row'?'Romaskin':'Kroppsvekt',body_area:'Fullkropp'}))
test('six published payloads reuse actual composite engine, warmup phases and completion-only reporting',()=>{const batch=warmupBatch(catalogue);assert.equal(batch.length,6);for(const p of batch){assert.equal(p.is_published,true);assert.equal(p.category,'warmup');const s=p.timer_settings.workout_schema;assert.equal(s.items.length,9);assert.equal(validateCompositeBlocks(s.composite_blocks,s.items),'');const engine=normalizeWodEngine(s);assert.equal(engine.blocks.length,3);for(const b of engine.blocks){assert.equal(flowReporting(b,s),'done');const t=compositeTimerConfig(b);assert.ok(Number(t.timerSettings.duration_seconds)>0)}assert.ok(s.items.every(i=>i.exercise_id&&flowItemGroup(i,s).reporting==='done'));assert.equal(p.duration_minutes,Math.ceil(s.duration_seconds/60));assert.ok(s.items.filter(i=>i.side_mode==='both').length>=3);assert.equal(s.items[1].levels.rx.loadMode,'none')}})
test('batch is additive and disallows missing or ambiguous exercises',()=>{assert.equal(warmupBatch(catalogue,[{name:'Panzer Mobility'}]).length,5);assert.throws(()=>warmupLibraryPayload('Panzer Mobility',catalogue.filter(e=>e.name!=='Bird dog')),/Bird dog/);assert.throws(()=>warmupLibraryPayload('Panzer Mobility',[...catalogue,catalogue[0]]),/Bird dog/)})
test('requires exact approval before any write',async()=>{await assert.rejects(publishWarmupBatch(null,null,warmupBatch(catalogue),'wrong'),/godkjenn/)})


import {prepareLibraryWarmup,equivalentLibraryWodSource} from '../src/lib/compositeLibrary.js'
import {compositePartLabel} from '../src/lib/zuendung.js'
test('all six library warmups become Del 0 without modifying their source or main Chipper',()=>{
 for(const [index,payload] of warmupBatch(catalogue).entries()){
  const wod={...payload,id:'saved-'+index},before=JSON.stringify(wod)
  let n=0
  const prepared=prepareLibraryWarmup(wod,()=>`prep-${index}-${++n}`)
  const main={id:'main',title:'Chipper',format:'Chipper',minutes:15,participation:'partner',participant_count:2,collaboration:'synchronized'}
  const mainItems=[{block_id:'main',exercise_name:'Air squat',reps:20}]
  const all=[...prepared.blocks,main]
  assert.equal(prepared.blocks.length,3)
  assert.equal(prepared.items.length,9)
  assert.equal(validateCompositeBlocks(all,[...prepared.items,...mainItems]),'')
  assert.equal(compositePartLabel(all,3),'A')
  assert.equal(new Set(prepared.blocks.map(b=>b.warmup_group)).size,1)
  assert.ok(prepared.blocks.every(b=>b.warmup_source_wod_id===wod.id&&b.warmup_source_wod_name===wod.name&&flowReporting(b)==='done'&&!equivalentLibraryWodSource(b)))
  for(const [i,b] of prepared.blocks.entries()){
   assert.equal(compositePartLabel(all,i),'0.'+(i+1))
   assert.ok(compositeTimerConfig({...b,items:prepared.items.filter(row=>row.block_id===b.id)}).timerSettings.duration_seconds>0)
  }
  assert.equal(compositeTimerConfig({...main,items:mainItems}).timerSettings.workout_schema.wod_engine.collaboration,'synchronized')
  assert.equal(JSON.stringify(wod),before)
 }
})
test('warmup picker rejects non-warmups and archived entries',()=>{
 const p={...warmupBatch(catalogue)[0],id:'warm'}
 assert.throws(()=>prepareLibraryWarmup({...p,is_archived:true}),/Oppvarming/)
 assert.throws(()=>prepareLibraryWarmup({id:'main',category:'main'}),/Oppvarming/)
})

import {architectSections,logicalArchitectParts,logicalPartLabel,nextMainPartLabel} from '../src/lib/wodArchitect.js'
test('Del 0 is one editable part and never renumbers Del A or Del B',()=>{
 for(const [i,payload] of warmupBatch(catalogue).entries()){
  let n=0;const prep=prepareLibraryWarmup({...payload,id:'saved-'+i},()=> 'prep-'+(++n));
  const main=[{id:'a',format:'Chipper',minutes:15,participation:'partner',participant_count:2,collaboration:'synchronized'},{id:'b',format:'AMRAP',minutes:5}];
  const blocks=[...prep.blocks,...main];const items=[...prep.items.map(x=>({...x,blockId:x.block_id,name:x.exercise_name})),...Array.from({length:6},(_,j)=>({blockId:'a',name:'Øving '+j,key:'a'+j})),{blockId:'b',name:'Air squat'}];
  const original=JSON.stringify({blocks,items});const logical=logicalArchitectParts(architectSections(blocks,items,{composite:true}),blocks);
  assert.deepEqual(logical.map(p=>p.partLabel),['0','A','B']);assert.deepEqual(logical.map(p=>p.group.length),[9,6,1]);assert.equal(logical[0].blockIds.length,3);assert.equal(logical[1].collaboration,'synchronized');assert.equal(nextMainPartLabel(blocks),'C');assert.equal(logicalPartLabel(blocks,4),'B');assert.equal(JSON.stringify({blocks,items}),original);
 }
})
