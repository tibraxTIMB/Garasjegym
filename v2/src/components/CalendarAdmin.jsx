import {useEffect,useMemo,useState} from 'react'
import {CalendarDays,ChevronLeft,ChevronRight,Plus,Clock3,LoaderCircle} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const pad=n=>String(n).padStart(2,'0')
const toLocalInput=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)
const types=[['pt','PT-time'],['class','Gruppetime'],['meeting','Møte'],['maintenance','Drift'],['other','Anna']]
const tone={pt:'pt',class:'class',meeting:'meeting',maintenance:'maintenance',other:'other'}
export default function CalendarAdmin({onNavigate=()=>{}}){
 const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1)),[focusDay,setFocusDay]=useState(()=>new Date())
 const [events,setEvents]=useState([]),[sessions,setSessions]=useState([]),[classes,setClasses]=useState([])
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [mode,setMode]=useState('month'),[showForm,setShowForm]=useState(false),[editing,setEditing]=useState(null)
 const [title,setTitle]=useState(''),[kind,setKind]=useState('meeting'),[start,setStart]=useState(()=>toLocalInput(new Date())),[end,setEnd]=useState(()=>toLocalInput(new Date(Date.now()+3600000))),[description,setDescription]=useState(''),[client,setClient]=useState('')
 const [clients,setClients]=useState([]),[detail,setDetail]=useState(null)
 const from=new Date(month.getFullYear(),month.getMonth(),1),to=new Date(month.getFullYear(),month.getMonth()+1,1)
 async function load(){
  setLoading(true);setError('')
  const [e,p,c,m]=await Promise.all([
   supabase.from('calendar_events').select('id,title,event_type,starts_at,ends_at,all_day,description,client_id,pt_session_id,class_id').gte('starts_at',new Date(from.getFullYear(),from.getMonth()-1,1).toISOString()).lt('starts_at',new Date(to.getFullYear(),to.getMonth()+1,1).toISOString()).order('starts_at'),
   supabase.from('pt_sessions').select('id,title,client_id,starts_at,duration_minutes,status,profiles:profiles!pt_sessions_client_id_fkey(display_name)').gte('starts_at',new Date(from.getFullYear(),from.getMonth()-1,1).toISOString()).lt('starts_at',new Date(to.getFullYear(),to.getMonth()+1,1).toISOString()).order('starts_at'),
   supabase.from('classes').select('id,title,type,starts_at,duration_minutes,published,cancelled_at,cancellation_note,description').gte('starts_at',new Date(from.getFullYear(),from.getMonth()-1,1).toISOString()).lt('starts_at',new Date(to.getFullYear(),to.getMonth()+1,1).toISOString()).order('starts_at'),
   supabase.from('profiles').select('id,display_name').eq('active',true).order('display_name')
  ])
  if(e.error)setError(e.error.message);else setEvents(e.data||[])
  if(p.error)setError(p.error.message);else setSessions(p.data||[])
  if(c.error)setError(c.error.message);else setClasses(c.data||[])
  if(m.error)setError(m.error.message);else setClients(m.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[month])
 const rows=useMemo(()=>[
  ...events.map(x=>({...x,source:'manual',type:x.event_type})),
  ...sessions.map(x=>({id:'pt-'+x.id,title:x.title||'PT-time',type:'pt',starts_at:x.starts_at,ends_at:new Date(new Date(x.starts_at).getTime()+(x.duration_minutes||60)*60000).toISOString(),source:'pt',status:x.status,client_name:x.profiles?.display_name})),
  ...classes.map(x=>({id:'class-'+x.id,title:x.cancelled_at?'AVLYST · '+x.title:x.published===false?'UTKAST · '+x.title:x.title,type:'class',starts_at:x.starts_at,ends_at:new Date(new Date(x.starts_at).getTime()+(x.duration_minutes||60)*60000).toISOString(),description:x.cancellation_note||x.description,published:x.published,cancelled_at:x.cancelled_at,source:'class'}))
 ].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),[events,sessions,classes])
 const days=mode==='day'?1:mode==='week'?7:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()
 const startDay=mode==='week'?((new Date().getDay()+6)%7):((from.getDay()+6)%7)
 const visibleDays=mode==='day'?[focusDay]:mode==='week'?Array.from({length:7},(_,i)=>{const d=new Date(focusDay);d.setDate(d.getDate()-((d.getDay()+6)%7)+i);return d}):Array.from({length:days},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1))
 const dayRows=d=>rows.filter(x=>new Date(x.starts_at).toDateString()===d.toDateString())
 function openNew(d=new Date()){setEditing(null);setTitle('');setKind('meeting');setDescription('');setClient('');const s=new Date(d);s.setHours(10,0,0,0);setStart(toLocalInput(s));setEnd(toLocalInput(new Date(s.getTime()+3600000)));setShowForm(true)}
 function openEdit(e){
  if(e.source!=='manual'){setDetail(e);return}
  setEditing(e);setTitle(e.title);setKind(e.type);setDescription(e.description||'');setClient(e.client_id||'');setStart(toLocalInput(new Date(e.starts_at)));setEnd(toLocalInput(new Date(e.ends_at)));setShowForm(true)
 }
 async function save(ev){ev.preventDefault();setError('');setNotice('');if(new Date(end)<=new Date(start)){setError('Sluttid må vera etter starttid.');return}
  const {data:{user}}=await supabase.auth.getUser()
  const startsAt=new Date(start).toISOString(),endsAt=new Date(end).toISOString()
  if(!editing&&kind==='pt'){
   const {error:e}=await supabase.from('pt_sessions').insert({client_id:client||null,title:title.trim(),starts_at:startsAt,duration_minutes:Math.max(1,Math.round((new Date(end)-new Date(start))/60000)),capacity:1,status:'planned',created_by:user.id,message:description.trim()||'Oppretta frå administratorkalenderen'})
   if(e){setError(e.message);return}
  }else if(!editing&&kind==='class'){
   const {error:e}=await supabase.from('classes').insert({title:title.trim(),type:'Gruppetime',starts_at:startsAt,duration_minutes:Math.max(1,Math.round((new Date(end)-new Date(start))/60000)),capacity:12,description:description.trim(),created_by:user.id})
   if(e){setError(e.message);return}
  }else{
   const values={title:title.trim(),event_type:kind,starts_at:startsAt,ends_at:endsAt,description:description.trim(),client_id:client||null,created_by:user.id}
   const result=editing?await supabase.from('calendar_events').update(values).eq('id',editing.id):await supabase.from('calendar_events').insert(values)
   if(result.error){setError(result.error.message);return}
  }
  setShowForm(false);setNotice(kind==='pt'?'PT-time oppretta i PT-systemet.':kind==='class'?'Gruppetime oppretta i booking og kalender.':editing?'Avtalen er oppdatert.':'Avtalen er lagra.');await load()
 }
 async function remove(){if(!editing||!window.confirm('Sletta avtalen?'))return;const {error:e}=await supabase.from('calendar_events').delete().eq('id',editing.id);if(e)setError(e.message);else{setShowForm(false);setNotice('Avtalen er sletta.');await load()}}
 return <div className="calendar-admin">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · ADMIN</div><h3>Kalender</h3><p>PT-timar, gruppetimar og eigne avtalar samla på ein stad.</p></div><button className="primary-button" onClick={()=>openNew()}><Plus size={16}/> Ny avtale</button></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  <section className="engine-section">
   <div className="calendar-toolbar"><div className="calendar-month-nav"><button className="secondary-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={16}/></button><strong>{mode==='day'?focusDay.toLocaleDateString('nn-NO',{dateStyle:'full'}):mode==='week'?'Veke '+focusDay.toLocaleDateString('nn-NO',{day:'2-digit',month:'long'}):month.toLocaleDateString('nn-NO',{month:'long',year:'numeric'})}</strong><button className="secondary-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={16}/></button><button className="secondary-button" onClick={()=>{const d=new Date();setFocusDay(d);setMonth(new Date(d.getFullYear(),d.getMonth(),1))}}>I dag</button></div><div className="calendar-view-switch">{['day','week','month'].map(x=><button key={x} className={mode===x?'selected':''} onClick={()=>setMode(x)}>{x==='day'?'Dag':x==='week'?'Veke':'Månad'}</button>)}</div></div>
   <div className="calendar-legend">{types.map(([id,label])=><span key={id}><i className={'calendar-dot '+tone[id]}/>{label}</span>)}</div>
   {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar kalender …</div>:<div className="calendar-grid"><div className="calendar-weekdays">{['Mån','Tys','Ons','Tor','Fre','Laur','Sun'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-days">{mode==='month'&&Array.from({length:startDay},(_,i)=><div className="calendar-day empty" key={'empty'+i}/>)}{visibleDays.map(d=><div className={'calendar-day '+(d.toDateString()===new Date().toDateString()?'today':'')} key={d.toISOString()}><button className="calendar-day-number" onClick={()=>openNew(d)}>{d.getDate()} <Plus size={12}/></button>{dayRows(d).map(e=><button key={e.id} className={'calendar-event '+tone[e.type]} title={e.title+' · '+new Date(e.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})} onClick={()=>openEdit(e)}><b>{new Date(e.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</b> {e.title}{e.client_name?' · '+e.client_name:''}</button>)}</div>)}</div></div>}
  </section>
  <section className="engine-section"><h4>Komande avtalar</h4>{rows.filter(x=>new Date(x.starts_at)>=new Date()&&new Date(x.starts_at)<new Date(Date.now()+7*86400000)).slice(0,12).map(e=><article className="calendar-upcoming" key={e.id}><div><strong>{e.title}</strong><small>{new Date(e.starts_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}{e.client_name?' · '+e.client_name:''}</small></div><span>{types.find(t=>t[0]===e.type)?.[1]||'Anna'}</span></article>)}</section>
  {detail&&<div className="calendar-modal-backdrop" onClick={()=>setDetail(null)}><section className="calendar-modal calendar-detail-modal" role="dialog" aria-modal="true" aria-label="Avtaledetaljar" onClick={e=>e.stopPropagation()}>
    <div className="training-heading"><div><div className="section-kicker">KALENDER · DETALJAR</div><h3>{detail.title}</h3></div><button type="button" className="secondary-button" onClick={()=>setDetail(null)}>Lukk</button></div>
    <div className="calendar-detail-type">{detail.cancelled_at?'Avlyst gruppetime':detail.published===false?'Utkast gruppetime':types.find(t=>t[0]===detail.type)?.[1]||'Avtale'}</div>
    <div className="calendar-detail-row"><Clock3 size={16}/><span><b>{new Date(detail.starts_at).toLocaleDateString('nn-NO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b><small>{new Date(detail.starts_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})} – {new Date(detail.ends_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</small></span></div>
    {detail.client_name&&<div className="calendar-detail-row"><span><b>Kunde</b><small>{detail.client_name}</small></span></div>}
    {detail.status&&<div className="calendar-detail-row"><span><b>Status</b><small>{detail.status}</small></span></div>}
    {detail.description&&<p className="calendar-detail-description">{detail.description}</p>}
    <div className="calendar-modal-actions"><button type="button" className="primary-button" onClick={()=>{const target=detail.source==='class'?'booking':'pt';const classId=detail.source==='class'?detail.id.replace(/^class-/,''):null;setDetail(null);onNavigate(target,classId)}}>{detail.source==='class'?'Opna gruppetime':'Opna PT-oversikt'}</button></div>
  </section></div>}
  {showForm&&<div className="calendar-modal-backdrop"><form className="calendar-modal" onSubmit={save}><div className="training-heading"><h3>{editing?'Rediger avtale':'Ny avtale'}</h3><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Lukk</button></div><label>Tittel<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>Type<select value={kind} onChange={e=>setKind(e.target.value)}>{types.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label><label>Kunde (valfritt)<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Ingen kunde</option>{clients.map(x=><option value={x.id} key={x.id}>{x.display_name}</option>)}</select></label><div className="engine-fields"><label>Start<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>Slutt<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} required/></label></div><label>Notat<textarea value={description} onChange={e=>setDescription(e.target.value)} rows="3"/></label><div className="calendar-modal-actions"><button className="primary-button">{editing?'Lagre endring':'Opprett avtale'}</button>{editing&&<button type="button" className="secondary-button" onClick={remove}>Slett</button>}</div></form></div>}
 </div>
}
