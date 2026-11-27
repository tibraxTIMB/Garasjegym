import {synchronDisplay,synchronActionRequest} from './synchronTransport.js'

// Client adapter only: read/command must be bound to the authenticated session.
// Do not turn a stale click into a different action on a newer movement.
export function acceptSynchronSnapshot(previous,next,receivedAt,startedAt=receivedAt){
 if(!next?.view||typeof next.sessionId!=='string'||!Number.isSafeInteger(next.revision)||next.revision<0||!Number.isFinite(next.serverAt)||!Number.isFinite(receivedAt)||!Number.isFinite(startedAt)||startedAt>receivedAt)return previous
 if(previous&&(next.sessionId!==previous.snapshot.sessionId||next.revision<previous.snapshot.revision||next.serverAt<previous.snapshot.serverAt||next.participantSlot!==previous.snapshot.participantSlot||next.leader!==previous.snapshot.leader))return previous
 // Conservatively count the entire request latency as snapshot age for actions.
 return {snapshot:next,receivedAt:startedAt}
}
export function synchronControls(record,{now,online=true,busy=false}={}){
 if(!record)return null
 const display=synchronDisplay(record.snapshot,{receivedAt:record.receivedAt,now,online})
 if(!display)return null
 const {snapshot}=record,locked=display.actionsLocked||busy
 const own=display.active===snapshot.participantSlot&&snapshot.participantSlot!==null
 return {...display,actionsLocked:locked,role:!snapshot.isMember?'leader':!snapshot.joined?'invited':display.phase==='running'?(own?'work':'rest'):'waiting',
  canJoin:!locked&&snapshot.isMember&&!snapshot.joined&&display.phase==='ready',
  canStart:!locked&&display.canStart,canTakeover:!locked&&display.canTakeover,
  canIdle:!locked&&display.phase==='running'&&display.active!==null&&(own||snapshot.leader),
  canPause:!locked&&display.canPause,canResume:!locked&&display.canResume,
  canAdvance:!locked&&display.canAdvance,canFinish:!locked&&display.canFinish,
  canLoad:!locked&&display.phase==='running'&&snapshot.joined,
  canReview:!locked&&display.phase==='finished'&&!!snapshot.review,
  canApprove:!locked&&display.phase==='finished'&&!!snapshot.review?.canApprove&&!snapshot.review.approved}
}
export async function submitSynchronAction(record,type,fields,id,{read,command,now,online}){
 const controls=synchronControls(record,{now:now(),online:online()})
 const key=({join:'canJoin',start:'canStart',takeover:'canTakeover',idle:'canIdle',pause:'canPause',resume:'canResume',advance:'canAdvance',finish:'canFinish',load:'canLoad',review_update:'canReview',review_approve:'canApprove'})[type]
 if(!controls||!key||!controls[key])return {record,issue:'Handlinga er låst. Synkroniser først.'}
 let latest=record
 try{
  const start=now(),fresh=await read()
  if(fresh.issue||!fresh.snapshot)return {record,issue:fresh.issue||'Økta er ikkje tilgjengeleg.'}
  latest=acceptSynchronSnapshot(record,fresh.snapshot,now(),start)
  if(latest===record||latest.snapshot.revision!==record.snapshot.revision||latest.snapshot.view.stage!==record.snapshot.view.stage||latest.snapshot.view.phase!==record.snapshot.view.phase)return {record:latest,issue:'Økta er endra. Kontroller før nytt trykk.'}
  const current=synchronControls(latest,{now:now(),online:online()})
  if(!current?.[key])return {record:latest,issue:'Handlinga er ikkje lenger tilgjengeleg.'}
  const request=synchronActionRequest(latest.snapshot,type,fields,id)
  if(!request)return {record:latest,issue:'Handlinga er ikkje tillaten.'}
  const sent=now(),result=await command(request)
  const updated=acceptSynchronSnapshot(latest,result.snapshot,now(),sent)
  return {record:updated,issue:result.issue||(!result.snapshot?'Handlinga er ikkje stadfesta. Oppdater økta.':null)}
 }catch{return {record:latest,issue:'Mista kontakt. Kontroller økta før du prøver på nytt.',uncertain:true}}
}
