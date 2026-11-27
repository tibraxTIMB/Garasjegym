// SYNCHRON / Arbeitsfluss v1: deterministic domain contract, not a transport or auth service.
// Trusted host supplies actorId and server timestamp; never trust these from a client payload.
// All accepted commands must eventually be committed atomically with revision and event ID.
const units=new Set(['reps','seconds','meters','calories'])
const methods=new Set(['direct','clock','estimate','machine','hybrid'])
const idOk=v=>typeof v==='string'&&v.trim().length>0&&v.length<=128
const nonnegative=v=>Number.isFinite(v)&&v>=0
const whole=v=>Number.isSafeInteger(v)&&v>=0
const copy=v=>JSON.parse(JSON.stringify(v))
export function synchronPlanIssue(plan){
 if(!idOk(plan?.id)||!idOk(plan.leaderId)||!Array.isArray(plan.members)||plan.members.length<2||plan.members.length>8||!plan.members.every(idOk)||new Set(plan.members).size!==plan.members.length)return 'Ugyldig økt eller deltakarar.'
 if(!Array.isArray(plan.movements)||!plan.movements.length||plan.movements.length>30||new Set(plan.movements.map(m=>m?.id)).size!==plan.movements.length)return 'Vel 1–30 unike øvingar.'
 for(const m of plan.movements){
  if(!idOk(m?.id)||!idOk(m.exerciseId)||!units.has(m.unit)||!whole(m.target)||m.target<=0||m.target>100000||!methods.has(m.method)||m.collaboration!=='relay')return 'Ugyldig arbeidsmål eller registreringsmetode.'
  if(m.method==='clock'&&m.unit!=='seconds'||m.method==='machine'&&!['meters','calories'].includes(m.unit)||m.unit==='seconds'&&m.method==='estimate')return 'Registreringsmetoden samsvarar ikkje med måleeininga.'
  for(const member of plan.members){
   const dose=m.doses?.[member]
   if(!dose||!idOk(dose.variant)||!Object.hasOwn(dose,'loadKg')||dose.loadKg!==null&&!nonnegative(dose.loadKg))return 'Vel individuell øvingsvariant og eventuell belastning.'
  }
 }
 return null
}
export function createSynchronSession(plan){
 const issue=synchronPlanIssue(plan);if(issue)throw Error(issue)
 return {version:1,plan:copy(plan),revision:0,phase:'ready',joined:[],stage:0,active:null,resumeMember:null,startAt:null,lastAt:null,segments:[],open:null,totals:{},events:[]}
}
export function synchronClock(state,now){
 const end=state.phase==='finished'?state.lastAt:now
 return state.startAt===null?0:Math.max(0,Math.floor((Math.max(state.startAt,end)-state.startAt)/1000))
}
function open(s,member,at){
 s.active=member
 s.open={movementId:s.plan.movements[s.stage].id,memberId:member,from:at,dose:copy(s.plan.movements[s.stage].doses[member])}
}
function close(s,at){
 if(s.open&&at>s.open.from)s.segments.push({...s.open,to:at,assignedMs:at-s.open.from})
 s.open=null;s.active=null
}
export function applySynchronCommand(state,cmd,{actorId,at}={}){
 const fail=issue=>({state,issue})
 if(!idOk(cmd?.id)||!idOk(actorId)||!whole(at))return fail('Ugyldig hending.')
 const previous=state.events.find(e=>e.id===cmd.id)
 if(previous)return previous.actorId===actorId&&previous.type===cmd.type?{state,duplicate:true}:fail('Hendings-ID er alt brukt.')
 if(cmd.revision!==state.revision||state.lastAt!==null&&at<state.lastAt)return fail('Økta er endra. Synkroniser først.')
 const leader=actorId===state.plan.leaderId,member=state.plan.members.includes(actorId)
 if(!leader&&!member)return fail('Ingen tilgang til økta.')
 const s=copy(state),move=s.plan.movements[s.stage]
 if(cmd.type==='join'){
  if(!member||s.phase==='finished'||s.joined.includes(actorId))return fail('Kan ikkje kopla til.')
  s.joined.push(actorId)
 }else if(cmd.type==='start'){
  if(!leader||s.phase!=='ready'||s.joined.length!==s.plan.members.length||!s.joined.includes(cmd.memberId))return fail('Berre øktleiar kan starta når alle er klare.')
  s.phase='countdown';s.startAt=at+10000;s.resumeMember=cmd.memberId
 }else {
  // Materialize countdown on the first accepted command after its deadline.
  if(s.phase==='countdown'&&at>=s.startAt){s.phase='running';open(s,s.resumeMember,s.startAt);s.resumeMember=null}
  if(cmd.type==='takeover'){
   const next=leader&&cmd.memberId?cmd.memberId:actorId
   if(s.phase!=='running'||!s.joined.includes(next)||next===s.active||!leader&&next!==actorId)return fail('Byte er ikkje tilgjengeleg.')
   if(s.open&&at-s.open.from<2000)return fail('Vent før nytt byte.')
   close(s,at);open(s,next,at)
  }else if(cmd.type==='idle'){
   if(s.phase!=='running'||!s.active||!leader&&actorId!==s.active)return fail('Kan ikkje stoppa arbeidsbolken.')
   close(s,at)
  }else if(cmd.type==='pause'){
   if(!leader||s.phase!=='running')return fail('Berre øktleiar kan pausa.')
   s.resumeMember=s.active;close(s,at);s.phase='paused'
  }else if(cmd.type==='resume'){
   if(!leader||s.phase!=='paused')return fail('Berre øktleiar kan fortsetja.')
   s.phase='running';if(s.resumeMember)open(s,s.resumeMember,at);s.resumeMember=null
  }else if(cmd.type==='load'){
   const target=leader&&cmd.memberId?cmd.memberId:actorId
   if(s.phase!=='running'||!s.joined.includes(target)||!leader&&target!==actorId||cmd.loadKg!==null&&!nonnegative(cmd.loadKg))return fail('Ugyldig belastningsendring.')
   const wasActive=s.active===target;if(wasActive)close(s,at)
   move.doses[target].loadKg=cmd.loadKg;if(wasActive)open(s,target,at)
  }else if(cmd.type==='advance'||cmd.type==='finish'){
   if(!leader||!['running','paused'].includes(s.phase)||cmd.type==='advance'&&s.stage===s.plan.movements.length-1||cmd.type==='finish'&&s.stage<s.plan.movements.length-1&&cmd.abort!==true)return fail('Øktleiar må stadfesta øvingsbyte eller avslutning.')
   if(cmd.actual!==null&&(!whole(cmd.actual)||cmd.actual>100000))return fail('Stadfest faktisk samla mengd, eller vel ukjent.')
   close(s,at);s.totals[move.id]={actual:cmd.actual,unit:move.unit,confirmedBy:actorId}
   s.resumeMember=null
   if(cmd.type==='finish')s.phase='finished'
   else {s.stage++;s.phase='running'}
  }else return fail('Ukjend handling.')
 }
 s.lastAt=at;s.revision++;s.events.push({id:cmd.id,actorId,type:cmd.type,at,revision:s.revision})
 return {state:s,issue:null}
}
// Assigned time is not actual movement time. No rep/PR inference from clock alone.
export function synchronAssignedTime(state,movementId,memberId){
 return state.segments.filter(s=>s.movementId===movementId&&s.memberId===memberId).reduce((sum,s)=>sum+s.assignedMs,0)/1000
}
// Only observed calibration at the exact variant/load and same unit is accepted.
// Missing calibration produces unknown, never a generic pace.
export function synchronEstimate(state,movementId,memberId,calibrations=[]){
 const move=state.plan.movements.find(m=>m.id===movementId)
 if(!move||!state.plan.members.includes(memberId)||!['estimate','hybrid'].includes(move.method)||move.unit==='seconds')return null
 const segments=state.segments.filter(s=>s.movementId===movementId&&s.memberId===memberId)
 if(!segments.length)return null
 let value=0
 for(const seg of segments){
  const matches=calibrations.filter(c=>c.memberId===memberId&&c.exerciseId===move.exerciseId&&c.variant===seg.dose.variant&&c.loadKg===seg.dose.loadKg&&c.unit===move.unit&&c.source==='observed'&&Number.isFinite(c.perMinute)&&c.perMinute>0)
  if(!matches.length)return null
  const rates=matches.map(c=>c.perMinute).sort((a,b)=>a-b),mid=Math.floor(rates.length/2),pace=rates.length%2?rates[mid]:(rates[mid-1]+rates[mid])/2
  value+=seg.assignedMs/60000*pace
 }
 return Number.isFinite(value)?{value,unit:move.unit,quality:'estimated',basis:'assigned_time',prEligible:false}:null
}
// Preserve measured individual amounts. Allocate a confirmed total only where all unknowns have estimates.
export function synchronAllocate(total,rows){
 if(!whole(total)||total>100000||!Array.isArray(rows)||!rows.length||rows.length>8||new Set(rows.map(r=>r.memberId)).size!==rows.length||rows.some(r=>!idOk(r.memberId)))return null
 const fixed=rows.filter(r=>r.actual!==null&&r.actual!==undefined),unknown=rows.filter(r=>r.actual===null||r.actual===undefined)
 if(fixed.some(r=>!whole(r.actual)))return null
 const remaining=total-fixed.reduce((sum,r)=>sum+r.actual,0)
 if(remaining<0||!unknown.length&&remaining!==0||unknown.some(r=>!nonnegative(r.estimate)))return null
 const weight=unknown.reduce((sum,r)=>sum+r.estimate,0)
 if(!Number.isFinite(weight)||remaining>0&&weight<=0)return null
 const allocations=unknown.map((r,i)=>{const raw=weight?remaining*r.estimate/weight:0;return {memberId:r.memberId,i,value:Math.floor(raw),fraction:raw-Math.floor(raw)}})
 let rest=remaining-allocations.reduce((sum,r)=>sum+r.value,0)
 for(const row of [...allocations].sort((a,b)=>b.fraction-a.fraction||a.i-b.i)){if(rest>0){row.value++;rest--}}
 if(rest!==0)return null
 return rows.map(r=>r.actual!=null?{memberId:r.memberId,value:r.actual,quality:'confirmed'}:{memberId:r.memberId,value:allocations.find(a=>a.memberId===r.memberId).value,quality:'estimated',prEligible:false})
}
