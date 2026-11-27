import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseWodImport} from '../src/lib/wodImport.js'
import {COMPOSITE_FORMAT,COMPOSITE_BLOCK_FORMATS,defaultCompositeBlocks,validateCompositeBlocks,compositeBlockForTimer,compositeTimerConfig,compositeBlockDuration,compositeTotalSeconds,compositeScoredBlocks,parseCompositeScoreTime,isValidRirTarget,plannedFixedEmomSets} from '../src/lib/compositeWod.js'
import {deriveBenchmarkRecords} from '../src/lib/prMetrics.js'

const catalog=['Strict press','Push Press','Goblet squat','Alternating Dumbbell Push Jerk','Burpee Over Dumbbell','Bear Crawl'].map((name,index)=>({id:String(index+1),name,is_active:true}))
const painCave=`ØKT 2 · Frå man cave til pain cave
12. oktober 2026 · Pressestyrke, bein og koordinasjon i ein kort sirkel.
Oppvarming etter fast rutine
Etter fast oppvarming: skuldermobilitet, 8 air squats, 8 lette press og 10–20 sekund planke.
Hovuddel
Del A – striktpress + pushpress
E3MOM 9 (3 sett): 5 striktpress + 3 pushpress. Originalen: 1–2 RIR.
Del B – AMRAP 8
8 hantel goblet squat
8 alternerande hantel push jerk
4 burpees over hantel
10 m bear crawl
Frå originalen / status
Originale vektalternativ i AMRAP: RX 22,5 kg, Mstr 17,5 kg, Xprt 12,5 kg.
PT-notat – teknikk
Skalering og din progresjon
Du: hald 2–4 RIR på styrkedelen og jamn fart i AMRAP.
Etter økta: Noter belastning, rundar/reps og om press over hovudet var komfortabelt.`

test('Pain Cave import preserves two blocks, six library movements and personalized RIR',()=>{
 const wod=parseWodImport(painCave,catalog)
 assert.equal(wod.name,'Frå man cave til pain cave')
 assert.equal(wod.format,COMPOSITE_FORMAT)
 assert.deepEqual(wod.blocks.map(b=>[b.format,b.minutes]),[['E3MOM',9],['AMRAP',8]])
 assert.deepEqual(wod.items.map(x=>x.name),catalog.map(x=>x.name))
 assert.deepEqual(wod.items.map(x=>x.reps),['5','3','8','8','4',''])
 assert.deepEqual(wod.items.map(x=>x.block_id),['a','a','b','b','b','b'])
 assert.equal(wod.items[5].quantity.value,10)
 assert.equal(wod.items[5].quantity.unit,'m')
 assert.ok(wod.items.every(x=>x.matched))
 assert.equal(wod.unmatched.length,0)
 assert.equal(wod.items[0].rirTarget,'2–4')
 assert.equal(wod.items[1].rirTarget,'2–4')
 assert.match(wod.notes,/skuldermobilitet/)
 assert.match(wod.notes,/22,5 kg/)
 assert.equal(validateCompositeBlocks(wod.blocks,wod.items),'')
})

test('E3MOM repeats both movements every three minutes, while AMRAP stays separate',()=>{
 const slots=compositeBlockForTimer({id:'a',title:'Del A',format:'E3MOM',duration_seconds:540,items:[{exercise_name:'Strict press'},{exercise_name:'Push Press'}]})
 assert.deepEqual(slots.items.map(x=>x.minute_slot),['1,2,3','1,2,3'])
 assert.equal(compositeTotalSeconds(defaultCompositeBlocks()),1020)
 const b=compositeBlockForTimer({format:'AMRAP',duration_seconds:480,items:[{exercise_name:'Bear Crawl'}]})
 assert.equal(b.items[0].minute_slot,undefined)
})

test('completed fixed E3MOM prepopulates three sets of planned reps, never AMRAP',()=>{
 const blocks=[{id:'a',format:'E3MOM',duration_seconds:540},{id:'b',format:'AMRAP',duration_seconds:480}]
 const press=plannedFixedEmomSets({block_id:'a',reps:5,levels:{rx:{reps:'5'}}},blocks,'rx',false)
 assert.equal(press.autoFill,true)
 assert.equal(press.sets.length,3)
 assert.equal(press.reps,5)
 const push=plannedFixedEmomSets({block_id:'a',reps:3,levels:{rx:{reps:'3'}}},blocks,'rx',false)
 assert.equal(push.sets.length,3)
 assert.equal(push.reps,3)
 const amrap=plannedFixedEmomSets({block_id:'b',reps:8,levels:{rx:{reps:'8'}}},blocks,'rx',false)
 assert.equal(amrap.autoFill,false)
 assert.equal(amrap.sets.length,0)
 const manual=plannedFixedEmomSets({block_id:'a',reps:5},blocks,'rx',true)
 assert.equal(manual.autoFill,false)
})

test('RIR supports athlete-selected load, range and deliberate -1 marking',()=>{
 for(const v of ['0','10','-1','2','2–4','1-2'])assert.equal(isValidRirTarget(v),true,v)
 for(const v of ['11','4–2','-2','2–11','open',''])assert.equal(isValidRirTarget(v),false,v)
})

test('Composite format is wired to builder, timer, import and persistent log',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')
 const builder=read('../src/components/WodBuilder.jsx')
 const timer=read('../src/components/Training.jsx')
 const panel=read('../src/components/WodImportPanel.jsx')
 assert.match(builder,/composite_blocks:isComposite/)
 assert.match(builder,/block_id:isComposite/)
 assert.match(builder,/schema\.wod_engine=\{\.\.\.engineConfig,blocks:isComposite/)
 assert.match(builder,/isValidRirTarget/)
 assert.match(timer,/function CompositeTimer/)
 assert.match(timer,/active_block_index:active/)
 assert.match(timer,/block_results:timerSnapshot\.block_results/)
 assert.match(timer,/format===COMPOSITE_FORMAT/)
 assert.match(panel,/wod-import-composite-preview/)
})

test('A–E supports several formats, per-part durations, and an exact preset pause',()=>{
 const blocks=[
  {id:'a',title:'Del A',format:'E3MOM',minutes:9,transitionMode:'manual'},
  {id:'b',title:'Del B',format:'Strength',minutes:12,transitionMode:'timed',transitionSeconds:90},
  {id:'c',title:'Del C',format:'Intervall',minutes:9,workSeconds:40,restSeconds:20,rounds:3},
  {id:'d',title:'Del D',format:'For Time',minutes:10},
  {id:'e',title:'Del E',format:'Stasjonssirkel',minutes:12,workSeconds:45,restSeconds:15,rounds:3},
 ]
 const counts={a:2,b:1,c:3,d:2,e:4}
 const exercises=blocks.flatMap(block=>Array.from({length:counts[block.id]},(_,i)=>({block_id:block.id,exercise_name:block.id+i})))
 assert.equal(validateCompositeBlocks(blocks,exercises),'')
 assert.ok(COMPOSITE_BLOCK_FORMATS.includes('Chipper'))
 assert.ok(COMPOSITE_BLOCK_FORMATS.includes('Tabata'))
 assert.ok(COMPOSITE_BLOCK_FORMATS.includes('Row Intervals'))
 const durationBlocks=blocks.map(block=>({...block,itemsCount:counts[block.id]}))
 assert.equal(compositeBlockDuration(blocks[2],3),520)  // 9×40s + 8×20s
 assert.equal(compositeBlockDuration(blocks[4],4),705)  // 12×45s + 11×15s
 assert.equal(compositeTotalSeconds(durationBlocks),3175)
 const station=compositeTimerConfig({...blocks[4],items:exercises.filter(item=>item.block_id==='e')})
 assert.equal(station.timerSettings.workout_schema.station_circuit.station_count,4)
 assert.equal(station.timerSettings.rounds,3)
 assert.equal(station.timerSettings.work_seconds,45)
 assert.equal(station.timerSettings.rest_seconds,15)
})

test('Preset breaks reject invalid settings; interval and station parts cannot hide Pause as an exercise',()=>{
 const blocks=defaultCompositeBlocks().map(block=>({...block}))
 const valid=[{block_id:'a',exercise_name:'Strict press'},{block_id:'b',exercise_name:'Goblet squat'}]
 blocks[0].transitionMode='timed'
 blocks[0].transitionSeconds=0
 assert.match(validateCompositeBlocks(blocks,valid),/pause/)
 blocks[0].transitionSeconds=90
 assert.equal(validateCompositeBlocks(blocks,valid),'')
 blocks[1].format='Stasjonssirkel'
 const withRest=[...valid,{block_id:'b',exercise_name:'Air squat'},{block_id:'b',is_rest:true,exercise_name:'Pause'}]
 assert.match(validateCompositeBlocks(blocks,withRest),/Pause/)
})

test('Composite scores preserve each AMRAP result, For Time cap, and explicit RIR',()=>{
 const raw=[
  {id:'c',title:'Del C',format:'AMRAP',completed:true,roundsCompleted:5,extra_reps:0,elapsed:480},
  {id:'d',title:'Del D',format:'For Time',completed:true,elapsed:470,time_cap_reached:false},
 ]
 const scored=compositeScoredBlocks(raw,{c:{rounds:'6',extraReps:'2'},d:{time:'07:20'}})
 assert.equal(scored[0].roundsCompleted,6)
 assert.equal(scored[0].extra_reps,2)
 assert.equal(scored[1].elapsed,440)
 assert.equal(parseCompositeScoreTime('07:20'),440)
 assert.ok(Number.isNaN(parseCompositeScoreTime('07:70')))
})

test('Benchmark PR compares each part separately and excludes uncompleted time caps',()=>{
 const mk=(id,date,rounds,reps,time,timeCapReached=false)=>({
  id,source_wod_id:'same-wod',title:'5 delars trening',format:COMPOSITE_FORMAT,workout_date:date,
  result_data:{prescription_level:'rx',block_summary:[
   {id:'c',title:'Del C',format:'AMRAP',completed:true,roundsCompleted:rounds,extra_reps:reps,elapsed:480},
   {id:'d',title:'Del D',format:'For Time',completed:true,elapsed:time,time_cap_reached:timeCapReached}
  ]}
 })
 const logs=[
  mk('1','2026-11-01',5,8,485),
  mk('2','2026-11-23',6,2,440),
  mk('3','2026-11-24',4,0,600,true)
 ]
 assert.equal(deriveBenchmarkRecords(logs).length,0)
 const result=deriveBenchmarkRecords(logs,['same-wod'])
 assert.equal(result.length,2)
 const amrap=result.find(r=>r.format==='amrap')
 const forTime=result.find(r=>r.format==='for time')
 assert.deepEqual([amrap.score.rounds,amrap.score.reps,amrap.logId],[6,2,'2'])
 assert.deepEqual([forTime.score.value,forTime.logId],[440,'2'])
 assert.equal(forTime.count,2)
})

test('The session persists separate scores and skips planned reps when generating PRs',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')
 const training=read('../src/components/Training.jsx')
 assert.match(training,/block_summary:scoredBlocks\.length/)
 assert.match(training,/composite_breaks:timerSnapshot\.composite_breaks/)
 assert.match(training,/clearPlannedResults=forResult\|\|wod\?\.format===COMPOSITE_FORMAT/)
 assert.match(training,/rir:s\.rir===''\|\|s\.rir==null/)
 assert.match(training,/autoStartOnMount=\{autoStartIndex===active\}/)
 const history=read('../src/components/MyPage.jsx')
 assert.match(history,/id,title,source_wod_id,workout_date/)
 assert.match(history,/result_data,note,workout_exercises/)
 assert.match(history,/\.eq\('member_id',user\.id\)/)
})

import {explicitBlockResults} from '../src/lib/compositeWod.js'
test('explicit per-part score is independent of format, preserves zero and ignores failed complex attempts',()=>{
 const blocks=[{id:'a',title:'Oppvarming',format:'AMRAP',scoreMode:'completion'},{id:'b',title:'Complex',format:'E2MOM',scoreMode:'load'},{id:'c',title:'Roing',format:'EMOM',scoreMode:'calories'},{id:'d',title:'Tid',format:'For Time',scoreMode:'none'},{id:'e',format:'AMRAP'}]
 const results=explicitBlockResults(blocks,{a:{primary:'complete'},c:{primary:'0'}},[{block_id:'b',is_complex:true,complex_family:'custom',sets:[{complex_status:'complete',reps:1,load_kg:60},{complex_status:'partial',reps:0,load_kg:65}]}])
 assert.deepEqual(results.map(result=>result.value),['complete',60,0,null])
 assert.equal(explicitBlockResults(blocks)[0].value,null)
 assert.throws(()=>explicitBlockResults(blocks,{c:{primary:'-1'}}),/Ugyldig/)
})

import {getFixedSlotTimerState} from '../src/lib/timerClock.js'
test('Intro 20/40 includes the final rest only when explicitly requested',()=>{
 for(const [count,rounds,total] of [[3,3,540],[2,5,600]]){
 const items=Array.from({length:count},(_,i)=>({exercise_name:'Move '+i}));
 const block={format:'Intervall',minutes:total/60,workSeconds:20,restSeconds:40,rounds,items,includeFinalRest:true};
 assert.equal(compositeBlockDuration(block,count),total);
 assert.equal(compositeTimerConfig(block).timerSettings.workout_schema.include_final_rest,true);
 const state=getFixedSlotTimerState({elapsed:total-1,workSeconds:20,restSeconds:40,rounds,slotsPerRound:count,includeFinalRest:true});
 assert.equal(state.isTransition,true);assert.equal(state.phaseRemaining,1);assert.equal(state.roundsCompleted,rounds);
 assert.equal(getFixedSlotTimerState({elapsed:total,workSeconds:20,restSeconds:40,rounds,slotsPerRound:count,includeFinalRest:true}).isComplete,true);
 assert.equal(compositeBlockDuration({...block,includeFinalRest:false},count),total-40);
 }
});
test('For Time retains explicit round count and partner block retains metadata',()=>{
 const config=compositeTimerConfig({format:'For Time',minutes:10,rounds:4,items:[{exercise_name:'Snatch'}]});
 assert.equal(config.timerSettings.rounds,4);assert.equal(config.timerSettings.workout_schema.rounds,4);assert.equal(config.timerSettings.workout_schema.time_cap_seconds,600);
 const partner=compositeTimerConfig({format:'AMRAP',minutes:10,participation:'partner',participant_count:2,collaboration:'free_split',items:[{exercise_name:'Bike erg'}]});
 assert.equal(partner.timerSettings.workout_schema.wod_engine.participation,'partner');assert.equal(partner.timerSettings.workout_schema.wod_engine.collaboration,'free_split');
});

import {fixedIntervalSummary,fixedIntervalLabel} from '../src/lib/wodFormatAdvisor.js'
test('Builder uses the same duration as the timer, without changing legacy or station behavior',()=>{
 const plan=fixedIntervalSummary({workSeconds:20,restSeconds:40,rounds:3,exerciseCount:3,includeFinalRest:true});
 assert.equal(plan.totalSeconds,540);assert.equal(plan.restTotal,360);assert.match(fixedIntervalLabel(plan),/inkl\. siste kvilepause/);
 assert.equal(fixedIntervalSummary({workSeconds:20,restSeconds:40,rounds:3,exerciseCount:3}).totalSeconds,500);
 assert.equal(compositeBlockDuration({format:'Stasjonssirkel',minutes:9,workSeconds:20,restSeconds:40,rounds:3,includeFinalRest:true},3),500);
});
test('Only explicit composite For Time targets stop after planned rounds',()=>{
 for(const format of ['For Time','Chipper','Couplet','AMRAP']){
 const s=compositeTimerConfig({format,rounds:4,minutes:10,items:[{exercise_name:'Move'}]}).timerSettings.workout_schema;
 assert.equal(s.planned_for_time_rounds,format==='For Time'?4:null);
 }
 assert.equal(compositeTimerConfig({format:'For Time',rounds:'',minutes:10}).timerSettings.workout_schema.planned_for_time_rounds,null);
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.match(read('../src/components/Training.jsx'),/if\(plannedForTimeRounds&&phase==='FERDIG'&&laps\.length>=plannedForTimeRounds\)setPhase\('PAUSE'\)/);
 assert.match(read('../src/components/WodBuilder.jsx'),/Ta med siste kvilepause/);
 assert.match(read('../src/components/WodBuilder.jsx'),/Planlagde rundar \(valfritt\)/);
});

import {qualityRowConfig,activeRecoveryConfig} from '../src/lib/samspel.js'
import {compositeSamspelConfig,compositeSamspelResults} from '../src/lib/compositeWod.js'
import {isIndividualPerformance} from '../src/lib/performanceEvidence.js'
test('quality and recovery parts retain their own timer, status and distance',()=>{
 const q={id:'a',title:'Oppvarming',format:'Eigen økt',minutes:10,samspel:qualityRowConfig(),scoreMode:'none'}
 const r={id:'b',title:'Ro ned',format:'Eigen økt',minutes:5,samspel:activeRecoveryConfig(5,3),scoreMode:'none'}
 const items=[{block_id:'a',exercise_name:'Bird dog'},{block_id:'b',exercise_name:'Stretch'}]
 assert.equal(validateCompositeBlocks([q,r],items),'')
 assert.equal(compositeTimerConfig(q).timerSettings.workout_schema.samspel.main_track,'quality')
 assert.equal(compositeTimerConfig(r).timerSettings.workout_schema.wod_engine.participant_count,3)
 assert.equal(compositeSamspelConfig({...q,minutes:8}).duration_seconds,480)
 assert.ok(validateCompositeBlocks([{...q,format:'AMRAP'},r],items))
 const scores={'samspel:a':{distance:'900',participants:{1:{quality:'done'},2:{quality:'partial'}}},'samspel:b':{participants:{1:{quality:'done'},2:{quality:'done'},3:{quality:'done'}}}}
 const result=compositeSamspelResults([q,r],scores,{},true)
 assert.equal(result.issue,null);assert.equal(result.rows[0].distance,900);assert.equal(result.rows[0].completed,false);assert.equal(result.rows[1].completed,true)
 assert.ok(compositeSamspelResults([q,r],scores,{},false).issue)
 assert.ok(compositeSamspelResults([q,r],{}, {},true).issue)
 assert.equal(isIndividualPerformance({result_data:{samspel_blocks:result.rows}}),false)
 assert.equal(isIndividualPerformance({result_data:{wod_engine:{blocks:[q,r]}}}),false)
})

import {mergeCompositeSamspelResults} from '../src/lib/compositeWod.js'
test('composite team evidence overrides clock completion without changing other parts',()=>{
 const raw=[{id:'a',elapsed:600,completed:true,roundsCompleted:10},{id:'b',completed:true,roundsCompleted:5}]
 const measured=[{block_id:'a',title:'Quality',elapsed:600,completed:false,distance:900,samspel:qualityRowConfig()}]
 const merged=mergeCompositeSamspelResults(raw,measured)
 assert.equal(merged[0].completed,false);assert.equal(merged[0].roundsCompleted,null);assert.equal(merged[0].distance,900);assert.deepEqual(merged[1],raw[1])
 assert.equal(mergeCompositeSamspelResults([],measured)[0].id,'a')
})


import {engineSwapConfig} from '../src/lib/samspel.js'
import {prepareLibraryWodPart,equivalentLibraryWodSource} from '../src/lib/compositeLibrary.js'
test('composite Engine Swap uses existing timer and actual participant results',()=>{
 for(let count=2;count<=8;count++){
  const config={...engineSwapConfig(60,count*120),participant_count:count}
  const part={id:'engine',title:'Engine Swap',format:'EMOM',minutes:count*2,emomIntervalSeconds:60,scoreMode:'none',samspel:config,items:[{exercise_name:'Push-up'}]}
  const next={id:'next',title:'Nedtrapping',format:'Eigen økt',minutes:3}
  const items=[{block_id:'engine',exercise_name:'Push-up'},{block_id:'next',exercise_name:'Stretch'}]
  assert.equal(validateCompositeBlocks([part,next],items),'')
  assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.samspel.switch_seconds,60)
  assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.wod_engine.participant_count,count)
  assert.equal(compositeTimerConfig(part).timerSettings.duration_seconds,count*120)
  assert.equal(compositeSamspelConfig({...part,minutes:count*2+1}),null)
  assert.equal(compositeSamspelConfig({...part,format:'AMRAP'}),null)
  assert.equal(plannedFixedEmomSets({...items[0],reps:5},[part],'rx',false).autoFill,false)
  const participants=Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{intervals:String(2*(count-1)),erg:'100'}]))
  const score={'samspel:engine':{participants}}
  const full=compositeSamspelResults([part,next],score,{0:{elapsed:count*120,hasStarted:true}})
  assert.equal(full.issue,null);assert.equal(full.rows[0].completed,true);assert.equal(full.rows[0].distance,count*100)
  assert.equal(full.rows[0].samspel.participant_results.length,count)
  assert.equal(compositeSamspelResults([part,next],score,{},true).rows[0].elapsed,null)
  assert.equal(isIndividualPerformance({result_data:{samspel_blocks:full.rows}}),false)
  const merged=mergeCompositeSamspelResults([{id:'engine',format:'EMOM',completed:true,roundsCompleted:8},next],full.rows)
  assert.equal(merged[0].format,'EMOM');assert.equal(merged[0].roundsCompleted,null);assert.deepEqual(merged[1],next)
  assert.ok(compositeSamspelResults([part,next],score,{0:{elapsed:0}}).issue)
  assert.ok(compositeSamspelResults([part,next],{}, {},true).issue)
  const partial=Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{intervals:i===0?'0':'1',erg:i===0?'20':'0'}]))
  const interrupted=compositeSamspelResults([part,next],{'samspel:engine':{participants:partial}},{0:{elapsed:60,hasStarted:true}})
  assert.equal(interrupted.issue,null);assert.equal(interrupted.rows[0].completed,false)
  const bad={...partial,2:{...partial[2],erg:'1'}}
  assert.equal(compositeSamspelResults([part,next],{'samspel:engine':{participants:bad}},{0:{elapsed:60}}).field,'samspel-block-engine-2-erg')
  const zero=Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{intervals:'0',erg:'0'}]))
  assert.equal(compositeSamspelResults([part,next],{'samspel:engine':{participants:zero}},{}).rows[0].completed,false)
  const cal=compositeSamspelResults([{...part,samspel:{...config,metric:'calories'}},next],score,{},true)
  assert.equal(cal.rows[0].distance,null);assert.equal(cal.rows[0].calories,count*100)
  const imported=prepareLibraryWodPart({id:'w',name:'Engine',format:'EMOM',timer_settings:{workout_schema:{samspel:config,items:part.items}}},{id:'engine'})
  assert.equal(imported.block.emomIntervalSeconds,60);assert.equal(imported.block.minutes,count*2)
  assert.equal(imported.block.source_wod_snapshot.samspel.participant_count,count)
  assert.equal(equivalentLibraryWodSource(imported.block),null)
 }
})


import {doubleEmomConfig} from '../src/lib/samspel.js'
import {compositeDoubleTracks} from '../src/lib/compositeWod.js'
test('composite Double EMOM uses two explicit tracks and measured individual intervals',()=>{
 const items=[{block_id:'double',exercise_name:'Push-up'},{block_id:'double',exercise_name:'Air squat'}]
 const next={id:'next',title:'Nedtrapping',format:'Eigen økt',minutes:3}
 const all=[...items,{block_id:'next',exercise_name:'Stretch'}]
 for(const rule of ['fixed','time']){
  const raw={id:'double',title:'Double EMOM',format:'EMOM',minutes:10,emomIntervalSeconds:60,scoreMode:'none',samspel:{...doubleEmomConfig(60,600),switch_rule:rule},items}
  const part=compositeDoubleTracks(raw,all)
  assert.deepEqual(part.samspel.tracks,['Push-up','Air squat'])
  assert.equal(validateCompositeBlocks([part,next],all),'')
  assert.ok(validateCompositeBlocks([part,next],[...all,{block_id:'double',is_rest:true,exercise_name:'Pause'}]))
  assert.ok(validateCompositeBlocks([part,next],[{...items[0],minute_slot:'1'},items[1],all[2]]))
  assert.equal(compositeSamspelConfig({...part,format:'AMRAP'}),null)
  assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.samspel.switch_rule,rule)
  assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.wod_engine.participant_count,2)
  assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.items[0].minute_slot,undefined)
  assert.equal(plannedFixedEmomSets({...items[0],reps:5},[part],'rx',false).autoFill,false)
  const participants=rule==='fixed'?{1:{trackA:'10',trackB:'0'},2:{trackA:'0',trackB:'10'}}:{1:{trackA:'5',trackB:'5'},2:{trackA:'5',trackB:'5'}}
  const score={'samspel:double':{participants}}
  const full=compositeSamspelResults([part,next],score,{0:{elapsed:600}})
  assert.equal(full.issue,null);assert.equal(full.rows[0].completed,true)
  assert.equal(full.rows[0].distance,null);assert.equal(full.rows[0].calories,null)
  assert.equal(compositeSamspelResults([part,next],score,{},true).rows[0].completed,true)
  assert.ok(compositeSamspelResults([part,next],score,{0:{elapsed:0}}).issue)
  assert.ok(compositeSamspelResults([part,next],{}, {},true).issue)
  const partial={1:{trackA:'1',trackB:'0'},2:{trackA:'0',trackB:'1'}}
  const early=compositeSamspelResults([part,next],{'samspel:double':{participants:partial}},{0:{elapsed:60}})
  assert.equal(early.issue,null);assert.equal(early.rows[0].completed,false)
  assert.equal(compositeSamspelResults([part,next],{'samspel:double':{participants:{...partial,1:{trackA:'1',trackB:'1'}}}},{0:{elapsed:60}}).field,'samspel-block-double-1-trackB')
  assert.equal(isIndividualPerformance({result_data:{samspel_blocks:full.rows}}),false)
  const merged=mergeCompositeSamspelResults([{id:'double',format:'EMOM',roundsCompleted:10},next],full.rows)
  assert.equal(merged[0].format,'EMOM');assert.equal(merged[0].roundsCompleted,null);assert.deepEqual(merged[1],next)
  const imported=prepareLibraryWodPart({id:'w',name:'Double',format:'EMOM',timer_settings:{workout_schema:{samspel:part.samspel,items}}},{id:'double'})
  assert.equal(imported.block.minutes,10);assert.deepEqual(imported.block.samspel.tracks,part.samspel.tracks)
  assert.equal(equivalentLibraryWodSource(imported.block),null)
  if(rule==='time')assert.equal(compositeSamspelConfig({...part,minutes:9}),null)
 }
})


import {ironTwinsConfig} from '../src/lib/samspel.js'
import {compositeIronTwinsDose} from '../src/lib/compositeWod.js'
test('composite Iron Twins preserves measured sets per athlete and does not infer personal PR',()=>{
 const item={block_id:'iron',exercise_name:'Bench press',levels:{rx:{sets:3},scaled:{sets:2}}}
 const next={id:'next',format:'Eigen økt',minutes:3,title:'Nedtrapping'}
 const items=[item,{block_id:'next',exercise_name:'Stretch'}]
 const raw={id:'iron',format:'Strength',minutes:12,title:'Iron Twins',scoreMode:'none',samspel:ironTwinsConfig(),items:[item]}
 const part=compositeIronTwinsDose(raw,items,'rx')
 assert.equal(part.samspel.exercise_name,'Bench press')
 assert.equal(part.samspel.planned_sets,3)
 assert.equal(compositeIronTwinsDose(raw,items,'scaled').samspel.planned_sets,2)
 assert.equal(validateCompositeBlocks([part,next],items),'')
 assert.ok(validateCompositeBlocks([part,next],[...items,{block_id:'iron',is_rest:true,exercise_name:'Pause'}]))
 assert.ok(validateCompositeBlocks([part,next],[...items,{block_id:'iron',exercise_name:'Squat'}]))
 assert.equal(compositeSamspelConfig({...part,format:'AMRAP'}),null)
 assert.equal(compositeSamspelConfig({...part,samspel:{...part.samspel,planned_sets:31}}),null)
 assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.samspel.planned_sets,3)
 assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.wod_engine.participant_count,2)
 assert.equal(compositeTimerConfig(part).timerSettings.workout_schema.structure,'strength')
 const actual=(kg)=>Object.fromEntries(Array.from({length:3},(_,i)=>[['reps-'+i,'5'],['load-'+i,String(kg)],['rir-'+i,'2']]).flat())
 const participants={1:actual(50),2:actual(40)}
 const score={'samspel:iron':{participants}}
 const full=compositeSamspelResults([part,next],score,{0:{elapsed:300,hasStarted:true}})
 assert.equal(full.issue,null);assert.equal(full.rows[0].completed,true)
 assert.equal(full.rows[0].samspel.participant_results[0].strength_sets[0].load_kg,50)
 assert.equal(full.rows[0].samspel.participant_results[1].strength_sets[0].load_kg,40)
 assert.equal(full.rows[0].samspel.participant_results[1].strength_sets[0].rir,2)
 assert.equal(isIndividualPerformance({result_data:{samspel_blocks:full.rows}}),false)
 assert.ok(compositeSamspelResults([part,next],score,{}).issue)
 assert.equal(compositeSamspelResults([part,next],score,{},true).rows[0].elapsed,null)
 assert.equal(compositeSamspelResults([part,next],{},{}).rows[0].completed,false)
 const partial={'samspel:iron':{participants:{1:{'reps-0':'0','load-0':'50'},2:{'reps-0':'5','load-0':'40'}}}}
 assert.equal(compositeSamspelResults([part,next],partial,{0:{elapsed:120}}).rows[0].completed,false)
 const invalid={'samspel:iron':{participants:{1:{'reps-0':'5','load-0':'50','rir-0':'11'}}}}
 assert.equal(compositeSamspelResults([part,next],invalid,{0:{elapsed:120}}).field,'samspel-block-iron-1-rir-0')
 const merged=mergeCompositeSamspelResults([{id:'iron',format:'Strength'},next],full.rows)
 assert.equal(merged[0].format,'Strength');assert.deepEqual(merged[1],next)
 const imported=prepareLibraryWodPart({id:'w',name:'Iron',format:'Strength',timer_settings:{workout_schema:{samspel:part.samspel,items:[item],duration_seconds:720}}},{id:'iron'})
 assert.equal(imported.block.samspel.planned_sets,3)
 assert.equal(equivalentLibraryWodSource(imported.block),null)
})


import {youGoIGoConfig} from '../src/lib/samspel.js'
test('composite relay counts actual rounds, not swaps, and separates incomplete time',()=>{
 const next={id:'next',format:'Eigen økt',minutes:3}
 const items=[{block_id:'relay',exercise_name:'Push-up'},{block_id:'next',exercise_name:'Stretch'}]
 for(let count=2;count<=8;count++){
  const part={id:'relay',title:'You Go I Go',format:'AMRAP',minutes:10,scoreMode:'none',samspel:{...youGoIGoConfig(),participant_count:count},items:[items[0]]}
  assert.equal(validateCompositeBlocks([part,next],items),'')
  assert.equal(compositeSamspelConfig({...part,format:'EMOM'}),null)
  const timer=compositeTimerConfig(part).timerSettings.workout_schema
  assert.equal(timer.wod_engine.collaboration,'you_go_i_go')
  assert.equal(timer.wod_engine.participant_count,count)
  const participants=Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{rounds:'2',reps:'3'}]))
  const score={'samspel:relay':{participants}}
  const full=compositeSamspelResults([part,next],score,{0:{elapsed:600,samspel_swaps:[20,50,650]}})
  assert.equal(full.issue,null)
  assert.equal(full.rows[0].completed,true)
  assert.equal(full.rows[0].relay_rounds,count*2)
  assert.deepEqual(full.rows[0].samspel.manual_swaps,[20,50])
  assert.equal(full.rows[0].samspel.participant_results[0].extra_reps,3)
  assert.equal(compositeSamspelResults([part,next],score,{0:{elapsed:200}}).rows[0].completed,false)
  assert.ok(compositeSamspelResults([part,next],score,{}).issue)
  assert.ok(compositeSamspelResults([part,next],{}, {},true).issue)
  assert.equal(compositeSamspelResults([part,next],score,{},true).rows[0].completed,false)
  const manual=compositeSamspelResults([part,next],{'samspel:relay':{participants,completed:true}}, {},true)
  assert.equal(manual.rows[0].completed,true)
  assert.equal(manual.rows[0].elapsed,null)
  assert.equal(isIndividualPerformance({result_data:{samspel_blocks:full.rows}}),false)
  const merged=mergeCompositeSamspelResults([{id:'relay',format:'AMRAP',laps:[20,30],roundsCompleted:9,extra_reps:3},next],full.rows)
  assert.equal(merged[0].format,'AMRAP')
  assert.equal(merged[0].relay_rounds,count*2)
  assert.equal(merged[0].roundsCompleted,null)
  assert.equal(merged[0].extra_reps,null)
  assert.deepEqual(merged[0].laps,[])
  assert.deepEqual(merged[1],next)
  const imported=prepareLibraryWodPart({id:'w',name:'Relay',format:'AMRAP',timer_settings:{workout_schema:{samspel:part.samspel,items:part.items,duration_seconds:600}}},{id:'relay'})
  assert.equal(imported.block.samspel.participant_count,count)
  assert.equal(equivalentLibraryWodSource(imported.block),null)
 }
})


import {teamChipperConfig} from '../src/lib/samspel.js'
import {compositeChipperTargets} from '../src/lib/compositeWod.js'
test('composite Team Chipper preserves shared targets, measured contributions and cap',()=>{
 const items=[{block_id:'chip',exercise_name:'Push-up',reps:40},{block_id:'chip',exercise_name:'Air squat',reps:60}]
 const next={id:'next',format:'Eigen økt',minutes:3}
 const all=[...items,{block_id:'next',exercise_name:'Stretch'}]
 for(let count=2;count<=8;count++){
  const raw={id:'chip',format:'Chipper',title:'Team Chipper',minutes:10,scoreMode:'none',samspel:{...teamChipperConfig(),participant_count:count},items}
  const part=compositeChipperTargets(raw,all)
  assert.deepEqual(part.samspel.targets,[{exercise_name:'Push-up',target_reps:40},{exercise_name:'Air squat',target_reps:60}])
  assert.equal(validateCompositeBlocks([part,next],all),'')
  assert.ok(validateCompositeBlocks([part,next],[...all,{block_id:'chip',is_rest:true,exercise_name:'Pause'}]))
  assert.equal(compositeSamspelConfig({...part,format:'AMRAP'}),null)
  assert.equal(compositeSamspelConfig(compositeChipperTargets(raw,[{...items[0],repsMode:'amrap'},items[1]])),null)
  const timer=compositeTimerConfig(part).timerSettings.workout_schema
  assert.equal(timer.wod_engine.collaboration,'free_split')
  assert.equal(timer.wod_engine.participant_count,count)
  assert.equal(timer.time_cap_seconds,600)
  const participants=Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{'chipper-0':i<2?'20':'0','chipper-1':i<2?'30':'0'}]))
  const score={'samspel:chip':{participants}}
  const full=compositeSamspelResults([part,next],score,{0:{elapsed:200}})
  assert.equal(full.issue,null);assert.equal(full.rows[0].completed,true)
  assert.equal(full.rows[0].elapsed,200)
  assert.equal(full.rows[0].chipper_progress[1].reps,60)
  const partial={...participants,1:{...participants[1],'chipper-0':'19'}}
  const early=compositeSamspelResults([part,next],{'samspel:chip':{participants:partial}},{0:{elapsed:600}})
  assert.equal(early.rows[0].completed,false)
  assert.equal(early.rows[0].chipper_progress[0].remaining,1)
  assert.ok(compositeSamspelResults([part,next],score,{}).issue)
  assert.ok(compositeSamspelResults([part,next],score,{0:{elapsed:601}}).issue)
  assert.ok(compositeSamspelResults([part,next],score,{},true).issue)
  assert.equal(compositeSamspelResults([part,next],{'samspel:chip':{participants,timeSeconds:'300'}},{},true).rows[0].completed,true)
  assert.ok(compositeSamspelResults([part,next],{'samspel:chip':{participants:{...participants,1:{...participants[1],'chipper-0':'21'}}}},{0:{elapsed:200}}).issue)
  assert.ok(compositeSamspelResults([part,next],{'samspel:chip':{participants:{...participants,1:{...participants[1],'chipper-0':''}}}},{0:{elapsed:200}}).issue)
  assert.equal(isIndividualPerformance({result_data:{samspel_blocks:full.rows}}),false)
  const merged=mergeCompositeSamspelResults([{id:'chip',format:'Chipper',roundsCompleted:5},next],full.rows)
  assert.equal(merged[0].format,'Chipper');assert.equal(merged[0].roundsCompleted,null);assert.deepEqual(merged[1],next)
  assert.equal(merged[0].chipper_progress[0].complete,true)
  const imported=prepareLibraryWodPart({id:'w',name:'Chipper',format:'Chipper',timer_settings:{workout_schema:{samspel:part.samspel,items,duration_seconds:600}}},{id:'chip'})
  assert.deepEqual(imported.block.samspel.targets,part.samspel.targets)
  assert.equal(equivalentLibraryWodSource(imported.block),null)
 }
})
