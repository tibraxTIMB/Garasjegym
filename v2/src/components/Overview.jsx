import {useEffect,useState} from 'react'
import {Activity,CalendarDays,CheckCircle2,Dumbbell,LoaderCircle,Trophy} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function Overview({profile,onNavigate}){
 const [logs,setLogs]=useState([]),[prs,setPrs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let live=true;(async()=>{
  const [l,p]=await Promise.all([
   supabase.from('workout_logs').select('id,title,workout_date,format,score_rounds,score_reps').order('workout_date',{ascending:false}).limit(100),
   supabase.from('personal_records').select('id,exercise_name,result,unit,record_date').order('record_date',{ascending:false}).limit(5)
  ])
  if(!live)return
  if(l.error)setError(l.error.message);else setLogs(l.data||[])
  if(p.error)setError(p.error.message);else setPrs(p.data||[])
  setLoading(false)
 })();return()=>{live=false}},[])
 const today=new Date(),monday=new Date(today);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7)
 const week=logs.filter(x=>new Date(x.workout_date+'T12:00:00')>=monday)
 const month=logs.filter(x=>{const d=new Date(x.workout_date+'T12:00:00');return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()})
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar treningsstatus …</div>
 return <div className="overview-module">
  <div className="training-heading"><div><div className="section-kicker">MEDLEMSOVERSIKT</div><h3>Velkomen, {profile.display_name||'medlem'}</h3></div><span className="count-pill">GARASJEKADett</span></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  <div className="overview-stats"><div><Activity size={18}/><strong>{week.length}</strong><span>Økter denne veka</span></div><div><Dumbbell size={18}/><strong>{month.length}</strong><span>Økter denne månaden</span></div><div><Trophy size={18}/><strong>{prs.length}</strong><span>Nylege rekordar</span></div></div>
  <section className="engine-section"><div className="training-heading"><div><div className="section-kicker">SISTE AKTIVITET</div><h3>Treningsloggen</h3></div><button className="secondary-button" onClick={()=>onNavigate('trening')}>Opne trening</button></div>
   {logs.length?logs.slice(0,6).map(log=><article className="history-card" key={log.id}><div className="history-card-top"><strong>{log.title}</strong><span>{new Date(log.workout_date+'T12:00:00').toLocaleDateString('nn-NO')}</span></div><small>{log.format}{log.score_rounds!=null?' · '+log.score_rounds+' rundar':''}{log.score_reps!=null?' + '+log.score_reps+' reps':''}</small></article>):<div className="empty-state">Du har ikkje registrert ei økt enno. Start med ei fri økt eller ein WOD.</div>}
  </section>
  <section className="engine-section"><div className="training-heading"><div><div className="section-kicker">PERSONLEGE REKORDAR</div><h3>Siste PR</h3></div><button className="secondary-button" onClick={()=>onNavigate('trening')}>Registrer PR</button></div>
   {prs.length?prs.map(pr=><article className="history-card" key={pr.id}><div className="history-card-top"><strong>{pr.exercise_name}</strong><span>{pr.record_date}</span></div><div className="pr-result">{pr.result} {pr.unit}</div></article>):<div className="empty-state">Registrer den første personlege rekorden din.</div>}
  </section>
  <div className="overview-shortcuts"><button onClick={()=>onNavigate('booking')}><CalendarDays size={17}/> Gruppetimar</button><button onClick={()=>onNavigate('fellesskap')}><Activity size={17}/> Garasjeprat</button></div>
 </div>
}
