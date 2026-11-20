import {useEffect,useRef,useState} from 'react'
import {MessageSquareText,CalendarDays,RefreshCw,LoaderCircle,Info,Trash2} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function PTInfo(){
 const [messages,setMessages]=useState([])
 const [currentUserId,setCurrentUserId]=useState('')
 const [sessions,setSessions]=useState([])
 const [information,setInformation]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [deletingId,setDeletingId]=useState('')
 const loadSequence=useRef(0)
 async function load(silent=false){
  const requestId=++loadSequence.current
  if(!silent)setLoading(true)
  setError('')
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError||!user)throw authError||new Error('Logg inn på nytt for å sjå informasjon frå PT.')
   setCurrentUserId(user.id)
   const [messageRows,sessionRows,programResult]=await Promise.all([
    supabase.from('pt_messages').select('id,sender_id,body,created_at').eq('client_id',user.id).order('created_at',{ascending:false}).limit(50),
    supabase.from('pt_sessions').select('id,title,starts_at,duration_minutes,status,session_type,message,prep,cancellation_note').eq('client_id',user.id).in('status',['planned','published','completed','cancelled']).order('starts_at',{ascending:true}).limit(40),
    supabase.from('pt_programs').select('id,title').eq('client_id',user.id)
   ])
   if(requestId!==loadSequence.current)return
   const failures=[messageRows.error&&'Meldingane kunne ikkje hentast: '+messageRows.error.message,sessionRows.error&&'Avtalar kunne ikkje hentast: '+sessionRows.error.message,programResult.error&&'Programinformasjon kunne ikkje hentast: '+programResult.error.message].filter(Boolean)
   if(failures.length)setError(failures.join(' · '))
   setMessages(messageRows.data||[])
   setSessions(sessionRows.data||[])
   const programs=programResult.data||[]
   if(programs.length){
    const {data:infoRows,error:infoError}=await supabase.from('pt_program_sessions').select('id,program_id,title,scheduled_date,estimated_minutes,workout_snapshot,status').in('program_id',programs.map(x=>x.id)).eq('session_kind','information').order('scheduled_date',{ascending:true,nullsFirst:false})
    if(requestId!==loadSequence.current)return
    if(infoError)setError(v=>v?v+' · '+infoError.message:'Infotimar kunne ikkje hentast: '+infoError.message)
    else setInformation((infoRows||[]).map(x=>({...x,program_title:programs.find(program=>program.id===x.program_id)?.title||'PT-program'})))
   }else setInformation([])
  }catch(loadError){if(requestId===loadSequence.current)setError(loadError?.message||'Informasjon frå PT kunne ikkje hentast.')}
  finally{if(requestId===loadSequence.current)setLoading(false)}
 }
 async function removeMessage(message){
  if(!message?.id||!currentUserId)return
  if(!window.confirm('Sletta denne meldinga frå PT?'))return
  setDeletingId(message.id);setError('')
  try{
   const {data,error:e}=await supabase.from('pt_messages').delete().eq('id',message.id).eq('client_id',currentUserId).select('id')
   if(e)throw e
   if(!data?.length)throw new Error('Meldinga vart ikkje sletta. Ho kan alt vera fjerna eller du manglar tilgang.')
   setMessages(rows=>rows.filter(row=>row.id!==message.id))
  }catch(e){setError(e.message||'Kunne ikkje sletta meldinga.')}
  finally{setDeletingId('')}
 }
 useEffect(()=>{load();const refresh=window.setInterval(()=>load(true),60_000);return()=>{loadSequence.current+=1;window.clearInterval(refresh)}},[])
 return <div className="pt-info-simple">
  <div className="training-heading"><div><span className="section-kicker">PERSONLEG OPPFØLGING</span><h3>Frå PT</h3><p>Meldingar, beskjedar og planlagde infotimar.</p></div><button type="button" className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15}/> Oppdater</button></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar informasjon frå PT …</div>:<>
   <section className="engine-section pt-info-section"><div className="engine-section-title"><h4><MessageSquareText size={17}/> Meldingar</h4><span>{messages.length}</span></div>
    {messages.length?messages.map(m=><article className="pt-info-card" key={m.id}><div className="pt-info-card-meta"><strong>{m.sender_id===currentUserId?'Du':'PT'}</strong><div className="pt-info-message-actions"><time>{new Date(m.created_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}</time><button type="button" className="icon-button" aria-label="Slett melding" title="Slett melding" disabled={deletingId===m.id} onClick={()=>removeMessage(m)}><Trash2 size={14}/></button></div></div><p>{m.body}</p></article>):<div className="empty-state">Du har ingen meldingar frå PT enno.</div>}
   </section>
   <section className="engine-section pt-info-section"><div className="engine-section-title"><h4><CalendarDays size={17}/> Avtalar og infotimar</h4><span>{sessions.length+information.length}</span></div>
    {sessions.length||information.length?<>{information.map(s=><article className="pt-info-card" key={s.id}><div className="pt-info-card-meta"><strong>{s.title}</strong><span>Infotime · {s.status==='completed'?'Gjennomført':'Planlagd'}</span></div><p>{s.program_title}{s.scheduled_date?' · '+new Date(s.scheduled_date+'T12:00:00').toLocaleDateString('nn-NO',{dateStyle:'full'}):''}{s.estimated_minutes?' · '+s.estimated_minutes+' min':''}</p>{s.workout_snapshot?.agenda&&<p>{s.workout_snapshot.agenda}</p>}{s.workout_snapshot?.preparation&&<p className="pt-info-prep"><Info size={14}/>{s.workout_snapshot.preparation}</p>}{s.workout_snapshot?.materials&&<p>Ta med: {s.workout_snapshot.materials}</p>}</article>)}{sessions.map(s=><article className="pt-info-card" key={s.id}><div className="pt-info-card-meta"><strong>{s.title}</strong><span>{s.status==='completed'?'Gjennomført':s.status==='cancelled'?'Avlyst':'Planlagd'}</span></div><p>{new Date(s.starts_at).toLocaleString('nn-NO',{dateStyle:'full',timeStyle:'short'})} · {s.duration_minutes} min</p>{s.message&&<p>{s.message}</p>}{s.cancellation_note&&<p className="pt-info-prep"><Info size={14}/>{s.cancellation_note}</p>}{s.prep&&<p className="pt-info-prep"><Info size={14}/>{s.prep}</p>}</article>)}</>:<div className="empty-state">Ingen planlagde PT-avtalar eller infotimar.</div>}
   </section>
  </>}
 </div>
}
