import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, LoaderCircle, Plus, Users, Radio, Play, Pause, Square } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { isStaff } from '../lib/auth.js'

const LIVE_SESSION_FIELDS = 'id,class_id,status,started_at,session_title,wod_id,timer_format,timer_duration_seconds,timer_settings,timer_started_at,timer_elapsed_seconds,timer_status'
const LIVE_SESSION_BASE_FIELDS = 'id,class_id,status,started_at,session_title,wod_id'

async function fetchLiveSessions() {
  let result = await supabase.from('class_live_sessions')
    .select(LIVE_SESSION_FIELDS)
    .in('status', ['active', 'paused'])
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

export default function Booking({ profile, onLogResult }) {
  const [classes,setClasses]=useState([]),[attendance,setAttendance]=useState([])
  const [mine,setMine]=useState([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [showCreate,setShowCreate]=useState(false),[selectedClass,setSelectedClass]=useState(null)
  const [title,setTitle]=useState('')
  const [type,setType]=useState('Gruppetime')
  const [startsAt,setStartsAt]=useState('')
  const [duration,setDuration]=useState('60')
  const [capacity,setCapacity]=useState('8')
  const [description,setDescription]=useState('')
  const [liveSessions,setLiveSessions]=useState([])
  const [sessionResults,setSessionResults]=useState({})
  const [memberNames,setMemberNames]=useState({})
  const [wods,setWods]=useState([])
  const [selectedWod,setSelectedWod]=useState({}),[createWodIds,setCreateWodIds]=useState([])
  const [clockNow,setClockNow]=useState(Date.now())
  const staff=isStaff(profile)

  async function load(silent=false){
    if(!silent)setLoading(true);setError('')
    const [{data:userData,error:userError}]=await Promise.all([supabase.auth.getUser()])
    if(userError||!userData.user){setError('Logg inn på nytt.');setLoading(false);return}
    const [c,b,a,live]=await Promise.all([
      supabase.from('classes').select('id,title,type,capacity,starts_at,duration_minutes,description,workout_text,wod_ids').gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50),
      supabase.from('class_bookings').select('id,class_id,status,created_at').eq('member_id',userData.user.id),
      supabase.from('class_bookings').select('class_id').eq('status','confirmed'),
      fetchLiveSessions()
    ])
    // The base booking calendar must remain usable before optional live-session migrations are installed.
    if(c.error)setError(c.error.message);else setClasses(c.data||[])
    if(b.error)setError(b.error.message);else setMine(b.data||[])
    if(a.error)setError(a.error.message);else setAttendance(a.data||[])
    if(live.error)setError(live.error.message);else setLiveSessions(live.data||[])
    let w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings').eq('is_published',true).order('name')
    if(w.error && /timer_settings|column .* does not exist/i.test(w.error.message||'')){
      w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes').eq('is_published',true).order('name')
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
      const {data,error:e}=await supabase.from('workout_logs').select('id,member_id,title,score_rounds,score_reps,note,class_live_session_id').in('class_live_session_id',ids)
      if(e||cancelled)return
      const rows=data||[]
      setSessionResults(rows.reduce((acc,row)=>{(acc[row.class_live_session_id] ||= []).push(row);return acc},{}))
      const memberIds=[...new Set(rows.map(row=>row.member_id))]
      if(memberIds.length){const {data:profiles}=await supabase.from('profiles').select('id,display_name').in('id',memberIds);if(!cancelled)setMemberNames(Object.fromEntries((profiles||[]).map(p=>[p.id,p.display_name||'Medlem'])))}
    }
    loadResults()
    const refresh=setInterval(loadResults,5000)
    return()=>{cancelled=true;clearInterval(refresh)}
  },[staff,liveSessionIds])
  useEffect(()=>{const clock=setInterval(()=>setClockNow(Date.now()),1000);const refresh=setInterval(async()=>{const {data,error:e}=await fetchLiveSessions();if(!e)setLiveSessions(data||[])},5000);return()=>{clearInterval(clock);clearInterval(refresh)}},[])

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
        description:description.trim()||null,created_by:user.id,wod_ids:createWodIds
      })
      if(e)throw e
      setTitle('');setDescription('');setCreateWodIds([]);setShowCreate(false);setNotice('Timen er oppretta.')
      await load()
    }catch(e){setError(e.message||'Kunne ikkje oppretta timen.')}
    finally{setBusy('')}
  }
  async function startLive(item){
    setBusy('live-'+item.id);setError('');setNotice('')
    try{
      const {data:{user}}=await supabase.auth.getUser()
      const selectedIds=selectedWod[item.id]||item.wod_ids||[];const wod=wods.find(x=>x.id===(Array.isArray(selectedIds)?selectedIds[0]:selectedIds))||null
      const startedAt=new Date().toISOString()
      let result=await supabase.from('class_live_sessions').insert({class_id:item.id,started_by:user.id,status:'active',started_at:startedAt,session_title:item.title,wod_id:wod?.id||null,timer_format:wod?.format||null,timer_duration_seconds:wod?.duration_minutes?Number(wod.duration_minutes)*60:null,timer_settings:wod?.timer_settings||null,timer_started_at:wod?startedAt:null,timer_elapsed_seconds:0,timer_status:wod?'running':'idle'}).select(LIVE_SESSION_FIELDS).single()
      if(result.error && /timer_settings|timer_started_at|timer_elapsed_seconds|timer_status|timer_format|timer_duration_seconds|column .* does not exist/i.test(result.error.message||'')){
        // Migration 005 supports a live session without the timer extension from migration 007.
        result=await supabase.from('class_live_sessions').insert({class_id:item.id,started_by:user.id,status:'active',started_at:startedAt,session_title:item.title}).select(LIVE_SESSION_BASE_FIELDS).single()
      }
      if(result.error)throw result.error
      setLiveSessions(v=>[result.data,...v.filter(x=>x.class_id!==item.id)])
      setNotice(wod&&!result.data.timer_format?'Gruppetreninga er starta. WOD-timer krev den siste timer-migreringa.':'Gruppetreninga er starta og synleg for påmelde deltakarar.')
    }catch(e){setError(e.message||'Kunne ikkje starta gruppetreninga.')}
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
      setLiveSessions(v=>status==='finished'?v.filter(x=>x.id!==session.id):v.map(x=>x.id===session.id?{...x,...patch}:x))
      setNotice(status==='finished'?'Gruppetreninga er avslutta.':status==='paused'?'Gruppetreninga er sett på pause.':'Gruppetreninga er i gang igjen.')
    }catch(e){setError(e.message||'Kunne ikkje oppdatera gruppetreninga.')}
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
      <label>Informasjon<textarea value={description} onChange={e=>setDescription(e.target.value)} rows="2"/></label><div className="engine-section"><strong>WOD-ar i gruppetimen (vel fleire)</strong>{wods.map(w=><label className="inline-check" key={w.id}><input type="checkbox" checked={createWodIds.includes(w.id)} onChange={e=>setCreateWodIds(v=>e.target.checked?[...v,w.id]:v.filter(id=>id!==w.id))}/>{w.name} · {w.format}</label>)}</div>
      <button className="primary-button" disabled={busy==='create'}>{busy==='create'?'Lagrar …':'Opprett time'}</button>
    </form>}
    {classes.length===0?<div className="empty-state">Ingen komande gruppetimar er publiserte.</div>:<div className="class-list">{classes.map(item=>{
      const booking=mine.find(b=>b.class_id===item.id&&b.status!=='cancelled')
      const attendeeCount=attendance.filter(b=>b.class_id===item.id).length
      const full=attendeeCount>=item.capacity
      const live=liveSessions.find(s=>s.class_id===item.id)
      const date=new Date(item.starts_at)
      return <article className="class-card" key={item.id}>
        <div className="class-date"><strong>{date.toLocaleDateString('nn-NO',{day:'2-digit'})}</strong><span>{date.toLocaleDateString('nn-NO',{month:'short'})}</span></div>
        <div className="class-info"><div className="class-card-top"><span>{item.type}</span><span><Clock3 size={13}/> {date.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</span></div><h4>{item.title}</h4><p>{item.description||'Gruppetime i GarasjeGym'}</p><button type="button" className="text-action class-detail-trigger" onClick={()=>setSelectedClass(item)}>Sjå detaljar →</button><small><Users size={13}/> {attendeeCount}/{item.capacity} påmelde · {item.duration_minutes} min</small>{item.wod_ids?.length>0&&<small>Program: {item.wod_ids.map(id=>wods.find(w=>w.id===id)?.name).filter(Boolean).join(" + ")}</small>}</div>
        <div className="class-action">{live&&<span className="booking-confirmed"><Radio size={13}/> {live.status==='paused'?'Pause':'Live'}</span>}{staff&&!live&&date<=new Date()&&<><select aria-label={'WOD for '+item.title} value={selectedWod[item.id]||item.wod_ids?.[0]||''} onChange={e=>setSelectedWod(v=>({...v,[item.id]:e.target.value}))}><option value="">Start utan WOD</option>{wods.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button className="secondary-button" disabled={busy==='live-'+item.id} onClick={()=>startLive(item)}><Play size={14}/> Start fellesøkt</button></>}{staff&&live&&<><button className="secondary-button" disabled={busy==='live-'+live.id} onClick={()=>setLiveStatus(live,live.status==='paused'?'active':'paused')}>{live.status==='paused'?<Play size={14}/>:<Pause size={14}/>} {live.status==='paused'?'Start igjen':'Pause'}</button><button className="secondary-button" disabled={busy==='live-'+live.id} onClick={()=>setLiveStatus(live,'finished')}><Square size={13}/> Avslutt</button></>}{booking?<><span className="booking-confirmed">Påmeld</span><button className="secondary-button" disabled={busy===item.id} onClick={()=>cancel(item)}>Avmeld</button></>:<button className="primary-button" disabled={busy===item.id||date<new Date()||full} onClick={()=>book(item)}>{busy===item.id?'Vent …':full?'Fullt':'Meld på'}</button>}</div>
        {live&&staff&&<div className="live-session-results"><strong>Resultat frå deltakarar</strong>{(sessionResults[live.id]||[]).length?sessionResults[live.id].map(result=><div className="live-result-row" key={result.id}><b>{memberNames[result.member_id]||'Medlem'}</b><span>{[result.score_rounds!==null?`${result.score_rounds} rundar`:'',result.score_reps!==null?`${result.score_reps} reps`:''].filter(Boolean).join(' + ')||'Resultat registrert'}</span></div>):<small>Ingen har registrert resultat enno.</small>}</div>}{live&&<div className="live-session-banner"><Radio size={15}/><span><strong>{live.session_title}</strong> · {live.status==='paused'?'Instruktøren har sett økta på pause':'Felles gruppetrening er starta'} · {new Date(live.started_at).toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}{live.wod_id&&<><br/><b>WOD: {wods.find(w=>w.id===live.wod_id)?.name||'Felles WOD'}</b> · {live.timer_format}</>}{live.timer_format&&(()=>{const elapsed=(Number(live.timer_elapsed_seconds)||0)+(live.timer_started_at?Math.max(0,Math.floor((clockNow-new Date(live.timer_started_at).getTime())/1000)):0);const settings=live.timer_settings||{};const stationCircuit=settings.workout_schema?.station_circuit;if(stationCircuit){const stations=stationCircuit.stations||[],count=Math.max(2,Math.min(8,Number(stationCircuit.station_count)||stations.length||2)),workS=Math.max(1,Number(stationCircuit.work_seconds)||45),transitionS=Math.max(0,Number(stationCircuit.transition_seconds)||15),roundsTotal=Math.max(1,Number(stationCircuit.rounds)||3),totalSlots=roundsTotal*count,slotDuration=workS+transitionS,slotIndex=Math.min(totalSlots-1,Math.floor(elapsed/slotDuration)),within=elapsed-slotIndex*slotDuration,isTransition=slotIndex<totalSlots-1&&within>=workS,rotationNo=slotIndex%count+1,roundNo=Math.floor(slotIndex/count)+1,remaining=isTransition?slotDuration-within:Math.max(0,workS-within),totalRemaining=Math.max(0,totalSlots*workS+(totalSlots-1)*transitionS-elapsed),formatLoad=station=>station.load_label||(station.load_kg?station.load_kg+' kg':'');return <><br/><b>Felles klokke: {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</b> · {live.timer_status==='running'?'Går':live.timer_status==='paused'?'Pause':'Klar'}<br/><b>{isTransition?'BYTE / ROTASJON':'ARBEID'} · Runde {roundNo}/{roundsTotal} · ROTASJON {rotationNo}/{count}</b><br/>{remaining}s att før neste felles signal · {String(Math.floor(totalRemaining/60)).padStart(2,'0')}:{String(totalRemaining%60).padStart(2,'0')} att totalt<br/><div className="live-station-board" style={{'--station-count':count}}>{stations.map((station,i)=><div className="live-station-row" key={i}><b>{station.station_number||i+1}</b><span>{station.exercise_name}</span><small>{station.reps?station.reps+' reps':'Fri innsats'}{formatLoad(station)?' · '+formatLoad(station):''}{station.equipment?' · '+station.equipment:''}</small>{station.description&&<p>{station.description}</p>}{station.coach_note&&<em>{station.coach_note}</em>}</div>)}</div><small>Kvar gruppe startar på si eiga stasjon. Alle flyttar éin stasjon fram ved felles signal.</small></>} const work=Math.max(1,Number(settings.work_seconds)||60);const rest=Math.max(0,Number(settings.rest_seconds)||0);const rounds=Math.max(1,Number(settings.rounds)||5);const interval=['Tabata','Intervall','Tilpassa'].includes(live.timer_format);const emom=live.timer_format==='EMOM';const countdown=['AMRAP','Nedteljing'].includes(live.timer_format);const cycle=work+rest;const round=interval?Math.min(rounds,Math.floor(elapsed/cycle)+1):Math.floor(elapsed/60)+1;const phase=interval?(elapsed%cycle<work?'ARBEID':'KVILE'):emom?'NYTT MINUTT':countdown?'PÅGÅR':'FOR TIME';const remaining=interval?Math.max(0,(elapsed%cycle<work?work:cycle)-(elapsed%cycle)):emom?60-(elapsed%60):null;return <><br/><b>Felles klokke: {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</b> · {live.timer_status==='running'?'Går':live.timer_status==='paused'?'Pause':'Klar'}{live.timer_status==='running'&&<><br/>{phase}{remaining!==null?` · ${remaining}s att`:''}{(interval||emom)?` · Runde ${round}${interval?`/${rounds}`:''}`:''}</>}</>})()}{!staff&&live.wod_id&&<><br/><button className="secondary-button" onClick={()=>onLogResult?.(live.wod_id,live.id)}>Registrer mitt resultat</button></>}</span></div>}
      </article>
    })}</div>}
    {selectedClass&&(()=>{const item=selectedClass,date=new Date(item.starts_at),booking=mine.find(x=>x.class_id===item.id&&x.status!=='cancelled'),attendeeCount=attendance.filter(x=>x.class_id===item.id).length,live=liveSessions.find(x=>x.class_id===item.id);return <div className="modal-backdrop" role="presentation" onClick={()=>setSelectedClass(null)}><section className="booking-create class-detail-modal" role="dialog" aria-modal="true" aria-label="Detaljar om gruppetime" onClick={event=>event.stopPropagation()}><div className="training-heading"><div><span className="section-kicker">GRUPPETIME</span><h3>{item.title}</h3><p>{date.toLocaleDateString('nn-NO',{dateStyle:'full'})} · {date.toLocaleTimeString('nn-NO',{hour:'2-digit',minute:'2-digit'})}</p></div><button type="button" className="secondary-button" onClick={()=>setSelectedClass(null)}>Lukk</button></div><div className="class-detail-facts"><span><Clock3/> {item.duration_minutes} min</span><span><Users/> {attendeeCount}/{item.capacity} påmelde</span><span>{item.type}</span></div><p>{item.description||'Gruppetime i GarasjeGym'}</p>{item.wod_ids?.length>0&&<section className="engine-section"><strong>Program for timen</strong>{item.wod_ids.map(id=>wods.find(w=>w.id===id)).filter(Boolean).map(w=><div className="class-detail-wod" key={w.id}><b>{w.name}</b><small>{w.format} · {w.duration_minutes||'–'} min</small>{w.notes&&<p>{w.notes}</p>}</div>)}</section>}{live&&<div className="booking-confirmed"><Radio size={14}/> Fellesøkta er {live.status==='paused'?'pausa':'i gang'}</div>}{booking?<><div className="booking-confirmed">Du er påmeld</div><button type="button" className="secondary-button" disabled={busy===item.id} onClick={()=>cancel(item)}>Meld deg av</button></>:<button type="button" className="primary-button" disabled={date<new Date()||attendeeCount>=item.capacity||busy===item.id} onClick={()=>book(item)}>Meld på denne timen</button>}{staff&&<section className="engine-section"><strong>Administrasjon</strong><p>WOD-ar og fellesøkt kan styrast frå kontrollane på timekortet.</p>{!live&&date<=new Date()&&<button className="secondary-button" onClick={()=>{setSelectedClass(null);startLive(item)}}><Play size={14}/> Start fellesøkt</button>}</section>}</section></div>})()}
  </div>
}
