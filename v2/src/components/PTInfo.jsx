import {useEffect,useState} from 'react'
import {MessageSquareText,CalendarDays,RefreshCw,LoaderCircle,Info} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function PTInfo(){
 const [messages,setMessages]=useState([])
 const [currentUserId,setCurrentUserId]=useState('')
 const [sessions,setSessions]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 async function load(){
  setLoading(true);setError('')
  const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user){setError('Logg inn på nytt for å sjå informasjon frå PT.');setLoading(false);return}
  setCurrentUserId(user.id)
  const [messageRows,sessionRows]=await Promise.all([
   supabase.from('pt_messages').select('id,sender_id,body,created_at').eq('client_id',user.id).order('created_at',{ascending:false}).limit(50),
   supabase.from('pt_sessions').select('id,title,starts_at,duration_minutes,status,session_type,message,prep').eq('client_id',user.id).in('status',['planned','published','completed']).order('starts_at',{ascending:true}).limit(30)
  ])
  if(messageRows.error)setError('Meldingane kunne ikkje hentast: '+messageRows.error.message)
  else setMessages(messageRows.data||[])
  if(sessionRows.error)setError(v=>v?v+' · '+sessionRows.error.message:'Avtalar kunne ikkje hentast: '+sessionRows.error.message)
  else setSessions(sessionRows.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[])
 return <div className="pt-info-simple">
  <div className="training-heading"><div><span className="section-kicker">PERSONLEG OPPFØLGING</span><h3>Frå PT</h3><p>Meldingar, beskjedar og planlagde infotimar.</p></div><button type="button" className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15}/> Oppdater</button></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar informasjon frå PT …</div>:<>
   <section className="engine-section pt-info-section"><div className="engine-section-title"><h4><MessageSquareText size={17}/> Meldingar</h4><span>{messages.length}</span></div>
    {messages.length?messages.map(m=><article className="pt-info-card" key={m.id}><div className="pt-info-card-meta"><strong>{m.sender_id===currentUserId?'Du':'PT'}</strong><time>{new Date(m.created_at).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'})}</time></div><p>{m.body}</p></article>):<div className="empty-state">Du har ingen meldingar frå PT enno.</div>}
   </section>
   <section className="engine-section pt-info-section"><div className="engine-section-title"><h4><CalendarDays size={17}/> Avtalar og infotimar</h4><span>{sessions.length}</span></div>
    {sessions.length?sessions.map(s=><article className="pt-info-card" key={s.id}><div className="pt-info-card-meta"><strong>{s.title}</strong><span>{s.status==='completed'?'Gjennomført':'Planlagd'}</span></div><p>{new Date(s.starts_at).toLocaleString('nn-NO',{dateStyle:'full',timeStyle:'short'})} · {s.duration_minutes} min</p>{s.message&&<p>{s.message}</p>}{s.prep&&<p className="pt-info-prep"><Info size={14}/>{s.prep}</p>}</article>):<div className="empty-state">Ingen planlagde PT-avtalar eller infotimar.</div>}
   </section>
  </>}
 </div>
}
