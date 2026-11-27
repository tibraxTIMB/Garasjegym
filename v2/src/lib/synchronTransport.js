import {applySynchronCommand,synchronView,synchronAssignedTime} from './synchron.js'

// Server-side boundary. Host must authenticate identity and atomically persist
// the session with its revision and event IDs. Never mount with browser storage.
const clone=v=>JSON.parse(JSON.stringify(v))
const allowed=new Set(['join','start','takeover','idle','pause','resume','load','advance','finish'])
const keys=new Set(['id','revision','type','memberId','loadKg','actual','abort'])
function actorAllowed(s,id){return typeof id==='string'&&(s?.plan?.leaderId===id||s?.plan?.members?.includes(id))}
export function synchronClientSnapshot(state,actorId,now){
 if(!actorAllowed(state,actorId))return null
 const view=synchronView(state,actorId,now),leader=state.plan.leaderId===actorId
 const stage=state.plan.movements[state.stage],isMember=state.plan.members.includes(actorId)
 const ownOpen=view.active===actorId?(state.open?.memberId===actorId?Math.max(0,now-state.open.from):state.phase==='countdown'&&now>=state.startAt?now-state.startAt:0):0
 const movements=state.plan.movements.map(m=>({id:m.id,exerciseId:m.exerciseId,name:m.name||m.exerciseId,unit:m.unit,target:m.target,method:m.method}))
 return clone({sessionId:state.plan.id,revision:state.revision,serverAt:now,title:state.plan.title||'Samspel',leader,isMember,
  participantSlot:isMember?state.plan.members.indexOf(actorId)+1:null,joined:state.joined.includes(actorId),joinedCount:state.joined.length,participantCount:state.plan.members.length,
  view:{...view,active:view.active===null?null:state.plan.members.indexOf(view.active)+1},movements,ownDose:isMember?state.currentDoses[state.stage][actorId]:null,
  ownAssignedSeconds:isMember?synchronAssignedTime(state,stage.id,actorId)+ownOpen/1000:null,
  totals:Object.fromEntries(Object.entries(state.totals).map(([id,t])=>[id,{unit:t.unit,actual:t.actual}])),
  ...(leader?{participants:state.plan.members.map((id,i)=>({id,slot:i+1,joined:state.joined.includes(id)}))}:{})})
}
export function synchronActionRequest(snapshot,type,fields={},id){
 if(!snapshot||!allowed.has(type)||typeof id!=='string'||!id||Object.keys(fields).some(k=>!['memberId','loadKg','actual','abort'].includes(k)))return null
 const v=snapshot.view
 const permitted=type==='join'?snapshot.isMember&&!snapshot.joined&&v.phase==='ready':
  type==='start'?v.canStart:type==='takeover'?v.canTakeover||snapshot.leader&&v.phase==='running'&&typeof fields.memberId==='string':
  type==='idle'?v.phase==='running'&&v.active!==null&&(snapshot.leader||v.active===snapshot.participantSlot):
  type==='pause'?v.canPause:type==='resume'?v.canResume:type==='advance'?v.canAdvance:
  type==='finish'?v.canFinish:type==='load'?v.phase==='running'&&(snapshot.joined||snapshot.leader):false
 return permitted?{id,revision:snapshot.revision,type,...fields}:null
}
export function createSynchronGateway({authenticate,read,compareAndSwap,now}){
 if([authenticate,read,compareAndSwap,now].some(fn=>typeof fn!=='function'))throw Error('Synchron krev autentisering, lagring og serverklokke.')
 const denied=()=>({issue:'Ingen tilgang til økta.'})
 async function snapshot(sessionId,credential){
  const actorId=await authenticate(credential),s=await read(sessionId)
  return actorAllowed(s,actorId)&&s.plan.id===sessionId?{snapshot:synchronClientSnapshot(s,actorId,now())}:denied()
 }
 async function command(sessionId,credential,cmd){
  const actorId=await authenticate(credential),state=await read(sessionId)
  if(!actorAllowed(state,actorId)||state.plan.id!==sessionId)return denied()
  if(!cmd||typeof cmd!=='object'||Array.isArray(cmd)||!allowed.has(cmd.type)||Object.keys(cmd).some(k=>!keys.has(k))||state.plan.leaderId!==actorId&&Object.hasOwn(cmd,'memberId'))return {issue:'Ugyldig handling.'}
  const at=now(),result=applySynchronCommand(state,cmd,{actorId,at})
  if(result.issue)return {issue:result.issue,snapshot:synchronClientSnapshot(state,actorId,at)}
  if(result.duplicate)return {duplicate:true,snapshot:synchronClientSnapshot(state,actorId,at)}
  if(!await compareAndSwap(sessionId,state.revision,result.state)){
   const latest=await read(sessionId)
   if(!actorAllowed(latest,actorId)||latest.plan.id!==sessionId)return denied()
   return {issue:'Økta er endra. Synkroniser først.',snapshot:synchronClientSnapshot(latest,actorId,now())}
  }
  return {snapshot:synchronClientSnapshot(result.state,actorId,at)}
 }
 return {snapshot,command}
}
