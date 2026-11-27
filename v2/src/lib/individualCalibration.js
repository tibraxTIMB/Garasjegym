import {isIndividualPerformance} from './performanceEvidence.js'
import {synchronObservationIssue} from './synchronPace.js'
const id=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=128&&!['__proto__','prototype','constructor'].includes(x)
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x)
const only=(x,keys)=>Object.keys(x).every(k=>keys.includes(k))
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const deny=()=>({issue:'Ingen tilgang til delt individuelt PT-resultat.'})
// The host resolves the assignment/program reference through the existing
// sharing boundary, never from a client-supplied member or workout ID.
export function individualCalibrationRequestIssue(req){
 if(!obj(req)||!only(req,['requestId','assignmentId','programSessionId','exerciseIndex','exerciseName','variant','loadKg','unit','amount','seconds','attested'])||!uuid.test(req.requestId||'')||!((id(req.assignmentId)&&req.programSessionId===null)||(id(req.programSessionId)&&req.assignmentId===null))||!Number.isSafeInteger(req.exerciseIndex)||req.exerciseIndex<0||req.exerciseIndex>99||!id(req.exerciseName)||!id(req.variant)||!Object.hasOwn(req,'loadKg')||req.loadKg!==null&&(!Number.isFinite(req.loadKg)||req.loadKg<0)||!['reps','meters','calories'].includes(req.unit)||!Number.isSafeInteger(req.amount)||req.amount<0||req.amount>100000||!Number.isFinite(req.seconds)||req.seconds<5||req.seconds>3600||req.attested!==true)return 'Stadfest ein faktisk observert første arbeidsbolk med mengd, tid og dosering.'
 return null
}
// No amount, duration or variation is inferred from a planned WOD or a
// historical set. Coach attests the measured count/delta, assigned interval,
// variant, load and first-bolk context. Existing result is an identity anchor.
export function prepareIndividualCalibration(shared,req,{actorId,at}={}){
 const issue=individualCalibrationRequestIssue(req);if(issue)return {issue}
 if(!id(actorId)||!id(shared?.memberId)||actorId===shared.memberId||!id(shared.workoutId)||shared.result?.result_data?.participation_verified!=='individual'||!isIndividualPerformance(shared.result)||!Number.isSafeInteger(shared.finishedAt)||shared.finishedAt<0||!Number.isSafeInteger(at)||at<shared.finishedAt||!id(shared.evidenceRevision))return deny()
 const snapshots=shared.result.result_data.exercise_results
 const snap=Array.isArray(snapshots)?snapshots[req.exerciseIndex]:null
 // Host supplies a uniquely linked stored exercise, not a catalogue-name guess.
 const matches=Array.isArray(shared.exercises)?shared.exercises.filter(e=>e.index===req.exerciseIndex):[]
 const ex=matches[0]
 if(!snap||matches.length!==1||!id(ex.exerciseId)||!id(ex.exerciseName)||ex.exerciseName!==snap.exercise_name||ex.exerciseName!==req.exerciseName||snap.is_complex||snap.side_mode&&snap.side_mode!=='none'||!Array.isArray(ex.allowedUnits)||!ex.allowedUnits.includes(req.unit))return {issue:'Øvinga eller måleeininga er ikkje eintydig identifisert.'}
 const row={version:1,source:'observed',evidence:req.unit==='reps'?'counted':'machine',observationId:'individual-'+req.exerciseIndex,sessionId:shared.workoutId,memberId:shared.memberId,exerciseId:ex.exerciseId,variant:req.variant,loadKg:req.loadKg,unit:req.unit,observedAt:at,amount:req.amount,assignedSeconds:req.seconds,previousWorkSeconds:0,restSeconds:null}
 if(synchronObservationIssue(row))return {issue:'Ugyldig observasjon.'}
 return {candidate:{row,observerId:actorId,evidenceRevision:shared.evidenceRevision,requestId:req.requestId,fingerprint:JSON.stringify([actorId,shared.workoutId,shared.evidenceRevision,req.exerciseIndex,req.exerciseName,req.variant,req.loadKg,req.unit,req.amount,req.seconds,req.attested]),reference:{assignmentId:req.assignmentId,programSessionId:req.programSessionId}}}
}
export function createIndividualCalibrationGateway({authenticate,readCoachContext,readSharedCalibrationResult,saveCalibrationAtomic,now}={}){
 if([authenticate,readCoachContext,readSharedCalibrationResult,saveCalibrationAtomic,now].some(fn=>typeof fn!=='function'))return null
 return async (credential,request)=>{
  const issue=individualCalibrationRequestIssue(request);if(issue)return {issue}
  const actorId=await authenticate(credential)
  if(!id(actorId))return deny()
  const ctx=await readCoachContext(actorId)
  if(ctx?.canCoach!==true||!Array.isArray(ctx.eligibleMemberIds))return deny()
  const shared=await readSharedCalibrationResult(actorId,{assignmentId:request.assignmentId,programSessionId:request.programSessionId})
  if(!ctx.eligibleMemberIds.includes(shared?.memberId))return deny()
  const prepared=prepareIndividualCalibration(shared,request,{actorId,at:now()})
  if(prepared.issue)return prepared
  // Atomic host checks live coach/share access and evidence revision again;
  // unique (workout, exercise index), stable request ID, exact fingerprint retry only.
  // Retain the first accepted observedAt on retries; do not compare regenerated timestamps.
  // Never overwrite a different observation or modify the training log here.
  const receipt=await saveCalibrationAtomic(prepared.candidate)
  return receipt?.accepted===true?{accepted:true,duplicate:receipt.duplicate===true}: {issue:'Observasjonen er ikkje lagra. Kontroller grunnlaget eller prøv same førespurnad att.'}
 }
}
