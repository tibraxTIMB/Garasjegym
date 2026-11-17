import { useEffect,useState } from 'react'
import { CalendarClock,CheckCircle2,LoaderCircle,Plus,UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'
import WodBuilder from './WodBuilder.jsx'

function CalendarSelect({value,onChange,label='Vel dato'}) {
 const [month,setMonth]=useState(()=>{const d=value?new Date(value):new Date();return new Date(d.getFullYear(),d.getMonth(),1)})
 const selected=value?value.slice(0,10):''
 const time=value&&value.length>10?value.slice(11,16):'10:00'
 const year=month.getFullYear(),m=month.getMonth()
 const first=new Date(year,m,1).getDay(),offset=(first+6)%7,days=new Date(year,m+1,0).getDate()
 const dateKey=d=>year+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')
 return <div className="pt-calendar"><div className="pt-calendar-head"><strong>{label}</strong><div><button type="button" onClick={()=>setMonth(new Date(year,m-1,1))}>‹</button><span>{month.toLocaleDateString('nn-NO',{month:'long',year:'numeric'})}</span><button type="button" onClick={()=>setMonth(new Date(year,m+1,1))}>›</button></div></div><div className="pt-calendar-grid">{['M','T','O','T','F','L','S'].map((d,i)=><span className="pt-calendar-weekday" key={i}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>i+1).map(d=><button type="button" key={d} className={selected===dateKey(d)?'selected':''} onClick={()=>onChange(dateKey(d)+'T'+time)}>{d}</button>)}</div><label className="pt-calendar-time">Klokkeslett<input type="time" value={time} onChange={e=>onChange((selected||dateKey(new Date().getDate()))+'T'+e.target.value)}/></label></div>
}
export default function PT({profile,focusRequestId,onFocusConsumed}){
 const staff=isStaff(profile)
 const [sessions,setSessions]=useState([]),[bookings,setBookings]=useState([]),[requests,setRequests]=useState([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [showCreate,setShowCreate]=useState(false),[showRequest,setShowRequest]=useState(false),[activeClient,setActiveClient]=useState(''),[customerDraft,setCustomerDraft]=useState(''),[showWodBuilder,setShowWodBuilder]=useState(false),[activePanel,setActivePanel]=useState('oversikt')
 const [title,setTitle]=useState('Personleg trening'),[starts,setStarts]=useState(''),[duration,setDuration]=useState('60'),[capacity,setCapacity]=useState('1'),[price,setPrice]=useState('')
 const [goal,setGoal]=useState(''),[preferred,setPreferred]=useState(''),[alternative,setAlternative]=useState(''),[availability,setAvailability]=useState('')
 const [members,setMembers]=useState([]),[messages,setMessages]=useState([]),[notes,setNotes]=useState([]),[plans,setPlans]=useState({}),[exerciseLibrary,setExerciseLibrary]=useState([]),[planDrafts,setPlanDrafts]=useState({}),[wodLibrary,setWodLibrary]=useState([]),[prescribeClient,setPrescribeClient]=useState(''),[prescribeWod,setPrescribeWod]=useState(''),[prescribeAt,setPrescribeAt]=useState('')
 const [messageClient,setMessageClient]=useState(''),[messageText,setMessageText]=useState('')
 const [noteClient,setNoteClient]=useState(''),[noteGoals,setNoteGoals]=useState(''),[noteText,setNoteText]=useState(''),[followUp,setFollowUp]=useState(''),[requestDrafts,setRequestDrafts]=useState({})
 async function load(silent=false){
  if(!silent)setLoading(true);setError('')
  const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user){setError('Logg inn på nytt.');setLoading(false);return}
  const [s,b,r,m,p,n,pe,ex,wd]=await Promise.all([
   supabase.from('pt_sessions').select('id,title,client_id,starts_at,duration_minutes,capacity,price,status,prep,message,custom_workout,wod_ids').in('status',staff?['draft','published','planned','completed']:['published','planned']).gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50).then(result=>staff?result:{...result,data:(result.data||[]).filter(row=>row.status==='published'||row.client_id===user.id)}),
   supabase.from('pt_bookings').select('id,session_id,status,note').eq('member_id',user.id),
   supabase.from('pt_requests').select('id,member_id,preferred_at,alternative_at,availability_note,goal,status,staff_note,created_at,handled_at').order('created_at',{ascending:false}).limit(100).then(result=>staff?result:{...result,data:(result.data||[]).filter(row=>row.member_id===user.id)}),
   staff ? supabase.from('profiles').select('id,display_name').eq('active',true).order('display_name') : Promise.resolve({data:[],error:null}),
   supabase.from('pt_messages').select('id,client_id,sender_id,body,created_at').order('created_at',{ascending:true}).limit(200),
   staff ? supabase.from('pt_client_notes').select('id,client_id,coach_id,goals,note,follow_up_at,created_at').order('updated_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
   supabase.from('pt_session_exercises').select('id,session_id,sort_order,phase,exercise_name,sets,reps,target_load,rest_seconds,notes').order('sort_order'),
   supabase.from('exercises').select('id,name,category,video_url').eq('is_active',true).order('name'),
   supabase.from('wods').select('id,name,format,duration_minutes,movements,notes').eq('is_published',true).order('created_at',{ascending:false})
  ])
  if(s.error)setError(s.error.message);else setSessions(s.data||[])
  if(b.error)setError(b.error.message);else setBookings(b.data||[])
  if(r.error)setError(r.error.message);else setRequests(r.data||[])
  if(m.error)setError(m.error.message);else {setMembers(m.data||[]);if(m.data?.length){setActiveClient(v=>v||m.data[0].id);setCustomerDraft(v=>v||m.data[0].id);setMessageClient(v=>v||m.data[0].id);setNoteClient(v=>v||m.data[0].id)}}
  if(p.error)setError(p.error.message);else setMessages(p.data||[])
  if(n.error)setError(n.error.message);else setNotes(n.data||[])
  if(pe.error)setError(pe.error.message);else setPlans((pe.data||[]).reduce((acc,row)=>{(acc[row.session_id] ||= []).push(row);return acc},{}))
  if(ex.error)setError(ex.error.message);else setExerciseLibrary(ex.data||[])
  if(wd.error)setError(wd.error.message);else setWodLibrary(wd.data||[])
  setLoading(false)
 }
 useEffect(()=>{load();const refresh=setInterval(()=>load(true),60000);return()=>clearInterval(refresh)},[])
 const hasUnsavedWork=Boolean(showWodBuilder||messageText.trim()||noteGoals.trim()||noteText.trim()||followUp||Object.values(planDrafts).some(d=>d&&Object.values(d).some(v=>String(v||'').trim())));
 useEffect(()=>{if(!hasUnsavedWork)return;const warn=e=>{e.preventDefault();e.returnValue='Du har endringar som ikkje er lagra.'};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[hasUnsavedWork]);
 useEffect(()=>{if(!staff||!focusRequestId||!requests.length)return;const target=requests.find(row=>row.id===focusRequestId);if(target)setActiveClient(target.member_id);const timer=setTimeout(()=>{document.getElementById('pt-request-'+focusRequestId)?.scrollIntoView({behavior:'smooth',block:'center'});onFocusConsumed?.()},120);return()=>clearTimeout(timer)},[staff,focusRequestId,requests])
 async function prescribeWorkout(event){
  event.preventDefault();setBusy('prescribe');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!prescribeClient||!prescribeWod)throw new Error('Vel PT-klient og WOD.')
   const wod=wodLibrary.find(x=>x.id===prescribeWod)
   const {error:e}=await supabase.from('pt_sessions').insert({client_id:prescribeClient,title:wod.name,starts_at:prescribeAt?new Date(prescribeAt).toISOString():new Date().toISOString(),duration_minutes:wod.duration_minutes||60,capacity:1,status:'planned',created_by:user.id,wod_ids:[wod.id],message:'Foreskriven WOD: '+wod.format})
   if(e)throw e
   setNotice('WOD er foreskriven til PT-klienten.');setPrescribeWod('');setPrescribeAt('');await load()
  }catch(e){setError(e.message||'Kunne ikkje foreskriva WOD.')}finally{setBusy('')}
 }
  async function addPlanExercise(event,session){
  event.preventDefault();const draft=planDrafts[session.id]||{};const exercise=exerciseLibrary.find(x=>x.id===draft.exerciseId)
  if(!exercise){setError('Vel ei øving frå biblioteket.');return}
  setBusy('plan-'+session.id);setError('');setNotice('')
  try{
   const rows=plans[session.id]||[]
   const {data,error:e}=await supabase.from('pt_session_exercises').insert({session_id:session.id,sort_order:rows.length,phase:draft.phase||'main',exercise_name:exercise.name,sets:draft.sets?Number(draft.sets):null,reps:draft.reps||'',target_load:draft.targetLoad||'',rest_seconds:draft.rest?Number(draft.rest):null,notes:draft.notes||''}).select('id,session_id,sort_order,phase,exercise_name,sets,reps,target_load,rest_seconds,notes').single()
   if(e)throw e
   setPlans(v=>({...v,[session.id]:[...(v[session.id]||[]),data]}));setPlanDrafts(v=>({...v,[session.id]:{}}));setNotice('Øving lagra i PT-programmet.')
  }catch(e){setError(e.message||'Kunne ikkje lagra øvinga.')}finally{setBusy('')}
 }
 async function removePlanExercise(row){
  setBusy('plan-'+row.id);setError('')
  try{const {error:e}=await supabase.from('pt_session_exercises').delete().eq('id',row.id);if(e)throw e;setPlans(v=>({...v,[row.session_id]:(v[row.session_id]||[]).filter(x=>x.id!==row.id)}))}
  catch(e){setError(e.message||'Kunne ikkje fjerna øvinga.')}finally{setBusy('')}
 }
 async function book(session){
  setBusy(session.id);setError('');setNotice('')
  try{
   const {data,error:e}=await supabase.rpc('book_pt_session',{p_session_id:session.id})
   if(e)throw e
   const status=data?.[0]?.status||'booked'
   setNotice(status==='waitlist'?'Du er sett på venteliste.':'PT-timen er bestilt.')
   await load()
  }catch(e){setError(e.message||'Kunne ikkje bestilla PT-time.')}
  finally{setBusy('')}
 }
 async function create(event){
  event.preventDefault();setBusy('create');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_sessions').insert({title:title.trim(),starts_at:new Date(starts).toISOString(),duration_minutes:Number(duration),capacity:Number(capacity),price:price===''?null:Number(price),status:'published',created_by:user.id})
   if(e)throw e
   setShowCreate(false);setNotice('PT-time publisert.');await load()
  }catch(e){setError(e.message||'Kunne ikkje oppretta PT-time.')}
  finally{setBusy('')}
 }
 async function request(event){
  event.preventDefault();setBusy('request');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_requests').insert({member_id:user.id,preferred_at:preferred?new Date(preferred).toISOString():null,alternative_at:alternative?new Date(alternative).toISOString():null,availability_note:availability.trim(),goal:goal.trim()})
   if(e)throw e
   setShowRequest(false);setGoal('');setAvailability('');setNotice('PT-førespurnaden er sendt.');await load()
  }catch(e){setError(e.message||'Kunne ikkje senda førespurnaden.')}
  finally{setBusy('')}
 }
 async function updateRequest(request){
  const draft=requestDrafts[request.id]||{}
  setBusy('request-'+request.id);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_requests').update({status:draft.status||request.status,staff_note:draft.staffNote??request.staff_note,handled_by:user.id,handled_at:new Date().toISOString()}).eq('id',request.id)
   if(e)throw e
   setRequests(v=>v.map(row=>row.id===request.id?{...row,status:draft.status||row.status,staff_note:draft.staffNote??row.staff_note,handled_at:new Date().toISOString()}:row))
   setNotice('PT-førespurnaden er oppdatert.')
  }catch(e){setError(e.message||'Kunne ikkje oppdatera førespurnaden.')}finally{setBusy('')}
 }
 async function setRequestDecision(request,status){
  setBusy('request-'+request.id);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const draft=requestDrafts[request.id]||{}
   const {error:e}=await supabase.from('pt_requests').update({status,staff_note:draft.staffNote??request.staff_note,handled_by:user.id,handled_at:new Date().toISOString()}).eq('id',request.id)
   if(e)throw e
   setRequests(rows=>rows.map(row=>row.id===request.id?{...row,status,staff_note:draft.staffNote??row.staff_note,handled_at:new Date().toISOString()}:row))
   setNotice(status==='approved'?'PT-førespurnaden er godkjend.':'PT-førespurnaden er avslått.')
  }catch(e){setError(e.message||'Kunne ikkje oppdatera førespurnaden.')}finally{setBusy('')}
 }
 async function createSessionFromRequest(request){
  const draft=requestDrafts[request.id]||{}
  if(!draft.sessionAt){setError('Vel dato og klokkeslett for PT-timen.');return}
  setBusy('request-'+request.id);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {data:createdSession,error:e}=await supabase.from('pt_sessions').insert({client_id:request.member_id,title:'Personleg trening',starts_at:new Date(draft.sessionAt).toISOString(),duration_minutes:60,capacity:1,status:'planned',created_by:user.id,message:'Oppretta frå PT-førespurnad'}).select('id').single()
   if(e)throw e
   const {error:requestError}=await supabase.from('pt_requests').update({status:'approved',handled_by:user.id,handled_at:new Date().toISOString()}).eq('id',request.id)
   if(requestError){
    // Avoid leaving an orphaned PT session if the request cannot be marked as handled.
    const {error:rollbackError}=await supabase.from('pt_sessions').delete().eq('id',createdSession.id)
    if(rollbackError)throw new Error('PT-timen vart oppretta, men førespurnaden kunne ikkje oppdaterast. Kontroller PT-time '+createdSession.id+'.')
    throw requestError
   }
   setRequests(v=>v.map(row=>row.id===request.id?{...row,status:'approved',handled_at:new Date().toISOString()}:row))
   setNotice('PT-time oppretta og knytt til medlemmet.');await load()
  }catch(e){setError(e.message||'Kunne ikkje oppretta PT-time frå førespurnaden.')}
  finally{setBusy('')}
 }
 async function sendMessage(event){
  event.preventDefault();setBusy('message');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const clientId=staff?messageClient:user.id
   if(!clientId)throw new Error('Vel ein PT-kunde.')
   const {error:e}=await supabase.from('pt_messages').insert({client_id:clientId,sender_id:user.id,body:messageText.trim()})
   if(e)throw e
   setMessageText('');setNotice('Meldinga er sendt.');await load()
  }catch(e){setError(e.message||'Kunne ikkje senda meldinga.')}finally{setBusy('')}
 }
 async function saveNote(event){
  event.preventDefault();setBusy('note');setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('pt_client_notes').insert({client_id:noteClient,coach_id:user.id,goals:noteGoals.trim(),note:noteText.trim(),follow_up_at:followUp?new Date(followUp).toISOString():null})
   if(e)throw e
   setNoteGoals('');setNoteText('');setFollowUp('');setNotice('PT-notatet er lagra privat.');await load()
  }catch(e){setError(e.message||'Kunne ikkje lagra notatet.')}finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar PT-studio …</div>
 return <div className="pt-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PT-STUDIO</div><h3>Personleg trening</h3></div><div className="pt-actions">{!staff&&<button className="secondary-button" onClick={()=>setShowRequest(v=>!v)}>Be om PT-time</button>}</div></div>
  {staff&&<section className="pt-customer-picker"><div className="section-kicker">KUNDEARBEIDSPLASS</div><div className="pt-customer-picker-row"><label>Vel kunde<select value={customerDraft} onChange={e=>setCustomerDraft(e.target.value)}><option value="">Vel kunde …</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'}</option>)}</select></label><button className="primary-button" type="button" disabled={!customerDraft} onClick={()=>{if(hasUnsavedWork&&!window.confirm('Du har arbeid som ikkje er lagra for denne kunden. Vil du forkasta endringane og byta kunde?'))return;setActiveClient(customerDraft);setMessageClient(customerDraft);setNoteClient(customerDraft);setShowWodBuilder(false);setActivePanel('oversikt')}}>Vel kunde</button></div></section>}
  {staff&&activeClient&&<div className="pt-active-customer"><span>AKTIV KUNDE</span><strong>{members.find(m=>m.id===activeClient)?.display_name||'Kunde'}</strong><small>Du arbeider no med denne kunden. WOD-ar og notat blir knytte til kunden.</small></div>}
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/> {notice}</div>}{staff&&activeClient&&<nav className="pt-workspace-tabs" aria-label="Kundearbeidsflate">{[{id:'oversikt',label:'Oversikt'},{id:'plan',label:'Treningsplan'},{id:'dialog',label:'Dialog'},{id:'notat',label:'Trenarnotat'},{id:'forespurnader',label:'Førespurnader'}].map(t=><button type="button" key={t.id} className={activePanel===t.id?'selected':''} onClick={()=>setActivePanel(t.id)}>{t.label}{t.id==='forespurnader'&&requests.filter(r=>r.member_id===activeClient&&r.status==='pending').length>0?<span>{requests.filter(r=>r.member_id===activeClient&&r.status==='pending').length}</span>:null}</button>)}</nav>}{staff&&activePanel==='plan'&&showWodBuilder&&activeClient&&<div className="pt-inline-wod"><div className="pt-inline-wod-head"><strong>WOD-generator · {members.find(m=>m.id===activeClient)?.display_name||'Aktiv kunde'}</strong><button type="button" className="secondary-button" onClick={()=>{if(window.confirm('Lukka WOD-generatoren? Eventuelle endringar som ikkje er lagra, går tapt.'))setShowWodBuilder(false)}}>Lukk</button></div><WodBuilder assignedClientId={activeClient} onAssigned={()=>{setShowWodBuilder(false);setNotice('WOD er lagra og knytt til aktiv kunde.');load(true)}}/></div>}
  {!staff&&showRequest&&<form className="booking-create" onSubmit={request}><h4>Send PT-førespurnad</h4><label>Kva ønskjer du hjelp med?<textarea rows="3" value={goal} onChange={e=>setGoal(e.target.value)} required placeholder="Mål, utfordringar eller ønskje …"/></label><div className="engine-fields"><CalendarSelect value={preferred} onChange={setPreferred} label="Føretrekt tidspunkt"/><CalendarSelect value={alternative} onChange={setAlternative} label="Alternativt tidspunkt"/></div><label>Tilgjenge / kommentar<input value={availability} onChange={e=>setAvailability(e.target.value)} placeholder="Når passar det elles?"/></label><button className="primary-button" disabled={busy==='request'}>{busy==='request'?'Sender …':'Send førespurnad'}</button></form>}
  {false&&showCreate&&staff&&<form className="booking-create" onSubmit={create}><h4>Publiser PT-time</h4><label>Tittel<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><CalendarSelect value={starts} onChange={setStarts} label="Vel PT-dato"/><div className="engine-fields"><label>Minutt<input type="number" min="5" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Kapasitet<input type="number" min="1" max="20" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label><label>Pris (kr)<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Valfritt"/></label></div><button className="primary-button" disabled={busy==='create'}>Publiser PT-time</button></form>}
  {staff&&activePanel==='plan'&&activeClient&&!showWodBuilder&&<div className="pt-customer-wod-action"><div><strong>Lag treningsøkt</strong><p>Opne WOD-generatoren utan å forlata kundebiletet. Økta blir automatisk knytt til {members.find(m=>m.id===activeClient)?.display_name||'kunden'}.</p></div><button className="primary-button" type="button" onClick={()=>setShowWodBuilder(true)}><Plus size={15}/> Lag WOD til kunden</button></div>}
  {(!staff||activePanel==='plan')&&<section className="engine-section"><div className="engine-section-title"><h4>{staff?'Kunden sine treningsøkter':'Ledige PT-timar'}</h4><span>{staff?sessions.filter(s=>s.client_id===activeClient).length+' økter':sessions.filter(s=>s.status==='published').length+' publiserte'}</span></div>
   {sessions.filter(s=>!staff||s.client_id===activeClient).length?<div className="class-list">{sessions.filter(s=>!staff||s.client_id===activeClient).map(s=>{const d=new Date(s.starts_at),mine=bookings.find(b=>b.session_id===s.id&&['booked','waitlist'].includes(b.status));return <article className="class-card" key={s.id}><div className="class-date"><UserRound size={21}/><span>PT</span></div><div className="class-info"><div className="class-card-top"><span>{s.status}</span><span><CalendarClock size={13}/>{d.toLocaleDateString('nn-NO')} · {d.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{s.title}</h4><small>{s.duration_minutes} min · Kapasitet {s.capacity}{s.price!=null?' · '+s.price+' kr':''}</small>{s.message&&<p>{s.message}</p>}{(s.wod_ids||[]).map(id=>wodLibrary.find(w=>w.id===id)).filter(Boolean).map(w=><div className="pt-prescribed-wod" key={w.id}><strong>Foreskriven WOD: {w.name}</strong><small>{w.format} · {w.duration_minutes||'–'} min</small><p>{w.movements}</p>{w.notes&&<small>{w.notes}</small>}</div>)}</div><div className="class-action">{s.client_id===profile.id?<span className="booking-confirmed">Din PT-time</span>:mine?<span className="booking-confirmed">{mine.status==='waitlist'?'Venteliste':'Bestilt'}</span>:s.status==='published'&&<button className="primary-button" disabled={busy===s.id} onClick={()=>book(s)}>{busy===s.id?'Vent …':'Bestill'}</button>}</div>{(plans[s.id]||[]).length>0&&<div className="pt-plan-list"><strong>Treningsprogram</strong>{(plans[s.id]||[]).map(row=><div className="live-result-row" key={row.id}><span><b>{row.exercise_name}</b> {exerciseLibrary.find(x=>x.name===row.exercise_name)?.video_url&&<a href={exerciseLibrary.find(x=>x.name===row.exercise_name).video_url} target="_blank" rel="noreferrer">Sjå video</a>} · {row.phase==='warmup'?'Oppvarming':row.phase==='cooldown'?'Avslutning':'Hovuddel'} · {row.sets?row.sets+' × ':''}{row.reps}{row.target_load?' · '+row.target_load:''}{row.rest_seconds?' · '+row.rest_seconds+' sek pause':''}{row.notes?' — '+row.notes:''}</span>{staff&&<button className="secondary-button" disabled={busy==='plan-'+row.id} onClick={()=>removePlanExercise(row)}>Fjern</button>}</div>)}</div>}{staff&&<form className="admin-create-form pt-plan-form" onSubmit={e=>addPlanExercise(e,s)}><strong>Bygg PT-program</strong><div className="engine-fields"><label>Øving<select required value={planDrafts[s.id]?.exerciseId||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],exerciseId:e.target.value}}))}><option value="">Vel øving</option>{exerciseLibrary.map(x=><option key={x.id} value={x.id}>{x.name} · {x.category}</option>)}</select></label><label>Del<select value={planDrafts[s.id]?.phase||'main'} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],phase:e.target.value}}))}><option value="warmup">Oppvarming</option><option value="main">Hovuddel</option><option value="cooldown">Avslutning</option></select></label></div><div className="engine-fields three"><label>Sett<input type="number" min="1" max="30" value={planDrafts[s.id]?.sets||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],sets:e.target.value}}))}/></label><label>Reps<input value={planDrafts[s.id]?.reps||''} placeholder="8–10" onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],reps:e.target.value}}))}/></label><label>Pause (sek.)<input type="number" min="0" value={planDrafts[s.id]?.rest||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],rest:e.target.value}}))}/></label></div><div className="engine-fields"><label>Belastning<input value={planDrafts[s.id]?.targetLoad||''} placeholder="t.d. 60 kg / RPE 7" onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],targetLoad:e.target.value}}))}/></label><label>Notat<input value={planDrafts[s.id]?.notes||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],notes:e.target.value}}))}/></label></div><button className="secondary-button" disabled={busy==='plan-'+s.id||!planDrafts[s.id]?.exerciseId}><Plus size={14}/> Legg til øving</button></form>}</article>})}</div>:<div className="empty-state">{staff?'Ingen treningsøkter er knytte til denne kunden enno. Lag ein WOD i arbeidsflata over.':'Ingen publiserte PT-timar no. Du kan senda ein førespurnad.'}</div>}
  </section>}
  {(!staff||activePanel==='dialog')&&<section className="engine-section">
   <div className="engine-section-title"><h4>PT-dialog</h4><span>Privat mellom medlem og trenar</span></div>

   <div className="pt-message-list">{messages.filter(m=>staff?m.client_id===messageClient:m.client_id===profile.id).map(m=><article className="history-card" key={m.id}><div className="history-card-top"><strong>{m.sender_id===profile.id?'Du':members.find(x=>x.id===m.sender_id)?.display_name||(m.sender_id===m.client_id?'Medlem':'Trenar')}</strong><small>{new Date(m.created_at).toLocaleString('nn-NO')}</small></div><p>{m.body}</p></article>)}</div>
   <form className="admin-create-form" onSubmit={sendMessage}><textarea rows="2" value={messageText} onChange={e=>setMessageText(e.target.value)} required maxLength="3000" placeholder="Skriv ei melding …"/><button className="primary-button" disabled={busy==='message'||!messageText.trim()}>Send melding</button></form>
  </section>}
  {false&&staff&&<section className="engine-section"><h4>Foreskriv WOD til PT-klient</h4><form className="admin-create-form" onSubmit={prescribeWorkout}><label>PT-klient<select required value={prescribeClient} onChange={e=>setPrescribeClient(e.target.value)}><option value="">Vel klient</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'}</option>)}</select></label><label>WOD<select required value={prescribeWod} onChange={e=>setPrescribeWod(e.target.value)}><option value="">Vel WOD</option>{wodLibrary.map(w=><option key={w.id} value={w.id}>{w.name} · {w.format}</option>)}</select></label><label>Dato / tidspunkt (valfritt)<input type="datetime-local" value={prescribeAt} onChange={e=>setPrescribeAt(e.target.value)}/></label><button className="primary-button" disabled={busy==='prescribe'||!prescribeClient||!prescribeWod}>Foreskriv WOD</button></form></section>}
  {staff&&activePanel==='notat'&&<section className="engine-section"><h4>Private trenarnotat</h4><p className="section-kicker">Berre synleg for trenarar og administratorar</p>
   <form className="admin-create-form" onSubmit={saveNote}>

    <label>Mål<textarea rows="2" value={noteGoals} onChange={e=>setNoteGoals(e.target.value)} required/></label>
    <label>Notat<textarea rows="3" value={noteText} onChange={e=>setNoteText(e.target.value)} required/></label>
    <label>Neste oppfølging<input type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>
    <button className="primary-button" disabled={busy==='note'||!noteClient}>Lagra notat</button>
   </form>
   {notes.filter(n=>n.client_id===activeClient).map(n=><article className="history-card" key={n.id}><strong>{members.find(m=>m.id===n.client_id)?.display_name||'Medlem'}</strong><p><b>Mål:</b> {n.goals}</p><p>{n.note}</p><small>{n.follow_up_at?'Oppfølging: '+new Date(n.follow_up_at).toLocaleString('nn-NO'):'Ingen oppfølgingsdato'}</small></article>)}
  </section>}
  {(!staff||activePanel==='forespurnader')&&<section className="engine-section"><h4>{staff?'PT-førespurnader':'Mine førespurnader'}</h4>{requests.filter(r=>!staff||r.member_id===activeClient).length?requests.filter(r=>!staff||r.member_id===activeClient).map(r=><article id={"pt-request-"+r.id} className={"history-card pt-request-card "+(r.id===focusRequestId?"focused":"")} key={r.id}><div className="history-card-top"><strong>{staff?(members.find(m=>m.id===r.member_id)?.display_name||'Medlem')+' · ':''}{r.goal}</strong><span>{r.status}</span></div><small>{r.preferred_at?'Ønskt: '+new Date(r.preferred_at).toLocaleString('nn-NO'):'Tidspunkt ikkje valt'}{r.alternative_at?' · Alternativ: '+new Date(r.alternative_at).toLocaleString('nn-NO'):''}</small>{r.availability_note&&<p>Tilgjenge: {r.availability_note}</p>}{staff?<div className="admin-create-form"><div className="pt-request-decision"><strong>Status: {r.status==='pending'?'Ventande':r.status==='approved'?'Godkjend':r.status==='declined'?'Avslått':r.status}</strong><div><button type="button" className="primary-button" disabled={busy==='request-'+r.id||r.status==='approved'} onClick={()=>setRequestDecision(r,'approved')}>Godkjenn</button><button type="button" className="secondary-button" disabled={busy==='request-'+r.id||r.status==='declined'} onClick={()=>setRequestDecision(r,'declined')}>Avslå</button></div></div><CalendarSelect value={requestDrafts[r.id]?.sessionAt||r.preferred_at?.slice(0,16)||''} onChange={value=>setRequestDrafts(v=>({...v,[r.id]:{...v[r.id],sessionAt:value}}))} label="Vel tidspunkt for PT-time"/><button className="secondary-button" disabled={busy==='request-'+r.id||(!requestDrafts[r.id]?.sessionAt&&!r.preferred_at)} onClick={()=>createSessionFromRequest(r)}>Opprett PT-time for medlem</button><label>Tilbakemelding / internt notat<textarea rows="2" value={requestDrafts[r.id]?.staffNote??r.staff_note??''} onChange={e=>setRequestDrafts(v=>({...v,[r.id]:{...v[r.id],staffNote:e.target.value}}))}/></label><button className="secondary-button" disabled={busy==='request-'+r.id} onClick={()=>updateRequest(r)}>Lagra svar</button></div>:r.staff_note&&<p>{r.staff_note}</p>}</article>):<div className="empty-state">{staff?'Ingen PT-førespurnader mottatt.':'Ingen PT-førespurnader sende.'}</div>}</section>
 </div>
}
