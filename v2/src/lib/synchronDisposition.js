import {synchronConsistentObservations} from './synchronCalibration.js'
// Descriptive timeline, not a physiological fatigue or recovery model.
// Gaps include changes, timer pauses and waiting, not verified rest.
const id=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128
const nonneg=x=>Number.isFinite(x)&&x>=0
const units=['reps','seconds','meters','calories']
export function validateSynchronTimeline(rows){
 if(!Array.isArray(rows))return []
 let end=0
 const result=[]
 for(const [i,r] of rows.entries()){
  if(r?.ordinal!==i+1||!id(r.movementId)||!id(r.exerciseName)||!id(r.variant)||!units.includes(r.unit)||!Number.isSafeInteger(r.fromMs)||r.fromMs<end||!Number.isSafeInteger(r.durationMs)||r.durationMs<=0||r.loadKg!==null&&!nonneg(r.loadKg)||!Number.isSafeInteger(r.fromMs+r.durationMs))return []
  const observed=r.observed
  if(observed!==null&&(!observed||r.unit==='seconds'||observed.evidence!==(r.unit==='reps'?'counted':'machine')||!Number.isSafeInteger(observed.amount)||observed.amount<0||observed.amount>100000||r.durationMs<5000||r.durationMs>3600000))return []
  result.push({ordinal:r.ordinal,movementId:r.movementId,exerciseName:r.exerciseName,variant:r.variant,unit:r.unit,fromMs:r.fromMs,durationMs:r.durationMs,loadKg:r.loadKg,observed:observed===null?null:{amount:observed.amount,evidence:observed.evidence}})
  end=r.fromMs+r.durationMs
 }
 return result
}
export function synchronWorkTimeline(state,memberId){
 if(state?.phase!=='finished'||!state.plan.members.includes(memberId)||!Number.isSafeInteger(state.startAt))return []
 const observed=new Map(synchronConsistentObservations(state).map(x=>[x.segmentIndex,x.row]))
 return validateSynchronTimeline(state.segments.map((s,index)=>({s,index})).filter(x=>x.s.memberId===memberId).sort((a,b)=>a.s.from-b.s.from).map(({s,index},i)=>{
  const m=state.plan.movements.find(x=>x.id===s.movementId),o=observed.get(index)
  return {ordinal:i+1,movementId:s.movementId,exerciseName:m?.name||m?.exerciseId,variant:s.dose.variant,unit:m?.unit,fromMs:s.from-state.startAt,durationMs:s.assignedMs,loadKg:s.dose.loadKg,observed:o?{amount:o.amount,evidence:o.evidence}:null}
 }))
}
export function summarizeSynchronTimeline(input){
 const rows=validateSynchronTimeline(input)
 let assignedMs=0,gapMs=0,observedCount=0
 const output=rows.map((r,i)=>{
  const prev=rows[i-1],gap=prev?r.fromMs-prev.fromMs-prev.durationMs:null
  assignedMs+=r.durationMs;if(gap!==null)gapMs+=gap
  const pace=r.observed?r.observed.amount*60000/r.durationMs:null
  if(r.observed)observedCount++
  // Adjacent own segments only, exact exercise/variant/load/unit, duration
  // ratio <=1.10, positive previous observed rate. Never compare estimates.
  const comparable=prev?.observed&&r.observed&&prev.observed.amount>0&&prev.movementId===r.movementId&&prev.variant===r.variant&&prev.loadKg===r.loadKg&&prev.unit===r.unit&&Math.max(prev.durationMs,r.durationMs)/Math.min(prev.durationMs,r.durationMs)<=1.10
  const change=comparable?(pace/(prev.observed.amount*60000/prev.durationMs)-1)*100:null
  return {...r,gapSeconds:gap===null?null:gap/1000,pacePerMinute:pace,changePercent:Number.isFinite(change)?Math.round(change*10)/10:null,comparedWith:comparable?prev.ordinal:null}
 })
 return {rows:output,assignedSeconds:assignedMs/1000,gapSeconds:gapMs/1000,observedCount,comparisonCount:output.filter(r=>r.changePercent!==null).length}
}
export function synchronHistoryTimeline(log){
 const d=log?.result_data?.synchron_result
 if(d?.version!==1||d.approved!==true||d.work_timeline?.version!==1||!Array.isArray(d.rows))return []
 const timeline=validateSynchronTimeline(d.work_timeline.rows)
 // Cross-check own frozen segment list and positive independent observations.
 const expected=d.rows.flatMap(r=>Array.isArray(r?.segments)?r.segments.map(s=>JSON.stringify([r.movement_id,r.exercise_name,r.unit,s.variant,s.loadKg,s.seconds])):[]).sort()
 const actual=timeline.map(r=>JSON.stringify([r.movementId,r.exerciseName,r.unit,r.variant,r.loadKg,r.durationMs/1000])).sort()
 if(expected.length!==actual.length||expected.some((v,i)=>v!==actual[i]))return []
 const observed=timeline.filter(r=>r.observed?.amount>0).map(r=>JSON.stringify([r.movementId,r.variant,r.unit,r.durationMs/1000,r.observed.amount,r.observed.evidence])).sort()
 const evidence=d.observed_exposure?.version===1&&Array.isArray(d.observed_exposure.rows)?d.observed_exposure.rows.map(r=>JSON.stringify([r.movementId,r.variant,r.unit,r.assignedSeconds,r.amount,r.evidence])).sort():[]
 if(observed.length!==evidence.length||observed.some((v,i)=>v!==evidence[i]))return []
 return timeline
}
