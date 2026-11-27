import {synchronConsistentObservations} from './synchronCalibration.js'
// Separate qualitative evidence, never converted into measured sets or PR data.
// Positive independently observed quantity establishes occurrence, not activation.
const id=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128
export function synchronObservedExposure(state,memberId){
 if(!state?.plan?.members.includes(memberId))return []
 return synchronConsistentObservations(state).flatMap(({segmentIndex,row})=>{
  if(row.memberId!==memberId||row.amount<=0)return []
  const seg=state.segments[segmentIndex],m=state.plan.movements.find(m=>m.id===seg.movementId)
  if(!m)return []
  return [{observationId:row.observationId,movementId:m.id,exerciseName:m.name||m.exerciseId,variant:row.variant,unit:row.unit,amount:row.amount,assignedSeconds:row.assignedSeconds,evidence:row.evidence}]
 })
}
// Sanitize the actor's own frozen evidence metadata. No old log inference.
export function validateSynchronExposure(rows){
 if(!Array.isArray(rows))return []
 const counts=new Map()
 for(const r of rows)counts.set(r?.observationId,(counts.get(r?.observationId)||0)+1)
 return rows.filter(r=>id(r?.observationId)&&counts.get(r.observationId)===1&&id(r.movementId)&&id(r.exerciseName)&&id(r.variant)&&['reps','meters','calories'].includes(r.unit)&&r.evidence===(r.unit==='reps'?'counted':'machine')&&Number.isSafeInteger(r.amount)&&r.amount>0&&r.amount<=100000&&Number.isFinite(r.assignedSeconds)&&r.assignedSeconds>=5&&r.assignedSeconds<=3600).map(r=>({observationId:r.observationId,movementId:r.movementId,exerciseName:r.exerciseName,variant:r.variant,unit:r.unit,amount:r.amount,assignedSeconds:r.assignedSeconds,evidence:r.evidence}))
}
export function synchronAnatomyRows(rows){
 return validateSynchronExposure(rows).map(r=>({exerciseName:r.exerciseName,completed:true,evidenceKind:'coach_observed_segment'}))
}
export function synchronHistoryExposure(log){
 const data=log?.result_data?.synchron_result
 if(data?.version!==1||data.approved!==true||data.observed_exposure?.version!==1||!Array.isArray(data.rows))return []
 return validateSynchronExposure(data.observed_exposure.rows).filter(r=>data.rows.some(m=>m.movement_id===r.movementId&&m.exercise_name===r.exerciseName&&m.unit===r.unit))
}
