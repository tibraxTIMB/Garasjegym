import {ptFlowRows} from './ptFlow.js'

// Calendar dates are civil dates in the garage's timezone, not UTC timestamps.
export const GARAGE_ZONE='Europe/Oslo'
export const DAY_LABELS=['Mån','Tys','Ons','Tor','Fre','Laur','Sun']
export function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false
 const d=new Date(value+'T12:00:00Z')
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value
}
export function osloDay(value=new Date()){
 const d=new Date(value)
 if(!Number.isFinite(d.getTime()))return ''
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:GARAGE_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(p=>[p.type,p.value]))
 return parts.year+'-'+parts.month+'-'+parts.day
}
export function addDays(date,days){
 if(!validDate(date)||!Number.isInteger(days))return ''
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days)
 return d.toISOString().slice(0,10)
}
export function weekStart(date){
 if(!validDate(date))return ''
 return addDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7))
}
export function slotDate(program,week,day){
 if(!Number.isInteger(week)||week<1||week>52||!Number.isInteger(day)||day<1||day>7)return ''
 return addDays(program?.start_date,(week-1)*7+day-1)
}
export function dateSlot(program,date){
 if(!validDate(program?.start_date)||!validDate(date))return null
 const delta=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(program.start_date+'T12:00:00Z'))/86400000)
 if(delta<0||delta>=52*7)return null
 return {week:Math.floor(delta/7)+1,day:delta%7+1}
}
export function planDate(program,session){return validDate(session?.scheduled_date)?session.scheduled_date:slotDate(program,Number(session?.week_no)||1,Number(session?.day_no)||1)}
export function validTime(value){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)}
export function planTime(session){const time=session?.workout_snapshot?.schedule_time;return validTime(time)?time:''}
export function appointmentTime(value){
 const d=new Date(value)
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:GARAGE_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d):''
}
export function planSnapshot(wod,time=''){
 return {id:wod.id,title:wod.name,wod_title:wod.name,format:wod.format,duration_minutes:wod.duration_minutes,movements:wod.movements,notes:wod.notes,timer_settings:wod.timer_settings,...(validTime(time)?{schedule_time:time}:{})}
}
export function makePlanRows({program,existing=[],wods,week,day,date='',time='',note='',memberId}){
 if(!program?.id||program.client_id!==memberId||program.status!=='active'||program.archived_at)throw Error('Vel ein aktiv plan for rett kunde.')
 if(!Number.isInteger(week)||week<1||week>Math.min(Number(program.weeks)||52,52)||!Number.isInteger(day)||day<1||day>7)throw Error('Vel ein dag innanfor treningsplanen.')
 if(date&&!validDate(date)||time&&(!validTime(time)||!date))throw Error('Klokkeslett krev ein gyldig dato.')
 if(date&&program.start_date&&slotDate(program,week,day)!==date)throw Error('Dato og programdag samsvarar ikkje.')
 if(!date&&program.flow_unlock_mode==='date')throw Error('Datostyrt plan krev ein dato.')
 if(!wods.length||new Set(wods.map(w=>w.id)).size!==wods.length||wods.some(w=>!w.id||w.is_archived))throw Error('Vel gyldige WOD-ar.')
 const next=existing.filter(s=>s.program_id===program.id).reduce((max,s)=>Math.max(max,Number(s.sequence_no)||0),0)
 return wods.map((w,i)=>({program_id:program.id,sequence_no:next+i+1,title:w.name,wod_id:w.id,week_no:week,day_no:day,scheduled_date:date||null,session_kind:'training',estimated_minutes:Number(w.duration_minutes)>0?Number(w.duration_minutes):null,workout_snapshot:planSnapshot(w,time),coach_note:note.trim(),status:'planned'}))
}
export function makeDirectRows({memberId,actorId,wods,deadline='',appointment=null,scheduleDate='',scheduleTime='',note='',location='Valfritt'}){
 if(!memberId||!actorId||!wods.length||new Set(wods.map(w=>w.id)).size!==wods.length||wods.some(w=>!w.id||w.is_archived))throw Error('Vel kunde og gyldige WOD-ar.')
 if(deadline&&!validDate(deadline))throw Error('Vel ein gyldig frist.')
 if(scheduleDate&&!validDate(scheduleDate)||scheduleTime&&(!scheduleDate||!validTime(scheduleTime))||appointment&&(scheduleDate||scheduleTime))throw Error('Vel gyldig tidspunkt utan dobbel booking.')
 if(appointment&&(appointment.client_id!==memberId||!appointment.id||!['planned','published'].includes(appointment.status)||!osloDay(appointment.starts_at)))throw Error('Vel ei gyldig PT-avtale for kunden.')
 return wods.map(w=>({member_id:memberId,wod_id:w.id,assigned_by:actorId,due_date:deadline||null,linked_session_id:appointment?.id||null,...(scheduleDate?{scheduled_date:scheduleDate,scheduled_time:scheduleTime||null}:{}),location,coach_note:note.trim(),status:'assigned'}))
}
export function calendarEntries({program,plan=[],assignments=[],appointments=[],classes=[]}={}){
 const linked=new Map(appointments.map(a=>[a.id,a]))
 return [
  ...plan.filter(s=>!s.archived_at).map(s=>({key:'plan:'+s.id,kind:'plan',date:planDate(program,s),time:planTime(s),title:s.title,status:s.flowState||s.status,minutes:s.estimated_minutes,row:s})),
  ...assignments.filter(a=>a.status!=='cancelled').map(a=>{const p=linked.get(a.linked_session_id),scheduled=validDate(a.scheduled_date);return {key:'assignment:'+a.id,kind:'assignment',date:p?osloDay(p.starts_at):scheduled?a.scheduled_date:a.due_date||'',time:p?appointmentTime(p.starts_at):scheduled&&validTime(String(a.scheduled_time||'').slice(0,5))?String(a.scheduled_time).slice(0,5):'',title:a.wods?.name||'Tildelt WOD',status:a.status,minutes:a.wods?.duration_minutes,deadline:!p&&!scheduled&&!!a.due_date,dueDate:validDate(a.due_date)?a.due_date:'',row:a}}),
  ...appointments.filter(a=>a.status!=='cancelled').map(a=>({key:'appointment:'+a.id,kind:'appointment',date:osloDay(a.starts_at),time:appointmentTime(a.starts_at),title:a.title||'PT-time',status:a.status,minutes:a.duration_minutes,row:a})),
  ...classes.filter(a=>!a.cancelled_at).map(a=>({key:'class:'+(a.booking_id||a.id),kind:'class',date:osloDay(a.starts_at),time:appointmentTime(a.starts_at),title:a.title||'Gruppetime',status:'booked',minutes:a.duration_minutes,row:a}))
 ]
}
export function entriesForDay(entries,date){
 return entries.filter(e=>e.date===date).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'nn'))
}
export function canMovePlan(session){return session?.status==='planned'&&!session.workout_log_id&&!session.archived_at&&!session.workout_snapshot?.pt_equivalent}

export function canMoveDirect(assignment){return assignment?.status==='assigned'&&!assignment.workout_log_id&&!assignment.linked_session_id&&Object.hasOwn(assignment,'scheduled_date')}

// Member calendar derives program access from the same full ordered plan as MyTraining.
// Do not slice to the visible month before computing sequence locks.
export function memberPlanCalendarEntries(program,sessions=[],today=osloDay()){
 if(program?.status!=='active'||program.archived_at)return []
 return calendarEntries({program,plan:ptFlowRows(program,sessions,today)})
  .filter(e=>e.date&&e.kind==='plan')
  .map(e=>({...e,canStart:e.row.flowState==='ready',reason:e.row.flowReason}))
}

// Same civil-date validation for individual plan entries and bulk scheduling.
export function resolvePlanSlot(program,{week,day,date='',time=''}={}){
 const limit=Math.min(Number(program?.weeks)||52,52)
 if(!program?.id||!Number.isInteger(week)||week<1||week>limit||!Number.isInteger(day)||day<1||day>7)throw Error('Vel ein dag innanfor treningsplanen.')
 if(date&&!validDate(date)||time&&!validTime(time))throw Error('Vel gyldig dato og klokkeslett.')
 const expected=slotDate(program,week,day)
 if(expected&&date&&expected!==date)throw Error('Dato og programdag samsvarar ikkje.')
 const scheduledDate=date||expected||''
 if(!scheduledDate&&(time||program.flow_unlock_mode==='date'))throw Error('Vel dato før klokkeslett eller datostyrt trening.')
 return {week,day,date:scheduledDate,time:time||''}
}
