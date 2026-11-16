import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, LoaderCircle, Plus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'

export default function Booking({ profile }) {
  const [classes,setClasses]=useState([]),[attendance,setAttendance]=useState([])
  const [mine,setMine]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [showCreate,setShowCreate]=useState(false)
  const [title,setTitle]=useState('')
  const [type,setType]=useState('Gruppetime')
  const [startsAt,setStartsAt]=useState('')
  const [duration,setDuration]=useState('60')
  const [capacity,setCapacity]=useState('8')
  const [description,setDescription]=useState('')
  const staff=isStaff(profile)

  async function load(){
    setLoading(true);setError('')
    const [{data:userData,error:userError}]=await Promise.all([supabase.auth.getUser()])
    if(userError||!userData.user){setError('Logg inn på nytt.');setLoading(false);return}
    const [c,b,a]=await Promise.all([
      supabase.from('classes').select('id,title,type,capacity,starts_at,duration_minutes,description,workout_text,wod_ids').gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50),
      supabase.from('class_bookings').select('id,class_id,status,created_at').eq('member_id',userData.user.id),
      supabase.from('class_bookings').select('class_id').eq('status','confirmed')
    ])
    if(c.error)setError(c.error.message);else setClasses(c.data||[])
    if(b.error)setError(b.error.message);else setMine(b.data||[])
    if(a.error)setError(a.error.message);else setAttendance(a.data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  async function book(item){
    setBusy(item.id);setError('');setNotice('')
    try{
      const existing=mine.find(b=>b.class_id===item.id&&b.status!=='cancelled')
      if(existing)throw new Error('Du er allereie påmeld denne timen.')
      const {data:{user}}=await supabase.auth.getUser()
      const {error:e}=await supabase.from('class_bookings').insert({class_id:item.id,member_id:user.id,status:'confirmed'})
      if(e)throw e
      setNotice('Du er påmeld. Påmeldinga er lagra.')
      await load()
    }catch(e){setError(e.message||'Kunne ikkje melda deg på.')}
    finally{setBusy('')}
  }
  async function cancel(item){
    const booking=mine.find(b=>b.class_id===item.id&&b.status!=='cancelled')
    if(!booking)return
    setBusy(item.id);setError('');setNotice('')
    try{
      const {error:e}=await supabase.from('class_bookings').update({status:'cancelled'}).eq('id',booking.id)
      if(e)throw e
      setNotice('Påmeldinga er avbestilt.')
      await load()
    }catch(e){setError(e.message||'Kunne ikkje avbestilla.')}
    finally{setBusy('')}
  }
  async function create(event){
    event.preventDefault();setBusy('create');setError('');setNotice('')
    try{
      const {data:{user}}=await supabase.auth.getUser()
      const {error:e}=await supabase.from('classes').insert({
        title:title.trim(),type,starts_at:new Date(startsAt).toISOString(),
        duration_minutes:Number(duration),capacity:Number(capacity),
        description:description.trim()||null,created_by:user.id,wod_ids:[]
      })
      if(e)throw e
      setTitle('');setDescription('');setShowCreate(false);setNotice('Timen er oppretta.')
      await load()
    }catch(e){setError(e.message||'Kunne ikkje oppretta timen.')}
    finally{setBusy('')}
  }
  if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar timeplan …</div>
  return <div className="booking-module">
    <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · TIMEPLAN</div><h3>Gruppetimar</h3></div>{staff&&<button className="secondary-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={15}/> Ny time</button>}</div>
    {error&&<div className="auth-error" role="alert">{error}</div>}
    {notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/> {notice}</div>}
    {showCreate&&staff&&<form className="booking-create" onSubmit={create}>
      <h4>Opprett gruppetime</h4>
      <label>Namn<input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="t.d. Styrke sirkel"/></label>
      <div className="engine-fields"><label>Type<select value={type} onChange={e=>setType(e.target.value)}><option>Gruppetime</option><option>CrossFit</option><option>Styrke</option><option>Kondisjon</option><option>Open Gym</option></select></label><label>Dato og tid<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></label></div>
      <div className="engine-fields"><label>Varigheit (min)<input type="number" min="5" max="300" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Kapasitet<input type="number" min="1" max="100" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label></div>
      <label>Informasjon<textarea value={description} onChange={e=>setDescription(e.target.value)} rows="2"/></label>
      <button className="primary-button" disabled={busy==='create'}>{busy==='create'?'Lagrar …':'Opprett time'}</button>
    </form>}
    {classes.length===0?<div className="empty-state">Ingen komande gruppetimar er publiserte.</div>:<div className="class-list">{classes.map(item=>{
      const booking=mine.find(b=>b.class_id===item.id&&b.status!=='cancelled')
      const attendeeCount=attendance.filter(b=>b.class_id===item.id).length
      const full=attendeeCount>=item.capacity
      const date=new Date(item.starts_at)
      return <article className="class-card" key={item.id}>
        <div className="class-date"><strong>{date.toLocaleDateString('nn-NO',{day:'2-digit'})}</strong><span>{date.toLocaleDateString('nn-NO',{month:'short'})}</span></div>
        <div className="class-info"><div className="class-card-top"><span>{item.type}</span><span><Clock3 size={13}/> {date.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{item.title}</h4><p>{item.description||'Gruppetime i GarasjeGym'}</p><small><Users size={13}/> {attendeeCount}/{item.capacity} påmelde · {item.duration_minutes} min</small></div>
        <div className="class-action">{booking?<><span className="booking-confirmed">Påmeld</span><button className="secondary-button" disabled={busy===item.id} onClick={()=>cancel(item)}>Avmeld</button></>:<button className="primary-button" disabled={busy===item.id||date<new Date()||full} onClick={()=>book(item)}>{busy===item.id?'Vent …':full?'Fullt':'Meld på'}</button>}</div>
      </article>
    })}</div>}
  </div>
}
