import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deathByConfig,deathByTimerState} from '../src/lib/deathBy.js'
import {compositeTimerConfig,validateCompositeBlocks} from '../src/lib/compositeWod.js'
import {scoreForWodFormat} from '../src/lib/wodEngine.js'
import {secondsToTimerBoundary} from '../src/lib/timerCues.js'
import {deriveBenchmarkRecords} from '../src/lib/prMetrics.js'

test('Death By defaults to one rep and adds one rep every 60 seconds',()=>{
 assert.deepEqual(deathByConfig(),{intervalSeconds:60,start:1,step:1})
 const first=deathByTimerState(0,0)
 assert.deepEqual([first.round,first.targetReps,first.secondsLeft,first.canConfirm],[1,1,60,true])
 const afterConfirm=deathByTimerState(59,1)
 assert.deepEqual([afterConfirm.roundConfirmed,afterConfirm.secondsLeft,afterConfirm.failed],[true,1,false])
 const second=deathByTimerState(60,1)
 assert.deepEqual([second.round,second.targetReps,second.secondsLeft,second.canConfirm],[2,2,60,true])
})

test('after 19 successes, failing minute 20 stops with 19 completed rounds',()=>{
 const round20=deathByTimerState(19*60,19)
 assert.equal(round20.round,20)
 assert.equal(round20.targetReps,20)
 assert.equal(round20.secondsLeft,60)
 assert.equal(round20.failed,false)
 const finished=deathByTimerState(20*60,19)
 assert.equal(finished.failed,true)
 assert.equal(finished.failedRound,20)
 assert.equal(finished.completedRounds,19)
 assert.equal(finished.failureAt,1200)
 assert.equal(finished.secondsLeft,0)
})

test('round 20 completed on time advances to round 21; missing round one fails',()=>{
 assert.deepEqual([deathByTimerState(1200,20).round,deathByTimerState(1200,20).failed],[21,false])
 assert.deepEqual([deathByTimerState(60,0).failedRound,deathByTimerState(60,0).completedRounds],[1,0])
})

test('custom 75-second and 90-second rounds, start and steps remain accurate',()=>{
 const config={interval_seconds:75,start:2,step:3}
 const first=deathByTimerState(0,0,config)
 assert.deepEqual([first.targetReps,first.secondsLeft],[2,75])
 const second=deathByTimerState(75,1,config)
 assert.deepEqual([second.targetReps,second.secondsLeft],[5,75])
 const failed=deathByTimerState(150,1,config)
 assert.deepEqual([failed.failedRound,failed.completedRounds],[2,1])
 assert.equal(secondsToTimerBoundary({format:'Death By',elapsed:73,remainingTotal:2000,isDeathBy:true,deathByIntervalSeconds:75}),2)
 assert.equal(secondsToTimerBoundary({format:'Death By',elapsed:90,remainingTotal:2000,isDeathBy:true,deathByIntervalSeconds:90}),90)
})

test('jumped wall time clamps to the earliest unfinished round deadline',()=>{
 const late=deathByTimerState(700,3,{interval_seconds:60})
 assert.deepEqual([late.failed,late.failedRound,late.failureAt],[true,4,240])
})

test('Death By is scored as completed rounds, not a For Time result',()=>{
 assert.deepEqual(scoreForWodFormat('Death By'),{type:'rounds_reps',fields:['rounds_reps']})
 const logs=[
  {id:'a',source_wod_id:'deathby-1',format:'Death By',score_rounds:19,result_data:{prescription_level:'rx'}},
  {id:'b',source_wod_id:'deathby-1',format:'Death By',score_rounds:17,result_data:{prescription_level:'rx'}}
 ]
 assert.equal(deriveBenchmarkRecords(logs).length,0)
 const [best]=deriveBenchmarkRecords(logs,['deathby-1'])
 assert.equal(best.score.rounds,19)
 assert.equal(best.logId,'a')
})

test('a composite Death By block keeps its distinct interval and round score',()=>{
 const block={id:'a',title:'Death By burpees',format:'Death By',minutes:25,deathByIntervalSeconds:75,ladderStart:1,ladderStep:1,items:[{exercise_name:'Burpee'}]}
 const settings=compositeTimerConfig(block)
 assert.equal(settings.timerSettings.workout_schema.ladder.interval_seconds,75)
 assert.equal(settings.timerSettings.workout_schema.ladder.start,1)
 assert.equal(settings.timerSettings.workout_schema.time_cap_seconds,1500)
 assert.equal(validateCompositeBlocks([block,{id:'b',format:'AMRAP',minutes:8}],[
  {block_id:'a',exercise_name:'Burpee'},{block_id:'b',exercise_name:'Push-up'}
 ]),'')
 const compositeLog={id:'1',source_wod_id:'composite',format:'Samansett økt',result_data:{prescription_level:'rx',block_summary:[{id:'a',title:'Death By burpees',format:'Death By',completed:true,roundsCompleted:19,death_by_completed_rounds:19,death_by_failed_round:20,elapsed:1500}]}}
 const records=deriveBenchmarkRecords([compositeLog],['composite'])
 assert.deepEqual([records.length,records[0].score.rounds],[1,19])
})

test('timer and builder use one explicit per-round confirmation path',()=>{
 const training=readFileSync(new URL('../src/components/Training.jsx',import.meta.url),'utf8')
 const builder=readFileSync(new URL('../src/components/WodBuilder.jsx',import.meta.url),'utf8')
 assert.match(training,/completeDeathByRound/)
 assert.match(training,/deathByStatus\.failed/)
 assert.match(training,/death_by_completed_rounds/)
 assert.match(builder,/deathByIntervalMin/)
 assert.match(builder,/deathByIntervalSec/)
 assert.match(builder,/interval_seconds:Number\(deathByIntervalMin\)\*60/)
})
