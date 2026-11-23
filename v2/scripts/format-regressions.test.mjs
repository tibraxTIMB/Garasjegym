import test from 'node:test'
import assert from 'node:assert/strict'
import {isEmomFormat,emomIntervalSeconds,emomDisplayLabel,emomPrescribedSetCount,scoreForWodFormat} from '../src/lib/wodEngine.js'
import {defaultCompositeBlocks,compositeBlockForTimer,compositeTimerConfig,validateCompositeBlocks,plannedFixedEmomSets,compositeScoredBlocks} from '../src/lib/compositeWod.js'
import {deathByTimerState} from '../src/lib/deathBy.js'
import {ladderStatus} from '../src/lib/ladder.js'
import {getFixedSlotTimerState} from '../src/lib/timerClock.js'
import {secondsToTimerBoundary} from '../src/lib/timerCues.js'
import {deriveBenchmarkRecords} from '../src/lib/prMetrics.js'

test('one EMOM engine supports old E3MOM, 75 seconds and planned interval rotations',()=>{
 assert.equal(isEmomFormat('EMOM'),true)
 assert.equal(isEmomFormat('E3MOM'),true)
 assert.equal(emomIntervalSeconds('E3MOM'),180)
 assert.equal(emomIntervalSeconds('EMOM',{work_every_seconds:75}),75)
 assert.equal(emomDisplayLabel(75),'EMOM · 1:15')
 assert.equal(emomPrescribedSetCount({format:'EMOM',interval:{work_every_seconds:75},durationSeconds:600,minuteSlot:'1,2,5,8'}),4)
 assert.equal(emomPrescribedSetCount({format:'EMOM',interval:{work_every_seconds:60},durationSeconds:600,exerciseIndex:0,exerciseCount:2}),5)
 assert.equal(emomPrescribedSetCount({format:'EMOM',interval:{work_every_seconds:60},durationSeconds:600,exerciseIndex:1,exerciseCount:2}),5)
})

test('new composite EMOM uses three 180-second intervals; legacy E3MOM still loads',()=>{
 const blocks=defaultCompositeBlocks()
 assert.equal(blocks[0].format,'EMOM')
 assert.equal(blocks[0].emomIntervalSeconds,180)
 const plan=plannedFixedEmomSets({block_id:'a',reps:5,levels:{rx:{reps:'5'}}},blocks,'rx',false)
 assert.deepEqual([plan.autoFill,plan.reps,plan.sets.length],[true,5,3])
 const legacy=compositeBlockForTimer({id:'a',format:'E3MOM',minutes:9,items:[{exercise_name:'Strict press'},{exercise_name:'Push press'}]})
 assert.deepEqual(legacy.items.map(i=>i.minute_slot),['1,2,3','1,2,3'])
 const schema=compositeTimerConfig({...blocks[0],items:[{exercise_name:'Strict press'}]}).timerSettings.workout_schema
 assert.equal(schema.interval.work_every_seconds,180)
 assert.equal(validateCompositeBlocks(blocks,[{block_id:'a',exercise_name:'Strict press'},{block_id:'b',exercise_name:'Burpee'}]),'')
})

test('Death By is independent of Ladder; the 20th 60-second round fails after 19 successes',()=>{
 const active=deathByTimerState(1140,19)
 assert.deepEqual([active.round,active.targetReps,active.secondsLeft,active.failed],[20,20,60,false])
 const failed=deathByTimerState(1200,19)
 assert.deepEqual([failed.failed,failed.failedRound,failed.completedRounds,failed.secondsLeft],[true,20,19,0])
 const next=deathByTimerState(1200,20)
 assert.deepEqual([next.failed,next.round,next.targetReps],[false,21,21])
 assert.equal(secondsToTimerBoundary({format:'Death By',elapsed:72,remainingTotal:1200,isDeathBy:true,deathByIntervalSeconds:75}),3)
})

test('Ladder advances only when a round is confirmed and records partial work separately',()=>{
 const props={start:2,step:2,direction:'up'}
 assert.deepEqual([ladderStatus(0,props,5).currentRound,ladderStatus(0,props,5).targetReps],[1,2])
 assert.deepEqual([ladderStatus(2,props,5).currentRound,ladderStatus(2,props,5).targetReps],[3,6])
 assert.equal(ladderStatus(5,props,5).finished,true)
 assert.equal(ladderStatus(1,{start:4,step:2,direction:'down'},5).targetReps,2)
 assert.equal(ladderStatus(2,{start:4,step:2,direction:'down'},5).finished,true)
 assert.equal(scoreForWodFormat('Ladder').type,'time')
 assert.equal(scoreForWodFormat('Death By').type,'rounds_reps')
})

test('For Time and Couplets use appropriate score modes, respecting time caps',()=>{
 assert.equal(scoreForWodFormat('For Time').type,'time')
 assert.equal(scoreForWodFormat('Couplet','AMRAP').type,'rounds_reps')
 assert.equal(scoreForWodFormat('Triplet','For Time').type,'time')
 const logs=[
  {id:'a',source_wod_id:'couplet',format:'Couplet',score_rounds:4,score_reps:3,result_data:{combination_mode:'AMRAP',prescription_level:'rx'}},
  {id:'b',source_wod_id:'couplet',format:'Couplet',score_rounds:5,score_reps:1,result_data:{combination_mode:'AMRAP',prescription_level:'rx'}},
  {id:'c',source_wod_id:'triplet',format:'Triplet',score_time_seconds:300,result_data:{combination_mode:'For Time',prescription_level:'rx'}},
  {id:'d',source_wod_id:'triplet',format:'Triplet',score_time_seconds:250,result_data:{combination_mode:'For Time',prescription_level:'rx',time_cap_reached:true}},
  {id:'e',source_wod_id:'ladder',format:'Ladder',score_time_seconds:null,result_data:{prescription_level:'rx',completed:false}},
 ]
 assert.equal(deriveBenchmarkRecords(logs).length,0)
 const records=deriveBenchmarkRecords(logs,['couplet','triplet','ladder'])
 assert.equal(records.find(x=>x.format==='couplet').logId,'b')
 assert.equal(records.find(x=>x.format==='triplet').logId,'c')
 assert.equal(records.some(x=>x.format==='ladder'),false)
})

test('Tabata, timed intervals and station circuits end after the last work slot',()=>{
 const tabata=getFixedSlotTimerState({elapsed:230,workSeconds:20,restSeconds:10,rounds:8,slotsPerRound:1})
 assert.deepEqual([tabata.totalSeconds,tabata.roundsCompleted,tabata.isComplete],[230,8,true])
 const stations=getFixedSlotTimerState({elapsed:705,workSeconds:45,restSeconds:15,rounds:3,slotsPerRound:4})
 assert.deepEqual([stations.totalSeconds,stations.roundsCompleted,stations.isComplete],[705,3,true])
 assert.equal(secondsToTimerBoundary({format:'AMRAP',elapsed:597,remainingTotal:3,isCountdown:true}),3)
 assert.equal(secondsToTimerBoundary({format:'For Time',elapsed:597,remainingTotal:3,hasTimeCap:true}),3)
})

test('composite result corrections stay specific to Death By and Ladder, not AMRAP',()=>{
 const blocks=[
  {id:'a',format:'Death By',death_by_completed_rounds:19,roundsCompleted:19,completed:true},
  {id:'b',format:'Ladder',ladder_completed_rounds:3,roundsCompleted:3,completed:true},
  {id:'c',format:'AMRAP',roundsCompleted:4,extra_reps:7,completed:true},
 ]
 const result=compositeScoredBlocks(blocks,{a:{rounds:'20'},b:{rounds:'4'},c:{rounds:'5',extraReps:'2'}})
 assert.equal(result[0].death_by_completed_rounds,20)
 assert.equal(result[1].ladder_completed_rounds,4)
 assert.deepEqual([result[2].roundsCompleted,result[2].extra_reps],[5,2])
})
