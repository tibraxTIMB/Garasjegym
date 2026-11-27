import {prepareSynchronLobby,parseSynchronInvitation} from './synchronPreparation.js'
const requestKeys=new Set(['wodId','level','memberIds','leaderParticipates','sessionId','doses'])
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null)
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128&&x.trim()===x&&!['__proto__','constructor','prototype'].includes(x)
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function canonical(x){return Array.isArray(x)?x.map(canonical):plain(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x}
export function synchronCreationIssue(request){
 if(!plain(request)||Object.keys(request).some(k=>!requestKeys.has(k))||!id(request.wodId)||!uuid.test(request.sessionId||'')||!['rx','intermediate','scaled','foundation'].includes(request.level)||typeof request.leaderParticipates!=='boolean'||!Array.isArray(request.memberIds)||request.memberIds.length>8||!request.memberIds.every(id)||new Set(request.memberIds).size!==request.memberIds.length||!plain(request.doses)||Object.keys(request.doses).length>30)return 'Ugyldig førebuingsførespurnad.'
 for(const [key,rows] of Object.entries(request.doses)){
  if(!/^movement-(?:[1-9]|[12][0-9]|30)$/.test(key)||!plain(rows)||Object.keys(rows).length>8)return 'Ugyldig dosering.'
  for(const [member,d] of Object.entries(rows))if(!id(member)||!plain(d)||Object.keys(d).length!==2||typeof d.variant!=='string'||!d.variant.trim()||d.variant.length>128||!Object.hasOwn(d,'loadKg')||d.loadKg!==null&&(!Number.isFinite(d.loadKg)||d.loadKg<0))return 'Ugyldig individuell dosering.'
 }
 return null
}
// Trusted host loads current permissions and WOD independently. createAtomic
// must commit session + invitation outbox together with unique session and
// (session, recipient) keys; existing records must never be overwritten.
export function createSynchronInvitationGateway({authenticate,readCoachContext,readWod,readCreation,createAtomic}){
 if([authenticate,readCoachContext,readWod,readCreation,createAtomic].some(fn=>typeof fn!=='function'))throw Error('SYNCHRON krev autorisert oppretting.')
 const deny=()=>({issue:'Ingen tilgang til økta.'})
 async function create(credential,request){
  const issue=synchronCreationIssue(request);if(issue)return {issue}
  const actorId=await authenticate(credential)
  if(!id(actorId))return deny()
  const ctx=await readCoachContext(actorId)
  if(ctx?.canCoach!==true||!Array.isArray(ctx.eligibleMemberIds)||request.memberIds.includes(actorId)||request.memberIds.some(m=>!ctx.eligibleMemberIds.includes(m)))return deny()
  const fingerprint=JSON.stringify(canonical(request))
  const existing=await readCreation(request.sessionId)
  const replay=record=>record?.actorId===actorId&&record.fingerprint===fingerprint?{sessionId:request.sessionId,duplicate:true}:deny()
  if(existing)return replay(existing)
  const wod=await readWod(request.wodId,actorId)
  if(wod?.id!==request.wodId)return deny()
  const prepared=prepareSynchronLobby({...request,wod},{actorId,canCoach:true,eligibleMemberIds:ctx.eligibleMemberIds})
  if(prepared.issue)return {issue:prepared.issue}
  const invitationRows=prepared.invitations.map(i=>({...i,key:JSON.stringify([i.sessionId,i.recipientId])}))
  const record={actorId,fingerprint,state:prepared.state,invitations:invitationRows}
  if(await createAtomic(record))return {sessionId:request.sessionId}
  return replay(await readCreation(request.sessionId))
 }
 return {create}
}
// Inbox item is never permission to join; require a fresh scoped snapshot.
export async function openSynchronInvitation(href,{readSnapshot}={}){
 const sessionId=parseSynchronInvitation(href)
 if(!sessionId||typeof readSnapshot!=='function')return {issue:'Fellesøkta er ikkje tilgjengeleg.'}
 try{
  const response=await readSnapshot(sessionId),s=response?.snapshot
  if(response?.issue||!s||s.sessionId!==sessionId||(!s.isMember&&!s.leader)||!s.view||!['ready','countdown','running','paused','finished'].includes(s.view.phase))return {issue:'Fellesøkta er ikkje tilgjengeleg.'}
  return {sessionId,snapshot:s}
 }catch{return {issue:'Kunne ikkje opna fellesøkta. Prøv igjen.'}}
}
