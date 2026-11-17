import {useEffect,useMemo,useState} from 'react'
import {UserRound,Trophy,Activity,LoaderCircle,CalendarDays,Mail,ShieldCheck,ChevronLeft,ChevronRight,Trash2,List,Calendar,Clock} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const dateKey = value => {
 if(!value)return ''
 if(/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return value
 const d=new Date(value)
 return Number.isNaN(d.getTime())?'':[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
}
const monthLabel = date => date.toLocaleDateString('nn-NO',{month:'long',year:'numeric'})
const prettyDate = value => value?new Date(value+'T12:00:00').toLocaleDateString('nn-NO',{day:'numeric',month:'long',year:'numeric'}):'Dato ikkje sett'

export default function MyPage({profile,email,onOpenWorkout}){
 const [logs,setLogs]=useState([]),[prs,setPrs]=useState([]),[bookings,setBookings]=useState([]),[assignments,setAssignments]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selectedExercise,setSelectedExercise]=useState(''),[historyView,setHistoryView]=useState('list'),[calendarMonth,setCalendarMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1)),[selectedDay,setSelectedDay]=useState(dateKey(new Date())),[selectedEvent,setSelectedEvent]=useState(null),[deleting,setDeleting]=useState('')
 const load=async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setLoading(false);return}
  const [l,p,b,a]=await Promise.all([
   supabase.from('workout_logs').select('id,title,workout_date,format,score_rounds,score_reps,note,created_at,workout_exercises(exercise_name,workout_sets(load_kg,reps))').order('workout_date',{ascending:false}).limit(200),
   supabase.from('personal_records').select('id,exercise_name,result,unit,record_date').order('record_date',{ascending:false}).limit(100),
   supabase.from('class_bookings').select('id,status,classes(id,title,starts_at,duration_minutes)').eq('member_id',user.id).eq('status','confirmed').limit(200),
   supabase.from('pt_wod_assignments').select('id,status,due_date,wods(name,format,duration_minutes)').eq('member_id',user.id).in('status',['assigned','in_progress','completed']).limit(200)
  ])
  if(l.error)setError(l.error.message);else setLogs(l.data||[])
  if(p.error)setError(p.error.message);else setPrs(p.data||[])
  if(b.error)setError(b.error.message);else setBookings((b.data||[]).filter(x=>x.classes))
  if(a.error)setError(a.error.message);else setAssignments((a.data||[]).filter(x=>x.wods))
  setLoading(false)
 }
 useEffect(()=>{let live=true;async function run(){await load()}run();return()=>{live=false}},[])
 const deleteWorkout=async log=>{
  if(!window.confirm('Vil du slette «'+(log.title||'Treningsøkt')+'»? Økta og tilhøyrande resultat blir fjerna.'))return
  setDeleting(String(log.id));setError('')
  const {error:deleteError}=await supabase.from('workout_logs').delete().eq('id',log.id)
  if(deleteError)setError('Økta blei ikkje sletta: '+deleteError.message)
  else setLogs(current=>current.filter(item=>item.id!==log.id))
  setDeleting('')
 }
 const exerciseNames=[...new Set(logs.flatMap(log=>(log.workout_exercises||[]).map(ex=>ex.exercise_name).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'nn'))
 const activeExercise=selectedExercise||exerciseNames[0]||''
 const progress=logs.flatMap(log=>(log.workout_exercises||[]).filter(ex=>ex.exercise_name===activeExercise).flatMap(ex=>(ex.workout_sets||[]).filter(set=>set.load_kg!=null&&Number(set.load_kg)>0).map(set=>({date:log.workout_date,value:Number(set.load_kg),title:log.title})))).sort((a,b)=>new Date(a.date)-new Date(b.date))
 const bestByDate=progress.reduce((acc,item)=>{const last=acc[acc.length-1];if(last&&last.date===item.date){if(item.value>last.value)last.value=item.value;last.title=item.title}else acc.push({...item});return acc},[])
 const minValue=bestByDate.length?Math.min(...bestByDate.map(p=>p.value)):0
 const maxValue=bestByDate.length?Math.max(...bestByDate.map(p=>p.value)):0
 const chartPoints=bestByDate.map((point,index)=>({...point,x:36+(bestByDate.length===1?0:index*528/(bestByDate.length-1)),y:184-(point.value-(minValue-5))/((maxValue-minValue)||1)*145}))
 const events=useMemo(()=>{
  const completed=logs.map(log=>({id:'log-'+log.id,type:'completed',title:log.title||'Treningsøkt',date:dateKey(log.workout_date),time:log.created_at?new Date(log.created_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'}):'',detail:(log.format||'Trening')+(log.score_rounds!=null?' · '+log.score_rounds+' rundar':'')+(log.score_reps!=null?' + '+log.score_reps+' reps':''),log}))
  const classes=bookings.map(item=>({id:'class-'+item.id,type:'planned',title:item.classes.title||'Gruppetime',date:dateKey(item.classes.starts_at),time:new Date(item.classes.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'}),detail:'Gruppetime'+(item.classes.duration_minutes?' · '+item.classes.duration_minutes+' min':''),raw:item}))
  const assigned=assignments.filter(item=>item.due_date&&item.status!=='completed').map(item=>({id:'assignment-'+item.id,type:'planned',title:item.wods.name||'Tildelt WOD',date:dateKey(item.due_date),time:'',detail:(item.wods.format||'WOD')+(item.wods.duration_minutes?' · '+item.wods.duration_minutes+' min':''),raw:item}))
  return [...completed,...classes,...assigned].filter(event=>event.date).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))
 },[logs,bookings,assignments])
 const firstDay=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1)
 const offset=(firstDay.getDay()+6)%7
 const daysInMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate()
 const calendarCells=[...Array(offset).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)]
 while(calendarCells.length%7)calendarCells.push(null)
 const eventsByDay=events.reduce((acc,event)=>{(acc[event.date] ||= []).push(event);return acc},{})
 const selectedEvents=eventsByDay[selectedDay]||[]
 const groupedLogs=logs.reduce((acc,log)=>{const d=log.workout_date?new Date(log.workout_date+'T12:00:00'):null;const key=d?monthLabel(d):'Ukjend dato';(acc[key] ||= []).push(log);return acc},{})
 const openEvent=event=>{setSelectedEvent(event);if(event.log)onOpenWorkout?.(event.log)}
 return <div className="my-page">
  <div className="training-heading"><div><span className="section-kicker">MEDLEMSPROFIL</span><h3>Mi side</h3><p>Personleg treningsprofil, resultat og utvikling.</p></div><span className="count-pill"><UserRound size={14}/> Profil</span></div>
  <section className="my-profile-card"><div className="my-profile-avatar"><UserRound size={26}/></div><div><h3>{profile.display_name||'GarasjeGym-medlem'}</h3><span>{profile.role==='admin'?'Administrator':profile.role==='manager'?'Manager':'Medlem'}</span></div></section>
  <div className="my-profile-facts"><div><ShieldCheck size={16}/><span>Medlemsstatus</span><strong>{profile.active?'Aktiv':'Inaktiv'}</strong></div><div><Mail size={16}/><span>Innloggingsadresse</span><strong>{email||'Administrert via konto'}</strong></div></div>
  {error&&<div className="auth-error">{error}</div>}
  {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar treningsprofil …</div>:<>
   <section className="engine-section progress-section"><div className="engine-section-title"><h4><Activity size={17}/> Styrkeprogresjon</h4><span>Utvikling over tid</span></div>{exerciseNames.length?<><label className="progress-select-label">Vel øving<select value={activeExercise} onChange={e=>setSelectedExercise(e.target.value)}>{exerciseNames.map(name=><option key={name} value={name}>{name}</option>)}</select></label>{chartPoints.length?<div className="progress-chart-wrap"><div className="progress-chart-summary"><strong>{maxValue} kg</strong><span>Beste registrerte belastning</span></div><svg className="progress-chart" viewBox="0 0 600 220" role="img" aria-label={'Progresjon for '+activeExercise+' i kilo'}><line x1="36" y1="184" x2="564" y2="184" className="progress-axis"/><line x1="36" y1="35" x2="36" y2="184" className="progress-axis"/>{chartPoints.length>1&&<polyline points={chartPoints.map(p=>p.x+','+p.y).join(' ')} className="progress-line"/>}{chartPoints.map((p,i)=><g key={p.date}><circle cx={p.x} cy={p.y} r="5" className="progress-point"/><text x={p.x} y={p.y-12} textAnchor="middle" className="progress-value">{p.value}</text>{(i===0||i===chartPoints.length-1)&&<text x={p.x} y="207" textAnchor={i===0?'start':'end'} className="progress-date">{new Date(p.date+'T12:00:00').toLocaleDateString('nn-NO',{day:'2-digit',month:'short'})}</text>}</g>)}</svg><p className="progress-chart-note">Høgaste registrerte kg-belastning per økt. Sett utan kg er ikkje med.</p></div>:<div className="empty-state">Ingen belastning i kg registrert for denne øvinga enno.</div>}</>:<div className="empty-state">Grafen blir tilgjengeleg når du har registrert øvingar og belastning i treningsøktene.</div>}</section>
   <section className="engine-section"><div className="engine-section-title"><h4><Trophy size={17}/> Personlege rekordar</h4><span>{prs.length}</span></div>{prs.length?<div className="my-pr-grid">{prs.map(pr=><article className="history-card" key={pr.id}><strong>{pr.exercise_name}</strong><div className="pr-result">{pr.result} {pr.unit}</div><small>{pr.record_date||'Dato ikkje registrert'}</small></article>)}</div>:<div className="empty-state">Du har ikkje registrert personlege rekordar enno.</div>}</section>
   <section className="engine-section training-history-section">
    <div className="engine-section-title"><h4><Activity size={17}/> Treningshistorikk</h4><span>{logs.length} utførte økter</span></div>
    <div className="history-toolbar"><div className="history-legend"><span className="history-dot completed-dot"/> Utført <span className="history-dot planned-dot"/> Planlagt</div><div className="history-view-toggle"><button className={historyView==='list'?'active':''} onClick={()=>setHistoryView('list')}><List size={15}/> Liste</button><button className={historyView==='calendar'?'active':''} onClick={()=>setHistoryView('calendar')}><Calendar size={15}/> Kalender</button></div></div>
    {historyView==='list'?<>{Object.keys(groupedLogs).length?Object.entries(groupedLogs).map(([month,items])=><section className="history-month" key={month}><h5>{month} <span>{items.length} økter</span></h5>{items.map(log=><article className="history-card my-page-log history-completed" key={log.id}><button type="button" className="history-log-main" onClick={()=>onOpenWorkout?.(log)}><div className="history-card-top"><strong>{log.title||'Treningsøkt'}</strong><span>{prettyDate(log.workout_date)}</span></div><small>{log.format||'Trening'}{log.score_rounds!=null?' · '+log.score_rounds+' rundar':''}{log.score_reps!=null?' + '+log.score_reps+' reps':''}</small>{log.note&&<small>{log.note}</small>}<span className="history-status completed-status">Utført</span></button><button type="button" className="history-delete" aria-label="Slett økt" disabled={deleting===String(log.id)} onClick={()=>deleteWorkout(log)}><Trash2 size={16}/>{deleting===String(log.id)?'Slettar':'Slett'}</button></article>)}</section>):<div className="empty-state">Gjennomførte økter blir synlege her når dei er lagra.</div>}</>:<div className="history-calendar">
     <div className="calendar-toolbar"><button className="icon-button" onClick={()=>setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1))}><ChevronLeft size={18}/></button><strong>{monthLabel(calendarMonth)}</strong><button className="icon-button" onClick={()=>setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1))}><ChevronRight size={18}/></button><button className="secondary-button" onClick={()=>{const now=new Date();setCalendarMonth(new Date(now.getFullYear(),now.getMonth(),1));setSelectedDay(dateKey(now))}}>I dag</button></div>
     <div className="calendar-grid"><div className="calendar-weekdays">{['Man','Tys','Ons','Tor','Fre','Laur','Sun'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-days">{calendarCells.map((day,index)=>{if(!day)return <div className="calendar-empty" key={'empty-'+index}/>;const date=[calendarMonth.getFullYear(),String(calendarMonth.getMonth()+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-');const dayEvents=eventsByDay[date]||[];return <button type="button" key={date} className={'calendar-date'+(selectedDay===date?' selected':'')+(date===dateKey(new Date())?' today':'')} onClick={()=>setSelectedDay(date)}><strong>{day}</strong>{dayEvents.slice(0,3).map(event=><span key={event.id} className={'calendar-event-pill '+event.type}>{event.time?event.time+' ':''}{event.title}</span>)}{dayEvents.length>3&&<small>+{dayEvents.length-3} fleire</small>}</button>})}</div></div>
     <div className="calendar-day-events"><h5>{prettyDate(selectedDay)}</h5>{selectedEvents.length?selectedEvents.map(event=><button type="button" key={event.id} className={'calendar-event-row '+event.type} onClick={()=>openEvent(event)}><span className="history-dot"/><span><strong>{event.title}</strong><small>{event.time||'Tidspunkt ikkje registrert'} · {event.detail}</small></span><b>{event.type==='completed'?'Utført':'Planlagt'}</b></button>):<div className="empty-state">Ingen registrerte eller planlagde aktivitetar denne dagen.</div>}</div>
    </div>}
   </section>
   {selectedEvent&&!selectedEvent.log&&<div className="history-event-detail"><button className="text-button" onClick={()=>setSelectedEvent(null)}>Lukk detaljar ✕</button><strong>{selectedEvent.title}</strong><span>{prettyDate(selectedEvent.date)} {selectedEvent.time&&' · '+selectedEvent.time}</span><small>{selectedEvent.detail}</small></div>}
  </>}
 </div>
}
