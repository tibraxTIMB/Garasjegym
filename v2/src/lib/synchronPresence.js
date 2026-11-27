import {parseSynchronInvitation} from './synchronPreparation.js'
// Local navigation guard only. Server must independently enforce one live
// session per actor across tabs/devices and discover active sessions on reload.
export function synchronPresence(entry,snapshot){
 const id=parseSynchronInvitation(entry?.href)
 if(!id)return null
 if(!snapshot||snapshot.sessionId!==id||!snapshot.view)return {sessionId:id,phase:'pending',locked:true}
 const phase=snapshot.view.phase
 if(!['ready','countdown','running','paused','finished'].includes(phase)||!snapshot.leader&&!snapshot.isMember)return {sessionId:id,phase:'pending',locked:true}
 const locked=phase!=='finished'&&(snapshot.leader===true||snapshot.joined===true)
 return {sessionId:id,phase,locked}
}
export function synchronNavigation(next,presence){
 return next==='trening'&&presence?.locked?'synchron-session':next
}
export function synchronEntryConflict(entry,presence,href){
 const id=parseSynchronInvitation(href)
 return !!(presence?.locked&&parseSynchronInvitation(entry?.href)!==id)
}
export function synchronOwnedEntry(entry,actor,runtime){
 return !!(entry&&actor&&runtime&&entry.actor===actor&&entry.runtime===runtime)
}

// Cancelling an initial, read-only invitation lookup is safe locally. Never
// release a known live session on a failed refresh or a stale callback.
export function canCancelSynchronOpening(entry,presence,{actor,runtime,href}={}){
 return synchronOwnedEntry(entry,actor,runtime)&&entry.href===href&&presence?.phase==='pending'&&presence.sessionId===parseSynchronInvitation(href)
}
export function synchronSnapshotMatches(entry,{actor,runtime,href,snapshot}={}){
 return synchronOwnedEntry(entry,actor,runtime)&&entry.href===href&&!!snapshot?.view&&snapshot.sessionId===parseSynchronInvitation(href)&&Number.isSafeInteger(snapshot.revision)&&snapshot.revision>=0&&Number.isFinite(snapshot.serverAt)&&snapshot.serverAt>=0&&['ready','countdown','running','paused','finished'].includes(snapshot.view.phase)&&typeof snapshot.leader==='boolean'&&typeof snapshot.isMember==='boolean'&&typeof snapshot.joined==='boolean'&&(snapshot.leader||snapshot.isMember)
}

// Ignore delayed/out-of-order responses, including clock-only projections at
// the same authoritative revision. A later server timestamp cannot override a
// newer revision. This is a local guard, not cross-device session discovery.
export function acceptSynchronSnapshot(previous,entry,origin){
 if(!synchronSnapshotMatches(entry,origin))return previous
 const next=origin.snapshot
 if(previous?.sessionId===next.sessionId){
  if(previous.revision>next.revision)return previous
  if(previous.revision===next.revision&&previous.serverAt>=next.serverAt)return previous
 }
 return next
}

// Discovery is opt-in. A stale or foreign account's check is never sufficient.
export function synchronDiscoveryStatus(record,actor,runtime){
 if(!actor||runtime?.actorId!==actor||typeof runtime.discover!=='function')return 'disabled'
 if(record?.actor!==actor||record.runtime!==runtime)return 'pending'
 return ['ready','error'].includes(record.status)?record.status:'pending'
}
export function synchronRecoveryDecision(result,{actor,runtime}={}){
 const fail={status:'error',entry:null,snapshot:null}
 if(!actor||runtime?.actorId!==actor||!result||result.issue)return fail
 if(result.active===null)return {status:'ready',entry:null,snapshot:null}
 const snapshot=result.active,href='synchron-session:'+snapshot?.sessionId,entry={actor,runtime,href}
 if(!synchronSnapshotMatches(entry,{actor,runtime,href,snapshot})||snapshot.view.phase==='finished'||!snapshot.leader&&(!snapshot.isMember||!snapshot.joined))return fail
 return {status:'ready',entry,snapshot}
}
