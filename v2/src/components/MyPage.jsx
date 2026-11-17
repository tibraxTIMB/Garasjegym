import {useEffect,useState} from 'react'
import {UserRound,Trophy,Activity,LoaderCircle,CalendarDays,Mail,ShieldCheck} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function MyPage({profile,email,onOpenWorkout}){
 const [logs,setLogs]=useState([]),[prs,setPrs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let live=true;async function load(){const [l,p]=await Promise.all([
  supabase.from('workout_logs').select('id,title,workout_date,format,score_rounds,score_reps,note').order('workout_date',{ascending:false}).limit(100),
  supabase.from('personal_records').select('id,exercise_name,result,unit,record_date').order('record_date',{ascending:false}).limit(100)
 ]);if(!live)return;if(l.error)setError(l.error.message);else setLogs(l.data||[]);if(p.error)setError(p.error.message);else setPrs(p.data||[]);setLoading(false)}load();return()=>{live=false}},[])
 return <div className="my-page">
  <div className="training-heading"><div><span className="section-kicker">MEDLEMSPROFIL</span><h3>Mi side</h3><p>Personleg treningsprofil, resultat og utvikling.</p></div><span className="count-pill"><UserRound size={14}/> Profil</span></div>
  <section className="my-profile-card"><div className="my-profile-avatar"><UserRound size={26}/></div><div><h3>{profile.display_name||'GarasjeGym-medlem'}</h3><span>{profile.role==='admin'?'Administrator':profile.role==='manager'?'Manager':'Medlem'}</span></div></section>
  <div className="my-profile-facts"><div><ShieldCheck size={16}/><span>Medlemsstatus</span><strong>{profile.active?'Aktiv':'Inaktiv'}</strong></div><div><Mail size={16}/><span>Innloggingsadresse</span><strong>{email||'Administrert via konto'}</strong></div></div>
  {error&&<div className="auth-error">{error}</div>}
  {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar treningsprofil …</div>:<>
   <section className="engine-section"><div className="engine-section-title"><h4><Trophy size={17}/> Personlege rekordar</h4><span>{prs.length}</span></div>{prs.length?<div className="my-pr-grid">{prs.map(pr=><article className="history-card" key={pr.id}><strong>{pr.exercise_name}</strong><div className="pr-result">{pr.result} {pr.unit}</div><small>{pr.record_date||'Dato ikkje registrert'}</small></article>)}</div>:<div className="empty-state">Du har ikkje registrert personlege rekordar enno.</div>}</section>
   <section className="engine-section"><div className="engine-section-title"><h4><Activity size={17}/> Treningshistorikk</h4><span>{logs.length} økter</span></div>{logs.length?logs.map(log=><button type="button" className="history-card my-page-log" key={log.id} onClick={()=>onOpenWorkout?.(log)}><div className="history-card-top"><strong>{log.title||'Treningsøkt'}</strong><span>{log.workout_date?new Date(log.workout_date+'T12:00:00').toLocaleDateString('nn-NO'):'–'}</span></div><small>{log.format||'Trening'}{log.score_rounds!=null?' · '+log.score_rounds+' rundar':''}{log.score_reps!=null?' + '+log.score_reps+' reps':''}</small>{log.note&&<small>{log.note}</small>}</button>):<div className="empty-state">Gjennomførte økter blir synlege her når dei er lagra.</div>}</section>
  </>}
 </div>
}