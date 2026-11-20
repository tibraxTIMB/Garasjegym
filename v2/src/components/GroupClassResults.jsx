import {useEffect,useRef,useState} from 'react'
import {CheckCircle2,ClipboardList,LoaderCircle,Play,RefreshCw} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function GroupClassResults({onLaunchWod=()=>{}}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[hasMore,setHasMore]=useState(false),[nextOffset,setNextOffset]=useState(0)
 const loadSequence=useRef(0),loadingMore=useRef(false)
 async function load(append=false){
  if(loadingMore.current&&!append)return
  if(append&&loadingMore.current)return
  if(append)loadingMore.current=true
  const requestId=++loadSequence.current
  const offset=append?nextOffset:0
  setLoading(true);setError('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError)throw authError
   if(!user)throw new Error('Logg inn for å sjå gruppetime-resultata.')
   const {data:sessions,error:sessionError}=await supabase.from('class_live_sessions')
    .select('id,class_id,session_title,ended_at,wod_id,wod_ids,results_published_at')
    .eq('status','finished').not('results_published_at','is',null)
    .order('ended_at',{ascending:false}).range(offset,offset+29)
   if(sessionError)throw sessionError
   const sessionRows=sessions||[]
   if(requestId!==loadSequence.current)return
   setHasMore(sessionRows.length===30)
   setNextOffset(offset+sessionRows.length)
   const ids=[...new Set(sessionRows.flatMap(s=>Array.isArray(s.wod_ids)&&s.wod_ids.length?s.wod_ids:(s.wod_id?[s.wod_id]:[])))]
   if(!ids.length){
    if(!append)setRows([])
    return
   }
   const sessionIds=sessionRows.map(s=>s.id)
   const [wods,logs,done]=await Promise.all([
    supabase.from('wods').select('id,name,format,category,duration_minutes').in('id',ids),
    supabase.from('workout_logs').select('id,class_live_session_id,source_wod_id,title,result_data').eq('member_id',user.id).in('class_live_session_id',sessionIds),
    supabase.from('class_session_wod_completions').select('session_id,wod_id').eq('member_id',user.id).in('session_id',sessionIds)
   ])
   if(wods.error||logs.error||done.error)throw new Error(wods.error?.message||logs.error?.message||done.error?.message)
   if(requestId!==loadSequence.current)return
   const wodMap=new Map((wods.data||[]).map(w=>[w.id,w]))
   const completedLogs=new Set((logs.data||[]).flatMap(x=>[...new Set([x.source_wod_id,...(Array.isArray(x.result_data?.wod_ids)?x.result_data.wod_ids:[])].filter(Boolean))].map(wodId=>x.class_live_session_id+'|'+wodId)))
   const completedWarmups=new Set((done.data||[]).map(x=>x.session_id+'|'+x.wod_id))
   const mapped=sessionRows.map(session=>({...session,wods:(Array.isArray(session.wod_ids)&&session.wod_ids.length?session.wod_ids:(session.wod_id?[session.wod_id]:[])).map(id=>wodMap.get(id)).filter(Boolean).map(wod=>({...wod,done:wod.category==='warmup'?completedWarmups.has(session.id+'|'+wod.id):completedLogs.has(session.id+'|'+wod.id)}))})).filter(s=>s.wods.length)
   setRows(current=>append?[...current,...mapped.filter(row=>!current.some(existing=>existing.id===row.id))]:mapped)
  }catch(loadError){
   if(requestId===loadSequence.current)setError(loadError?.message||'Kunne ikkje hente gruppetime-resultat.')
  }finally{
   if(requestId===loadSequence.current)setLoading(false)
   if(append)loadingMore.current=false
  }
 }
 useEffect(()=>{load();const t=setInterval(()=>load(false),60000);return()=>{clearInterval(t);loadSequence.current++}},[])
 async function markWarmup(session,wod){
  const key=session.id+'|'+wod.id
  if(busy)return
  setBusy(key);setError('');setNotice('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError)throw authError
   if(!user)throw new Error('Logg inn for å registrere oppvarminga.')
   const {error:e}=await supabase.from('class_session_wod_completions').insert({session_id:session.id,wod_id:wod.id,member_id:user.id})
   if(e&&e.code!=='23505')throw e
   setNotice('Oppvarminga er markert som gjennomført.')
   await load(false)
  }catch(markError){setError(markError?.message||'Kunne ikkje registrere oppvarminga.')}
  finally{setBusy('')}
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
  {hasMore&&<div className="group-results-more"><button type="button" className="secondary-button" onClick={()=>load(true)}>Hent eldre gruppetimer</button></div>}
 </section>
}
