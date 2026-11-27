import {synchronEstimate,synchronAllocate,synchronAssignedTime} from './synchron.js'
const whole=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000
const clone=x=>JSON.parse(JSON.stringify(x))
// Frozen proposals are created once on finish, from trusted calibration records.
// Assigned time is not proof of effective motion, including static holds.
export function initializeSynchronReview(state,calibrations=[]){
 if(state.phase!=='finished'||state.review)return state
 const movements=state.plan.movements.filter(m=>Object.hasOwn(state.totals,m.id)).map(m=>{
  const rows=state.plan.members.map(memberId=>{
   const segments=state.segments.filter(s=>s.movementId===m.id&&s.memberId===memberId)
   const assignedSeconds=synchronAssignedTime(state,m.id,memberId)
   const estimate=m.unit==='seconds'&&m.method==='clock'&&segments.length?assignedSeconds:synchronEstimate(state,m.id,memberId,calibrations)?.value??null
   return {memberId,assignedSeconds,segments:segments.map(s=>({seconds:s.assignedMs/1000,variant:s.dose.variant,loadKg:s.dose.loadKg})),estimate:Number.isFinite(estimate)&&estimate>=0?estimate:null,input:null}
  })
  return {movementId:m.id,unit:m.unit,teamActual:state.totals[m.id].actual,rows}
 })
 return {...state,review:{version:1,movements,approved:[]}}
}
function resolveMovement(m){
 const fixed=m.rows.filter(r=>r.input&&r.input.quality!=='unknown')
 const free=m.rows.filter(r=>!r.input)
 const fixedSum=fixed.reduce((sum,r)=>sum+r.input.value,0)
 const unknown=m.rows.some(r=>r.input?.quality==='unknown')
 let allocation=null
 if(m.teamActual!==null&&!unknown&&fixedSum<=m.teamActual&&free.length&&free.every(r=>r.estimate!==null)){
  allocation=synchronAllocate(m.teamActual,m.rows.map(r=>({memberId:r.memberId,actual:r.input?.value??null,estimate:r.estimate})))
 }
 const rows=m.rows.map(r=>{
  let value=null,quality='unknown',basis='missing'
  if(r.input){value=r.input.value;quality=r.input.quality;basis='self_report'}
  else if(allocation){value=allocation.find(a=>a.memberId===r.memberId).value;quality='estimated';basis='team_adjusted'}
  else if(r.estimate!==null){value=Math.round(r.estimate);quality='estimated';basis='assigned_time'}
  return {...r,value,quality,basis,prEligible:false}
 })
 const known=rows.filter(r=>r.value!==null),sum=known.reduce((n,r)=>n+r.value,0)
 const reconciled=m.teamActual===null?null:known.length===rows.length&&sum===m.teamActual
 return {...m,rows,sum,reconciled,conflict:m.teamActual!==null&&(fixedSum>m.teamActual||known.length===rows.length&&sum!==m.teamActual)}
}
export function synchronReviewProjection(state,actorId){
 if(state.phase!=='finished'||!state.review||!state.plan.members.includes(actorId))return null
 const rows=state.review.movements.map(resolveMovement).map(m=>{
  const r=m.rows.find(r=>r.memberId===actorId)
  const movement=state.plan.movements.find(x=>x.id===m.movementId)
  return {movementId:m.movementId,name:movement.name||movement.exerciseId,unit:m.unit,teamActual:m.teamActual,reconciled:m.reconciled,conflict:m.conflict,
   assignedSeconds:r.assignedSeconds,segments:r.segments,value:r.value,quality:r.quality,basis:r.basis,explicitUnknown:r.input?.quality==='unknown',prEligible:false}
 })
 return clone({revision:state.revision,rows,approved:state.review.approved.includes(actorId),approvedCount:state.review.approved.length,participantCount:state.plan.members.length,
  canApprove:rows.length>0&&rows.every(r=>!r.conflict&&(r.teamActual===null?r.value!==null||r.explicitUnknown:r.reconciled===true)),prEligible:false})
}
export function applySynchronReview(state,cmd,{actorId,at}={}){
 const fail=issue=>({state,issue})
 if(!state.review||state.phase!=='finished'||!state.plan.members.includes(actorId)||typeof cmd?.id!=='string'||!cmd.id.trim()||cmd.id.length>128||!Number.isSafeInteger(at)||at<Math.max(state.lastAt,state.events.at(-1)?.at??0))return fail('Ingen tilgang til resultatet.')
 const old=state.events.find(e=>e.id===cmd.id)
 if(old)return old.actorId===actorId&&old.type===cmd.type&&old.movementId===cmd.movementId&&old.quality===cmd.quality&&old.value===cmd.value?{state,duplicate:true}:fail('Hendings-ID er alt brukt.')
 if(cmd.revision!==state.revision)return fail('Resultatet er endra. Oppdater først.')
 const next=clone(state)
 if(cmd.type==='review_update'){
  const m=next.review.movements.find(m=>m.movementId===cmd.movementId),row=m?.rows.find(r=>r.memberId===actorId)
  if(!row||!['confirmed','estimated','unknown'].includes(cmd.quality)||(cmd.quality==='unknown'?cmd.value!==null:!whole(cmd.value)))return fail('Ugyldig resultat.')
  row.input={quality:cmd.quality,value:cmd.value}
  const fixed=m.rows.reduce((sum,r)=>sum+(r.input?.value??0),0)
  if(m.teamActual!==null&&fixed>m.teamActual)return fail('Individuelle bidrag overstig stadfesta lagresultat.')
  // Any changed proposal can alter a peer's share: invalidate all approvals.
  next.review.approved=[]
 }else if(cmd.type==='review_approve'){
  if(!synchronReviewProjection(state,actorId)?.canApprove||state.review.approved.includes(actorId))return fail('Kontroller resultat og avvik før godkjenning.')
  next.review.approved.push(actorId)
 }else return fail('Ukjend handling.')
 next.revision++
 // Preserve finish time: review timestamps must not lengthen the workout clock.
 next.events.push({id:cmd.id,type:cmd.type,actorId,at,revision:next.revision,...(cmd.type==='review_update'?{movementId:cmd.movementId,quality:cmd.quality,value:cmd.value}:{})})
 return {state:next,issue:null}
}
