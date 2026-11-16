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
 async function load(){
  setLoading(true);setError('')
  const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user){setError('Logg inn på nytt.');setLoading(false);return}
  const [s,b,r]=await Promise.all([
   supabase.from('pt_sessions').select('id,title,starts_at,duration_minutes,capacity,price,status,prep,message,custom_workout').in('status',staff?['draft','published','planned','completed']:['published']).gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50),
   supabase.from('pt_bookings').select('id,session_id,status,note').eq('member_id',user.id),
   supabase.from('pt_requests').select('id,preferred_at,alternative_at,availability_note,goal,status,staff_note,created_at').eq('member_id',user.id).order('created_at',{ascending:false})
  ])
  if(s.error)setError(s.error.message);else setSessions(s.data||[])
  if(b.error)setError(b.error.message);else setBookings(b.data||[])
  if(r.error)setError(r.error.message);else setRequests(r.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[])
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
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar PT-studio …</div>
 return <div className="pt-module">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PT-STUDIO</div><h3>Personleg trening</h3></div><div className="pt-actions"><button className="secondary-button" onClick={()=>setShowRequest(v=>!v)}>Be om PT-time</button>{staff&&<button className="secondary-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={14}/> Ny PT-time</button>}</div></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/> {notice}</div>}
  {showRequest&&<form className="booking-create" onSubmit={request}><h4>Send PT-førespurnad</h4><label>Kva ønskjer du hjelp med?<textarea rows="3" value={goal} onChange={e=>setGoal(e.target.value)} required placeholder="Mål, utfordringar eller ønskje …"/></label><div className="engine-fields"><label>Føretrekt tidspunkt<input type="datetime-local" value={preferred} onChange={e=>setPreferred(e.target.value)}/></label><label>Alternativt tidspunkt<input type="datetime-local" value={alternative} onChange={e=>setAlternative(e.target.value)}/></label></div><label>Tilgjenge / kommentar<input value={availability} onChange={e=>setAvailability(e.target.value)} placeholder="Når passar det elles?"/></label><button className="primary-button" disabled={busy==='request'}>{busy==='request'?'Sender …':'Send førespurnad'}</button></form>}
  {showCreate&&staff&&<form className="booking-create" onSubmit={create}><h4>Publiser PT-time</h4><label>Tittel<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>Dato og tid<input type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)} required/></label><div className="engine-fields"><label>Minutt<input type="number" min="5" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Kapasitet<input type="number" min="1" max="20" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label><label>Pris (kr)<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Valfritt"/></label></div><button className="primary-button" disabled={busy==='create'}>Publiser PT-time</button></form>}
  <section className="engine-section"><div className="engine-section-title"><h4>Ledige PT-timar</h4><span>{sessions.filter(s=>s.status==='published').length} publiserte</span></div>
   {sessions.length?<div className="class-list">{sessions.map(s=>{const d=new Date(s.starts_at),mine=bookings.find(b=>b.session_id===s.id&&['booked','waitlist'].includes(b.status));return <article className="class-card" key={s.id}><div className="class-date"><UserRound size={21}/><span>PT</span></div><div className="class-info"><div className="class-card-top"><span>{s.status}</span><span><CalendarClock size={13}/>{d.toLocaleDateString('nn-NO')} · {d.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{s.title}</h4><small>{s.duration_minutes} min · Kapasitet {s.capacity}{s.price!=null?' · '+s.price+' kr':''}</small>{s.message&&<p>{s.message}</p>}</div><div className="class-action">{mine?<span className="booking-confirmed">{mine.status==='waitlist'?'Venteliste':'Bestilt'}</span>:s.status==='published'&&<button className="primary-button" disabled={busy===s.id} onClick={()=>book(s)}>{busy===s.id?'Vent …':'Bestill'}</button>}</div></article>})}</div>:<div className="empty-state">Ingen publiserte PT-timar no. Du kan senda ein førespurnad.</div>}
  </section>
  <section className="engine-section"><h4>Mine førespurnader</h4>{requests.length?requests.map(r=><article className="history-card" key={r.id}><div className="history-card-top"><strong>{r.goal}</strong><span>{r.status}</span></div><small>{r.preferred_at?new Date(r.preferred_at).toLocaleString('nn-NO'):'Tidspunkt ikkje valt'}</small>{r.staff_note&&<p>{r.staff_note}</p>}</article>):<div className="empty-state">Ingen PT-førespurnader sende.</div>}</section>
 </div>
}
