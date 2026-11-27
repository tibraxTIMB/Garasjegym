import {createSynchronInvitationGateway,openSynchronInvitation,synchronCreationIssue} from './synchronInvitations.js'
import {createSynchronGateway} from './synchronTransport.js'
import {parseSynchronInvitation} from './synchronPreparation.js'
const validSession=id=>typeof id==='string'&&parseSynchronInvitation('synchron-session:'+id)===id
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x)
const only=(x,keys)=>Object.keys(x).every(k=>keys.includes(k))
const unavailable=()=>({issue:'Fellesøkta er ikkje tilgjengeleg.'})
// Framework-neutral trusted server dispatcher. Caller extracts credential from
// verified request context, not from JSON. No real persistence adapter is supplied.
export function createSynchronDispatcher(host){
 const creation=createSynchronInvitationGateway(host),live=createSynchronGateway(host)
 return async function dispatch(credential,body){
  if(!object(body)||typeof body.op!=='string')return unavailable()
  try{
   if(body.op==='create'&&only(body,['op','request']))return await creation.create(credential,body.request)
   if(!validSession(body.sessionId))return unavailable()
   if(body.op==='snapshot'&&only(body,['op','sessionId']))return await live.snapshot(body.sessionId,credential)
   if(body.op==='command'&&only(body,['op','sessionId','command'])&&object(body.command))return await live.command(body.sessionId,credential,body.command)
   // Reservation stays server-side; client cannot retrieve raw persistence payloads.
   return unavailable()
  }catch{return unavailable()}
 }
}
// Host injects invoke (e.g. authenticated HTTPS call using current session).
// No credentials, service keys or client-supplied actor appear in request body.
export function createSynchronRuntime({actorId,invoke}={}){
 if(typeof actorId!=='string'||!actorId||typeof invoke!=='function')return null
 async function call(body){
  const result=await invoke(body)
  return object(result)?result:unavailable()
 }
 async function readSnapshot(sessionId){
  if(!validSession(sessionId))return unavailable()
  const r=await call({op:'snapshot',sessionId})
  return r.snapshot?.sessionId===sessionId?r:unavailable()
 }
 async function create(request){
  const issue=synchronCreationIssue(request);if(issue)return {issue}
  const result=await call({op:'create',request})
  return result.sessionId===request.sessionId?{sessionId:result.sessionId,duplicate:result.duplicate===true}:result.issue?{issue:result.issue}:unavailable()
 }
 function adapter(sessionId){
  if(!validSession(sessionId))return null
  return {read:()=>readSnapshot(sessionId),command:async command=>{
   const r=await call({op:'command',sessionId,command})
   return r.snapshot&&r.snapshot.sessionId!==sessionId?unavailable():r
  }}
 }
 return {actorId,create,readSnapshot,adapter,open:href=>openSynchronInvitation(href,{readSnapshot})}
}
// UI gate only, not authorization. Existing local timer must not be replaced.
export function synchronRouteIssue(runtime,memberId,{localSessionOpen=false}={}){
 if(localSessionOpen)return 'Avslutt eller lagra den lokale økta før du opnar Samspel.'
 if(!runtime||runtime.actorId!==memberId||typeof runtime.open!=='function'||typeof runtime.adapter!=='function'||typeof runtime.create!=='function')return 'Samspel Live er ikkje aktivert.'
 return null
}
