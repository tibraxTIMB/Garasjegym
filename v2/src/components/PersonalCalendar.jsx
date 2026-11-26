import {useEffect,useMemo,useRef,useState} from 'react'
import {CalendarDays,ChevronLeft,ChevronRight,LoaderCircle} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {isStaff} from '../lib/auth.js'
import {localCalendarDay,monthCalendarCells,weekCalendarDays} from '../lib/calendarView.js'
import {calendarEntries} from '../lib/ptSchedule.js'

const eventTypes={class:'Gruppetime',pt:'PT-time',assigned:'Tildelt WOD',completed:'Utført økt',meeting:'Avtale'}
const dateFromKey=key=>new Date(key+'T12:00:00')
const timeOf=value=>value?new Date(value).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'}):''

export default function PersonalCalendar({profile,onOpenClass=()=>{},onOpenPT=()=>{},onOpenAssignment=()=>{},onOpenClasses=()=>{}}) {
 const [cursor,setCursor]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
 const [selectedDay,setSelectedDay]=useState(()=>localCalendarDay(new Date()))
 const [view,setView]=useState('month')
 const [events,setEvents]=useState([])
 const [loading,setLoading]=useState(true),[error,setError]=useState('')
 const [reload,setReload]=useState(0)
 const sequence=useRef(0)
 const today=localCalendarDay(new Date())

 useEffect(()=>{
  let live=true
  const request=++sequence.current
  async function load() {
   setLoading(true);setError('')
   try {
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError||!user)throw authError||new Error('Logg inn for å sjå kalenderen.')
    const userId=user.id
    const beginning=new Date(cursor.getFullYear(),cursor.getMonth()-1,1)
    const ending=new Date(cursor.getFullYear(),cursor.getMonth()+2,1)
    const lower=beginning.toISOString(),upper=ending.toISOString()
    const lowerDay=localCalendarDay(beginning),upperDay=localCalendarDay(ending)
    const staff=isStaff(profile)
    const [classBookings,createdClasses,ptBookings,ownPT,assignments,workouts,appointments]=await Promise.all([
     supabase.from('class_bookings').select('id,class_id,status,classes(id,title,starts_at,duration_minutes,cancelled_at,cancellation_note)').eq('member_id',userId).in('status',['confirmed','pending','waitlist']).limit(300),
     staff?supabase.from('classes').select('id,title,starts_at,duration_minutes,cancelled_at').gte('starts_at',lower).lt('starts_at',upper).or(`created_by.eq.${userId},instructor_id.eq.${userId}`):Promise.resolve({data:[],error:null}),
     supabase.from('pt_bookings').select('id,session_id,status').eq('member_id',userId).in('status',['booked','waitlist']).limit(300),
     (staff?supabase.from('pt_sessions').select('id,title,client_id,starts_at,duration_minutes,status,created_by').gte('starts_at',lower).lt('starts_at',upper).or(`client_id.eq.${userId},created_by.eq.${userId}`):supabase.from('pt_sessions').select('id,title,client_id,starts_at,duration_minutes,status,created_by').eq('client_id',userId).gte('starts_at',lower).lt('starts_at',upper)),
     supabase.from('pt_wod_assignments').select('*,wods(id,name,format,duration_minutes)').eq('member_id',userId).in('status',['assigned','in_progress']).limit(300),
     supabase.from('workout_logs').select('id,title,workout_date,format').eq('member_id',userId).gte('workout_date',lowerDay).lt('workout_date',upperDay).limit(300),
     staff?supabase.from('calendar_events').select('id,title,event_type,starts_at,ends_at,client_id,created_by').gte('starts_at',lower).lt('starts_at',upper).or(`client_id.eq.${userId},created_by.eq.${userId}`):Promise.resolve({data:[],error:null})
    ])
    const bookedIds=[...new Set((ptBookings.data||[]).map(b=>b.session_id).filter(Boolean))]
    const bookedPT=bookedIds.length?await supabase.from('pt_sessions').select('id,title,starts_at,duration_minutes,status,client_id').in('id',bookedIds):{data:[],error:null}
    if(!live||request!==sequence.current)return
    const failures=[classBookings,createdClasses,ptBookings,ownPT,assignments,workouts,appointments,bookedPT].filter(result=>result.error).map(result=>result.error.message)
    setError(failures.length?'Nokre avtalar kunne ikkje hentast. Sjekk tilkoplinga og prøv igjen.':'')
    const items=[]
    const seenClassIds=new Set()
    for(const booking of classBookings.data||[]) {
     const c=booking.classes
     if(!c?.starts_at)continue
     seenClassIds.add(c.id)
     items.push({id:'class-'+booking.id,type:'class',title:c.title||'Gruppetime',date:localCalendarDay(c.starts_at),time:timeOf(c.starts_at),detail:c.cancelled_at?'Avlyst':booking.status==='waitlist'?'Venteliste':`${c.duration_minutes||60} min`,classId:booking.class_id})
    }
    for(const c of createdClasses.data||[]) {
     if(!c.starts_at||seenClassIds.has(c.id))continue
     items.push({id:'class-owned-'+c.id,type:'class',title:c.title||'Gruppetime',date:localCalendarDay(c.starts_at),time:timeOf(c.starts_at),detail:c.cancelled_at?'Avlyst':`${c.duration_minutes||60} min`,classId:c.id})
    }
    const ptStatus=new Map((ptBookings.data||[]).map(booking=>[booking.session_id,booking.status]))
    const uniquePT=new Map([...(ownPT.data||[]),...(bookedPT.data||[])].map(row=>[row.id,row]))
    for(const session of uniquePT.values()) {
     if(!session.starts_at)continue
     items.push({id:'pt-'+session.id,type:'pt',title:session.title||'PT-time',date:localCalendarDay(session.starts_at),time:timeOf(session.starts_at),detail:session.status==='cancelled'?'Avlyst':ptStatus.get(session.id)==='waitlist'?'Venteliste':`${session.duration_minutes||60} min`,clientId:session.client_id})
    }
    for(const entry of calendarEntries({assignments:assignments.data||[],appointments:[...uniquePT.values()]}).filter(e=>e.kind==='assignment'&&e.date)) {
     const assignment=entry.row
     const timing=entry.deadline?'Frist':assignment.linked_session_id?'PT-avtale':'Planlagd'
     const due=!entry.deadline&&entry.dueDate?' · Frist '+entry.dueDate:''
     items.push({id:'assigned-'+assignment.id,type:'assigned',title:entry.title,date:entry.date,time:entry.time,detail:timing+' · '+(assignment.wods?.format||'WOD')+due,wodId:assignment.wods?.id,assignmentId:assignment.id})
    }
    for(const workout of workouts.data||[]) {
     if(!workout.workout_date)continue
     items.push({id:'completed-'+workout.id,type:'completed',title:workout.title||'Treningsøkt',date:localCalendarDay(workout.workout_date),time:'',detail:workout.format||'Gjennomført trening'})
    }
    for(const appointment of appointments.data||[]) {
     if(!appointment.starts_at)continue
     items.push({id:'meeting-'+appointment.id,type:'meeting',title:appointment.title||'Avtale',date:localCalendarDay(appointment.starts_at),time:timeOf(appointment.starts_at),detail:'Avtale'})
    }
    setEvents(items.filter(item=>item.date>=lowerDay&&item.date<upperDay).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)))
   }catch(loadError) {if(live&&request===sequence.current)setError('Kalenderen kunne ikkje hentast. Sjekk tilkoplinga og prøv igjen.')}
   finally {if(live&&request===sequence.current)setLoading(false)}
  }
  load()
  return()=>{live=false;sequence.current++}
 },[cursor.getFullYear(),cursor.getMonth(),profile?.role,reload])

 const grouped=useMemo(()=>events.reduce((acc,event)=>{(acc[event.date]||=[]).push(event);return acc},{}),[events])
 const currentDate=dateFromKey(selectedDay)
 const visibleDays=view==='week'?weekCalendarDays(currentDate):view==='day'?[currentDate]:monthCalendarCells(cursor.getFullYear(),cursor.getMonth())
 const selectedEvents=grouped[selectedDay]||[]
 const periodTitle=view==='month'?cursor.toLocaleDateString('nn-NO',{month:'long',year:'numeric'}):view==='week'?`${weekCalendarDays(currentDate)[0].toLocaleDateString('nn-NO',{day:'numeric',month:'short'})} – ${weekCalendarDays(currentDate)[6].toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'})}`:currentDate.toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})

 function changePeriod(direction) {
  const date=new Date(currentDate)
  if(view==='month') {
   const next=new Date(cursor.getFullYear(),cursor.getMonth()+direction,1)
   date.setFullYear(next.getFullYear(),next.getMonth(),Math.min(date.getDate(),new Date(next.getFullYear(),next.getMonth()+1,0).getDate()))
  } else date.setDate(date.getDate()+direction*(view==='week'?7:1))
  setSelectedDay(localCalendarDay(date))
  setCursor(new Date(date.getFullYear(),date.getMonth(),1))
 }
 function jumpToday() {const date=new Date();setSelectedDay(localCalendarDay(date));setCursor(new Date(date.getFullYear(),date.getMonth(),1))}
 function chooseDay(date) {setSelectedDay(localCalendarDay(date));setCursor(new Date(date.getFullYear(),date.getMonth(),1))}
 function openEvent(event) {if(event.type==='class')onOpenClass(event.classId);else if(event.type==='pt')onOpenPT(event.clientId);else if(event.type==='assigned'&&event.wodId)onOpenAssignment(event.wodId,event.assignmentId)}

 return <section className="gg-personal-calendar" aria-label="Min timeplan">
  <header className="gg-cal-intro"><div><span className="section-kicker">MI TIMEPLAN</span><h3>Kalender</h3><p>PT-timar, påmeldingar og trening samla på éin stad.</p></div><div><CalendarDays size={25} aria-hidden="true"/><button type="button" className="secondary-button" onClick={onOpenClasses}>Sjå og meld deg på gruppetimar</button></div></header>
  <div className="gg-cal-controls">
   <div className="gg-cal-period"><button type="button" aria-label="Førre periode" onClick={()=>changePeriod(-1)}><ChevronLeft size={20}/></button><strong>{periodTitle}</strong><button type="button" aria-label="Neste periode" onClick={()=>changePeriod(1)}><ChevronRight size={20}/></button><button type="button" className="gg-cal-today-jump" onClick={jumpToday}>I dag</button></div>
   <div className="gg-cal-modes" role="group" aria-label="Kalendervisning">{[['month','Månad'],['week','Veke'],['day','Dag']].map(([key,label])=><button key={key} type="button" className={view===key?'selected':''} aria-pressed={view===key} onClick={()=>setView(key)}>{label}</button>)}</div>
  </div>
  <div className="gg-cal-legend"><span><i className="gg-cal-dot class"/>Gruppetime</span><span><i className="gg-cal-dot pt"/>PT</span><span><i className="gg-cal-dot assigned"/>Planlagt</span><span><i className="gg-cal-dot completed"/>Utført</span></div>
  {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar timeplan …</div>:<div className={'gg-cal-board gg-cal-board--'+view}>
   {view!=='day'&&<div className="gg-cal-weekdays">{['Mån','Tys','Ons','Tor','Fre','Lau','Søn'].map(day=><span key={day}>{day}</span>)}</div>}
   <div className="gg-cal-days">{visibleDays.map((date,index)=>{
    if(!date)return <div className="gg-cal-blank" key={'blank-'+index}/>
    const key=localCalendarDay(date),dayEvents=grouped[key]||[]
    return <button type="button" key={key} className={'gg-cal-date'+(key===today?' is-today':'')+(key===selectedDay?' is-selected':'')} aria-current={key===today?'date':undefined} aria-pressed={key===selectedDay} aria-label={`${date.toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})}, ${dayEvents.length} aktivitetar`} onClick={()=>chooseDay(date)}><strong>{date.getDate()}</strong><span className="gg-cal-markers">{dayEvents.slice(0,4).map(event=><i key={event.id} className={'gg-cal-dot '+event.type}/>)}{dayEvents.length>4&&<small>+{dayEvents.length-4}</small>}</span><span className="gg-cal-day-preview">{dayEvents.slice(0,2).map(event=><span className={'gg-cal-preview '+event.type} key={event.id}>{event.time&&event.time+' '}{event.title}</span>)}</span></button>
   })}</div>
  </div>}
  {error&&<div className="gg-cal-error auth-error" role="alert"><span>{error}</span><button type="button" className="secondary-button" onClick={()=>setReload(value=>value+1)}>Prøv igjen</button></div>}
  <div className="gg-cal-agenda"><h4>{currentDate.toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}<span>{selectedEvents.length} aktivitetar</span></h4>{selectedEvents.length?selectedEvents.map(event=><article className={'gg-cal-agenda-item '+event.type} key={event.id}><span className="gg-cal-agenda-time">{event.time||<CalendarDays size={16}/>}</span><div><strong>{event.title}</strong><small>{eventTypes[event.type]} · {event.detail}</small></div>{(['class','pt'].includes(event.type)||(event.type==='assigned'&&event.wodId&&event.assignmentId))&&<button type="button" onClick={()=>openEvent(event)}>{event.type==='assigned'?'Opne WOD':'Opne'}</button>}</article>):!loading&&<p className="gg-cal-agenda-empty">Ingen aktivitetar denne dagen.</p>}</div>
 </section>
}
