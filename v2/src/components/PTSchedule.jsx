import {useEffect,useMemo,useRef,useState} from 'react'
import {CalendarDays,ChevronLeft,ChevronRight,Plus,X,Clock3} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import WodPicker from './WodPicker.jsx'
import {addDays,osloDay,weekStart,slotDate,dateSlot,validDate,validTime,planDate,planTime,calendarEntries,entriesForDay,makePlanRows,makeDirectRows,canMovePlan,appointmentTime} from '../lib/ptSchedule.js'
import './pt-schedule.css'

const STATUS={planned:'Planlagd',assigned:'Tildelt',in_progress:'Påbegynt',completed:'Utført',done:'Utført',ready:'Klar',review:'Til vurdering',locked:'Låst',published:'Avtalt',booked:'Påmeld'}
const KIND={plan:'Programøkt',assignment:'Tildelt WOD',appointment:'PT-avtale',class:'Gruppetime'}
const fmt=d=>validDate(d)?new Date(d+'T12:00:00Z').toLocaleDateString('nn-NO',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}):''
export function PTWeekCalendar({program,plan=[],assignments=[],appointments=[],classes=[],onAdd,onOpen,onMove,canOpen=()=>true,initialDate}){
 const [start,setStart]=useState(()=>weekStart(initialDate||osloDay()))
 const entries=useMemo(()=>calendarEntries({program,plan,assignments,appointments,classes}),[program,plan,assignments,appointments,classes])
 const days=Array.from({length:7},(_,i)=>addDays(start,i))
 const undated=entries.filter(e=>!e.date)
 const overdue=entries.filter(e=>e.deadline&&e.date<osloDay()&&['assigned','in_progress'].includes(e.status))
 function card(e){return <article className={'gg-schedule-entry gg-schedule-'+e.kind} key={e.key}>
  <div className="gg-schedule-copy"><small>{e.time&&e.time+' · '}{e.deadline?'Frist':KIND[e.kind]}{e.minutes?' · '+e.minutes+' min':''}</small><strong>{e.title}</strong><small>{STATUS[e.status]||e.status}</small></div>
  <div className="gg-schedule-actions">{onOpen&&canOpen(e)&&<button type="button" className="secondary-button" onClick={()=>onOpen(e)} aria-label={'Opna '+e.title}>Opna</button>}{onMove&&e.kind==='plan'&&canMovePlan(e.row)&&<button type="button" className="text-button" onClick={()=>onMove(e.row)} aria-label={'Flytt '+e.title}>Flytt</button>}</div>
 </article>}
 return <section className="gg-schedule" aria-label="Treningskalender">
  <div className="gg-schedule-head"><h3><CalendarDays size={18}/> Treningskalender</h3><button type="button" className="text-button" onClick={()=>setStart(weekStart(osloDay()))}>I dag</button></div>
  <div className="gg-schedule-week"><button type="button" className="secondary-button" aria-label="Førre veke" onClick={()=>setStart(addDays(start,-7))}><ChevronLeft size={18}/></button><strong>{fmt(start)} – {fmt(addDays(start,6))}</strong><button type="button" className="secondary-button" aria-label="Neste veke" onClick={()=>setStart(addDays(start,7))}><ChevronRight size={18}/></button></div>
  <div className="gg-schedule-days">{days.map(date=><div key={date} className={'gg-schedule-day'+(date===osloDay()?' today':'')}><div className="gg-schedule-date"><strong>{fmt(date)}</strong>{onAdd&&<button type="button" className="text-button" aria-label={'Legg til økt '+date} onClick={()=>onAdd(date)}><Plus size={17}/></button>}</div><div>{entriesForDay(entries,date).map(card)}{!entriesForDay(entries,date).length&&<small className="gg-schedule-empty">Ingen økter</small>}</div></div>)}</div>
  {!!overdue.length&&<details><summary>Passerte fristar ({overdue.length})</summary>{overdue.map(card)}</details>}
  {!!undated.length&&<details><summary>Utan dato ({undated.length})</summary>{undated.map(card)}</details>}
  <small>Datoar er i garasjen si tidssone (Oslo). Frist er ikkje ein avtale.</small>
 </section>
}
export function PTScheduleDialog({clientId,clientName,program,existing=[],wods=[],appointments=[],initialDate='',initialMode,onClose,onSaved}){
 const [mode,setMode]=useState(initialMode||(program&&initialDate?'plan':'free'))
 const [date,setDate]=useState(initialDate||osloDay()),[time,setTime]=useState(''),[week,setWeek]=useState(()=>String(dateSlot(program,initialDate||osloDay())?.week||1)),[day,setDay]=useState(()=>String(dateSlot(program,initialDate||osloDay())?.day||1))
 const [appointmentId,setAppointmentId]=useState(''),[ids,setIds]=useState([]),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[choose,setChoose]=useState(true)
 const lock=useRef(false)
 const eligible=appointments.filter(a=>a.client_id===clientId&&['planned','published'].includes(a.status)&&a.starts_at&&osloDay(a.starts_at)>=osloDay())
 const chosen=ids.map(id=>wods.find(w=>w.id===id)).filter(Boolean),planSlotDate=slotDate(program,Number(week),Number(day))
 const setPlanDate=d=>{setDate(d);const slot=dateSlot(program,d);if(slot){setWeek(String(slot.week));setDay(String(slot.day))}}
 const setSlot=(w,d)=>{setWeek(w);setDay(d);const next=slotDate(program,Number(w),Number(d));if(next)setDate(next)}
 useEffect(()=>{if(mode==='plan'&&program?.start_date&&planSlotDate)setDate(planSlotDate)},[mode,program?.id,planSlotDate])
 async function save(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError('')
  try{
   const {data:{user},error:auth}=await supabase.auth.getUser();if(auth||!user)throw Error('Logg inn på nytt.')
   if(!ids.length||chosen.length!==ids.length)throw Error('Vel WOD-ar frå biblioteket.')
   let rows,table
   if(mode==='plan'){
    const {data:p,error:pe}=await supabase.from('pt_programs').select('id,client_id,status,archived_at,start_date,weeks,flow_unlock_mode').eq('id',program?.id).eq('client_id',clientId).eq('status','active').is('archived_at',null).single()
    if(pe||!p)throw pe||Error('Planen er ikkje lenger aktiv.')
    const {data:s,error:se}=await supabase.from('pt_program_sessions').select('program_id,sequence_no').eq('program_id',p.id)
    if(se)throw se
    rows=makePlanRows({program:p,existing:s||[],wods:chosen,week:Number(week),day:Number(day),date:date||'',time,note,memberId:clientId})
    table='pt_program_sessions'
   }else{
    let appointment=null
    if(mode==='appointment'){
     if(!eligible.some(a=>a.id===appointmentId))throw Error('Vel ein eksisterande PT-avtale.')
     const {data:fresh,error:pe}=await supabase.from('pt_sessions').select('id,client_id,status,starts_at').eq('id',appointmentId).eq('client_id',clientId).in('status',['planned','published']).maybeSingle()
     if(pe||!fresh||new Date(fresh.starts_at)<=new Date())throw pe||Error('PT-avtalen er ikkje lenger tilgjengeleg. Oppdater planen.')
     appointment=fresh
    }
    if(mode==='deadline'&&!validDate(date))throw Error('Vel ein gyldig frist.')
    const {data:active,error:ae}=await supabase.from('pt_wod_assignments').select('id,wod_id').eq('member_id',clientId).in('status',['assigned','in_progress']).in('wod_id',ids)
    if(ae)throw ae
    if(active?.length)throw Error('Minst éin vald WOD er allereie aktivt tildelt. Bruk programøkter for planlagde gjentakingar.')
    rows=makeDirectRows({memberId:clientId,actorId:user.id,wods:chosen,deadline:mode==='deadline'?date:'',appointment,note})
    table='pt_wod_assignments'
   }
   const {data:inserted,error:e}=await supabase.from(table).insert(rows).select('id')
   if(e||!Array.isArray(inserted)||inserted.length!==rows.length)throw e||Error('Lagringa vart ikkje stadfesta. Kontroller planen før du prøver igjen.')
   onSaved?.(rows.length,mode)
  }catch(e){setError(e.message||'Kunne ikkje lagra tildelinga.')}finally{lock.current=false;setBusy(false)}
 }
 return <div className="pt2-modal-backdrop gg-schedule-backdrop"><section className="pt2-modal gg-schedule-dialog" role="dialog" aria-modal="true" aria-label={'Tildel WOD til '+clientName}>
  <header className="gg-schedule-head"><div><h3>Tildel WOD</h3><small>Mottakar: <b>{clientName}</b></small></div><button type="button" className="icon-button" aria-label="Lukk tildeling" disabled={busy} onClick={onClose}><X size={20}/></button></header>
  {choose?<WodPicker compact wods={wods} selectedIds={ids} multiple onChange={v=>{setIds(v);if(v.length)setChoose(false)}} onCancel={onClose} title="Vel ein eller fleire WOD-ar" hint="Gjenbruk frå biblioteket – ingen kopiar."/>:<>
   <div className="gg-schedule-selection"><strong>{chosen.map(w=>w.name).join(' · ')}</strong><button type="button" className="text-button" disabled={busy} onClick={()=>setChoose(true)}>Endra val</button></div>
   <label>Når og korleis?<select aria-label="Tildelingstype" value={mode} disabled={busy} onChange={e=>setMode(e.target.value)}><option value="free">Valfri dag – utan frist</option><option value="deadline">Gjennomfør innan dato</option><option value="appointment">Knytt til eksisterande PT-avtale</option>{program&&<option value="plan">Plasser i treningsplan</option>}</select></label>
   {mode==='deadline'&&<label>Frist<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}
   {mode==='appointment'&&<label>PT-avtale<select value={appointmentId} onChange={e=>setAppointmentId(e.target.value)}><option value="">Vel dato og klokkeslett</option>{eligible.map(a=><option key={a.id} value={a.id}>{fmt(osloDay(a.starts_at))} kl. {appointmentTime(a.starts_at)} · {a.title}</option>)}</select>{!eligible.length&&<small>Ingen framtidige PT-avtalar. Opprett avtalen i PT-timar først.</small>}</label>}
   {mode==='plan'&&program&&<><strong>{program.title}</strong><div className="gg-schedule-fields"><label>Programveke<input type="number" min="1" max={program.weeks||52} value={week} onChange={e=>setSlot(e.target.value,day)}/></label><label>Dag i programveka<select value={day} onChange={e=>setSlot(week,e.target.value)}>{[1,2,3,4,5,6,7].map(d=><option key={d} value={d}>Dag {d}</option>)}</select></label></div><div className="gg-schedule-fields"><label>Dato{program.start_date?<input type="date" value={date} onChange={e=>setPlanDate(e.target.value)}/>:<input type="date" value={date} onChange={e=>setDate(e.target.value)}/>}</label><label>Klokkeslett (valfritt)<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><small>Programdag 1 er startdatoen for kvar programveke. Klokkeslett er planlagt trening, ikkje ei PT-booking.</small></>}
   <label>PT-notat (valfritt)<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <div className="gg-schedule-selection"><small>{chosen.length} WOD-ar · {clientName} · {mode==='plan'?'Treningsplan':mode==='deadline'?'Frist '+date:mode==='appointment'?'PT-avtale':'Valfri dag'}</small></div>
   <button type="button" className="primary-button" disabled={busy||!chosen.length} onClick={save}>{busy?'Lagrar …':'Stadfest tildeling'}</button>
  </>}
  {error&&<p role="alert" className="auth-error">{error}</p>}
 </section></div>
}
export function PTMoveDialog({program,session,clientId,onClose,onSaved}){
 const [date,setDate]=useState(()=>planDate(program,session)),[time,setTime]=useState(()=>planTime(session)),[week,setWeek]=useState(String(session.week_no||1)),[day,setDay]=useState(String(session.day_no||1)),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false)
 const changeDate=d=>{setDate(d);const s=dateSlot(program,d);if(s){setWeek(String(s.week));setDay(String(s.day))}}
 const changeSlot=(w,d)=>{setWeek(w);setDay(d);if(program.start_date)setDate(slotDate(program,Number(w),Number(d)))}
 async function save(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError('')
  try{
   if(!canMovePlan(session)||program.client_id!==clientId)throw Error('Berre framtidige, ikkje påbegynte økter kan flyttast.')
   if(!Number.isInteger(Number(week))||Number(week)<1||Number(week)>Math.min(Number(program.weeks)||52,52)||!Number.isInteger(Number(day))||Number(day)<1||Number(day)>7)throw Error('Vel ein dag innanfor planen.')
   if(date&&!validDate(date)||time&&(!date||!validTime(time))||program.start_date&&slotDate(program,Number(week),Number(day))!==date)throw Error('Dato og programdag må samsvara.')
   if(!date&&program.flow_unlock_mode==='date')throw Error('Datostyrt plan krev dato.')
   const {data:fresh,error:fe}=await supabase.from('pt_program_sessions').select('id,program_id,status,archived_at,workout_log_id,workout_snapshot,updated_at').eq('id',session.id).eq('program_id',program.id).single()
   if(fe||!canMovePlan(fresh)||fresh.updated_at!==session.updated_at)throw Error('Økta er endra. Opna planen på nytt.')
   const snapshot={...fresh.workout_snapshot};delete snapshot.schedule_time;if(time)snapshot.schedule_time=time
   const {data,error:e}=await supabase.from('pt_program_sessions').update({week_no:Number(week),day_no:Number(day),scheduled_date:date||null,workout_snapshot:snapshot}).eq('id',session.id).eq('program_id',program.id).eq('status','planned').eq('updated_at',fresh.updated_at).is('workout_log_id',null).is('archived_at',null).select('id').maybeSingle()
   if(e||!data)throw e||Error('Økta vart ikkje flytta.')
   onSaved?.()
  }catch(e){setError(e.message||'Kunne ikkje flytta økta.')}finally{lock.current=false;setBusy(false)}
 }
 return <div className="pt2-modal-backdrop gg-schedule-backdrop"><section className="pt2-modal gg-schedule-dialog" role="dialog" aria-modal="true" aria-label="Flytt planøkt"><header className="gg-schedule-head"><div><h3>Flytt økt</h3><small>{session.title}</small></div><button className="icon-button" aria-label="Avbryt flytting" disabled={busy} onClick={onClose}><X size={18}/></button></header><div className="gg-schedule-fields"><label>Programveke<input type="number" min="1" max={program.weeks||52} value={week} onChange={e=>changeSlot(e.target.value,day)}/></label><label>Dag<select value={day} onChange={e=>changeSlot(week,e.target.value)}>{[1,2,3,4,5,6,7].map(d=><option key={d} value={d}>{d}</option>)}</select></label><label>Dato<input type="date" value={date} onChange={e=>changeDate(e.target.value)}/></label><label>Klokkeslett<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>{error&&<p className="auth-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy} onClick={save}>{busy?'Lagrar …':'Lagre tidspunkt'}</button></section></div>
}
