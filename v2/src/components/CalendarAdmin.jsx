import {DnaDateTimeInput} from './DesignDNA.jsx'
import {useEffect,useMemo,useRef,useState} from 'react'
import {CalendarDays,ChevronLeft,ChevronRight,Plus,Clock3,LoaderCircle} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const toLocalInput=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)
const types=[['pt','PT-time'],['class','Gruppetime'],['meeting','Møte'],['maintenance','Drift'],['other','Anna']]
const tone={pt:'pt',class:'class',meeting:'meeting',maintenance:'maintenance',other:'other'}
export default function CalendarAdmin({onNavigate=()=>{}}){
 const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1)),[focusDay,setFocusDay]=useState(()=>new Date())
 const [events,setEvents]=useState([]),[sessions,setSessions]=useState([]),[classes,setClasses]=useState([])
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false),[removing,setRemoving]=useState(false)
 const [mode,setMode]=useState('month'),[showForm,setShowForm]=useState(false),[editing,setEditing]=useState(null)
 const [title,setTitle]=useState(''),[kind,setKind]=useState('meeting'),[start,setStart]=useState(()=>toLocalInput(new Date())),[end,setEnd]=useState(()=>toLocalInput(new Date(Date.now()+3600000))),[description,setDescription]=useState(''),[client,setClient]=useState('')
 const [clients,setClients]=useState([]),[detail,setDetail]=useState(null)
 const loadSequence=useRef(0)
 const from=new Date(month.getFullYear(),month.getMonth(),1),to=new Date(month.getFullYear(),month.getMonth()+1,1)
 async function load(){
  const requestId=++loadSequence.current
  setLoading(true);setError('')
  try{
   const lower=new Date(from.getFullYear(),from.getMonth()-1,1).toISOString()
   const upper=new Date(to.getFullYear(),to.getMonth()+1,1).toISOString()
   const [e,p,c,m]=await Promise.all([
    supabase.from('calendar_events').select('id,title,event_type,starts_at,ends_at,all_day,description,client_id,pt_session_id,class_id').gte('starts_at',lower).lt('starts_at',upper).order('starts_at'),
    supabase.from('pt_sessions').select('id,title,client_id,starts_at,duration_minutes,status,message,profiles:profiles!pt_sessions_client_id_fkey(display_name)').gte('starts_at',lower).lt('starts_at',upper).order('starts_at'),
    supabase.from('classes').select('id,title,type,starts_at,duration_minutes,published,cancelled_at,cancellation_note,description').gte('starts_at',lower).lt('starts_at',upper).order('starts_at'),
    supabase.from('profiles').select('id,display_name').eq('active',true).order('display_name')
   ])
   if(requestId!==loadSequence.current)return
   const failures=[e,p,c,m].filter(result=>result.error).map(result=>result.error.message)
   if(failures.length)setError(failures.join(' · '))
   setEvents(e.data||[]);setSessions(p.data||[]);setClasses(c.data||[]);setClients(m.data||[])
  }catch(loadError){
   if(requestId===loadSequence.current)setError(loadError?.message||'Kalenderen kunne ikkje hentast.')
  }finally{
   if(requestId===loadSequence.current)setLoading(false)
  }
 }
 useEffect(()=>{load()},[month])
 const rows=useMemo(()=>[
  ...events.filter(x=>!x.class_id&&!x.pt_session_id).map(x=>({...x,source:'manual',type:x.event_type,client_name:clients.find(person=>person.id===x.client_id)?.display_name})),
  ...sessions.map(x=>({id:'pt-'+x.id,title:x.status==='cancelled'?'AVLYST · '+(x.title||'PT-time'):x.status==='completed'?'FULLFØRT · '+(x.title||'PT-time'):x.title||'PT-time',type:'pt',starts_at:x.starts_at,ends_at:new Date(new Date(x.starts_at).getTime()+(x.duration_minutes||60)*60000).toISOString(),description:x.cancellation_note||x.message||'',source:'pt',status:x.status,client_id:x.client_id,client_name:x.profiles?.display_name})),
  ...classes.map(x=>({id:'class-'+x.id,title:x.cancelled_at?'AVLYST · '+x.title:x.published===false?'UTKAST · '+x.title:x.title,type:'class',starts_at:x.starts_at,ends_at:new Date(new Date(x.starts_at).getTime()+(x.duration_minutes||60)*60000).toISOString(),description:x.cancellation_note||x.description,published:x.published,cancelled_at:x.cancelled_at,source:'class'}))
 ].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),[events,sessions,classes,clients])
 const days=mode==='day'?1:mode==='week'?7:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()
 const startDay=(from.getDay()+6)%7
 const visibleDays=mode==='day'?[focusDay]:mode==='week'?Array.from({length:7},(_,i)=>{const d=new Date(focusDay);d.setDate(d.getDate()-((d.getDay()+6)%7)+i);return d}):Array.from({length:days},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1))
 const dayRows=d=>rows.filter(x=>new Date(x.starts_at).toDateString()===d.toDateString())
 function navigatePeriod(direction){
  if(mode==='month'){
   const nextMonth=new Date(month.getFullYear(),month.getMonth()+direction,1)
   const lastDay=new Date(nextMonth.getFullYear(),nextMonth.getMonth()+1,0).getDate()
   const nextDay=new Date(nextMonth.getFullYear(),nextMonth.getMonth(),Math.min(focusDay.getDate(),lastDay),focusDay.getHours(),focusDay.getMinutes())
   setMonth(nextMonth);setFocusDay(nextDay)
   return
  }
  const next=new Date(focusDay)
  next.setDate(next.getDate()+(mode==='week'?7:1)*direction)
  setFocusDay(next)
  setMonth(new Date(next.getFullYear(),next.getMonth(),1))
 }
 function openNew(d=new Date()){setEditing(null);setTitle('');setKind('meeting');setDescription('');setClient('');const s=new Date(d),now=new Date();s.setHours(s.toDateString()===now.toDateString()?now.getHours()+1:10,0,0,0);setStart(toLocalInput(s));setEnd(toLocalInput(new Date(s.getTime()+3600000)));setShowForm(true)}
 function openEdit(e){
  if(e.source!=='manual'){setDetail(e);return}
  setEditing(e);setTitle(e.title);setKind(e.type);setDescription(e.description||'');setClient(e.client_id||'');setStart(toLocalInput(new Date(e.starts_at)));setEnd(toLocalInput(new Date(e.ends_at)));setShowForm(true)
 }
 async function save(ev){
  ev.preventDefault();if(saving)return;setSaving(true);setError('');setNotice('')
  const cleanTitle=title.trim()
  if(!cleanTitle){setError('Skriv inn eit namn på avtalen.');return}
  const maxMinutes=kind==='pt'?600:kind==='class'?300:1440
  const startDate=new Date(start),endDate=new Date(end)
  if(!Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime())){setError('Dato og klokkeslett må vera gyldige.');return}
  const durationMinutes=(endDate.getTime()-startDate.getTime())/60000
  if(!editing&&['pt','class'].includes(kind)&&startDate<=new Date()){setError('PT-timar og gruppetimar må opprettast fram i tid.');return}
  if(!Number.isInteger(durationMinutes)||durationMinutes<5||durationMinutes>maxMinutes){setError(kind==='pt'?'PT-timar må vara mellom 5 og 600 minutt.':kind==='class'?'Gruppetimar må vara mellom 5 og 300 minutt.':'Avtalen må vara mellom 5 minutt og 24 timar.');return}
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser()
   if(userError||!user)throw new Error('Logg inn på nytt før du lagrar avtalen.')
   const startsAt=startDate.toISOString(),endsAt=endDate.toISOString()
   if(!editing&&kind==='pt'){
    const {error:e}=await supabase.from('pt_sessions').insert({client_id:client||null,title:cleanTitle,starts_at:startsAt,duration_minutes:durationMinutes,capacity:1,status:client?'planned':'published',created_by:user.id,message:description.trim()||'Oppretta frå administratorkalenderen'})
    if(e)throw e
   }else if(!editing&&kind==='class'){
    const {error:e}=await supabase.from('classes').insert({title:cleanTitle,type:'Gruppetime',starts_at:startsAt,duration_minutes:durationMinutes,capacity:12,description:description.trim(),created_by:user.id,published:true})
    if(e)throw e
   }else{
    const values={title:cleanTitle,event_type:kind,starts_at:startsAt,ends_at:endsAt,description:description.trim(),client_id:client||null,created_by:user.id}
    const result=editing?await supabase.from('calendar_events').update(values).eq('id',editing.id):await supabase.from('calendar_events').insert(values)
    if(result.error)throw result.error
   }
   setShowForm(false)
   setNotice(kind==='pt'?(client?'PT-time oppretta og knytt til kunden.':'PT-time publisert for booking.'):kind==='class'?'Gruppetime oppretta og publisert.':editing?'Avtalen er oppdatert.':'Avtalen er lagra.')
   await load()
  }catch(saveError){setError(saveError?.message||'Kunne ikkje lagra avtalen.')}
  finally{setSaving(false)}
 }
 async function remove(){
  if(!editing||removing||saving||!window.confirm('Sletta avtalen?'))return
  setRemoving(true);setError('');setNotice('')
  try{
   const {error:e}=await supabase.from('calendar_events').delete().eq('id',editing.id)
   if(e)throw e
   setShowForm(false);setNotice('Avtalen er sletta.');await load()
  }catch(removeError){setError(removeError?.message||'Avtalen kunne ikkje slettast.')}
  finally{setRemoving(false)}
 }
 return <div className="calendar-admin">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · ADMIN</div><h3>Kalender</h3><p>PT-timar, gruppetimar og eigne avtalar samla på ein stad.</p></div><button className="primary-button" onClick={()=>openNew()}><Plus size={16}/> Ny avtale</button></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  <section className="engine-section">
   <div className="calendar-toolbar"><div className="calendar-month-nav"><button className="secondary-button" onClick={()=>navigatePeriod(-1)}><ChevronLeft size={16}/></button><strong>{mode==='day'?focusDay.toLocaleDateString('nn-NO',{dateStyle:'full'}):mode==='week'?'Veke '+focusDay.toLocaleDateString('nn-NO',{day:'2-digit',month:'long'}):month.toLocaleDateString('nn-NO',{month:'long',year:'numeric'})}</strong><button className="secondary-button" onClick={()=>navigatePeriod(1)}><ChevronRight size={16}/></button><button className="secondary-button" onClick={()=>{const d=new Date();setFocusDay(d);setMonth(new Date(d.getFullYear(),d.getMonth(),1))}}>I dag</button></div><div className="calendar-view-switch">{['day','week','month'].map(x=><button key={x} className={mode===x?'selected':''} onClick={()=>setMode(x)}>{x==='day'?'Dag':x==='week'?'Veke':'Månad'}</button>)}</div></div>
   <div className="calendar-legend">{types.map(([id,label])=><span key={id}><i className={'calendar-dot '+tone[id]}/>{label}</span>)}</div>
   {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar kalender …</div>:<div className={'calendar-grid calendar-admin-grid calendar-admin-grid--'+mode}><div className="calendar-weekdays">{['Mån','Tys','Ons','Tor','Fre','Laur','Søn'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-days">{mode==='month'&&Array.from({length:startDay},(_,i)=><div className="calendar-day empty" key={'empty'+i}/>)}{visibleDays.map(d=><div className={'calendar-day '+(d.toDateString()===new Date().toDateString()?'today':'')+(d.toDateString()===focusDay.toDateString()?' selected':'')} key={d.toISOString()}><button type="button" className="calendar-day-number" aria-pressed={d.toDateString()===focusDay.toDateString()} onClick={()=>setFocusDay(d)}>{d.getDate()}</button><div className="calendar-day-dots">{dayRows(d).slice(0,4).map(e=><i key={e.id} className={'calendar-dot '+tone[e.type]}/>)}</div>{dayRows(d).map(e=><button key={e.id} className={'calendar-event '+tone[e.type]} title={e.title+' · '+new Date(e.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})} onClick={()=>openEdit(e)}><b>{e.all_day?'Heile dagen':new Date(e.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</b> {e.title}{e.client_name?' · '+e.client_name:''}</button>)}</div>)}</div></div>}
   {!loading&&mode==='month'&&<div className="calendar-selected-day"><header><strong>{focusDay.toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})}</strong><button type="button" className="secondary-button" onClick={()=>openNew(focusDay)}><Plus size={15}/> Ny avtale</button></header>{dayRows(focusDay).length?dayRows(focusDay).map(e=><button type="button" key={e.id} className={'calendar-agenda-event '+tone[e.type]} onClick={()=>openEdit(e)}><span className="calendar-agenda-time">{e.all_day?'Heile dagen':new Date(e.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span><span className="calendar-agenda-main"><strong>{e.title}</strong><small>{types.find(t=>t[0]===e.type)?.[1]||'Avtale'}</small></span></button>):<p>Ingen avtalar denne dagen.</p>}</div>}
   {!loading&&mode!=='month'&&<div className="calendar-mobile-agenda">{visibleDays.map(d=>{const dayEvents=dayRows(d);return <section className={d.toDateString()===new Date().toDateString()?'calendar-agenda-day today':'calendar-agenda-day'} key={d.toISOString()}><header><div><strong>{d.toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long'})}</strong><small>{dayEvents.length} {dayEvents.length===1?'avtale':'avtalar'}</small></div><button type="button" className="calendar-agenda-add" onClick={()=>openNew(d)} aria-label={'Ny avtale '+d.toLocaleDateString('nn-NO')}><Plus size={16}/> Ny</button></header>{dayEvents.length?dayEvents.map(e=><button type="button" className={'calendar-agenda-event '+tone[e.type]} key={e.id} onClick={()=>openEdit(e)}><span className="calendar-agenda-time">{e.all_day?'Heile dagen':new Date(e.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span><span className="calendar-agenda-main"><strong>{e.title}</strong><small>{e.client_name?e.client_name+' · ':''}{types.find(t=>t[0]===e.type)?.[1]||'Avtale'}</small></span></button>):<p className="calendar-agenda-empty">Ingen avtalar denne dagen.</p>}</section>})}</div>}
  </section>
  <section className="engine-section"><h4>Komande avtalar</h4>{rows.filter(x=>new Date(x.starts_at)>=new Date()&&new Date(x.starts_at)<new Date(Date.now()+7*86400000)).slice(0,12).map(e=><article className="calendar-upcoming" key={e.id}><div><strong>{e.title}</strong><small>{e.all_day?'Heile dagen':new Date(e.starts_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}{e.client_name?' · '+e.client_name:''}</small></div><span>{types.find(t=>t[0]===e.type)?.[1]||'Anna'}</span></article>)}</section>
  {detail&&<div className="calendar-modal-backdrop" onClick={()=>setDetail(null)}><section className="calendar-modal calendar-detail-modal" role="dialog" aria-modal="true" aria-label="Avtaledetaljar" onClick={e=>e.stopPropagation()}>
    <div className="training-heading"><div><div className="section-kicker">KALENDER · DETALJAR</div><h3>{detail.title}</h3></div><button type="button" className="secondary-button" onClick={()=>setDetail(null)}>Lukk</button></div>
    <div className="calendar-detail-type">{detail.cancelled_at?'Avlyst gruppetime':detail.published===false?'Utkast gruppetime':types.find(t=>t[0]===detail.type)?.[1]||'Avtale'}</div>
    <div className="calendar-detail-row"><Clock3 size={16}/><span><b>{new Date(detail.starts_at).toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b><small>{detail.all_day?'Heile dagen':new Date(detail.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})+' – '+new Date(detail.ends_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</small></span></div>
    {detail.client_name&&<div className="calendar-detail-row"><span><b>Kunde</b><small>{detail.client_name}</small></span></div>}
    {detail.status&&<div className="calendar-detail-row"><span><b>Status</b><small>{detail.status}</small></span></div>}
    {detail.description&&<p className="calendar-detail-description">{detail.description}</p>}
    <div className="calendar-modal-actions"><button type="button" className="primary-button" onClick={()=>{const target=detail.source==='class'?'booking':'pt';const classId=detail.source==='class'?detail.id.replace(/^class-/,''):null;setDetail(null);onNavigate(target,classId,detail.source==='pt'?detail.client_id:null)}}>{detail.source==='class'?'Opna gruppetime':'Opna PT-oversikt'}</button></div>
  </section></div>}
  {showForm&&<div className="calendar-modal-backdrop"><form className="calendar-modal" onSubmit={save}><div className="training-heading"><h3>{editing?'Rediger avtale':'Ny avtale'}</h3><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Lukk</button></div><label>Tittel<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>Type<select value={kind} onChange={e=>setKind(e.target.value)}>{types.map(([id,label])=><option value={id} key={id} disabled={Boolean(editing)&&['pt','class'].includes(id)&&id!==editing.type}>{label}</option>)}</select></label><label>Kunde (valfritt)<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Ingen kunde</option>{clients.map(x=><option value={x.id} key={x.id}>{x.display_name}</option>)}</select></label><div className="engine-fields"><label>Start<DnaDateTimeInput type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>Slutt<DnaDateTimeInput type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} required/></label></div><label>Notat<textarea value={description} onChange={e=>setDescription(e.target.value)} rows="3"/></label><div className="calendar-modal-actions"><button className="primary-button" disabled={saving||removing}>{saving?'Lagrar …':editing?'Lagre endring':'Opprett avtale'}</button>{editing&&<button type="button" className="secondary-button" disabled={saving||removing} onClick={remove}>{removing?'Slettar …':'Slett'}</button>}</div></form></div>}
 </div>
}
