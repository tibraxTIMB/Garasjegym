import {synchronCoachCalibration,applySynchronCalibration} from './synchronCalibration.js'
import {applySynchronCommand,synchronView,synchronAssignedTime} from './synchron.js'
import {sealSynchronResults,synchronOwnReservation} from './synchronSeal.js'
import {initializeSynchronReview,synchronReviewProjection,applySynchronReview} from './synchronReview.js'

// Server-side boundary. Host must authenticate identity and atomically persist
// the session with its revision and event IDs. Never mount with browser storage.
const clone=v=>JSON.parse(JSON.stringify(v))
const allowed=new Set(['join','start','takeover','idle','pause','resume','load','advance','finish'])
const keys=new Set(['id','revision','type','memberId','loadKg','actual','abort'])
const reviewKeys=new Set(['id','revision','type','movementId','quality','value'])
function actorAllowed(s,id){return typeof id==='string'&&(s?.plan?.leaderId===id||s?.plan?.members?.includes(id))}
export function synchronClientSnapshot(state,actorId,now){
 if(!actorAllowed(state,actorId))return null
 const view=synchronView(state,actorId,now),leader=state.plan.leaderId===actorId
 const stage=state.plan.movements[state.stage],isMember=state.plan.members.includes(actorId)
 const ownOpen=view.active===actorId?(state.open?.memberId===actorId?Math.max(0,now-state.open.from):state.phase==='countdown'&&now>=state.startAt?now-state.startAt:0):0
 const movements=state.plan.movements.map(m=>({id:m.id,exerciseId:m.exerciseId,name:m.name||m.exerciseId,unit:m.unit,target:m.target,method:m.method}))
 return clone({sessionId:state.plan.id,revision:state.revision,serverAt:now,title:state.plan.title||'Samspel',leader,isMember,
  participantSlot:isMember?state.plan.members.indexOf(actorId)+1:null,joined:state.joined.includes(actorId),joinedCount:state.joined.length,participantCount:state.plan.members.length,
  view:{...view,active:view.active===null?null:state.plan.members.indexOf(view.active)+1},movements,ownDose:isMember?{variant:state.currentDoses[state.stage][actorId].variant,loadKg:state.currentDoses[state.stage][actorId].loadKg}:null,
  ownAssignedSeconds:isMember?synchronAssignedTime(state,stage.id,actorId)+ownOpen/1000:null,
  review:synchronReviewProjection(state,actorId),
  totals:Object.fromEntries(Object.entries(state.totals).map(([id,t])=>[id,{unit:t.unit,actual:t.actual}])),
  ...(leader?{calibration:synchronCoachCalibration(state,actorId),participants:state.plan.members.map((id,i)=>({id,slot:i+1,joined:state.joined.includes(id)}))}:{})})
}
export function synchronActionRequest(snapshot,type,fields={},id){
 if(!snapshot||typeof id!=='string'||!id)return null
 if(type==='calibration_record'){
  if(!snapshot.leader||snapshot.calibration?.sealed!==false||Object.keys(fields).some(k=>!['segmentIndex','amount','attested'].includes(k))||!snapshot.calibration.rows.some(r=>r.segmentIndex===fields.segmentIndex)||fields.attested!==true||!Number.isSafeInteger(fields.amount)||fields.amount<0||fields.amount>100000)return null
  return {id,revision:snapshot.revision,type,...fields}
 }
 if(type==='review_update'||type==='review_approve'){
  if(snapshot.view.phase!=='finished'||!snapshot.review||snapshot.review.sealed)return null
  if(type==='review_approve')return snapshot.review.canApprove&&!snapshot.review.approved&&!Object.keys(fields).length?{id,revision:snapshot.revision,type}:null
  if(Object.keys(fields).some(k=>!['movementId','quality','value'].includes(k))||!snapshot.review.rows.some(r=>r.movementId===fields.movementId)||!['confirmed','estimated','unknown'].includes(fields.quality)||(fields.quality==='unknown'?fields.value!==null:!Number.isSafeInteger(fields.value)||fields.value<0||fields.value>100000))return null
  return {id,revision:snapshot.revision,type,...fields}
 }
 if(!allowed.has(type)||Object.keys(fields).some(k=>!['memberId','loadKg','actual','abort'].includes(k)))return null
 const v=snapshot.view
 const permitted=type==='join'?snapshot.isMember&&!snapshot.joined&&v.phase==='ready':
  type==='start'?v.canStart:type==='takeover'?v.canTakeover||snapshot.leader&&v.phase==='running'&&typeof fields.memberId==='string':
  type==='idle'?v.phase==='running'&&v.active!==null&&(snapshot.leader||v.active===snapshot.participantSlot):
  type==='pause'?v.canPause:type==='resume'?v.canResume:type==='advance'?v.canAdvance:
  type==='finish'?v.canFinish:type==='load'?v.phase==='running'&&(snapshot.joined||snapshot.leader):false
 return permitted?{id,revision:snapshot.revision,type,...fields}:null
}
export function createSynchronGateway({authenticate,read,compareAndSwap,now,readCalibrations=async()=>[],reservation=null}){
 if([authenticate,read,compareAndSwap,now].some(fn=>typeof fn!=='function'))throw Error('Synchron krev autentisering, lagring og serverklokke.')
 const denied=()=>({issue:'Ingen tilgang til økta.'})
 async function snapshot(sessionId,credential){
  const actorId=await authenticate(credential),s=await read(sessionId)
  return actorAllowed(s,actorId)&&s.plan.id===sessionId?{snapshot:synchronClientSnapshot(s,actorId,now())}:denied()
 }
 async function command(sessionId,credential,cmd){
  const actorId=await authenticate(credential),state=await read(sessionId)
  if(!actorAllowed(state,actorId)||state.plan.id!==sessionId)return denied()
  const calibrating=cmd?.type==='calibration_record'
  const reviewing=['review_update','review_approve'].includes(cmd?.type)
  if(!cmd||typeof cmd!=='object'||Array.isArray(cmd)||(calibrating?Object.keys(cmd).some(k=>!['id','revision','type','segmentIndex','amount','attested'].includes(k)):reviewing?Object.keys(cmd).some(k=>!reviewKeys.has(k))||cmd.type==='review_approve'&&Object.keys(cmd).some(k=>!['id','revision','type'].includes(k)):!allowed.has(cmd.type)||Object.keys(cmd).some(k=>!keys.has(k))||state.plan.leaderId!==actorId&&Object.hasOwn(cmd,'memberId')))return {issue:'Ugyldig handling.'}
  const at=now(),result=calibrating?applySynchronCalibration(state,cmd,{actorId,at}):reviewing?applySynchronReview(state,cmd,{actorId,at}):applySynchronCommand(state,cmd,{actorId,at})
  if(result.issue)return {issue:result.issue,snapshot:synchronClientSnapshot(state,actorId,at)}
  if(result.duplicate)return {duplicate:true,snapshot:synchronClientSnapshot(state,actorId,at)}
  const next=result.state.phase==='finished'&&!result.state.review?initializeSynchronReview(result.state,await readCalibrations(result.state.plan)):result.state
  if(!await compareAndSwap(sessionId,state.revision,next)){
   const latest=await read(sessionId)
   if(!actorAllowed(latest,actorId)||latest.plan.id!==sessionId)return denied()
   return {issue:'Økta er endra. Synkroniser først.',snapshot:synchronClientSnapshot(latest,actorId,now())}
  }
  return {snapshot:synchronClientSnapshot(next,actorId,at)}
 }
 // Optional trusted host capability. No client supplies dates, tokens or actor IDs.
 async function reserve(sessionId,credential,expectedRevision){
  if(!reservation||typeof reservation.workoutDate!=='function'||typeof reservation.tokenForMember!=='function')return {issue:'Permanent lagring er ikkje aktivert.'}
  const actorId=await authenticate(credential),state=await read(sessionId)
  if(!actorAllowed(state,actorId)||state.plan.id!==sessionId||!state.plan.members.includes(actorId))return denied()
  if(state.seal)return {reservation:synchronOwnReservation(state,actorId)}
  const result=sealSynchronResults(state,{expectedRevision,at:now(),workoutDate:reservation.workoutDate(state),tokenForMember:memberId=>reservation.tokenForMember(state,memberId)})
  if(result.issue)return {issue:result.issue}
  if(!await compareAndSwap(sessionId,state.revision,result.state)){
   const latest=await read(sessionId)
   if(!actorAllowed(latest,actorId)||latest.plan.id!==sessionId)return denied()
   return latest.seal?{reservation:synchronOwnReservation(latest,actorId)}:{issue:'Resultatet er endra. Oppdater først.'}
  }
  return {reservation:synchronOwnReservation(result.state,actorId)}
 }
 return {snapshot,command,reserve}
}

// Project a recently received snapshot using a monotonic client clock, never
// the device's wall clock. A displayed countdown can expire without granting
// any new action; fresh server state is required at the boundary.
export function synchronDisplay(snapshot,{receivedAt,now,online=true,maxAgeMs=5000}={}){
 if(!snapshot?.view||!Number.isFinite(receivedAt)||!Number.isFinite(now)||now<receivedAt||!Number.isFinite(maxAgeMs)||maxAgeMs<=0)return null
 const age=now-receivedAt,seconds=Math.floor(age/1000),view=snapshot.view
 const stale=!online||age>maxAgeMs
 const countdown=view.phase==='countdown'?Math.max(0,view.countdown-seconds):0
 const waitingForStart=view.phase==='countdown'&&countdown===0
 const elapsed=view.phase==='running'?view.elapsed+seconds:waitingForStart?Math.max(0,seconds-view.countdown):view.elapsed
 const locked=stale||waitingForStart
 return {...view,countdown,elapsed,stale,waitingForStart,actionsLocked:locked,
  canStart:!locked&&view.canStart,canTakeover:!locked&&view.canTakeover,
  canPause:!locked&&view.canPause,canResume:!locked&&view.canResume,
  canAdvance:!locked&&view.canAdvance,canFinish:!locked&&view.canFinish}
}
