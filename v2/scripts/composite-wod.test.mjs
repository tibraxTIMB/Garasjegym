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
