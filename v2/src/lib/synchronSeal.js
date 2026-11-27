import {prepareSynchronLog} from './synchronLog.js'
// Trusted server-only contract. Atomically store the sealed session and all
// reservations in one CAS. The reserved payload is immutable; no RPC is made here.
const sealClone=x=>JSON.parse(JSON.stringify(x))
export function sealSynchronResults(state,{expectedRevision,workoutDate,tokenForMember,at}={}){
 const fail=issue=>({state,issue})
 if(state?.phase!=='finished'||!state.review)return fail('Økta er ikkje ferdig.')
 if(state.seal)return {state,duplicate:true}
 if(expectedRevision!==state.revision)return fail('Resultatet er endra. Oppdater først.')
 if(!Number.isSafeInteger(at)||at<Math.max(state.lastAt,state.events.at(-1)?.at??0)||typeof tokenForMember!=='function')return fail('Ugyldig lagringsreservasjon.')
 const entries=[]
 for(const memberId of state.plan.members){
  const candidate=prepareSynchronLog(state,memberId,{expectedRevision,workoutDate,saveToken:tokenForMember(memberId)})
  if(candidate.issue)return fail(candidate.issue)
  if(entries.some(e=>e.saveToken===candidate.reservation.saveToken))return fail('Lagringstoken må vera unike.')
  entries.push({...candidate.reservation,payload:candidate.payload,receipt:null})
 }
 const next=sealClone(state)
 next.seal={version:1,reviewRevision:state.revision,at,entries}
 next.revision++
 return {state:next,issue:null}
}
// Authenticated actor may only retrieve their own reservation. Never send the
// whole seal to a client. A PT who did not train has no personal reservation.
export function synchronOwnReservation(state,memberId){
 if(!state?.seal||!state.plan.members.includes(memberId))return null
 const e=state.seal.entries.find(x=>x.memberId===memberId)
 return e?sealClone(e):null
}
// A verified server receipt is required; this is NOT proof that an RPC ran.
// Host must verify returned log ID, member, token and immutable payload.
export function recordSynchronReceipt(state,{memberId,saveToken,workoutId,expectedRevision}={}){
 const fail=issue=>({state,issue})
 const e=state?.seal?.entries.find(x=>x.memberId===memberId)
 if(!e||e.saveToken!==saveToken||typeof workoutId!=='string'||!workoutId.trim())return fail('Ugyldig lagringskvittering.')
 if(e.receipt)return e.receipt.workoutId===workoutId?{state,duplicate:true}:fail('Motstridande lagringskvittering.')
 if(expectedRevision!==state.revision)return fail('Oppdater lagringsstatus.')
 if(state.seal.entries.some(x=>x.receipt?.workoutId===workoutId))return fail('Logg-ID er alt brukt.')
 const next=sealClone(state)
 next.seal.entries.find(x=>x.memberId===memberId).receipt={workoutId}
 next.revision++
 return {state:next,issue:null}
}
