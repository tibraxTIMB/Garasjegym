import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, LoaderCircle, Plus, Users, UserRound, Radio, Play, Pause, Square } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'
import Notifications from './Notifications.jsx'

const LIVE_SESSION_FIELDS = 'id,class_id,status,started_at,session_title,wod_id,wod_ids,active_wod_index,timer_format,timer_duration_seconds,timer_settings,timer_started_at,timer_elapsed_seconds,timer_status,results_published_at'
const LIVE_SESSION_BASE_FIELDS = 'id,class_id,status,started_at,session_title,wod_id,wod_ids,active_wod_index'

async function fetchLiveSessions() {
  let result = await supabase.from('class_live_sessions')
    .select(LIVE_SESSION_FIELDS)
    .in('status', ['active', 'paused', 'finished'])
    .order('started_at', { ascending: false })

  // Migration 005 creates live sessions; migration 007 adds the shared timer columns.
  // Keep the live session visible during the short interval between those migrations.
  if (result.error && /timer_settings|timer_started_at|timer_elapsed_seconds|timer_status|timer_format|timer_duration_seconds|column .* does not exist/i.test(result.error.message || '')) {
    result = await supabase.from('class_live_sessions')
      .select(LIVE_SESSION_BASE_FIELDS)
      .in('status', ['active', 'paused'])
      .order('started_at', { ascending: false })
  }
  if (result.error && /could not find the table|relation .* does not exist|PGRST205/i.test(result.error.message || '')) {
    return { data: [], error: null }
  }
  return result
}

export default function Booking({ profile, onLogResult, initialClassId=null }) {
  const [classes,setClasses]=useState([]),[attendance,setAttendance]=useState([])
  const [mine,setMine]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [showCreate,setShowCreate]=useState(false),[selectedClass,setSelectedClass]=useState(null),[editClass,setEditClass]=useState(null)
  const [title,setTitle]=useState('')
  const [type,setType]=useState('Gruppetime')
  const [startsAt,setStartsAt]=useState('')
  const [duration,setDuration]=useState('60')
  const [capacity,setCapacity]=useState('8')
  const [description,setDescription]=useState('')
  const [instructorId,setInstructorId]=useState('')
  const [publishOnCreate,setPublishOnCreate]=useState(true)
  const [liveSessions,setLiveSessions]=useState([])
  const [sessionResults,setSessionResults]=useState({}),[sessionCompletions,setSessionCompletions]=useState({})
  const [memberNames,setMemberNames]=useState({})
  const [instructors,setInstructors]=useState([])
  const [wods,setWods]=useState([])
  const [selectedWod,setSelectedWod]=useState({}),[createWodIds,setCreateWodIds]=useState([])
  const [clockNow,setClockNow]=useState(Date.now())
  const staff=isStaff(profile)
  const attendeeCountFor=classId=>staff?attendance.filter(row=>row.class_id===classId&&row.status==='confirmed').length:Number(attendance.find(row=>row.class_id===classId)?.confirmed_count||0)
  const instructorNameFor=id=>instructors.find(person=>person.id===id)?.display_name||'Ikkje tildelt'
  useEffect(()=>{if(initialClassId&&classes.length){const target=classes.find(c=>c.id===initialClassId);if(target)setSelectedClass(target)}},[initialClassId,classes])

  async function load(silent=false){
    if(!silent)setLoading(true);setError('')
    const [{data:userData,error:userError}]=await Promise.all([supabase.auth.getUser()])
    if(userError||!userData.user){setError('Logg inn på nytt.');setLoading(false);return}
    let classQuery=supabase.from('classes')
      .select('id,title,type,capacity,starts_at,duration_minutes,description,workout_text,wod_ids,instructor_id,published,cancelled_at,cancellation_note')
      .gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50)
    if(!staff)classQuery=classQuery.eq('published',true).is('cancelled_at',null)
    const {data:classRows,error:classError}=await classQuery
    // The base booking calendar must remain usable before optional live-session migrations are installed.
    if(classError)setError(classError.message);else setClasses(classRows||[])
    const classIds=(classRows||[]).map(row=>row.id)
    const [b,a,live,instructorRows]=await Promise.all([
      supabase.from('class_bookings').select('id,class_id,status,created_at').eq('member_id',userData.user.id),
      staff
        ? supabase.from('class_bookings').select('id,class_id,member_id,status,attendance_status,attendance_marked_at').in('status',['confirmed','waitlist'])
        : supabase.rpc('get_class_attendance_counts',{p_class_ids:classIds}),
      fetchLiveSessions(),
      staff
        ? supabase.from('profiles').select('id,display_name').in('role',['admin','manager']).eq('active',true).eq('membership_status','approved').order('display_name')
        : Promise.resolve({data:[],error:null})
    ])
    if(b.error)setError(b.error.message);else setMine(b.data||[])
    if(staff&&!instructorRows.error)setInstructors(instructorRows.data||[])
    if(a.error)setError(a.error.message);else if(staff){
      setAttendance(a.data||[])
      const ids=[...new Set((a.data||[]).map(row=>row.member_id).filter(Boolean))]
      if(ids.length){const {data:people}=await supabase.from('profiles').select('id,display_name').in('id',ids);setMemberNames(v=>({...v,...Object.fromEntries((people||[]).map(p=>[p.id,p.display_name||'Medlem']))}))}
    }else{
      setAttendance((a.data||[]).map(row=>({class_id:row.class_id,confirmed_count:Number(row.confirmed_count)||0})))
    }
    if(live.error)setError(live.error.message);else setLiveSessions(live.data||[])
    let w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,category').eq('is_published',true).order('name')
    if(w.error && /timer_settings|column .* does not exist/i.test(w.error.message||'')){
      w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,category').eq('is_published',true).order('name')
    }
    if(!w.error)setWods(w.data||[])

    setLoading(false)
  }
  useEffect(()=>{load();const refresh=setInterval(()=>load(true),30000);return()=>clearInterval(refresh)},[])
  const liveSessionIds=liveSessions.map(s=>s.id).sort().join(',')
  useEffect(()=>{
    if(!staff||!liveSessionIds){setSessionResults({});return}
    let cancelled=false
    async function loadResults(){
      const ids=liveSessionIds.split(',')
      const [{data,error:e},{data:completionRows,error:completionError}]=await Promise.all([supabase.from('workout_logs').select('id,member_id,title,source_wod_id,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,note,class_live_session_id').in('class_live_session_id',ids),supabase.from('class_session_wod_completions').select('session_id,member_id,wod_id').in('session_id',ids)])
      if(e||completionError||cancelled)return
      const rows=data||[]
      setSessionCompletions((completionRows||[]).reduce((acc,row)=>{(acc[row.session_id] ||= []).push(row);return acc},{}))
      setSessionResults(rows.reduce((acc,row)=>{(acc[row.class_live_session_id] ||= []).push(row);return acc},{}))
      const memberIds=[...new Set(rows.map(row=>row.member_id))]
      if(memberIds.length){const {data:profiles}=await supabase.from('profiles').select('id,display_name').in('id',memberIds);if(!cancelled)setMemberNames(current=>({...current,...Object.fromEntries((profiles||[]).map(p=>[p.id,p.display_name||'Medlem']))}))}
    }
    loadResults()
    const refresh=setInterval(loadResults,5000)
    return()=>{cancelled=true;clearInterval(refresh)}
  },[staff,liveSessionIds])
  useEffect(()=>{const clock=setInterval(()=>setClockNow(Date.now()),1000);const refresh=setInterval(async()=>{const {data,error:e}=await fetchLiveSessions();if(!e)setLiveSessions(data||[])},5000);return()=>{clearInterval(clock);clearInterval(refresh)}},[])

  async function book(item){
    setBusy(item.id);setError('');setNotice('')
    try{
      const {data,error:e}=await supabase.rpc('book_class',{p_class_id:item.id})
      if(e)throw e
      const booking=Array.isArray(data)?data[0]:data
      setNotice(booking?.booking_status==='waitlist'
        ? 'Gruppetimen er full. Du står no på venteliste og får automatisk plass dersom nokon melder seg av.'
        : 'Du er påmeld. Påmeldinga er lagra.')
      await load()
    }catch(e){setError(e.message||'Kunne ikkje melda deg på.')}
    finally{setBusy('')}
  }
  async function cancel(item){
    const booking=mine.find(b=>b.class_id===item.id&&['confirmed','pending','waitlist'].includes(b.status))
    if(!booking)return
    setBusy(item.id);setError('');setNotice('')
    try{
      const {error:e}=await supabase.from('class_bookings').update({status:'cancelled'}).eq('id',booking.id)
      if(e)throw e
      setNotice(booking.status==='waitlist'?'Du er fjerna frå ventelista.':'Påmeldinga er avbestilt.')
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
        description:description.trim()||null,created_by:user.id,instructor_id:instructorId||null,published:publishOnCreate,wod_ids:createWodIds
      })
      if(e)throw e
      setTitle('');setDescription('');setInstructorId('');setPublishOnCreate(true);setCreateWodIds([]);setShowCreate(false);setNotice(publishOnCreate?'Timen er oppretta og publisert.':'Timen er lagra som utkast.')
      await load()
    }catch(e){setError(e.message||'Kunne ikkje oppretta timen.')}
    finally{setBusy('')}
  }
  async function markAttendance(row,status){
    setBusy('attendance-'+row.id);setError('');setNotice('')
    try{
      const {data:{user},error:userError}=await supabase.auth.getUser()
      if(userError||!user)throw new Error('Logg inn på nytt.')
      const {error:e}=await supabase.from('class_bookings').update({attendance_status:status,attendance_marked_at:status?new Date().toISOString():null,attendance_marked_by:status?user.id:null}).eq('id',row.id)
      if(e)throw e
      setNotice(status==='present'?'Oppmøte registrert.':status==='absent'?'Fråvær registrert.':'Oppmøteregistreringa er nullstilt.')
      await load(true)
    }catch(e){setError(e.message||'Kunne ikkje registrera oppmøte.')}
    finally{setBusy('')}
  }
  async function saveClassEdits(event){
    event.preventDefault()
    if(!editClass?.id)return
    setBusy('edit-'+editClass.id);setError('');setNotice('')
    try{
      const patch={title:editClass.title.trim(),type:editClass.type,starts_at:new Date(editClass.starts_at).toISOString(),duration_minutes:Number(editClass.duration_minutes),capacity:Number(editClass.capacity),description:editClass.description||null,instructor_id:editClass.instructor_id||null,published:editClass.published!==false,wod_ids:editClass.wod_ids||[]}
      const {error:e}=await supabase.from('classes').update(patch).eq('id',editClass.id)
      if(e)throw e
      setNotice('Gruppetimen er oppdatert.');setEditClass(null);setSelectedClass(null);await load()
    }catch(e){setError(e.message||'Kunne ikkje oppdatera gruppetimen.')}
    finally{setBusy('')}
  }
  async function cancelClass(item){
    if(!window.confirm('Avlysa «'+item.title+'»? Påmelde og venteliste får varsel, og påmeldingane blir avslutta.'))return
    setBusy('cancel-'+item.id);setError('');setNotice('')
    try{
      const {data,error:e}=await supabase.rpc('cancel_class',{p_class_id:item.id,p_note:'Avlyst av instruktør/admin'})
      if(e)throw e
      setNotice('Gruppetimen er avlyst. '+(Number(data)||0)+' deltakarar er varsla.')
      setEditClass(null);setSelectedClass(null);await load()
    }catch(e){setError(e.message||'Kunne ikkje avlysa gruppetimen.')}
    finally{setBusy('')}
  }
  async function deleteClass(item){
    if(!window.confirm('Sletta «'+item.title+'» permanent? Dette er berre mogleg når timen ikkje har påmeldingar eller treningshistorikk.'))return
    setBusy('delete-'+item.id);setError('');setNotice('')
    try{
      const [bookings,sessions]=await Promise.all([
        supabase.from('class_bookings').select('id',{count:'exact',head:true}).eq('class_id',item.id),
        supabase.from('class_live_sessions').select('id',{count:'exact',head:true}).eq('class_id',item.id)
      ])
      if(bookings.error)throw bookings.error
      if(sessions.error&&!/could not find the table|relation .* does not exist|PGRST205/i.test(sessions.error.message||''))throw sessions.error
      if((bookings.count||0)>0||(sessions.count||0)>0)throw new Error('Timen har påmeldingar eller treningshistorikk. Avlys han i staden, så blir historikken bevart.')
      const {error:e}=await supabase.from('classes').delete().eq('id',item.id)
      if(e)throw e
      setNotice('Gruppetimen er sletta.');setEditClass(null);setSelectedClass(null);await load()
    }catch(e){setError(e.message||'Kunne ikkje sletta gruppetimen.')}
    finally{setBusy('')}
  }
  async function startLive(item){
    setBusy('live-'+item.id);setError('');setNotice('')
    try{
      const {data:{user}}=await supabase.auth.getUser()
      const selectedIds=(item.wod_ids||[]).length?item.wod_ids:(selectedWod[item.id]?[selectedWod[item.id]]:[])
      const orderedIds=selectedIds.filter((id,index)=>selectedIds.indexOf(id)===index)
      const wod=wods.find(x=>x.id===orderedIds[0])||null
      const startedAt=new Date().toISOString()
      const result=await supabase.from('class_live_sessions').insert({
        class_id:item.id,started_by:user.id,status:'active',started_at:startedAt,session_title:item.title,
        wod_id:wod?.id||null,wod_ids:orderedIds,active_wod_index:0,
        timer_format:wod?.format||null,timer_duration_seconds:wod?.duration_minutes?Number(wod.duration_minutes)*60:null,
        timer_settings:wod?.timer_settings||null,timer_started_at:wod?startedAt:null,timer_elapsed_seconds:0,timer_status:wod?'running':'idle'
      }).select(LIVE_SESSION_FIELDS).single()
      if(result.error)throw result.error
      setLiveSessions(v=>[result.data,...v.filter(x=>x.class_id!==item.id)])
      setNotice(orderedIds.length>1?'Gruppetreninga er starta med '+orderedIds.length+' WOD-ar. Instruktøren kan byta aktiv WOD når gruppa er klar.':'Gruppetreninga er starta og synleg for påmelde deltakarar.')
    }catch(e){setError(e.message||'Kunne ikkje starta gruppetreninga.')}
    finally{setBusy('')}
  }
  async function setActiveWod(session,index){
    const ids=Array.isArray(session.wod_ids)&&session.wod_ids.length?session.wod_ids:(session.wod_id?[session.wod_id]:[])
    const wodId=ids[index],wod=wods.find(x=>x.id===wodId)
    if(!wod){setError('WOD-en finst ikkje lenger i biblioteket.');return}
    setBusy('wod-'+session.id);setError('');setNotice('')
    try{
      const now=new Date().toISOString()
      const patch={wod_id:wod.id,active_wod_index:index,timer_format:wod.format||null,timer_duration_seconds:wod.duration_minutes?Number(wod.duration_minutes)*60:null,timer_settings:wod.timer_settings||null,timer_elapsed_seconds:0,timer_started_at:session.status==='paused'?null:now,timer_status:session.status==='paused'?'paused':'running'}
      const {error:e}=await supabase.from('class_live_sessions').update(patch).eq('id',session.id)
      if(e)throw e
      setLiveSessions(rows=>rows.map(row=>row.id===session.id?{...row,...patch}:row))
      setNotice('Felles WOD er no '+wod.name+'. Timeren er starta på nytt for denne WOD-en.')
    }catch(e){setError(e.message||'Kunne ikkje byta aktiv WOD.')}
    finally{setBusy('')}
  }
  async function setLiveStatus(session,status){
    setBusy('live-'+session.id);setError('');setNotice('')
    try{
      const now=new Date().toISOString()
      const elapsedNow=(Number(session.timer_elapsed_seconds)||0)+(session.timer_started_at?Math.max(0,Math.floor((Date.now()-new Date(session.timer_started_at).getTime())/1000)):0)
      const patch=status==='finished'?{status,ended_at:now,timer_status:'finished',timer_elapsed_seconds:elapsedNow,timer_started_at:null}:status==='paused'?{status,timer_status:session.timer_status==='running'?'paused':session.timer_status,timer_elapsed_seconds:elapsedNow,timer_started_at:null}:{status,timer_status:session.timer_format?'running':'idle',timer_started_at:session.timer_format?now:null}
      let result=await supabase.from('class_live_sessions').update(patch).eq('id',session.id)
      if(result.error && /timer_settings|timer_started_at|timer_elapsed_seconds|timer_status|column .* does not exist/i.test(result.error.message||'')){
        const basePatch=status==='finished'?{status,ended_at:now}:{status}
        result=await supabase.from('class_live_sessions').update(basePatch).eq('id',session.id)
      }
      if(result.error)throw result.error
      let deliveryNotice=''
      if(status==='finished'){
        const {data:sentCount,error:deliveryError}=await supabase.rpc('publish_class_session_results',{p_session_id:session.id})
        if(deliveryError)deliveryNotice=' Resultatvarslinga feila: '+deliveryError.message
        else deliveryNotice=' WOD-ane er sende til '+(sentCount||0)+' påmelde deltakarar.'
      }
      setLiveSessions(v=>v.map(x=>x.id===session.id?{...x,...patch}:x))
      setNotice((status==='finished'?'Gruppetreninga er avslutta.':status==='paused'?'Gruppetreninga er sett på pause.':'Gruppetreninga er i gang igjen.')+deliveryNotice)
    }catch(e){setError(e.message||'Kunne ikkje oppdatera gruppetreninga.')}
    finally{setBusy('')}
  }
  if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar timeplan …</div>
  return <div className="booking-module">
    <Notifications compact context="group"/>
    <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · TIMEPLAN</div><h3>Gruppetimar</h3></div>{staff&&<button className="secondary-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={15}/> Ny time</button>}</div>
    {error&&<div className="auth-error" role="alert">{error}</div>}
    {notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/> {notice}</div>}
    {showCreate&&staff&&<form className="booking-create" onSubmit={create}>
      <h4>Opprett gruppetime</h4>
      <label>Namn<input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="t.d. Styrke sirkel"/></label>
      <div className="engine-fields"><label>Type<select value={type} onChange={e=>setType(e.target.value)}><option>Gruppetime</option><option>CrossFit</option><option>Styrke</option><option>Kondisjon</option><option>Open Gym</option></select></label><label>Dato og tid<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></label></div>
      <div className="engine-fields"><label>Varigheit (min)<input type="number" min="5" max="300" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Kapasitet<input type="number" min="1" max="100" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label></div>
      <label>Instruktør<select value={instructorId} onChange={e=>setInstructorId(e.target.value)}><option value="">Ikkje tildelt</option>{instructors.map(person=><option key={person.id} value={person.id}>{person.display_name||'Instruktør'}</option>)}</select></label><label className="inline-check"><input type="checkbox" checked={publishOnCreate} onChange={e=>setPublishOnCreate(e.target.checked)}/> Publiser for medlemmar med ein gong</label><label>Informasjon<textarea value={description} onChange={e=>setDescription(e.target.value)} rows="2"/></label><div className="engine-section"><strong>WOD-ar i gruppetimen (vel fleire)</strong>{wods.map(w=><label className="inline-check" key={w.id}><input type="checkbox" checked={createWodIds.includes(w.id)} onChange={e=>setCreateWodIds(v=>e.target.checked?[...v,w.id]:v.filter(id=>id!==w.id))}/>{w.name} · {w.format}</label>)}</div>
      <button className="primary-button" disabled={busy==='create'}>{busy==='create'?'Lagrar …':'Opprett time'}</button>
    </form>}
    {classes.length===0?<div className="empty-state">Ingen komande gruppetimar er publiserte.</div>:<div className="class-list">{classes.map(item=>{
      const booking=mine.find(b=>b.class_id===item.id&&['confirmed','pending','waitlist'].includes(b.status))
      const attendeeCount=attendeeCountFor(item.id)
      const full=attendeeCount>=item.capacity
      const live=liveSessions.find(s=>s.class_id===item.id&&s.status!=='finished')
      const finishedSession=liveSessions.find(s=>s.class_id===item.id&&s.status==='finished')
      const date=new Date(item.starts_at)
      return <article className="class-card class-card-clickable" key={item.id} role="button" tabIndex={0} aria-label={`Opne detaljar for ${item.title}`} onClick={()=>setSelectedClass(item)} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();setSelectedClass(item)}}}>
        <div className="class-date"><strong>{date.toLocaleDateString('nn-NO',{day:'2-digit'})}</strong><span>{date.toLocaleDateString('nn-NO',{month:'short'})}</span></div>
        <div className="class-info"><div className="class-card-top"><span>{item.type}</span>{item.cancelled_at?<span className="booking-cancelled">Avlyst</span>:!item.published?<span className="booking-draft">Utkast</span>:null}<span><Clock3 size={13}/> {date.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{item.title}</h4><p>{item.description||'Gruppetime i GarasjeGym'}</p><small><Users size={13}/> {attendeeCount}/{item.capacity} påmelde · {item.duration_minutes} min</small><small><UserRound size={13}/> {instructorNameFor(item.instructor_id)}</small>{item.wod_ids?.length>0&&<small>Program: {item.wod_ids.map(id=>wods.find(w=>w.id===id)?.name).filter(Boolean).join(" + ")}</small>}</div>
        <div className="class-action" onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>{live&&<span className="booking-confirmed"><Radio size={13}/> {live.status==='paused'?'Pause':'Live'}</span>}{staff&&!live&&!item.cancelled_at&&item.published&&date<=new Date()&&<>{item.wod_ids?.length?<small>{item.wod_ids.length} WOD-ar startar i rekkjefølgja frå programmet</small>:<select aria-label={'WOD for '+item.title} value={selectedWod[item.id]||''} onChange={e=>setSelectedWod(v=>({...v,[item.id]:e.target.value}))}><option value="">Start utan WOD</option>{wods.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>}<button className="secondary-button" disabled={busy==='live-'+item.id} onClick={()=>startLive(item)}><Play size={14}/> Start fellesøkt</button></>}{staff&&live&&<><button className="secondary-button" disabled={busy==='live-'+live.id} onClick={()=>setLiveStatus(live,live.status==='paused'?'active':'paused')}>{live.status==='paused'?<Play size={14}/>:<Pause size={14}/>} {live.status==='paused'?'Start igjen':'Pause'}</button><button className="secondary-button" disabled={busy==='live-'+live.id} onClick={()=>setLiveStatus(live,'finished')}><Square size={13}/> Avslutt</button></>}{item.cancelled_at?<span className="booking-cancelled">Avlyst</span>:item.published===false?<span className="booking-draft">Utkast</span>:booking?<><span className="booking-confirmed">{booking.status==='waitlist'?'På venteliste':booking.status==='pending'?'Ventande':'Påmeld'}</span><button className="secondary-button" disabled={busy===item.id} onClick={()=>cancel(item)}>Avmeld</button></>:<button className="primary-button" disabled={busy===item.id||date<new Date()} onClick={()=>book(item)}>{busy===item.id?'Vent …':full?'Venteliste':'Meld på'}</button>}</div>
        {(live||finishedSession)&&staff&&<div className="live-session-results"><strong>Resultat frå deltakarar</strong>{(sessionResults[(live||finishedSession).id]||[]).length?sessionResults[(live||finishedSession).id].map(result=><div className="live-result-row" key={result.id}><b>{memberNames[result.member_id]||'Medlem'} · {result.title}</b><span>{[result.score_rounds!=null?`${result.score_rounds} rundar`:'',result.score_reps!=null?`${result.score_reps} reps`:'',result.score_time_seconds!=null?Math.floor(result.score_time_seconds/60)+':'+String(Math.round(result.score_time_seconds%60)).padStart(2,'0'):'',result.score_load_kg!=null?result.score_load_kg+' kg':'',result.score_calories!=null?result.score_calories+' cal':'',result.score_distance!=null?result.score_distance+' '+(result.score_unit||'m'):''].filter(Boolean).join(' · ')||'Resultat registrert'}</span></div>):<small>Ingen har registrert resultat enno.</small>}<div className="class-attendee-list"><b>Status for påmelde</b>{attendance.filter(row=>row.class_id===item.id&&row.status==='confirmed').map(row=>{const tracked=live||finishedSession;const memberLogs=(sessionResults[tracked.id]||[]).filter(result=>result.member_id===row.member_id);const warmupDone=(sessionCompletions[tracked.id]||[]).filter(result=>result.member_id===row.member_id);const doneIds=new Set([...memberLogs.map(result=>result.source_wod_id),...warmupDone.map(result=>result.wod_id)].filter(Boolean));const total=(tracked.wod_ids||[tracked.wod_id].filter(Boolean)).length;return <span key={row.member_id}>{memberNames[row.member_id]||'Medlem'} · {doneIds.size}/{total} WOD-ar registrert</span>})}</div></div>}{live&&<div className="live-session-banner"><Radio size={15}/><span><strong>{live.session_title}</strong> · {live.status==='paused'?'Instruktøren har sett økta på pause':'Felles gruppetrening er starta'} · {new Date(live.started_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}{live.wod_id&&<><br/><b>Aktiv WOD {Number(live.active_wod_index||0)+1}/{(live.wod_ids||[live.wod_id]).length}: {wods.find(w=>w.id===live.wod_id)?.name||'Felles WOD'}</b> · {live.timer_format}</>}{staff&&(live.wod_ids||[]).length>1&&<div className="live-wod-switcher"><b>Byt felles WOD</b>{live.wod_ids.map((id,index)=><button type="button" key={id} className={index===Number(live.active_wod_index||0)?'selected':''} disabled={busy==='wod-'+live.id||index===Number(live.active_wod_index||0)} onClick={()=>setActiveWod(live,index)}>{index+1}. {wods.find(w=>w.id===id)?.name||'WOD '+(index+1)}</button>)}</div>}{live.timer_format&&(()=>{const elapsed=(Number(live.timer_elapsed_seconds)||0)+(live.timer_started_at?Math.max(0,Math.floor((clockNow-new Date(live.timer_started_at).getTime())/1000)):0);const settings=live.timer_settings||{};const stationCircuit=settings.workout_schema?.station_circuit;if(stationCircuit){const stations=stationCircuit.stations||[],count=Math.max(2,Math.min(8,Number(stationCircuit.station_count)||stations.length||2)),workS=Math.max(1,Number(stationCircuit.work_seconds)||45),transitionS=Math.max(0,Number(stationCircuit.transition_seconds)||15),roundsTotal=Math.max(1,Number(stationCircuit.rounds)||3),totalSlots=roundsTotal*count,slotDuration=workS+transitionS,slotIndex=Math.min(totalSlots-1,Math.floor(elapsed/slotDuration)),within=elapsed-slotIndex*slotDuration,isTransition=slotIndex<totalSlots-1&&within>=workS,rotationNo=slotIndex%count+1,roundNo=Math.floor(slotIndex/count)+1,remaining=isTransition?slotDuration-within:Math.max(0,workS-within),totalRemaining=Math.max(0,totalSlots*workS+(totalSlots-1)*transitionS-elapsed),formatLoad=station=>station.load_label||(station.load_kg?station.load_kg+' kg':'');return <><br/><b>Felles klokke: {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</b> · {live.timer_status==='running'?'Går':live.timer_status==='paused'?'Pause':'Klar'}<br/><b>{isTransition?'BYTE / ROTASJON':'ARBEID'} · Runde {roundNo}/{roundsTotal} · ROTASJON {rotationNo}/{count}</b><br/>{remaining}s att før neste felles signal · {String(Math.floor(totalRemaining/60)).padStart(2,'0')}:{String(totalRemaining%60).padStart(2,'0')} att totalt<br/><div className="live-station-board" style={{'--station-count':count}}>{stations.map((station,i)=><div className="live-station-row" key={i}><b>{station.station_number||i+1}</b><span>{station.exercise_name}</span><small>{station.reps?station.reps+' reps':'Fri innsats'}{station.height_cm?' · '+station.height_cm+' cm':''}{formatLoad(station)?' · '+formatLoad(station):''}{station.equipment?' · '+station.equipment:''}</small>{station.description&&<p>{station.description}</p>}{station.coach_note&&<em>{station.coach_note}</em>}</div>)}</div><small>Kvar gruppe startar på si eiga stasjon. Alle flyttar éin stasjon fram ved felles signal.</small></>} const work=Math.max(1,Number(settings.work_seconds)||60);const rest=Math.max(0,Number(settings.rest_seconds)||0);const rounds=Math.max(1,Number(settings.rounds)||5);const interval=['Tabata','Intervall','Tilpassa'].includes(live.timer_format);const emom=live.timer_format==='EMOM';const countdown=['AMRAP','Nedteljing'].includes(live.timer_format);const cycle=work+rest;const round=interval?Math.min(rounds,Math.floor(elapsed/cycle)+1):Math.floor(elapsed/60)+1;const phase=interval?(elapsed%cycle<work?'ARBEID':'KVILE'):emom?'NYTT MINUTT':countdown?'PÅGÅR':'FOR TIME';const remaining=interval?Math.max(0,(elapsed%cycle<work?work:cycle)-(elapsed%cycle)):emom?60-(elapsed%60):null;return <><br/><b>Felles klokke: {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</b> · {live.timer_status==='running'?'Går':live.timer_status==='paused'?'Pause':'Klar'}{live.timer_status==='running'&&<><br/>{phase}{remaining!==null?` · ${remaining}s att`:''}{(interval||emom)?` · Runde ${round}${interval?`/${rounds}`:''}`:''}</>}</>})()}{!staff&&(live.wod_ids||[live.wod_id].filter(Boolean)).length>0&&<div className="live-wod-result-actions"><br/><b>Registrer resultat per WOD</b>{(live.wod_ids||[live.wod_id].filter(Boolean)).map((id,index)=>{const wod=wods.find(item=>item.id===id);return <button type="button" className="secondary-button" key={id} onClick={()=>onLogResult?.(id,live.id)}>{index+1}. {wod?.name||'WOD'} · Registrer resultat</button>})}</div>}</span></div>}
      </article>
    })}</div>}
    {editClass&&<div className="modal-backdrop" role="presentation" onClick={()=>setEditClass(null)}><form className="booking-create class-detail-modal" onSubmit={saveClassEdits} onClick={event=>event.stopPropagation()}><div className="training-heading"><div><span className="section-kicker">ADMINISTRASJON</span><h3>Rediger gruppetime</h3></div><button type="button" className="secondary-button" onClick={()=>setEditClass(null)}>Lukk</button></div><label>Namn<input required value={editClass.title} onChange={e=>setEditClass(v=>({...v,title:e.target.value}))}/></label><div className="engine-fields"><label>Type<select value={editClass.type||'Gruppetime'} onChange={e=>setEditClass(v=>({...v,type:e.target.value}))}><option>Gruppetime</option><option>CrossFit</option><option>Styrke</option><option>Kondisjon</option><option>Open Gym</option></select></label><label>Dato og tid<input type="datetime-local" required value={editClass.starts_at} onChange={e=>setEditClass(v=>({...v,starts_at:e.target.value}))}/></label></div><div className="engine-fields"><label>Varigheit (min)<input type="number" min="5" max="300" value={editClass.duration_minutes} onChange={e=>setEditClass(v=>({...v,duration_minutes:e.target.value}))}/></label><label>Kapasitet<input type="number" min="1" max="100" value={editClass.capacity} onChange={e=>setEditClass(v=>({...v,capacity:e.target.value}))}/></label></div><label className="inline-check"><input type="checkbox" checked={editClass.published!==false} onChange={e=>setEditClass(v=>({...v,published:e.target.checked}))}/> Publisert for medlemmar</label><label>Instruktør<select value={editClass.instructor_id||''} onChange={e=>setEditClass(v=>({...v,instructor_id:e.target.value||null}))}><option value="">Ikkje tildelt</option>{instructors.map(person=><option key={person.id} value={person.id}>{person.display_name||'Instruktør'}</option>)}</select></label><label>Informasjon<textarea rows="3" value={editClass.description||''} onChange={e=>setEditClass(v=>({...v,description:e.target.value}))}/></label><div className="engine-section"><strong>WOD-ar for timen</strong>{wods.map(w=><label className="inline-check" key={w.id}><input type="checkbox" checked={(editClass.wod_ids||[]).includes(w.id)} onChange={e=>setEditClass(v=>({...v,wod_ids:e.target.checked?[...(v.wod_ids||[]),w.id]:(v.wod_ids||[]).filter(id=>id!==w.id)}))}/>{w.name} · {w.format}</label>)}</div><div className="engine-fields"><button className="primary-button" disabled={busy==='edit-'+editClass.id}>{busy==='edit-'+editClass.id?'Lagrar …':'Lagra endringar'}</button>{!editClass.cancelled_at&&new Date(editClass.starts_at)>new Date()&&!liveSessions.some(session=>session.class_id===editClass.id)&&<button type="button" className="secondary-button" disabled={busy==='cancel-'+editClass.id} onClick={()=>cancelClass(editClass)}>Avlys gruppetime</button>}<button type="button" className="secondary-button" disabled={busy==='delete-'+editClass.id} onClick={()=>deleteClass(editClass)}>Slett time</button></div></form></div>}
    {selectedClass&&(()=>{const item=selectedClass,date=new Date(item.starts_at),booking=mine.find(x=>x.class_id===item.id&&['confirmed','pending','waitlist'].includes(x.status)),attendeeCount=attendeeCountFor(item.id),live=liveSessions.find(x=>x.class_id===item.id);return <div className="modal-backdrop" role="presentation" onClick={()=>setSelectedClass(null)}><section className="booking-create class-detail-modal" role="dialog" aria-modal="true" aria-label="Detaljar om gruppetime" onClick={event=>event.stopPropagation()}><div className="training-heading"><div><span className="section-kicker">GRUPPETIME</span><h3>{item.title}</h3><p>{date.toLocaleDateString('nn-NO',{dateStyle:'full'})} · {date.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</p></div><button type="button" className="secondary-button" onClick={()=>setSelectedClass(null)}>Lukk</button></div><div className="class-detail-facts"><span><Clock3/> {item.duration_minutes} min</span><span><Users/> {attendeeCount}/{item.capacity} påmelde</span><span>{item.type}</span><span><UserRound/> {instructorNameFor(item.instructor_id)}</span></div>{item.cancelled_at&&<div className="auth-error" role="status">Gruppetimen er avlyst. {item.cancellation_note||''}</div>}{!item.published&&!item.cancelled_at&&<div className="booking-draft">Gruppetimen er lagra som utkast og er ikkje synleg for medlemmar.</div>}<p>{item.description||'Gruppetime i GarasjeGym'}</p>{item.wod_ids?.length>0&&<section className="engine-section"><strong>Program for timen</strong>{item.wod_ids.map(id=>wods.find(w=>w.id===id)).filter(Boolean).map(w=><div className="class-detail-wod" key={w.id}><b>{w.name}</b><small>{w.format} · {w.duration_minutes||'–'} min</small>{w.notes&&<p>{w.notes}</p>}</div>)}</section>}{live&&<div className="booking-confirmed"><Radio size={14}/> Fellesøkta er {live.status==='paused'?'pausa':'i gang'}</div>}{item.cancelled_at?null:booking?<><div className="booking-confirmed">{booking.status==='waitlist'?'Du står på venteliste':'Du er påmeld'}</div><button type="button" className="secondary-button" disabled={busy===item.id} onClick={()=>cancel(item)}>Meld deg av</button></>:<button type="button" className="primary-button" disabled={date<new Date()||busy===item.id||!item.published} onClick={()=>book(item)}>{attendeeCount>=item.capacity?'Meld på venteliste':'Meld på denne timen'}</button>}{staff&&<section className="engine-section"><strong>Administrasjon</strong><p>Rediger timeinformasjon, program og fellesøkt.</p><div className="class-attendee-list"><b>Påmelde og venteliste</b>{attendance.filter(row=>row.class_id===item.id).map(row=><div className="class-attendance-row" key={row.id}><span>{memberNames[row.member_id]||'Medlem'} · {row.status==='waitlist'?'Venteliste':row.attendance_status==='present'?'Møtt':row.attendance_status==='absent'?'Fråvær':'Påmeld'}</span>{row.status==='confirmed'&&<div className="class-attendance-actions"><button type="button" className="secondary-button" disabled={busy==='attendance-'+row.id} onClick={()=>markAttendance(row,'present')}>Møtt</button><button type="button" className="secondary-button" disabled={busy==='attendance-'+row.id} onClick={()=>markAttendance(row,'absent')}>Fråvær</button><button type="button" className="text-button" disabled={busy==='attendance-'+row.id||!row.attendance_status} onClick={()=>markAttendance(row,null)}>Nullstill</button></div>}</div>)}</div><button type="button" className="secondary-button" onClick={()=>setEditClass({...item,starts_at:new Date(item.starts_at).toISOString().slice(0,16),wod_ids:item.wod_ids||[]})}>Rediger gruppetime</button>{!item.cancelled_at&&date>new Date()&&!live&&<button type="button" className="secondary-button" onClick={()=>cancelClass(item)}>Avlys gruppetime</button>}<button type="button" className="secondary-button" onClick={()=>deleteClass(item)}>Slett time</button>{!live&&!item.cancelled_at&&date<=new Date()&&<button className="secondary-button" onClick={()=>{setSelectedClass(null);startLive(item)}}><Play size={14}/> Start fellesøkt</button>}</section>}</section></div>})()}
  </div>
}
