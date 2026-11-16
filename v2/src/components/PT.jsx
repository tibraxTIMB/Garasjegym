import { useEffect,useState } from 'react'
import { CalendarClock,CheckCircle2,LoaderCircle,Plus,UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'

export default function PT({profile}){
 const staff=isStaff(profile)
 const [sessions,setSessions]=useState([]),[bookings,setBookings]=useState([]),[requests,setRequests]=useState([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [showCreate,setShowCreate]=useState(false),[showRequest,setShowRequest]=useState(false)
 const [title,setTitle]=useState('Personleg trening'),[starts,setStarts]=useState(''),[duration,setDuration]=useState('60'),[capacity,setCapacity]=useState('1'),[price,setPrice]=useState('')
 const [goal,setGoal]=useState(''),[preferred,setPreferred]=useState(''),[alternative,setAlternative]=useState(''),[availability,setAvailability]=useState('')
 const [members,setMembers]=useState([]),[messages,setMessages]=useState([]),[notes,setNotes]=useState([]),[plans,setPlans]=useState({}),[exerciseLibrary,setExerciseLibrary]=useState([]),[planDrafts,setPlanDrafts]=useState({})
 const [messageClient,setMessageClient]=useState(''),[messageText,setMessageText]=useState('')
 const [noteClient,setNoteClient]=useState(''),[noteGoals,setNoteGoals]=useState(''),[noteText,setNoteText]=useState(''),[followUp,setFollowUp]=useState('')
 async function load(){
  setLoading(true);setError('')
  const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user){setError('Logg inn på nytt.');setLoading(false);return}
  const [s,b,r,m,p,n,pe,ex]=await Promise.all([
   supabase.from('pt_sessions').select('id,title,starts_at,duration_minutes,capacity,price,status,prep,message,custom_workout').in('status',staff?['draft','published','planned','completed']:['published']).gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50),
   supabase.from('pt_bookings').select('id,session_id,status,note').eq('member_id',user.id),
   supabase.from('pt_requests').select('id,preferred_at,alternative_at,availability_note,goal,status,staff_note,created_at').eq('member_id',user.id).order('created_at',{ascending:false}),
   staff ? supabase.from('profiles').select('id,display_name').eq('active',true).order('display_name') : Promise.resolve({data:[],error:null}),
   supabase.from('pt_messages').select('id,client_id,sender_id,body,created_at').order('created_at',{ascending:true}).limit(200),
   staff ? supabase.from('pt_client_notes').select('id,client_id,coach_id,goals,note,follow_up_at,created_at').order('updated_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
   supabase.from('pt_session_exercises').select('id,session_id,sort_order,phase,exercise_name,sets,reps,target_load,rest_seconds,notes').order('sort_order'),
   supabase.from('exercises').select('id,name,category').eq('is_active',true).order('name')
  ])
  if(s.error)setError(s.error.message);else setSessions(s.data||[])
  if(b.error)setError(b.error.message);else setBookings(b.data||[])
  if(r.error)setError(r.error.message);else setRequests(r.data||[])
  if(m.error)setError(m.error.message);else {setMembers(m.data||[]);if(!messageClient&&m.data?.length)setMessageClient(m.data[0].id);if(!noteClient&&m.data?.length)setNoteClient(m.data[0].id)}
  if(p.error)setError(p.error.message);else setMessages(p.data||[])
  if(n.error)setError(n.error.message);else setNotes(n.data||[])
  if(pe.error)setError(pe.error.message);else setPlans((pe.data||[]).reduce((acc,row)=>{(acc[row.session_id] ||= []).push(row);return acc},{}))
  if(ex.error)setError(ex.error.message);else setExerciseLibrary(ex.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[])
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
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PT-STUDIO</div><h3>Personleg trening</h3></div><div className="pt-actions"><button className="secondary-button" onClick={()=>setShowRequest(v=>!v)}>Be om PT-time</button>{staff&&<button className="secondary-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={14}/> Ny PT-time</button>}</div></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/> {notice}</div>}
  {showRequest&&<form className="booking-create" onSubmit={request}><h4>Send PT-førespurnad</h4><label>Kva ønskjer du hjelp med?<textarea rows="3" value={goal} onChange={e=>setGoal(e.target.value)} required placeholder="Mål, utfordringar eller ønskje …"/></label><div className="engine-fields"><label>Føretrekt tidspunkt<input type="datetime-local" value={preferred} onChange={e=>setPreferred(e.target.value)}/></label><label>Alternativt tidspunkt<input type="datetime-local" value={alternative} onChange={e=>setAlternative(e.target.value)}/></label></div><label>Tilgjenge / kommentar<input value={availability} onChange={e=>setAvailability(e.target.value)} placeholder="Når passar det elles?"/></label><button className="primary-button" disabled={busy==='request'}>{busy==='request'?'Sender …':'Send førespurnad'}</button></form>}
  {showCreate&&staff&&<form className="booking-create" onSubmit={create}><h4>Publiser PT-time</h4><label>Tittel<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>Dato og tid<input type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)} required/></label><div className="engine-fields"><label>Minutt<input type="number" min="5" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Kapasitet<input type="number" min="1" max="20" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label><label>Pris (kr)<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Valfritt"/></label></div><button className="primary-button" disabled={busy==='create'}>Publiser PT-time</button></form>}
  <section className="engine-section"><div className="engine-section-title"><h4>Ledige PT-timar</h4><span>{sessions.filter(s=>s.status==='published').length} publiserte</span></div>
   {sessions.length?<div className="class-list">{sessions.map(s=>{const d=new Date(s.starts_at),mine=bookings.find(b=>b.session_id===s.id&&['booked','waitlist'].includes(b.status));return <article className="class-card" key={s.id}><div className="class-date"><UserRound size={21}/><span>PT</span></div><div className="class-info"><div className="class-card-top"><span>{s.status}</span><span><CalendarClock size={13}/>{d.toLocaleDateString('nn-NO')} · {d.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{s.title}</h4><small>{s.duration_minutes} min · Kapasitet {s.capacity}{s.price!=null?' · '+s.price+' kr':''}</small>{s.message&&<p>{s.message}</p>}</div><div className="class-action">{mine?<span className="booking-confirmed">{mine.status==='waitlist'?'Venteliste':'Bestilt'}</span>:s.status==='published'&&<button className="primary-button" disabled={busy===s.id} onClick={()=>book(s)}>{busy===s.id?'Vent …':'Bestill'}</button>}</div>{(plans[s.id]||[]).length>0&&<div className="pt-plan-list"><strong>Treningsprogram</strong>{(plans[s.id]||[]).map(row=><div className="live-result-row" key={row.id}><span><b>{row.exercise_name}</b> · {row.phase==='warmup'?'Oppvarming':row.phase==='cooldown'?'Avslutning':'Hovuddel'} · {row.sets?row.sets+' × ':''}{row.reps}{row.target_load?' · '+row.target_load:''}{row.rest_seconds?' · '+row.rest_seconds+' sek pause':''}{row.notes?' — '+row.notes:''}</span>{staff&&<button className="secondary-button" disabled={busy==='plan-'+row.id} onClick={()=>removePlanExercise(row)}>Fjern</button>}</div>)}</div>}{staff&&<form className="admin-create-form pt-plan-form" onSubmit={e=>addPlanExercise(e,s)}><strong>Bygg PT-program</strong><div className="engine-fields"><label>Øving<select required value={planDrafts[s.id]?.exerciseId||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],exerciseId:e.target.value}}))}><option value="">Vel øving</option>{exerciseLibrary.map(x=><option key={x.id} value={x.id}>{x.name} · {x.category}</option>)}</select></label><label>Del<select value={planDrafts[s.id]?.phase||'main'} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],phase:e.target.value}}))}><option value="warmup">Oppvarming</option><option value="main">Hovuddel</option><option value="cooldown">Avslutning</option></select></label></div><div className="engine-fields three"><label>Sett<input type="number" min="1" max="30" value={planDrafts[s.id]?.sets||''} onChange={e=>setPlanDrafts(v=>({...v,[s.id]:{...v[s.id],sets:e.target.value}}))}/></label><label>Reps<input value={planDrafts[s.id]?.reps||''} placeholder="8–10" onChange={e=>setPlanDrafts(v=>({...v[s.id],reps:e.target.value}))}/></label><label>Pause (sek.)<input type="number" min="0" value={planDrafts[s.id]?.rest||''} onChange={e=>setPlanDrafts(v=>({...v[s.id],rest:e.target.value}))}/></label></div><div className="engine-fields"><label>Belastning<input value={planDrafts[s.id]?.targetLoad||''} placeholder="t.d. 60 kg / RPE 7" onChange={e=>setPlanDrafts(v=>({...v[s.id],targetLoad:e.target.value}))}/></label><label>Notat<input value={planDrafts[s.id]?.notes||''} onChange={e=>setPlanDrafts(v=>({...v[s.id],notes:e.target.value}))}/></label></div><button className="secondary-button" disabled={busy==='plan-'+s.id||!planDrafts[s.id]?.exerciseId}><Plus size={14}/> Legg til øving</button></form>}</article>})}</div>:<div className="empty-state">Ingen publiserte PT-timar no. Du kan senda ein førespurnad.</div>}
  </section>
  <section className="engine-section">
   <div className="engine-section-title"><h4>PT-dialog</h4><span>Privat mellom medlem og trenar</span></div>
   {staff&&<label>Vel medlem<select value={messageClient} onChange={e=>setMessageClient(e.target.value)}>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'}</option>)}</select></label>}
   <div className="pt-message-list">{messages.filter(m=>staff?m.client_id===messageClient:m.client_id===profile.id).map(m=><article className="history-card" key={m.id}><div className="history-card-top"><strong>{m.sender_id===profile.id?'Du':members.find(x=>x.id===m.sender_id)?.display_name||(m.sender_id===m.client_id?'Medlem':'Trenar')}</strong><small>{new Date(m.created_at).toLocaleString('nn-NO')}</small></div><p>{m.body}</p></article>)}</div>
   <form className="admin-create-form" onSubmit={sendMessage}><textarea rows="2" value={messageText} onChange={e=>setMessageText(e.target.value)} required maxLength="3000" placeholder="Skriv ei melding …"/><button className="primary-button" disabled={busy==='message'||!messageText.trim()}>Send melding</button></form>
  </section>
  {staff&&<section className="engine-section"><h4>Private trenarnotat</h4><p className="section-kicker">Berre synleg for trenarar og administratorar</p>
   <form className="admin-create-form" onSubmit={saveNote}>
    <label>Medlem<select value={noteClient} onChange={e=>setNoteClient(e.target.value)}>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||'Utan namn'}</option>)}</select></label>
    <label>Mål<textarea rows="2" value={noteGoals} onChange={e=>setNoteGoals(e.target.value)} required/></label>
    <label>Notat<textarea rows="3" value={noteText} onChange={e=>setNoteText(e.target.value)} required/></label>
    <label>Neste oppfølging<input type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>
    <button className="primary-button" disabled={busy==='note'||!noteClient}>Lagra notat</button>
   </form>
   {notes.map(n=><article className="history-card" key={n.id}><strong>{members.find(m=>m.id===n.client_id)?.display_name||'Medlem'}</strong><p><b>Mål:</b> {n.goals}</p><p>{n.note}</p><small>{n.follow_up_at?'Oppfølging: '+new Date(n.follow_up_at).toLocaleString('nn-NO'):'Ingen oppfølgingsdato'}</small></article>)}
  </section>}
  <section className="engine-section"><h4>Mine førespurnader</h4>{requests.length?requests.map(r=><article className="history-card" key={r.id}><div className="history-card-top"><strong>{r.goal}</strong><span>{r.status}</span></div><small>{r.preferred_at?new Date(r.preferred_at).toLocaleString('nn-NO'):'Tidspunkt ikkje valt'}</small>{r.staff_note&&<p>{r.staff_note}</p>}</article>):<div className="empty-state">Ingen PT-førespurnader sende.</div>}</section>
 </div>
}
