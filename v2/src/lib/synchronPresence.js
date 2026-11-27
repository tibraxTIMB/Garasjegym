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
