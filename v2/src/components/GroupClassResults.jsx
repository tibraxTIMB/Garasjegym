import {useEffect,useState} from 'react'
import {CheckCircle2,ClipboardList,LoaderCircle,Play,RefreshCw} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function GroupClassResults({onLaunchWod=()=>{}}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 async function load(){
  setLoading(true);setError('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setLoading(false);return}
  const {data:sessions,error:sessionError}=await supabase.from('class_live_sessions')
   .select('id,class_id,session_title,ended_at,wod_id,wod_ids,results_published_at')
   .eq('status','finished').not('results_published_at','is',null)
   .order('ended_at',{ascending:false}).limit(30)
  if(sessionError){setError(sessionError.message);setLoading(false);return}
  const sessionRows=sessions||[]
  const ids=[...new Set(sessionRows.flatMap(s=>Array.isArray(s.wod_ids)&&s.wod_ids.length?s.wod_ids:(s.wod_id?[s.wod_id]:[])))]
  if(!ids.length){setRows([]);setLoading(false);return}
  const [wods,logs,done]=await Promise.all([
   supabase.from('wods').select('id,name,format,category,duration_minutes').in('id',ids),
   supabase.from('workout_logs').select('id,class_live_session_id,source_wod_id,title').eq('member_id',user.id).in('class_live_session_id',sessionRows.map(s=>s.id)),
   supabase.from('class_session_wod_completions').select('session_id,wod_id').eq('member_id',user.id).in('session_id',sessionRows.map(s=>s.id))
  ])
  if(wods.error||logs.error||done.error){setError(wods.error?.message||logs.error?.message||done.error?.message);setLoading(false);return}
  const wodMap=new Map((wods.data||[]).map(w=>[w.id,w]))
  const completedLogs=new Set((logs.data||[]).map(x=>x.class_live_session_id+'|'+x.source_wod_id))
  const completedWarmups=new Set((done.data||[]).map(x=>x.session_id+'|'+x.wod_id))
  setRows(sessionRows.map(session=>({...session,wods:(Array.isArray(session.wod_ids)&&session.wod_ids.length?session.wod_ids:(session.wod_id?[session.wod_id]:[])).map(id=>wodMap.get(id)).filter(Boolean).map(wod=>({...wod,done:wod.category==='warmup'?completedWarmups.has(session.id+'|'+wod.id):completedLogs.has(session.id+'|'+wod.id)}))})).filter(s=>s.wods.length))
  setLoading(false)
 }
 useEffect(()=>{load();const t=setInterval(load,60000);return()=>clearInterval(t)},[])
 async function markWarmup(session,wod){
  setBusy(session.id+'|'+wod.id);setError('');setNotice('')
  const {data:{user}}=await supabase.auth.getUser()
  const {error:e}=await supabase.from('class_session_wod_completions').insert({session_id:session.id,wod_id:wod.id,member_id:user.id})
  if(e&&e.code!=='23505')setError(e.message)
  else{setNotice('Oppvarminga er markert som gjennomført.');await load()}
  setBusy('')
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin"/> Hentar gruppetime-resultat …</div>
 return <section className="engine-section group-class-results">
  <div className="engine-section-title"><h4><ClipboardList size={17}/> Resultat frå gruppetimar</h4><button className="secondary-button" type="button" onClick={load}><RefreshCw size={14}/> Oppdater</button></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={14}/>{notice}</div>}
  {!rows.length?<div className="empty-state">Ingen nye gruppetime-WOD-ar ventar på registrering.</div>:rows.map(session=><article className="history-card group-result-session" key={session.id}>
   <div className="history-card-top"><strong>{session.session_title}</strong><span>{session.ended_at?new Date(session.ended_at).toLocaleDateString('nn-NO'):''}</span></div>
   {session.wods.map((wod,index)=><div className="group-result-wod" key={wod.id}>
    <div><b>{index+1}. {wod.name}</b><small>{wod.category==='warmup'?'Oppvarming · marker gjennomført':'Hovud-WOD · resultat skal registrerast'} · {wod.format}</small></div>
    {wod.done?<span className="booking-confirmed"><CheckCircle2 size={14}/> Registrert</span>:wod.category==='warmup'
      ?<button type="button" className="secondary-button" disabled={busy===session.id+'|'+wod.id} onClick={()=>markWarmup(session,wod)}>{busy===session.id+'|'+wod.id?'Lagrar …':'Marker ferdig'}</button>
      :<button type="button" className="primary-button" onClick={()=>onLaunchWod(wod.id,null,session.id)}><Play size={14}/> Registrer resultat</button>}
   </div>)}
  </article>)}
 </section>
}
