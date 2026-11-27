import {synchronObservationIssue} from './synchronPace.js'
const copy=x=>JSON.parse(JSON.stringify(x))
const amountOk=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000
// The closed segment and its context are derived from the trusted timer.
// The coach attests an independently counted quantity or observed machine delta,
// not actual effective motion time. Self-observation is deliberately excluded.
function observation(state,index,amount,evidence,at){
 const s=state.segments[index],m=state.plan.movements.find(m=>m.id===s?.movementId)
 if(!s||!m||!Object.hasOwn(state.totals,m.id))return null
 const prev=state.segments.slice(0,index).filter(x=>x.memberId===s.memberId&&x.movementId===s.movementId)
 const row={version:1,source:'observed',evidence,observationId:'segment-'+index,sessionId:state.plan.id,memberId:s.memberId,exerciseId:m.exerciseId,variant:s.dose.variant,loadKg:s.dose.loadKg,unit:m.unit,observedAt:at,amount,assignedSeconds:s.assignedMs/1000,previousWorkSeconds:prev.reduce((n,x)=>n+x.assignedMs/1000,0),restSeconds:prev.length?Math.max(0,(s.from-prev.at(-1).to)/1000):null}
 return synchronObservationIssue(row)?null:row
}
export function synchronCoachCalibration(state,actorId){
 if(state?.phase!=='finished'||!state.review||state.plan.leaderId!==actorId)return null
 return {sealed:!!state.seal,rows:state.segments.flatMap((s,index)=>{
  if(s.memberId===actorId)return []
  const m=state.plan.movements.find(m=>m.id===s.movementId)
  const base=observation(state,index,0,m?.unit==='reps'?'counted':'machine',state.lastAt)
  if(!base)return []
  const saved=state.calibration?.find(x=>x.segmentIndex===index)
  return [{segmentIndex:index,slot:state.plan.members.indexOf(s.memberId)+1,name:m.name||m.exerciseId,unit:m.unit,variant:s.dose.variant,loadKg:s.dose.loadKg,assignedSeconds:base.assignedSeconds,previousWorkSeconds:base.previousWorkSeconds,restSeconds:base.restSeconds,amount:saved?.row.amount??null}]
 })}
}
export function applySynchronCalibration(state,cmd,{actorId,at}={}){
 const fail=issue=>({state,issue})
 if(state?.phase!=='finished'||!state.review||actorId!==state.plan.leaderId||typeof cmd?.id!=='string'||!cmd.id.trim()||cmd.id.length>128||cmd.type!=='calibration_record'||!Number.isSafeInteger(at)||at<Math.max(state.lastAt,state.events.at(-1)?.at??0))return fail('Ingen tilgang til kalibrering.')
 const old=state.events.find(e=>e.id===cmd.id)
 if(old)return old.actorId===actorId&&old.type===cmd.type&&old.segmentIndex===cmd.segmentIndex&&old.amount===cmd.amount&&old.attested===cmd.attested?{state,duplicate:true}:fail('Hendings-ID er alt brukt.')
 if(state.seal||cmd.revision!==state.revision)return fail('Kalibreringa er låst eller endra.')
 if(cmd.attested!==true||!Number.isSafeInteger(cmd.segmentIndex)||cmd.segmentIndex<0||!amountOk(cmd.amount))return fail('Stadfest ei faktisk observert mengd.')
 const seg=state.segments[cmd.segmentIndex]
 if(!seg||seg.memberId===actorId)return fail('Eigne bolkar kan ikkje brukast som uavhengig observasjon.')
 const move=state.plan.movements.find(m=>m.id===seg.movementId)
 const row=observation(state,cmd.segmentIndex,cmd.amount,move?.unit==='reps'?'counted':'machine',at)
 if(!row)return fail('Arbeidsbolken kan ikkje kalibrerast.')
 const entries=(state.calibration||[]).filter(x=>x.segmentIndex!==cmd.segmentIndex)
 entries.push({segmentIndex:cmd.segmentIndex,observerId:actorId,row})
 const related=entries.filter(x=>state.segments[x.segmentIndex].movementId===seg.movementId)
 const team=state.totals[seg.movementId].actual
 if(team!==null&&related.reduce((n,x)=>n+x.row.amount,0)>team)return fail('Observerte bidrag overstig lagresultatet.')
 const next=copy(state);next.calibration=entries;next.revision++
 next.events.push({id:cmd.id,type:cmd.type,actorId,at,revision:next.revision,segmentIndex:cmd.segmentIndex,amount:cmd.amount,attested:true})
 return {state:next,issue:null}
}
// Server-only export candidate after seal. Never reads estimated review amounts
// as observations. Quarantine an entire movement if independent counts conflict
// with the team total or an individual confirmed result.
export function synchronConsistentObservations(state){
 if(state?.phase!=='finished'||!state.review||!state.plan.members.every(id=>state.review.approved.includes(id))||!Array.isArray(state.calibration))return []
 const invalid=new Set(),seen=new Set(),entries=[]
 for(const x of state.calibration){
  const s=state.segments[x?.segmentIndex]
  if(!s)continue
  if(seen.has(x.segmentIndex)){invalid.add(s.movementId);continue}
  seen.add(x.segmentIndex)
  const m=state.plan.movements.find(m=>m.id===s.movementId),r=x.row
  const expected=observation(state,x.segmentIndex,r?.amount,m?.unit==='reps'?'counted':'machine',r?.observedAt)
  const event=[...state.events].reverse().find(e=>e.type==='calibration_record'&&e.segmentIndex===x.segmentIndex)
  if(!expected||!r||Object.keys(expected).some(k=>r[k]!==expected[k])||x.observerId!==state.plan.leaderId||s.memberId===x.observerId||!event||event.actorId!==x.observerId||event.attested!==true||event.amount!==r.amount||event.at!==r.observedAt){invalid.add(s.movementId);continue}
  entries.push(x)
 }
 for(const m of state.review.movements){
  const rows=entries.filter(x=>state.segments[x.segmentIndex]?.movementId===m.movementId)
  const sum=rows.reduce((n,x)=>n+x.row.amount,0)
  const allSegments=state.segments.filter(s=>s.movementId===m.movementId)
  if(m.teamActual!==null&&(sum>m.teamActual||rows.length>0&&rows.length===allSegments.length&&sum!==m.teamActual))invalid.add(m.movementId)
  for(const r of m.rows){
   const own=rows.filter(x=>x.row.memberId===r.memberId)
   const count=own.reduce((n,x)=>n+x.row.amount,0)
   const segments=state.segments.filter(s=>s.memberId===r.memberId&&s.movementId===m.movementId)
   if(r.input?.quality==='confirmed'&&(count>r.input.value||own.length>0&&own.length===segments.length&&count!==r.input.value))invalid.add(m.movementId)
  }
 }
 return copy(entries.filter(x=>!invalid.has(state.segments[x.segmentIndex]?.movementId)))
}

export function synchronCalibrationExport(state){
 return state?.seal?synchronConsistentObservations(state).map(x=>x.row):[]
}
