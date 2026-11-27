import assert from 'node:assert/strict'
import {createSynchronSession,applySynchronCommand} from '../src/lib/synchron.js'
import {initializeSynchronReview,applySynchronReview,synchronReviewProjection} from '../src/lib/synchronReview.js'
import {applySynchronCalibration,synchronCalibrationExport} from '../src/lib/synchronCalibration.js'
import {sealSynchronResults,synchronOwnReservation} from '../src/lib/synchronSeal.js'
import {synchronObservedExposure,synchronAnatomyRows,synchronHistoryExposure,validateSynchronExposure} from '../src/lib/synchronAnatomy.js'
import {summarizeMuscleExposure,workoutAnatomyExercises} from '../src/lib/anatomicalIntelligence.js'
import {isIndividualPerformance} from '../src/lib/performanceEvidence.js'
const plan={id:'anatomy',leaderId:'pt',members:['a','b'],movements:[{id:'sq',exerciseId:'sq',name:'Air squat',unit:'reps',target:40,method:'estimate',collaboration:'relay',doses:{a:{variant:'standard',loadKg:null},b:{variant:'standard',loadKg:null}}}]}
let s=createSynchronSession(plan),n=0
function act(type,actorId,at,fields={}){const fn=type.startsWith('review_')?applySynchronReview:type==='calibration_record'?applySynchronCalibration:applySynchronCommand;const r=fn(s,{id:'e'+(++n),revision:s.revision,type,...fields},{actorId,at});assert.equal(r.issue,null);s=r.state}
act('join','a',0);act('join','b',0);act('start','pt',0,{memberId:'a'});act('takeover','b',40000);act('finish','pt',70000,{actual:40})
s=initializeSynchronReview(s)
assert.deepEqual(synchronObservedExposure(s,'a'),[])
act('calibration_record','pt',71000,{segmentIndex:0,amount:20,attested:true})
act('calibration_record','pt',72000,{segmentIndex:1,amount:20,attested:true})
assert.deepEqual(synchronObservedExposure(s,'a'),[])
act('review_update','a',73000,{movementId:'sq',quality:'confirmed',value:20})
act('review_update','b',74000,{movementId:'sq',quality:'estimated',value:20})
act('review_approve','a',75000);act('review_approve','b',76000)
const own=synchronObservedExposure(s,'a')
assert.equal(own.length,1);assert.equal(own[0].amount,20);assert.equal(own[0].observationId,'segment-0')
assert.equal(synchronObservedExposure(s,'b')[0].observationId,'segment-1')
assert.deepEqual(synchronObservedExposure(s,'pt'),[])
assert.deepEqual(synchronReviewProjection(s,'a').observedExposure,own)
assert.equal(JSON.stringify(own).includes('memberId'),false)
assert.equal(JSON.stringify(own).includes('observerId'),false)
assert.equal(summarizeMuscleExposure(synchronAnatomyRows(own)).roles.quadriceps.primary,1)
assert.equal(summarizeMuscleExposure(synchronAnatomyRows(own)).classifiedSets,1)
assert.deepEqual(synchronAnatomyRows([{...own[0],amount:0}]),[])
assert.deepEqual(synchronAnatomyRows([{...own[0],evidence:'estimated'}]),[])
assert.deepEqual(validateSynchronExposure([own[0],own[0]]),[])
assert.deepEqual(synchronCalibrationExport(s),[])
const clone=()=>JSON.parse(JSON.stringify(s))
let bad=clone();bad.calibration[0].row.amount=21;assert.deepEqual(synchronObservedExposure(bad,'a'),[])
bad=clone();bad.calibration[0].row.memberId='b';assert.deepEqual(synchronObservedExposure(bad,'a'),[])
bad=clone();bad.calibration.push(bad.calibration[0]);assert.deepEqual(synchronObservedExposure(bad,'a'),[])
bad=clone();bad.review.movements[0].rows[0].input.value=19;assert.deepEqual(synchronObservedExposure(bad,'b'),[])
bad=clone();bad.events=bad.events.filter(e=>e.type!=='calibration_record');assert.deepEqual(synchronObservedExposure(bad,'a'),[])
const seal=sealSynchronResults(s,{expectedRevision:s.revision,at:77000,workoutDate:'2026-11-27',tokenForMember:id=>id==='a'?'12345678-1234-4234-8234-123456789012':'22345678-1234-4234-8234-123456789012'})
assert.equal(seal.issue,null);s=seal.state
const log=synchronOwnReservation(s,'a').payload
assert.deepEqual(synchronHistoryExposure(log),own)
assert.deepEqual(workoutAnatomyExercises(log),[])
assert.equal(isIndividualPerformance(log),false)
assert.deepEqual(log.exercises,[])
assert.equal(synchronCalibrationExport(s).length,2)
assert.deepEqual(synchronHistoryExposure({result_data:{synchron_result:{version:1,approved:true,rows:[]}}}),[])
const edited=JSON.parse(JSON.stringify(log));edited.result_data.synchron_result.observed_exposure.rows[0].movementId='other'
assert.deepEqual(synchronHistoryExposure(edited),[])
