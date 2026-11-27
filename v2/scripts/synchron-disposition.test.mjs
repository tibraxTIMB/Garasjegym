import assert from 'node:assert/strict'
import {createSynchronSession,applySynchronCommand} from '../src/lib/synchron.js'
import {initializeSynchronReview,applySynchronReview,synchronReviewProjection} from '../src/lib/synchronReview.js'
import {applySynchronCalibration} from '../src/lib/synchronCalibration.js'
import {sealSynchronResults,synchronOwnReservation} from '../src/lib/synchronSeal.js'
import {synchronWorkTimeline,validateSynchronTimeline,summarizeSynchronTimeline,synchronHistoryTimeline} from '../src/lib/synchronDisposition.js'
import {isIndividualPerformance} from '../src/lib/performanceEvidence.js'
const plan={id:'disposition',leaderId:'pt',members:['a','b'],movements:[{id:'sq',exerciseId:'sq',name:'Air squat',unit:'reps',target:50,method:'estimate',collaboration:'relay',doses:{a:{variant:'standard',loadKg:null},b:{variant:'standard',loadKg:null}}}]}
let s=createSynchronSession(plan),n=0
function act(type,actorId,at,fields={}){const fn=type.startsWith('review_')?applySynchronReview:type==='calibration_record'?applySynchronCalibration:applySynchronCommand;const r=fn(s,{id:'e'+(++n),revision:s.revision,type,...fields},{actorId,at});assert.equal(r.issue,null);s=r.state}
act('join','a',0);act('join','b',0);act('start','pt',0,{memberId:'a'});act('takeover','b',40000);act('takeover','a',70000);act('finish','pt',100000,{actual:50})
s=initializeSynchronReview(s)
assert.deepEqual(synchronWorkTimeline(s,'pt'),[])
let rows=synchronWorkTimeline(s,'a')
assert.equal(rows.length,2);assert.equal(rows[0].fromMs,0);assert.equal(rows[1].fromMs,60000);assert.equal(rows[0].observed,null)
assert.equal(summarizeSynchronTimeline(rows).assignedSeconds,60)
assert.equal(summarizeSynchronTimeline(rows).gapSeconds,30)
assert.equal(summarizeSynchronTimeline(rows).comparisonCount,0)
act('calibration_record','pt',101000,{segmentIndex:0,amount:20,attested:true})
act('calibration_record','pt',102000,{segmentIndex:2,amount:10,attested:true})
assert.equal(synchronWorkTimeline(s,'a')[0].observed,null)
act('review_update','a',103000,{movementId:'sq',quality:'confirmed',value:30})
act('review_update','b',104000,{movementId:'sq',quality:'estimated',value:20})
act('review_approve','a',105000);act('review_approve','b',106000)
rows=synchronWorkTimeline(s,'a')
const summary=summarizeSynchronTimeline(rows)
assert.equal(summary.observedCount,2);assert.equal(summary.rows[0].pacePerMinute,40);assert.equal(summary.rows[1].pacePerMinute,20);assert.equal(summary.rows[1].changePercent,-50);assert.equal(summary.rows[1].comparedWith,1)
assert.equal(summary.rows[0].changePercent,null)
assert.equal(synchronWorkTimeline(s,'b')[0].observed,null)
assert.equal(JSON.stringify(rows).includes('memberId'),false)
assert.deepEqual(synchronReviewProjection(s,'a').workTimeline,rows)
for(const patch of [{loadKg:5},{variant:'scaled'},{durationMs:40000},{observed:null},{movementId:'other'},{unit:'meters',observed:{evidence:'machine',amount:10}}])assert.equal(summarizeSynchronTimeline([rows[0],{...rows[1],...patch}]).comparisonCount,0)
assert.equal(summarizeSynchronTimeline([rows[0],{...rows[1],observed:{evidence:'counted',amount:0}}]).rows[1].changePercent,-100)
assert.equal(summarizeSynchronTimeline([{...rows[0],observed:{evidence:'counted',amount:0}},rows[1]]).comparisonCount,0)
for(const patch of [{ordinal:1},{fromMs:20000},{durationMs:0},{observed:{amount:1,evidence:'estimated'}}])assert.deepEqual(validateSynchronTimeline([rows[0],{...rows[1],...patch}]),[])
const sealed=sealSynchronResults(s,{expectedRevision:s.revision,at:107000,workoutDate:'2026-11-27',tokenForMember:id=>id==='a'?'12345678-1234-4234-8234-123456789012':'22345678-1234-4234-8234-123456789012'})
assert.equal(sealed.issue,null);s=sealed.state
const log=synchronOwnReservation(s,'a').payload
assert.deepEqual(synchronHistoryTimeline(log),rows)
assert.equal(isIndividualPerformance(log),false)
assert.deepEqual(synchronHistoryTimeline({}),[])
const broken=JSON.parse(JSON.stringify(log));broken.result_data.synchron_result.work_timeline.rows[1].loadKg=15
assert.deepEqual(synchronHistoryTimeline(broken),[])
const wrong=JSON.parse(JSON.stringify(log));wrong.result_data.synchron_result.work_timeline.rows[1].observed.amount=21
assert.deepEqual(synchronHistoryTimeline(wrong),[])
