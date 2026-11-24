import {useEffect,useMemo,useRef,useState} from 'react'
import {UserRound,Trophy,Activity,LoaderCircle,Mail,ShieldCheck,ArrowRight,TrendingUp,ToggleLeft,ToggleRight,ChevronLeft,ChevronRight,Trash2,List,Calendar,Music2,Pencil,BookOpen,HeartPulse,Star,CalendarCheck2,Users,Coffee} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {deleteWorkoutAndLinkedRecords} from '../lib/deleteWorkout.js'
import GroupClassResults from './GroupClassResults.jsx'
import HeartRateSettings from './HeartRateSettings.jsx'
import HelpCenter from './HelpCenter.jsx'
import ExercisePRCenter from './ExercisePRCenter.jsx'
import {splitWorkoutNote} from '../lib/workoutDetail.js'

const historyDateKey=value=>{if(!value)return '';if(/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return value;const d=new Date(value);return Number.isNaN(d.getTime())?'':[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const historyMonthLabel=date=>date.toLocaleDateString('nn-NO',{month:'long',year:'numeric'})
const historyPrettyDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString('nn-NO',{day:'numeric',month:'long',year:'numeric'}):'Dato ikkje sett'

function ProgressChart({records}){
 const groups=useMemo(()=>{const map=new Map();records.forEach(r=>{const key=r.exercise_name+' · '+r.unit;const value=Number(String(r.result).replace(',','.'));if(!Number.isFinite(value))return;if(!map.has(key))map.set(key,[]);map.get(key).push({...r,value})});return [...map.entries()].map(([name,items])=>[name,items.sort((a,b)=>new Date(a.record_date)-new Date(b.record_date))]).filter(([,items])=>items.length>1)},[records])
 const [selected,setSelected]=useState('')
 useEffect(()=>{if(!groups.some(([name])=>name===selected))setSelected(groups[0]?.[0]||'')},[groups,selected])
 const series=groups.find(([name])=>name===selected)?.[1]||[]
 if(!groups.length)return <div className="empty-state">Progresjonsgrafen blir synleg når du har minst to registreringar på same øving og måleeining.</div>
 const values=series.map(x=>x.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1
 const points=values.map((v,i)=>({x:18+i/Math.max(1,values.length-1)*284,y:94-(v-min)/span*72}))
 return <div className="pr-progress"><label>Vel øving<select value={selected} onChange={e=>setSelected(e.target.value)}>{groups.map(([name])=><option key={name}>{name}</option>)}</select></label><svg viewBox="0 0 320 112" role="img" aria-label={'Progresjon for '+selected}><path d="M14 94 H306 M14 18 V94" stroke="currentColor" opacity=".28" fill="none"/><polyline points={points.map(p=>p.x+','+p.y).join(' ')} fill="none" stroke="#f0a33a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="#ffd15e"/>)}</svg><div className="pr-chart-foot"><span>{series[0]?.record_date}</span><strong>{series[series.length-1]?.value} {series[series.length-1]?.unit}</strong><span>{series[series.length-1]?.record_date}</span></div></div>
}

export default function MyPage({profile,email,onOpenWorkout,onLaunchWod=()=>{},onMusic=()=>{},onProfileUpdated=()=>{},onHelpNavigate=()=>{},initialHelpTopic=null,isPTCoach=false,initialTab='home',simpleMode=false,onSimpleModeChange=()=>{},simpleModeError='',simpleModeSaving=false,refreshToken=0}){
 const [logs,setLogs]=useState([]),[prs,setPrs]=useState([]),[favoriteWods,setFavoriteWods]=useState([]),[bookings,setBookings]=useState([]),[assignments,setAssignments]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState(initialTab==='profile'?'home':initialTab),[selectedPR,setSelectedPR]=useState(null),[historyView,setHistoryView]=useState('list'),[calendarMonth,setCalendarMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1)),[selectedDay,setSelectedDay]=useState(new Date().toLocaleDateString('en-CA')),[selectedEvent,setSelectedEvent]=useState(null),[deleting,setDeleting]=useState('')
 const [nameEditing,setNameEditing]=useState(false),[nameDraft,setNameDraft]=useState(profile.display_name||''),[nameSaving,setNameSaving]=useState(false),[nameFeedback,setNameFeedback]=useState('')
 useEffect(()=>{setNameDraft(profile.display_name||'')},[profile.display_name])
 async function saveDisplayName(event){
  event.preventDefault()
  const next=nameDraft.trim().replace(/\s+/g,' ')
  if(next.length<2||next.length>80){setNameFeedback('Namnet må vera mellom 2 og 80 teikn.');return}
  setNameSaving(true);setNameFeedback('')
  const {data,error:saveError}=await supabase.from('profiles').update({display_name:next}).eq('id',profile.id).select('display_name').single()
  if(saveError)setNameFeedback('Kunne ikkje lagra namnet: '+saveError.message)
  else{onProfileUpdated(data.display_name);setNameEditing(false);setNameFeedback('Namnet er lagra.')}
  setNameSaving(false)
 }
 const loadSequence=useRef(0)
 useEffect(()=>{setTab(initialTab==='profile'?'home':initialTab)},[initialTab])
 useEffect(()=>{
  let live=true
  const requestId=++loadSequence.current
  async function load(){
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError)throw authError
    if(!user){if(live)setLoading(false);return}
    const [l,initialPRs,favs,b,a]=await Promise.all([
     supabase.from('workout_logs').select('id,title,source_wod_id,workout_date,created_at,format,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,result_data,note,workout_exercises(id,exercise_id,exercise_name,sort_order,workout_sets(id,reps,load_kg,height_cm,time_seconds))').eq('member_id',user.id).order('created_at',{ascending:false}).limit(200),
     supabase.from('personal_records').select('id,exercise_name,result,unit,record_date,note,workout_log_id').eq('member_id',user.id).order('record_date',{ascending:false}).limit(200),
     supabase.from('wod_favorites').select('wod_id,created_at,wods(id,name,format,duration_minutes,movements,notes,timer_settings)').eq('user_id',user.id).order('created_at',{ascending:false}),
     supabase.from('class_bookings').select('id,status,classes(id,title,starts_at,duration_minutes,cancelled_at,cancellation_note)').eq('member_id',user.id).in('status',['confirmed','waitlist','cancelled']).limit(200),
     supabase.from('pt_wod_assignments').select('id,status,due_date,wods(name,format,duration_minutes)').eq('member_id',user.id).in('status',['assigned','in_progress','completed']).limit(200)
    ])
    let p=initialPRs
    if(p.error&&/workout_log_id|schema cache/i.test(p.error.message||'')){
     p=await supabase.from('personal_records').select('id,exercise_name,result,unit,record_date,note').eq('member_id',user.id).order('record_date',{ascending:false}).limit(200)
     if(!p.error)p.data=(p.data||[]).map(row=>({...row,workout_log_id:null}))
    }
    if(!live||requestId!==loadSequence.current)return
    const failures=[]
    if(l.error)failures.push('Treningshistorikk: '+l.error.message);else setLogs(l.data||[])
    if(p.error)failures.push('Personlege rekordar: '+p.error.message);else setPrs(p.data||[])
    if(favs.error)failures.push('WOD-favorittar: '+favs.error.message);else setFavoriteWods((favs.data||[]).filter(x=>x.wods).map(x=>x.wods))
    if(b.error)failures.push('Gruppetimekalender: '+b.error.message);else setBookings((b.data||[]).filter(x=>x.classes&&(x.status!=='cancelled'||x.classes.cancelled_at)))
    if(a.error)failures.push('PT-tildelingar: '+a.error.message);else setAssignments((a.data||[]).filter(x=>x.wods))
    setError(failures.join(' · '))
   }catch(loadError){
    if(live&&requestId===loadSequence.current)setError('Kunne ikkje henta Mi side: '+(loadError?.message||'Ukjend feil'))
   }finally{
    if(live&&requestId===loadSequence.current)setLoading(false)
   }
  }
  load()
  return()=>{live=false;loadSequence.current++}
 },[refreshToken])

 const sourceLog=selectedPR?.workout_log_id?logs.find(x=>x.id===selectedPR.workout_log_id):null
 const deleteWorkout=async log=>{
  if(deleting||!window.confirm('Sletta «'+(log.title||'Treningsøkt')+'» og PR-resultata frå denne økta? Andre økter og sjølvstendige PR-noteringar blir behaldne.'))return
  setDeleting(String(log.id));setError('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||Error('Logg inn på nytt.')
   const result=await deleteWorkoutAndLinkedRecords(supabase,log.id,user.id)
   setLogs(current=>current.filter(item=>item.id!==log.id))
   if(result.cleanupError){
    setPrs(current=>current.map(record=>record.workout_log_id===log.id?{...record,workout_log_id:null}:record))
    setError('Økta er sletta, men eldre tilknytte PR-noteringar må kontrollerast i PR-senteret: '+result.cleanupError)
   }else setPrs(current=>current.filter(record=>!result.linkedIds.includes(record.id)))
  }catch(deleteError){setError('Økta blei ikkje sletta: '+(deleteError?.message||'Ukjend feil'))}
  finally{setDeleting('')}
 }
 const historyEvents=useMemo(()=>{const completed=logs.map(log=>({id:'log-'+log.id,type:'completed',title:log.title||'Treningsøkt',date:historyDateKey(log.workout_date),time:log.created_at?new Date(log.created_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'}):'',detail:(log.format||'Trening')+(log.score_rounds!=null?' · '+log.score_rounds+' rundar':'')+(log.score_reps!=null?' + '+log.score_reps+' reps':'')+(log.score_time_seconds!=null?' · '+Math.floor(log.score_time_seconds/60)+':'+String(Math.round(log.score_time_seconds%60)).padStart(2,'0'):'')+(log.score_load_kg!=null?' · '+log.score_load_kg+' kg':'')+(log.score_calories!=null?' · '+log.score_calories+' cal':'')+(log.score_distance!=null?' · '+log.score_distance+' '+(log.score_unit||'m'):''),log}));const classes=bookings.map(item=>({id:'class-'+item.id,type:'planned',title:item.classes.title||'Gruppetime',date:historyDateKey(item.classes.starts_at),time:new Date(item.classes.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'}),detail:(item.classes.cancelled_at?'Avlyst'+(item.classes.cancellation_note?' · '+item.classes.cancellation_note:''):item.status==='waitlist'?'Venteliste':'Gruppetime')+(item.classes.duration_minutes?' · '+item.classes.duration_minutes+' min':''),raw:item}));const assigned=assignments.filter(item=>item.due_date&&item.status!=='completed').map(item=>({id:'assignment-'+item.id,type:'planned',title:item.wods.name||'Tildelt WOD',date:historyDateKey(item.due_date),time:'',detail:(item.wods.format||'WOD')+(item.wods.duration_minutes?' · '+item.wods.duration_minutes+' min':''),raw:item}));return [...completed,...classes,...assigned].filter(event=>event.date).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))},[logs,bookings,assignments])
 const daysInHistoryMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate(),historyOffset=(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1).getDay()+6)%7
 const calendarCells=[...Array(historyOffset).fill(null),...Array.from({length:daysInHistoryMonth},(_,i)=>i+1)];while(calendarCells.length%7)calendarCells.push(null)
 const historyEventsByDay=historyEvents.reduce((acc,event)=>{(acc[event.date] ||= []).push(event);return acc},{})
 const selectedDayEvents=historyEventsByDay[selectedDay]||[]
 const historyGroups=logs.reduce((acc,log)=>{const d=log.workout_date?new Date(log.workout_date+'T12:00:00'):null;const key=d?historyMonthLabel(d):'Ukjend dato';(acc[key] ||= []).push(log);return acc},{})
 const openHistoryEvent=event=>{setSelectedEvent(event);if(event.log)onOpenWorkout?.(event.log)}

 if(tab==='help')return <div className="my-page"><HelpCenter profile={profile} isCoach={isPTCoach} initialTopic={initialHelpTopic} onClose={()=>setTab('home')} onNavigate={target=>target==='profile'?setTab('profile'):onHelpNavigate(target)}/></div>

 const pageTitles={home:'Mi side',profile:'Profil og konto',pulse:'Puls og Bluetooth',records:'PR-senter',history:'Treningslogg',favorites:'Favoritt-WOD-ar','class-results':'Resultat frå gruppetimar'}

 return <div className="my-page">
  <div className="training-heading my-hub-heading"><div><span className="section-kicker">GARASJEGYM · PERSONLEG</span><h3>{pageTitles[tab]||'Mi side'}</h3>{tab==='home'&&<p>Trening, profil og innstillingar – samla på éin stad.</p>}</div>{tab!=='home'&&<button type="button" className="my-hub-back" onClick={()=>setTab('home')}><ChevronLeft size={16}/> Mi side</button>}</div>
  {tab==='home'&&<div className="my-hub-dashboard"><button type="button" className="my-hub-identity" onClick={()=>setTab('profile')}><span className="my-hub-avatar"><UserRound size={24}/></span><span><strong>{profile.display_name||'GarasjeGym-medlem'}</strong><small>{profile.role==='admin'?'Administrator':profile.role==='manager'?'Manager':'Medlem'} · {profile.active?'Aktiv':'Inaktiv'}</small></span><ChevronRight size={20}/></button>
    <section className="my-hub-group"><h4>Trening og resultat</h4><div className="my-hub-main-grid"><button type="button" onClick={()=>setTab('history')}><Activity size={23}/><strong>Treningslogg</strong><small>{logs.length} lagra økter</small></button><button type="button" onClick={()=>setTab('records')}><Trophy size={23}/><strong>PR-senter</strong><small>Rekordar og utvikling</small></button><button type="button" onClick={()=>setTab('favorites')}><Star size={23}/><strong>Favoritt-WOD-ar</strong><small>{favoriteWods.length} favorittar</small></button><button type="button" onClick={()=>setTab('class-results')}><Users size={23}/><strong>Gruppetime-resultat</strong><small>Registrer resultat</small></button><button type="button" onClick={()=>onHelpNavigate('plan')}><CalendarCheck2 size={23}/><strong>Treningsplan</strong><small>Plan og tildelte økter</small></button></div></section>
    <section className="my-hub-group"><h4>Profil og innstillingar</h4><div className="my-hub-menu"><button type="button" onClick={()=>setTab('profile')}><UserRound size={19}/><span><strong>Profil og konto</strong><small>Namn, visning og medlemsstatus</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>setTab('pulse')}><HeartPulse size={19}/><span><strong>Puls og Bluetooth</strong><small>Sensor og personvernval</small></span><ChevronRight size={17}/></button><button type="button" onClick={onMusic}><Music2 size={19}/><span><strong>Musikk og Spotify</strong><small>Søk, spelelister og innstillingar</small></span><ChevronRight size={17}/></button><button type="button" className="my-hub-help-link" onClick={()=>setTab('help')}><BookOpen size={19}/><span><strong>Hjelp og rettleiing</strong><small>Søk, ordliste og brukarmanual</small></span><ChevronRight size={17}/></button></div></section>
    <section className="my-hub-group"><h4>Fellesskap og tenester</h4><div className="my-hub-menu"><button type="button" onClick={()=>onHelpNavigate('coffee')}><Coffee size={19}/><span><strong>Kaffebar</strong><small>Meny, bestillingar og kaffiprat</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>onHelpNavigate('community')}><Users size={19}/><span><strong>Fellesskap</strong><small>Garasjeprat og aktivitet</small></span><ChevronRight size={17}/></button></div></section>
   </div>}
  {error&&<div className="auth-error">{error}</div>}
  {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar treningsprofil …</div>:<>
   {tab==='profile'&&<><section className="my-profile-card"><div className="my-profile-avatar"><UserRound size={26}/></div><div><h3>{profile.display_name||'GarasjeGym-medlem'}</h3><span>{profile.role==='admin'?'Administrator':profile.role==='manager'?'Manager':'Medlem'}</span></div><button type="button" className="my-profile-edit-name" onClick={()=>{setNameEditing(v=>!v);setNameFeedback("");setNameDraft(profile.display_name||"")}}><Pencil size={15}/>{nameEditing?"Lukk":"Endre namn"}</button></section>{nameEditing&&<form className="my-profile-name-form" onSubmit={saveDisplayName}><label htmlFor="my-display-name">Namn som blir vist i GarasjeGym</label><input id="my-display-name" value={nameDraft} maxLength="80" autoComplete="name" onChange={e=>setNameDraft(e.target.value)} required/><div className="my-profile-name-actions"><button type="submit" className="primary-button" disabled={nameSaving}>{nameSaving?"Lagrar …":"Lagre namn"}</button><button type="button" className="secondary-button" onClick={()=>{setNameEditing(false);setNameFeedback("")}}>Avbryt</button></div><small>Dette endrar visingsnamnet ditt, ikkje innlogginga eller e-postadressa.</small></form>}{nameFeedback&&<div className={nameFeedback.startsWith("Namnet er")?"auth-message":"auth-error"} role="status">{nameFeedback}</div>}{profile.role!=='admin'&&<section className="simple-mode-setting"><div className="simple-mode-copy"><strong>Visning av GarasjeGym</strong><p>{simpleMode?'Du brukar den enkle visninga. Byt til avansert for fleire menyval.':'Du brukar avansert visning. Du kan byta tilbake når du vil.'}</p></div><button type="button" className={simpleMode?"simple-mode-toggle enabled":"simple-mode-toggle"} aria-pressed={simpleMode} disabled={simpleModeSaving} onClick={()=>onSimpleModeChange(!simpleMode)}>{simpleMode?<ToggleRight/>:<ToggleLeft/>}{simpleModeSaving?"Lagrar …":simpleMode?"Slå på avansert visning":"Bruk enkel visning"}</button>{simpleModeError&&<small className={simpleModeError.startsWith("Valet er")?"simple-mode-feedback success":"simple-mode-feedback"} role="status">{simpleModeError}</small>}</section>}<div className="my-profile-facts"><div><ShieldCheck size={16}/><span>Medlemsstatus</span><strong>{profile.active?'Aktiv':'Inaktiv'}</strong></div><div><Mail size={16}/><span>Innloggingsadresse</span><strong>{email||'Administrert via konto'}</strong></div></div></>}
   {tab==='pulse'&&<HeartRateSettings/>}
   {tab==='class-results'&&<GroupClassResults onLaunchWod={(wodId,assignmentId,sessionId)=>onLaunchWod?.(wodId,assignmentId,sessionId)}/>}
   {tab==='records'&&<section className="engine-section"><ExercisePRCenter history={logs} legacyRecords={prs} onOpenWorkout={onOpenWorkout} onRecordAdded={record=>setPrs(current=>[record,...current])} onRecordDeleted={recordId=>setPrs(current=>current.filter(record=>record.id!==recordId))}/></section>}
   {tab==='favorites'&&<section className="engine-section"><div className="engine-section-title"><h4>★ Favoritt-WODs</h4><span>{favoriteWods.length} lagra favorittar</span></div>{favoriteWods.length?<div className="wod-list">{favoriteWods.map(wod=><article className="wod-card" key={wod.id}><div className="wod-top"><span>{wod.format}</span><span>{wod.duration_minutes||'–'} MIN</span></div><h4>{wod.name}</h4>{wod.movements&&<p className="wod-movements">{wod.movements}</p>}<button type="button" className="primary-button" onClick={()=>onLaunchWod(wod.id)}>Start WOD</button></article>)}</div>:<div className="empty-state">Du har ikkje merkt nokon WOD-ar som favoritt enno. Stjernemerk ein WOD i Trening, så finn du han att her.</div>}</section>}
   {tab==='history'&&<section className="engine-section training-history-section"><div className="engine-section-title"><h4><Activity size={17}/> Treningshistorikk</h4><span>{logs.length} utførte økter</span></div>
    <div className="history-toolbar"><div className="history-legend"><span className="history-dot completed-dot"/> Utført <span className="history-dot planned-dot"/> Planlagt</div><div className="history-view-toggle"><button className={historyView==='list'?'active':''} onClick={()=>setHistoryView('list')}><List size={15}/> Liste</button><button className={historyView==='calendar'?'active':''} onClick={()=>setHistoryView('calendar')}><Calendar size={15}/> Kalender</button></div></div>
    {historyView==='list'?<>{Object.keys(historyGroups).length?Object.entries(historyGroups).map(([month,items])=><section className="history-month" key={month}><h5>{month} <span>{items.length} økter</span></h5>{items.map(log=><article className="history-card my-page-log history-completed" key={log.id}><button type="button" className="history-log-main" onClick={()=>onOpenWorkout?.(log)}><div className="history-card-top"><strong>{log.title||'Treningsøkt'}</strong><span>{historyPrettyDate(log.workout_date)}</span></div><small>{log.format||'Trening'}{log.score_rounds!=null?' · '+log.score_rounds+' rundar':''}{log.score_reps!=null?' + '+log.score_reps+' reps':''}{log.score_time_seconds!=null?' · '+Math.floor(log.score_time_seconds/60)+':'+String(Math.round(log.score_time_seconds%60)).padStart(2,'0'):''}{log.score_load_kg!=null?' · '+log.score_load_kg+' kg':''}{log.score_calories!=null?' · '+log.score_calories+' cal':''}{log.score_distance!=null?' · '+log.score_distance+' '+(log.score_unit||'m'):''}</small>{splitWorkoutNote(log.note).personal&&<small>{splitWorkoutNote(log.note).personal.slice(0,95)}</small>}<span className="history-status completed-status">Utført</span></button><button type="button" className="history-delete" aria-label="Slett økt" disabled={deleting===String(log.id)} onClick={()=>deleteWorkout(log)}><Trash2 size={16}/>{deleting===String(log.id)?'Slettar':'Slett'}</button></article>)}</section>):<div className="empty-state">Gjennomførte økter blir synlege her når dei er lagra.</div>}</>:<div className="history-calendar"><div className="calendar-toolbar"><button className="icon-button" onClick={()=>setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1))}><ChevronLeft size={18}/></button><strong>{historyMonthLabel(calendarMonth)}</strong><button className="icon-button" onClick={()=>setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1))}><ChevronRight size={18}/></button><button className="secondary-button" onClick={()=>{const now=new Date();setCalendarMonth(new Date(now.getFullYear(),now.getMonth(),1));setSelectedDay(historyDateKey(now))}}>I dag</button></div><div className="calendar-grid"><div className="calendar-weekdays">{['Man','Tys','Ons','Tor','Fre','Laur','Sun'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-days">{calendarCells.map((day,index)=>{if(!day)return <div className="calendar-empty" key={'empty-'+index}/>;const date=[calendarMonth.getFullYear(),String(calendarMonth.getMonth()+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-');const dayEvents=historyEventsByDay[date]||[];return <button type="button" key={date} className={'calendar-date'+(selectedDay===date?' selected':'')+(date===historyDateKey(new Date())?' today':'')} onClick={()=>setSelectedDay(date)}><strong>{day}</strong>{dayEvents.slice(0,3).map(event=><span key={event.id} className={'calendar-event-pill '+event.type}>{event.time?event.time+' ':''}{event.title}</span>)}{dayEvents.length>3&&<small>+{dayEvents.length-3} fleire</small>}</button>})}</div></div><div className="history-mobile-agenda">{calendarCells.filter(day=>day!==null).map(day=>{const date=[calendarMonth.getFullYear(),String(calendarMonth.getMonth()+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-');const dayEvents=historyEventsByDay[date]||[];return <button type="button" key={date} className={'history-mobile-day'+(selectedDay===date?' selected':'')+(date===historyDateKey(new Date())?' today':'')} onClick={()=>setSelectedDay(date)}><span className="history-mobile-day-date">{day}</span><span className="history-mobile-day-meta">{dayEvents.length?dayEvents.length+' aktivitet'+(dayEvents.length===1?'':'ar'):'Ingen aktivitet'}</span>{dayEvents.length>0&&<span className="history-mobile-day-tags">{dayEvents.slice(0,2).map(event=><small key={event.id} className={event.type}>{event.time?event.time+' · ':''}{event.title}</small>)}{dayEvents.length>2&&<small>+{dayEvents.length-2} fleire</small>}</span>}</button>})}</div><div className="calendar-day-events"><h5>{historyPrettyDate(selectedDay)}</h5>{selectedDayEvents.length?selectedDayEvents.map(event=><button type="button" key={event.id} className={'calendar-event-row '+event.type} onClick={()=>openHistoryEvent(event)}><span className="history-dot"/><span><strong>{event.title}</strong><small>{event.time||'Tidspunkt ikkje registrert'} · {event.detail}</small></span><b>{event.type==='completed'?'Utført':event.detail.startsWith('Avlyst')?'Avlyst':event.detail.startsWith('Venteliste')?'Venteliste':'Planlagt'}</b></button>):<div className="empty-state">Ingen registrerte eller planlagde aktivitetar denne dagen.</div>}</div></div>}
    {selectedEvent&&!selectedEvent.log&&<div className="history-event-detail"><button className="text-button" onClick={()=>setSelectedEvent(null)}>Lukk detaljar ✕</button><strong>{selectedEvent.title}</strong><span>{historyPrettyDate(selectedEvent.date)} {selectedEvent.time&&' · '+selectedEvent.time}</span><small>{selectedEvent.detail}</small></div>}
   </section>}
  </>}
 </div>
}
