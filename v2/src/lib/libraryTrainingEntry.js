import {validDate,validTime,osloDay,appointmentTime} from './ptSchedule.js'
// Convert a civil Oslo date to an unambiguous instant. Reject DST gaps/overlaps.
export function libraryAppointmentStart(date,time,now=Date.now()){
 if(!validDate(date)||!validTime(time))throw Error('Vel dato og klokkeslett.')
 const nominal=Date.parse(date+'T'+time+':00Z')
 const matches=[60,120].map(offset=>new Date(nominal-offset*60000)).filter(d=>osloDay(d)===date&&appointmentTime(d)===time)
 if(matches.length!==1)throw Error('Vel eit eintydig klokkeslett (sommar-/vintertid).')
 if(matches[0].getTime()<=now)throw Error('Vel eit framtidig tidspunkt.')
 return matches[0].toISOString()
}
export function libraryAppointmentRow({id,wod,memberId,actorId,date,time,duration},now=Date.now()){
 if(!id||!wod?.id||wod.is_archived||!memberId||!actorId||memberId===actorId)throw Error('Vel ein aktiv WOD og ein kunde.')
 const minutes=Number(duration)
 if(!Number.isInteger(minutes)||minutes<5||minutes>240)throw Error('Vel 5–240 minutt.')
 return {id,client_id:memberId,title:wod.name,starts_at:libraryAppointmentStart(date,time,now),duration_minutes:minutes,capacity:1,status:'planned',created_by:actorId,wod_ids:[wod.id],message:'Felles trening · PT'}
}
export function sameLibraryAppointment(row,expected){
 return !!row&&row.id===expected.id&&row.client_id===expected.client_id&&row.created_by===expected.created_by&&Date.parse(row.starts_at)===Date.parse(expected.starts_at)&&row.duration_minutes===expected.duration_minutes&&row.status==='planned'&&Array.isArray(row.wod_ids)&&row.wod_ids.length===1&&row.wod_ids[0]===expected.wod_ids[0]
}
