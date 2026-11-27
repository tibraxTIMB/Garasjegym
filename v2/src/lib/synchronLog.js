import {validSynchronRelativeLoad} from './synchronStrength.js'
import {synchronReviewProjection} from './synchronReview.js'
import {synchronClock} from './synchron.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const units=new Set(['reps','seconds','meters','calories'])
const qualities=new Set(['confirmed','estimated','unknown'])
const finite=n=>Number.isFinite(n)&&n>=0
const clone=x=>JSON.parse(JSON.stringify(x))
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
// Read only from a trusted, immutable reviewed revision. This is a candidate,
// NOT a write or a reservation. Host must atomically seal the revision and
// reserve a stable per-session/per-member save token before any real RPC.
export function prepareSynchronLog(state,memberId,{expectedRevision,saveToken,workoutDate}={}){
 const fail=issue=>({issue})
 if(state?.phase!=='finished'||!state.review||!state.plan.members.includes(memberId))return fail('Ingen tilgang til resultatet.')
 if(state.seal)return fail('Bruk den reserverte lagringspakken.')
 if(state.revision!==expectedRevision)return fail('Resultatet er endra. Oppdater først.')
 if(!state.plan.members.every(id=>state.review.approved.includes(id)))return fail('Alle deltakarane må godkjenna fordelinga først.')
 if(!uuid.test(saveToken||'')||!validDate(workoutDate))return fail('Lagring krev gyldig dato og reservert lagringstoken.')
 const review=synchronReviewProjection(state,memberId)
 if(!review?.approved||!review.canApprove)return fail('Resultatet er ikkje ferdig kontrollert.')
 const elapsed=synchronClock(state,state.lastAt)
 const rows=review.rows.map(r=>({movement_id:r.movementId,exercise_name:r.name,unit:r.unit,amount:r.value,quality:r.quality,basis:r.basis,estimate_model:r.model??null,assigned_seconds:r.assignedSeconds,segments:r.segments,team_actual:r.teamActual,reconciled:r.reconciled,pr_eligible:false}))
 const completed=state.plan.movements.every(m=>state.totals[m.id]?.actual>=m.target)&&state.events.at(-1)?.type!=='abort'&&!state.events.some(e=>e.type==='finish'&&e.abort===true)
 const result_data={version:3,format:'Chipper',participation_verified:'team',completed,completion_status:completed?'completed':'incomplete',elapsed_seconds:elapsed,synchron_result:{version:1,session_id:state.plan.id,review_revision:state.revision,approved:true,pr_eligible:false,rows,observed_exposure:{version:1,rows:review.observedExposure}}}
 // Do not write estimated reps, holds, loads or machine quantities into the
 // ordinary measured-set or root score columns. Existing analytics must opt in.
 const payload={member_id:memberId,save_token:saveToken,title:String(state.plan.title||'Samspel').slice(0,120),source_wod_id:null,class_live_session_id:null,workout_date:workoutDate,format:'Chipper',rounds:1,score_rounds:null,score_reps:null,score_time_seconds:null,score_load_kg:null,score_calories:null,score_distance:null,score_unit:null,note:'Samspel · individuelt kontrollert resultat',result_data,exercises:[]}
 return {payload:clone(payload),reservation:{sessionId:state.plan.id,memberId,revision:state.revision,saveToken}}
}
// History projection from stored metadata only. No inference from plan targets.
export function synchronHistoryRows(log){
 const data=log?.result_data?.synchron_result
 if(data?.version!==1||data.approved!==true||!Array.isArray(data.rows))return []
 return data.rows.filter(r=>typeof r?.exercise_name==='string'&&units.has(r.unit)&&qualities.has(r.quality)&&finite(r.assigned_seconds)&&(r.quality==='unknown'?r.amount===null:Number.isSafeInteger(r.amount)&&r.amount>=0)).map(r=>({exercise_name:r.exercise_name,unit:r.unit,amount:r.amount,quality:r.quality,assigned_seconds:r.assigned_seconds,team_actual:Number.isSafeInteger(r.team_actual)&&r.team_actual>=0?r.team_actual:null,segments:Array.isArray(r.segments)?r.segments.filter(s=>finite(s?.seconds)&&typeof s.variant==='string'&&(s.loadKg===null||finite(s.loadKg))).map(s=>({seconds:s.seconds,variant:s.variant,loadKg:s.loadKg,...(validSynchronRelativeLoad(s.relativeLoad,s.loadKg)?{relativeLoad:validSynchronRelativeLoad(s.relativeLoad,s.loadKg)}:{})})):[]}))
}
