import {pairedEmomClock,pairedEmomScheduleIssue,pairedEmomOpportunity} from './synchronSchedule.js'
// Format-specific reducer for SYNCHRON. Not exposed by the Chipper gateway.
// Trusted server supplies actor and timestamp. No client clock or implied reps.
const idOk=x=>typeof x==='string'&&x.trim()!==''&&x.length<=128&&!['__proto__','constructor','prototype'].includes(x)
const whole=x=>Number.isSafeInteger(x)&&x>=0
const clone=x=>JSON.parse(JSON.stringify(x))
export function pairedPlanIssue(p){
 if(p?.version!==1||p.mode!=='paired_emom'||!idOk(p.id)||!idOk(p.leaderId)||!idOk(p.sourceWodId)||!Array.isArray(p.members)||p.members.length!==2||!p.members.every(idOk)||new Set(p.members).size!==2)return 'Ugyldig YGIG-plan.'
 const s=p.schedule,ms=p.movements
 if(!Array.isArray(s?.tracks)||!s.tracks.every(idOk)||pairedEmomScheduleIssue({durationSeconds:s.duration_seconds,intervalSeconds:s.switch_seconds,exerciseCount:s.tracks.length})||!Array.isArray(ms)||ms.length!==s.tracks.length||new Set(ms.map(m=>m?.id)).size!==ms.length)return 'Ugyldig intervallrekkje.'
 for(const [i,m] of ms.entries()){
  if(!idOk(m?.id)||!idOk(m.exerciseId)||m.name!==s.tracks[i]||m.unit!=='reps'||m.collaboration!=='paired_emom'||!m.doses||Object.keys(m.doses).length!==2)return 'Ugyldig øving.'
  for(const [j,member] of p.members.entries()){
   const d=Object.hasOwn(m.doses,member)?m.doses[member]:null
   if(!d||!['rx','scaled','foundation'].includes(d.level)||!idOk(d.variant)||!Object.hasOwn(d,'loadKg')||d.loadKg!==null&&(!Number.isFinite(d.loadKg)||d.loadKg<0)||!whole(d.repsPerInterval)||d.repsPerInterval<1||d.plannedIntervals!==pairedEmomOpportunity(s,i,j+1)||d.plannedReps!==d.repsPerInterval*d.plannedIntervals||!whole(d.plannedReps)||d.plannedReps>100000)return 'Ugyldig individuell dosering.'
  }
 }
 return null
}
export function createSynchronPairedSession(plan){
 const issue=pairedPlanIssue(plan);if(issue)throw Error(issue)
 return {version:1,plan:clone(plan),revision:0,phase:'ready',joined:[],startAt:null,lastAt:null,pausedAt:null,pausedMs:0,finishedElapsedMs:null,aborted:false,events:[]}
}
function allowed(s,id){return idOk(id)&&(s.plan.leaderId===id||s.plan.members.includes(id))}
export function pairedElapsedMs(s,at){
 if(s.phase==='finished')return s.finishedElapsedMs
 if(s.startAt===null)return 0
 const end=s.phase==='paused'?s.pausedAt:at
 return Math.min(s.plan.schedule.duration_seconds*1000,Math.max(0,end-s.startAt-s.pausedMs))
}
// Common frame derived from server time, including across skipped polls.
// Only the requesting member's dose is disclosed; a coach can see the active dose.
export function synchronPairedView(s,actorId,at){
 if(!allowed(s,actorId)||!whole(at))return null
 const leader=s.plan.leaderId===actorId,slot=s.plan.members.indexOf(actorId)+1
 const elapsedMs=pairedElapsedMs(s,at),frame=pairedEmomClock(s.plan.schedule,elapsedMs/1000)
 const phase=s.phase==='finished'?'finished':frame.finished?'awaiting_finish':s.phase==='countdown'&&at>=s.startAt?'running':s.phase
 const movement=s.plan.movements[frame.current.exerciseIndex]
 const canAct=s.lastAt===null||at>=s.lastAt
 const hasBegun=['running','paused','awaiting_finish'].includes(phase)
 return clone({mode:'paired_emom',sessionId:s.plan.id,revision:s.revision,serverAt:at,phase,leader,participantSlot:slot||null,joined:s.joined.includes(actorId),joinedCount:s.joined.length,participantCount:2,
  elapsedMs,frame,countdown:phase==='countdown'?Math.max(0,Math.ceil((s.startAt-at)/1000)):0,
  movement:{id:movement.id,name:movement.name},activeSlot:phase==='finished'||phase==='awaiting_finish'?null:frame.current.worker,
  ownDose:slot?movement.doses[actorId]:null,activeDose:leader?movement.doses[s.plan.members[frame.current.worker-1]]:undefined,
  ownWork:slot?phase==='running'&&frame.current.worker===slot:false,
  canJoin:canAct&&phase==='ready'&&!!slot&&!s.joined.includes(actorId),
  canStart:canAct&&leader&&phase==='ready'&&s.joined.length===2,
  canPause:canAct&&leader&&phase==='running',
  canResume:canAct&&leader&&phase==='paused'&&!frame.finished,
  canFinish:canAct&&leader&&hasBegun,
  canTakeover:false,canAdvance:false,aborted:s.aborted})
}
export function applySynchronPairedCommand(s,cmd,{actorId,at}={}){
 const fail=issue=>({state:s,issue})
 if(!allowed(s,actorId)||!whole(at)||!idOk(cmd?.id)||!['join','start','pause','resume','finish'].includes(cmd.type)||Object.keys(cmd).some(k=>!['id','revision','type','abort'].includes(k))||Object.hasOwn(cmd,'abort')&&(cmd.type!=='finish'||typeof cmd.abort!=='boolean'))return fail('Ugyldig handling.')
 const old=s.events.find(e=>e.id===cmd.id)
 if(old)return old.actorId===actorId&&old.type===cmd.type&&old.abort===(cmd.abort===true)?{state:s,duplicate:true}:fail('Hendings-ID er alt brukt.')
 if(cmd.revision!==s.revision||s.lastAt!==null&&at<s.lastAt)return fail('Økta er endra. Synkroniser først.')
 const v=synchronPairedView(s,actorId,at),n=clone(s)
 if(cmd.type==='join'){if(!v.canJoin)return fail('Kan ikkje kopla til.');n.joined.push(actorId)}
 else if(cmd.type==='start'){if(!v.canStart||!whole(at+10000))return fail('Berre øktleiar kan starta når begge er klare.');n.phase='countdown';n.startAt=at+10000}
 else if(cmd.type==='pause'){if(!v.canPause)return fail('Berre øktleiar kan pausa.');n.phase='paused';n.pausedAt=at}
 else if(cmd.type==='resume'){if(!v.canResume)return fail('Berre øktleiar kan fortsetja.');n.pausedMs+=at-n.pausedAt;n.pausedAt=null;n.phase='running'}
 else if(cmd.type==='finish'){
  if(!v.canFinish||!v.frame.finished&&cmd.abort!==true)return fail('Stadfest tidleg avslutting.')
  n.finishedElapsedMs=v.elapsedMs;n.phase='finished';n.aborted=cmd.abort===true||!v.frame.finished;n.pausedAt=null
 }
 n.lastAt=at;n.revision++;n.events.push({id:cmd.id,actorId,type:cmd.type,abort:cmd.abort===true,at,revision:n.revision})
 return {state:n,issue:null}
}
