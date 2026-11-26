// One PT-plan state model shared by coach and member. The database is authoritative.
export const FLOW_MODES = {open:'Open plan',sequence:'I rekkjefølgje',date:'Etter dato'}
export const isFlowTraining = s => !['rest','information'].includes(s.session_kind)
export const flowOrder = (a,b) => (Number(a.week_no)||1)-(Number(b.week_no)||1)||(Number(a.day_no)||1)-(Number(b.day_no)||1)||(Number(a.sequence_no)||0)-(Number(b.sequence_no)||0)||String(a.id).localeCompare(String(b.id))
export function osloDate(now = new Date()) {
 const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
 return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-')
}
export function ptFlowRows(program, sessions=[], today=osloDate()) {
 if(!program?.id)return []
 const mode=program.flow_unlock_mode||'open'
 const rows=sessions.filter(s=>s.program_id===program?.id&&!s.archived_at).sort(flowOrder)
 let blocker=null
 return rows.map(s=>{
  const training=isFlowTraining(s)
  const done=s.status==='completed'
  const waiting=mode==='sequence'&&done&&s.flow_requires_approval&&!s.flow_approved
  let state,reason
  if(!training){state='info';reason=s.session_kind==='rest'?'Kvile':'Infotime'}
  else if(done){state=waiting?'review':'done';reason=waiting?'Ventar på PT-godkjenning':'Gjennomført'}
  else if(program.status!=='active'||program.archived_at||!['planned','in_progress'].includes(s.status)){state='locked';reason='Plan eller økt er ikkje aktiv'}
  else if(s.flow_override){state='ready';reason='Opna av PT'}
  else if(mode==='date'&&(!s.scheduled_date||s.scheduled_date>today)){state='locked';reason=s.scheduled_date?'Opnar '+s.scheduled_date:'PT må setja dato'}
  else if(mode==='sequence'&&blocker){state='locked';reason=blocker.state==='review'?'Ventar på PT-godkjenning':'Fullfør '+blocker.title+' først'}
  else {state='ready';reason=s.status==='in_progress'?'Påbegynt':'Klar'}
  const row={...s,flowState:state,flowReason:reason}
  if(training&&(!done||waiting)&&!blocker)blocker={...row,state}
  return row
 })
}
export const flowStatus = (program,sessions,id,today) => ptFlowRows(program,sessions,today).find(s=>s.id===id)

 // Presentation derives from the same flow rows; never unlocks anything itself.
export function ptNextAction(rows=[]){
 const training=rows.filter(isFlowTraining)
 const ready=training.filter(s=>s.flowState==='ready')
 const next=ready.find(s=>s.status==='in_progress')||ready[0]||null
 const review=training.find(s=>s.flowState==='review')||null
 const blocked=training.find(s=>s.flowState==='locked')||null
 const completed=training.filter(s=>s.status==='completed').length
 return {next,review,blocked,completed,total:training.length,percent:training.length?Math.round(completed/training.length*100):0,state:next?'ready':review?'review':blocked?'locked':training.length?'complete':'empty'}
}
export function ptPreparation(session){
 const snapshot=session?.workout_snapshot||{}
 const clean=value=>typeof value==='string'?value.trim():''
 return {format:clean(snapshot.format),minutes:Number(session?.estimated_minutes||snapshot.duration_minutes)>0?Number(session.estimated_minutes||snapshot.duration_minutes):null,focus:clean(session?.focus_area),note:clean(session?.coach_note),preparation:clean(snapshot.preparation),materials:clean(snapshot.materials)}
}
